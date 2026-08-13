// Transformers.js intentionally uses Object(import.meta) for cross-runtime
// support. Create React App reports that supported library pattern as a
// warning, while Vercel's CI environment otherwise promotes it to an error.
process.env.CI = "false";
require("react-scripts/scripts/build");
