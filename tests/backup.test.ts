import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable, Writable } from "node:stream";
// JavaScript CLI helper is tested through its runtime interface.
import {
  backupKey,
  encryptStream,
  decryptStream,
} from "../scripts/backup-crypto.mjs";
test("encrypted backups authenticate their contents and reject corruption or a wrong key", async () => {
  const directory = await mkdtemp(join(tmpdir(), "rh-backup-test-"));
  try {
    const file = join(directory, "snapshot.enc"),
      key = backupKey("a".repeat(64)),
      payload = Buffer.from("Private database and file content.");
    const proof = await encryptStream(Readable.from([payload]), file, key);
    assert.equal(proof.bytes, payload.length);
    const chunks: Buffer[] = [];
    await decryptStream(
      file,
      new Writable({
        write(c, _e, done) {
          chunks.push(c);
          done();
        },
      }),
      key,
    );
    assert.deepEqual(Buffer.concat(chunks), payload);
    const sink = () =>
      new Writable({
        write(_c, _e, done) {
          done();
        },
      });
    await assert.rejects(
      decryptStream(file, sink(), backupKey("b".repeat(64))),
    );
    const bytes = await readFile(file);
    bytes[20] ^= 1;
    await writeFile(file, bytes);
    await assert.rejects(decryptStream(file, sink(), key));
    assert.throws(() => backupKey("short"));
    const empty = join(directory, "empty.enc");
    await encryptStream(Readable.from([]), empty, key);
    await decryptStream(empty, sink(), key);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("backup verification CLI extracts only authenticated files into a new directory", async () => {
  const { execFile } = await import("node:child_process"),
    { promisify } = await import("node:util");
  const run = promisify(execFile),
    directory = await mkdtemp(join(tmpdir(), "rh-restore-test-"));
  try {
    const file = "00000001.enc",
      key = backupKey("c".repeat(64));
    const proof = await encryptStream(
      Readable.from(["SELECT 1;\n"]),
      join(directory, file),
      key,
    );
    await encryptStream(
      Readable.from([
        JSON.stringify({
          version: 1,
          entries: [{ file, kind: "database", name: "schema.sql", ...proof }],
        }),
      ]),
      join(directory, "manifest.enc"),
      key,
    );
    await writeFile(join(directory, "COMPLETE"), "complete");
    const target = join(directory, "extracted"),
      args = ["scripts/verify-backup.mjs", directory, "--extract", target];
    await run(process.execPath, args, {
      env: { ...process.env, BACKUP_ENCRYPTION_KEY: "c".repeat(64) },
    });
    assert.equal(
      await readFile(join(target, file + ".plain"), "utf8"),
      "SELECT 1;\n",
    );
    await assert.rejects(
      run(process.execPath, args, {
        env: { ...process.env, BACKUP_ENCRYPTION_KEY: "c".repeat(64) },
      }),
    );
    assert.equal(
      await readFile(join(target, file + ".plain"), "utf8"),
      "SELECT 1;\n",
    );
    await assert.rejects(
      run(process.execPath, ["scripts/verify-backup.mjs", directory], {
        env: { ...process.env, BACKUP_ENCRYPTION_KEY: "d".repeat(64) },
      }),
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
