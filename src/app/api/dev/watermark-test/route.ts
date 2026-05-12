import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { applyWatermark } from "@/lib/watermark";

/**
 * Dev-only: GET /api/dev/watermark-test
 * Returns a PNG with the watermark applied over a test canvas.
 * Use ?bg=dark or ?bg=light (default: light) to switch background.
 * Use ?imageId=xxx to watermark an existing image from S3.
 */
export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const bg = req.nextUrl.searchParams.get("bg") ?? "light";
  const size = 1024;

  // Generate a gradient test canvas so watermark is visible on both light and dark areas
  const rows: string[] = [];
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      const lightness = Math.round(((i * 8 + j) / 63) * 220);
      const fill = bg === "dark"
        ? `rgb(${lightness},${lightness},${lightness})`
        : `rgb(${255 - lightness},${255 - lightness},${255 - lightness})`;
      rows.push(
        `<rect x="${j * 128}" y="${i * 128}" width="128" height="128" fill="${fill}"/>`
      );
    }
  }

  const baseSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">${rows.join("")}</svg>`;
  const baseBuffer = await sharp(Buffer.from(baseSvg)).png().toBuffer();
  const result = await applyWatermark(baseBuffer);

  return new NextResponse(result as unknown as BodyInit, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "no-store",
    },
  });
}
