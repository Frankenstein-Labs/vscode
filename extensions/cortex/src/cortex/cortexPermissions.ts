import * as vscode from "vscode"
import type { CortexAIService } from "./cortexAIService"
import { CortexEventBridge } from "./cortexClient"

export type PermissionAction = "allow" | "deny" | "allow_all" | "deny_all"

export interface PermissionRequest {
  id: string
  type: "filesystem" | "terminal" | "git" | "network" | "shell"
  action: string
  description: string
  details?: Record<string, unknown>
  timestamp: number
  sessionId?: string
  timeout?: number
}

export interface PermissionResult {
  requestId: string
  action: PermissionAction
  response?: string
  autoApprove?: boolean
}

export class CortexPermissionManager {
  private service: CortexAIService
  private eventBridge: CortexEventBridge
  private pendingRequests: Map<string, PermissionRequest> = new Map()
  private autoApproveRules: Map<string, PermissionAction> = new Map()

  readonly onPermissionRequested = new vscode.EventEmitter<PermissionRequest>()
  readonly onPermissionResolved = new vscode.EventEmitter<PermissionResult>()

  constructor(service: CortexAIService, eventBridge: CortexEventBridge) {
    this.service = service
    this.eventBridge = eventBridge
    this.setupEventHandlers()
  }

  private setupEventHandlers(): void {
    this.eventBridge.onDidReceiveEvent((event) => {
      if (event.event === "permission.request") {
        const req = event.data as PermissionRequest
        this.handlePermissionRequest(req)
      }
    })
  }

  private async handlePermissionRequest(request: PermissionRequest): Promise<void> {
    this.pendingRequests.set(request.id, request)

    const existingRule = this.getAutoApproveRule(request)
    if (existingRule) {
      const result: PermissionResult = {
        requestId: request.id,
        action: existingRule,
        autoApprove: true,
      }
      await this.resolvePermission(result)
      return
    }

    this.onPermissionRequested.fire(request)

    const autoApproveConfig = vscode.workspace.getConfiguration("cortex.permissions")
    const timeoutMs = autoApproveConfig.get<number>("timeout", 30000)

    if (timeoutMs > 0) {
      setTimeout(() => {
        if (this.pendingRequests.has(request.id)) {
          this.resolvePermission({
            requestId: request.id,
            action: "deny",
            autoApprove: false,
          })
        }
      }, timeoutMs)
    }
  }

  private getAutoApproveRule(request: PermissionRequest): PermissionAction | undefined {
    const config = vscode.workspace.getConfiguration("cortex.permissions")

    const autoApproveAll = config.get<boolean>("autoApproveAll", false)
    if (autoApproveAll) return "allow"

    const autoApproveFS = config.get<boolean>("autoApproveFilesystem", false)
    if (autoApproveFS && request.type === "filesystem") return "allow"

    const autoApproveTerminal = config.get<boolean>("autoApproveTerminal", false)
    if (autoApproveTerminal && request.type === "terminal") return "allow"

    const autoApproveNetwork = config.get<boolean>("autoApproveNetwork", false)
    if (autoApproveNetwork && request.type === "network") return "allow"

    const ruleKey = `${request.type}:${request.action}`
    return this.autoApproveRules.get(ruleKey)
  }

  async resolvePermission(result: PermissionResult): Promise<void> {
    this.pendingRequests.delete(result.requestId)
    this.onPermissionResolved.fire(result)

    if (result.autoApprove && result.action !== "allow") {
      const config = vscode.workspace.getConfiguration("cortex.permissions")
      const remember = await vscode.window.showInformationMessage(
        `Cortex: ${result.action} permission for this action`,
        { modal: true },
        "Remember choice",
      )
      if (remember === "Remember choice") {
        const req = this.pendingRequests.get(result.requestId)
        if (req) {
          const ruleKey = `${req.type}:${req.action}`
          this.autoApproveRules.set(ruleKey, result.action)
        }
      }
    }

    try {
      await this.service.request("POST", "/api/v2/permissions/resolve", {
        requestId: result.requestId,
        action: result.action,
        response: result.response,
      })
    } catch (e) {
      console.error("Failed to resolve permission:", e)
    }
  }

  async requestPermission(
    type: PermissionRequest["type"],
    action: string,
    description: string,
    details?: Record<string, unknown>,
  ): Promise<boolean> {
    const request: PermissionRequest = {
      id: this.generateRequestId(),
      type,
      action,
      description,
      details,
      timestamp: Date.now(),
    }

    const response = await this.requestPermissionWithTimeout(request)
    return response.action === "allow"
  }

  private async requestPermissionWithTimeout(
    request: PermissionRequest,
  ): Promise<PermissionResult> {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve({
          requestId: request.id,
          action: "deny",
          autoApprove: false,
        })
      }, 30000)

      const disposable = this.onPermissionResolved.event((result) => {
        if (result.requestId === request.id) {
          clearTimeout(timeout)
          disposable.dispose()
          resolve(result)
        }
      })

      this.pendingRequests.set(request.id, request)
      this.onPermissionRequested.fire(request)
    })
  }

  private generateRequestId(): string {
    return `perm_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
  }

  isAutoApproveEnabled(): boolean {
    const config = vscode.workspace.getConfiguration("cortex.permissions")
    return config.get<boolean>("autoApproveAll", false)
  }

  setAutoApprove(enabled: boolean): void {
    const config = vscode.workspace.getConfiguration("cortex.permissions")
    config.update("autoApproveAll", enabled, vscode.ConfigurationTarget.Workspace)
  }

  dispose(): void {
    this.onPermissionRequested.dispose()
    this.onPermissionResolved.dispose()
    this.pendingRequests.clear()
    this.autoApproveRules.clear()
  }
}
