import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getPresignedUrl } from "@/lib/s3";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ imageId: string }> }
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { imageId } = await params;

  const image = await prisma.generatedImage.findUnique({
    where: { id: imageId },
    select: {
      userId: true,
      s3Key: true,
      orderPrev: { select: { id: true, isTrial: true, paymentStatus: true } },
    },
  });

  if (!image || image.userId !== session.user.id) {
    return NextResponse.json({ error: "Imagem não encontrada" }, { status: 404 });
  }

  // Block clean URL for unpaid trial previews
  if (image.orderPrev?.isTrial && image.orderPrev.paymentStatus !== "PAID") {
    console.warn(
      `[images/url] blocked trial clean-url access imageId=${imageId} userId=${session.user.id} orderId=${image.orderPrev.id}`
    );
    return NextResponse.json(
      { error: "Imagem bloqueada. Conclua o pagamento para acessar." },
      { status: 403 }
    );
  }

  if (!image.s3Key) {
    return NextResponse.json({ error: "Imagem sem arquivo" }, { status: 404 });
  }

  const url = await getPresignedUrl(image.s3Key);

  return NextResponse.json({ url });
}
