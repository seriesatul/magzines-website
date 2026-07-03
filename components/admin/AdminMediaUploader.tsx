"use client";

import React, { useState } from "react";
import { UploadCloud } from "lucide-react";

interface AdminMediaUploaderProps {
  inputName: string;
}

export function AdminMediaUploader({ inputName }: AdminMediaUploaderProps): React.JSX.Element {
  const [mediaUrl, setMediaUrl] = useState("");
  const [status, setStatus] = useState<"idle" | "uploading" | "ready" | "error">("idle");
  const [message, setMessage] = useState("Paste a CDN URL or upload a file.");

  async function uploadFile(file: File): Promise<void> {
    setStatus("uploading");
    setMessage("Authorizing upload...");

    try {
      const formData = new FormData();
      formData.append("file", file);

      setMessage("Uploading media...");

      const uploadResponse = await fetch("/api/admin/upload-media", {
        method: "POST",
        body: formData
      });

      const uploadResult = (await uploadResponse.json()) as {
        error?: string;
        publicUrl: string;
      };

      if (!uploadResponse.ok) {
        throw new Error(typeof uploadResult.error === "string" ? uploadResult.error : "Cloud upload failed.");
      }

      if (!uploadResult.publicUrl) {
        throw new Error("Upload response was incomplete.");
      }

      setMediaUrl(uploadResult.publicUrl);
      setStatus("ready");
      setMessage("Media uploaded and ready to save.");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Upload failed.");
    }
  }

  return (
    <div className="space-y-3">
      <input type="hidden" name={inputName} value={mediaUrl} />

      <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400">
        Media URL
        <input
          type="url"
          value={mediaUrl}
          onChange={(event) => {
            setMediaUrl(event.target.value);
            setStatus(event.target.value ? "ready" : "idle");
            setMessage(event.target.value ? "Media URL ready to save." : "Paste a CDN URL or upload a file.");
          }}
          placeholder="https://..."
          className="mt-2 h-11 w-full border border-stone-200 bg-[#FAFAF8] px-4 text-xs font-medium outline-none focus:border-brand rounded-none"
        />
      </label>

      <label className="flex min-h-24 cursor-pointer flex-col items-center justify-center gap-2 border border-dashed border-stone-300 bg-stone-50 px-4 py-5 text-center transition hover:border-brand hover:bg-brand-light/40">
        <UploadCloud className="h-5 w-5 text-brand" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-stone-600">
          Upload image or video
        </span>
        <input
          type="file"
          accept="image/*,video/*"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              void uploadFile(file);
            }
          }}
        />
      </label>

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
