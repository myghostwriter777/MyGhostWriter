# GhostwriterMe Android TWA

This directory contains the Android Trusted Web Activity wrapper for the
GhostwriterMe PWA.

## Current release configuration

- Package: `com.ghostwriterme.app`
- Compile SDK: Android 16 / API 36
- Target SDK: Android 16 / API 36
- Minimum SDK: API 23
- Version code: `4`
- Version name: `1.0.3`
- Production host: `www.ghostwriterofficial.com`

The wrapper trusts the canonical `www` host. Before testing an updated build,
install the new version (or clear Chrome's site relationship cache) so Android
re-verifies `/.well-known/assetlinks.json` and opens the site as a full Trusted
Web Activity instead of a visible Custom Tab.

The release bundle must be signed with the existing GhostwriterMe upload key
whose alias is `ghostwriterme`. The keystore and all APK/AAB files are ignored
by Git and must never be committed.

## Future releases

1. Increment `versionCode` and `versionName` in `app/build.gradle`, and keep
   `appVersionCode` and `appVersion` in `twa-manifest.json` in sync. The new
   code must be higher than every code in Play Console's App bundle explorer.
   Codes 1 and 2 were used by PWABuilder packages that target API 35, and a
   local API 36 build also used 2, so the first API 36 release uses code 4.
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
     -signedjar GhostwriterMe-v4-api36.aab `
     app\build\outputs\bundle\release\app-release.aab ghostwriterme
   ```

5. Upload the signed AAB to an internal test track first, verify the core app
   flow on Android 16, then promote it to production.

`targetSdkVersion` is defined in `app/build.gradle`. Keep it at API 36 or later
for Google Play updates submitted from August 31, 2026 onward.
