import { readFile, mkdir, rm } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { resolve, join } from "node:path";
import { Writable } from "node:stream";
import { createHash } from "node:crypto";
import { backupKey, decryptStream } from "./backup-crypto.mjs";
let extracting;
try {
  const source = process.argv[2];
  if (!source)
    throw new Error(
      "Usage: node scripts/verify-backup.mjs BACKUP_DIRECTORY [--extract NEW_DIRECTORY]",
    );
  const key = backupKey(process.env.BACKUP_ENCRYPTION_KEY);
  await readFile(join(source, "COMPLETE"));
  const chunks = [];
  await decryptStream(
    join(source, "manifest.enc"),
    new Writable({
      write(chunk, _encoding, done) {
        chunks.push(chunk);
        done();
      },
    }),
    key,
  );
  const manifest = JSON.parse(Buffer.concat(chunks));
  if (manifest.version !== 1 || !Array.isArray(manifest.entries))
    throw new Error("Invalid manifest.");
  const extractIndex = process.argv.indexOf("--extract");
  if (extractIndex >= 0) {
    if (!process.argv[extractIndex + 1])
      throw new Error("Provide a new extraction directory.");
    const target = resolve(process.argv[extractIndex + 1]);
    await mkdir(target, { mode: 0o700 });
    extracting = target;
  }
  for (const entry of manifest.entries) {
    if (!/^\d{8}\.enc$/.test(entry.file))
      throw new Error("Invalid backup entry.");
    const hash = createHash("sha256");
    let bytes = 0;
    await decryptStream(
      join(source, entry.file),
      new Writable({
        write(chunk, _encoding, done) {
          hash.update(chunk);
          bytes += chunk.length;
          done();
        },
      }),
      key,
    );
    if (hash.digest("hex") !== entry.sha256 || bytes !== entry.bytes)
      throw new Error("Backup integrity check failed.");
    // Verify authentication before retaining decrypted files. Never use untrusted object keys as disk paths.
    if (extracting)
      await decryptStream(
        join(source, entry.file),
        createWriteStream(join(extracting, entry.file + ".plain"), {
          flags: "wx",
          mode: 0o600,
        }),
        key,
      );
  }
  if (extracting)
    await import("node:fs/promises").then((fs) =>
      fs.writeFile(
        join(extracting, "manifest.json"),
        JSON.stringify(manifest, null, 2),
        { mode: 0o600, flag: "wx" },
      ),
    );
  console.log(
    "Verified",
    manifest.entries.length,
    "encrypted entries.",
    extracting ? "Extracted to " + extracting : "No plaintext files retained.",
  );
} catch (error) {
  if (extracting) await rm(extracting, { recursive: true, force: true });
  console.error(
    "Backup verification failed:",
    error instanceof Error ? error.message : "Unknown error",
  );
  process.exitCode = 1;
}
