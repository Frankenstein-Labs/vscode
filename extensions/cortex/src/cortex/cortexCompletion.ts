import * as vscode from "vscode"
import type { CortexAIService } from "./cortexAIService"
import type { CortexEventBridge } from "./cortexClient"
import {
  InlineCompletionItemProvider,
  type InlineCompletionResult,
  type InlineCompletionItem,
  type InlineCompletionList,
} from "vscode"

export interface CortexCompletionResult {
  items: InlineCompletionItem[]
  requestId: string
}

export class CortexCompletionProvider implements InlineCompletionItemProvider {
  private service: CortexAIService
  private eventBridge: CortexEventBridge
  private cache: Map<string, CortexCompletionResult> = new Map()

  constructor(service: CortexAIService, eventBridge: CortexEventBridge) {
    this.service = service
    this.eventBridge = eventBridge
  }

  async provideInlineCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    context: vscode.InlineCompletionContext,
    token: vscode.CancellationToken,
  ): Promise<InlineCompletionResult | null> {
    const textBefore = document.getText(
      new vscode.Range(new vscode.Position(0, 0), position),
    )

    if (textBefore.trim().length < 3) return null

    try {
      const response = await this.service.request<any>(
        "POST",
        "/api/v2/autocomplete",
        {
          filepath: document.uri.fsPath,
          language: document.languageId,
          prefix: textBefore,
          line: position.line,
          column: position.character,
          context: this.extractContext(document, position),
        },
      )

      const items: InlineCompletionItem[] = []
      if (response.completions) {
        for (const comp of response.completions) {
          const insertText = comp.insertText || comp.text || ""
          const item = new InlineCompletionItem(insertText, {
            range: new vscode.Range(position, position),
          })
          items.push(item)
        }
      }

      if (items.length === 0) return null

      return new InlineCompletionList(items)
    } catch (e) {
      console.error("Cortex completion error:", e)
      return null
    }
  }

  private extractContext(
    document: vscode.TextDocument,
    position: vscode.Position,
  ): any {
    const lines: string[] = []
    const startLine = Math.max(0, position.line - 20)
    const endLine = Math.min(document.lineCount - 1, position.line + 10)

    for (let i = startLine; i <= endLine; i++) {
      lines.push(document.lineAt(i).text)
    }

    const selection = vscode.window.activeTextEditor?.selection
    let selectedText: string | undefined
    if (selection && !selection.isEmpty) {
      selectedText = document.getText(selection)
    }

    return {
      lines,
      language: document.languageId,
      filepath: document.uri.fsPath,
      selection: selectedText,
    }
  }

  /**
   * Register this completion provider with VS Code.
   * Note: This is a SEPARATE provider from VS Code's IntelliSense and Copilot's
   * inline completions. They coexist without conflict.
   */
  register(): vscode.Disposable {
    const selector: vscode.DocumentSelector = [
      { scheme: "file" },
      { scheme: "untitled" },
    ]

    return vscode.languages.registerInlineCompletionItemProvider(
      selector,
      this,
    )
  }
}
