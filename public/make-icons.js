// make-icons.js — generates PWA/Play Store icons from ghosty.svg
// Regular icons: ghost fills ~84% of the canvas.
// Maskable icon: ghost shrunk to ~62% so Android's circular mask never clips it.
const fs = require("fs");
const sharp = require("sharp");

const BG = "#0a0e14"; // GhostwriterMe dark background
const svgBody = fs.readFileSync("ghosty.svg", "utf8");

// Wrap the ghost SVG inside a square canvas with the dark background.
// `scale` = fraction of canvas the ghost artwork occupies (edge case: maskable
// icons need a smaller scale to survive Android's circle crop).
function framed(canvasPx, scale) {
  const inner = Math.round(canvasPx * scale);
  const offset = Math.round((canvasPx - inner) / 2);
  const innerSvg = svgBody.replace(
    "<svg ",
    `<svg x="${offset}" y="${offset}" width="${inner}" height="${inner}" `
  );
  return Buffer.from(
    `<svg width="${canvasPx}" height="${canvasPx}" xmlns="http://www.w3.org/2000/svg">` +
      `<rect width="${canvasPx}" height="${canvasPx}" fill="${BG}"/>` +
      innerSvg +
      `</svg>`
  );
}

async function main() {
  const jobs = [
    { file: "public/icons/icon-192.png",          px: 192, scale: 0.84 },
    { file: "public/icons/icon-512.png",          px: 512, scale: 0.84 },
    { file: "public/icons/icon-512-maskable.png", px: 512, scale: 0.62 },
    { file: "public/icons/apple-touch-icon.png",  px: 180, scale: 0.84 },
    // Play Store listing icon (uploaded in Play Console, not referenced by the manifest)
    { file: "public/icons/play-store-512.png",    px: 512, scale: 0.84 },
  ];
  for (const j of jobs) {
    await sharp(framed(j.px, j.scale)).png().toFile(j.file);
    console.log("wrote", j.file);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
