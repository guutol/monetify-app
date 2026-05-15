import { NextRequest, NextResponse } from "next/server";
import { uploadRawToS3, getPresignedUrl } from "@/lib/s3";

// Temp upload: no auth required — used to preserve the user's image across the
// login redirect. Keys live under temp-uploads/ and should be expired by an
// S3 lifecycle rule after 24 h. The generation APIs accept these keys directly.

const ACCEPTED: Record<string, string> = {
  "image/png":  "png",
  "image/jpeg": "jpg",
  "image/jpg":  "jpg",
  "image/webp": "webp",
};

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const PREVIEW_TTL = 3600; // 1 hour — enough for a single login flow

const isDev = process.env.NODE_ENV !== "production";

function useMock(): boolean {
  if (!isDev) return false;
  if (process.env.USE_MOCK_IMAGE === "true") return true;
  return !process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_S3_BUCKET_NAME;
}

export async function POST(req: NextRequest) {
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Formato de requisição inválido" }, { status: 400 });
  }

  const file = formData.get("file");

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Arquivo obrigatório" }, { status: 400 });
  }

  const ext = ACCEPTED[file.type];
  if (!ext) {
    return NextResponse.json(
      { error: "Formato não suportado. Use PNG, JPG, JPEG ou WEBP." },
      { status: 422 }
    );
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "Arquivo muito grande. O tamanho máximo é 10 MB." },
      { status: 422 }
    );
  }

  const tempId = crypto.randomUUID();
  const key = `temp-uploads/${tempId}/original.${ext}`;

  if (useMock()) {
    if (isDev) console.log("[upload/temp] mock mode — key:", `mock/${key}`);
    return NextResponse.json({ tempKey: `mock/${key}`, previewUrl: null });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    await uploadRawToS3(buffer, key, file.type);
  } catch (err) {
    if (isDev) console.error("[upload/temp] S3 error:", err);
    return NextResponse.json(
      { error: "Erro ao fazer upload. Tente novamente." },
      { status: 502 }
    );
  }

  const previewUrl = await getPresignedUrl(key, PREVIEW_TTL).catch(() => null);

  return NextResponse.json({ tempKey: key, previewUrl });
}
