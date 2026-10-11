import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { open, stat } from "node:fs/promises";
import { pipeline } from "node:stream/promises";
import { Transform, Readable } from "node:stream";
export function backupKey(value) {
  if (!/^[a-f0-9]{64}$/i.test(value || ""))
    throw new Error("BACKUP_ENCRYPTION_KEY must be 64 hexadecimal characters.");
  return Buffer.from(value, "hex");
}
export async function encryptStream(source, destination, key) {
  const iv = randomBytes(12),
    cipher = createCipheriv("aes-256-gcm", key, iv),
    hash = createHash("sha256");
  let bytes = 0;
  const meter = new Transform({
    transform(chunk, _encoding, done) {
      bytes += chunk.length;
      hash.update(chunk);
      done(null, chunk);
    },
  });
  const output = createWriteStream(destination, { flags: "wx", mode: 0o600 });
  output.write(Buffer.concat([Buffer.from("RHB1"), iv]));
  await pipeline(source, meter, cipher, output);
  const handle = await open(destination, "a");
  try {
    await handle.write(cipher.getAuthTag());
  } finally {
    await handle.close();
  }
  return { sha256: hash.digest("hex"), bytes };
}
export async function decryptStream(source, destination, key) {
  const info = await stat(source);
  if (info.size < 32) throw new Error("Invalid backup file.");
  const h = await open(source, "r"),
    header = Buffer.alloc(16),
    tag = Buffer.alloc(16);
  try {
    await h.read(header, 0, 16, 0);
    await h.read(tag, 0, 16, info.size - 16);
  } finally {
    await h.close();
  }
  if (header.subarray(0, 4).toString() !== "RHB1")
    throw new Error("Invalid backup header.");
  const decipher = createDecipheriv("aes-256-gcm", key, header.subarray(4));
  decipher.setAuthTag(tag);
  await pipeline(
    info.size === 32
      ? Readable.from([])
      : createReadStream(source, { start: 16, end: info.size - 17 }),
    decipher,
    destination,
  );
}
