# GAME-011C — Android performance and stability

Baseline: main b426bfaed899b6203400283ccd56060baf672dfb (GAME-011A/B merged).
Public release stays 0.10.0. No production changes in C1.

## Reproduce C1
`npm install --no-save --no-package-lock playwright@1.56.1`
`npx playwright install chromium`
`node tests/game011c-perf.cjs`

The script injects a test-only hook into a temporary HTTP response, never into the packaged game. It uses a seeded RNG, fixed synthetic dense and open-room fixtures, Chromium mobile emulation at 393x851, 320x640 and 851x393, eight warmup calls and 60 timed calls per render/reveal/update/save. It reports mean, median, p95 and max (ms), canvas dimensions and pixel hash, revealed-cell hash, 24 real Playwright touch taps and next-rAF latency, 600 additional alternating movement turns, post-GC JS heap and DOM counters, save size and uncaught page errors. The rAF metric is a proxy, not actual display latency. Timings include synchronous JavaScript/canvas command submission, not GPU completion; no battery or native heap claims. Synthetic stress is not combat balance. No real device save is accessed.

CI uploads perf-results/ as an artifact. Baseline numbers are pending execution; do not infer gains from static code inspection. No absolute timing threshold until measurements exist. For C7 run identical harness on original HTML (`git show b426bfa:index.html > /tmp/cryptgrave-baseline.html`) and candidate on the same runner, with separate output JSON names. Repeat noisy measurements. Require equality of relevant pixel and visibility hashes and turn/save invariants, with existing four CI jobs green.

## Static audit and planned gates
- C2: render repeatedly scans terrain/features and monster intent per visible tile; evaluate frame-local indexes preserving first-match and layering semantics; avoid unnecessary canvas backing-store resets only if measured.
- C3: reveal loops over all 48x32 cells while LOS radius is 10; evaluate bounded loops and render-local reuse, no change to rounding, diagonal corners, explored memory or hidden entities. Compare all cells across wall/door fixtures.
- C4: pointerdown invokes synchronous move/finish/reveal/update/save; preserve eight directions, one valid press per turn, targeting, blocked moves and no forced autorepeat. Evaluate HUD DOM churn if measurement warrants.
- C5: PWA cache is scoped and waits for old windows to close; WebView serves bundled assets via its fixed HTTPS origin. Test upgrade/offline and native cache without clearing storage or forcing reload; change only if evidence warrants.
- C6: repeat long sessions, transitions, reloads, zoom/orientation changes and native lifecycle; compare post-GC memory trend. Browser heap is not Android process RSS.
- C7: compare same-runner measurements, preserve historical saves/permadeath and pixel art, four official CI controls, then physical Android recipe. No Pages publish or version bump here.

Never modify ROGOV or its storage/cache. Production storage keys and gameplay remain unchanged.
