import { NextRequest, NextResponse } from "next/server";
import * as Minio from "minio";

const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT || "minio",
  port: parseInt(process.env.MINIO_PORT || "9000"),
  useSSL: process.env.MINIO_USE_SSL === "true",
  accessKey: process.env.MINIO_ROOT_USER || "nordiva_admin",
  secretKey: process.env.MINIO_ROOT_PASSWORD || "nordiva_password123",
});

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = `${Date.now()}-${file.name.replace(/\s/g, "-")}`;
    const bucketName = process.env.MINIO_BUCKET_NAME || "nordiva-assets";

    const exists = await minioClient.bucketExists(bucketName);
    if (!exists) {
      await minioClient.makeBucket(bucketName, "eu-west-1");
      const policy = {
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Principal: { AWS: ["*"] },
            Action: ["s3:GetObject"],
            Resource: [`arn:aws:s3:::${bucketName}/*`],
          },
        ],
      };
      await minioClient.setBucketPolicy(bucketName, JSON.stringify(policy));
    }

    // Connects to local MinIO to put the object
    await minioClient.putObject(bucketName, fileName, buffer, file.size, {
      "Content-Type": file.type,
    });

    // Uses the production endpoint variable to construct the final link
    const baseUrl = process.env.MINIO_PUBLIC_URL || `https://assets.nordiva.com.ua`;
    const url = `${baseUrl}/${bucketName}/${fileName}`;

    return NextResponse.json({ url });
  } catch (error) {
    console.error("MinIO upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}