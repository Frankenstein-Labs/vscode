# Copilot Audit — Frankenstein-Labs/vscode

## Overview

The GitCortex Studio repository (VS Code fork) ships GitHub Copilot as a **built-in extension** at `extensions/copilot/`. This is the `github.copilot-chat` extension (package name: `copilot-chat` v0.63.0), which provides AI chat, agent, inline completion, and related features.

## Extension Metadata

| Field | Value |
|-------|-------|
| Location | `extensions/copilot/` |
| Package name | `copilot-chat` |
| Display name | `GitHub Copilot` |
| Publisher | `GitHub` |
| Extension ID | `github.copilot-chat` |
| Main entry | `./dist/extension` (compiled) |
| Activation events | `onStartupFinished`, `onLanguageModelChat:copilot`, `onUri`, `onCommand:_github.copilot.chat.reportModelFeedbackSurvey`, `onFileSystem:ccreq`, `onFileSystem:ccsettings` |
| License | SEE LICENSE IN LICENSE.txt |

## Product Configuration References

| Location | Reference | Value |
|----------|-----------|-------|
| `src/vs/platform/product/common/product.ts:92` | `chatExtensionId` | `'GitHub.copilot-chat'` |
| `package.json` | `@github/copilot` | `1.0.81-0` |
| `package.json` | `@github/copilot-sdk` | `1.0.11` |
| `package.json` | `@vscode/copilot-api` | `^0.5.2` |
| `product.json` | `builtInExtensions` | Copilot + JS-debug extensions listed |

## View Containers & Views (Activity Bar)

| Container ID | Title | Icon | Location | Action |
|---|---|---|---|---|
| `copilot-chat` | Chat Debug | `assets/debug-icon.svg` | Activity Bar | REPLACE |
| `context-inspector` | Language Context Inspector | `$(inspect)` | Activity Bar | REMOVE |

| View ID | Container | Name | Condition | Action |
|---|---|---|---|---|
| `copilot-chat` | `copilot-chat` | Chat Debug | `github.copilot.chat.showLogView` | REPLACE |
| `context-inspector` | `context-inspector` | Language Context Inspector | `github.copilot.chat.showContextInspectorView` | REMOVE |

**Note:** The `chatDebug.contribution.ts` at `src/vs/sessions/contrib/chatDebug/browser/chatDebug.contribution.ts:17` moves the Copilot Chat view to the Sessions panel. The view container ID is `workbench.view.extension.copilot-chat`.

## Commands (Command Palette)

Copilot registers ~82 commands in the Command Palette. Key categories:

### Chat Commands
| Command ID | Action |
|---|---|
| `github.copilot.chat.explain` | Explain selected code |
| `github.copilot.chat.fix` | Fix selected code |
| `github.copilot.chat.generate` | Generate code from prompt |
| `github.copilot.chat.review` | Review code changes |
| `github.copilot.chat.review.apply` | Apply review suggestion |
| `github.copilot.chat.review.discard` | Discard review suggestion(s) |
| `github.copilot.chat.compact` | Compact conversation |
| `github.copilot.chat.openUserPreferences` | Open Copilot settings |

### CLI Agent Session Commands
| Command ID | Action |
|---|---|
| `github.copilot.cli.newSession` | New Copilot CLI session |
| `github.copilot.cli.newSessionToSide` | New CLI session to side |
| `github.copilot.cli.openInCopilotCLI` | Open in Copilot CLI |
| `github.copilot.cli.sessions.delete` | Delete agent session |
| `github.copilot.cli.sessions.resumeInTerminal` | Resume in terminal |
| `github.copilot.cli.sessions.rename` | Rename session |
| `github.copilot.cli.sessions.setTitle` | Set session title |
| `github.copilot.cli.sessions.openRepository` | Open session repo |
| `github.copilot.cli.sessions.openWorktreeInNewWindow` | Open worktree in new window |
| `github.copilot.cli.sessions.openWorktreeInTerminal` | Open worktree in terminal |
| `github.copilot.cli.sessions.copyWorktreeBranchName` | Copy branch name |
| `github.copilot.cli.sessions.commitToWorktree` | Commit to worktree |
| `github.copilot.cli.sessions.commitToRepository` | Commit to repo |

### Debug Commands
| Command ID | Action |
|---|---|
| `github.copilot.debug.showChatLogView` | Show chat log view |
| `github.copilot.debug.showOutputChannel` | Show output channel |
| `github.copilot.debug.showContextInspectorView` | Show context inspector |
| `github.copilot.debug.extensionState` | Show extension state |
| `github.copilot.debug.workbenchState` | Log workbench state |
| `github.copilot.chat.debug.*` | Various debug toggles |

### Agent/Cloud Session Commands
| Command ID | Action |
|---|---|
| `github.copilot.chat.cloudSessions.*` | Cloud session management |
| `github.copilot.chat.applyCopilotCLIAgentSessionChanges` | Apply CLI session changes |
| `github.copilot.chat.mergeCopilotCLIAgentSessionChanges` | Merge CLI session changes |
| `github.copilot.chat.createPullRequestCopilotCLIAgentSession.createPR` | Create PR |
| `github.copilot.chat.createDraftPullRequestCopilotCLIAgentSession.createDraftPR` | Create draft PR |
| `github.copilot.chat.checkoutPullRequestReroute` | Checkout PR |
| `github.copilot.sessions.commit` | Commit session |
| `github.copilot.sessions.sync` | Sync session |

### Feedback
| Command ID | Action |
|---|---|
| `github.copilot.interactiveSession.feedback` | Send chat feedback |

## Keybindings

Only 4 Copilot-specific keybindings (all CLI-related):

| Key | Command | When |
|---|---|---|
| `ctrl+shift+.` | `github.copilot.chat.copilotCLI.addFileReference` | — |
| `ctrl+alt+.` | `github.copilot.chat.rerunWithCopilotDebug` | — |
| `ctrl+enter` | `github.copilot.nes.captureExpected.confirm` | — |
| `escape` | `github.copilot.nes.captureExpected.abort` | — |

Most Copilot functionality is accessed via the standard VS Code chat interface (`Ctrl+Shift+Enter` etc.) and the Activity Bar icon.

## Menu Contributions (17 menu groups)

| Menu Location | Items | Action |
|---|---|---|
| `commandPalette` | 82 items | REPLACE (Copilot commands) |
| `editor/title` | 5 items | REPLACE |
| `editor/title/context` | 1 item | REPLACE |
| `editor/context` | 5 items | REPLACE |
| `editor/content` | 1 item | REPLACE |
| `explorer/context` | 1 item | KEEP (context menu contribution — may conflict) |
| `chat/editor/inlineGutter` | 2 items | REPLACE |
| `chat/input/editing/sessionToolbar` | 4 items | REPLACE |
| `chat/input/editing/sessionTitleToolbar` | 1 item | REPLACE |
| `chat/input/status` | 1 item | REPLACE |
| `chat/newSession` | 1 item | REPLACE |
| `chat/chatSessions` | 9 items | REPLACE |
| `chatSessions/item/context` | 1 item | REPLACE |
| `chat/multiDiff/context` | 1 item | REMOVE |
| `chat/contextUsage/actions` | 1 item | REMOVE |
| `comments/comment/title` | 2 items | REPLACE |
| `comments/commentThread/additionalActions` | 4 items | REPLACE |
| `comments/commentThread/title` | 4 items | REPLACE |
| `commentsView/commentThread/context` | 3 items | REPLACE |
| `copilot/reviewComment/additionalActions/applyAndNext` | 2 items | REMOVE |
| `copilot/reviewComment/additionalActions/discard` | 2 items | REMOVE |
| `copilot/reviewComment/additionalActions/discardAndNext` | 3 items | REMOVE |
| `explorer/context` | 1 item (copilot addFileReference) | REPLACE |
| `github.copilot.chat.debug.filter` | 8 items | REMOVE |
| `issue/reporter` | 1 item | REPLACE |
| `multiDiffEditor/content` | 1 item | REMOVE |
| `notebook/toolbar` | 2 items | REPLACE |
| `scm/inputBox` | 1 item | REMOVE |
| `scm/resourceGroup/context` | 2 items | REPLACE |
| `scm/resourceState/context` | 3 items | REPLACE |
| `scm/sourceControl` | 1 item | KEEP |
| `scm/title` | 1 item | REPLACE |
| `searchPanel/aiResults/commands` | 3 items | REMOVE |
| `testing/item/context` | 1 item | REPLACE |
| `testing/item/result` | 1 item | REPLACE |
| `testing/message/context` | 1 item | REMOVE |
| `view/item/context` | 4 items | REMOVE |
| `view/title` | 5 items | REPLACE |

## Configuration Properties

| Setting ID | Default | Action |
|---|---|---|
| `github.copilot.chat.cli.enabled` | false | REPLACE |
| `github.copilot.chat.cli.path` | "" | REPLACE |
| `github.copilot.chat.autoMode.tiers.enabled` | false | REMOVE |
| `github.copilot.chat.workspace.codeSearchExternalIngest.enabled` | true | REMOVE |

## Icons

| Icon ID | Font Path | Character | Action |
|---|---|---|---|
| `copilot-logo` | `assets/copilot.woff` | `\0041` | REMOVE |
| `copilot-warning` | `assets/copilot.woff` | `\0042` | REMOVE |
| `copilot-notconnected` | `assets/copilot.woff` | `\0043` | REMOVE |

## API Proposals Used

The Copilot extension uses 53+ VS Code API proposals:

`agentSessionsWorkspace`, `agentsWindowConfiguration`, `chatDebug`, `chatHooks`, `extensionsAny`, `newSymbolNamesProvider`, `interactive`, `codeActionAI`, `activeComment`, `commentReveal`, `contribCommentThreadAdditionalMenu`, `contribCommentsViewThreadMenus`, `contribChatEditorInlineGutterMenu`, `documentFiltersExclusive`, `embeddings`, `findTextInFiles`, `findTextInFiles2`, `languageModelToolSupportsModel`, `findFiles2`, `textSearchProvider`, `terminalDataWriteEvent`, `terminalExecuteCommandEvent`, `terminalSelection`, `terminalQuickFixProvider`, `mappedEditsProvider`, `aiRelatedInformation`, `aiSettingsSearch`, `chatParticipantAdditions`, `defaultChatParticipant`, `contribSourceControlInputBoxMenu`, `authLearnMore`, `testObserver`, `aiTextSearchProvider`, `chatParticipantPrivate`, `chatProvider`, `contribDebugCreateConfiguration`, `chatReferenceDiagnostic`, `textSearchProvider2`, `chatReferenceBinaryData`, `languageModelSystem`, `languageModelCapabilities`, `languageModelPricing`, `inlineCompletionsAdditions`, `chatStatusItem`, `chatInputNotification`, `taskProblemMatcherStatus`, `contribLanguageModelToolSets`, `textDocumentChangeReason`, `resolvers`, `taskExecutionTerminal`, `dataChannels`, `languageModelThinkingPart`, `chatSessionsProvider`, `devDeviceId`, `contribEditorContentMenu`, `chatPromptFiles`, `mcpServerDefinitions`, `tabInputMultiDiff`, `workspaceTrust`, `environmentPower`, `terminalTitle`, `toolInvocationApproveCombination`, `chatSessionCustomizationProvider`

## Languages

| Language ID | Patterns | Action |
|---|---|---|
| `ignore` | `.copilotignore` | REMOVE |
| `markdown` | `.copilotmd` | REMOVE |

## Inline Completion

The Copilot extension provides inline completions via the `inlineCompletionsAdditions` API proposal. Key files:
- `extensions/copilot/src/extension/completions/` — inline completion provider
- `extensions/copilot/src/extension/inlineEdits/` — inline edit suggestions
- `extensions/copilot/src/extension/agents/` — agent functionality

## Build & Packaging

| File | Purpose | Action |
|---|---|---|
| `build/lib/extensions.ts:468` | Package built-in Copilot extension | UPDATE |
| `build/gulpfile.extensions.ts:287-290` | Compile Copilot extension build task | UPDATE |
| `build/hygiene.ts:36` | Reads Copilot package.json | UPDATE |
| `build/next/build-fast.ts:356,423` | Checks Copilot extension build artifacts | UPDATE |
| `build/darwin/create-universal-app.ts:74` | Copilot extension node_modules path | UPDATE |

## Sessions System Integration

The Copilot Chat sessions provider is integrated into the VS Code sessions system:

| File | Purpose |
|---|---|
| `src/vs/sessions/contrib/providers/copilotChatSessions/` | Copilot Chat sessions provider |
| `src/vs/sessions/contrib/chatDebug/browser/chatDebug.contribution.ts` | Moves Copilot Chat view to Sessions panel |
| `src/vs/sessions/contrib/providers/agentHost/` | Agent Host sessions provider |
| `src/vs/sessions/sessions.common.main.ts:475` | Registers Copilot Chat sessions contribution |
| `src/vs/sessions/sessions.web.main.ts:208` | Mobile permission picker |

## Workbench-Level Copilot References

Found references to Copilot in the following workbench areas:

| Area | File | Purpose |
|---|---|---|
| Product config | `src/vs/platform/product/common/product.ts:92` | `chatExtensionId: 'GitHub.copilot-chat'` |
| Extension management | `src/vs/platform/extensionManagement/common/abstractExtensionManagementService.ts:174` | Redirects `github.copilot` → `github.copilot-chat` |
| Telemetry | `src/vs/platform/dataChannel/browser/forwardingTelemetryService.ts:116` | Copilot extension ID check |
| Assignment filters | `src/vs/workbench/services/assignment/common/assignmentFilters.ts:25,62` | Copilot extension version tracking |
| Edit telemetry | `src/vs/workbench/contrib/editTelemetry/` | Tracks Copilot inline completion source |
| Language models | `src/vs/workbench/contrib/chat/common/languageModels.ts:83` | Lists `github.copilot-chat` as a provider |
| Terminal menus | `src/vs/workbench/contrib/terminal/browser/terminalMenus.ts:905` | Copilot/Agent Host terminal detection |

## Files to KEEP (General VS Code Functionality)

These files are shared infrastructure that happens to reference Copilot but must be preserved:

- `src/vs/workbench/contrib/chat/` — VS Code chat framework (used by Kilo too if it uses chat participants)
- `src/vs/workbench/contrib/chat/common/languageModels.ts` — Language model provider framework
- `src/vs/platform/extensionManagement/` — Extension management (redirect logic is general)
- `src/vs/workbench/contrib/editTelemetry/` — Edit source tracking (general, not Copilot-specific)
- `extensions/typescript-language-features/` — TypeScript extension (has a Copilot reference for crash prompts)

## Summary

The Copilot extension is deeply integrated into the GitCortex Studio build. It's a built-in extension with its own UI (webview-based chat), commands, menus, keybindings, and API proposals. The chat UI is rendered inside a view container (`workbench.view.extension.copilot-chat`) in the Activity Bar.

The approach for replacement should be **surgical**: add the Kilo Code extension as a new built-in extension, register its view in the Activity Bar, and then remove/neutralize the Copilot-specific parts without touching the general VS Code chat framework or extension management infrastructure.
