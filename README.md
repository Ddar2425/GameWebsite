# Sproutplay

An original Next.js browser-game portal with a dense, reference-measured mosaic, a search drawer, a game player, and a device-local library.

## Run

Requires Node.js 20.9+ (validated with Node 24) and npm.

```sh
npm install
npm run dev
```

Production:

```sh
npm run build
npm start
```

No database, account, credentials, or external game services are required. Set `SITE_URL` to your public origin when deploying; sitemap generation otherwise uses `https://sproutplay.example`.

## Validation

```sh
npm run typecheck
npm test
```

Browser checks require a running development or production server and Chromium:

```sh
CHROMIUM_PATH=/usr/bin/chromium npm run test:e2e
```

For another server, set `BASE_URL`. Without `CHROMIUM_PATH`, Playwright uses its own browser installation (`npx playwright install chromium`). Screenshots go into ignored `test-results/`; set `SCREENSHOT_DIR` to change the location. The suite covers all eight requested widths, search keyboard behavior, categories, favorites persistence, recent games, player readiness, all eight game types, fullscreen, reload, failed downloads, readiness timeouts, coming-soon states, keyboard gameplay, cross-tab updates, and browser errors.

## Catalog and games

`src/data/games.ts` contains **64 original mini-game variants**: eight mechanics with eight named difficulty variants each. They are small, playable demonstrations, not replacements for commercial games. Artwork is original local SVG. Local multiplayer uses one shared device.

`Block World` is a 65th catalog entry and a **Coming soon listing** for an authorized package. It cannot be launched or recorded in history until it is enabled. It does not distribute Minecraft or any third-party game.

- Add catalog entries without changing UI components.
- Put authorized HTML5 packages under `public/games/<package>/index.html`.
- Register `/games/<package>/index.html` as `gameUrl` with `launchType: 'html5'` or `'webgl'`.
- See [game integration](docs/GAME-INTEGRATION.md) for readiness, permissions, external embeds, and WebAssembly requirements.

Favorites (`app:favorites`) and history (`app:recent`) persist in localStorage. Repository adapters isolate storage from the UI. No analytics or ad scripts are included; ad slots reserve layout space only.

See [reference analysis](docs/REFERENCE-ANALYSIS.md) and [validation](docs/VALIDATION.md) for observations and known differences.
