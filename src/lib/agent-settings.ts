import { Preferences } from "./preferences";
import { normalizeAgentUrl } from "./agents/types";
import { createHash } from "node:crypto";

export type AskBackend = "direct" | "hermes" | "openclaw";

export interface AgentSettings {
  backend: AskBackend;
  hermesUrl: string;
  openclawUrl: string;
}

export interface SavedAgentSettings extends AgentSettings {
  native: AgentSettings;
}

type NativeSettings = Pick<
  Preferences,
  "askBackend" | "hermesUrl" | "openclawUrl"
>;

export function nativeAgentSettings(
  preferences: NativeSettings,
): AgentSettings {
  return {
    backend: preferences.askBackend || "direct",
    hermesUrl: preferences.hermesUrl || "http://127.0.0.1:8642",
    openclawUrl: preferences.openclawUrl || "ws://127.0.0.1:18789",
  };
}

export function effectiveAgentSettings(
  preferences: NativeSettings,
  saved?: SavedAgentSettings,
): AgentSettings {
  const native = nativeAgentSettings(preferences);
  if (!saved) return native;
  const snapshot = nativeSnapshot(native);
  // Honor subsequent edits in native preferences without losing unrelated form edits.
  return {
    backend:
      snapshot.backend !== saved.native.backend
        ? native.backend
        : saved.backend,
    hermesUrl:
      snapshot.hermesUrl !== saved.native.hermesUrl
        ? native.hermesUrl
        : saved.hermesUrl,
    openclawUrl:
      snapshot.openclawUrl !== saved.native.openclawUrl
        ? native.openclawUrl
        : saved.openclawUrl,
  };
}

function nativeSnapshot(settings: AgentSettings): AgentSettings {
  return {
    backend: settings.backend,
    hermesUrl: createHash("sha256").update(settings.hermesUrl).digest("hex"),
    openclawUrl: createHash("sha256")
      .update(settings.openclawUrl)
      .digest("hex"),
  };
}

export function prepareAgentSettings(
  settings: AgentSettings,
  preferences: NativeSettings,
): SavedAgentSettings {
  for (const [label, value] of [
    ["Hermes", settings.hermesUrl],
    ["OpenClaw", settings.openclawUrl],
  ]) {
    let url: URL;
    try {
      url = new URL(value.trim());
    } catch {
      continue;
    }
    if (url.username || url.password || url.search || url.hash) {
      throw new Error(
        `${label}: use a URL without embedded credentials, query, or fragment.`,
      );
    }
  }
  const result = {
    backend: settings.backend,
    hermesUrl: settings.hermesUrl,
    openclawUrl: settings.openclawUrl,
    native: nativeSnapshot(nativeAgentSettings(preferences)),
  };
  if (settings.backend === "hermes") {
    result.hermesUrl = normalizeAgentUrl("hermes", settings.hermesUrl);
  } else if (settings.backend === "openclaw") {
    result.openclawUrl = normalizeAgentUrl("openclaw", settings.openclawUrl);
  }
  return result;
}
