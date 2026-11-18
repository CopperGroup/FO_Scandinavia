import { NextRequest, NextResponse } from "next/server";
import * as Minio from "minio";
import { currentAdmin } from "@/lib/import/admin";

const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT || "minio",
  port: parseInt(process.env.MINIO_PORT || "9000"),
  useSSL: process.env.MINIO_USE_SSL === "true",
  // The sign-in comes only from the server's env file; no password is ever written in the code.
  accessKey: process.env.MINIO_ROOT_USER ?? "",
  secretKey: process.env.MINIO_ROOT_PASSWORD ?? "",
});

const MAX_BYTES = 15 * 1024 * 1024;
const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/gif": "gif",
};

/** Keeps letters, digits, dot, dash and underscore; never lets a path or an odd extension through. */
function safeFileName(original: string, extension: string): string {
  const base = original
    .replace(/\.[^.]*$/, "")
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, 80);
  return `${Date.now()}-${base || "image"}.${extension}`;
}

// Product images from the admin product forms. Admin only: it writes to the public bucket.
export async function POST(req: NextRequest) {
  try {
    if (!(await currentAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || typeof file === "string") return NextResponse.json({ error: "No file provided" }, { status: 400 });
    const extension = ALLOWED_TYPES[file.type];
    if (!extension) return NextResponse.json({ error: "Only JPEG, PNG, WebP, AVIF or GIF images are accepted" }, { status: 415 });
    if (file.size === 0 || file.size > MAX_BYTES) return NextResponse.json({ error: "The image must be smaller than 15 MB" }, { status: 413 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = safeFileName(file.name, extension);
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

    await minioClient.putObject(bucketName, fileName, buffer, buffer.length, {
      "Content-Type": file.type,
    });

    const baseUrl = process.env.MINIO_PUBLIC_URL || `https://assets.nordiva.com.ua`;
    const url = `${baseUrl}/${bucketName}/${fileName}`;

    return NextResponse.json({ url });
  } catch (error) {
    console.error("MinIO upload error:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
