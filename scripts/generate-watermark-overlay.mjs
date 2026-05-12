/**
 * Run once locally to generate the watermark overlay PNG:
 *   node scripts/generate-watermark-overlay.mjs
 *
 * Commits the output to src/assets/watermark/watermark-overlay.png.
 * In production, watermark.ts loads this PNG — no font/SVG rendering needed.
 */
import sharp from "sharp";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const W = 2048;
const H = 2048;
const fontSize = Math.round(W * 0.052); // ~106px
const gap = Math.round(fontSize * 3.0);
const cx = W / 2;
const cy = H / 2;
const label = "MONETIFY PREVIA     MONETIFY PREVIA     MONETIFY PREVIA     MONETIFY PREVIA";

let rows = "";
for (let y = -H; y < H * 2; y += gap) {
  const x = -W;
  // white offset (+2px) — contrast on dark backgrounds
  rows += `<text x="${x}" y="${y}" dx="2" dy="2" fill="white" fill-opacity="0.22" font-family="sans-serif" font-size="${fontSize}" font-weight="bold" letter-spacing="5">${label}</text>`;
  // dark fill — contrast on light backgrounds
  rows += `<text x="${x}" y="${y}" fill="black" fill-opacity="0.33" font-family="sans-serif" font-size="${fontSize}" font-weight="bold" letter-spacing="5">${label}</text>`;
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <g transform="rotate(-30 ${cx} ${cy})">${rows}</g>
</svg>`;

const outDir = path.join(__dirname, "../src/assets/watermark");
const outPath = path.join(outDir, "watermark-overlay.png");

const pngBuffer = await sharp(Buffer.from(svg, "utf8")).png().toBuffer();
fs.writeFileSync(outPath, pngBuffer);
console.log(`✓ ${outPath}  (${Math.round(pngBuffer.length / 1024)} KB, ${W}x${H})`);
