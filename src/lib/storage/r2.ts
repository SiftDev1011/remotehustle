import "server-only";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { requiredEnv } from "@/lib/env";
import { safeFilename, validateCvBytes } from "@/lib/file-validation";
import type { CvDocument } from "@/lib/domain";

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
export async function cvUploadUrl(document: CvDocument) {
  return getSignedUrl(
    client(),
    new PutObjectCommand({
      Bucket: requiredEnv("R2_PRIVATE_BUCKET"),
      Key: document.staging_key,
      ContentType: document.mime_type,
      ContentLength: Number(document.size_bytes),
    }),
    { expiresIn: 120 },
  );
}
export async function validateAndStoreCv(document: CvDocument) {
  const s3 = client();
  const bucket = requiredEnv("R2_PRIVATE_BUCKET");
  const head = await s3.send(
    new HeadObjectCommand({ Bucket: bucket, Key: document.staging_key }),
  );
  if (
    head.ContentLength !== Number(document.size_bytes) ||
    head.ContentType !== document.mime_type
  )
    throw new Error("Upload size did not match. Please upload the file again.");
  const result = await s3.send(
    new GetObjectCommand({ Bucket: bucket, Key: document.staging_key }),
  );
  if (!result.Body)
    throw new Error("The document content is missing. Please upload it again.");
  const bytes = await result.Body.transformToByteArray();
  validateCvBytes(
    bytes,
    document.original_name,
    document.mime_type,
    Number(document.size_bytes),
  );
  // Write verified bytes to a different, immutable path. The presigned staging PUT cannot alter it later.
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: document.object_key,
      Body: bytes,
      ContentType: document.mime_type,
      ContentDisposition: `attachment; filename="${safeFilename(document.original_name)}"`,
    }),
  );
}
export async function cvDownloadUrl(document: CvDocument) {
  return getSignedUrl(
    client(),
    new GetObjectCommand({
      Bucket: requiredEnv("R2_PRIVATE_BUCKET"),
      Key: document.object_key,
      ResponseContentDisposition: `${document.mime_type === "application/pdf" ? "inline" : "attachment"}; filename="${safeFilename(document.original_name)}"`,
      ResponseContentType: document.mime_type,
    }),
    { expiresIn: 120 },
  );
}
export async function deletePrivateObject(key: string) {
  if (!/^(staging|cvs)\/[0-9a-f-]+\/[0-9a-f-]+\.(pdf|doc|docx)$/.test(key))
    throw new Error("Invalid private object path.");
  await client().send(
    new DeleteObjectCommand({
      Bucket: requiredEnv("R2_PRIVATE_BUCKET"),
      Key: key,
    }),
  );
}
