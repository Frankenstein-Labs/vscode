import * as vscode from "vscode"
import type { CortexAIService } from "./cortexAIService"

export interface ContextItem {
  type: "file" | "selection" | "workspace" | "terminal" | "git" | "problems"
  name: string
  description?: string
  content?: string
  uri?: string
  range?: { start: number; end: number }
}

export class CortexContextManager {
  private service: CortexAIService
  private activeContext: ContextItem[] = []

  constructor(service: CortexAIService) {
    this.service = service
  }

  getActiveContext(): ContextItem[] {
    return [...this.activeContext]
  }

  setActiveContext(items: ContextItem[]): void {
    this.activeContext = [...items]
  }

  addContext(items: ContextItem[]): void {
    this.activeContext.push(...items)
  }

  removeContext(type: string, name: string): void {
    this.activeContext = this.activeContext.filter(
      (item) => !(item.type === type && item.name === name),
    )
  }

  clearContext(): void {
    this.activeContext = []
  }

  /**
   * Collect context from the current editor state.
   * Supports @file, @selection, @workspace, @terminal, @problems, @git
   */
  async collectContext(type: string): Promise<ContextItem[]> {
    const items: ContextItem[] = []

    switch (type) {
      case "file": {
        const editor = vscode.window.activeTextEditor
        if (editor) {
          items.push({
            type: "file",
            name: editor.document.fileName,
            uri: editor.document.uri.fsPath,
            content: editor.document.getText(),
          })
        }
        break
      }

      case "selection": {
        const editor = vscode.window.activeTextEditor
        if (editor && !editor.selection.isEmpty) {
          const selection = editor.document.getText(editor.selection)
          items.push({
            type: "selection",
            name: "selected text",
            content: selection,
            uri: editor.document.uri.fsPath,
            range: {
              start: editor.selection.start.line,
              end: editor.selection.end.line,
            },
          })
        }
        break
      }

      case "workspace": {
        const folders = vscode.workspace.workspaceFolders
        if (folders) {
          for (const folder of folders) {
            items.push({
              type: "workspace",
              name: folder.name,
              uri: folder.uri.fsPath,
              description: `Workspace folder: ${folder.name}`,
            })
          }
        }
        break
      }

      case "terminal": {
        const terminals = vscode.window.terminals
        for (const terminal of terminals) {
          items.push({
            type: "terminal",
            name: terminal.name,
            description: "Terminal output (last 500 lines)",
          })
        }
        break
      }

      case "problems": {
        const problems = await vscode.commands.executeCommand<
          vscode.Problem[]
        >("workbench.actions.view.problems")
        // Read problems from the Problems view
        const diagnostics = vscode.languages
          .getDiagnostics()
          .filter(([uri]) => uri.scheme === "file")

        for (const [uri, diags] of diagnostics) {
          if (diags.length > 0) {
            items.push({
              type: "problems",
              name: uri.fsPath,
              content: diags
                .slice(0, 5)
                .map((d) => `${d.severity}: ${d.message}`)
                .join("\n"),
              uri: uri.fsPath,
            })
          }
        }
        break
      }

      case "git": {
        const repository = await this.getGitDiff()
        if (repository) {
          items.push(repository)
        }
        break
      }

      default:
        break
    }

    this.addContext(items)
    return items
  }

  private async getGitDiff(): Promise<ContextItem | undefined> {
    try {
      const [repository] = await vscode.commands.executeCommand<
        any[]
      >("git.repositories")
      if (repository) {
        const diff = await repository.diff()
        return {
          type: "git",
          name: "git diff",
          content: diff || "",
          uri: repository.rootUri?.fsPath,
        }
      }
    } catch {
      return undefined
    }
    return undefined
  }

  /**
   * Serialize context for sending to Cortex Engine.
   */
  serialize(): any[] {
    return this.activeContext.map((item) => ({
      type: item.type,
      name: item.name,
      description: item.description,
      content: item.content,
      uri: item.uri,
      range: item.range,
    }))
  }
}
