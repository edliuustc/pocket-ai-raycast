# Pocket AI: current design specification

- **Status:** implemented baseline for Pocket AI 1.1.1
- **Updated:** November 10, 2026
- **Scope:** product behavior, interaction design, architecture, persistence, and installation.

This specification describes the current implementation, not a proposed redesign. The linked source files are the authority if implementation details change. Keep this document aligned with user-visible behavior and compatibility constraints.

## 1. Product and scope

Pocket AI brings conversational AI tools into Raycast's normal command interface using a user's own OpenAI-compatible provider. It does not use Raycast's paid AI API, supply model access, or require Raycast Pro for its own conversation UI.

The primary experience is:

1. Launch a tool with Raycast search, an alias, or a hotkey.
2. Type into Raycast's top input bar.
3. Read the streamed answer immediately below that bar.
4. Continue with follow-up instructions in the same bar and session.

The same experience serves general questions, dictionary lookups, translation, writing polish, and user-created commands.

The user-facing product name is **Pocket AI**. The manifest name `mae-ai`, existing command IDs, legacy storage keys, and compatibility deeplinks are retained to avoid breaking installed copies. The icon is the original rounded, transparent-corner asset at [`assets/pocket-ai-native.png`](assets/pocket-ai-native.png).

### Non-goals and boundaries

- Do not unlock Raycast's paid AI features or proxy through Raycast-hosted inference.
- Do not install a provider, manage its subscription, or automate account sign-in.
- Do not require a separate text-entry form for queries or follow-ups.
- Do not claim that extension code can add arbitrary controls to Raycast's native preferences.
- Do not maintain a local chat archive, synchronize user settings between machines, or automatically manage host-owned aliases and Quicklinks. Remote harnesses own their transcripts; Pocket AI persists scoped session/run identifiers and encrypted OpenClaw device material.
- Windows is the verified installation platform. Although the manifest declares macOS compatibility, the Windows installer and desktop verification do not establish macOS support.

## 2. Commands and entry points

The manifest declares eight commands:

| Command ID           | Display title         | Purpose                                                          |
| -------------------- | --------------------- | ---------------------------------------------------------------- |
| `ask-ai`             | Ask AI                | General assistant and conversational questions.                  |
| `dictionary`         | AI Dictionary         | Pronunciation, definitions, examples, and usage.                 |
| `translator`         | AI Translator         | Translation into an explicitly chosen language.                  |
| `polisher`           | AI Polish Text        | Improve grammar, clarity, and tone while preserving meaning.     |
| `configure-provider` | Configure AI Provider | Open native extension preferences for the endpoint and API key.  |
| `create-command`     | Add New Command       | Open the template-based command editor.                          |
| `manage-tools`       | Pocket AI Settings    | Edit, add, delete, restore, and launch commands.                 |
| `custom-tool`        | Run Custom AI Tool    | Dispatch a saved tool by ID, or show settings if no ID is given. |

Suggested shortcuts are `ask` / Ctrl+Alt+1, `df` / Ctrl+Alt+2, `tr` / Ctrl+Alt+3, and `pl` / Ctrl+Alt+4. These are suggestions, not changes made by the installer. Users assign them in Raycast.

For example, the intended dictionary flow is `df`, Space, a word, then Enter. Built-ins accept an optional manifest `query` argument. When an initial query is provided, the command automatically submits it after a usable model is available and any required translation language has been chosen.

Custom commands use the shared `custom-tool` command and a saved tool ID. **Add Command to Raycast** creates a Quicklink through Raycast's UI so the user can assign that command its own alias or hotkey. Creating a saved tool does not dynamically add a new manifest command.

Source: [`package.json`](package.json), [`src/custom-tool.tsx`](src/custom-tool.tsx), [`src/lib/tools.ts`](src/lib/tools.ts).

## 3. Conversation interface

### Input and output

- Use a controlled Raycast `List` search bar with native filtering disabled. Typing must not filter away the conversation.
- A tool supplies separate initial and follow-up placeholders. After submitting, clear the bar and show the follow-up placeholder.
- Render each turn in **You** and **Pocket AI / model** sections below the top bar.
- Render answers as full-width wrapped list rows, not a side panel. The row formatter removes common Markdown markers and wraps at a nominal 76 columns with wide-character handling.
- Preserve the original answer text for copying and **Open Formatted Conversation**, which uses a Markdown `Detail` view. Inline streaming rows are not a full rich-Markdown renderer.
- Display the model dropdown in the search bar accessory.

### Requests and conversation state

This subsection describes **Direct Model** mode. Ask AI's optional remote-agent mode uses server-owned history and execution, described below.

A turn contains a monotonically increasing invocation-local ID, query, accumulated answer, model ID, status, and optional error. Status is one of `streaming`, `complete`, `stopped`, or `error`.

Submitting nonempty text creates a turn and starts a request. Empty input does not create a request. With an empty bar during generation, the primary action becomes **Stop Generation**; typing a new query allows a new submission, which cancels the previous request and retains its available partial answer.

For each request, construct messages in this order:

1. The current tool's rendered system prompt.
2. Prior user/assistant pairs whose assistant answer is nonempty.
3. The new user query.

Empty failed turns are excluded from context. Nonempty partial replies, including stopped replies, remain available as context. There is no automatic history summarization, token budgeting, or context-window trimming.

**Retry Last Request** / **Regenerate Last Response** replaces the last turn rather than duplicating it in the request history. **New Conversation** aborts the current request and clears invocation state. Leaving the view aborts its active request; starting a new invocation does not restore prior chat history.

### Streaming and scrolling

- Accumulate tokens immediately; batch transcript state updates at approximately 40 ms.
- Start in follow-latest mode. Select the newest answer row or the active status row as output grows.
- Throttle scroll selection updates to approximately 120 ms during generation.
- Pause following when the user selects an older row. Ignore acknowledgements of programmatic selections, including delayed acknowledgements.
- Ctrl+L toggles **Pause Auto-Scroll** / **Jump to Latest and Resume** on Windows.
- Every new submission resumes following, including a follow-up after the user browsed older content.
- Retain paused reading position while additional output arrives.

The SDK does not expose a mouse-wheel-only scroll signal. Users should select an older row or pause explicitly before browsing solely with the wheel; the implementation cannot infer every manual scrolling gesture.

Other actions include copying the latest reply, copying the formatted conversation, using clipboard text explicitly, refreshing models, customizing the tool, and opening settings.

Source: [`src/components/tool-command.tsx`](src/components/tool-command.tsx), [`src/lib/session.ts`](src/lib/session.ts), [`src/lib/response-rows.ts`](src/lib/response-rows.ts), [`src/lib/scroll-policy.ts`](src/lib/scroll-policy.ts).

## 4. Settings and command management

### Two settings surfaces

**Pocket AI Settings** is the extension's command-management dashboard:

- **Add New Command** is a visible first-class row.
- **AI Provider** opens native extension preferences.
- Selecting an active command opens its editor as the primary action.
- Secondary actions run the command, delete it, create a Quicklink, or copy its deeplink.
- Deleted built-ins appear in a separate restore section.

**Raycast's native Pocket AI preferences** contain the provider endpoint and password-type API key field. They do not embed the dynamic command list, Add/Delete buttons, or the command editor. There is no separate Pocket AI home-page implementation.

Inside a conversation, **Customize This Tool** and **Pocket AI Settings** expose these same editing surfaces.

### Editor and templates

The shared editor supports:

- Title and system prompt; both are required and trimmed on save.
- Initial input and follow-up placeholders.
- Optional endpoint and model preferences.
- Translation language when relevant.
- Restore-default-prompt and restore-default-placeholder actions for built-ins and their templates.
- Delete with an explicit confirmation.

New commands start from Ask AI, Dictionary, Translator, Polish, or Blank. Template copies receive an independent UUID on save and retain their template `kind`; edits do not mutate the built-in template. Blank starts with an editable general-assistant prompt.

Default prompt intent is defined in `builtInTools`: a helpful general assistant; a dictionary/language tutor; a meaning-preserving translator; and a grammar/clarity/conciseness polisher that does not invent facts.

### Translation language

There is **no default target language**. The target is a per-command setting, not a global preference.

A tool needs a language when its identity/template kind is `translator` or its prompt contains `{{language}}`. Sending without a language opens the language picker instead of making a provider request. Users can choose a listed language or enter their own.

Replace `{{language}}` literally in prompts and placeholders. For a translator-kind command whose customized prompt omits that token, append an explicit target-language instruction to the system prompt. Translator templates retain this behavior.

### Deletion and restoration

- Deleting a built-in records a tombstone; keep its saved overrides so restoration retains customization.
- Deleting a custom tool removes its saved definition. There is no custom-tool undo.
- A deleted tool cannot send requests through a remaining shortcut: opening it shows a deleted-command state with settings navigation and, for built-ins, restoration.
- Native command entries and Quicklinks belong to Raycast. Deletion in Pocket AI does not remove those host entries; the user disables/removes them separately.

Source: [`src/components/settings-view.tsx`](src/components/settings-view.tsx), [`src/components/tool-editor.tsx`](src/components/tool-editor.tsx), [`src/lib/tools.ts`](src/lib/tools.ts), [`src/lib/storage.ts`](src/lib/storage.ts).

## 5. Provider and model integration

### Provider contract

Native preferences store a base endpoint and optional API key. The endpoint accepts a base URL or a full `/chat/completions` URL; normalization removes that suffix and trailing slashes while retaining other path prefixes. An origin-only URL defaults to `/v1`.

Allow HTTP and HTTPS. Reject embedded username/password, query parameters, and fragments. The API key is entered separately without the `Bearer` prefix.

Chat requests use:

```text
POST <normalized-base>/chat/completions
Content-Type: application/json
Accept: text/event-stream
Authorization: Bearer <key>     # only when a permitted key is present
```

```json
{
  "model": "<selected-model-id>",
  "messages": [
    { "role": "system", "content": "<rendered-tool-prompt>" },
    { "role": "user", "content": "<query>" }
  ],
  "stream": true
}
```

Follow-ups add the earlier nonempty conversation pairs as described above. Requests do not declare executable tools or function calls.

A command can override the endpoint. Only an override with the same origin as the default provider may inherit the default API key. Different-origin overrides receive no default key. There is no separate per-command credential field.

The initial endpoint is `http://127.0.0.1:23333/api/openai/v1`, for compatibility with a separately running local VS Code Copilot bridge. That bridge and its authentication are not included. Other OpenAI-compatible providers can replace it.

### Model discovery and selection

- Normally request `GET <normalized-base>/models`.
- For the exact base path `/api/openai/v1`, use `/api/v1/lm/chatModels` on that origin instead.
- Accept an array or an object containing a `data` array. Use each valid ID and its display name when supplied, deduplicate by ID, and sort by display name.
- For bridge arrays containing Copilot-vendor entries, retain Copilot entries and exclude IDs beginning with `copilot-`.
- Debounce discovery by approximately 250 ms and apply a 15-second request timeout.

In the conversation, first try the remembered selection for that endpoint/tool pair; otherwise use the configured preferred model. If that candidate is unavailable, prefer the implementation's `gpt-6-luna` fallback when advertised, then the first discovered model. If discovery fails, a remembered/preferred ID can remain selectable while the discovery error is retained; without an ID, the user must correct discovery before sending.

Selection is through dropdowns, not a required manually typed model ID. A saved model preference is not an immutable pin: the remembered conversation selection can take precedence.

Preserve the host-compatibility workaround: render the selected dropdown item first, set controlled `value` and `defaultValue`, and use `storeValue={false}` on the conversation dropdown so the extension owns persistence.

### Response protocol and errors

The chat timeout defaults to 180 seconds and combines with user cancellation.

The SSE parser handles UTF-8 byte boundaries, CRLF, multiple `data:` lines, a final unterminated event, `[DONE]`, and nonempty finish reasons. It reads the first choice's incremental content or refusal text. A provider output-length finish adds a truncation notice.

Malformed streaming JSON, provider error events, empty answers, or EOF without a completion marker/finish reason are failures. If the provider returns JSON instead of SSE, accept a nonempty first-choice `message.content` as a non-streaming fallback.

Surface request errors without discarding already received text. Provide actionable HTTP hints for authentication/authorization, incorrect paths, rate limiting, and quota exhaustion. Invalid endpoint, missing-model, language-selection, storage, and deletion states have explicit UI feedback rather than silent success.

Source: [`src/lib/stream.ts`](src/lib/stream.ts), [`src/lib/models.ts`](src/lib/models.ts), [`src/hooks/use-models.ts`](src/hooks/use-models.ts).

### Optional remote-agent backend for Ask AI

**Direct Model** remains the default. Only the built-in `ask-ai` ID honors the effective **Ask AI Backend** setting (`direct`, `hermes`, `openclaw`). Deleted-command checks happen before routing. Dictionary, Translator, Polish, and custom/template commands retain their existing direct-model transport.

The dashboard's **Remote Agents** entry opens a dynamic Form. Its backend dropdown shows only Hermes URL/credential guidance for Hermes, only OpenClaw URL/credential guidance for OpenClaw, and neither for Direct Model. Switching preserves both endpoint drafts; **Save Settings** persists the backend and URLs. Selected-backend credential actions open secure native password preferences, which remain static and cannot hide other backends' fields.

Existing native backend/URL preferences supply the initial settings. Saved settings include an explicit allowlist of the backend, both URLs, and their native-value snapshot; native URLs are represented by SHA-256 fingerprints so even credentials mistakenly embedded in legacy preferences are never copied. A later native value differing from its snapshot overrides only that field. Normal edits use the dynamic page. Settings changes refresh Ask AI routing, isolate component state by backend/URL/credential scope, and do not replay the original launch query or cancel accepted remote work.

No agent inherits `apiKey`, per-tool endpoint overrides, or direct-provider model selections. URLs reject embedded credentials/query/fragment and preserve proxy/profile prefixes. Hermes accepts HTTP(S); OpenClaw normalizes HTTP(S) to WS(S).

Remote mode retains the controlled top-bar query/follow-up input, tool prompt/placeholders, streamed answer rows, formatted conversation/copy, and follow-latest policy. Text rendering is batched around 40 ms and following around 120 ms. It shows a bounded six recent activity entries and explicit approval review rows. Only one active/unconfirmed run is writable at a time; follow-ups wait for settlement rather than accidentally starting parallel tasks.

The dropdown discovers **agent targets**, not raw LLMs. Hermes uses `/v1/models` for the configured profile and does not send its virtual profile ID as a native underlying model override. OpenClaw uses `agents.list`. The harness controls its model, tools, web access, memory, and remote environment.

| Backend  | Implemented protocol                                                                                                                                                                                                                                                                                                                     |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hermes   | `/v1/capabilities` feature checks, session create/history, `/v1/runs` submission with idempotency key and server-owned session ID, status polling, SSE with sequence deduplication/Last-Event-ID reconnect, tool/delegation activity, exact generation-bound one-time approval/deny, cooperative stop.                                   |
| OpenClaw | Official client/protocol packages pinned together at 2026.8.1; native wire protocol 4; challenge-signed Ed25519 device pairing; agent discovery, isolated session creation, chat send/history/abort, exact session subscriptions and sanitized approval replay/events, generic one-time approval/deny, reconnect/history reconciliation. |

OpenClaw requests only `operator.read`, `operator.write`, and `operator.approvals`; it does not use a privileged backend bypass, disable pairing/TLS, or silently authorize devices. Pairing is reviewed on the server. Hermes receives custom prompts in `instructions`; OpenClaw receives explicitly labeled response instructions in user-message context because the native chat RPC does not expose a system-prompt override.

Persist submission identity **before** dispatch and run identity after acknowledgment. Do not automatically replay accepted or unconfirmed work after a timeout/disconnect. Hermes `unknown` is not terminal success. An uncertain acknowledgment blocks follow-ups until reconciled or the user explicitly starts a separate conversation after reviewing the server. Never mark a cooperative stop complete merely because the stop endpoint acknowledged it.

Closing the UI detaches without cancelling remote work. Reopening Ask AI restores its last scoped session, reads up to 100 recent server-owned messages, and resumes known work. OpenClaw reconnects recreate subscriptions and authoritative history, adopt exact in-flight run IDs including empty-text runs, discard duplicate event sequences, and reject replaced physical sessions. Transport gaps trigger reconciliation, not resubmission. New Conversation forgets the local pointer, not the server transcript.

Credential/backend/normalized URL changes isolate session and device storage via a SHA-256 scope; selected agents have separate session pointers. Shared credentials stay in native password preferences. OpenClaw identity/device tokens are AES-256-GCM encrypted with an scrypt-derived key and random salt before LocalStorage writes. No transcript or prompt is stored locally.

Remote tools run on the agent machine. There is no file upload/device bridge, local tool execution, automatic web-search tool injection, attachment support, or harness installation. Hermes API sessions cannot attach to foreign CLI/Discord-owned sessions. Hermes clarification/secret/native prompts and OpenClaw question workflows remain on their native surface. Permanent approval grants are not offered.

Full setup, pairing, supported versions, tunnel examples, and limitations: [REMOTE-AGENTS.md](REMOTE-AGENTS.md). Source: [`src/components/remote-agent-view.tsx`](src/components/remote-agent-view.tsx), [`src/lib/agents`](src/lib/agents), [`tests/agents.test.ts`](tests/agents.test.ts).

## 6. Persistence and privacy

The saved tool shape is:

```typescript
interface Tool {
  id: string;
  title: string;
  prompt: string;
  model?: string;
  baseUrl?: string;
  placeholder?: string;
  followUpPlaceholder?: string;
  targetLanguage?: string;
  kind?: string;
}
```

| Data                      | Storage and lifetime                                                                                                         |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Endpoint and API key      | Native Raycast extension preferences; the key uses a password-type preference.                                               |
| Command registry          | Raycast LocalStorage key `pocket-ai.commands.v2`, containing `tools` and `deletedBuiltIns`.                                  |
| Migration inputs          | Fall back to `pocket-ai.tools.v1`, then `mae-ai.tools.v1`, when no current registry exists.                                  |
| Remembered model          | LocalStorage key `pocket-ai.model:<provider-base-url>:<tool-id>`.                                                            |
| Direct conversation turns | React state for the current invocation only.                                                                                 |
| Remote session pointers   | `pocket-ai.agent-session.v1:<scope>:<agent>`: session, run, pending-submission identifiers; no prompt/transcript.            |
| Remote agent selection    | `pocket-ai.agent-target.v1:<scope>`.                                                                                         |
| Remote backend settings   | `pocket-ai.agent-settings.v1`: backend, both URLs, and native-value snapshot; never credentials.                             |
| OpenClaw device material  | `pocket-ai.agent-device.v1:<scope>`: authenticated-encrypted identity/device tokens, protected by native gateway credential. |
| Aliases and Quicklinks    | Raycast-owned settings, outside the tool registry.                                                                           |
| Installer cache/logs      | `.pocket-ai-install` within the source folder; excluded from distribution.                                                   |

Built-in defaults merge with saved overrides by ID before deletion filtering. Saving a tool clears its tombstone; saving another tool must not resurrect deleted built-ins.

Prompts and conversation context go to the configured provider, whose own access rules and data-handling terms apply. Clipboard text is read only through the explicit **Use Clipboard** action. There is no Pocket AI conversation archive or application telemetry implementation.

Public source and release packages must not contain credentials, user conversations, saved custom commands, provider preferences, aliases, hotkeys, dependency folders, or installer state.

## 7. Architecture and change boundaries

```text
Raycast root search / alias / hotkey / Quicklink
  -> manifest command entry
     -> ToolCommand -> QueryView
        -> tool registry + native provider preferences
        -> useModels -> model discovery + remembered selection
        -> conversationMessages -> streamCompletion -> external provider
        -> responseRows + FollowLatestPolicy -> Raycast List
     -> RemoteAgentView (ask-ai only, when selected)
        -> HermesAdapter -> HTTP runs + SSE + session history/controls
        -> OpenClawAdapter -> official GatewayClient -> native WebSocket RPC/events
        -> scoped session receipts + encrypted device vault

Pocket AI Settings -> ToolEditor -> tool registry
                   -> AgentSettingsView -> nonsecret backend/URLs + native snapshot
                   -> native extension preferences
```

Entry files stay small and delegate to shared components. Keep protocol parsing, prompt construction, registry transformations, and scroll decisions separate from host UI code so their behavioral edges can be tested without provider credentials.

Changes must preserve existing command IDs, compatibility deeplinks, storage migration, deletion semantics, same-origin key handling, and top-bar follow-up input. Provider transport is not coupled to a paid Raycast AI entitlement.

## 8. Installation and distribution

Pocket AI is distributed as MIT-licensed source through GitHub. Local/source installation does not make it a Store-reviewed extension. Updates are manual; do not imply that Raycast Store updates manage these copies.

The Windows installer requires stable Node.js >=22.22.2 with adjacent `npm.cmd`, plus installed, running, signed-in Raycast for normal import. It resolves a suitable existing runtime and does not install Node or Raycast.

Normal installation:

1. Validate source identity, runtime, registry option, and Raycast prerequisites.
2. Refuse an active or malformed existing developer PID record; remove only a stale record.
3. Restore locked dependencies when missing or the manifest/lock hash changes.
4. Start the official SDK developer CLI to request source import.
5. Wait for successful compilation, then stop only the developer process and identified compiler children started by this installer.
6. Write a production build and check its manifest, command files, and icon.
7. Return JSON with `status: installed`, `watcherRunning: false`, and `uiVerification: required`.

The import wait defaults to 120 seconds and can be set from 15 to 600 seconds. This is not a timeout covering every dependency download or build step.

`-BuildOnly` skips Raycast prerequisites/import and writes an isolated build under `.pocket-ai-install\build`; it returns `status: built` and `imported: false`. `-NodePath`, `-Registry`, and `-SkipDependencies` support existing runtimes, approved HTTPS mirrors, and already provisioned checkouts.

The tested Raycast Windows 2.11.0.0 public build restricts direct `.rayext` import to internal builds, so Windows users install source rather than double-click a bundle. Keep source in a permanent folder. Installation preserves existing Raycast preferences and tool storage.

The packager uses an allowlist and produces a source ZIP plus `SHA256SUMS`. The optional Windows CI file remains a template, not an enabled workflow. Build/package success alone does not establish desktop import, provider sign-in, model availability, or live streaming.

Source: [`install.ps1`](install.ps1), [`scripts/install-functions.ps1`](scripts/install-functions.ps1), [`scripts/package.ps1`](scripts/package.ps1). Installation procedures are in [README.md](README.md) and [AGENTS.md](AGENTS.md).

## 9. Acceptance criteria and verification baseline

| Area          | Required observable behavior                                                                            |
| ------------- | ------------------------------------------------------------------------------------------------------- |
| Launch        | Alias/hotkey or search opens the correct tool; an initial argument submits after prerequisites resolve. |
| Query UI      | Query and follow-up use the top bar; responses stream below it without a separate query form.           |
| Conversation  | A follow-up retains prior answer context; stop, retry, regenerate, and new-conversation actions work.   |
| Models        | Discovery presents a dropdown; remembered selection and refresh work without mandatory ID typing.       |
| Customization | Prompt, placeholders, endpoint preference, and language save independently for each command.            |
| Translator    | No implicit target language; the user can choose a listed or custom language before requesting.         |
| Management    | Dashboard primary action edits; visible Add/Provider rows work; templates create independent tools.     |
| Deletion      | Deleted tools cannot run; built-ins restore their prior settings; custom deletion is permanent.         |
| Scrolling     | Overflow follows new output, pauses on older-row selection, and resumes explicitly or on follow-up.     |
| Credentials   | Different-origin overrides never inherit the default key; keys do not appear in source packages.        |
| Installation  | Actual normal import produces eight compiled commands and leaves no developer watcher.                  |
| Distribution  | Anonymous GitHub release download matches its checksum and includes required source/installer files.    |

Automated coverage is in [`tests`](tests): streaming and provider errors, model discovery, session construction, templates/language, registry deletion/restoration, row wrapping, scrolling policy, and PowerShell installer guards/build validation.

The original 1.0 baseline passed 26 Node tests and 15 installer checks. A fresh public GitHub clone passed dependency restoration, checks, and an isolated build. The actual published v1.0.0 release ZIP was separately downloaded without GitHub authentication, checksum-verified, and installed with the normal installer; the dashboard, streaming response, contextual follow-up, and absence of a developer PID file were verified in the Windows desktop UI.

The 1.1 baseline passed 35 Node tests and 15 installer checks, plus typecheck, lint, formatting, and the production build. Agent checks use local HTTP/SSE and WebSocket mock servers for authenticated requests, signed pairing, agent/session discovery, partial output, exact approval identity, cancellation, reconnection without duplicate dispatch, foreign-session isolation, unknown execution, and authenticated device encryption.

The installed Windows Raycast UI was checked against a temporary loopback Hermes mock: agent dropdown, multiple partial streaming states, tool activity, completed reply, same-session follow-up, and history restoration after reopening. New Conversation cleared that test session pointer. The mock was stopped and Ask AI restored to Direct Model, with the original provider's model dropdown visible. No user-owned remote Hermes/OpenClaw endpoint or credential was available, so these checks do not establish live cloud-server compatibility.

Those desktop checks used an existing signed-in Raycast installation, Node runtime, and configured provider. A clean second Windows machine and macOS have not been verified. This is a verification record, not a claim that CI or every platform has passed.
