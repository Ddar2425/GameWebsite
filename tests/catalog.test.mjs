import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { searchGames, relatedGames } from "../src/lib/search.mjs";
import { isAllowedGameUrl } from "../src/lib/embed.mjs";
const games = JSON.parse(
  fs
    .readFileSync(new URL("../src/data/games.ts", import.meta.url), "utf8")
    .split("export const games: Game[] = ")[1]
    .replace(/;\s*$/, ""),
);
test("catalog entries are unique and all playable packages and thumbnails exist", () => {
  assert.equal(games.length, 66);
  assert.equal(new Set(games.map((g) => g.id)).size, 66);
  for (const g of games) {
    assert.ok(
      fs.existsSync(new URL(`../public${g.thumbnail}`, import.meta.url)),
    );
    if (g.externalUrl) {
      assert.equal(g.launchType, "external");
      assert.equal(g.externalUrl, "https://www.kodub.com/apps/polytrack");
      assert.equal(g.gameUrl, undefined);
      continue;
    }
    assert.ok(isAllowedGameUrl(g.gameUrl));
    if (g.slug !== "block-world")
      assert.ok(
        fs.existsSync(
          new URL(`../public${g.gameUrl.split("?")[0]}`, import.meta.url),
        ),
      );
  }
  assert.equal(games.filter((g) => g.slug !== "block-world" && !g.externalUrl).length, 64);
});
test("search normalizes alternate titles and searches metadata", () => {
  for (const q of ["snow rider", "snowrider", "SNOW RIDER"])
    assert.ok(searchGames(games, q).some((g) => g.slug === "snow-sprint"));
  for (const q of ["minecraft", "mine craft"])
    assert.ok(searchGames(games, q).some((g) => g.slug === "block-world"));
  assert.ok(
    searchGames(games, "racing").every((g) =>
      JSON.stringify(g).toLowerCase().includes("racing"),
    ),
  );
  assert.equal(searchGames(games, "not-a-real-game-zxq").length, 0);
});
test("related ranking follows category and shared tags and excludes current", () => {
  const current = { id: "a", category: "Arcade", tags: ["space", "fast"] };
  const candidates = [
    current,
    { id: "b", category: "Puzzle", tags: ["space", "fast"], popular: true },
    { id: "c", category: "Arcade", tags: ["space"], popular: false },
    { id: "d", category: "Puzzle", tags: [], popular: true },
  ];
  assert.deepEqual(
    relatedGames(candidates, current).map((g) => g.id),
    ["c", "b", "d"],
  );
});
test("embed policy rejects arbitrary, traversal, credentialed, and protocol-relative URLs", () => {
  assert.ok(isAllowedGameUrl("/games/sprout-arcade/index.html?mode=space"));
  for (const u of [
    "https://evil.example/game.html",
    "//evil.example/game.html",
    "javascript:alert(1)",
    "/games/../../secret.html",
    "/games/../private/game.html",
    "/games\\evil.html",
    "https://user:pass@evil.example/game.html",
  ])
    assert.equal(isAllowedGameUrl(u), false, u);
});

test("local URLs reject encoded separators, controls, and invalid data types", () => {
  for (const value of [
    false,
    123,
    {},
    [],
    "/games/%2e%2e%2fprivate/index.html",
    "/games/%252e%252e/index.html",
    "/games/demo/../other/index.html",
    "/games/demo/index.html\n",
    "/games/demo%5Cindex.html",
  ])
    assert.equal(isAllowedGameUrl(value), false, String(value));
});
