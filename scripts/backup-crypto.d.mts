import type { Readable, Writable } from "node:stream";
export function backupKey(value: string | undefined): Buffer;
export function encryptStream(
  source: Readable,
  destination: string,
  key: Buffer,
): Promise<{ sha256: string; bytes: number }>;
export function decryptStream(
  source: string,
  destination: Writable,
  key: Buffer,
): Promise<void>;
