import sharp from "sharp";

export async function applyWatermark(input: Buffer): Promise<Buffer> {
  const meta = await sharp(input).metadata();
  const w = meta.width ?? 1024;
  const h = meta.height ?? 1024;

  const fontSize = Math.round(w * 0.055);
  const gap = Math.round(fontSize * 2.8);

  let rows = "";
  for (let y = -gap; y < h + gap * 2; y += gap) {
    rows += `<text x="-${Math.round(w * 0.6)}" y="${y}" fill="rgba(255,255,255,0.22)" font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" font-weight="bold" letter-spacing="3">MONETIFY PRÉVIA · MONETIFY PRÉVIA · MONETIFY PRÉVIA · MONETIFY PRÉVIA</text>`;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><g transform="rotate(-28 ${Math.round(w / 2)} ${Math.round(h / 2)})">${rows}</g></svg>`;

  return sharp(input)
    .composite([{ input: Buffer.from(svg), blend: "over" }])
    .png()
    .toBuffer();
}
