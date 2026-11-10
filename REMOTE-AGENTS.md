# Remote agents: Hermes and OpenClaw

Pocket AI 1.1 adds an optional **Ask AI Backend** setting. **Direct Model** remains the default. Dictionary, Translator, Polish, and custom tools keep their existing direct-provider behavior.

Raycast is the frontend; the remote harness owns model selection, tools, web access, memory, and execution. This does not install a harness or give a model internet access automatically. Enable the necessary tools on your agent server.

## Setup in Raycast

1. Install/update Pocket AI using [the Windows installer](README.md#install-on-windows) or the [Mac source guide](INSTALL-MACOS.md).
2. Open **Pocket AI Settings > Remote Agents**, or launch the standalone **Remote Agents** command.
3. Choose **Hermes Agent** or **OpenClaw Agent** in **Ask AI Backend**.
4. Enter that backend's server URL. Only the selected backend's fields appear; switching keeps each URL draft.
5. Use **Actions > Set Hermes API Key** or **Set OpenClaw Gateway Token / Password** to open Raycast's secure native password preferences. The direct-model API key is never inherited. Return to the Remote Agents page and choose **Save Settings** to apply the backend and URLs.
6. Reopen **Ask AI**. Choose an advertised agent from the dropdown; type in Raycast's top bar and press Enter.

The Pocket AI **Remote Agents** page is dynamic: Hermes fields disappear when you choose OpenClaw, and both disappear for Direct Model. Both entry points open the same form and settings record. Native preferences retain secure password fields but no longer contain conflicting backend/URL selectors: Raycast's public API cannot update those controls from the home form.

Existing saved form settings migrate automatically to the single versioned record. Removed or stale native values cannot reset that choice afterward. If you previously used only native preferences and never saved this form, choose your backend/server URL once here after upgrading; native credentials remain unchanged. Saving never resends your original launch query or cancels an already accepted remote run. The home dashboard shows the saved Ask AI mode.

The dropdown selects an agent/profile, **not an underlying LLM**. The harness keeps its own configured model. For Hermes, a profile is selected by the server URL, including `/p/<profile>` when applicable. Its advertised profile appears in the dropdown. For OpenClaw, accessible agents come from `agents.list`.

The existing Ask AI prompt and input/follow-up placeholders still apply. Hermes receives the prompt as `instructions`. OpenClaw's chat RPC has no system-prompt override: Pocket AI includes response instructions as explicitly labeled user-message context, without replacing the harness's system prompt or tool policy.

### Switch without leaving Ask AI

Use **Actions > Switch AI Backend** or **Command+Shift+B** on Mac / **Ctrl+Shift+B** on Windows. Choose **Direct Model**, **Hermes Agent**, or **OpenClaw Agent**; the current choice is marked. This saves to the same settings as the home form and standalone Remote Agents command, retaining both server URLs.

Direct displays its model dropdown in the top bar. Agent modes display server-advertised profiles, not an override for the harness's model. Configure server URLs/credentials through Remote Agents as before.

Unsent text remains in the input bar after switching, without being sent automatically. Contexts are separate: no transcript is forwarded to another backend. Leaving Direct aborts local generation and returning starts a fresh Direct conversation with its remembered model. Leaving an agent detaches without stopping accepted remote work; returning restores its scoped session/run. Selecting the already active backend changes nothing.

## Connect across machines

Prefer an existing private HTTPS/WSS ingress, or a loopback SSH tunnel. Do not enter credentials inside a URL.

```powershell
# Replace user@agent-host with your SSH destination. Keep the chosen tunnel running.
ssh.exe -N -L 127.0.0.1:8642:127.0.0.1:8642 user@agent-host
ssh.exe -N -L 127.0.0.1:18789:127.0.0.1:18789 user@agent-host
```

Only start the tunnel for the backend you use, in a separate terminal. Pocket AI does not manage SSH keys, start tunnels, modify firewalls, or change remote configuration.

`127.0.0.1` in Raycast means **the Windows client**. Through the tunnel it forwards to the remote host. Without a tunnel, it only reaches a server on the same PC. Web search, terminals, files, and browsers run on the **agent's machine**, not automatically on the Raycast PC. File/image uploads and local-device tools are not implemented.

## Hermes server

Enable the API server on your own Hermes installation:

```text
API_SERVER_ENABLED=true
API_SERVER_KEY=<your-own-server-key>
```

Start `hermes gateway` with that configuration. For a tunnel, keep its API listener on remote loopback, normally port 8642.

| Pocket AI setting | Value                                                          |
| ----------------- | -------------------------------------------------------------- |
| Ask AI Backend    | Hermes Agent                                                   |
| Hermes Server URL | `http://127.0.0.1:8642` through SSH, or your HTTPS server root |
| Hermes API Key    | Your `API_SERVER_KEY`, without `Bearer`                        |

A `/v1` suffix is accepted and normalized away. Preserve any proxy prefix or `/p/<profile>` prefix. Use that profile's own API key.

Pocket AI requires advertised `run_submission`, `run_status`, `run_events_sse`, and `run_stop` features at `/v1/capabilities`, plus the session create/history endpoints. It uses `/v1/runs`, run status, resumable SSE events, and exact generation-bound approvals when `run_approval` is advertised. Older compatibility-only servers are not silently downgraded.

API-created sessions are independent of CLI, TUI, Desktop, Discord, and other messaging sessions. This integration does **not** attach a run to a Discord-owned transcript. Clarification questions currently need an answer in Hermes's own interface; Pocket AI displays a notice. Secret/sudo prompts stay on the agent's native surface.

## OpenClaw server and pairing

Use the native Gateway WebSocket endpoint, normally port 18789. This integration does not require the optional OpenAI HTTP compatibility endpoint to be enabled.

| Pocket AI setting                 | Value                                                                 |
| --------------------------------- | --------------------------------------------------------------------- |
| Ask AI Backend                    | OpenClaw Agent                                                        |
| OpenClaw Gateway URL              | `ws://127.0.0.1:18789` through SSH, or your trusted `wss://` endpoint |
| OpenClaw Gateway Token / Password | Your gateway shared token or password                                 |

Pocket AI uses the official `@openclaw/gateway-client` and `@openclaw/gateway-protocol` packages pinned to **2026.8.1**, implementing wire protocol **4**. A compatible native Gateway is required. The reference client enforces its transport/auth rules; Pocket AI does not disable TLS, allow insecure remote WebSocket authentication, or use the reserved internal backend bypass.

The client creates a persistent Ed25519 device identity, signs the Gateway challenge, and requests only `operator.read`, `operator.write`, and `operator.approvals`.

If the Gateway reports pairing required, review the request on the **server**:

```text
openclaw devices list
openclaw devices approve <requestId>
```

Verify the request belongs to your Pocket AI client before approving it. Then use **Reconnect and Resume** in Raycast. Pocket AI never silently approves its own device or requests administrator/pairing-management scopes.

The device private key and issued device tokens are AES-256-GCM encrypted before entering Raycast LocalStorage. The encryption key is derived with scrypt from the gateway password preference and a random salt. They are never saved as plaintext files. The shared credential remains only in the native password preference. Endpoint/backend/credential changes use separate storage scopes; changing the shared credential creates a new device identity and may require pairing again.

## Conversations, progress, and controls

- Queries and follow-ups use the top bar. Rich Markdown replies render directly in the native preview; Actions can switch to full-width streaming text. Markdown image URLs are preserved; binary attachments are not implemented.
- Routine connecting and successfully completed rows are hidden; the loading bar indicates active work. Failure, uncertainty, stopping/stopped states, tool activity, and approvals remain visible.
- Shared selection following advances to new messages in rich mode or new rows in full-width text. Native Markdown-pane scrolling is controlled by Raycast, not an extension scroll API.
- Rich runs select a stable response slot before the first token, keeping the preview on the answer as tokens arrive. Completed runs discard obsolete approval rows instead of leaving them selected.
- Select an approval row to review its details, then choose **Approve Once** or **Deny**. No blanket/always approval is offered. Deny-only requests do not show approval.
- **Stop Remote Run** sends a server-side stop/abort. “Stopping” means the request was made, not that remote execution has finished; wait for its terminal state.
- Closing Raycast's view disconnects the frontend; it does **not** cancel already accepted remote work.
- Reopening Ask AI restores the last session for that backend/endpoint/credential/agent. History comes from the server, with a bounded recent transcript of up to 100 messages.
- **Reconnect and Resume** reloads authoritative history/subscriptions and attaches to known work. Hermes sends the last event ID on stream reconnect; OpenClaw recreates subscriptions after reconnect or an event gap.
- Accepted requests are never automatically resubmitted. Submission identifiers are saved before dispatch. If an acknowledgment is lost and the outcome cannot be proven, Pocket AI blocks follow-ups and displays an unconfirmed state. Inspect the server before creating a separate conversation.
- Hermes `unknown` is not success or a retry signal; resolve that execution on the server.
- **New Conversation** forgets the local session pointer and starts separately on the next query. It does not delete remote history. Stop a known running task first.

Only nonsecret backend/URL settings, session IDs, run/submission IDs, selected agent IDs, and encrypted OpenClaw device material are persisted locally. Pocket AI does not save local prompt/response history; the remote harness may retain transcripts according to its own configuration.

## Troubleshooting

| Symptom                                  | Action                                                                                 |
| ---------------------------------------- | -------------------------------------------------------------------------------------- |
| No connection                            | Check the selected backend, URL/prefix, running tunnel, and remote listener.           |
| HTTP 401/403                             | Set the Hermes key for the selected API profile, not the direct-model key.             |
| Missing Hermes features / HTTP 404       | Enable or upgrade the native API server; verify the profile/proxy prefix.              |
| OpenClaw pairing/scope error             | Review device authorization and the three operator scopes, then reconnect.             |
| OpenClaw protocol mismatch               | Use a Gateway compatible with native wire protocol 4.                                  |
| Unconfirmed request                      | Inspect the remote session/run; do not copy-resend automatically.                      |
| Replaced OpenClaw session                | Start a new Pocket AI conversation instead of writing to a different physical session. |
| Hermes replay no longer retained         | Reconnect explicitly to reload server-owned transcript history.                        |
| Tool needs clarification or native input | Respond through the harness's own interface, then reconnect.                           |

## Verification boundary

Automated tests run local HTTP/SSE and WebSocket mock gateways, including signed OpenClaw handshakes, streaming, reconnect without duplicate dispatch, session identity checks, approval identity, and remote cancellation. They do not prove compatibility with every deployed harness version. No user-owned remote Hermes/OpenClaw server or credentials were supplied for a live cloud-server test.

The installed Windows Raycast frontend was also exercised against a temporary Hermes mock for its dropdown, partial streamed replies, tool activity, a same-session follow-up, and history restoration after reopening. That mock was stopped and the original Direct Model preference restored afterward.

The 1.1.1 conditional-settings fix was checked in Windows Raycast: Hermes shows only its URL/key guidance, OpenClaw removes the Hermes fields, and Direct Model removes both agent configurations. Test selections were discarded without changing the saved backend or credentials.

Protocol references: [Hermes API server](https://hermes-agent.nousresearch.com/docs/user-guide/features/api-server), [OpenClaw client guide](https://docs.openclaw.ai/gateway/clients), [OpenClaw protocol](https://docs.openclaw.ai/gateway/protocol).
