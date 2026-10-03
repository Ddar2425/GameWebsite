# Reference inspection and comparison

The reference was inspected in headless Chromium at https://oneclass.top/, using verified HTTPS requests through the environment's supplied proxy. Chromium's proxy certificate issue was handled by routing its requests through curl's configured CA trust; TLS verification was retained. Third-party advertising and analytics requests were blocked during inspection. No reference code or artwork is included in the application.

## Observed structure

- The page starts immediately with a green-backed game mosaic, without a traditional header or hero.
- A 120 × 120 branding tile occupies the first grid cell: white logo area above two green icon controls. The source uses account and search controls; Sproutplay uses menu and search because it requires no account.
- Ordinary images are 120px square. Gaps are 10px, with roughly 9px corner radii, subtle shadows, and hover title overlays. There is no permanent title or metadata block below each image.
- Featured tiles are 380px square on larger desktops, 250px square on tablet/mobile.
- A narrow promotional rail occupies one column on desktop and disappears on mobile.
- Search opens a yellow drawer about 480px wide, with a dark backdrop, pill-shaped input, horizontally scrolling category filters, device badges, and four-column image results. Queries update immediately. The visible search terms and original categories differ in Sproutplay.
- Category pages keep the same grid and add a category label near the top. Category tiles near the bottom are white with compact uppercase labels.
- Four game pages were inspected: Eagle Craft, Snow Rider 3d, Highway Traffic, and Gun Spin. Each creates an iframe. In this environment it remained `about:blank`, with no game source or gameplay. The iframe alone cannot establish WebGL/WASM, local hosting, or an external game's actual runtime.
- At 1366px a game page uses a 120px left rail, a 900px-wide black player, a white control strip, and a 250px right rail. A wide ad reservation sits below. Fullscreen, voting, and report controls were observed.
- The footer is dark navy with multiple navigation columns and muted small text.

## Measured grid comparison

| Viewport | Reference first featured tile | Sproutplay first featured tile |
| --- | --- | --- |
| 1920 | x185, y16, 380 × 380 | x185, y16, 380 × 380 |
| 1366 | x168, y16, 380 × 380 | x168, y16, 380 × 380 |
| 768 | x194, y16, 250 × 250 | x194, y16, 250 × 250 |
| 430 | x155, y16, 250 × 250 | x155, y16, 250 × 250 |
| 375 | x146, y16, 250 × 250 (extends beyond viewport) | x133.7, y16, 225.3 × 225.3 |

Reference and local screenshots were viewed at identical dimensions. The comparison pass corrected cached-image visibility, featured-tile layout, player aspect ratio (900/527), and 375px overflow. All eight requested widths are also checked in the browser suite.

## Deliberate differences and limits

Original branding, vector artwork, mini-games, and categories replace the reference's protected content. Our tiles retain the spatial layout but use a simpler illustration style. Favorites and recent history are required additions. A real menu replaces account controls. Player reload and save controls replace voting/reporting. The player has useful idle/loading/error states rather than the empty player observed here. Reference ads and analytics are not reproduced. Local multiplayer is supported; online multiplayer and commercial games are not bundled. Loading and input behavior of the reference's actual games could not be compared because those games did not initialize.

## Refinement pass

The measured homepage mosaic is retained. Smaller screens use a taller player so idle prompts, loading/error messages, and touch controls fit. Dedicated search pages retain a visible category filter and give the search heading sufficient space on mobile. Coming-soon cards use availability labels instead of inviting a failed launch. Drawer options expose keyboard selection correctly, and the modal isolates background content. These changes favor usable input and clear states while retaining the reference's browsing pattern.
