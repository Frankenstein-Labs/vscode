import * as vscode from "vscode"
import type { CortexAIService } from "./cortexAIService"
import type { CortexEventBridge } from "./cortexClient"

export interface CortexCommand {
  id: string
  title: string
  category?: string
  when?: string
  keybinding?: {
    key: string
    when?: string
  }
  handler: (args?: any) => Promise<any> | void
}

export class CortexCommandRegistry {
  private commands: Map<string, CortexCommand> = new Map()
  private disposables: vscode.Disposable[] = []

  constructor(
    private readonly service: CortexAIService,
    private readonly eventBridge: CortexEventBridge,
  ) {}

  register(command: CortexCommand): vscode.Disposable {
    this.commands.set(command.id, command)

    const disposable = vscode.commands.registerCommand(command.id, async (args) => {
      try {
        return await command.handler(args)
      } catch (e) {
        console.error(`Command ${command.id} failed:`, e)
        vscode.window.showErrorMessage(
          `Cortex: ${(e as Error).message || "Command failed"}`,
        )
      }
    })

    this.disposables.push(disposable)

    const originalDispose = disposable.dispose.bind(disposable)
    disposable.dispose = () => {
      this.commands.delete(command.id)
      originalDispose()
    }

    return disposable
  }

  getCommands(): CortexCommand[] {
    return Array.from(this.commands.values())
  }

  async execute(id: string, args?: any): Promise<any> {
    const cmd = this.commands.get(id)
    if (!cmd) {
      throw new Error(`Command not found: ${id}`)
    }
    return cmd.handler(args)
  }

  dispose(): void {
    this.disposables.forEach((d) => d.dispose())
    this.disposables = []
    this.commands.clear()
  }
}

export function createCortexCommands(
  service: CortexAIService,
  eventBridge: CortexEventBridge,
): CortexCommand[] {
  const commands: CortexCommand[] = [
    {
      id: "cortex.newChat",
      title: "Cortex: New Chat",
      category: "Cortex",
      handler: async () => {
        const sessionManagerModule = await import("./cortexSession")
        const sessionManager = new sessionManagerModule.CortexSessionManager(service)
        await sessionManager.createSession()
        vscode.commands.executeCommand("cortex.focusChat")
      },
    },
    {
      id: "cortex.explainCode",
      title: "Cortex: Explain Code",
      category: "Cortex",
      when: "editorTextFocus",
      handler: async () => {
        const editor = vscode.window.activeTextEditor
        if (!editor) return
        const selection = editor.document.getText(editor.selection)
        if (!selection) return
        await service.request("POST", "/api/v2/explain", { code: selection })
        vscode.commands.executeCommand("cortex.focusChat")
      },
    },
    {
      id: "cortex.fixCode",
      title: "Cortex: Fix Code",
      category: "Cortex",
      when: "editorTextFocus",
      handler: async () => {
        const editor = vscode.window.activeTextEditor
        if (!editor) return
        const selection = editor.document.getText(editor.selection) || editor.document.getText()
        await service.request("POST", "/api/v2/fix", { code: selection })
        vscode.commands.executeCommand("cortex.focusChat")
      },
    },
    {
      id: "cortex.refactorCode",
      title: "Cortex: Refactor",
      category: "Cortex",
      when: "editorTextFocus",
      handler: async () => {
        const editor = vscode.window.activeTextEditor
        if (!editor) return
        const selection = editor.document.getText(editor.selection) || editor.document.getText()
        await service.request("POST", "/api/v2/refactor", { code: selection })
        vscode.commands.executeCommand("cortex.focusChat")
      },
    },
    {
      id: "cortex.generateTests",
      title: "Cortex: Generate Tests",
      category: "Cortex",
      when: "editorTextFocus",
      handler: async () => {
        const editor = vscode.window.activeTextEditor
        if (!editor) return
        const document = editor.document
        await service.request("POST", "/api/v2/generate-tests", {
          code: document.getText(),
          language: document.languageId,
          filepath: document.uri.fsPath,
        })
        vscode.commands.executeCommand("cortex.focusChat")
      },
    },
    {
      id: "cortex.reviewCode",
      title: "Cortex: Review Code",
      category: "Cortex",
      when: "editorTextFocus",
      handler: async () => {
        const editor = vscode.window.activeTextEditor
        if (!editor) return
        const selection = editor.document.getText(editor.selection) || editor.document.getText()
        await service.request("POST", "/api/v2/review", { code: selection })
        vscode.commands.executeCommand("cortex.focusChat")
      },
    },
    {
      id: "cortex.addContext",
      title: "Cortex: Add Context",
      category: "Cortex",
      handler: async () => {
        const workspaceFolders = vscode.workspace.workspaceFolders
        if (workspaceFolders && workspaceFolders.length > 0) {
          await service.request("POST", "/api/v2/context", {
            workspace: workspaceFolders[0].uri.fsPath,
          })
        }
        const editor = vscode.window.activeTextEditor
        if (editor) {
          const selection = editor.document.getText(editor.selection)
          if (selection) {
            await service.request("POST", "/api/v2/context", {
              file: editor.document.uri.fsPath,
              selection,
            })
          }
        }
      },
    },
    {
      id: "cortex.focusChat",
      title: "Cortex: Focus Chat",
      category: "Cortex",
      handler: async () => {
        await vscode.commands.executeCommand("cortex.focus")
      },
    },
    {
      id: "cortex.stopAgent",
      title: "Cortex: Stop Agent",
      category: "Cortex",
      handler: async () => {
        await vscode.commands.executeCommand("cortex.abortSession")
      },
    },
    {
      id: "cortex.continue",
      title: "Cortex: Continue",
      category: "Cortex",
      handler: async () => {
        await vscode.commands.executeCommand("cortex.sendMessage")
      },
    },
    {
      id: "cortex.toggleAutoApprove",
      title: "Cortex: Toggle Auto-Approve",
      category: "Cortex",
      handler: async () => {
        const config = vscode.workspace.getConfiguration("cortex")
        const current = config.get("autoApprove", false)
        await config.update("autoApprove", !current, vscode.ConfigurationTarget.Workspace)
      },
    },
  ]

  return commands
}
