import sharp from "sharp";
import fs from "fs";
import path from "path";

// Cached at module level — read once per cold start
let _fontBase64: string | null | false = null;

function loadFontBase64(): string | false {
  if (_fontBase64 !== null) return _fontBase64;
  try {
    const fontPath = path.join(process.cwd(), "src/assets/fonts/GeistSans-Regular.ttf");
    _fontBase64 = fs.readFileSync(fontPath).toString("base64");
    return _fontBase64;
  } catch {
    _fontBase64 = false;
    return false;
  }
}

export async function applyWatermark(inputBuffer: Buffer): Promise<Buffer> {
  const meta = await sharp(inputBuffer).metadata();
  const w = meta.width;
  const h = meta.height;

  if (!w || !h) {
    console.error("[watermark] metadata missing dimensions — returning original");
    return inputBuffer;
  }

  const fontBase64 = loadFontBase64();
  console.log(`[watermark] start w=${w} h=${h} inputBuffer.length=${inputBuffer.length} fontLoaded=${Boolean(fontBase64)}`);

  const fontSize = Math.round(w * 0.055);
  const gap = Math.round(fontSize * 3);
  const cx = Math.round(w / 2);
  const cy = Math.round(h / 2);
  const fontFamily = fontBase64 ? "WatermarkFont" : "sans-serif";

  // @font-face block — only added when font is available
  const fontFaceStyle = fontBase64
    ? `<defs><style>@font-face{font-family:'WatermarkFont';src:url('data:font/truetype;base64,${fontBase64}') format('truetype');}</style></defs>`
    : "";

  const label = "MONETIFY PREVIA   MONETIFY PREVIA   MONETIFY PREVIA   MONETIFY PREVIA";

  let rows = "";
  for (let y = -h; y < h * 2; y += gap) {
    const x = -w;
    // white offset — visibility on dark backgrounds
    rows += `<text x="${x}" y="${y}" dx="2" dy="2" fill="white" fill-opacity="0.20" font-family="${fontFamily}" font-size="${fontSize}" font-weight="bold" letter-spacing="4">${label}</text>`;
    // dark fill — visibility on light backgrounds
    rows += `<text x="${x}" y="${y}" fill="black" fill-opacity="0.32" font-family="${fontFamily}" font-size="${fontSize}" font-weight="bold" letter-spacing="4">${label}</text>`;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${fontFaceStyle}<g transform="rotate(-30 ${cx} ${cy})">${rows}</g></svg>`;

  const outputBuffer = await sharp(inputBuffer)
    .composite([{ input: Buffer.from(svg, "utf8"), blend: "over" }])
    .png()
    .toBuffer();

  console.log(`[watermark] done inputBuffer.length=${inputBuffer.length} outputBuffer.length=${outputBuffer.length}`);

  return outputBuffer;
}
