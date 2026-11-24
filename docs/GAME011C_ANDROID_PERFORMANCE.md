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

## C1 observed baseline
CI run 45381406692, Chromium job 138401068270, artifact 14913228691. All 1,872 simulated turns and 72 real Chromium touch taps completed, zero uncaught page errors. Android run 45381406607 also succeeded. Mean timings in ms:
| Viewport | Render | Reveal | Update | Save | Pointer to next rAF | 100 turns |
|---|---:|---:|---:|---:|---:|---:|
| 393x851 | 6.187 | 0.023 | 6.360 | 0.040 | 16.438 | 478.967 |
| 320x640 | 6.377 | 0.037 | 6.567 | 0.045 | 16.371 | 478.950 |
| 851x393 | 5.322 | 0.023 | 5.630 | 0.037 | 16.321 | 393.167 |

Post-GC JS heap increase about 104 KiB per context; DOM nodes (680), event listeners (53) and documents (1) unchanged. No proof of native memory stability.

## C2/C3 implementation
- Single lazy 256x256 atlas (256 KiB nominal RGBA backing store), reset slot validity on biome switch; original procedural operations retained for environments without drawImage. Every tile begins with an opaque 16x16 base. No gameplay or save changes.
- Frame-local terrain, feature and intent indexes retain first-match semantics. Draw order and entity overdraw unchanged. Viewport traversal clipped to map.
- Reveal iterates only the radius-10 bounding box, up to 441 instead of 1536 candidate cells. Original LOS, corner checks, memory and reveal order unchanged.
- CI runs baseline and candidate sequentially on the same Chromium runner and compares canvas hashes, all-cell visibility hashes, final raw save hashes and turn counts. Additional 54 scenes per viewport cover all eight biomes, return to first biome, three positions including map edges, closed/open doors, duplicate features/terrain, fog and creature intents. 162 scene comparisons total. No timing threshold; compare observed gains, repeat if noisy. No publication or physical test claimed.

## C2/C3 measured results
Run 45382101207 (Chromium job 138403464198) and Android run 45382101063: all four controls succeeded on commit 126b1a3.
| Viewport | Render before/after ms | Update before/after ms | 100 turns before/after ms |
|---|---|---|---|
| 393x851 | 6.170 / 4.667 | 6.550 / 5.118 | 480.733 / 360.550 |
| 320x640 | 6.320 / 4.630 | 6.687 / 5.213 | 485.067 / 364.267 |
| 851x393 | 5.472 / 3.960 | 5.872 / 4.407 | 404.767 / 307.017 |
162/162 additional scene comparisons, original visibility and raw save hash equality passed. Pointer-to-rAF around 16.3 ms without material improvement; do not claim physical latency. Nominal atlas allocation is not included in JS heap measurements.

## C4/C5/C6 implementation
- Retain identical HUD HTML using element-keyed WeakMap; unchanged markup keeps the original nodes. Resize backing canvas only when dimensions differ; still render synchronously. No input event, repeat, targeting, turn or save timing changes. Browser test exercises all eight directions and stable icons.
- Preserve existing production PWA cache policy and native asset loader (no evidence requiring a change). New PWA test simulates changed shell and worker revision, checks waiting state, offline old shell, closing last client, activation, old-cache deletion and preservation of saves and sibling project storage. It does not deploy a real release.
- Long stress adds 1200 moves per viewport to the 624-turn reference, six post-GC heap/DOM checkpoints, three reload/orientation cycles, equality of final raw save hashes. 5472 turns per build, 10944 across both. Native Android emulator test adds three background/recreation cycles, origin and absence of active service worker checks; app-process PSS samples are logged (not total WebView renderer memory). No fixed heap threshold until a trend is measured.
- Physical Android recipe: export backup first, use separate preview application when packaged, check eight directions/targeting, zoom and orientation, background/resume, force close/reopen, offline reload and PWA upgrade across two tabs, sustained 20-minute play and any visible stalls. Never clear app data or release until approved.
- Latest candidate CI pending; do not extrapolate C2/C3 measurements to C4–C6 until retested.
