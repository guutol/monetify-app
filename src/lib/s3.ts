import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

export const s3 = new S3Client({
  region: process.env.AWS_REGION ?? "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function uploadImageToS3(
  base64: string,
  userId: string
): Promise<{ url: string; key: string }> {
  const buffer = Buffer.from(base64, "base64");
  const key = `images/${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.png`;
  const bucket = process.env.AWS_S3_BUCKET_NAME!;

  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: "image/png",
    })
  );

  const url = `https://${bucket}.s3.${process.env.AWS_REGION ?? "us-east-1"}.amazonaws.com/${key}`;
  return { url, key };
}
