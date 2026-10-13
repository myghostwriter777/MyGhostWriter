#!/usr/bin/env node
/* Read-only checks. A local upload certificate does not prove Play-installed trust. */
const fs = require("node:fs");
const path = require("node:path");

const RELATION = "delegate_permission/common.handle_all_urls";
const FINGERPRINT_PATTERN = /^(?:[A-F0-9]{2}:){31}[A-F0-9]{2}$/;

function normalizeFingerprint(value) {
  const fingerprint = String(value || "").trim().toUpperCase();
  if (!FINGERPRINT_PATTERN.test(fingerprint)) {
    throw new Error("Expected a public SHA-256 certificate fingerprint: 32 colon-separated hex bytes.");
  }
  return fingerprint;
}

function verifyStatements(statements, packageId, fingerprints) {
  if (!Array.isArray(statements)) throw new Error("assetlinks.json must contain a JSON array.");
  const matching = statements.filter(statement =>
    Array.isArray(statement?.relation) && statement.relation.includes(RELATION) &&
    statement.target?.namespace === "android_app" && statement.target.package_name === packageId);
  const published = matching.flatMap(statement => Array.isArray(statement.target.sha256_cert_fingerprints)
    ? statement.target.sha256_cert_fingerprints.map(normalizeFingerprint) : []);
  for (const fingerprint of fingerprints.map(normalizeFingerprint)) {
    if (!published.includes(fingerprint)) {
      throw new Error(`Missing signing certificate for ${packageId}: ${fingerprint}. Add the verified certificate to public/.well-known/assetlinks.json and deploy the website.`);
    }
  }
  if (!published.length) throw new Error(`No valid Android trust statement found for ${packageId}.`);
  return published;
}

function inspectLocalConfig(root) {
  const read = name => fs.readFileSync(path.join(root, name), "utf8");
  const manifest = JSON.parse(read("android/twa-manifest.json"));
  const origin = new URL(`https://${manifest.host}`).origin;
  const launch = new URL(manifest.startUrl, origin);
  if (launch.origin !== origin || new URL(manifest.webManifestUrl).origin !== origin || new URL(manifest.fullScopeUrl).origin !== origin) {
    throw new Error("TWA launch, scope and web manifest must use the same canonical HTTPS origin.");
  }
  const gradle = read("android/app/build.gradle");
  if (!gradle.includes(`hostName: '${manifest.host}'`) || !gradle.includes(`launchUrl: '${manifest.startUrl}'`) || !gradle.includes(`applicationId \"${manifest.packageId}\"`)) {
    throw new Error("Android Gradle launch host, URL or package differs from twa-manifest.json. Regenerate or synchronize the Android wrapper.");
  }
  const strings = read("android/app/src/main/res/values/strings.xml");
  if (!strings.includes(origin)) throw new Error("Android assetStatements do not declare the canonical website origin.");
  const fingerprints = manifest.fingerprints.map(item => normalizeFingerprint(item.value));
  const statements = JSON.parse(read("public/.well-known/assetlinks.json"));
  verifyStatements(statements, manifest.packageId, fingerprints);
  return { origin, packageId: manifest.packageId, fingerprints, statements, additionalOrigins: manifest.additionalTrustedOrigins || [] };
}

async function verifyOrigin(origin, packageId, fingerprints, fetchImpl = fetch) {
  const parsed = new URL(origin);
  if (parsed.protocol !== "https:" || parsed.origin !== origin) throw new Error("Trusted origins must be HTTPS origins without a path or trailing slash.");
  const url = `${origin}/.well-known/assetlinks.json`;
  const response = await fetchImpl(url, { redirect: "manual", signal: AbortSignal.timeout(15000) });
  if (response.status !== 200) throw new Error(`${url} returned HTTP ${response.status}. Digital Asset Links must be served directly with HTTP 200; redirects do not verify that origin.`);
  if (!/^application\/json(?:\s*;|$)/i.test(response.headers.get("content-type") || "")) {
    throw new Error(`${url} must return application/json, not an HTML application shell.`);
  }
  // Parse within the request's timeout, including the body download.
  return verifyStatements(await response.json(), packageId, fingerprints);
}

async function main(args = process.argv.slice(2)) {
  const root = path.resolve(__dirname, "..");
  const config = inspectLocalConfig(root);
  console.log(`Local TWA configuration is consistent: ${config.packageId} → ${config.origin}`);
  const certificateIndex = args.indexOf("--play-sha256");
  const playFingerprint = certificateIndex >= 0 ? normalizeFingerprint(args[certificateIndex + 1]) : null;
  const required = playFingerprint ? [...config.fingerprints, playFingerprint] : config.fingerprints;
  verifyStatements(config.statements, config.packageId, required);
  if (args.includes("--live")) {
    for (const origin of [config.origin, ...config.additionalOrigins]) {
      await verifyOrigin(origin, config.packageId, required);
      console.log(`Public Digital Asset Links passed: ${origin}`);
    }
  }
  if (playFingerprint) {
    console.log(args.includes("--live") ? "The supplied Play app-signing certificate is published on every configured origin. Verify the installed Play build on a device next." : "The supplied Play app-signing certificate is in the local asset links. Run with --live after deployment.");
  } else {
    console.warn("Play-installed trust is NOT verified. Supply --play-sha256 with the App signing key certificate from Play Console, not the upload key.");
  }
}

module.exports = { normalizeFingerprint, verifyStatements, inspectLocalConfig, verifyOrigin, main };
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
