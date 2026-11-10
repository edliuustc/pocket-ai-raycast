import assert from "node:assert/strict";
import test from "node:test";
import { agentPresentation } from "../src/lib/agent-presentation";
import { AgentApproval, AgentMessage } from "../src/lib/agents/types";

test("connecting, idle, running and successful completion need no synthetic status row or scroll target", () => {
  assert.deepEqual(
    agentPresentation([], [], [], "idle", "", false).itemIds,
    [],
  );
  const messages: AgentMessage[] = [
    { role: "user", text: "Question" },
    { role: "assistant", text: "Line\n".repeat(50) },
  ];
  for (const state of ["running", "completed"] as const) {
    const view = agentPresentation(messages, [], [], state, "", false);
    assert.equal(view.status, undefined);
    assert.equal(view.latestId, "message-1-49");
    assert.ok(view.itemIds.includes(view.latestId!));
    assert.ok(!view.itemIds.includes("agent-state"));
  }
});

test("rich agent replies retain Markdown and media while approvals and execution failures remain visible", () => {
  const markdown =
    "# Result\n\n![Diagram](https://example.com/diagram.png)\n\n```js\nhello();\n```";
  const messages: AgentMessage[] = [{ role: "assistant", text: markdown }];
  const rich = agentPresentation(
    messages,
    ["Searched the web"],
    [],
    "completed",
    "",
    true,
  );
  assert.equal(rich.rows[0].text, markdown);
  assert.equal(rich.latestId, "message-0");
  const approval: AgentApproval = {
    id: "approval-1",
    kind: "exec",
    title: "Run command?",
    detail: "Review this tool",
    allow: true,
  };
  const review = agentPresentation(
    messages,
    [],
    [approval],
    "running",
    "",
    true,
  );
  assert.equal(review.latestId, "approval-approval-1");
  assert.ok(review.itemIds.includes(review.latestId));
  for (const state of ["unknown", "stopping", "cancelled", "failed"] as const) {
    const view = agentPresentation(messages, [], [], state, "", true);
    assert.ok(view.status);
    assert.equal(view.latestId, "agent-state");
  }
  const failure = agentPresentation(
    messages,
    [],
    [],
    "failed",
    "Authentication failed",
    true,
  );
  assert.equal(failure.latestId, "agent-error");
});
