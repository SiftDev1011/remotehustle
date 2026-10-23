"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { validateCvMetadata } from "@/lib/file-validation";

export function CvUpload({
  currentName,
  currentId,
}: {
  currentName?: string;
  currentId?: string;
}) {
  const [file, setFile] = useState<File | null>(null),
    [busy, setBusy] = useState(false),
    [percent, setPercent] = useState(0),
    [error, setError] = useState("");
  const router = useRouter();
  async function upload() {
    if (!file) return;
    setBusy(true);
    setError("");
    setPercent(0);
    try {
      const fallback: Record<string, string> = {
        pdf: "application/pdf",
        doc: "application/msword",
        docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      };
      const type =
        file.type ||
        fallback[file.name.split(".").pop()?.toLowerCase() || ""] ||
        "";
      validateCvMetadata(file.name, type, file.size);
      const prepared = await fetch("/api/files/cv/prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: file.name, type, size: file.size }),
      });
      const info = await prepared.json();
      if (!prepared.ok)
        throw new Error(info.error || "Unable to start upload.");
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", info.uploadUrl);
        xhr.setRequestHeader("Content-Type", info.contentType);
        xhr.timeout = 120000;
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable)
            setPercent(Math.floor((e.loaded * 80) / e.total));
        };
        xhr.onload = () =>
          xhr.status >= 200 && xhr.status < 300
            ? resolve()
            : reject(new Error("Upload failed. Please try again."));
        xhr.onerror = () =>
          reject(new Error("The upload connection failed. Try again."));
        xhr.ontimeout = () =>
          reject(new Error("The upload took too long. Please try again."));
        xhr.send(file);
      });
      setPercent(85);
      const complete = await fetch("/api/files/cv/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: info.id }),
      });
      const result = await complete.json();
      if (!complete.ok)
        throw new Error(result.error || "Unable to verify the uploaded file.");
      setPercent(100);
      setFile(null);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="app-card">
      <h3>Your CV</h3>
      <p className="rm-note">
        Upload a PDF, DOC or DOCX document, up to 10 MB. Your CV is private.
      </p>
      {currentId && (
        <p className="rm-note">
          <a
            className="rm-text-link"
            href={"/api/files/cv/" + currentId}
            target="_blank"
            rel="noopener noreferrer"
          >
            View {currentName || "your CV"}
          </a>
        </p>
      )}
      <div className="app-field">
        <label htmlFor="cv-upload">
          {currentId ? "Replace your CV" : "Choose your CV"}
        </label>
        <input
          id="cv-upload"
          type="file"
          accept=".pdf,.doc,.docx"
          disabled={busy}
          onChange={(e) => {
            setFile(e.target.files?.[0] || null);
            setError("");
          }}
        />
      </div>
      <button
        type="button"
        className="rm-btn rm-btn-light"
        disabled={!file || busy}
        onClick={upload}
      >
        {busy ? "Uploading and checking…" : "Upload CV"}
      </button>
      {(busy || percent === 100) && (
        <div className="app-progress">
          <progress max={100} value={percent} aria-label="CV upload progress" />
          <span role="status">
            {percent === 100 ? "CV uploaded." : percent + "%"}
          </span>
        </div>
      )}
      {error && (
        <p className="app-form-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
