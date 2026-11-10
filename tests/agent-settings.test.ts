import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import {
  effectiveAgentSettings,
  prepareAgentSettings,
  readAgentSettings,
  SavedAgentSettings,
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
  const native = { askBackend: "direct" as const };
  const input = {
    backend: "hermes",
    hermesUrl: "https://hermes.example/p/work/v1",
    openclawUrl: "wss://claw.example/gateway",
    hermesKey: "not-for-local-storage",
    openclawToken: "also-not-for-local-storage",
  } as const;
  const hermes = prepareAgentSettings(input);
  assert.equal(hermes.hermesUrl, "https://hermes.example/p/work");
  const claw = prepareAgentSettings({
    ...effectiveAgentSettings(native, hermes),
    backend: "openclaw",
  });
  assert.equal(claw.backend, "openclaw");
  assert.equal(claw.hermesUrl, "https://hermes.example/p/work");
  assert.equal(claw.openclawUrl, "wss://claw.example/gateway");
  assert.ok(!JSON.stringify(claw).includes("not-for-local-storage"));
  const direct = prepareAgentSettings({ ...claw, backend: "direct" });
  assert.equal(direct.hermesUrl, hermes.hermesUrl);
  assert.equal(direct.openclawUrl, claw.openclawUrl);
});

test("legacy native changes can be imported once without overriding canonical settings", () => {
  const native = { askBackend: "direct" as const };
  const hash = (value: string) =>
    createHash("sha256").update(value).digest("hex");
  const saved: SavedAgentSettings = {
    backend: "hermes",
    hermesUrl: "https://hermes.example",
    openclawUrl: "wss://claw.example",
    native: {
      backend: "direct",
      hermesUrl: hash("http://127.0.0.1:8642"),
      openclawUrl: hash("ws://127.0.0.1:18789"),
    },
  };
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
  assert.equal(effectiveAgentSettings(native, saved).backend, "hermes");
  assert.deepEqual(effectiveAgentSettings({}, saved), {
    backend: "hermes",
    hermesUrl: saved.hermesUrl,
    openclawUrl: saved.openclawUrl,
  });
  const canonical = prepareAgentSettings(effectiveAgentSettings({}, saved));
  assert.equal(canonical.version, 2);
  assert.equal(canonical.native, undefined);
  assert.deepEqual(
    effectiveAgentSettings(
      { askBackend: "openclaw", hermesUrl: "https://stale.example" },
      canonical,
    ),
    {
      backend: "hermes",
      hermesUrl: saved.hermesUrl,
      openclawUrl: saved.openclawUrl,
    },
  );
});

test("validate only the selected backend, and reject URL-embedded credentials before saving", () => {
  const draft = {
    backend: "hermes" as const,
    hermesUrl: "https://hermes.example",
    openclawUrl: "unfinished draft",
  };
  assert.doesNotThrow(() => prepareAgentSettings(draft));
  assert.throws(() => prepareAgentSettings({ ...draft, backend: "openclaw" }));
  assert.throws(() =>
    prepareAgentSettings({
      ...draft,
      hermesUrl: "https://secret@hermes.example",
    }),
  );
  assert.throws(() =>
    prepareAgentSettings({
      ...draft,
      openclawUrl: "wss://user:secret@claw.example",
    }),
  );
  assert.throws(() =>
    prepareAgentSettings({
      ...draft,
      backend: "direct",
      openclawUrl: "wss://claw.example?token=secret",
    }),
  );
});

test("canonical settings never copy credentials embedded in legacy URL preferences", () => {
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
  const saved = prepareAgentSettings(corrected);
  assert.ok(!JSON.stringify(saved).includes("sensitive-"));
  assert.deepEqual(effectiveAgentSettings(native, saved), corrected);
});

test("both settings entry points read the same persisted mode after a one-time migration", async () => {
  let raw: string | undefined = JSON.stringify({
    backend: "hermes",
    hermesUrl: "https://hermes.example",
    openclawUrl: "wss://claw.example",
    native: {
      backend: "hermes",
      hermesUrl: "legacy-fingerprint",
      openclawUrl: "legacy-fingerprint",
    },
  });
  let writes = 0;
  const read = async () => raw;
  const write = async (value: SavedAgentSettings) => {
    raw = JSON.stringify(value);
    writes++;
  };
  const migrated = await readAgentSettings(read, write, {});
  assert.equal(migrated?.backend, "hermes");
  assert.equal(migrated?.version, 2);
  assert.equal(writes, 1);
  const reopened = await readAgentSettings(read, write, {
    askBackend: "direct",
  });
  assert.deepEqual(reopened, migrated);
  assert.equal(writes, 1);
  await write(prepareAgentSettings({ ...reopened!, backend: "openclaw" }));
  assert.equal(
    (await readAgentSettings(read, write, { askBackend: "hermes" }))?.backend,
    "openclaw",
  );
  assert.equal(writes, 2);
  raw = undefined;
  assert.equal(await readAgentSettings(read, write, {}), undefined);
  assert.equal(writes, 2);
});
