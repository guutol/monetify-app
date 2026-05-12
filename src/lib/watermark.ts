import sharp from "sharp";
import fs from "fs";
import path from "path";

// Cached at module level — read once per cold start
let _overlayBuffer: Buffer | null = null;

function loadOverlay(): Buffer {
  if (_overlayBuffer) return _overlayBuffer;
  const overlayPath = path.join(process.cwd(), "src/assets/watermark/watermark-overlay.png");
  _overlayBuffer = fs.readFileSync(overlayPath);
  return _overlayBuffer;
}

export async function applyWatermark(inputBuffer: Buffer): Promise<Buffer> {
  const meta = await sharp(inputBuffer).metadata();
  const w = meta.width;
  const h = meta.height;

  if (!w || !h) {
    throw new Error("[watermark] could not read image dimensions");
  }

  const overlayBuffer = loadOverlay();
  console.log(`[watermark] start w=${w} h=${h} inputBuffer.length=${inputBuffer.length} overlayBuffer.length=${overlayBuffer.length}`);

  const resizedOverlay = await sharp(overlayBuffer)
    .resize(w, h, { fit: "fill" })
    .png()
    .toBuffer();

  const outputBuffer = await sharp(inputBuffer)
    .composite([{ input: resizedOverlay, blend: "over" }])
    .png()
    .toBuffer();

  console.log(`[watermark] done outputBuffer.length=${outputBuffer.length}`);

  return outputBuffer;
}
