// Explicit opt-in restoration to DIFFERENT buckets. Does not restore the database.
import { readFile } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { join } from "node:path";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
try {
  if (process.argv[2] !== "--confirm-isolated-restore" || !process.argv[3])
    throw new Error(
      "Usage: node scripts/restore-files.mjs --confirm-isolated-restore EXTRACTED_DIRECTORY",
    );
  const required = (n) => {
    if (!process.env[n]) throw new Error("Missing " + n);
    return process.env[n];
  };
  const directory = process.argv[3],
    manifest = JSON.parse(
      await readFile(join(directory, "manifest.json"), "utf8"),
    );
  const buckets = {
    private: required("RESTORE_PRIVATE_BUCKET"),
    public: required("RESTORE_PUBLIC_BUCKET"),
  };
  const sourceBuckets = new Set(
    manifest.entries.map((e) => e.sourceBucket).filter(Boolean),
  );
  if (
    Object.values(buckets).some((b) => sourceBuckets.has(b)) ||
    buckets.private === buckets.public
  )
    throw new Error(
      "Restore requires distinct new buckets, different from both source buckets.",
    );
  const s3 = new S3Client({
    region: "auto",
    endpoint: `https://${required("RESTORE_R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: required("RESTORE_R2_ACCESS_KEY_ID"),
      secretAccessKey: required("RESTORE_R2_SECRET_ACCESS_KEY"),
    },
    requestChecksumCalculation: "WHEN_REQUIRED",
  });
  let restored = 0;
  for (const e of manifest.entries) {
    if (e.kind === "database") continue;
    if (!buckets[e.kind] || !/^\d{8}\.enc$/.test(e.file))
      throw new Error("Invalid manifest entry.");
    await s3.send(
      new PutObjectCommand({
        Bucket: buckets[e.kind],
        Key: e.key,
        Body: createReadStream(join(directory, e.file + ".plain")),
        ContentLength: e.bytes,
        ContentType: e.contentType,
        CacheControl: e.cacheControl,
        ContentDisposition: e.contentDisposition,
        IfNoneMatch: "*",
      }),
    );
    restored++;
  }
  console.log(
    "Restored",
    restored,
    "files to isolated buckets. Verify private access and image URLs before any cutover.",
  );
} catch {
  console.error(
    "Restore stopped. Check the isolated destination, credentials and manifest. Existing objects are never overwritten.",
  );
  process.exitCode = 1;
}
