// Run on a trusted maintenance machine or company-owned CI runner, never inside a web request.
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { Readable } from "node:stream";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { backupKey, encryptStream } from "./backup-crypto.mjs";
const run = promisify(execFile);
const required = (name) => {
  if (!process.env[name]?.trim()) throw new Error("Missing " + name);
  return process.env[name].trim();
};
let temporary;
try {
  const key = backupKey(required("BACKUP_ENCRYPTION_KEY")),
    url = required("BACKUP_DATABASE_URL");
  const account = required("R2_ACCOUNT_ID"),
    privateBucket = required("R2_PRIVATE_BUCKET"),
    publicBucket = required("R2_PUBLIC_BUCKET");
  const s3 = new S3Client({
    region: "auto",
    endpoint: `https://${account}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: required("R2_ACCESS_KEY_ID"),
      secretAccessKey: required("R2_SECRET_ACCESS_KEY"),
    },
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
  const output = resolve(
    process.env.BACKUP_OUTPUT_DIR || ".backups",
    new Date().toISOString().replace(/[:.]/g, "-"),
  );
  await mkdir(output, { recursive: true, mode: 0o700 });
  temporary = await mkdtemp(join(tmpdir(), "rh-backup-"));
  const entries = [];
  let sequence = 0;
  async function save(source, metadata) {
    const file = String(++sequence).padStart(8, "0") + ".enc";
    const proof = await encryptStream(source, join(output, file), key);
    entries.push({ file, ...metadata, ...proof });
  }
  for (const [name, flags] of [
    ["roles.sql", ["--role-only"]],
    ["schema.sql", []],
    [
      "data.sql",
      [
        "--data-only",
        "--use-copy",
        "-x",
        "storage.buckets_vectors",
        "-x",
        "storage.vector_indexes",
      ],
    ],
  ]) {
    const path = join(temporary, name);
    try {
      await run(
        process.env.SUPABASE_CLI || "supabase",
        ["db", "dump", "--db-url", url, "-f", path, ...flags],
        { timeout: 900000, maxBuffer: 4 * 1024 * 1024 },
      );
    } catch {
      throw new Error(
        "Database dump failed for " +
          name +
          ". Check CLI, Docker, connectivity and database access; no credentials are printed.",
      );
    }
    await save(createReadStream(path), { kind: "database", name });
    await rm(path);
  }
  await save(createReadStream("supabase/restore/auth-triggers.sql"), {
    kind: "database",
    name: "auth-triggers.sql",
  });
  for (const [kind, Bucket] of [
    ["private", privateBucket],
    ["public", publicBucket],
  ]) {
    let ContinuationToken;
    do {
      const list = await s3.send(
        new ListObjectsV2Command({ Bucket, ContinuationToken }),
      );
      for (const item of list.Contents || []) {
        if (!item.Key || /^(staging|asset-staging)\//.test(item.Key)) continue;
        const object = await s3.send(
          new GetObjectCommand({ Bucket, Key: item.Key, IfMatch: item.ETag }),
        );
        if (!object.Body) throw new Error("A file could not be backed up.");
        await save(object.Body, {
          kind,
          key: item.Key,
          sourceBucket: Bucket,
          contentType: object.ContentType,
          cacheControl: object.CacheControl,
          contentDisposition: object.ContentDisposition,
        });
      }
      ContinuationToken = list.IsTruncated
        ? list.NextContinuationToken
        : undefined;
    } while (ContinuationToken);
  }
  await encryptStream(
    Readable.from([
      JSON.stringify({
        version: 1,
        createdAt: new Date().toISOString(),
        entries,
      }),
    ]),
    join(output, "manifest.enc"),
    key,
  );
  await writeFile(
    join(output, "COMPLETE"),
    "Encrypted database and file snapshot. Verify before relying on this backup.\n",
    { mode: 0o600 },
  );
  console.log(
    "Encrypted backup completed:",
    output,
    "Entries:",
    entries.length,
  );
} catch (error) {
  console.error(
    error instanceof Error &&
      /^(Missing |Database dump failed|BACKUP_ENCRYPTION_KEY)/.test(
        error.message,
      )
      ? error.message
      : "Backup failed. The snapshot is incomplete; do not use it for restoration.",
  );
  process.exitCode = 1;
} finally {
  if (temporary) await rm(temporary, { recursive: true, force: true });
}
