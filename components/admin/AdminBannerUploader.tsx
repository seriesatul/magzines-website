"use client";

import React, { useCallback, useState } from "react";
import { ImagePlus, UploadCloud } from "lucide-react";

type UploadStatus = "idle" | "uploading" | "ready" | "error";

interface AdminBannerUploaderProps {
  inputName: string;
}

type PresignResponse = {
  error?: unknown;
  uploadUrl?: string;
  publicUrl?: string;
  key?: string;
};

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "Upload failed.";
}

export function AdminBannerUploader({ inputName }: AdminBannerUploaderProps): React.JSX.Element {
  const [mediaUrl, setMediaUrl] = useState("");
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [message, setMessage] = useState("Paste a CDN URL or upload a banner.");

  const uploadFile = useCallback(async (file: File): Promise<void> => {
    setStatus("uploading");
    setProgress(0);
    setMessage("Authorizing secure upload...");

    try {
      const presignResponse = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
          fileSize: file.size
        })
      });

      const presignResult = (await presignResponse.json()) as PresignResponse;

      if (!presignResponse.ok || !presignResult.uploadUrl || !presignResult.publicUrl) {
        throw new Error(getErrorMessage(presignResult.error) || "Could not authorize upload.");
      }

      setMessage("Uploading directly to storage...");

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", presignResult.uploadUrl as string, true);
        xhr.setRequestHeader("Content-Type", file.type);

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            setProgress(Math.round((event.loaded / event.total) * 100));
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error("Storage upload failed."));
          }
        };

        xhr.onerror = () => reject(new Error("Network error during upload."));
        xhr.send(file);
      });

      setMediaUrl(presignResult.publicUrl);
      setProgress(100);
      setStatus("ready");
      setMessage("Banner uploaded and ready to publish.");
    } catch (error) {
      setStatus("error");
      setMessage(getErrorMessage(error));
      setProgress(0);
    }
  }, []);

  const handleFiles = useCallback(
    (files: FileList | null): void => {
      const file = files?.[0];
      if (file) {
        void uploadFile(file);
      }
    },
    [uploadFile]
  );

  return (
    <div className="space-y-3">
      <input type="hidden" name={inputName} value={mediaUrl} />

      <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400">
        Banner media URL
        <input
          type="url"
          value={mediaUrl}
          onChange={(event) => {
            const nextValue = event.target.value;
            setMediaUrl(nextValue);
            setStatus(nextValue ? "ready" : "idle");
            setMessage(nextValue ? "Banner URL ready to publish." : "Paste a CDN URL or upload a banner.");
          }}
          placeholder="https://..."
          className="mt-2 h-11 w-full border border-stone-200 bg-[#FAFAF8] px-4 text-xs font-medium outline-none transition focus:border-brand rounded-none"
        />
      </label>

      <label
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          handleFiles(event.dataTransfer.files);
        }}
        className="flex min-h-36 cursor-pointer flex-col items-center justify-center gap-3 border border-dashed border-stone-300 bg-stone-50 px-4 py-6 text-center transition hover:border-brand hover:bg-brand-light/40 rounded-none"
      >
        {mediaUrl ? (
          <ImagePlus className="h-6 w-6 text-brand" />
        ) : (
          <UploadCloud className="h-6 w-6 text-brand" />
        )}
        <span className="text-[10px] font-bold uppercase tracking-widest text-stone-700">
          Drag a hero image/video or click to upload
        </span>
        <span className="text-[11px] font-light leading-5 text-stone-500">
          JPG, PNG, WEBP, MP4, WEBM, or MOV up to the configured file limit.
        </span>
        <input
          type="file"
          accept="image/*,video/*"
          className="sr-only"
          onChange={(event) => handleFiles(event.target.files)}
        />
      </label>

      {status === "uploading" ? (
        <div className="h-1 w-full bg-stone-200">
          <div className="h-full bg-brand transition-all" style={{ width: `${progress}%` }} />
        </div>
      ) : null}

      <p
        className={`text-[10px] font-semibold uppercase tracking-wider ${
          status === "error" ? "text-red-700" : status === "ready" ? "text-emerald-700" : "text-stone-400"
        }`}
      >
        {message}
      </p>
    </div>
  );
}
