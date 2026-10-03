import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
const source = readFileSync(
  new URL("../src/lib/storage.ts", import.meta.url),
  "utf8",
);
const { outputText } = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2020,
  },
});
const { FavoritesRepository, RecentRepository } = await import(
  `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`
);
const values = new Map();
globalThis.localStorage = {
  getItem: (key) => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, value),
};

test("favorites reject malformed entries and deduplicate saved IDs", () => {
  values.set(
    "app:favorites",
    JSON.stringify([
      "snow-sprint",
      "snow-sprint",
      null,
      {},
      42,
      "",
      "star-glider",
    ]),
  );
  assert.deepEqual(FavoritesRepository.read(), ["snow-sprint", "star-glider"]);
  values.set("app:favorites", "invalid json");
  assert.deepEqual(FavoritesRepository.read(), []);
});
test("recent history validates timestamps and keeps only the newest occurrence", () => {
  values.set(
    "app:recent",
    JSON.stringify([
      { gameId: "a", lastPlayedAt: 2 },
      { gameId: "b", lastPlayedAt: 3 },
      { gameId: "a", lastPlayedAt: 4 },
      { gameId: "c", lastPlayedAt: -1 },
      { gameId: 9, lastPlayedAt: 5 },
      null,
    ]),
  );
  assert.deepEqual(RecentRepository.read(), [
    { gameId: "a", lastPlayedAt: 4 },
    { gameId: "b", lastPlayedAt: 3 },
  ]);
});
test("recent history is capped to 40 entries and storage failures are tolerated", () => {
  values.set(
    "app:recent",
    JSON.stringify(
      Array.from({ length: 60 }, (_, i) => ({
        gameId: `game-${i}`,
        lastPlayedAt: i + 1,
      })),
    ),
  );
  const recent = RecentRepository.read();
  assert.equal(recent.length, 40);
  assert.equal(recent[0].gameId, "game-59");
  const original = globalThis.localStorage;
  globalThis.localStorage = {
    getItem: () => {
      throw new Error("denied");
    },
    setItem: () => {
      throw new Error("quota");
    },
  };
  try {
    assert.deepEqual(FavoritesRepository.read(), []);
    assert.deepEqual(RecentRepository.read(), []);
    assert.doesNotThrow(() => FavoritesRepository.save(["a"]));
    assert.doesNotThrow(() => RecentRepository.save([]));
  } finally {
    globalThis.localStorage = original;
  }
});
