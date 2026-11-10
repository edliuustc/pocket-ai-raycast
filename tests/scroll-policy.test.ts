import assert from "node:assert/strict";
import test from "node:test";
import {
  FollowLatestPolicy,
  latestResponseItemId,
} from "../src/lib/scroll-policy";
import { Turn } from "../src/lib/session";

test("the scroll target follows the latest turn and its newest wrapped response row", () => {
  const first: Turn = {
    id: 1,
    query: "First question",
    answer: "Older answer",
    model: "test",
    status: "complete",
  };
  const next: Turn = {
    ...first,
    id: 2,
    query: "Follow-up",
    answer: "",
    status: "streaming",
  };
  assert.equal(latestResponseItemId([]), undefined);
  assert.equal(latestResponseItemId([first, next]), "turn-2-status");
  assert.equal(
    latestResponseItemId([
      first,
      { ...next, answer: "Latest line\n".repeat(40).trim() },
    ]),
    "turn-2-answer-39",
  );
  assert.equal(
    latestResponseItemId([{ ...next, status: "error", error: "Offline" }]),
    "turn-2-error",
  );
  assert.equal(
    latestResponseItemId([{ ...next, status: "stopped" }]),
    "turn-2-stopped",
  );
});

test("programmatic selection acknowledgements do not pause follow-latest, even when delayed", () => {
  const policy = new FollowLatestPolicy();
  policy.expectSelection("turn-2-answer-0");
  policy.expectSelection("turn-2-answer-5");
  assert.equal(policy.select("turn-2-answer-0", "turn-2-answer-5"), true);
  assert.equal(policy.select(null, "turn-2-answer-5"), true);
  assert.equal(policy.select("turn-2-answer-5", "turn-2-answer-5"), true);
  assert.equal(policy.select("turn-2-answer-0", "turn-2-answer-5"), false);
});

test("browsing history or manually pausing holds position until resume or a new request", () => {
  const policy = new FollowLatestPolicy();
  assert.equal(policy.select("turn-1-query-0", "turn-2-answer-12"), false);
  assert.equal(policy.select("turn-2-answer-12", "turn-2-answer-12"), false);
  policy.resume();
  policy.expectSelection("turn-3-status");
  assert.equal(policy.select("turn-3-status", "turn-3-status"), true);
  policy.pause();
  assert.equal(policy.select("turn-3-answer-3", "turn-3-answer-3"), false);
  policy.resume();
  assert.equal(policy.following, true);
});
