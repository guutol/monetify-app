import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { generateProductImage } from "@/services/image.service";

export async function POST(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { prompt } = await req.json();

  if (!prompt || typeof prompt !== "string" || prompt.trim().length < 5) {
    return NextResponse.json({ error: "Prompt inválido" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { credits: true },
  });

  if (!user || user.credits <= 0) {
    return NextResponse.json({ error: "Créditos insuficientes" }, { status: 402 });
  }

  const { base64, imageId } = await generateProductImage(prompt.trim(), session.user.id);

  return NextResponse.json({ base64, imageId });
}
