import "server-only";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import sharp from "sharp";
import { requiredEnv } from "@/lib/env";
import { safeFilename } from "@/lib/file-validation";
export type Asset = {
  id: string;
  owner_id: string;
  area: "partners" | "content" | "shop";
  kind: "image" | "digital";
  original_name: string;
  mime_type: string;
  size_bytes: number;
  staging_key: string;
  object_key: string;
  status: string;
  public_url: string | null;
  created_at: string;
};
const formats: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
  "application/zip": "zip",
};
function client() {
  return new S3Client({
    region: "auto",
    endpoint: `https://${requiredEnv("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: requiredEnv("R2_ACCESS_KEY_ID"),
      secretAccessKey: requiredEnv("R2_SECRET_ACCESS_KEY"),
    },
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
}
export function assetExtension(kind: string, mime: string, size: number) {
  const ext = formats[mime];
  if (
    !ext ||
    (kind === "image"
      ? !mime.startsWith("image/")
      : !["pdf", "zip"].includes(ext)) ||
    !Number.isInteger(size) ||
    size < 1 ||
    size > (kind === "image" ? 5 : 50) * 1024 * 1024
  )
    throw new Error(
      kind === "image"
        ? "Choose a JPEG, PNG or WebP image up to 5 MB."
        : "Choose a PDF or ZIP file up to 50 MB.",
    );
  return ext;
}
export async function assetUploadUrl(asset: Asset) {
  return getSignedUrl(
    client(),
    new PutObjectCommand({
      Bucket: requiredEnv("R2_PRIVATE_BUCKET"),
      Key: asset.staging_key,
      ContentType: asset.mime_type,
      ContentLength: Number(asset.size_bytes),
    }),
    { expiresIn: 120 },
  );
}
export async function completeAsset(asset: Asset) {
  const s3 = client(),
    bucket = requiredEnv("R2_PRIVATE_BUCKET");
  assetExtension(asset.kind, asset.mime_type, Number(asset.size_bytes));
  const head = await s3.send(
    new HeadObjectCommand({ Bucket: bucket, Key: asset.staging_key }),
  );
  if (
    head.ContentLength !== Number(asset.size_bytes) ||
    head.ContentType !== asset.mime_type
  )
    throw new Error(
      "Upload size or type did not match. Upload the file again.",
    );
  const result = await s3.send(
    new GetObjectCommand({ Bucket: bucket, Key: asset.staging_key }),
  );
  if (!result.Body) throw new Error("The uploaded file is empty.");
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of result.Body as AsyncIterable<Uint8Array>) {
    size += chunk.length;
    if (size > Number(asset.size_bytes))
      throw new Error("Upload size did not match.");
    chunks.push(Buffer.from(chunk));
  }
  if (size !== Number(asset.size_bytes))
    throw new Error("Upload size did not match.");
  let bytes: Uint8Array = Buffer.concat(chunks),
    mime = asset.mime_type,
    publicUrl: string | null = null;
  if (asset.kind === "image") {
    const metadata = await sharp(bytes, {
      limitInputPixels: 25000000,
      animated: false,
    }).metadata();
    if (
      !["jpeg", "png", "webp"].includes(metadata.format || "") ||
      (metadata.pages || 1) > 1
    )
      throw new Error("Choose a static JPEG, PNG or WebP image.");
    bytes = await sharp(bytes, { limitInputPixels: 25000000 })
      .rotate()
      .resize({
        width: 2000,
        height: 2000,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 85 })
      .toBuffer();
    mime = "image/webp";
    const base = requiredEnv("R2_PUBLIC_BASE_URL").replace(/\/$/, "");
    if (!base.startsWith("https://"))
      throw new Error("Public image hosting is not configured.");
    publicUrl = base + "/" + asset.object_key;
  } else {
    const header = Buffer.from(bytes.slice(0, 8));
    if (
      asset.mime_type === "application/pdf" &&
      !header.toString("ascii").startsWith("%PDF-")
    )
      throw new Error("The file content is not a PDF.");
    if (
      asset.mime_type === "application/zip" &&
      !["504b0304", "504b0506", "504b0708"].includes(
        header.subarray(0, 4).toString("hex"),
      )
    )
      throw new Error("The file content is not a ZIP archive.");
  }
  await s3.send(
    new PutObjectCommand({
      Bucket: requiredEnv(
        asset.kind === "image" ? "R2_PUBLIC_BUCKET" : "R2_PRIVATE_BUCKET",
      ),
      Key: asset.object_key,
      Body: bytes,
      ContentType: mime,
      CacheControl:
        asset.kind === "image"
          ? "public,max-age=31536000,immutable"
          : "private,no-store",
      ContentDisposition:
        asset.kind === "digital"
          ? `attachment; filename="${safeFilename(asset.original_name)}"`
          : undefined,
    }),
  );
  return publicUrl;
}
export async function assetDownloadUrl(asset: Asset) {
  return getSignedUrl(
    client(),
    new GetObjectCommand({
      Bucket: requiredEnv("R2_PRIVATE_BUCKET"),
      Key: asset.object_key,
      ResponseContentDisposition: `attachment; filename="${safeFilename(asset.original_name)}"`,
      ResponseContentType: asset.mime_type,
      ResponseCacheControl: "private,no-store",
    }),
    { expiresIn: 120 },
  );
}
export async function removeAssetStage(key: string) {
  if (
    !/^asset-staging\/[0-9a-f-]+\/[0-9a-f-]+\.(jpg|png|webp|pdf|zip)$/.test(key)
  )
    throw new Error("Invalid asset staging path.");
  await client().send(
    new DeleteObjectCommand({
      Bucket: requiredEnv("R2_PRIVATE_BUCKET"),
      Key: key,
    }),
  );
}
