# Install Pocket AI on macOS

**Status:** a user has reported successful installation on **Raycast V1 for Mac**. The runtime has been reviewed for Windows-only assumptions. The maintainer has not directly verified a Mac desktop, and the latest rich-output/scrolling changes still need Mac verification.

The plugin uses Raycast UI/storage APIs, standard Node.js cryptography, and HTTP/SSE/WebSocket connections. Its custom shortcuts include macOS mappings. No Windows executable or PowerShell command is required by the plugin itself. The bundled `install.ps1`, `run.ps1`, and installer tests are Windows-only; do not use them on a Mac.

## 1. Prerequisites

- Install a current Raycast for macOS, launch it, and sign in. Use a macOS version supported by your Raycast installation.
- Install stable **Node.js 22.22.2 or newer** with npm. Use your normal Node installer or version manager; no global npm packages are required.
- Have Git, or download **Code > Download ZIP** from the [repository](https://github.com/edliuustc/pocket-ai-raycast).
- Have access to your own AI provider or remote agent. Pocket AI does not install a provider or include credentials. No Raycast Pro or paid Raycast AI API is required by the extension; provider subscriptions are separate.

In Terminal, check:

```bash
node --version
npm --version
```

Do not copy `node_modules` or the Windows Node runtime from another machine. Install dependencies on the Mac.

## 2. Get the source

Keep the source in a permanent folder. From your chosen parent folder:

```bash
git clone https://github.com/edliuustc/pocket-ai-raycast.git
cd pocket-ai-raycast
npm ci
```

If you downloaded the repository ZIP instead, extract it, open Terminal in the folder containing `package.json`, and run `npm ci`.

Use the repository's current source for this guide. Earlier Windows release ZIPs may not include the Mac guide or the portable test command. Keep `package-lock.json`; do not replace dependencies with unrelated latest versions to install the extension.

## 3. Import into Raycast

With Raycast running and signed in:

```bash
npm run dev
```

Wait for successful compilation. The Raycast developer CLI requests source import; approve any import prompt in Raycast. Search for **Pocket AI Settings** and confirm the dashboard shows **Add New Command**, **Remote Agents**, **AI Provider**, and the built-in tools.

If commands do not appear, use Raycast's **Import Extension** command and select the permanent source folder containing `package.json`. Then retry `npm run dev`. Do not assume a successful compilation means the GUI import succeeded.

Once the extension has appeared, return to that Terminal and press **Control+C** to stop its development watcher. Then run:

```bash
npm run build
```

This creates the production build; it does not publish to the Raycast Store. Keep the source folder. The intended installed mode does not require a continuously running development terminal.

**Verify persistence:** quit Terminal, reopen Raycast, and open **Pocket AI Settings** again. If it is missing or fails, the Mac installation is not complete. Recheck import/sign-in/build output rather than leaving a watcher running as a workaround.

## 4. Configure your AI connection

### Direct Model

Open **Pocket AI Settings > AI Provider**:

1. Set **API Endpoint** to your OpenAI-compatible provider base URL or full chat-completions URL.
2. Set **API Key** in the password field, without `Bearer`. Leave it blank only if your provider requires no authentication.
3. Open **Ask AI**, wait for model discovery, and choose a model from its dropdown.

The default endpoint is `http://127.0.0.1:23333/api/openai/v1`. It expects a separately running local VS Code Copilot bridge. On this Mac, **127.0.0.1 means this Mac**, not your Windows computer. Run your bridge on the Mac, use an existing private tunnel, or configure another reachable provider.

Keep credentials out of URLs, prompts, terminal commands, and screenshots. Provider keys, saved custom commands, aliases, hotkeys, and conversations are not automatically copied from your Windows installation.

### Hermes or OpenClaw

Open **Pocket AI Settings > Remote Agents**, or launch **Remote Agents** directly, choose a backend, and enter its URL. Both entry points use the same settings. Only the selected backend's fields appear. Use its credential action to set the corresponding secure native password preference, return to the Remote Agents page, and **Save Settings**. Reopen **Ask AI** and choose an advertised agent.

Backend/URL selectors have been removed from native preferences to avoid conflicting copies; secure keys remain there. Existing saved form settings migrate automatically. If you only configured the old native backend/URL fields, choose them once in Remote Agents after updating.

For an existing remote SSH server, a Mac tunnel can use:

```bash
# Hermes: run only the tunnel for the backend you actually use.
ssh -N -L 127.0.0.1:8642:127.0.0.1:8642 user@agent-host

# OpenClaw: an alternative, not a second required tunnel.
ssh -N -L 127.0.0.1:18789:127.0.0.1:18789 user@agent-host
```

Replace `user@agent-host` with your own destination and keep the chosen tunnel running in a separate terminal while using it. Use `http://127.0.0.1:8642` for Hermes or `ws://127.0.0.1:18789` for OpenClaw through these tunnels. An existing trusted HTTPS/WSS ingress is also supported.

See [REMOTE-AGENTS.md](REMOTE-AGENTS.md) for server configuration, protocol versions, OpenClaw device approval, and session/stop semantics. Remote tools run on the agent machine. A Mac client does not make Windows-local files or tools available to a remote harness.

## 5. Mac shortcuts and customization

Assign aliases/hotkeys in **Raycast Settings > Extensions > Pocket AI**. These suggestions are not installed automatically; choose alternatives if already assigned:

| Tool           | Alias | Suggested Mac hotkey |
| -------------- | ----- | -------------------- |
| Ask AI         | `ask` | Command+Option+1     |
| AI Dictionary  | `df`  | Command+Option+2     |
| AI Translator  | `tr`  | Command+Option+3     |
| AI Polish Text | `pl`  | Command+Option+4     |

For example: type `df`, press Space, type `hello`, and press Return. Replies stream into the native Markdown preview; type follow-up instructions into the same top bar. Markdown images work through reachable URLs, not binary attachments or an arbitrary web canvas.

Use **Actions > Use Full-Width Text** for row-by-row automatic following, or **Show Rich Markdown** to return to formatted replies. The default is configurable under **Response View** in native preferences. Rich mode follows new messages, but Raycast V1 owns scrolling inside its Markdown pane and exposes no force-scroll API for that pane. Long rich replies can be scrolled manually.

Inside a direct-model conversation, **Command+L** pauses/resumes following, **Command+Shift+,** opens Pocket AI Settings, and **Command+Shift+V** uses clipboard text. Remote conversations also provide Command+L; use their Actions menu for settings and controls.

Use **Pocket AI Settings** to edit prompts/placeholders, choose Translator's explicit target language, add template-based commands, and delete or restore commands. For a custom command's own alias/hotkey, use **Add Command to Raycast** to create its Quicklink.

## 6. Verify on the Mac

Before calling installation successful:

1. Reopen the dashboard after stopping the watcher and closing Terminal.
2. Verify model/agent discovery shows a dropdown, not a manual model-ID requirement.
3. Send a harmless question and observe partial output arriving before completion.
4. Send a follow-up that refers to the previous answer and confirm context is retained.
5. Test Command+L and automatic following on an overflowing **Full-Width Text** answer, plus your chosen alias/hotkey. Verify Markdown and image URLs in **Rich Markdown**; do not confuse native preview scrolling with transcript following.
6. If using Translator, set a target language and test it. If using a remote backend, check that selecting it hides the other backend's fields.

Builds and mock tests cannot establish these desktop/provider checks. If you cannot complete them, report the exact missing prerequisite or observed failure. Do not claim that Windows verification covered this Mac.

## Updates and troubleshooting

For a Git checkout with no local edits:

```bash
git pull --ff-only
npm ci
npm run build
```

Close active Pocket AI views before updating, then reopen them. Preserve your own edits; do not reset or delete a modified checkout. Local source installs are updated manually, not through the Raycast Store. Reimport if Raycast no longer recognizes the source.

| Problem                            | Check                                                                                              |
| ---------------------------------- | -------------------------------------------------------------------------------------------------- |
| `node` or `npm` missing/too old    | Install/select Node 22.22.2+ and reopen Terminal.                                                  |
| Dependency download fails          | Check your proxy or approved HTTPS registry. Do not disable TLS.                                   |
| No commands after compilation      | Check Raycast sign-in and Import Extension; select the source folder, not `src` or `node_modules`. |
| Empty models or connection refused | Start the provider on this Mac, check the endpoint, or establish the intended private tunnel.      |
| Authentication error               | Set the matching provider/backend password preference; do not reuse another backend's key.         |
| Windows shortcut does not work     | Use the Mac mappings above and assign launch hotkeys on this Mac.                                  |
| OpenClaw pairing required          | Review/approve the device on the server, then Reconnect and Resume.                                |

For code checks, both platforms use:

```bash
npm run typecheck
npm run lint
npm run format:check
npm test
```

`npm run test:installer` and `npm run package:windows` require Windows PowerShell; they are not Mac checks.

## Notes for AI installers

Use this Mac procedure, not the Windows PowerShell installer. Do not change global Node/registry configuration, automate account sign-in, read/log credentials, or overwrite existing settings. Capture and stop only the development process you started; never leave an abandoned watcher.

If you have no interactive Mac desktop or provider access, you may validate source/builds where possible, but must report GUI import, persistence, streaming, and follow-up checks as **unverified**. Do not spoof the platform or label a Windows build as a Mac test.

Official references: [Raycast prerequisites](https://developers.raycast.com/basics/getting-started), [source-development workflow](https://developers.raycast.com/basics/contribute-to-an-extension), and [CLI build/import behavior](https://developers.raycast.com/information/developer-tools/cli).
