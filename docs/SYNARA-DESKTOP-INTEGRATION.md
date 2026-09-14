# GitCortex Studio — Synara Desktop Shell Integration

## Overview

This document describes the integration of the **Synara** desktop shell into
**GitCortex Studio** (a Code-OSS / VS Code fork). The goal is a single unified
desktop application:

- **Visible shell**: adapted from the Synara desktop/application shell
  (navigation, surfaces, split chat + VM).
- **Underlying engine**: the Code-OSS / VS Code workbench (editor, languages,
  syntax highlighting, IntelliSense, extensions, terminal, Git, worktrees,
  Agent Host, debugger, QEMU/KVM, QMP, VNC/noVNC, webviews, packaging).
- **Default experience**: the Studio shell is the primary surface. The
  traditional VS Code workbench remains available through a secondary
  "Developer Mode" space.

This integration deliberately **excludes** the Synara marketing/landing web
site, SEO pages, promotional assets, and any user or secret data.

## Architecture

```text
GitCortex Studio
└── Single desktop application (Electron main = Code-OSS/GitCortex)
    ├── Studio Shell (renderer, workbench editor surface)
    │   ├── Navigation rail (Chat, Virtual Machines, Sessions, Projects, MCP, Developer Mode)
    │   ├── Chat surface (real IChatService + ChatWidget)
    │   ├── VM surface (real IVirtualMachinesService + noVNC webview)
    │   ├── Resizable chat-above-VM split (mouse + keyboard, persisted per workspace)
    │   └── Secondary surfaces (sessions, projects, MCP overview, developer mode)
    └── Code-OSS / GitCortex engines (unchanged, preserved)
        ├── editor, languages, IntelliSense, diagnostics
        ├── extensions + extension host
        ├── terminal, Git, worktrees, diffs
        ├── Agent Host
        ├── debugger (developer mode)
        ├── virtual machines: QEMU/KVM, QMP, VNC/noVNC private bridge
        └── webview + Electron native lifecycle, packaging, updates, CSP
```

### Electron processes (unchanged)

Only one Electron main process exists: `src/vs/code/electron-main/main.ts`.
No second Electron `main`, no second update system, no second VNC engine, and
no unauthenticated public VNC TCP listener are introduced. The VM display path
reuses the existing token-authenticated WebSocket bridge to the private Unix
VNC socket through `IVirtualMachinesService.openDisplay()`.

### IPC rules

- All Studio channels are namespaced `gitcortex.*` and registered centrally in
  `src/vs/workbench/contrib/gitcortexStudioShell/common/ipcChannels.ts`.
- The renderer never receives `ipcRenderer`, `ipcMain`, Node.js, `fs`, or
  `child_process`. The typed bridged `GitCortexDesktopBridge` contract in
  `common/bridge.ts` is the only surface exposed.
- Inputs are validated; responses are typed; long operations support
  cancellation, structured errors, and listener cleanup.

## Ported / Adapted files

The Studio shell contribution lives under
`src/vs/workbench/contrib/gitcortexStudioShell/`.

| File | Purpose |
| --- | --- |
| `common/ipcChannels.ts` | Central namespaced channel registry (`gitcortex.*`). |
| `common/bridge.ts` | Typed desktop bridge contract (window/workspace/project/chat/terminal/git/vm/mcp/shell). |
| `common/shellConfiguration.ts` | Configuration: startup editor, developer mode, chat-above-VM split, chat ratio. |
| `common/splitView.ts` | Pure, testable split-view sizing logic (chat-above-VM). |
| `browser/gitcortexStudioShell.ts` | The Studio shell editor pane: navigation rail, ChatWidget, VM console, resizable split, secondary surfaces. |
| `browser/gitcortexStudioShellInput.ts` | Editor input for the shell. |
| `browser/gitcortexStudioShell.contribution.ts` | Registers the editor pane + startup runner; starts the shell by default. |
| `browser/media/gitcortexStudioShell.css` | Shell styling using VS Code theme variables. |
| `test/common/splitView.test.ts` | Unit tests for split geometry/persistence. |
| `test/common/ipcChannels.test.ts` | Unit tests for channel namespacing/validation. |

## GitCortex files modified

- `src/vs/workbench/workbench.common.main.ts` — imports the Studio shell
  contribution.

## Integration points (real services used)

- **Chat**: `IChatService`, `ChatWidget` at `ChatAgentLocation.Chat` — a real
  chat session, with model attachment and session listing through
  `chatService.getLiveSessionItems()` / `acquireOrLoadSession()`.
- **Virtual machines**: `IVirtualMachinesService`
  (`getVirtualMachines()`, `onDidChangeVirtualMachines()`,
  `start()`, `openDisplay()`) and the existing noVNC webview connection
  (CSP-protected, token-authenticated, loopback only).
- **Surfaces / navigation**: `IEditorService`, `ICommandService`,
  `IConfigurationService`, `IWorkspaceContextService`, `IWorkbenchLayoutService`
  (`setPartHidden` for Developer Mode), `IProductService`.
- **MCP**: routed to the existing GitCortex MCP management surface (the
  `github.copilot.mcp.openServersView` command) instead of executing MCP in the
  renderer. No secrets are stored in the shell.
- **Developer Mode**: classic workbench parts (activity bar, sidebar, panel,
  auxiliary bar) are hidden while the shell is the primary surface and restored
  when Developer Mode is enabled or the shell is closed.

## Licenses and attribution

This integration reuses architectural patterns and the shell concepts of the
**Synara** desktop application, which is MIT-licensed:

- Synara: https://github.com/Emanuele-web04/synara
  - License: MIT
  - Copyright (c) 2026 T3 Tools Inc.
  - Copyright (c) 2026 Emanuele Di Pietro

GitCortex Studio itself is a fork of Microsoft's Code-OSS / VS Code, MIT
licensed, with attribution preserved in `LICENSE.txt` and
`CODE-OSS-UPSTREAM.md`.

No secrets, user data, credentials, private keys, tokens, or personal files
from Synara are imported. The Synara marketing/landing web site is explicitly
excluded.

## Tests

Unit tests under `src/vs/workbench/contrib/gitcortexStudioShell/test/common/`
cover:

- Split view sizing: default ratio, clamping, offset→ratio conversion,
  height computation, snap detection, merge, serialize/deserialize (incl.
  invalid input).
- IPC channel registry: every registered channel is namespaced under
  `gitcortex.`, the documented areas are present, and unknown/`vscode:`
  channels are rejected.

Existing virtual machine platform tests continue to pass
(`out/vs/platform/virtualMachines/test/node/virtualMachines.test.js`).

## Build

```sh
npm ci
npm run gulp compile        # compiles client to out/
npm run gulp vscode-linux-x64-min   # (optional) production Linux build
```

## Disabling the Studio shell

Set `gitcortex.shell.startupEditor` to `classic` (or the Developer Mode toggle
in the shell) to keep the classic workbench as the primary surface.

## Rollback

The Studio shell is an additive contribution. Removing the import from
`src/vs/workbench/workbench.common.main.ts` (and the
`gitcortexStudioShell/` directory) fully restores the prior classic workbench
behavior without touching any engine code.