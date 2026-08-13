# GhostwriterMe Android TWA

This directory contains the Android Trusted Web Activity wrapper for the
GhostwriterMe PWA.

## Current release configuration

- Package: `com.ghostwriterme.app`
- Compile SDK: Android 16 / API 36
- Target SDK: Android 16 / API 36
- Minimum SDK: API 23
- Version code: `3`
- Version name: `1.0.2`
- Production host: `www.ghostwriterofficial.com`

The wrapper trusts the canonical `www` host. Before testing an updated build,
install the new version (or clear Chrome's site relationship cache) so Android
re-verifies `/.well-known/assetlinks.json` and opens the site as a full Trusted
Web Activity instead of a visible Custom Tab.

The release bundle must be signed with the existing GhostwriterMe upload key
whose alias is `ghostwriterme`. The keystore and all APK/AAB files are ignored
by Git and must never be committed.

## Future releases

1. Increment both `appVersionCode` and `appVersion` in `twa-manifest.json`.
2. Regenerate the project with a current Bubblewrap release if the web manifest
   or TWA configuration changes.
3. Build with JDK 17, Android SDK Platform 36, and Android Build Tools 36.1.0:

   ```powershell
   .\gradlew.bat bundleRelease assembleRelease
   ```

4. Sign the generated bundle with the existing upload key. Supply passwords
   through environment variables or a secure prompt; do not place them in
   Gradle files or source control.
5. Upload the signed AAB to an internal test track first, verify the core app
   flow on Android 16, then promote it to production.

`targetSdkVersion` is defined in `app/build.gradle`. Keep it at API 36 or later
for Google Play updates submitted from August 31, 2026 onward.
