# CRYPTGRAVE 1.0.0 RC1 — GAME-011D / 011E

Status: release candidate, not public. GAME-011C merged at 0e9a9a8e9972075762db3127ed4a8cc176204864. The frozen C baseline was b426bfa. Official C7 CI: QA-004 45383250331; Android 45383250166. 10,944 turns and 162 scene comparisons passed; equivalent saves and fog. Render mean -31.6% to -33.8%; 100-turn mean -35.7% to -38.7%. No physical latency or native memory stability claim.

## Versioning and safe packaging
- Canonical release.json: 1.0.0-rc1, Android versionCode 4, display 1.0.0 RC1. Normal Android ID remains com.mathiks.cryptgrave; RC debug build automatically uses com.mathiks.cryptgrave.v1preview with independent storage. Old preview flags remain supported.
- Stable 1.0.0 (proposed code 5) is a subsequent explicit change after physical approval, fresh CI and review. RC metadata blocks manual Pages publication. No deployment or release tag created here.
- CI creates signed debug test APK (not production signing), PWA candidate with checksums, tested checkout SHA, metadata and recipe. Stable Android signing key continuity is not established; no Play Store or official signed upgrade claim. Never uninstall the existing app to resolve a signature conflict.
- PWA scope, origin and manifest ID remain ./; native asset URL and storage keys remain unchanged. Export a backup first, import a copy into the isolated RC app. Never clear browser or app storage.
- Verify SHA256SUMS.txt in the extracted artifact, compare BUILD_SHA.txt to the tested workflow checkout. Test PWA on a separate origin with HTTP localhost or HTTPS. Do not deploy candidate to production Pages.

## Physical acceptance checklist (report each separately)
1. Install RC next to existing installation, verify 1.0.0 RC1 label and offline startup.
2. Export current 0.10.0 save and import a copy in RC; compare position, class, talents, inventory, explored map and Panthéon.
3. Use all eight pad directions and targeting; verify one turn per valid tap, blocked angles and no unintended movement.
4. Play at least 20 minutes, including multiple floors and combat; look for stalls, visible pixel/fog changes and heat or abnormal memory symptoms.
5. Change zoom/pad size/orientation, background/resume, close/reopen; verify save and controls.
6. Verify unreadable-save recovery on disposable data and permanent death plus Panthéon on a disposable run.
7. PWA: test offline reload and waiting update across two tabs on a test origin; verify old and new shells, save and no ROGOV changes.
8. Confirm victory/exit on floor 30 if reached; do not claim full organic campaign balance without a real campaign. Record device, Android version, Chrome/WebView version and issues.

Publish only after physical approval, stable version update, four fresh official checks, explicit authorization and final SHA match. Keep 0.10.0 backup. Production APK signing is a separate prerequisite for seamless upgrades.
