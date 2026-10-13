/** @jest-environment node */
const fs = require("node:fs");
const path = require("node:path");
const { normalizeFingerprint, verifyStatements, inspectLocalConfig, verifyOrigin } = require("../android/check-twa.cjs");

const root = path.resolve(__dirname, "..");
const config = inspectLocalConfig(root);
const fingerprint = config.fingerprints[0];
const playFingerprint = Array(32).fill("AB").join(":");
const statement = (fingerprints = [fingerprint], packageId = config.packageId) => [{
  relation: ["delegate_permission/common.handle_all_urls"],
  target: { namespace: "android_app", package_name: packageId, sha256_cert_fingerprints: fingerprints },
}];
const response = (status = 200, contentType = "application/json; charset=utf-8", statements = statement()) => ({
  status, headers: { get: () => contentType }, json: jest.fn(async () => statements),
});

test("Android launch, website trust and package stay aligned", () => {
  expect(config.origin).toBe("https://www.ghostwriterofficial.com");
  expect(config.packageId).toBe("com.ghostwriterme.app");
  expect(config.additionalOrigins).toEqual([]);
  expect(config.fingerprints.length).toBeGreaterThan(0);
});

test("the website trusts both the local upload certificate and supplied Play app-signing certificate", () => {
  const productionCertificate = "97:CB:FC:8E:9F:83:22:3B:EF:CA:C2:F7:0E:E0:8C:3F:AE:CA:E8:F1:AC:11:77:0C:4C:32:B3:7C:8C:C5:0D:2D";
  const localCertificate = "C2:4F:40:6B:DF:3F:BC:98:84:EF:10:5B:01:F4:C9:BC:1C:3E:B6:7B:24:1B:A9:DD:6C:B9:A2:9B:FB:9F:E9:BB";
  expect(config.fingerprints).toEqual(expect.arrayContaining([localCertificate, productionCertificate]));
  expect(verifyStatements(config.statements, config.packageId, [localCertificate, productionCertificate])).toEqual(expect.arrayContaining([localCertificate, productionCertificate]));
});

test("asset links bypass SPA fallback and retain JSON headers", () => {
  const vercel = JSON.parse(fs.readFileSync(path.join(root, "vercel.json"), "utf8"));
  const route = "/.well-known/assetlinks.json";
  for (const rewrite of vercel.rewrites.filter(item => item.destination === "/index.html")) {
    expect(new RegExp(`^${rewrite.source}$`).test(route)).toBe(false);
  }
  expect(vercel.headers.find(item => item.source === route).headers).toContainEqual({ key: "Content-Type", value: "application/json; charset=utf-8" });
});

test("fingerprints normalize whitespace and lowercase without accepting incomplete keys", () => {
  expect(normalizeFingerprint(` ${fingerprint.toLowerCase()} `)).toBe(fingerprint);
  expect(() => normalizeFingerprint("COPY_THE_PUBLIC_PLAY_SHA256_HERE")).toThrow("32 colon-separated");
  expect(() => normalizeFingerprint("AA:BB")).toThrow("32 colon-separated");
});

test("upload-only trust cannot pass when a different Play certificate is requested", () => {
  expect(() => verifyStatements(statement(), config.packageId, [playFingerprint])).toThrow("Missing signing certificate");
  expect(verifyStatements(statement([fingerprint, playFingerprint]), config.packageId, [fingerprint, playFingerprint])).toEqual([fingerprint, playFingerprint]);
});

test("a fingerprint on the wrong package or relationship does not establish trust", () => {
  expect(() => verifyStatements(statement([fingerprint], "com.example.other"), config.packageId, [fingerprint])).toThrow("Missing signing certificate");
  const wrongRelationship = statement();
  wrongRelationship[0].relation = ["delegate_permission/common.get_login_creds"];
  expect(() => verifyStatements(wrongRelationship, config.packageId, [fingerprint])).toThrow("Missing signing certificate");
});

test.each([301, 302, 307, 308, 404, 500])("live validation rejects HTTP %i rather than following redirects", async status => {
  const fetched = response(status);
  const fetcher = jest.fn(async () => fetched);
  await expect(verifyOrigin(config.origin, config.packageId, [fingerprint], fetcher)).rejects.toThrow(`HTTP ${status}`);
  expect(fetcher).toHaveBeenCalledWith(`${config.origin}/.well-known/assetlinks.json`, expect.objectContaining({ redirect: "manual", signal: expect.anything() }));
  expect(fetched.json).not.toHaveBeenCalled();
});

test("live validation rejects an HTML app shell with HTTP 200", async () => {
  await expect(verifyOrigin(config.origin, config.packageId, [fingerprint], async () => response(200, "text/html"))).rejects.toThrow("application/json");
});

test("live validation checks the published certificate, not just successful JSON delivery", async () => {
  await expect(verifyOrigin(config.origin, config.packageId, [playFingerprint], async () => response())).rejects.toThrow("Missing signing certificate");
  await expect(verifyOrigin(config.origin, config.packageId, [playFingerprint], async () => response(200, "application/json", statement([playFingerprint])))).resolves.toEqual([playFingerprint]);
});
