import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { uploadRawToS3 } from "@/lib/s3";

const ACCEPTED: Record<string, string> = {
  "image/png":  "png",
  "image/jpeg": "jpg",
  "image/jpg":  "jpg",
  "image/webp": "webp",
};

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

const isDev = process.env.NODE_ENV !== "production";

function useMock(): boolean {
  if (!isDev) return false;
  if (process.env.USE_MOCK_IMAGE === "true") return true;
  // Fall back to mock if S3 credentials are absent (avoids crashing local dev)
  return !process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_S3_BUCKET_NAME;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

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

  const uploadId = crypto.randomUUID();
  const key = `uploads/${session.user.id}/${uploadId}/original.${ext}`;

  if (useMock()) {
    const mockKey = `mock/${key}`;
    if (isDev) console.log("[upload] mock mode — key:", mockKey);
    return NextResponse.json({ uploadKey: mockKey });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    await uploadRawToS3(buffer, key, file.type);
  } catch (err) {
    if (isDev) console.error("[upload] S3 error:", err);
    return NextResponse.json(
      { error: "Erro ao fazer upload. Tente novamente." },
      { status: 502 }
    );
  }

  return NextResponse.json({ uploadKey: key });
}
