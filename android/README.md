# GhostwriterMe Android TWA

This directory contains the Android Trusted Web Activity wrapper for the
GhostwriterMe PWA.

## Current release configuration

- Package: `com.ghostwriterme.app`
- Compile SDK: Android 16 / API 36
- Target SDK: Android 16 / API 36
- Minimum SDK: API 24 (required by Play automatic protection)
- Version code: `5`
- Version name: `1.0.4`
- Production host: `www.ghostwriterofficial.com`

The wrapper launches and trusts the canonical `www` host. Android only hides
the browser toolbar after Digital Asset Links verifies that the website trusts
the certificate on the installed app. See the verification steps below before
testing an updated build.

The release bundle must be signed with the existing GhostwriterMe upload key
whose alias is `ghostwriterme`. The keystore and all APK/AAB files are ignored
by Git and must never be committed.

## Removing the Android browser toolbar

The close button, URL, share and overflow controls belong to Chrome's Custom
Tab fallback. They are not website elements. A verified Trusted Web Activity
already opens without this toolbar; CSS, `display: standalone`, and fullscreen
settings cannot repair a failed trust relationship.

Checks on October 13, 2026 found:

- `https://www.ghostwriterofficial.com/.well-known/assetlinks.json` returns
  HTTP 200 and `application/json` without a redirect.
- The apex domain redirects both the homepage and the asset-links path to
  `www` with HTTP 308. Keep the Android launch and trust origin on `www`.
  Adding the apex as another trusted origin would also require serving its
  own asset-links file directly without a redirect.
- Before this repair, the published file contained only
  `C2:4F:40:6B:DF:3F:BC:98:84:EF:10:5B:01:F4:C9:BC:1C:3E:B6:7B:24:1B:A9:DD:6C:B9:A2:9B:FB:9F:E9:BB`.
  It matches the certificate on the local v5 signed AAB, not the app-signing
  certificate subsequently supplied from Play Console.

The supplied Play app-signing SHA-256 fingerprint is
`97:CB:FC:8E:9F:83:22:3B:EF:CA:C2:F7:0E:E0:8C:3F:AE:CA:E8:F1:AC:11:77:0C:4C:32:B3:7C:8C:C5:0D:2D`.
It is now included in both `public/.well-known/assetlinks.json` and
`twa-manifest.json`, alongside the existing local certificate. This correction
still needs website deployment and verification on a Play-installed app.

To finish verification for the Play-installed app:

1. Open this app in Play Console, then **Protected with Play → Play Store
   distribution → Go to Play app signing**. Scroll to the **App signing key**
   section and copy its **SHA-256 certificate fingerprint**. This is separate
   from Play Integrity API verdicts and the Upload key certificate. The public
   certificate fingerprint is sufficient; no password, private key or keystore
   is needed. See [Google's current Play App Signing instructions](https://support.google.com/googleplay/android-developer/answer/9842756?hl=en).
2. Compare that value with `public/.well-known/assetlinks.json`. If it differs,
   append the verified Play fingerprint to `sha256_cert_fingerprints`, keeping
   the existing local certificate for sideloaded builds. If Play shows upgraded
   and legacy app-signing certificates used for different Android versions,
   include each relevant verified certificate. Also add the same values as
   named `fingerprints` entries in `twa-manifest.json` so regeneration preserves
   them. Do not generate a replacement signing key.
3. Deploy the website with that file. A certificate-only website correction
   does not require changing the Android package or increasing its version.
   From the repository root, run:

   ```powershell
   node android/check-twa.cjs --live --play-sha256 '97:CB:FC:8E:9F:83:22:3B:EF:CA:C2:F7:0E:E0:8C:3F:AE:CA:E8:F1:AC:11:77:0C:4C:32:B3:7C:8C:C5:0D:2D'
   ```

   The command is read-only. It checks package and origin consistency, rejects
   redirects and HTML fallback responses, and checks the exact certificate.
   `node android/check-twa.cjs` runs only local checks. Without `--play-sha256`,
   a passing result does **not** establish trust for the Play-installed app.
4. Test an install delivered by Google Play on an Android device, using a
   current browser with TWA support. Close and relaunch the app after the
   browser refreshes its cached asset-link verification. If the toolbar
   remains, inspect `adb logcat` for `OriginVerifier` and `TWAProviderPicker`
   and compare the actual installed package/signing certificate. A local
   sideload alone cannot verify the Play certificate. Navigation to external
   websites (for example a sign-in provider) can legitimately show browser UI.

Only the public fingerprint supplied from Play Console was added. The existing
canonical host, signing keys and Android release version are unchanged.

References: [Google TWA verification and fallback](https://developer.chrome.com/docs/android/trusted-web-activity/quick-start),
[website certificates and Play App Signing](https://developer.android.com/training/app-links/configure-assetlinks),
[multiple origins](https://developer.chrome.com/docs/android/trusted-web-activity/multi-origin).

## Google Play download link

The public [GhostwriterMe listing](https://play.google.com/store/apps/details?id=com.ghostwriterme.app)
was verified with an Install action on October 13, 2026. `src/GooglePlayButton.jsx`
links directly to that listing using Google's supported HTTPS URL format. It
accepts `compact`, `href`, `className`, `style`, and `onClick` props and does not
require a Play Store app or trigger an install automatically.

## Future releases

1. Increment `versionCode` and `versionName` in `app/build.gradle`, and keep
   `appVersionCode` and `appVersion` in `twa-manifest.json` in sync. The new
   code must be higher than every code in Play Console's App bundle explorer.
   Codes 1 and 2 were used by PWABuilder packages that target API 35, and a
   local API 36 build also used 2. Code 4 targeted minimum SDK 23, which Play
   automatic protection rejects, so the minimum SDK 24 release uses code 5.
2. Regenerate the project with a current Bubblewrap release if the web manifest
   or TWA configuration changes.
3. Build with JDK 17, Android SDK Platform 36, and Android Build Tools 35.0.0
   (the default for Android Gradle Plugin 8.9.1). Android Studio's bundled
   Java 25 is too new for Gradle 8.11.1.

   ```powershell
   .\gradlew.bat bundleRelease assembleRelease
   ```

4. Sign the generated bundle with the existing upload key. Supply passwords
   through environment variables or a secure prompt; do not place them in
   Gradle files or source control. With `KS_PASS` and `KEY_PASS` set:

   ```powershell
   jarsigner -sigalg SHA256withRSA -digestalg SHA-256 -keystore signing.keystore `
     -storepass:env KS_PASS -keypass:env KEY_PASS `
     -signedjar GhostwriterMe-v5-api36.aab `
     app\build\outputs\bundle\release\app-release.aab ghostwriterme
   ```

5. Upload the signed AAB to an internal test track first, verify the core app
   flow on Android 16, then promote it to production.

`targetSdkVersion` is defined in `app/build.gradle`. Keep it at API 36 or later
for Google Play updates submitted from August 31, 2026 onward.
