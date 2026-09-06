# Copilot Migration Map

## Migration Strategy

The integration will be **progressive and surgical**. The Kilo Code extension will be added as a new built-in extension (`extensions/cortex/`), and the Copilot Chat AI surface will be replaced with the Kilo Code UI backed by Cortex Engine.

Architecture after integration:
```
VS Code Workbench (GitCortex Studio)
│
├── Editor / Explorer / Terminal / Git / Debug / Testing / Extensions (UNCHANGED)
│
├── OLD: Copilot Chat (extensions/copilot/)
│   → REMOVED from Activity Bar
│   → Extension code kept but view registration disabled
│   → Inline completions (nes/completions) kept or replaced
│
└── NEW: Cortex Agentic UI (extensions/cortex/)
    ├── Kilo Code webview UI (ports from kilocode/packages/kilo-vscode/webview-ui)
    ├── CortexAIService (abstraction layer → Cortex Engine)
    ├── Cortex Engine (actual AI backend)
    └── VS Code integration (commands, keybindings, menus)
```

## Component Mapping

### Copilot Components

| ANCIEN COMPOSANT | EMPLACEMENT | FONCTION ACTUELLE | KEEP / REMOVE / REPLACE | NOUVEAU COMPOSANT |
|---|---|---|---|---|
| Copilot Chat view container | `extensions/copilot/package.json` → `viewsContainers.activitybar` | Activity Bar icon "Chat Debug" | REPLACE | `cortex-ActivityBar` (Kilo view container) |
| Copilot Chat view | `extensions/copilot/package.json` → `views.copilot-chat` | Chat debug panel view | REMOVE | (replaced by Cortex webview) |
| Context Inspector view | `extensions/copilot/package.json` → `views.context-inspector` | Language context inspector | REMOVE | (not ported) |
| Copilot Chat panel | `extensions/copilot/src/extension/chat/` | Full chat UI (agents, sessions, context) | REPLACE | Kilo webview App.tsx |
| Copilot CLI sessions | `extensions/copilot/src/extension/chatSessions/` | CLI agent session management | REMOVE (replace with Kilo sessions) | Kilo session management |
| Copilot inline completions | `extensions/copilot/src/extension/completions/` | Ghost text / next-edit suggestions | KEEP (distinct from agentic UI) | Keep or replace with Kilo autocomplete |
| Copilot agent host | `extensions/copilot/src/extension/agents/` | Agent mode support | REPLACE | Kilo agent mode |
| Copilot commands | `extensions/copilot/package.json` → `commands` | 82+ chat/CLI/review commands | REPLACE | Kilo commands |
| Copilot menus | `extensions/copilot/package.json` → `menus` | 17 menu groups (editor, chat, scm, comments, etc.) | REMOVE/REPLACE | Kilo context menus |
| Copilot keybindings | `extensions/copilot/package.json` → `keybindings` | 4 CLI-related shortcuts | REMOVE/REPLACE | Kilo keybindings |
| Copilot icons | `extensions/copilot/package.json` → `icons` | copilot-logo, copilot-warning, copilot-notconnected | REMOVE | (remove Kilo branding per rules) |
| Copilot languages | `extensions/copilot/package.json` → `languages` | `.copilotignore`, `.copilotmd` | REMOVE | (not relevant) |
| Copilot configuration | `extensions/copilot/package.json` → `configuration` | 4 Copilot-specific settings | REMOVE/REPLACE | Kilo configuration |
| product.json chatExtensionId | `product.json` → `chatExtensionId: 'GitHub.copilot-chat'` | Identifies Copilot as default chat | REPLACE | `'cortex-ai'` (new extension) |
| sessions/copilotChatSessions | `src/vs/sessions/contrib/providers/copilotChatSessions/` | Copilot session provider for sessions window | REPLACE | Cortex session provider |
| sessions/chatDebug | `src/vs/sessions/contrib/chatDebug/` | Moves Copilot Chat view to Sessions panel | REMOVE | (no longer needed) |
| chatDebug.contribution | `src/vs/sessions/contrib/chatDebug/browser/chatDebug.contribution.ts` | Moves copilot-chat view to sessions panel | REMOVE | (no Copilot Chat view) |
| copilot-migrate-pr | `build/copilot-migrate-pr.ts` | PR migration utility | REMOVE | (not needed) |
| Build tasks | `build/gulpfile.extensions.ts` | Compile Copilot extension | UPDATE | Add Cortex build tasks |
| packageCopilotExtensionStream | `build/lib/extensions.ts:472` | Package Copilot extension | REPLACE | `packageCortexExtensionStream` |
| compileCopilotExtensionBuildTask | `build/gulpfile.extensions.ts:290` | Compile Copilot build | UPDATE | Add Cortex compile task |
| hygiene.ts | `build/hygiene.ts:36` | Reads Copilot package.json | UPDATE | Also handle cortex |
| build-fast.ts | `build/next/build-fast.ts:356,423` | Checks Copilot artifacts | UPDATE | Also handle cortex |

### Kilo Code Components (to port)

| FONCTIONNALITÉ | FICHIER RÉEL | TYPE | RÉUTILISABLE | ADAPTATION CORTEX |
|---|---|---|---|---|
| Sidebar webview | `KiloProvider.ts` | UI/Logic | YES (adapt backend) | CortexAIService |
| Agent Manager | `AgentManagerProvider.ts`, `vscode-host.ts` | UI/Logic | YES (adapt backend) | CortexAIService |
| Chat View | `webview-ui/src/components/chat/ChatView.tsx` | UI | YES | Keep UI, replace data source |
| Message List | `webview-ui/src/components/chat/MessageList.tsx` | UI | YES | Keep, adapt event types |
| Prompt Input | `webview-ui/src/components/chat/PromptInput.tsx` | UI | YES | Keep, replace prompt routing |
| SessionDock | `webview-ui/src/components/chat/SessionDock.tsx` | UI | YES | Cortex session manager |
| PermissionDock | `webview-ui/src/components/chat/PermissionDock.tsx` | UI | YES | Cortex permission bridge |
| QuestionDock | `webview-ui/src/components/chat/QuestionDock.tsx` | UI | YES | Cortex question bridge |
| HistoryView | `webview-ui/src/components/history/HistoryView.tsx` | UI | YES | Cortex session history |
| BackgroundAgents | `webview-ui/src/components/chat/BackgroundAgents.tsx` | UI | YES | Cortex background agents |
| Settings | `webview-ui/src/components/settings/` | UI | YES | Cortex settings |
| Profile | `webview-ui/src/components/profile/` | UI | YES | Keep |
| Diff Viewer | `DiffViewerProvider.ts` | UI/Logic | YES | Keep |
| KiloClaw | `KiloClawProvider.ts` | UI/Logic | YES | Keep |
| Autocomplete | `services/autocomplete/` | Logic | YES (separate from Copilot completions) | Cortex autocomplete provider |
| Code Actions | `services/code-actions/` | Logic | YES | Keep |
| Git Integration | `GitOps.ts`, `services/git/` | Logic | YES | Use VS Code Git API |
| Terminal | `services/terminal/` | Logic | YES | Use VS Code Terminal API |
| CLI Backend | `services/cli-backend/` | Backend | NO (replace) | Cortex Engine connection |
| Connection Service | `connection-service.ts` | Logic | YES (adapt) | Cortex connection |
| SDK SSE Adapter | `sdk-sse-adapter.ts` | Logic | YES (adapt) | Cortex SSE adapter |
| Server Manager | `server-manager.ts` | Logic | YES (adapt) | Cortex server manager |
| Session Stream Scheduler | `session-stream-scheduler.ts` | Logic | YES (adapt) | Cortex event mapper |
| Provider Utils | `kilo-provider-utils.ts` | Logic | YES (adapt) | Cortex event mapper |
| Auto Approve | `auto-approve.ts` | Logic | YES | Keep |
| Notifications | `notofications.ts` | Logic | YES | Keep |
| Memory | `memory.ts` | Logic | YES | Keep |
| Fork Session | `fork-session.ts` | Logic | YES | Keep |
| Model State | `model-state.ts` | Logic | YES | Keep |
| File Search | `file-search.ts` | Logic | YES | Keep |
| File Picker | `file-picker.ts` | Logic | YES | Keep |
| Message Files | `message-files.ts` | Logic | YES | Keep |
| Rename Session | `rename-session.ts` | Logic | YES | Keep |
| Session Edits | `session-edits.ts` | Logic | YES | Keep |
| Background Process | `background-process.ts` | Logic | YES | Keep |
| Network Events | `network.ts` | Logic | YES | Keep |
| Open Config | `open-config.ts` | Logic | YES | Keep |
| Commands loader | `commands.ts` | Logic | YES | Keep |
| Editor Actions | `editor-actions.ts` | Logic | YES | Keep |
| Export Transcript | `export-transcript.ts` | Logic | YES | Keep |
| Work Style | `work-style.ts` | Logic | YES | Keep |
| Chat Settings | `chat-settings.ts` | Logic | YES | Keep |
| Config Snapshot | `config-snapshot.ts` | Logic | YES | Keep |
| Indexing Settings | `indexing-settings.ts` | Logic | YES | Keep |
| Throughput Settings | `throughput-settings.ts` | Logic | YES | Keep |
| Auto-approval Reason | `auto-approval-reason-settings.ts` | Logic | YES | Keep |
| Permission Handler | `permission-handler.ts` | Logic | YES | Keep |
| Question Handler | `question.ts` | Logic | YES | Keep |
| Suggestion Handler | `suggestion.ts` | Logic | YES | Keep |
| Native Tab Title | `native-tab-title.ts` | Logic | YES | Keep |
| Slim Metadata | `slim-metadata.ts` | Logic | YES | Keep |
| Sidebar Worktree | `sidebar-worktree.ts` | Logic | YES | Keep |
| Git Status | `git-status.ts` | Logic | YES | Keep |
| Abort | `abort.ts` | Logic | YES | Keep |
| Early Message | `early-message.ts` | Logic | YES | Keep |
| Options | `options.ts` | Logic | YES | Keep |
| Context Page | `context/` (webview) | UI | YES | Keep |
| Server Context | `context/server.tsx` | UI | YES (adapt backend) | CortexAIService |
| VSCode Context | `context/vscode.tsx` | UI | YES | Keep |
| Provider Context | `context/provider.tsx` | UI | YES | Keep |
| Session Context | `context/session.tsx` | UI | YES | Keep |
| Worktree Mode | `context/worktree-mode.tsx` | UI | YES | Keep |
| Diff Style | `context/diff-style.tsx` | UI | YES | Keep |
| Local Tabs | `context/local-tabs.tsx` | UI | YES | Keep |
| Provider Shell | `context/provider-shell.tsx` | UI | YES | Keep |
| Work Style Provider | `context/work-style.tsx` | UI | YES | Keep |
| Agent Router | `context/session-agent.tsx` | UI | YES | Keep |
| Styles | `styles/` | UI | YES | Keep |
| i18n | `i18n/` | UI | YES | Keep |

## VS Code Surfaces to KEEP

| Surface | Reason |
|---|---|
| Editor / Monaco | Core editing functionality |
| Explorer | File navigation |
| Search | Code search |
| Source Control | Git integration panel |
| Git | Version control |
| Terminal | Integrated terminal |
| Debug | Debugging infrastructure |
| Extensions | Extension management |
| Problems | Error display |
| Output | Output panel |
| Command Palette | All commands |
| Keyboard Shortcuts | All shortcuts |
| Settings | All settings |
| Workbench | Core workbench |
| IntelliSense / Autocomplete | Native VS Code autocomplete |
| Diff Editor | Built-in diff viewer |
| File System | File operations |
| Build System | gulp/esbuild build |
| Extension System | Extension loading |

## Migration Steps

### Phase 0-2: Audit & License (DONE)
- [x] COPILOT_AUDIT.md
- [x] KILO_AUDIT.md
- [x] LICENSE_INTEGRATION_AUDIT.md

### Phase 3: Migration Map (THIS DOCUMENT)
- [x] COPILOT_MIGRATION_MAP.md

### Phase 4: Progressive Integration
1. Create `extensions/cortex/` extension directory
2. Copy Kilo Code webview UI source (`webview-ui/src/`)
3. Copy Kilo Code extension source (`src/extension.ts`, `KiloProvider.ts`, services/)
4. Create `src/cortex/` abstraction layer (CortexAIService, CortexClient, etc.)
5. Replace CLI backend with Cortex Engine bridge
6. Set up build system (esbuild config, gulp tasks)
7. Update `product.json` (builtInExtensions)
8. Update build/lib/extensions.ts (packageCortexExtensionStream)
9. Update build/gulpfile.extensions.ts (compile tasks)
10. Build and test incrementally
