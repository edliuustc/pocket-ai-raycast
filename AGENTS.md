# Pocket AI: agent installation and maintenance

## Project identity

- Repository: `https://github.com/edliuustc/pocket-ai-raycast`.
- User-facing product: Pocket AI.
- Compatibility ID / npm name: `mae-ai`. Do not rename it or the existing command IDs.
- Maintainer desktop verification: Windows. Mac Raycast V1 installation is user-reported; do not claim the maintainer verified the latest Mac UI.
- macOS runtime portability is code-reviewed; use [INSTALL-MACOS.md](INSTALL-MACOS.md) for the Mac source workflow and desktop verification boundary.
- License: MIT. Preserve `LICENSE`.

## Design reference

Read [DESIGN.md](DESIGN.md) for the current product and technical specification before changing behavior. Keep its interaction flows, compatibility constraints, and limitations aligned with implementation; distinguish implemented behavior from unverified or proposed capabilities.

## Install for a user

Choose the procedure for the actual host. The steps below are **Windows-only**. On a Mac, follow [INSTALL-MACOS.md](INSTALL-MACOS.md): use Node/npm, `npm ci`, official Raycast source import/development, stop the watcher you started, and `npm run build`. Verify persistence, discovery, streaming, follow-ups, and Mac shortcuts on that Mac. Do not run PowerShell installers or claim success without GUI/provider evidence.

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

On macOS, the corresponding Node checks use `npm` rather than `npm.cmd`. `npm test` uses portable paths. PowerShell installer and Windows packaging commands are not Mac validation.

## Code map and invariants

- `src\components\tool-command.tsx`: top-bar input, streamed response rows, follow-up conversations, model dropdown, pause/resume following.
- `src\components\settings-view.tsx`: edit/add/delete/restore dashboard.
- `src\components\agent-settings.tsx` and `src\lib\agent-settings.ts`: conditional backend settings, nonsecret persistence, and native-value compatibility.
- `src\components\tool-editor.tsx`: shared command settings and templates.
- `src\hooks\use-models.ts`: provider model discovery and remembered per-tool selection.
- `src\lib\storage.ts`: saved tool registry and migration. Preserve saved data and deleted built-in tombstones.
- `src\lib\stream.ts`: OpenAI-compatible chat-completion streaming and provider errors. Do not use Raycast's paid AI API.
- `src\lib\tools.ts`: templates and URL normalization; reject credentials in URLs.
- `src\lib\scroll-policy.ts`: explicit follow/pause lock, throttled targets, and guarded native acknowledgements. Do not infer pause intent from ambiguous selection callbacks.
- `src\hooks\use-follow-latest.ts`: shared, throttled direct/remote selection controller. Native acknowledgements must not overwrite the current controlled target or endlessly postpone its timer.
- `src\components\remote-agent-view.tsx` and `src\lib\agents`: Ask AI-only Hermes/OpenClaw sessions, streaming, approvals, stop/reconnect, and encrypted device material. Read [REMOTE-AGENTS.md](REMOTE-AGENTS.md) before configuring a server.
- `scripts\install-functions.ps1`: Windows PowerShell 5.1-compatible installer helpers.

Retain the model-dropdown initialization workaround: render the selected item first, set both `value` and `defaultValue`, and disable host storage. A different-origin endpoint override must never inherit the default API key.

Keep the top search bar as the query/follow-up input. Do not regress to a separate form. Translator must require an explicit command-scoped target language.

Rich output uses native `List.Item.Detail` with stable message IDs and unstripped Markdown, including image URLs. Preserve the full-width text option. Raycast V1 exposes no imperative scroll control inside the Markdown pane; never claim row-following tests establish rich-pane auto-scrolling. Keep errors/approvals/uncertain execution visible, but do not add routine connecting/completed agent rows.

Direct Model stays the default. Never inherit its API key into an agent backend or automatically route dictionary/translation/polish/custom tools to remote agents. Remote work continues when the UI closes. Do not resubmit accepted/uncertain work, interpret Hermes `unknown` as completed, bypass OpenClaw device pairing, or request administrator scopes. Changing the endpoint, backend, credential, or selected agent must isolate session state.

Gateway credentials belong in native password preferences. Persist OpenClaw private identity/device tokens only through the authenticated-encryption vault; never add plaintext secret files or log credentials. Keep the official client/protocol dependency versions paired. TypeScript uses bundler module resolution for their ESM exports; the Raycast CLI owns actual bundling.

Remote Agents settings must show only the selected backend's fields and preserve both endpoint drafts. The dashboard and `remote-agents` command share one form and version-2 settings record. Never reintroduce duplicate native backend/URL selectors: native preferences cannot be written through the public SDK. Migrate legacy form snapshots once; missing removed native fields must not reset saved choices, and stale native values must not override canonical settings. Persist only allowlisted nonsecret values, never a spread of preferences. Credentials remain native password preferences. Settings changes must not replay a launch query or cancel accepted remote work.

Remote rich rendering reserves a stable response item before the first token, like direct tools. Never make a growing answer replace the selected question/activity row or inject a placeholder into the real remote transcript. Completed runs must not keep selecting obsolete approval rows.

Built-in Ask AI's in-tool backend menu writes the same canonical settings, preserves both URLs, and is a no-op for the current backend. Direct keeps its model dropdown; agent modes keep their profile dropdown. Preserve unsent query text as a draft across switches, but disable initial auto-submission after switching so neither the original launch query nor the draft is replayed. Keep contexts separate, abort Direct generation on departure, and detach remote work without cancelling it.

Mock protocol checks do not establish live compatibility with a user's remote server. Never claim a cloud test without a configured server and an observed response.

Do not claim arbitrary command-management UI can be embedded in Raycast's native preferences. User-created Quicklinks and native static command rows are host-owned.

## Releases

Run `npm.cmd run package:windows`. Publish `dist\pocket-ai-windows-source.zip` and `dist\SHA256SUMS` as release assets.

The packager uses an allowlist and includes `INSTALL-MACOS.md`; do not add `node_modules`, `.git`, `.pocket-ai-install`, `.env`, personal state, API keys, or user conversations. Keep API keys only in Raycast's password preference.

An optional workflow template is in `.github\workflow-templates\validate.yml`. Activating it under `.github\workflows` requires the publisher's GitHub `workflow` permission. Do not silently assume CI has run or change authorization without the user.
