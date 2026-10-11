export const MAX_CV_BYTES = 10 * 1024 * 1024;
const fileTypes: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};
export function validateCvMetadata(name: string, type: string, size: number) {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  if (!fileTypes[ext] || fileTypes[ext] !== type)
    throw new Error("Upload a PDF, DOC or DOCX document.");
  if (!Number.isInteger(size) || size <= 0 || size > MAX_CV_BYTES)
    throw new Error("Your CV must be no larger than 10 MB.");
  if (!name.trim() || name.length > 180 || /[\r\n\x00]/.test(name))
    throw new Error("Use a shorter, valid filename.");
  return { ext, mimeType: fileTypes[ext] };
}
export function validateCvBytes(
  bytes: Uint8Array,
  name: string,
  type: string,
  expectedSize: number,
) {
  const { ext } = validateCvMetadata(name, type, expectedSize);
  if (bytes.length !== expectedSize)
    throw new Error("Upload size did not match. Please upload the file again.");
  const prefix = Array.from(bytes.slice(0, 8));
  const pdf = new TextDecoder().decode(bytes.slice(0, 5)) === "%PDF-";
  const doc = prefix.join(",") === "208,207,17,224,161,177,26,225";
  const docx =
    prefix[0] === 0x50 &&
    prefix[1] === 0x4b &&
    prefix[2] === 3 &&
    prefix[3] === 4;
  if (
    (ext === "pdf" && !pdf) ||
    (ext === "doc" && !doc) ||
    (ext === "docx" && !docx)
  ) {
    throw new Error("The document content does not match its file type.");
  }
  // Signature checking does not replace an antivirus/content-scanning service.
}
export function safeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9._ -]/g, "_").slice(0, 150) || "document";
}
