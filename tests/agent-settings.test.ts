import assert from "node:assert/strict";
import test from "node:test";
import {
  effectiveAgentSettings,
  prepareAgentSettings,
} from "../src/lib/agent-settings";

test("existing native backend and endpoints are used until settings are saved", () => {
  assert.deepEqual(
    effectiveAgentSettings({
      askBackend: "hermes",
      hermesUrl: "https://hermes.example/p/research",
      openclawUrl: "wss://claw.example/gateway",
    }),
    {
      backend: "hermes",
      hermesUrl: "https://hermes.example/p/research",
      openclawUrl: "wss://claw.example/gateway",
    },
  );
});

test("switching and saving keeps distinct URLs without persisting credentials", () => {
  const native = {
    askBackend: "direct" as const,
    hermesKey: "not-for-local-storage",
    openclawToken: "also-not-for-local-storage",
  };
  const hermes = prepareAgentSettings(
    {
      backend: "hermes",
      hermesUrl: "https://hermes.example/p/work/v1",
      openclawUrl: "wss://claw.example/gateway",
    },
    native,
  );
  assert.equal(hermes.hermesUrl, "https://hermes.example/p/work");
  const claw = prepareAgentSettings(
    {
      ...effectiveAgentSettings(native, hermes),
      backend: "openclaw",
    },
    native,
  );
  assert.equal(claw.backend, "openclaw");
  assert.equal(claw.hermesUrl, "https://hermes.example/p/work");
  assert.equal(claw.openclawUrl, "wss://claw.example/gateway");
  assert.ok(!JSON.stringify(claw).includes("not-for-local-storage"));
  const direct = prepareAgentSettings({ ...claw, backend: "direct" }, native);
  assert.equal(direct.hermesUrl, hermes.hermesUrl);
  assert.equal(direct.openclawUrl, claw.openclawUrl);
});

test("native changes override only the changed value, preserving unrelated form settings", () => {
  const native = { askBackend: "direct" as const };
  const saved = prepareAgentSettings(
    {
      backend: "hermes",
      hermesUrl: "https://hermes.example",
      openclawUrl: "wss://claw.example",
    },
    native,
  );
  assert.deepEqual(
    effectiveAgentSettings(
      {
        askBackend: "openclaw",
        openclawUrl: "wss://replacement.example",
      },
      saved,
    ),
    {
      backend: "openclaw",
      hermesUrl: "https://hermes.example",
      openclawUrl: "wss://replacement.example",
    },
  );
});

test("validate only the selected backend, and reject URL-embedded credentials before saving", () => {
  const draft = {
    backend: "hermes" as const,
    hermesUrl: "https://hermes.example",
    openclawUrl: "unfinished draft",
  };
  assert.doesNotThrow(() => prepareAgentSettings(draft, {}));
  assert.throws(() =>
    prepareAgentSettings({ ...draft, backend: "openclaw" }, {}),
  );
  assert.throws(() =>
    prepareAgentSettings(
      { ...draft, hermesUrl: "https://secret@hermes.example" },
      {},
    ),
  );
  assert.throws(() =>
    prepareAgentSettings(
      { ...draft, openclawUrl: "wss://user:secret@claw.example" },
      {},
    ),
  );
  assert.throws(() =>
    prepareAgentSettings(
      {
        ...draft,
        backend: "direct",
        openclawUrl: "wss://claw.example?token=secret",
      },
      {},
    ),
  );
});

test("native snapshots never copy credentials embedded in legacy URL preferences", () => {
  const native = {
    askBackend: "hermes" as const,
    hermesUrl: "https://user:sensitive-password@hermes.example",
    openclawUrl: "wss://claw.example?token=sensitive-token",
  };
  const corrected = {
    backend: "hermes" as const,
    hermesUrl: "https://hermes.example",
    openclawUrl: "wss://claw.example",
  };
  const saved = prepareAgentSettings(corrected, native);
  assert.ok(!JSON.stringify(saved).includes("sensitive-"));
  assert.deepEqual(effectiveAgentSettings(native, saved), corrected);
});
