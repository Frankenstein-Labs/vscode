import type { CortexAIService, CortexSession } from "./cortexAIService"
import * as vscode from "vscode"
import { EventEmitter } from "vscode"

export interface SessionState {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  status: "running" | "completed" | "failed" | "idle" | "pending"
  messages: SessionMessage[]
  workspace: string
  agent?: string
  mode?: string
  model?: string
}

export interface SessionMessage {
  role: "user" | "assistant" | "system" | "tool"
  content: string
  timestamp: number
  parts?: any[]
}

export class CortexSessionManager {
  private service: CortexAIService
  private sessions: Map<string, SessionState> = new Map()
  private currentSessionId: string | null = null

  readonly onSessionCreated = new EventEmitter<SessionState>()
  readonly onSessionUpdated = new EventEmitter<SessionState>()
  readonly onSessionDeleted = new EventEmitter<string>()
  readonly onCurrentSessionChanged = new EventEmitter<string | null>()

  constructor(service: CortexAIService) {
    this.service = service
  }

  async createSession(
    title?: string,
    workspace?: string,
    agent?: string,
    mode?: string,
    model?: string,
  ): Promise<SessionState> {
    const response = await this.service.createSession(
      title || "New Session",
      workspace || this.getActiveWorkspace(),
    )

    const session: SessionState = {
      id: response.id,
      title: response.title,
      createdAt: response.createdAt,
      updatedAt: response.updatedAt,
      status: response.status,
      messages: response.messages || [],
      workspace: workspace || this.getActiveWorkspace(),
      agent,
      mode,
      model,
    }

    this.sessions.set(session.id, session)
    this.currentSessionId = session.id
    this.onSessionCreated.fire(session)
    this.onCurrentSessionChanged.fire(session.id)
    return session
  }

  async getSessions(): Promise<SessionState[]> {
    try {
      const sessions = await this.service.getSessions()
      const result: SessionState[] = []

      for (const s of sessions) {
        this.sessions.set(s.id, {
          id: s.id,
          title: s.title,
          createdAt: s.createdAt,
          updatedAt: s.updatedAt,
          status: s.status,
          messages: s.messages || [],
          workspace: s.workspace || "",
        })
        result.push(this.sessions.get(s.id)!)
      }
      return result
    } catch (e) {
      console.error("Failed to get sessions:", e)
      return Array.from(this.sessions.values())
    }
  }

  async getSession(id: string): Promise<SessionState | undefined> {
    const cached = this.sessions.get(id)
    if (cached) return cached

    try {
      const s = await this.service.getSession(id)
      const session: SessionState = {
        id: s.id,
        title: s.title,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
        status: s.status,
        messages: s.messages || [],
        workspace: s.workspace || "",
      }
      this.sessions.set(id, session)
      return session
    } catch (e) {
      console.error("Failed to get session:", e)
      return undefined
    }
  }

  async deleteSession(id: string): Promise<void> {
    await this.service.deleteSession(id)
    this.sessions.delete(id)
    if (this.currentSessionId === id) {
      this.currentSessionId = null
      this.onCurrentSessionChanged.fire(null)
    }
    this.onSessionDeleted.fire(id)
  }

  async renameSession(id: string, title: string): Promise<SessionState | undefined> {
    const s = await this.service.renameSession(id, title)
    const session: SessionState = {
      id: s.id,
      title: s.title,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      status: s.status,
      messages: s.messages || [],
      workspace: s.workspace || "",
    }
    this.sessions.set(id, session)
    this.onSessionUpdated.fire(session)
    return session
  }

  setCurrentSession(id: string | null): void {
    if (this.currentSessionId !== id) {
      this.currentSessionId = id
      this.onCurrentSessionChanged.fire(id)
    }
  }

  getCurrentSession(): SessionState | null {
    if (!this.currentSessionId) return null
    return this.sessions.get(this.currentSessionId) || null
  }

  addMessage(message: SessionMessage): void {
    if (this.currentSessionId) {
      const session = this.sessions.get(this.currentSessionId)
      if (session) {
        session.messages.push(message)
        session.updatedAt = Date.now()
        this.onSessionUpdated.fire(session)
      }
    }
  }

  updateStatus(status: SessionState["status"]): void {
    if (this.currentSessionId) {
      const session = this.sessions.get(this.currentSessionId)
      if (session) {
        session.status = status
        this.onSessionUpdated.fire(session)
      }
    }
  }

  private getActiveWorkspace(): string {
    const folders = vscode.workspace.workspaceFolders
    if (folders && folders.length > 0) {
      return folders[0].uri.fsPath
    }
    return ""
  }

  dispose(): void {
    this.onSessionCreated.dispose()
    this.onSessionUpdated.dispose()
    this.onSessionDeleted.dispose()
    this.onCurrentSessionChanged.dispose()
  }
}
