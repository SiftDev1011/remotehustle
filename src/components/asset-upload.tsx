"use client";
import { useState } from "react";
export function AssetUpload({
  area,
  kind = "image",
  name,
  initial = "",
  preview = "",
  label,
}: {
  area: "partners" | "content" | "shop";
  kind?: "image" | "digital";
  name: string;
  initial?: string;
  preview?: string;
  label?: string;
}) {
  const [value, setValue] = useState(initial),
    [url, setUrl] = useState(preview || initial),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [percent, setPercent] = useState(0);
  async function upload(file: File) {
    setBusy(true);
    setMessage("");
    setPercent(0);
    try {
      const mime =
        file.type ||
        (file.name.toLowerCase().endsWith(".zip") ? "application/zip" : "");
      const prep = await fetch("/api/assets/prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          area,
          kind,
          name: file.name,
          mime,
          size: file.size,
        }),
      });
      const data = await prep.json();
      if (!prep.ok) throw new Error(data.error);
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", data.url);
        xhr.timeout = 120000;
        xhr.setRequestHeader("Content-Type", mime);
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable)
            setPercent(Math.round((e.loaded / e.total) * 100));
        };
        xhr.onload = () =>
          xhr.status >= 200 && xhr.status < 300
            ? resolve()
            : reject(new Error("File transfer failed. Try again."));
        xhr.onerror = () =>
          reject(new Error("Could not connect to file storage."));
        xhr.ontimeout = () =>
          reject(new Error("The upload timed out. Try again."));
        xhr.send(file);
      });
      const finish = await fetch("/api/assets/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: data.id }),
      });
      const ready = await finish.json();
      if (!finish.ok) throw new Error(ready.error);
      setValue(kind === "image" ? ready.url : ready.id);
      setUrl(ready.url || "");
      setMessage("Uploaded. Save this form to use the file.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="app-field app-asset-upload">
      <label>
        {label || (kind === "image" ? "Image / logo" : "Digital product file")}
        <input
          type="file"
          disabled={busy}
          accept={
            kind === "image" ? "image/jpeg,image/png,image/webp" : ".pdf,.zip"
          }
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void upload(f);
          }}
        />
      </label>
      <input type="hidden" name={name} value={value} />
      {kind === "image" && url && (
        <img src={url} alt="Selected image preview" width={180} height={120} />
      )}
      <small>
        {kind === "image"
          ? "JPEG, PNG or WebP · up to 5 MB"
          : "PDF or ZIP · up to 50 MB · private download"}
      </small>
      {busy && (
        <>
          <progress value={percent} max={100} />
          <p role="status">
            {percent === 100 ? "Verifying file…" : `Uploading ${percent}%`}
          </p>
        </>
      )}
      {message && <p role="status">{message}</p>}
      {value && !busy && (
        <button
          type="button"
          className="rm-text-link"
          onClick={() => {
            setValue("");
            setUrl("");
            setMessage("File cleared from this form.");
          }}
        >
          Clear selection
        </button>
      )}
    </div>
  );
}
