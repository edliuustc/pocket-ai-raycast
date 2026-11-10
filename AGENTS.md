# Pocket AI: agent installation and maintenance

## Project identity

- Repository: `https://github.com/edliuustc/pocket-ai-raycast`.
- User-facing product: Pocket AI.
- Compatibility ID / npm name: `mae-ai`. Do not rename it or the existing command IDs.
- Tested installation platform: Windows. Do not claim macOS installation is verified.
- License: MIT. Preserve `LICENSE`.

## Design reference

Read [DESIGN.md](DESIGN.md) for the current product and technical specification before changing behavior. Keep its interaction flows, compatibility constraints, and limitations aligned with implementation; distinguish implemented behavior from unverified or proposed capabilities.

## Install for a user

1. Check that the user is on Windows, has Raycast installed, and has opened and signed into it.
2. Check for stable Node.js >=22.22.2 and npm. Do not change global Node installations, execution policy, or registry settings without the user's request. Pass `-NodePath` for an existing alternate runtime.
3. Clone this repository or extract its source release into a permanent folder. Change to the folder containing `install.ps1` and `package.json`.
4. Run this bounded, noninteractive command:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\install.ps1
```

The installer may need internet access for `npm ci`. If the user's network needs an approved mirror, pass `-Registry <HTTPS-registry-URL>`; never disable TLS checking or commit registry credentials.

Do not treat lack of a GUI, provider credentials, or a required sign-in as success. Explain that prerequisite and stop at the appropriate boundary. Do not try to automate account authorization without the user.

## Required verification

- Installer exit code is zero and its final JSON object has `"status": "installed"`.
- `"watcherRunning": false`; no permanent developer terminal is required.
- Compiled command files, matching manifest version, and icon exist under the reported `installedPath`.
- `"uiVerification": "required"` is deliberate: filesystem success does not prove Raycast has displayed the extension.
- Open **Pocket AI Settings** from Raycast root search and verify **Add New Command**, **AI Provider**, and the expected command list.
- Have the user configure their provider URL and optional key through **AI Provider** / **Configure AI Provider**. Do not read, print, commit, or package their credentials.
- Verify model discovery, select a model, send a harmless test query, and observe a streamed response. Send one follow-up to verify context.
- If desktop automation or provider access is unavailable, report exactly what remains unverified. Do not claim end-to-end installation succeeded.

`127.0.0.1` means the target machine. A VS Code Copilot bridge is an external prerequisite, not part of this repository.

## Installer behavior

- Dependencies are installed from the lockfile when needed; success is cached by manifest/lockfile hashes.
- `-SkipDependencies` is for an already provisioned checkout, not a fresh machine.
- `-BuildOnly` builds into `.pocket-ai-install\build` without importing or changing the installed extension. It works without Raycast and is appropriate for CI.
- The normal installer briefly runs the official Raycast development CLI to request import, stops only its own process and identified compiler children, and finishes with a production build.
- It refuses to kill a live process referenced by a pre-existing `cli.pid`. Close that developer session normally; do not bypass the guard by deleting an active PID file.
- It does not configure providers, overwrite tool storage, set aliases/hotkeys, or start a permanent watcher.
- It times out rather than waiting indefinitely. Logs and cached install state are in `.pocket-ai-install` and must not be committed.
- For the tested public Raycast Windows 2.11.0.0 build, direct `.rayext` import is internal-only. Use source installation.

## Manual fallback

```powershell
npm.cmd ci
npm.cmd run dev
```

Wait for the built extension to appear in Raycast. Stop that developer session with Ctrl+C, then run `npm.cmd run build`. Do not start a development watcher and abandon it in the background.

## Checks for changes

Use the existing project commands:

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run format:check
npm.cmd test
npm.cmd run test:installer
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\install.ps1 -BuildOnly -SkipDependencies
```

PowerShell installer tests do not require Pester. No API credentials, provider service, Raycast installation, or browser account is needed for unit tests or build-only checks.

## Code map and invariants

- `src\components\tool-command.tsx`: top-bar input, streamed response rows, follow-up conversations, model dropdown, pause/resume following.
- `src\components\settings-view.tsx`: edit/add/delete/restore dashboard.
- `src\components\agent-settings.tsx` and `src\lib\agent-settings.ts`: conditional backend settings, nonsecret persistence, and native-value compatibility.
- `src\components\tool-editor.tsx`: shared command settings and templates.
- `src\hooks\use-models.ts`: provider model discovery and remembered per-tool selection.
- `src\lib\storage.ts`: saved tool registry and migration. Preserve saved data and deleted built-in tombstones.
- `src\lib\stream.ts`: OpenAI-compatible chat-completion streaming and provider errors. Do not use Raycast's paid AI API.
- `src\lib\tools.ts`: templates and URL normalization; reject credentials in URLs.
- `src\lib\scroll-policy.ts`: follow the latest row, ignore programmatic selection acknowledgements, pause on history navigation.
- `src\components\remote-agent-view.tsx` and `src\lib\agents`: Ask AI-only Hermes/OpenClaw sessions, streaming, approvals, stop/reconnect, and encrypted device material. Read [REMOTE-AGENTS.md](REMOTE-AGENTS.md) before configuring a server.
- `scripts\install-functions.ps1`: Windows PowerShell 5.1-compatible installer helpers.

Retain the model-dropdown initialization workaround: render the selected item first, set both `value` and `defaultValue`, and disable host storage. A different-origin endpoint override must never inherit the default API key.

Keep the top search bar as the query/follow-up input. Do not regress to a separate form. Translator must require an explicit command-scoped target language.

Direct Model stays the default. Never inherit its API key into an agent backend or automatically route dictionary/translation/polish/custom tools to remote agents. Remote work continues when the UI closes. Do not resubmit accepted/uncertain work, interpret Hermes `unknown` as completed, bypass OpenClaw device pairing, or request administrator scopes. Changing the endpoint, backend, credential, or selected agent must isolate session state.

Gateway credentials belong in native password preferences. Persist OpenClaw private identity/device tokens only through the authenticated-encryption vault; never add plaintext secret files or log credentials. Keep the official client/protocol dependency versions paired. TypeScript uses bundler module resolution for their ESM exports; the Raycast CLI owns actual bundling.

Remote Agents settings must show only the selected backend's fields and preserve both endpoint drafts. Persist only allowlisted backend/URL values and their native snapshot, never a spread of preferences. Native fields remain static. Settings changes must not replay a launch query or cancel accepted remote work.

Mock protocol checks do not establish live compatibility with a user's remote server. Never claim a cloud test without a configured server and an observed response.

Do not claim arbitrary command-management UI can be embedded in Raycast's native preferences. User-created Quicklinks and native static command rows are host-owned.

## Releases

Run `npm.cmd run package:windows`. Publish `dist\pocket-ai-windows-source.zip` and `dist\SHA256SUMS` as release assets.

The packager uses an allowlist; do not add `node_modules`, `.git`, `.pocket-ai-install`, `.env`, personal state, API keys, or user conversations. Keep API keys only in Raycast's password preference.

An optional workflow template is in `.github\workflow-templates\validate.yml`. Activating it under `.github\workflows` requires the publisher's GitHub `workflow` permission. Do not silently assume CI has run or change authorization without the user.
