import sharp from "sharp";

export async function applyWatermark(input: Buffer): Promise<Buffer> {
  const meta = await sharp(input).metadata();
  const w = meta.width ?? 1024;
  const h = meta.height ?? 1024;

  const fontSize = Math.round(w * 0.065);
  const gap = Math.round(fontSize * 3.2);
  const cx = Math.round(w / 2);
  const cy = Math.round(h / 2);
  // extend well beyond image edges so rotated text fills corners
  const startY = -h;
  const endY = h * 2;

  let shadowRows = "";
  let textRows = "";
  for (let y = startY; y < endY; y += gap) {
    const x = -Math.round(w * 0.8);
    const repeat = "MONETIFY PRÉVIA   ";
    // white shadow/outline layer — visible on dark backgrounds
    shadowRows += `<text x="${x}" y="${y}" fill="rgba(255,255,255,0.35)" font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" font-weight="bold" letter-spacing="4" dx="1" dy="1">${repeat.repeat(5)}</text>`;
    // dark fill layer — visible on light backgrounds
    textRows += `<text x="${x}" y="${y}" fill="rgba(20,20,20,0.38)" font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" font-weight="bold" letter-spacing="4">${repeat.repeat(5)}</text>`;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><g transform="rotate(-30 ${cx} ${cy})">${shadowRows}${textRows}</g></svg>`;

  return sharp(input)
    .composite([{ input: Buffer.from(svg), blend: "over" }])
    .png()
    .toBuffer();
}
