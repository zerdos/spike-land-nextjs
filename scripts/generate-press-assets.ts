import fs from "fs";
import path from "path";
import sharp from "sharp";

const OUT_DIR = path.join(process.cwd(), "public/press/logos");

// Ensure directory exists
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

// Colors
const AMBER_400 = "#FBBF24";
const AMBER_500 = "#F59E0B";
const TEXT_LIGHT = "#171717";
const TEXT_DARK = "#FAFAFA";

// SVG Templates
const ZAP_PATH = "M13 2L3 14h9l-1 8 10-12h-9l1-8z";

const ICON_SVG = (size = 24) =>
  `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${AMBER_500}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="${ZAP_PATH}" fill="${AMBER_400}"/>
</svg>
`.trim();

const FULL_LOGO_SVG = (textColor: string) =>
  `
<svg xmlns="http://www.w3.org/2000/svg" width="200" height="50" viewBox="0 0 200 50">
  <style>
    .text { font-family: 'Montserrat', sans-serif; font-weight: bold; font-size: 24px; fill: ${textColor}; }
  </style>
  <g transform="translate(10, 13)">
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${AMBER_500}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="${ZAP_PATH}" fill="${AMBER_400}"/>
    </svg>
  </g>
  <text x="44" y="34" class="text">spike.land</text>
</svg>
`.trim();

const WORDMARK_SVG = (textColor: string) =>
  `
<svg xmlns="http://www.w3.org/2000/svg" width="150" height="50" viewBox="0 0 150 50">
  <style>
    .text { font-family: 'Montserrat', sans-serif; font-weight: bold; font-size: 24px; fill: ${textColor}; }
  </style>
  <text x="10" y="34" class="text">spike.land</text>
</svg>
`.trim();

const PIXEL_LOGO_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="100" height="50" viewBox="0 0 100 50">
  <defs>
    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#a855f7;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#ec4899;stop-opacity:1" />
    </linearGradient>
  </defs>
  <style>
    .text { font-family: 'Montserrat', sans-serif; font-weight: bold; font-size: 24px; fill: url(#grad1); }
  </style>
  <text x="10" y="34" class="text">Pixel</text>
</svg>
`.trim();

async function generate() {
  console.log("Generating SVGs...");

  // Write SVGs
  fs.writeFileSync(path.join(OUT_DIR, "spike-land-icon.svg"), ICON_SVG(24));
  fs.writeFileSync(path.join(OUT_DIR, "spike-land-full.svg"), FULL_LOGO_SVG(TEXT_LIGHT));
  fs.writeFileSync(path.join(OUT_DIR, "spike-land-dark.svg"), FULL_LOGO_SVG(TEXT_DARK));
  fs.writeFileSync(path.join(OUT_DIR, "spike-land-wordmark.svg"), WORDMARK_SVG(TEXT_LIGHT));
  fs.writeFileSync(path.join(OUT_DIR, "pixel-logo.svg"), PIXEL_LOGO_SVG);

  console.log("Generating PNGs...");

  // Generate PNGs from Icon SVG (high res source for scaling)
  const ICON_SOURCE = Buffer.from(ICON_SVG(1024)); // Render large for better quality downscaling

  const sizes = [16, 32, 64, 128, 256, 512];

  for (const size of sizes) {
    await sharp(ICON_SOURCE)
      .resize(size, size)
      .png()
      .toFile(path.join(OUT_DIR, `spike-land-icon-${size}.png`));
    console.log(`Generated spike-land-icon-${size}.png`);
  }

  // Also convert the other logos to PNG for convenience
  await sharp(Buffer.from(FULL_LOGO_SVG(TEXT_LIGHT)))
    .png()
    .toFile(path.join(OUT_DIR, "spike-land-full.png"));

  await sharp(Buffer.from(FULL_LOGO_SVG(TEXT_DARK)))
    .png()
    .toFile(path.join(OUT_DIR, "spike-land-dark.png"));

  await sharp(Buffer.from(WORDMARK_SVG(TEXT_LIGHT)))
    .png()
    .toFile(path.join(OUT_DIR, "spike-land-wordmark.png"));

  await sharp(Buffer.from(PIXEL_LOGO_SVG))
    .png()
    .toFile(path.join(OUT_DIR, "pixel-logo.png"));

  console.log("Done!");
}

generate().catch(console.error);
