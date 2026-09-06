# Kilo Code Audit — Frankenstein-Labs/kilocode

## Overview

The Kilo Code repository is a monorepo containing the Kilo Code VS Code extension and its supporting packages. The extension provides an agentic AI coding experience with chat, sessions, agent management, autocomplete, and various developer tools.

## Repository Structure

| Package | Path | Purpose |
|---|---|---|
| `kilo-vscode` | `packages/kilo-vscode/` | VS Code extension (main entry point) |
| `kilo-ui` | `packages/kilo-ui/` | UI component library (SolidJS) |
| `core` | `packages/core/` | Core logic: agents, filesystem, git, shell, LLM |
| `opencode` | `packages/opencode/` | OpenCode integration |
| `protocol` | `packages/protocol/` | Event protocol types |
| `sdk` | `packages/sdk/` | SDK types (v2 client) |
| `kilo-gateway` | `packages/kilo-gateway/` | API gateway for models |
| `kilo-i18n` | `packages/kilo-i18n/` | Internationalization |
| `kilo-indexing` | `packages/kilo-indexing/` | Workspace indexing |
| `kilo-memory` | `packages/kilo-memory/` | Memory/session storage |
| `kilo-sandbox` | `packages/kilo-sandbox/` | Sandbox/VM support |
| `kilo-telemetry` | `packages/kilo-telemetry/` | Telemetry |
| `kilo-web-ui` | `packages/kilo-web-ui/` | Web UI version |
| `kilo-jetbrains` | `packages/kilo-jetbrains/` | JetBrains IDE plugin |
| `kilo-console` | `packages/kilo-console/` | Console/dashboard |
| `kilo-docs` | `packages/kilo-docs/` | Documentation |
| `kilo-gateway` | `packages/kilo-gateway/` | Gateway API |
| `http-recorder` | `packages/http-recorder/` | HTTP recording |
| `httpapi-codegen` | `packages/httpapi-codegen/` | Codegen |
| `llm` | `packages/llm/` | LLM abstraction |
| `plugin` | `packages/plugin/` | Plugin system |
| `plugin-atomic-chat` | `packages/plugin-atomic-chat/` | Atomic chat plugin |
| `schema` | `packages/schema/` | Zod schemas |
| `script` | `packages/script/` | Scripts |
| `sdk-next` | `packages/sdk-next/` | Next-gen SDK |
| `server` | `packages/server/` | Server package |
| `session-ui` | `packages/session-ui/` | Session UI |
| `storybook` | `packages/storybook/` | Storybook |
| `tui` | `packages/tui/` | Terminal UI |
| `ui` | `packages/ui/` | UI utilities |
| `effect-drizzle-sqlite` | `packages/effect-drizzle-sqlite/` | SQLite |
| `effect-sqlite-node` | `packages/effect-sqlite-node/` | SQLite |
| `containers` | `packages/containers/` | Container support |
| `codemode` | `packages/codemode/` | Code modes |
| `client` | `packages/client/` | Client library |
| `effect-drizzle-sqlite` | `packages/effect-drizzle-sqlite/` | SQLite |

## VS Code Extension (kilo-vscode)

### Metadata

| Field | Value |
|---|---|
| Name | `kilo-code` |
| Display Name | `Kilo Code: AI Coding Agent, Copilot, and Autocomplete` |
| Publisher | `kilocode` |
| Version | — (from package.json) |
| Main entry | `./dist/extension.js` |
| License | MIT (Copyright 2026 Kilo Code, 2025 opencode) |
| Activation events | `onStartupFinished`, `onUri` |

### View Containers (Activity Bar)

| Container ID | Title | Icons | Action |
|---|---|---|---|
| `kilo-code-ActivityBar` | Kilo Code | `assets/icons/kilo-light.png` / `assets/icons/kilo-dark.png` | ADAPT |

### Views

| View ID | Container | Type | Name | Action |
|---|---|---|---|---|
| `kilo-code.SidebarProvider` | `kilo-code-ActivityBar` | webview | Kilo Code | ADAPT (replace branding) |

### Webview Panels (Editor tabs)

| View Type | Title | Icons | Action |
|---|---|---|---|
| `kilo-code.new.AgentManagerPanel` | Agent Manager | — | ADAPT |
| `kilo-code.new.KiloClawPanel` | KiloClaw | — | ADAPT |
| `kilo-code.new.DiffViewerPanel` | Changes | — | ADAPT |
| `kilo-code.new.DocumentsPanel` | Documents | — | ADAPT |
| `kilo-code.new.marketplacePanel` | Marketplace | — | ADAPT |
| `kilo-code.new.SubAgentViewerPanel` | Sub-Agent Viewer | — | ADAPT |
| `kilo-code.new.TabPanel` | (dynamic) | `kilo-light.svg` / `kilo-dark.svg` | ADAPT |

### Webview HTML Bundles

| Panel | Script | Style |
|---|---|---|
| Sidebar (KiloProvider) | `dist/webview.js` | `dist/webview.css` |
| Agent Manager | `dist/agent-manager.js` | `dist/agent-manager.css` |
| KiloClaw | `dist/kiloclaw.js` | `dist/kiloclaw.css` |
| Diff Viewer | `dist/diff-viewer.js` | `dist/diff-viewer.css` |
| Documents | `dist/documents.js` | `dist/documents.css` |
| Marketplace | `dist/marketplace.js` | `dist/marketplace.css` |
| Diff Virtual | `dist/diff-virtual.js` | `dist/diff-virtual.css` |

### Webview UI Source

| File | Purpose |
|---|---|
| `webview-ui/src/index.tsx` | Entry point |
| `webview-ui/src/App.tsx` | Main app component (SolidJS) |
| `webview-ui/src/components/` | UI components (chat, history, settings, profile) |
| `webview-ui/src/components/chat/ChatView.tsx` | Chat view |
| `webview-ui/src/components/chat/MessageList.tsx` | Message list |
| `webview-ui/src/components/chat/PromptInput.tsx` | Prompt input |
| `webview-ui/src/components/chat/SessionDock.tsx` | Session sidebar |
| `webview-ui/src/components/chat/PermissionDock.tsx` | Permission approvals |
| `webview-ui/src/components/chat/PromptRail.tsx` | Prompt rail (quick actions) |
| `webview-ui/src/components/chat/QuestionDock.tsx` | Question prompts |
| `webview-ui/src/components/chat/BackgroundAgents.tsx` | Background agents |
| `webview-ui/src/context/` | React/Solid context providers |

### Commands (69 total)

Key commands organized by category:

**New Session & Navigation**
- `kilo-code.new.plusButtonClicked` — New Task
- `kilo-code.new.agentManagerOpen` — Agent Manager
- `kilo-code.new.kiloClawOpen` — KiloClaw
- `kilo-code.new.marketplaceButtonClicked` — Marketplace
- `kilo-code.new.historyButtonClicked` — History
- `kilo-code.new.profileButtonClicked` — Profile
- `kilo-code.new.settingsButtonClicked` — Settings
- `kilo-code.new.openInTab` — Open in Tab
- `kilo-code.new.showChanges` — Show Changes
- `kilo-code.new.showMemory` — Show Project Memory
- `kilo-code.new.toggleMemory` — Toggle Project Memory

**Chat & Agent**
- `kilo-code.new.focusChatInput` — Focus chat input
- `kilo-code.new.cycleAgentMode` — Cycle agent mode
- `kilo-code.new.cyclePreviousAgentMode` — Previous agent mode
- `kilo-code.new.generateTerminalCommand` — Generate terminal command
- `kilo-code.new.toggleRemote` — Toggle remote

**Autocomplete**
- `kilo-code.new.autocomplete.generateSuggestions` — Generate suggested edits
- `kilo-code.new.autocomplete.cancelSuggestions` — Cancel suggested edits

**Agent Manager (worktree/terminal/session management)**
- `kilo-code.new.agentManagerOpen`
- `kilo-code.new.agentManager.showTerminal`
- `kilo-code.new.agentManager.previousTerminal` / `nextTerminal`
- `kilo-code.new.agentManager.previousSession` / `nextSession`
- `kilo-code.new.agentManager.previousTab` / `nextTab`
- `kilo-code.new.agentManager.search`
- `kilo-code.new.agentManager.runScript`
- `kilo-code.new.agentManager.toggleDiff`
- `kilo-code.new.agentManager.showShortcuts`
- `kilo-code.new.agentManager.newTab` / `closeTab`
- `kilo-code.new.agentManager.newTerminalTab` / `newSideTerminal`
- `kilo-code.new.agentManager.newWorktree` / `quickWorktree` / `openWorktree`
- `kilo-code.new.agentManager.updateFromBase`
- `kilo-code.new.agentManager.openPR` / `closeWorktree`
- `kilo-code.new.agentManager.advancedWorktree`
- `kilo-code.new.agentManager.jumpTo1-9` — Jump to tab

**Editor Integration**
- `kilo-code.new.chatCodeCommand` — Generate Terminal Command
- `kilo-code.new.addToContext` — Add to context

**Settings**
- `kilo-code.new.openIndexingSettings`

**Debug**
- `kilo-code.new.reload`
- `kilo-code.new.agentManager.showShortcuts`

### Keybindings (42 total)

| Key | Command | When |
|---|---|---|
| `ctrl+shift+a` | `kilo-code.new.focusChatInput` | — |
| `ctrl+alt+a` | `kilo-code.new.toggleAutoApprove` | — |
| `ctrl+shift+g` | `kilo-code.new.generateTerminalCommand` | — |
| `ctrl+shift+m` | `kilo-code.new.agentManagerOpen` | — |
| `ctrl+k ctrl+a` | `kilo-code.new.addToContext` | `editorTextFocus && editorHasSelection` |
| `ctrl+alt+up/down/left/right` | session/tab/terminal navigation | `activeWebviewPanelId == 'kilo-code.new.AgentManagerPanel'` |
| `ctrl+[`/]`]` | previous/next terminal | AgentManager panel active |
| `ctrl+f` | search | AgentManager panel active |
| `ctrl+/` | show terminal | AgentManager panel active |
| `ctrl+e` | run script | AgentManager panel active |
| `ctrl+d` | toggle diff | AgentManager panel active |
| `ctrl+shift+/` | show shortcuts | AgentManager panel active |
| `ctrl+t` | new tab/new side terminal | AgentManager panel active |
| `ctrl+shift+t` | new terminal tab | AgentManager panel active |
| `ctrl+w` | close tab | AgentManager panel active |
| `ctrl+n` | new worktree | AgentManager panel active |
| `ctrl+shift+n` | quick worktree | AgentManager panel active |
| `ctrl+shift+o` | open worktree | AgentManager panel active |
| `ctrl+shift+r` | open PR | AgentManager panel active |
| `ctrl+shift+w` | close worktree | AgentManager panel active |
| `ctrl+1-9` | jump to tab | AgentManager panel active |
| `ctrl+.` | cycle agent mode | sidebar or panel focused |
| `ctrl+shift+.` | cycle previous agent mode | sidebar or panel focused |
| `escape` | cancel suggestions | editor text focus |
| `ctrl+l` | generate/cancel suggestions | editor text focus |
| `tab` | accept/jump next edit | next edit suggestion pending |
| `escape` | dismiss next edit | next edit suggestion pending |

### Configuration Properties (29 total)

Key settings:
- `kilo-code.new.fontSize` — Webview font size
- `kilo-code.new.autocomplete.enableSmartInlineTaskKeybinding`
- `kilo-code.new.experimental.browserAutomation`
- `kilo-code.new.experimental`

### Backend Connection (CLI Backend)

The Kilo Code extension connects to a CLI backend via `KiloConnectionService`:

| File | Purpose |
|---|---|
| `src/services/cli-backend/connection-service.ts` | Main connection manager |
| `src/services/cli-backend/server-manager.ts` | Spawns and manages the Kilo CLI server |
| `src/services/cli-backend/sdk-sse-adapter.ts` | SSE adapter for Kilo SDK communication |
| `src/services/cli-backend/types.ts` | Connection types (EditorContext, IndexingStatus) |
| `src/services/cli-backend/explicit-abort.ts` | Abort handling |
| `src/services/cli-backend/connection-utils.ts` | Connection utilities |

The backend is spawned as a Node.js child process. The server-manager.ts spawns the CLI binary with:
- `KILO_DISABLE_CHANNEL_DB=true`
- `KILO_EXPERIMENTAL_DISABLE_FILEWATCHER=true`
- Tree-sitter and bwrap (bubblewrap) environment setup

Communication protocol: SSE (Server-Sent Events) over HTTP, with a password-authenticated connection.

### Core Package (packages/core)

Key modules:
- `core/agent.ts` — Agent orchestration
- `core/config.ts` — Configuration
- `core/credential.ts` — Credential management
- `core/file.ts` — File operations
- `core/filesystem.ts` — Filesystem abstraction
- `core/git.ts` — Git integration
- `core/shell.ts` — Shell/terminal execution
- `core/command.ts` — Command execution
- `core/event.ts` — Event system
- `core/database/` — Database (SQLite)
- `core/effect/` — Effect-based abstractions

### SDK Package (packages/sdk)

| File | Purpose |
|---|---|
| `sdk/v2/client/` | V2 client types (KiloClient, Session, Event, Agent, Config, etc.) |

### Kilo UI Package (packages/kilo-ui)

| Component | Type | Description |
|---|---|---|
| `accordion` | UI | Collapsible sections |
| `button` | UI | Button components |
| `card` | UI | Card containers |
| `chat-input` | UI | Chat input area |
| `checkbox` | UI | Checkboxes |
| `code` | UI | Code display |
| `collapsible` | UI | Collapsible sections |
| `context-menu` | UI | Context menus |
| `dialog` | UI | Dialogs |
| `diff` | UI | Diff display |
| `dropdown-menu` | UI | Dropdown menus |
| `error-details` | UI | Error display |
| `avatar` | UI | User avatar |
| `basic-tool` | UI | Tool result display |
| `chart` | UI | Chart display |
| `dock-prompt` | UI | Dock prompt |
| `dock-surface` | UI | Dock surface |
| `favicon` | UI | Favicon |
| `file-link-validator` | Logic | File link validation |

### Services (kilo-vscode/src/services/)

| Service | Purpose |
|---|---|
| `autocomplete/` | Autocomplete provider (distinct from Copilot inline completions) |
| `code-actions/` | Editor code actions (lightbulb) |
| `commit-message/` | Commit message generation |
| `git/` | Git integration |
| `terminal/` | Terminal integration |
| `marketplace/` | Extension marketplace |
| `notebook/` | Notebook bridge |
| `browser-automation/` | Browser automation |
| `speech-to-text/` | Speech recognition |
| `telemetry/` | Telemetry |
| `attention/` | Attention/focus |
| `RemoteStatusService.ts` | Remote status bar |

### Agent Manager (kilo-vscode/src/agent-manager/)

| File | Purpose |
|---|---|
| `AgentManagerProvider.ts` | Multi-session agent manager webview |
| `vscode-host.ts` | VS Code host bridge for agent manager |
| `GitOps.ts` | Git operations |
| `GitStatsPoller.ts` | Git stats polling |
| `project/` | Project management (worktrees, routes) |

### Kilo Provider (kilo-provider/)

| File | Purpose |
|---|---|
| `kilo-provider-utils.ts` | Provider utilities (session mapping, SSE event mapping) |
| `kilo-provider/commands.ts` | Command loading |
| `kilo-provider/config-file.ts` | Config file management |
| `kilo-provider/abort.ts` | Session abort |
| `kilo-provider/background-process.ts` | Background process management |
| `kilo-provider/chat-settings.ts` | Chat settings |
| `kilo-provider/config-snapshot.ts` | Config snapshot |
| `kilo-provider/early-message.ts` | Early message handling |
| `kilo-provider/editor-actions.ts` | Editor actions |
| `kilo-provider/export-transcript.ts` | Export transcript |
| `kilo-provider/file-picker.ts` | File picker |
| `kilo-provider/file-search.ts` | File search |
| `kilo-provider/fork-session.ts` | Fork session |
| `kilo-provider/git-status.ts` | Git status |
| `kilo-provider/message-files.ts` | Message file handling |
| `kilo-provider/message-page.ts` | Message pagination |
| `kilo-provider/model-state.ts` | Model state |
| `kilo-provider/model-usage.ts` | Model usage |
| `kilo-provider/native-tab-title.ts` | Native tab title |
| `kilo-provider/network.ts` | Network events |
| `kilo-provider/notifications.ts` | Notifications |
| `kilo-provider/open-config.ts` | Open config |
| `kilo-provider/options.ts` | Provider options |
| `kilo-provider/permission-handler.ts` | Permission handling |
| `kilo-provider/question.ts` | Question prompts |
| `kilo-provider/rename-session.ts` | Rename session |
| `kilo-provider/session-edits.ts` | Session edits |
| `kilo-provider/session-search.ts` | Session search |
| `kilo-provider/session-stream-scheduler.ts` | Stream scheduling |
| `kilo-provider/sidebar-worktree.ts` | Sidebar worktree |
| `kilo-provider/slim-metadata.ts` | Slim metadata |
| `kilo-provider/suggestion.ts` | Suggestions |
| `kilo-provider/throughput-settings.ts` | Throughput settings |
| `kilo-provider/work-style.ts` | Work style |
| `kilo-provider/auto-approve.ts` | Auto-approve |
| `kilo-provider/auto-approval-reason-settings.ts` | Auto-approve settings |
| `kilo-provider/background-process.ts` | Background process |
| `kilo-provider/memory.ts` | Session memory |

### Webview App.tsx Structure

The Kilo webview UI (`webview-ui/src/App.tsx`) is a SolidJS app that manages:
- View routing: `newTask`, `history`, `profile`, `settings`, `subAgentViewer`
- Session state management via context providers
- Chat view with message streaming
- Sidebar top bar navigation (New Task, History, Agent Manager, etc.)
- Tab panel support
- Diff viewer integration
- Agent manager integration

### Icons & Assets

| Asset | Purpose |
|---|---|
| `assets/icons/kilo-light.png` | Light theme Activity Bar icon |
| `assets/icons/kilo-dark.png` | Dark theme Activity Bar icon |
| `assets/icons/kilo-icon-font.woff2` | Icon font |
| Various SVG icons in `assets/` | UI icons |

## Reusability Assessment

### Directly Reusable (UI)
- All webview UI components in `webview-ui/src/components/` — SolidJS components
- `webview-ui/src/context/` — Context providers
- `kilo-ui/src/components/` — Shared UI components
- `kilo-ui/src/styles/` — CSS styles

### Directly Reusable (Logic)
- Most `kilo-provider/` modules — session management, event handling
- `services/` modules — autocomplete, git, terminal, code-actions

### Adaptation Required (Backend)
- `services/cli-backend/` — MUST be replaced with Cortex Engine connection
- `core/` — Agent logic, may need adaptation for Cortex Engine
- `sdk/` — Types may need adaptation
- All `kilo-code.*` command IDs — Keep namespace but adapt behavior

### Kilo-Specific (Remove Branding)
- `kilo-logo` icon
- `kilo-code.new.*` command namespaces
- "Kilo Code" strings in UI
- KiloClaw, KiloProvider branding
