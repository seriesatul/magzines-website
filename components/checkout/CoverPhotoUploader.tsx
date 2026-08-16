"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { LoadingMark } from "@/components/loading/LoadingMark";

export type CoverUploadLifecycle = "idle" | "busy" | "ready" | "error";

export type UploadedCoverPhoto = {
  key: string;
  url: string;
  name: string;
  size: number;
  mimeType?: string;
  sortOrder: number;
};

type UploadStatus = "pending" | "uploading" | "success" | "error";

type CoverUploadItem = {
  id: string;
  file: File;
  progress: number;
  status: UploadStatus;
  previewUrl: string;
  key?: string;
  publicUrl?: string;
};

type CoverPhotoUploaderProps = {
  minFiles: number;
  maxFiles: number;
  required: boolean;
  helpText: string;
  disabled?: boolean;
  onChange: (photos: UploadedCoverPhoto[], lifecycle: CoverUploadLifecycle) => void;
};

const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export function CoverPhotoUploader({
  minFiles,
  maxFiles,
  required,
  helpText,
  disabled = false,
  onChange
}: CoverPhotoUploaderProps): React.JSX.Element {
  const previewUrlsRef = useRef<Set<string>>(new Set());
  const [uploads, setUploads] = useState<CoverUploadItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const successfulUploads = useMemo(
    () =>
      uploads.filter(
        (upload): upload is CoverUploadItem & { key: string; publicUrl: string } =>
          upload.status === "success" && Boolean(upload.key) && Boolean(upload.publicUrl)
      ),
    [uploads]
  );

  const lifecycle: CoverUploadLifecycle = useMemo(() => {
    if (uploads.some((upload) => upload.status === "pending" || upload.status === "uploading")) {
      return "busy";
    }

    if (uploads.some((upload) => upload.status === "error")) {
      return "error";
    }

    return successfulUploads.length > 0 ? "ready" : "idle";
  }, [successfulUploads.length, uploads]);

  useEffect(() => {
    onChange(
      successfulUploads.map((upload, index) => ({
        key: upload.key,
        url: upload.publicUrl,
        name: upload.file.name,
        size: upload.file.size,
        mimeType: upload.file.type,
        sortOrder: index
      })),
      lifecycle
    );
  }, [lifecycle, onChange, successfulUploads]);

  useEffect(() => {
    const previewUrls = previewUrlsRef.current;

    return () => {
      previewUrls.forEach((previewUrl) => URL.revokeObjectURL(previewUrl));
      previewUrls.clear();
    };
  }, []);

  function updateUpload(id: string, updates: Partial<CoverUploadItem>): void {
    setUploads((current) =>
      current.map((upload) => (upload.id === id ? { ...upload, ...updates } : upload))
    );
  }

  async function uploadFile(id: string, file: File): Promise<void> {
    updateUpload(id, { status: "uploading", progress: 0 });

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
      const presignData = (await presignResponse.json()) as {
        uploadUrl?: string;
        key?: string;
        publicUrl?: string;
        error?: unknown;
      };

      if (!presignResponse.ok || !presignData.uploadUrl || !presignData.key || !presignData.publicUrl) {
        throw new Error(getErrorMessage(presignData.error) || "Could not authorize upload.");
      }

      await uploadWithProgress(presignData.uploadUrl, file, (progress) => {
        updateUpload(id, { progress });
      });

      updateUpload(id, {
        status: "success",
        progress: 100,
        key: presignData.key,
        publicUrl: presignData.publicUrl
      });
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Cover photo upload failed.");
      updateUpload(id, { status: "error" });
    }
  }

  function processFiles(files: File[]): void {
    if (files.length === 0 || disabled || maxFiles <= 0) {
      return;
    }

    setError(null);
    const acceptedFiles = maxFiles === 1 ? files.slice(0, 1) : files;

    for (const file of acceptedFiles) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        setError(`${file.name} is not supported. Use JPG, PNG, or WEBP.`);
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        setError(`${file.name} is larger than 10MB.`);
        return;
      }
    }

    const incomingUploads = acceptedFiles.map((file) => {
      const previewUrl = URL.createObjectURL(file);
      previewUrlsRef.current.add(previewUrl);

      return {
        id: `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        file,
        progress: 0,
        status: "pending" as const,
        previewUrl
      };
    });

    setUploads((current) => {
      const nextUploads = maxFiles === 1 ? incomingUploads : [...current, ...incomingUploads];

      if (nextUploads.length > maxFiles) {
        incomingUploads.forEach((upload) => {
          URL.revokeObjectURL(upload.previewUrl);
          previewUrlsRef.current.delete(upload.previewUrl);
        });
        setError(`Cover photo limit is set to ${maxFiles}. Remove a photo before adding another.`);
        return current;
      }

      if (maxFiles === 1) {
        current.forEach((upload) => {
          URL.revokeObjectURL(upload.previewUrl);
          previewUrlsRef.current.delete(upload.previewUrl);
        });
      }

      incomingUploads.forEach((upload) => {
        void uploadFile(upload.id, upload.file);
      });

      return nextUploads;
    });
  }

  function removeUpload(id: string): void {
    const target = uploads.find((upload) => upload.id === id);

    if (target) {
      URL.revokeObjectURL(target.previewUrl);
      previewUrlsRef.current.delete(target.previewUrl);
    }

    setError(null);
    setUploads((current) => current.filter((upload) => upload.id !== id));
  }

  function retryUpload(id: string): void {
    const target = uploads.find((upload) => upload.id === id);

    if (target) {
      setError(null);
      void uploadFile(id, target.file);
    }
  }

  const uploadCountLabel = maxFiles === 1 ? "1 cover" : `Max ${maxFiles}`;
  const requiredLabel = required ? `Min ${minFiles}` : "Optional";

  return (
    <section className="border border-stone-200 bg-[#FAFAF8] p-4">
      <div className="flex flex-col gap-3 border-b border-stone-200 pb-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-1.5 flex items-center gap-2 text-brand">
            <span className="h-px w-5 bg-brand" />
            <span className="text-[0.62rem] font-bold uppercase tracking-[0.12em]">
              Cover Only
            </span>
          </div>
          <h3 className="font-serif text-xl font-black leading-none text-stone-900">
            Cover <span className="font-normal italic">Photos</span>
          </h3>
          <p className="mt-2 max-w-[56ch] text-xs font-light leading-5 text-stone-600">
            {helpText}
          </p>
        </div>
        <div className="flex shrink-0 gap-2 text-[9px] font-bold uppercase tracking-widest text-stone-500">
          <span className="border border-stone-200 bg-white px-2.5 py-1.5">{uploadCountLabel}</span>
          <span className="border border-stone-200 bg-white px-2.5 py-1.5">{requiredLabel}</span>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-[180px_minmax(0,1fr)]">
        <label
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            processFiles(Array.from(event.dataTransfer.files));
          }}
          className="flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 border border-dashed border-stone-300 bg-white px-4 py-4 text-center transition hover:border-brand"
        >
          <span className="flex h-9 w-9 items-center justify-center border border-stone-900 bg-[#FAFAF8] text-brand">
            <ImagePlus className="h-4 w-4" />
          </span>
          <span className="font-serif text-lg font-black leading-none text-stone-900">
            Upload <span className="font-normal italic">Cover</span>
          </span>
          <span className="text-[10px] font-medium uppercase tracking-widest text-stone-400">
            JPG / PNG / WEBP
          </span>
          <input
            type="file"
            multiple={maxFiles > 1}
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            disabled={disabled}
            onChange={(event) => {
              processFiles(Array.from(event.target.files || []));
              event.target.value = "";
            }}
          />
        </label>

        <div className="border border-stone-200 bg-white p-3">
          <div className="flex items-center justify-between gap-3 border-b border-stone-100 pb-2">
            <p className="text-[9px] font-bold uppercase tracking-widest text-brand">
              Selected Covers
            </p>
            <span className="font-mono text-[10px] text-stone-400">
              {successfulUploads.length}/{maxFiles}
            </span>
          </div>

          {uploads.length > 0 ? (
            <div className="mt-3 flex max-h-36 gap-2 overflow-x-auto pb-1">
              {uploads.map((upload, index) => (
                <article key={upload.id} className="w-20 shrink-0 border border-stone-200 bg-[#FAFAF8] p-1.5">
                  <div className="relative aspect-[3/4] overflow-hidden bg-stone-900">
                    <img
                      src={upload.previewUrl}
                      alt={upload.file.name}
                      className={`h-full w-full object-cover ${upload.status === "error" ? "grayscale" : ""}`}
                    />
                    <span className="absolute left-1 top-1 bg-stone-900 px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-wider text-white">
                      {index + 1}
                    </span>
                    {upload.status === "uploading" || upload.status === "pending" ? (
                      <div className="absolute inset-x-0 bottom-0 bg-stone-900/90 p-1.5">
                        <div className="mb-1 flex justify-between text-[7px] font-bold uppercase tracking-wider text-white">
                          <span>Upload</span>
                          <span>{upload.progress}%</span>
                        </div>
                        <div className="h-1 bg-white/20">
                          <div className="h-full bg-brand" style={{ width: `${upload.progress}%` }} />
                        </div>
                      </div>
                    ) : null}
                    {upload.status === "success" ? (
                      <span className="absolute right-1 top-1 bg-brand px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-wider text-white">
                        Ready
                      </span>
                    ) : null}
                    {upload.status === "error" ? (
                      <button
                        type="button"
                        onClick={() => retryUpload(upload.id)}
                        className="absolute inset-0 flex items-center justify-center bg-red-950/85 text-[8px] font-bold uppercase tracking-widest text-white"
                      >
                        Retry
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => removeUpload(upload.id)}
                      className="absolute bottom-1 right-1 inline-flex h-6 w-6 items-center justify-center border border-stone-900 bg-white text-stone-900 transition hover:bg-brand hover:text-white"
                      aria-label={`Remove ${upload.file.name}`}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                  <p className="mt-1 truncate text-[9px] font-bold text-stone-900">{upload.file.name}</p>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-3 flex min-h-24 items-center justify-center border border-dashed border-stone-300 bg-[#FAFAF8] px-4 text-center">
              <p className="font-serif text-base italic text-stone-400">No cover selected.</p>
            </div>
          )}

          {lifecycle === "busy" ? (
            <p className="mt-2 inline-flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-stone-500">
              <LoadingMark />
              Uploading cover
            </p>
          ) : null}

          {error ? (
            <p className="mt-2 border border-red-200 bg-red-50 p-2 text-[11px] font-medium text-red-700">
              {error}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function uploadWithProgress(
  uploadUrl: string,
  file: File,
  onProgress: (progress: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl, true);
    xhr.setRequestHeader("Content-Type", file.type);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
        return;
      }

      reject(new Error("Storage upload failed."));
    };
    xhr.onerror = () => reject(new Error("Network error during upload."));
    xhr.send(file);
  });
}

function getErrorMessage(error: unknown): string {
  if (typeof error === "string") {
    return error;
  }

  if (error && typeof error === "object") {
    return Object.values(error)
      .flat()
      .filter((entry): entry is string => typeof entry === "string")
      .join(" ");
  }

  return "";
}
