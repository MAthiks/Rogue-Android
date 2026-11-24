# GAME-008D — CRYPTGRAVE Android APK

## Architecture
Android app ID com.mathiks.cryptgrave; debug version 0.9.0 / code 1. Android 6+ (min 23), compile/target 35. Java 17, AGP 8.7.3, Gradle 8.9, WebKit 1.12.1. Local HTTPS WebViewAssetLoader, no Internet/storage permission, no JS native bridge, no arbitrary navigation or external file access. No PWA registration inside native APK. Original game engine remains byte-identical; CI verifies embedded payload.

## Build
Install SDK 35, build-tools 35.0.0, JDK 17 and Gradle 8.9.
```sh
gradle -p android :app:assembleDebug
```
Output: android/app/build/outputs/apk/debug/app-debug.apk.
CI Android APK runs compile, signature verification, checks no INTERNET permission, tests Android 13 via emulator, then uploads cryptgrave-android-test.
Debug-signed test build only, not Play Store/release. Debug keys may change across CI runs, so never uninstall an existing build with valuable saves to resolve a signature conflict. Stable production signing and upgrade path are a separate gate.

## Physical recipe
A01 Install the APK extracted from the artifact, on a test device; allow installation from the selected source only as needed.
A02 Launch in airplane mode, verify title, four classes and eight direction buttons.
A03 Create a disposable run, move, wait, use inventory/skill; check turn and autosave.
A04 Rotate both ways, check HUD and map, safe system-bar insets, and all buttons reachable.
A05 Background then foreground; force-stop and reopen; resume same position, turn, items and fog.
A06 Verify preferences and history. Confirm death deletes the active run only, and history survives.
A07 Verify app permissions and absence of Internet dependency.
A08 Do not uninstall or clear data to upgrade. Production key management, signed release and target API requirements to be checked before distribution.

Chrome/PWA and APK use separate storage origins and app sandboxes. Existing browser saves are not automatically migrated into APK. Keep browser data intact. APK installation and updates must preserve app ID, signing key and WebView origin. ROGOV unaffected.
