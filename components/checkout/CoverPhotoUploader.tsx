"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { ImagePlus, RefreshCw, Trash2 } from "lucide-react";
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

  const uploadCountLabel = maxFiles === 1 ? "Single cover image" : `Up to ${maxFiles} cover images`;
  const requiredLabel = required ? `Required minimum ${minFiles}` : "Optional";

  return (
    <section className="border border-stone-200 bg-white p-6 md:p-8">
      <div className="grid gap-5 border-b border-stone-100 pb-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
        <div>
          <div className="mb-3 flex items-center gap-3 text-brand">
            <span className="h-px w-6 bg-brand" />
            <span className="text-[0.68rem] font-bold uppercase tracking-[0.12em]">
              Cover Direction
            </span>
          </div>
          <h2 className="font-serif text-3xl font-black leading-none text-stone-900">
            Cover <span className="font-normal italic">Photos</span>
          </h2>
          <p className="mt-3 max-w-[62ch] text-sm font-light leading-6 text-stone-600">
            {helpText}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-[10px] font-bold uppercase tracking-widest text-stone-500">
          <span className="border border-stone-200 bg-[#FAFAF8] px-3 py-2">{uploadCountLabel}</span>
          <span className="border border-stone-200 bg-[#FAFAF8] px-3 py-2">{requiredLabel}</span>
        </div>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
        <label
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            processFiles(Array.from(event.dataTransfer.files));
          }}
          className="flex min-h-[220px] cursor-pointer flex-col items-center justify-center gap-4 border border-dashed border-stone-300 bg-[#FAFAF8] p-6 text-center transition hover:border-brand"
        >
          <span className="flex h-14 w-14 items-center justify-center border border-stone-900 bg-white text-brand">
            <ImagePlus className="h-6 w-6" />
          </span>
          <span className="font-serif text-2xl font-black leading-none text-stone-900">
            Upload <span className="font-normal italic">Cover Art</span>
          </span>
          <span className="max-w-[38ch] text-xs font-light leading-5 text-stone-500">
            JPG, PNG, or WEBP originals. Portrait framing works best for magazine covers.
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

        <div className="border border-stone-200 bg-[#FAFAF8] p-4">
          <div className="flex items-center justify-between gap-4 border-b border-stone-200 pb-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-brand">
              Cover Candidates
            </p>
            <span className="font-mono text-[10px] text-stone-400">
              {successfulUploads.length}/{maxFiles}
            </span>
          </div>

          {uploads.length > 0 ? (
            <div className="mt-4 grid max-h-[320px] gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
              {uploads.map((upload, index) => (
                <article key={upload.id} className="border border-stone-200 bg-white p-2">
                  <div className="relative aspect-[3/4] overflow-hidden bg-stone-900">
                    <img
                      src={upload.previewUrl}
                      alt={upload.file.name}
                      className={`h-full w-full object-cover ${upload.status === "error" ? "grayscale" : ""}`}
                    />
                    <span className="absolute left-2 top-2 bg-stone-900 px-2 py-1 text-[8px] font-bold uppercase tracking-wider text-white">
                      Cover {index + 1}
                    </span>
                    {upload.status === "uploading" || upload.status === "pending" ? (
                      <div className="absolute inset-x-0 bottom-0 bg-stone-900/90 p-2">
                        <div className="mb-1 flex justify-between text-[8px] font-bold uppercase tracking-wider text-white">
                          <span>Uploading</span>
                          <span>{upload.progress}%</span>
                        </div>
                        <div className="h-1 bg-white/20">
                          <div className="h-full bg-brand" style={{ width: `${upload.progress}%` }} />
                        </div>
                      </div>
                    ) : null}
                    {upload.status === "success" ? (
                      <span className="absolute right-2 top-2 bg-brand px-2 py-1 text-[8px] font-bold uppercase tracking-wider text-white">
                        Ready
                      </span>
                    ) : null}
                    {upload.status === "error" ? (
                      <button
                        type="button"
                        onClick={() => retryUpload(upload.id)}
                        className="absolute inset-0 flex items-center justify-center gap-2 bg-red-950/85 text-[9px] font-bold uppercase tracking-widest text-white"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Retry
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => removeUpload(upload.id)}
                      className="absolute bottom-2 right-2 inline-flex h-8 w-8 items-center justify-center border border-stone-900 bg-white text-stone-900 transition hover:bg-brand hover:text-white"
                      aria-label={`Remove ${upload.file.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="mt-2 min-w-0">
                    <p className="truncate text-[11px] font-bold text-stone-900">{upload.file.name}</p>
                    <p className="mt-1 text-[10px] font-mono text-stone-400">
                      {formatFileSize(upload.file.size)}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-4 flex min-h-[180px] items-center justify-center border border-dashed border-stone-300 bg-white p-8 text-center">
              <p className="font-serif text-xl italic text-stone-400">No cover photos uploaded.</p>
            </div>
          )}

          {lifecycle === "busy" ? (
            <p className="mt-3 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-stone-500">
              <LoadingMark />
              Uploading cover photos
            </p>
          ) : null}

          {error ? (
            <p className="mt-3 border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700">
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

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
