import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { downloadFromS3 } from "@/lib/s3";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ imageId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse("Não autorizado", { status: 401 });
  }

  const { imageId } = await params;

  const image = await prisma.generatedImage.findUnique({
    where: { id: imageId },
    select: {
      userId: true,
      s3Key: true,
      imageUrl: true,
      orderPrev: { select: { id: true, isTrial: true, paymentStatus: true } },
    },
  });

  if (!image || image.userId !== session.user.id) {
    return new NextResponse("Imagem não encontrada", { status: 404 });
  }

  // Block download of unpaid trial previews
  if (image.orderPrev?.isTrial && image.orderPrev.paymentStatus !== "PAID") {
    return NextResponse.redirect(new URL(`/pay/${image.orderPrev.id}`, req.url), 302);
  }

  const disposition = 'attachment; filename="monetify-imagem-final.png"';

  // Real image: stream from S3
  if (image.s3Key) {
    const buffer = await downloadFromS3(image.s3Key);
    return new NextResponse(buffer.buffer as ArrayBuffer, {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": disposition,
      },
    });
  }

  // Mock/external image: proxy the URL
  if (image.imageUrl) {
    const upstream = await fetch(image.imageUrl);
    if (!upstream.ok) {
      return new NextResponse("Erro ao buscar imagem", { status: 502 });
    }
    const contentType = upstream.headers.get("content-type") ?? "image/jpeg";
    const body = await upstream.arrayBuffer();
    return new NextResponse(body, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": disposition,
      },
    });
  }

  return new NextResponse("Imagem não disponível", { status: 404 });
}
