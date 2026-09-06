import type { CortexAIService, CortexEvent, CortexEventType } from "./cortexAIService"

export type CortexEventCallback = (event: CortexEvent) => void

export interface CortexStreamOptions {
  sessionId: string
  onEvent: CortexEventCallback
  onError?: (err: Error) => void
  onComplete?: () => void
}

export class CortexEventMapper {
  /**
   * Maps Cortex Engine SSE event types to the Kilo webview event types.
   * This allows the existing Kilo UI to consume Cortex Engine events
   * without modification.
   */
  static mapCortexToKilo(cortexEvent: CortexEvent): any {
    switch (cortexEvent.event) {
      case "conversation.part.updated":
        return {
          type: "partUpdated",
          data: cortexEvent.data,
        }

      case "tool.call.start":
        return {
          type: "toolCall",
          data: {
            ...cortexEvent.data,
            status: "pending",
          },
        }

      case "tool.call.result":
        return {
          type: "toolResult",
          data: cortexEvent.data,
        }

      case "tool.call.approval":
        return {
          type: "toolApproval",
          data: cortexEvent.data,
        }

      case "session.created":
        return {
          type: "sessionCreated",
          data: cortexEvent.data,
        }

      case "session.updated":
        return {
          type: "sessionUpdated",
          data: cortexEvent.data,
        }

      case "session.deleted":
        return {
          type: "sessionDeleted",
          data: cortexEvent.data,
        }

      case "error":
        return {
          type: "error",
          data: cortexEvent.data,
        }

      case "connected":
        return {
          type: "serverConnected",
          data: cortexEvent.data,
        }

      case "disconnected":
        return {
          type: "serverDisconnected",
          data: cortexEvent.data,
        }

      default:
        return {
          type: cortexEvent.event,
          data: cortexEvent.data,
        }
    }
  }

  /**
   * Maps Kilo webview message types to Cortex Engine API calls.
   */
  static mapKiloToCortex(type: string, value: any): { method: string; path: string; data: any } | null {
    switch (type) {
      case "chatMessage":
        return {
          method: "POST",
          path: `/api/v2/sessions/${value.sessionId}/messages`,
          data: {
            role: "user",
            content: value.text,
            context: value.context,
            model: value.model,
            mode: value.mode,
          },
        }

      case "abortSession":
        return {
          method: "POST",
          path: `/api/v2/sessions/${value.sessionId}/abort`,
          data: {},
        }

      case "newSession":
        return {
          method: "POST",
          path: "/api/v2/sessions",
          data: {
            title: value.title,
            agent: value.agent,
            mode: value.mode,
            model: value.model,
            workspace: value.workspace,
          },
        }

      case "resumeSession":
        return {
          method: "POST",
          path: `/api/v2/sessions/${value.sessionId}/resume`,
          data: {},
        }

      case "deleteSession":
        return {
          method: "DELETE",
          path: `/api/v2/sessions/${value.sessionId}`,
          data: {},
        }

      case "renameSession":
        return {
          method: "PUT",
          path: `/api/v2/sessions/${value.sessionId}`,
          data: { title: value.title },
        }

      case "approveTool":
        return {
          method: "POST",
          path: `/api/v2/sessions/${value.sessionId}/tools/${value.toolId}/approve`,
          data: { approved: value.approved, response: value.response },
        }

      case "toolCallResult":
        return {
          method: "POST",
          path: `/api/v2/sessions/${value.sessionId}/tools/${value.toolId}/result`,
          data: { result: value.result },
        }

      case "updateContext":
        return {
          method: "PUT",
          path: `/api/v2/sessions/${value.sessionId}/context`,
          data: { context: value.context },
        }

      case "updateModel":
        return {
          method: "PUT",
          path: `/api/v2/sessions/${value.sessionId}/model`,
          data: { model: value.model },
        }

      case "updateMode":
        return {
          method: "PUT",
          path: `/api/v2/sessions/${value.sessionId}/mode`,
          data: { mode: value.mode },
        }

      default:
        return null
    }
  }
}

export class CortexEventBridge {
  private service: CortexAIService
  private callbacks: Map<CortexEventType, CortexEventCallback[]> = new Map()

  constructor(service: CortexAIService) {
    this.service = service
    this.setupListeners()
  }

  private setupListeners(): void {
    this.service.onDidReceiveEvent.event((event) => {
      const mapped = CortexEventMapper.mapCortexToKilo(event)
      if (mapped) {
        const callbacks = this.callbacks.get(event.event as CortexEventType)
        if (callbacks) {
          callbacks.forEach((cb) => cb(event))
        }
      }
    })
  }

  subscribe(eventType: CortexEventType, callback: CortexEventCallback): void {
    if (!this.callbacks.has(eventType)) {
      this.callbacks.set(eventType, [])
    }
    this.callbacks.get(eventType)!.push(callback)
  }

  unsubscribe(eventType: CortexEventType, callback: CortexEventCallback): void {
    const cbs = this.callbacks.get(eventType)
    if (cbs) {
      const idx = cbs.indexOf(callback)
      if (idx >= 0) cbs.splice(idx, 1)
    }
  }

  translateMessage(type: string, value: any): { method: string; path: string; data: any } | null {
    return CortexEventMapper.mapKiloToCortex(type, value)
  }

  dispose(): void {
    this.callbacks.clear()
  }
}
