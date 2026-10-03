# Registering authorized game packages

Only register packages you own or have permission to host or embed. There is no arbitrary URL launcher or proxy.

## Local HTML5, canvas, WebGL, and WebAssembly

Place an authorized package here, retaining its relative asset paths:

```
public/games/block-world/index.html
public/games/block-world/assets/...
```

After installing and validating an authorized package, change its catalog `availability` from `coming-soon` to `available`. Coming-soon listings cannot launch or create play history. The existing Block World catalog entry targets `/games/block-world/index.html`. Other packages need a catalog entry with a unique ID and slug, a local thumbnail, a game URL, aspect ratio, controls, and author. `html5`, `iframe`, and `webgl` packages use the same isolated iframe player. The site does not implement or distribute Minecraft.

After the game is initialized and usable, send a readiness signal from the package's own script:

```js
window.parent.postMessage({ type: 'sprout:ready' }, location.origin);
// An external publisher must use the portal's exact origin as targetOrigin.
```

The player checks the local package before mounting the iframe, verifies both the sending window and registered origin, and waits for this signal before removing its loading overlay or recording history. Missing packages produce an error. A 20-second readiness timeout prevents a permanently blank player. Adjust the timeout for an authorized package with a measured longer startup time.

The iframe allows scripts, same-origin access for local package assets/storage, pointer lock, autoplay, fullscreen, gamepad, and XR. The full player container enters fullscreen, keeping controls available. Trusted same-origin packages are not a security boundary against their own malicious scripts; never host unreviewed executable packages as local games. No global site keyboard shortcuts run while a game is focused.

A WebAssembly package can use relative `.wasm` assets. Packages requiring SharedArrayBuffer also require carefully configured COOP/COEP headers and compatible resource responses; these headers are intentionally not imposed on packages that do not need them. Gamepad, audio, and pointer-lock implementation belongs to the authorized package and must obey browser user-gesture requirements.

## Approved external embeds

No external hosts are enabled by default. For a specifically authorized publisher:

1. Add its exact HTTPS origin to `allowedEmbedOrigins` in `src/lib/embed.mjs`.
2. Add that origin to `frame-src` in `next.config.ts` and the cloud environment's network allowlist if needed for development.
3. Register its fixed URL in the catalog. Set `launchType: 'iframe'` or `'external'`. Readiness defaults to the verified `sprout:ready` message; use `readiness: 'load'` only for a validated publisher that does not support a readiness handshake.
4. Verify the publisher permits embedding and does not block it with X-Frame-Options or CSP. The parent cannot reliably detect cross-origin runtime failures from iframe load alone. Add a publisher-specific ready/error message adapter for reliable readiness when supported.
5. Verify input, touch, audio, fullscreen, and runtime loading in the actual embedded game.

External URLs are validated against the exact allowlist. Protocol-relative, credentialed, unregistered, and arbitrary origins are rejected. This repository ships local games only; no third-party external embed was validated.
