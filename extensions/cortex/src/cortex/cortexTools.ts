import * as vscode from "vscode"
import type { CortexAIService } from "./cortexAIService"
import type { CortexSessionManager } from "./cortexSession"

export interface ToolCall {
  id: string
  name: string
  arguments: Record<string, any>
  status: "pending" | "running" | "completed" | "failed" | "needs_approval"
  result?: any
  error?: string
  approvals?: { name: string; description: string }[]
}

export interface ToolResult {
  toolCallId: string
  status: "success" | "error"
  data?: any
  error?: string
}

export type ToolCategory =
  | "filesystem"
  | "terminal"
  | "git"
  | "network"
  | "code"
  | "shell"
  | "search"
  | "system"

export interface ToolDefinition {
  name: string
  description: string
  category: ToolCategory
  parameters: Record<string, { type: string; description: string; required?: boolean }>
  needsApproval: boolean
  handler?: (args: Record<string, any>) => Promise<any>
}

export class CortexToolManager {
  private service: CortexAIService
  private sessionManager: CortexSessionManager
  private activeCalls: Map<string, ToolCall> = new Map()
  private toolDefinitions: Map<string, ToolDefinition> = new Map()

  readonly onToolCallStarted = new vscode.EventEmitter<ToolCall>()
  readonly onToolCallUpdated = new vscode.EventEmitter<ToolCall>()
  readonly onToolCallCompleted = new vscode.EventEmitter<ToolCall>()

  constructor(service: CortexAIService, sessionManager: CortexSessionManager) {
    this.service = service
    this.sessionManager = sessionManager
    this.registerBuiltInTools()
  }

  private registerBuiltInTools(): void {
    const tools: ToolDefinition[] = [
      {
        name: "read_file",
        description: "Read a file from the workspace",
        category: "filesystem",
        needsApproval: false,
        parameters: {
          path: { type: "string", description: "File path to read", required: true },
        },
      },
      {
        name: "write_file",
        description: "Write content to a file",
        category: "filesystem",
        needsApproval: true,
        parameters: {
          path: { type: "string", description: "File path to write", required: true },
          content: { type: "string", description: "Content to write", required: true },
        },
      },
      {
        name: "edit_file",
        description: "Apply a diff to a file",
        category: "filesystem",
        needsApproval: true,
        parameters: {
          path: { type: "string", description: "File path to edit", required: true },
          old_string: { type: "string", description: "Text to replace", required: true },
          new_string: { type: "string", description: "Replacement text", required: true },
        },
      },
      {
        name: "list_directory",
        description: "List files in a directory",
        category: "filesystem",
        needsApproval: false,
        parameters: {
          path: { type: "string", description: "Directory path", required: true },
        },
      },
      {
        name: "search_files",
        description: "Search for text in files",
        category: "search",
        needsApproval: false,
        parameters: {
          query: { type: "string", description: "Search query", required: true },
          path: { type: "string", description: "Search path", required: false },
        },
      },
      {
        name: "execute_command",
        description: "Execute a shell command",
        category: "terminal",
        needsApproval: true,
        parameters: {
          command: { type: "string", description: "Command to execute", required: true },
          cwd: { type: "string", description: "Working directory", required: false },
        },
      },
      {
        name: "git_diff",
        description: "Show git diff",
        category: "git",
        needsApproval: false,
        parameters: {
          path: { type: "string", description: "File or repo path", required: false },
        },
      },
      {
        name: "git_commit",
        description: "Create a git commit",
        category: "git",
        needsApproval: true,
        parameters: {
          message: { type: "string", description: "Commit message", required: true },
          add: { type: "string", description: "Files to add", required: false },
        },
      },
    ]

    for (const tool of tools) {
      this.toolDefinitions.set(tool.name, tool)
    }
  }

  getTools(): ToolDefinition[] {
    return Array.from(this.toolDefinitions.values()).map((t) => ({
      name: t.name,
      description: t.description,
      category: t.category,
      parameters: t.parameters,
      needsApproval: t.needsApproval,
    }))
  }

  getTool(name: string): ToolDefinition | undefined {
    return this.toolDefinitions.get(name)
  }

  async executeTool(
    sessionId: string,
    toolCall: ToolCall,
  ): Promise<ToolResult> {
    this.activeCalls.set(toolCall.id, toolCall)
    toolCall.status = "running"
    this.onToolCallUpdated.fire(toolCall)

    try {
      const toolDef = this.toolDefinitions.get(toolCall.name)
      if (!toolDef) {
        throw new Error(`Unknown tool: ${toolCall.name}`)
      }

      if (toolDef.needsApproval) {
        toolCall.status = "needs_approval"
        this.onToolCallUpdated.fire(toolCall)
        return {
          toolCallId: toolCall.id,
          status: "success",
          data: { needsApproval: true, toolCallId: toolCall.id },
        }
      }

      let result: any
      if (toolDef.handler) {
        result = await toolDef.handler(toolCall.arguments)
      } else {
        result = await this.executeBuiltInTool(toolDef, toolCall.arguments)
      }

      toolCall.status = "completed"
      toolCall.result = result
      this.onToolCallCompleted.fire(toolCall)

      return {
        toolCallId: toolCall.id,
        status: "success",
        data: result,
      }
    } catch (e) {
      toolCall.status = "failed"
      toolCall.error = (e as Error).message
      this.onToolCallUpdated.fire(toolCall)

      return {
        toolCallId: toolCall.id,
        status: "error",
        error: (e as Error).message,
      }
    } finally {
      this.activeCalls.delete(toolCall.id)
    }
  }

  private async executeBuiltInTool(
    tool: ToolDefinition,
    args: Record<string, any>,
  ): Promise<any> {
    switch (tool.name) {
      case "read_file":
        return this.readFile(args.path)
      case "write_file":
        return this.writeFile(args.path, args.content)
      case "edit_file":
        return this.editFile(args.path, args.old_string, args.new_string)
      case "list_directory":
        return this.listDirectory(args.path)
      case "search_files":
        return this.searchFiles(args.query, args.path)
      case "git_diff":
        return this.gitDiff(args.path)
      default:
        throw new Error(`No built-in handler for tool: ${tool.name}`)
    }
  }

  private async readFile(path: string): Promise<string> {
    const uri = vscode.Uri.file(path)
    const doc = await vscode.workspace.fs.readFile(uri)
    return Buffer.from(doc).toString("utf-8")
  }

  private async writeFile(path: string, content: string): Promise<void> {
    const uri = vscode.Uri.file(path)
    await vscode.workspace.fs.writeFile(uri, Buffer.from(content, "utf-8"))
  }

  private async editFile(path: string, oldStr: string, newStr: string): Promise<void> {
    const uri = vscode.Uri.file(path)
    const doc = await vscode.workspace.openTextDocument(uri)
    const text = doc.getText()
    const updated = text.replace(oldStr, newStr)
    const edit = new vscode.WorkspaceEdit()
    edit.replace(uri, new vscode.Range(0, 0, doc.lineCount, 0), updated)
    await vscode.workspace.applyEdit(edit)
  }

  private async listDirectory(path: string): Promise<string[]> {
    const uri = vscode.Uri.file(path)
    const entries = await vscode.workspace.fs.readDirectory(uri)
    return entries.map(([name]) => name)
  }

  private async searchFiles(query: string, path?: string): Promise<any[]> {
    const results = await vscode.workspace.findFiles(
      new vscode.RelativePattern(path || vscode.workspace.workspaceFolders?.[0]?.uri ?? "", `*${query}*`),
    )
    return results.map((r) => ({ uri: r.fsPath }))
  }

  private async gitDiff(path?: string): Promise<string> {
    const result = await vscode.commands.executeCommand("git.diff", path)
    return result as string
  }

  getActiveToolCalls(): ToolCall[] {
    return Array.from(this.activeCalls.values())
  }

  dispose(): void {
    this.onToolCallStarted.dispose()
    this.onToolCallUpdated.dispose()
    this.onToolCallCompleted.dispose()
    this.activeCalls.clear()
    this.toolDefinitions.clear()
  }
}
