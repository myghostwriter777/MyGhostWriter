// Transformers.js intentionally uses Object(import.meta) for cross-runtime
// support. Create React App reports that supported library pattern as a
// warning, while Vercel's CI environment otherwise promotes it to an error.
const fs = require("fs");
const path = require("path");
const pptxBrowserBuild = path.join(__dirname, "..", "node_modules", "pptxgenjs", "dist", "pptxgen.bundle.js");
const pptxPublicAsset = path.join(__dirname, "..", "public", "pptxgen.bundle.js");
fs.copyFileSync(pptxBrowserBuild, pptxPublicAsset);
process.env.CI = "false";
require("react-scripts/scripts/build");
