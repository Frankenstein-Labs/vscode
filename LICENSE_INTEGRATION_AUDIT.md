# License Integration Audit

## Repository Licenses

### GitCortex Studio (main repo: Frankenstein-Labs/vscode)

| Component | License | Copyright | Source |
|---|---|---|---|
| Root project | MIT | Copyright (c) 2015 - present Microsoft Corporation | `LICENSE.txt` |
| All extensions | MIT | Copyright (c) Microsoft Corporation | Built-in extensions |
| Built-in Copilot extension | MIT (SEE LICENSE IN LICENSE.txt) | — | `extensions/copilot/LICENSE.txt` |

### Kilo Code (source repo: Frankenstein-Labs/kilocode)

| Component | License | Copyright |
|---|---|---|
| Root project | MIT | Copyright (c) 2026 Kilo Code; Copyright (c) 2025 opencode |
| `packages/kilo-vscode` | MIT | Copyright (c) 2026 Kilo Code |
| `packages/kilo-ui` | MIT | `@kilocode/kilo-ui` |
| `packages/core` (`@opencode-ai/core`) | MIT | MIT |
| `packages/opencode` (`@kilocode/cli`) | MIT | MIT |
| `packages/kilo-gateway` | MIT | MIT |
| `packages/kilo-i18n` | MIT | MIT |
| `packages/kilo-memory` | MIT | MIT |
| `packages/protocol` | MIT | MIT |
| `packages/sdk` | MIT | MIT |

## License Compatibility

| Requirement | Status | Notes |
|---|---|---|
| MIT → MIT reuse | ✅ Compatible | Both repos are MIT-licensed. MIT allows reuse, modification, and redistribution with attribution. |
| Redistribution of source | ✅ Permitted | MIT license allows copying source code with preserved copyright notice. |
| Attribution requirement | ⚠️ Must preserve | Must retain MIT copyright notices from Kilo Code when copying files. |
| Copilot → Kilo replacement | ✅ Permitted | MIT allows removal and replacement. |
| Trademark considerations | ⚠️ Must handle | "Kilo Code" and "OpenCode" are project names. Must strip Kilo branding per user requirements. |

## Attribution Requirements

When integrating Kilo Code source files into the GitCortex Studio repository:

1. **Preserve copyright headers**: Keep existing copyright notices in modified files.
2. **Add attribution**: For new files copied from Kilo Code, add:
   ```
   /*---------------------------------------------------------------------------------------------
    *  Portions Copyright (c) Kilo Code contributors. All rights reserved.
    *  Licensed under the MIT License.
    *  Based on code from https://github.com/Frankenstein-Labs/kilocode
    *--------------------------------------------------------------------------------------------*/
   ```
3. **Maintain LICENSE.txt**: The GitCortex Studio `LICENSE.txt` already contains MIT text.
   No changes needed to the main license file.
4. **Third-party notices**: Kilo Code dependencies (SolidJS, xterm, etc.) are already
   covered by VS Code's existing third-party dependency management.

## Redistribution Obligations

| Obligation | Status |
|---|---|
| Include LICENSE.txt | ✅ Already present in both repos |
| Include copyright notice | ✅ Must preserve in copied files |
| No trademark use | ✅ Remove Kilo branding from user-facing UI per requirements |
| Source code availability | ✅ Source is publicly available (MIT) |

## Dependencies to Verify

The Kilo Code extension depends on the following packages that need to be available:

| Dependency | Version | Type | Action |
|---|---|---|---|
| `@kilocode/sdk` | workspace:* | Internal | Copy or install |
| `@kilocode/kilo-ui` | workspace:* | Internal | Copy or install |
| `@kilocode/kilo-gateway` | workspace:* | Internal | Copy or install |
| `@kilocode/kilo-i18n` | workspace:* | Internal | Copy or install |
| `@kilocode/kilo-memory` | workspace:* | Internal | Copy or install |
| `@opencode-ai/core` | workspace:* | Internal | Copy or install |
| `solid-js` | ^1.9.11 | External npm | Install |
| `marked` | catalog: | External npm | Install |
| `diff` | 8.0.4 | External npm | Install |
| `ws` | 8.21.0 | External npm | Install |
| `zod` | ^3.24.2 | External npm | Install |
| `fuzzysort` | 3.1.0 | External npm | Install |

## Conclusion

Both repositories use the MIT license, making integration legally straightforward.
The key obligations are:
1. Preserve copyright notices in copied files
2. Remove Kilo-specific branding from the user-facing UI (per user requirements)
3. Ensure the Kilo Code LICENSE is retained alongside ported code
