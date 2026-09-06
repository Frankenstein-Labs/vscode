#!/usr/bin/env node
/*
 * Cortex Engine Bridge Server
 *
 * A standalone server that implements the Kilo CLI's `serve --port` interface,
 * but routes AI processing to Cortex Engine instead of the Kilo CLI's built-in
 * agent runtime. This allows the Kilo Code extension (ported to the Cortex
 * extension) to communicate with Cortex Engine using the same SSE/HTTP
 * protocol the extension already expects.
 *
 * Usage:
 *   cortex-bridge serve --port 0 --password <hex>
 *
 * Environment variables:
 *   CORTEX_ENGINE_URL — URL of the Cortex Engine API (default: http://localhost:8080)
 *   CORTEX_ENGINE_API_KEY — API key for Cortex Engine
 *   KILO_SERVER_PASSWORD — Password for SSE authentication (set by ServerManager)
 *   KILO_PARENT_PID — Parent process PID (for shutdown)
 */
import http from "http"
import { createServer } from "http"
import type { Socket } from "net"
import type { SSEPayload } from "./sdk-sse-adapter"
import { type Config } from "@kilocode/sdk/v2/client"

const PORT_ARG = process.argv.includes("--port") ? process.argv[process.argv.indexOf("--port") + 1] : "0"
const port = PORT_ARG ? parseInt(PORT_ARG, 10) : 0
const password = process.env.KILO_SERVER_PASSWORD || "dev"
const cortexUrl = process.env.CORTEX_ENGINE_URL || "http://localhost:8080"
const cortexApiKey = process.env.CORTEX_ENGINE_API_KEY || ""
const parentId = process.env.KILO_PARENT_PID ? parseInt(process.env.KILO_PARENT_PID, 10) : undefined

let server: http.Server | null = null
let sseClients: Set<http.ServerResponse> = new Set()
let activeSession: string | null = null

function isParentAlive(): boolean {
  if (!parentId) return true
  try {
    process.kill(parentId, 0)
    return true
  } catch {
    return false
  }
}

function sendSSE(res: http.ServerResponse, payload: SSEPayload): void {
  const data = JSON.stringify(payload)
  res.write(`event: ${payload.type}\n`)
  res.write(`data: ${data}\n`)
  res.write(`id: ${payload.id}\n\n`)
}

function broadcast(payload: SSEPayload): void {
  for (const client of sseClients) {
    try {
      sendSSE(client, payload)
    } catch {
      // Client disconnected, will be cleaned up
    }
  }
}

function getAuthHeader(req: http.IncomingMessage): string | undefined {
  return req.headers.authorization
}

function checkAuth(req: http.IncomingMessage): boolean {
  const auth = getAuthHeader(req)
  if (!auth) return false
  const decoded = Buffer.from(auth.replace(/^Basic\s+/i, ""), "base64").toString()
  const [, token] = decoded.split(":")
  return token === password
}

const serverHandler = async (req: http.IncomingMessage, res: http.ServerResponse) => {
  const url = new URL(req.url || "/", `http://${req.headers.host}`)

  if (url.pathname === "/global/health") {
    res.writeHead(200, { "Content-Type": "application/json" })
    res.end(JSON.stringify({ status: "ok", bridge: "cortex-engine" }))
    return
  }

  if (url.pathname === "/global/telemetry" && req.method === "PUT") {
    res.writeHead(200)
    res.end()
    return
  }

  if (!checkAuth(req)) {
    res.writeHead(401, { "WWW-Authenticate": "Basic" })
    res.end("Unauthorized")
    return
  }

  if (url.pathname === "/" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" })
    res.end(JSON.stringify({ name: "CortexEngineBridge", version: "1.0.0", protocol: "2.0" }))
    return
  }

  if (url.pathname === "/api/v2/config/sync" && req.method === "PUT") {
    res.writeHead(200)
    res.end()
    return
  }

  if (url.pathname === "/api/v2/config/project" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" })
    res.end(JSON.stringify({ config: {} }))
    return
  }

  if (url.pathname === "/api/v2/config/global" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" })
    res.end(JSON.stringify({}))
    return
  }

  if (url.pathname === "/api/v2/config/binding" && req.method === "PUT") {
    res.writeHead(200)
    res.end()
    return
  }

  if (url.pathname === "/api/v2/config/features" && req.method === "PUT") {
    res.writeHead(200)
    res.end()
    return
  }

  if (url.pathname === "/api/v2/config/features" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" })
    res.end(JSON.stringify({ features: { remoteControl: false, suggestions: false } }))
    return
  }

  if (url.pathname === "/api/v2/config/snapshot" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" })
    res.end(JSON.stringify({ effective: {}, targets: {} }))
    return
  }

  if (url.pathname === "/api/v2/model" && req.method === "PUT") {
    res.writeHead(200)
    res.end()
    return
  }

  if (url.pathname === "/api/v2/model" && req.method === "GET") {
    const models = await fetchCortexModels()
    res.writeHead(200, { "Content-Type": "application/json" })
    res.end(JSON.stringify({ data: models }))
    return
  }

  if (url.pathname === "/api/v2/provider" && req.method === "PUT") {
    res.writeHead(200)
    res.end()
    return
  }

  if (url.pathname === "/api/v2/provider" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" })
    res.end(JSON.stringify({ data: [] }))
    return
  }

  if (url.pathname === "/api/v2/provider/connect" && req.method === "POST") {
    res.writeHead(200)
    res.end()
    return
  }

  if (url.pathname === "/api/v2/provider/disconnect" && req.method === "POST") {
    res.writeHead(200)
    res.end()
    return
  }

  if (url.pathname === "/api/v2/provider/oauth/authorize" && req.method === "POST") {
    res.writeHead(200)
    res.end()
    return
  }

  if (url.pathname === "/api/v2/provider/oauth/callback" && req.method === "POST") {
    res.writeHead(200)
    res.end()
    return
  }

  if (url.pathname === "/api/v2/agent" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" })
    res.end(JSON.stringify({ data: await fetchCortexAgents() }))
    return
  }

  if (url.pathname === "/api/v2/session" && req.method === "POST") {
    const body = await readBody(req)
    const session = await createSession(body)
    res.writeHead(201, { "Content-Type": "application/json" })
    res.end(JSON.stringify({ data: session }))

    broadcast({
      type: "session.created",
      id: "1",
      properties: { sessionID: session.id, title: session.title },
    })
    activeSession = session.id
    return
  }

  if (url.pathname === "/api/v2/session" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" })
    res.end(JSON.stringify({ data: await listSessions() }))
    return
  }

  if (url.pathname && url.pathname.match(/^\/api\/v2\/session\/(.+)$/)) {
    const sessionId = url.pathname.split("/")[4]

    if (req.method === "GET") {
      res.writeHead(200, { "Content-Type": "application/json" })
      res.end(JSON.stringify({ data: await getSession(sessionId) }))
      return
    }

    if (req.method === "DELETE") {
      await deleteSession(sessionId)
      res.writeHead(200)
      res.end()

      broadcast({
        type: "session.deleted",
        id: "2",
        properties: { sessionID: sessionId },
      })
      if (activeSession === sessionId) activeSession = null
      return
    }

    if (req.method === "PUT") {
      const body = await readBody(req)
      const session = await updateSession(sessionId, body)
      res.writeHead(200, { "Content-Type": "application/json" })
      res.end(JSON.stringify({ data: session }))
      return
    }

    if (url.pathname.endsWith("/message") && req.method === "POST") {
      const body = await readBody(req)
      await sendSessionMessage(sessionId, body)
      res.writeHead(200)
      res.end()
      return
    }

    if (url.pathname.endsWith("/abort") && req.method === "POST") {
      res.writeHead(200)
      res.end()

      broadcast({
        type: "session.turn.close",
        id: "3",
        properties: { sessionID: sessionId, reason: "aborted" },
      })
      return
    }

    if (url.pathname.endsWith("/message") && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "application/json" })
      res.end(JSON.stringify({ data: await getMessages(sessionId) }))
      return
    }
  }

  if (url.pathname === "/api/v2/sse" && req.method === "GET") {
    handleSSE(req, res)
    return
  }

  res.writeHead(404, { "Content-Type": "application/json" })
  res.end(JSON.stringify({ error: "Not Found" }))
}

function handleSSE(req: http.IncomingMessage, res: http.ServerResponse): void {
  const headers = {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "Access-Control-Allow-Origin": "*",
  }
  res.writeHead(200, headers)
  res.write(`: connected\n\n`)
  res.write(`retry: 5000\n\n`)

  sseClients.add(res)

  broadcast({
    type: "connected",
    id: "0",
    properties: { clientCount: sseClients.size },
  })

  req.on("close", () => {
    sseClients.delete(res)
    broadcast({
      type: "disconnected",
      id: String(Date.now()),
      properties: { clientCount: sseClients.size },
    })
  })
}

async function readBody(req: http.IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let data = ""
    req.on("data", (chunk) => (data += chunk))
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {})
      } catch {
        resolve({})
      }
    })
    req.on("error", reject)
  })
}

async function fetchCortexModels(): Promise<any[]> {
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" }
    if (cortexApiKey) headers["Authorization"] = `Bearer ${cortexApiKey}`
    const res = await fetch(`${cortexUrl}/api/v2/models`, { headers })
    if (!res.ok) return []
    const data = await res.json()
    return data.models || []
  } catch (e) {
    console.error("[CortexBridge] Failed to fetch models:", e)
    return []
  }
}

async function fetchCortexAgents(): Promise<any[]> {
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" }
    if (cortexApiKey) headers["Authorization"] = `Bearer ${cortexApiKey}`
    const res = await fetch(`${cortexUrl}/api/v2/agents`, { headers })
    if (!res.ok) return []
    const data = await res.json()
    return data.agents || []
  } catch (e) {
    console.error("[CortexBridge] Failed to fetch agents:", e)
    return []
  }
}

async function createSession(body: any): Promise<any> {
  const sessionId = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
  return {
    id: sessionId,
    title: body.title || "New Session",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    status: "idle",
    messages: [],
    workspace: body.workspace || "",
    agent: body.agent,
    mode: body.mode || "agent",
    model: body.model,
  }
}

async function listSessions(): Promise<any[]> {
  return []
}

async function getSession(id: string): Promise<any> {
  return {
    id,
    title: "Session",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    status: "idle",
    messages: [],
    workspace: "",
  }
}

async function updateSession(id: string, body: any): Promise<any> {
  return { id, ...body, updatedAt: Date.now() }
}

async function deleteSession(id: string): Promise<void> {}

async function getMessages(sessionId: string): Promise<any[]> {
  return []
}

async function sendSessionMessage(sessionId: string, body: any): Promise<void> {
  // Forward to Cortex Engine
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" }
    if (cortexApiKey) headers["Authorization"] = `Bearer ${cortexApiKey}`
    await fetch(`${cortexUrl}/api/v2/sessions/${sessionId}/messages`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    })

    // Stream events back
    broadcast({
      type: "session.status",
      id: String(Date.now()),
      properties: { sessionID: sessionId, status: { type: "running" } },
    })

    // Start streaming from Cortex Engine
    streamCortexEvents(sessionId, body)
  } catch (e) {
    console.error("[CortexBridge] Failed to send message:", e)
    broadcast({
      type: "session.error",
      id: String(Date.now()),
      properties: { sessionID: sessionId, message: String(e) },
    })
  }
}

async function streamCortexEvents(sessionId: string, body: any): Promise<void> {
  // In a full implementation, this would use SSE/WebSocket to stream
  // events from Cortex Engine. For now, this is a placeholder that
  // demonstrates the streaming architecture.
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30000)

  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" }
    if (cortexApiKey) headers["Authorization"] = `Bearer ${cortexApiKey}`

    const response = await fetch(`${cortexUrl}/api/v2/sessions/${sessionId}/messages`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    })

    if (!response.ok) {
      broadcast({
        type: "session.error",
        id: String(Date.now()),
        properties: { sessionID: sessionId, message: `Cortex Engine error: ${response.status}` },
      })
      return
    }

    // Process the response stream
    const data = await response.json()

    if (data.parts) {
      for (const part of data.parts) {
        broadcast({
          type: "message.part.updated",
          id: String(Date.now()),
          properties: {
            sessionID: sessionId,
            messageID: `msg_${Date.now()}`,
            partID: part.id || String(Date.now()),
            ...part,
          },
        })
      }
    }

    broadcast({
      type: "session.turn.close",
      id: String(Date.now()),
      properties: { sessionID: sessionId, reason: "completed" },
    })
  } catch (e: any) {
    if (e.name === "AbortError") {
      broadcast({
        type: "session.status",
        id: String(Date.now()),
        properties: { sessionID: sessionId, status: { type: "idle" } },
      })
      return
    }
    console.error("[CortexBridge] Error in session:", e)
    broadcast({
      type: "session.error",
      id: String(Date.now()),
      properties: { sessionID: sessionId, message: String(e.message || e) },
    })
  } finally {
    clearTimeout(timeout)
  }
}

function checkParentInterval(): void {
  if (parentId && !isParentAlive()) {
    console.warn("[CortexBridge] Parent process exited, shutting down")
    process.exit(0)
  }
}

setInterval(checkParentInterval, 5000)

server = createServer(serverHandler)
server.on("connection", (socket: Socket) => {
  socket.setTimeout(0)
  socket.setKeepAlive(true)
  socket.setNoDelay(true)
})

server.listen(port, () => {
  const actualPort = (server?.address() as any)?.port || 0
  console.log(`[CortexBridge] Listening on port ${actualPort}`)
  process.stdout.write(`\n[CortexBridge] Ready on port ${actualPort}\n`)

  if (process.send) {
    process.send({ type: "ready", port: actualPort, password })
  }
})

process.on("SIGTERM", () => {
  console.log("[CortexBridge] Received SIGTERM, shutting down")
  server?.close()
  process.exit(0)
})

process.on("SIGINT", () => {
  console.log("[CortexBridge] Received SIGINT, shutting down")
  server?.close()
  process.exit(0)
})

console.log(`[CortexBridge] Cortex Engine URL: ${cortexUrl}`)
console.log(`[CortexBridge] Password: ${password.slice(0, 4)}...`)
