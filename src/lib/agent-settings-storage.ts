import { LocalStorage } from "@raycast/api";
import { SavedAgentSettings } from "./agent-settings";

const settingsKey = "pocket-ai.agent-settings.v1";

export async function loadAgentSettings(): Promise<
  SavedAgentSettings | undefined
> {
  const raw = await LocalStorage.getItem<string>(settingsKey);
  return raw ? (JSON.parse(raw) as SavedAgentSettings) : undefined;
}

export async function saveAgentSettings(
  settings: SavedAgentSettings,
): Promise<void> {
  await LocalStorage.setItem(settingsKey, JSON.stringify(settings));
}
