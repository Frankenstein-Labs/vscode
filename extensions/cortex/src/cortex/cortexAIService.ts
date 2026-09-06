import * as vscode from "vscode"
import { EventEmitter, Disposable } from "vscode"

export interface CortexEngineConfig {
  baseUrl: string
  apiKey?: string
  agentId?: string
  projectId?: string
  workspaceDirectory?: string
  apiTimeout?: number
}

export interface CortexSession {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  status: "running" | "completed" | "failed" | "idle" | "pending"
  messages: any[]
  workspace?: string
}

export interface CortexEvent {
  event: string
  data?: any
  id?: string
  retry?: number
}

export type CortexEventType =
  | "conversation.part.updated"
  | "conversation.ended"
  | "tool.call.start"
  | "tool.call.result"
  | "tool.call.approval"
  | "session.created"
  | "session.deleted"
  | "session.updated"
  | "error"
  | "connected"
  | "disconnected"

export class CortexAIService implements Disposable {
  private disposables: Disposable[] = []
  private config: CortexEngineConfig | null = null
  private connected = false
  private eventSource: EventSource | null = null
  private baseUrl: string | null = null
  private apiKey: string | null = null

  readonly onDidReceiveEvent = new EventEmitter<CortexEvent>()
  readonly onDidConnect = new EventEmitter<void>()
  readonly onDidDisconnect = new EventEmitter<void>()
  readonly onDidError = new EventEmitter<Error>()

  constructor(
    private readonly context: vscode.ExtensionContext,
  ) {}

  async initialize(): Promise<void> {
    this.config = this.loadConfig()
    this.baseUrl = this.config.baseUrl
    this.apiKey = this.config.apiKey

    this.disposables.push(this.onDidReceiveEvent)
    this.disposables.push(this.onDidConnect)
    this.disposables.push(this.onDidDisconnect)
    this.disposables.push(this.onDidError)
  }

  private loadConfig(): CortexEngineConfig {
    const cfg = vscode.workspace.getConfiguration("cortex")
    return {
      baseUrl: cfg.get<string>("engineUrl", "http://localhost:8080"),
      apiKey: cfg.get<string>("apiKey"),
      agentId: cfg.get<string>("agentId"),
      projectId: cfg.get<string>("projectId"),
      workspaceDirectory: cfg.get<string>("workspaceDirectory"),
      apiTimeout: cfg.get<number>("apiTimeout", 30000),
    }
  }

  async connect(): Promise<boolean> {
    if (!this.config) await this.initialize()
    if (!this.config) {
      this.onDidError.fire(new Error("CortexAIService not initialized"))
      return false
    }

    this.connected = true
    this.onDidConnect.fire()
    return true
  }

  async disconnect(): Promise<void> {
    if (this.eventSource) {
      this.eventSource.close()
      this.eventSource = null
    }
    this.connected = false
    this.onDidDisconnect.fire()
  }

  isConnected(): boolean {
    return this.connected
  }

  getConfig(): CortexEngineConfig | null {
    return this.config
  }

  getBaseUrl(): string | null {
    return this.baseUrl
  }

  getApiKey(): string | null {
    return this.apiKey
  }

  async request<T = unknown>(
    method: "GET" | "POST" | "PUT" | "DELETE",
    path: string,
    data?: unknown,
  ): Promise<T> {
    if (!this.config) throw new Error("CortexAIService not initialized")

    const url = `${this.config.baseUrl}${path}`
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    }
    if (this.apiKey) headers["Authorization"] = `Bearer ${this.apiKey}`

    const res = await fetch(url, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
      signal: AbortSignal.timeout(this.config.apiTimeout ?? 30000),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => "")
      throw new Error(`Cortex Engine error: ${res.status} ${res.statusText} ${text}`)
    }

    const contentType = res.headers.get("content-type") || ""
    if (contentType.includes("application/json")) {
      return res.json() as T
    }
    return res.text() as T
  }

  async createSession(title: string, workspace?: string): Promise<CortexSession> {
    return this.request<CortexSession>("POST", "/api/v2/sessions", { title, workspace })
  }

  async getSessions(): Promise<CortexSession[]> {
    return this.request<CortexSession[]>("GET", "/api/v2/sessions")
  }

  async getSession(id: string): Promise<CortexSession> {
    return this.request<CortexSession>("GET", `/api/v2/sessions/${id}`)
  }

  async deleteSession(id: string): Promise<void> {
    await this.request("DELETE", `/api/v2/sessions/${id}`)
  }

  async renameSession(id: string, title: string): Promise<CortexSession> {
    return this.request<CortexSession>("PUT", `/api/v2/sessions/${id}`, { title })
  }

  async sendMessage(sessionId: string, message: string, context?: any): Promise<void> {
    await this.request("POST", `/api/v2/sessions/${sessionId}/messages`, {
      role: "user",
      content: message,
      context,
    })
  }

  async listModels(): Promise<any[]> {
    return this.request<any[]>("GET", "/api/v2/models")
  }

  async listAgents(): Promise<any[]> {
    return this.request<any[]>("GET", "/api/v2/agents")
  }

  dispose(): void {
    void this.disconnect()
    this.disposables.forEach((d) => d.dispose())
    this.disposables = []
  }
}
