const assert = require("node:assert/strict");
const fs = require("node:fs");
const { chromium } = require("playwright");
const base = process.env.BASE_URL || "http://localhost:3000";
const screenshotDir = process.env.SCREENSHOT_DIR || "test-results";
let passed = 0;
async function check(name, fn) {
  await fn();
  passed++;
  console.log(`PASS ${name}`);
}
(async () => {
  fs.mkdirSync(screenshotDir, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.CHROMIUM_PATH
      ? { executablePath: process.env.CHROMIUM_PATH }
      : {}),
    args: ["--no-sandbox"],
  });
  const context = await browser.newContext({
    viewport: { width: 1366, height: 900 },
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  const goto = async (path) => {
    const response = await page.goto(base + path);
    assert.equal(response.status(), 200);
  };
  const capture = async (path) => {
    await page.waitForFunction(() =>
      Array.from(document.querySelectorAll(".game-card"))
        .filter((e) => {
          const r = e.getBoundingClientRect();
          return (
            r.top < innerHeight &&
            r.bottom > 0 &&
            r.left < innerWidth &&
            r.right > 0
          );
        })
        .every(
          (e) =>
            e.classList.contains("loaded") &&
            (!e.querySelector("img") ||
              Number(getComputedStyle(e.querySelector("img")).opacity) === 1),
        ),
    );
    await page.screenshot({ path });
  };

  await check("homepage catalog and original images load", async () => {
    await goto("/");
    await page.waitForFunction(
      () => document.querySelectorAll(".game-card.loaded").length > 20,
    );
    assert.equal(await page.locator(".mosaic .game-card").count(), 64);
    assert.equal(await page.locator(".image-fallback").count(), 0);
    assert.ok(
      await page
        .locator("img")
        .evaluateAll((es) =>
          es
            .filter((e) => e.loading === "eager")
            .every((e) => e.complete && e.naturalWidth > 0),
        ),
    );
  });
  for (const width of [375, 430, 768, 1024, 1280, 1366, 1440, 1920])
    await check(`responsive catalog at ${width}px`, async () => {
      await page.setViewportSize({ width, height: 900 });
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      await capture(`${screenshotDir}/home-${width}.png`);
    });
  await page.setViewportSize({ width: 1366, height: 900 });
  await check(
    "search normalizes text and keyboard selection opens a game",
    async () => {
      await page
        .getByRole("button", { name: "Search games", exact: true })
        .click();
      const input = page.getByRole("combobox", {
        name: "Search games by title or category",
      });
      await input.fill("snowrider");
      assert.equal(await page.locator("#search-results .game-card").count(), 1);
      await input.press("ArrowDown");
      await input.press("Enter");
      await page.waitForURL("**/games/snow-sprint");
      await page
        .getByRole("button", { name: "Play now", exact: true })
        .waitFor();
    },
  );
  await check(
    "player loads local HTML5, focuses game, and records history",
    async () => {
      await page.getByRole("button", { name: "Play now", exact: true }).click();
      await page.locator("iframe.ready").waitFor();
      assert.equal(
        await page
          .frameLocator("iframe")
          .locator("body")
          .getAttribute("data-mode"),
        "racer",
      );
      await page.waitForFunction(
        () => document.activeElement?.tagName === "IFRAME",
      );
      assert.ok(
        (
          await page.evaluate(() =>
            JSON.parse(localStorage.getItem("app:recent")),
          )
        ).some((x) => x.gameId === "snow-sprint"),
      );
      await capture(`${screenshotDir}/player-1366.png`);
    },
  );
  await check("reload restarts and deduplicates recent games", async () => {
    const old = await page.locator("iframe").elementHandle();
    await page
      .getByRole("button", { name: "Reload game", exact: true })
      .click();
    await page.locator("iframe.ready").waitFor();
    assert.equal(await old.evaluate((el) => el.isConnected), false);
    assert.equal(
      (
        await page.evaluate(() =>
          JSON.parse(localStorage.getItem("app:recent")),
        )
      ).filter((x) => x.gameId === "snow-sprint").length,
      1,
    );
  });
  await check("Fullscreen API enters and exits", async () => {
    await page
      .getByRole("button", { name: "Enter fullscreen", exact: true })
      .click();
    await page.waitForFunction(() => !!document.fullscreenElement);
    await page
      .getByRole("button", { name: "Exit fullscreen", exact: true })
      .click();
    await page.waitForFunction(() => !document.fullscreenElement);
  });
  await check("favorite immediately updates and survives reload", async () => {
    await page
      .getByRole("button", { name: "Save Snow Sprint", exact: true })
      .click();
    assert.equal(
      await page
        .getByRole("button", { name: "Unsave Snow Sprint", exact: true })
        .getAttribute("aria-pressed"),
      "true",
    );
    await goto("/favorites");
    await page
      .getByRole("link", { name: "Play Snow Sprint", exact: true })
      .waitFor();
    assert.equal(
      await page
        .getByRole("link", { name: "Play Snow Sprint", exact: true })
        .count(),
      1,
    );
    await page.reload();
    await page
      .getByRole("link", { name: "Play Snow Sprint", exact: true })
      .waitFor();
  });
  await check("recent page loads and can clear history", async () => {
    await goto("/recent");
    await page
      .getByRole("link", { name: "Play Snow Sprint", exact: true })
      .waitFor();
    await page.getByRole("button", { name: "Clear history" }).click();
    await page.getByText("Ready for your first game?").waitFor();
  });
  await check(
    "search clear, Escape, empty state, and focus restoration",
    async () => {
      await goto("/");
      await page
        .getByRole("button", { name: "Search games", exact: true })
        .click();
      const input = page.getByRole("combobox", {
        name: "Search games by title or category",
      });
      await input.fill("nonsense-zxy");
      await page.getByText("No games found", { exact: true }).waitFor();
      await page
        .getByRole("button", { name: "Clear search", exact: true })
        .click();
      assert.equal(await input.inputValue(), "");
      await page.waitForTimeout(300);
      await capture(`${screenshotDir}/search-1366.png`);
      await input.press("Escape");
      assert.equal(await page.getByRole("dialog").count(), 0);
      assert.equal(
        await page
          .getByRole("button", { name: "Search games", exact: true })
          .evaluate((el) => el === document.activeElement),
        true,
      );
    },
  );
  await check("dedicated search and category pages work", async () => {
    await goto("/search?q=mine%20craft");
    await page
      .getByRole("link", { name: "View Block World", exact: true })
      .waitFor();
    await goto("/category/racing");
    assert.equal(await page.locator(".mosaic .game-card").count(), 8);
  });
  await check(
    "mobile menu navigates and restores focus on Escape",
    async () => {
      await page.setViewportSize({ width: 375, height: 812 });
      await goto("/");
      await page
        .getByRole("button", { name: "Open menu", exact: true })
        .click();
      await page
        .getByRole("dialog")
        .getByRole("link", { name: "Favorites", exact: true })
        .click();
      await page.waitForURL("**/favorites");
      await page
        .getByRole("button", { name: "Open menu", exact: true })
        .click();
      await page.keyboard.press("Escape");
      assert.equal(await page.getByRole("dialog").count(), 0);
      assert.equal(
        await page
          .getByRole("button", { name: "Open menu", exact: true })
          .evaluate((el) => el === document.activeElement),
        true,
      );
    },
  );
  await check("game page and player stay within mobile widths", async () => {
    await goto("/games/memory-garden");
    for (const width of [375, 430, 768, 1024]) {
      await page.setViewportSize({ width, height: 900 });
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      await capture(`${screenshotDir}/player-${width}.png`);
    }
  });
  await page.setViewportSize({ width: 1366, height: 900 });
  for (const [slug, mode] of [
    ["star-glider", "space"],
    ["garden-snake", "snake"],
    ["brick-blitz", "breakout"],
    ["cloud-hopper", "runner"],
    ["memory-garden", "memory"],
    ["sprout-clicker", "clicker"],
    ["paddle-pals", "duel"],
  ])
    await check(`${mode} game runs without errors`, async () => {
      await goto(`/games/${slug}`);
      await page.getByRole("button", { name: "Play now", exact: true }).click();
      await page.locator("iframe.ready").waitFor();
      const frame = page.frameLocator("iframe");
      assert.equal(await frame.locator("body").getAttribute("data-mode"), mode);
      if (mode === "memory") {
        const cards = frame.locator(".memory-card");
        assert.equal(await cards.count(), 16);
        await cards.first().click();
        assert.notEqual(await cards.first().innerText(), "?");
      } else if (mode === "clicker") {
        await frame
          .getByRole("button", { name: "Collect seeds", exact: true })
          .click();
        assert.ok(
          (await frame.locator("#garden-count").innerText()).startsWith(
            "1 seeds",
          ),
        );
      } else {
        await frame.locator("body").click();
        await page.keyboard.press(mode === "runner" ? "Space" : "ArrowRight");
        await page.waitForTimeout(200);
        assert.equal(
          await frame.locator("#canvas").evaluate((c) => !!c.getContext("2d")),
          true,
        );
      }
      await frame
        .getByRole("button", { name: "Pause game", exact: true })
        .click();
      await frame.getByText("Paused", { exact: true }).waitFor();
      await frame.getByRole("button", { name: "Resume", exact: true }).click();
      await frame
        .getByRole("button", { name: "Restart game", exact: true })
        .click();
    });
  await check("related games navigate to another player", async () => {
    await goto("/games/snow-sprint");
    const href = await page
      .locator(".related-section .card-link")
      .first()
      .getAttribute("href");
    await page.locator(".related-section .card-link").first().click();
    await page.waitForURL("**" + href);
    assert.ok(page.url().includes("/games/"));
    assert.ok(!page.url().endsWith("/games/snow-sprint"));
  });
  await check(
    "unavailable game is clearly marked and never launches",
    async () => {
      await goto("/games/block-world");
      await page.getByText("Coming soon", { exact: true }).waitFor();
      assert.equal(
        await page
          .getByRole("button", { name: "Play now", exact: true })
          .count(),
        0,
      );
      assert.equal(await page.locator("iframe").count(), 0);
      assert.equal(
        await page
          .getByRole("button", { name: "Reload game", exact: true })
          .isDisabled(),
        true,
      );
      assert.ok(
        !(
          await page.evaluate(() =>
            JSON.parse(localStorage.getItem("app:recent")),
          )
        ).some((r) => r.gameId === "block-world"),
      );
    },
  );
  await check(
    "empty search has no phantom keyboard selection and suggestions expose selection",
    async () => {
      await goto("/");
      await page
        .getByRole("button", { name: "Search games", exact: true })
        .click();
      const input = page.getByRole("combobox", {
        name: "Search games by title or category",
      });
      await input.fill("no-such-game-zxy");
      await input.press("ArrowDown");
      await input.press("ArrowUp");
      assert.equal(await input.getAttribute("aria-activedescendant"), null);
      assert.equal(await page.getByRole("option").count(), 0);
      await input.fill("snowrider");
      await input.press("ArrowDown");
      const option = page.getByRole("option", {
        name: "Play Snow Sprint",
        exact: true,
      });
      assert.equal(await option.getAttribute("aria-selected"), "true");
      assert.equal(
        await input.getAttribute("aria-activedescendant"),
        await option.getAttribute("id"),
      );
      await input.press("Escape");
    },
  );
  await check(
    "modal makes background inert and traps Tab in both directions",
    async () => {
      await page
        .getByRole("button", { name: "Open menu", exact: true })
        .click();
      const dialog = page.getByRole("dialog");
      assert.equal(
        await page.locator("#content").evaluate((e) => e.inert),
        true,
      );
      const first = dialog.getByRole("button", {
          name: "Close panel",
          exact: true,
        }),
        last = dialog.locator("a[href]").last();
      await last.focus();
      await page.keyboard.press("Tab");
      assert.equal(
        await first.evaluate((e) => e === document.activeElement),
        true,
      );
      await page.keyboard.press("Shift+Tab");
      assert.equal(
        await last.evaluate((e) => e === document.activeElement),
        true,
      );
      await page.keyboard.press("Escape");
      assert.equal(
        await page.locator("#content").evaluate((e) => e.inert),
        false,
      );
    },
  );
  await check(
    "dedicated search keeps category on submit and can remove it",
    async () => {
      await goto("/search?category=racing");
      await page
        .getByRole("textbox", { name: "Search catalog" })
        .fill("snowrider");
      await page
        .getByRole("textbox", { name: "Search catalog" })
        .press("Enter");
      await page.waitForURL(
        (u) =>
          u.searchParams.get("q") === "snowrider" &&
          u.searchParams.get("category") === "racing",
      );
      await page
        .getByRole("link", { name: "Play Snow Sprint", exact: true })
        .waitFor();
      await page.getByRole("link", { name: "Remove category filter" }).click();
      await page.waitForURL((u) => !u.searchParams.has("category"));
    },
  );
  await check(
    "failed package preflight never launches or records history, and retry works",
    async () => {
      const isolated = await browser.newContext();
      const p = await isolated.newPage();
      let unavailable = true,
        gameGets = 0;
      p.on("request", (r) => {
        if (
          r.url().includes("/games/sprout-arcade/index.html") &&
          r.method() === "GET"
        )
          gameGets++;
      });
      await p.route("**/games/sprout-arcade/index.html?**", async (route) => {
        if (route.request().method() === "HEAD" && unavailable)
          await route.fulfill({
            status: 503,
            contentType: "text/plain",
            body: "unavailable",
          });
        else await route.continue();
      });
      await p.goto(base + "/games/star-glider");
      await p.getByRole("button", { name: "Play now", exact: true }).click();
      await p.locator(".error-overlay").waitFor();
      assert.ok(
        (await p.locator(".error-overlay").innerText()).includes(
          "temporarily unavailable",
        ),
      );
      assert.equal(await p.locator("iframe").count(), 0);
      assert.equal(gameGets, 0);
      assert.equal(
        await p.evaluate(
          () => JSON.parse(localStorage.getItem("app:recent") || "[]").length,
        ),
        0,
      );
      unavailable = false;
      await p.getByRole("button", { name: "Try again", exact: true }).click();
      await p.locator("iframe.ready").waitFor();
      assert.equal(gameGets, 1);
      assert.equal(
        await p.evaluate(
          () => JSON.parse(localStorage.getItem("app:recent")).length,
        ),
        1,
      );
      await isolated.close();
    },
  );
  await check(
    "delayed package check stays loading and rejects unrelated ready messages",
    async () => {
      const isolated = await browser.newContext();
      const p = await isolated.newPage();
      let release;
      let requested;
      const gate = new Promise((resolve) => (release = resolve)),
        requestSeen = new Promise((resolve) => (requested = resolve));
      await p.route("**/games/sprout-arcade/index.html?**", async (route) => {
        if (route.request().method() === "HEAD") {
          requested();
          await gate;
        }
        await route.continue();
      });
      await p.goto(base + "/games/star-glider");
      await p.getByRole("button", { name: "Play now", exact: true }).click();
      await requestSeen;
      assert.equal(await p.locator("iframe").count(), 0);
      await p.evaluate(() =>
        window.postMessage({ type: "sprout:ready" }, location.origin),
      );
      assert.equal(
        await p.locator(".player-stage").getAttribute("aria-busy"),
        "true",
      );
      release();
      await p.locator("iframe.ready").waitFor();
      await isolated.close();
    },
  );
  await check(
    "game readiness cannot steal focus from an open search dialog",
    async () => {
      const isolated = await browser.newContext();
      const p = await isolated.newPage();
      let release, requested;
      const gate = new Promise((resolve) => (release = resolve)),
        requestSeen = new Promise((resolve) => (requested = resolve));
      await p.route("**/games/sprout-arcade/index.html?**", async (route) => {
        if (route.request().method() === "GET") {
          requested();
          await gate;
        }
        await route.continue();
      });
      await p.goto(base + "/games/star-glider");
      await p.getByRole("button", { name: "Play now", exact: true }).click();
      await requestSeen;
      await p
        .getByRole("button", { name: "Search games", exact: true })
        .click();
      const input = p.getByRole("combobox");
      await input.waitFor();
      await input.focus();
      release();
      await p.locator("iframe.ready").waitFor();
      assert.equal(
        await input.evaluate((e) => document.activeElement === e),
        true,
      );
      await isolated.close();
    },
  );
  await check(
    "game without a readiness signal times out instead of staying blank",
    async () => {
      const isolated = await browser.newContext();
      const p = await isolated.newPage();
      await p.route("**/games/sprout-arcade/index.html?**", (route) =>
        route.fulfill({
          status: 200,
          contentType: "text/html",
          body: "<!doctype html><title>Unresponsive game</title><body>Waiting</body>",
        }),
      );
      await p.goto(base + "/games/star-glider");
      await p.clock.install();
      await p.getByRole("button", { name: "Play now", exact: true }).click();
      await p.locator("iframe").waitFor();
      await p.clock.fastForward(21000);
      await p.locator(".error-overlay").waitFor();
      assert.ok(
        (await p.locator(".error-overlay").innerText()).includes(
          "taking too long",
        ),
      );
      assert.equal(await p.locator("iframe").count(), 0);
      assert.equal(
        await p.evaluate(
          () => JSON.parse(localStorage.getItem("app:recent") || "[]").length,
        ),
        0,
      );
      await isolated.close();
    },
  );
  await check("memory cards activate with Space and Enter", async () => {
    await goto("/games/memory-garden");
    await page.getByRole("button", { name: "Play now", exact: true }).click();
    await page.locator("iframe.ready").waitFor();
    const cards = page.frameLocator("iframe").locator(".memory-card");
    await cards.nth(0).focus();
    await page.keyboard.press("Space");
    assert.notEqual(await cards.nth(0).innerText(), "?");
    await cards.nth(1).focus();
    await page.keyboard.press("Enter");
    assert.notEqual(await cards.nth(1).innerText(), "?");
  });
  await check("breakout center bounce keeps horizontal movement", async () => {
    await goto("/games/brick-blitz");
    await page.getByRole("button", { name: "Play now", exact: true }).click();
    await page.locator("iframe.ready").waitFor();
    const frame = page.frames().find((f) => f.url().includes("sprout-arcade"));
    const bounce = await frame.evaluate(() => {
      paused = true;
      state.ball = { x: state.paddle, y: 489, vx: 0, vy: 250 };
      update(0.016);
      return { vx: state.ball.vx, vy: state.ball.vy };
    });
    assert.ok(Math.abs(bounce.vx) >= 90);
    assert.ok(bounce.vy < 0);
  });
  await check("fast paddle shots bounce and have a bounded speed", async () => {
    await goto("/games/paddle-pals");
    await page.getByRole("button", { name: "Play now", exact: true }).click();
    await page.locator("iframe.ready").waitFor();
    const frame = page.frames().find((f) => f.url().includes("sprout-arcade"));
    const bounce = await frame.evaluate(() => {
      paused = true;
      state.left = 210;
      state.ball = { x: 80, y: 270, vx: -4000, vy: 0 };
      update(0.025);
      return { vx: state.ball.vx, opponent: state.b };
    });
    assert.ok(bounce.vx > 0 && bounce.vx <= 780);
    assert.equal(bounce.opponent, 0);
  });
  await check("favorites synchronize across two browser tabs", async () => {
    const isolated = await browser.newContext();
    const a = await isolated.newPage(),
      b = await isolated.newPage();
    await a.goto(base + "/favorites");
    await a.getByText("Your favorites start here").waitFor();
    await b.goto(base + "/");
    await b
      .getByRole("button", { name: "Save Snow Sprint", exact: true })
      .click();
    await a
      .getByRole("link", { name: "Play Snow Sprint", exact: true })
      .waitFor();
    await b
      .getByRole("button", { name: "Unsave Snow Sprint", exact: true })
      .click();
    await a.getByText("Your favorites start here").waitFor();
    await isolated.close();
  });
  await check(
    "mobile idle and error controls fit fully inside the player",
    async () => {
      await page.setViewportSize({ width: 375, height: 812 });
      await goto("/games/star-glider");
      assert.ok(
        await page.locator(".play-prompt").evaluate((e) => {
          const p = e.closest(".player-stage").getBoundingClientRect(),
            r = e.getBoundingClientRect();
          return r.top >= p.top && r.bottom <= p.bottom;
        }),
      );
      await capture(`${screenshotDir}/mobile-player-refined.png`);
      const isolated = await browser.newContext({
        viewport: { width: 375, height: 812 },
      });
      const mobile = await isolated.newPage();
      await mobile.route("**/games/sprout-arcade/index.html?**", (route) =>
        route.fulfill({
          status: 503,
          contentType: "text/plain",
          body: "unavailable",
        }),
      );
      await mobile.goto(base + "/games/star-glider");
      await mobile
        .getByRole("button", { name: "Play now", exact: true })
        .click();
      await mobile.locator(".error-overlay").waitFor();
      assert.ok(
        await mobile
          .locator(".error-overlay")
          .evaluate((e) => e.scrollHeight <= e.clientHeight + 1),
      );
      const retry = mobile.getByRole("button", {
        name: "Try again",
        exact: true,
      });
      assert.ok(
        await retry.evaluate((e) => {
          const p = e.closest(".player-stage").getBoundingClientRect(),
            r = e.getBoundingClientRect();
          return r.top >= p.top && r.bottom <= p.bottom;
        }),
      );
      await mobile.screenshot({
        path: `${screenshotDir}/mobile-error-refined.png`,
      });
      await isolated.close();
      await goto("/search?q=snow&category=racing");
      assert.ok(
        await page
          .locator(".catalog-heading")
          .evaluate((e) => e.scrollHeight <= e.clientHeight + 1),
      );
      await capture(`${screenshotDir}/mobile-search-refined.png`);
      await page.setViewportSize({ width: 1366, height: 900 });
    },
  );
  await check("touch controls work on a mobile game", async () => {
    const touchContext = await browser.newContext({
      viewport: { width: 375, height: 812 },
      hasTouch: true,
      isMobile: true,
    });
    const mobile = await touchContext.newPage();
    await mobile.goto(base + "/games/sprout-clicker");
    await mobile.getByRole("button", { name: "Play now", exact: true }).tap();
    await mobile.locator("iframe.ready").waitFor();
    const frame = mobile.frameLocator("iframe");
    await frame
      .getByRole("button", { name: "Collect seeds", exact: true })
      .tap();
    assert.ok(
      (await frame.locator("#garden-count").innerText()).startsWith("1 seeds"),
    );
    await touchContext.close();
  });
  await check(
    "sitemap, robots, and unknown routes respond correctly",
    async () => {
      assert.equal(
        (await page.request.get(base + "/sitemap.xml")).status(),
        200,
      );
      assert.equal(
        (await page.request.get(base + "/robots.txt")).status(),
        200,
      );
      assert.equal(
        (await page.request.get(base + "/games/nonexistent")).status(),
        404,
      );
    },
  );
  await check("no unexpected browser console or JavaScript errors", async () =>
    assert.deepEqual(errors, []),
  );
  console.log(`${passed} browser checks passed.`);
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
