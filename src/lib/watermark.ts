import sharp from "sharp";

export async function applyWatermark(inputBuffer: Buffer): Promise<Buffer> {
  const meta = await sharp(inputBuffer).metadata();
  const w = meta.width;
  const h = meta.height;

  if (!w || !h) {
    console.error("[watermark] metadata missing dimensions — returning original");
    return inputBuffer;
  }

  console.log(`[watermark] start w=${w} h=${h} inputBuffer.length=${inputBuffer.length}`);

  const fontSize = Math.round(w * 0.08);
  const gap = Math.round(fontSize * 2.5);
  const cx = Math.round(w / 2);
  const cy = Math.round(h / 2);
  const startY = -h;
  const endY = h * 2;

  // Repeated diagonal rows — ASCII only, sans-serif (always available on any server)
  let diagonalRows = "";
  for (let y = startY; y < endY; y += gap) {
    const x = -w;
    const label = "MONETIFY PREVIA  MONETIFY PREVIA  MONETIFY PREVIA";
    // white offset layer (visible on dark backgrounds)
    diagonalRows += `<text x="${x}" y="${y}" dx="2" dy="2" fill="white" fill-opacity="0.45" font-family="sans-serif" font-size="${fontSize}" font-weight="bold">${label}</text>`;
    // black fill layer (visible on light backgrounds)
    diagonalRows += `<text x="${x}" y="${y}" fill="black" fill-opacity="0.65" font-family="sans-serif" font-size="${fontSize}" font-weight="bold">${label}</text>`;
  }

  // Giant center banner for absolute confirmation during debugging
  const bigSize = Math.round(w * 0.1);
  const banner = "WATERMARK TESTE";
  const bannerShadow = `<text x="${cx}" y="${cy}" dx="3" dy="3" text-anchor="middle" dominant-baseline="middle" fill="white" fill-opacity="0.5" font-family="sans-serif" font-size="${bigSize}" font-weight="bold">${banner}</text>`;
  const bannerText  = `<text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="middle" fill="black" fill-opacity="0.75" font-family="sans-serif" font-size="${bigSize}" font-weight="bold">${banner}</text>`;

  // Thin colored top/bottom strips — even if text fails to render, this proves composite works
  const stripH = Math.round(h * 0.04);
  const strips = `
    <rect x="0" y="0"        width="${w}" height="${stripH}" fill="rgba(220,50,50,0.55)"/>
    <rect x="0" y="${h - stripH}" width="${w}" height="${stripH}" fill="rgba(220,50,50,0.55)"/>
  `;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    ${strips}
    <g transform="rotate(-30 ${cx} ${cy})">${diagonalRows}</g>
    ${bannerShadow}
    ${bannerText}
  </svg>`;

  const svgBuffer = Buffer.from(svg, "utf8");

  const outputBuffer = await sharp(inputBuffer)
    .composite([{ input: svgBuffer, blend: "over" }])
    .png()
    .toBuffer();

  console.log(`[watermark] done inputBuffer.length=${inputBuffer.length} outputBuffer.length=${outputBuffer.length}`);

  return outputBuffer;
}
