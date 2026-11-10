import { responseRows } from "./response-rows";
import { Turn } from "./session";

export function latestResponseItemId(turns: Turn[]): string | undefined {
  const turn = turns.at(-1);
  if (!turn) return undefined;
  const prefix = `turn-${turn.id}`;
  if (turn.status === "error") return `${prefix}-error`;
  if (turn.status === "stopped") return `${prefix}-stopped`;
  const rows = responseRows(turn.answer);
  if (rows.length) return `${prefix}-answer-${rows.length - 1}`;
  if (turn.status === "streaming") return `${prefix}-status`;
  return `${prefix}-query-${responseRows(turn.query).length - 1}`;
}

export class FollowLatestPolicy {
  following = true;
  private expectedSelections = new Set<string>();

  expectSelection(id: string) {
    this.expectedSelections.add(id);
    if (this.expectedSelections.size > 32) {
      this.expectedSelections.delete(
        this.expectedSelections.values().next().value!,
      );
    }
  }

  select(id: string | null, latestId?: string): boolean {
    // Raycast also reports selection changes caused by our controlled prop.
    if (!id || this.expectedSelections.delete(id) || id === latestId) {
      return this.following;
    }
    this.following = false;
    return false;
  }

  pause() {
    this.following = false;
  }

  resume() {
    this.following = true;
  }
}
