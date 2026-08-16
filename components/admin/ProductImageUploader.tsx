"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle,
  GripVertical,
  ImagePlus,
  Link as LinkIcon,
  Trash2,
  UploadCloud
} from "lucide-react";

type UploadStatus = "ready" | "pending" | "uploading" | "error";

export type ProductImageUploaderItem = {
  id?: string;
  url: string;
  alt: string;
  sortOrder: number;
};

type UploadItem = ProductImageUploaderItem & {
  localId: string;
  fileName?: string;
  previewUrl?: string;
  progress: number;
  status: UploadStatus;
  error?: string | undefined;
};

type PresignResponse = {
  error?: unknown;
  uploadUrl?: string;
  publicUrl?: string;
  key?: string;
};

interface ProductImageUploaderProps {
  initialImages?: Array<ProductImageUploaderItem>;
}

function createLocalId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "Upload failed.";
}

function getLinkedImageAlt(url: string): string {
  try {
    const parsedUrl = new URL(url);
    const fileName = decodeURIComponent(parsedUrl.pathname.split("/").pop() || "product image");
    return fileName.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim() || parsedUrl.hostname;
  } catch {
    return "Product image";
  }
}

function parseImageLinks(value: string): Array<string> {
  const links = value
    .split(/[\n,]+/)
    .map((link) => link.trim())
    .filter(Boolean);
  const uniqueLinks = new Set<string>();

  for (const link of links) {
    const parsedUrl = new URL(link);

    if (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") {
      throw new Error("Only http and https image links are supported.");
    }

    uniqueLinks.add(parsedUrl.toString());
  }

  return Array.from(uniqueLinks);
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
      } else {
        reject(new Error("Storage upload failed."));
      }
    };

    xhr.onerror = () => reject(new Error("Network error during upload."));
    xhr.send(file);
  });
}

export function ProductImageUploader({
  initialImages = []
}: ProductImageUploaderProps): React.JSX.Element {
  const previewUrlsRef = useRef<Set<string>>(new Set());
  const [linkInput, setLinkInput] = useState("");
  const [linkError, setLinkError] = useState<string | null>(null);
  const [items, setItems] = useState<Array<UploadItem>>(() =>
    initialImages.map((image, index) => ({
      ...image,
      localId: image.id || createLocalId(),
      sortOrder: image.sortOrder || index + 1,
      progress: 100,
      status: "ready"
    }))
  );

  useEffect(() => {
    return () => {
      previewUrlsRef.current.forEach((previewUrl) => URL.revokeObjectURL(previewUrl));
      previewUrlsRef.current.clear();
    };
  }, []);

  const uploadState = useMemo(() => {
    if (items.some((item) => item.status === "pending" || item.status === "uploading")) {
      return "busy";
    }

    if (items.some((item) => item.status === "error")) {
      return "error";
    }

    return "ready";
  }, [items]);

  const updateItem = useCallback((localId: string, patch: Partial<UploadItem>): void => {
    setItems((current) =>
      current.map((item) => (item.localId === localId ? { ...item, ...patch } : item))
    );
  }, []);

  const uploadFile = useCallback(
    async (localId: string, file: File): Promise<void> => {
      updateItem(localId, { status: "uploading", progress: 0, error: undefined });

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

        await uploadWithProgress(presignResult.uploadUrl, file, (progress) => {
          updateItem(localId, { progress });
        });

        updateItem(localId, {
          url: presignResult.publicUrl,
          progress: 100,
          status: "ready",
          error: undefined
        });
      } catch (error) {
        updateItem(localId, {
          status: "error",
          progress: 0,
          error: getErrorMessage(error)
        });
      }
    },
    [updateItem]
  );

  const handleFiles = useCallback(
    (fileList: FileList | null): void => {
      const files = Array.from(fileList || []).filter((file) => file.type.startsWith("image/"));
      if (files.length === 0) {
        return;
      }

      const startIndex = items.length;
      const nextItems = files.map((file, index): UploadItem => {
        const localId = createLocalId();
        const sortOrder = startIndex + index + 1;
        const previewUrl = URL.createObjectURL(file);
        previewUrlsRef.current.add(previewUrl);

        return {
          localId,
          fileName: file.name,
          previewUrl,
          url: "",
          alt: file.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " "),
          sortOrder,
          progress: 0,
          status: "pending"
        };
      });

      setItems((current) => [...current, ...nextItems]);
      nextItems.forEach((item, index) => {
        const file = files[index];
        if (file) {
          void uploadFile(item.localId, file);
        }
      });
    },
    [items.length, uploadFile]
  );

  const handleAddLinks = useCallback(
    (event: React.FormEvent<HTMLFormElement>): void => {
      event.preventDefault();
      setLinkError(null);

      try {
        const links = parseImageLinks(linkInput);

        if (links.length === 0) {
          setLinkError("Paste at least one image link.");
          return;
        }

        const existingUrls = new Set(items.map((item) => item.url));
        const startIndex = items.length;
        const nextItems = links
          .filter((link) => !existingUrls.has(link))
          .map((link, index): UploadItem => ({
            localId: createLocalId(),
            url: link,
            alt: getLinkedImageAlt(link),
            sortOrder: startIndex + index + 1,
            progress: 100,
            status: "ready"
          }));

        if (nextItems.length === 0) {
          setLinkError("Those image links are already attached.");
          return;
        }

        setItems((current) => [...current, ...nextItems]);
        setLinkInput("");
      } catch {
        setLinkError("Paste valid http or https image links.");
      }
    },
    [items, linkInput]
  );

  const removeItem = useCallback((localId: string): void => {
    setItems((current) => {
      const target = current.find((item) => item.localId === localId);
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
        previewUrlsRef.current.delete(target.previewUrl);
      }

      return current.filter((item) => item.localId !== localId);
    });
  }, []);

  return (
    <div className="space-y-5">
      <input type="hidden" name="uploadState" value={uploadState} />

      <label
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          handleFiles(event.dataTransfer.files);
        }}
        className="flex min-h-44 cursor-pointer flex-col items-center justify-center gap-3 border border-dashed border-stone-300 bg-[#FAFAF8] px-5 py-8 text-center transition hover:border-brand hover:bg-brand-light/40 rounded-none"
      >
        <UploadCloud className="h-7 w-7 text-brand" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-stone-900">
          Drop product images together
        </span>
        <span className="max-w-[46ch] text-xs font-light leading-6 text-stone-500">
          Select cover and spread images in one batch. Each file uploads directly to storage with its own progress.
        </span>
        <input
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={(event) => {
            handleFiles(event.target.files);
            event.target.value = "";
          }}
        />
      </label>

      <form onSubmit={handleAddLinks} className="border border-stone-200 bg-white p-4 rounded-none">
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-stone-500">
          <LinkIcon className="h-3.5 w-3.5 text-brand" />
          Add image links
        </div>
        <textarea
          value={linkInput}
          onChange={(event) => {
            setLinkInput(event.target.value);
            setLinkError(null);
          }}
          rows={3}
          placeholder="Paste Blogger CDN or image URLs, one per line"
          className="mt-3 w-full border border-stone-200 bg-[#FAFAF8] px-3 py-2 text-xs leading-5 outline-none transition focus:border-brand rounded-none"
        />
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[11px] font-light leading-5 text-stone-500">
            Blogger links such as blogger.googleusercontent.com are supported, along with uploaded files.
          </p>
          <button
            type="submit"
            className="h-10 bg-stone-900 px-5 text-[10px] font-bold uppercase tracking-widest text-white transition hover:bg-brand rounded-none"
          >
            Add Links
          </button>
        </div>
        {linkError ? <p className="mt-2 text-[11px] font-medium text-red-600">{linkError}</p> : null}
      </form>

      {items.length === 0 ? (
        <div className="border border-stone-200 bg-white p-6 text-xs font-light text-stone-500 rounded-none">
          No product images attached yet.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item, index) => {
            const isReady = item.status === "ready" && item.url;
            const previewSource = item.previewUrl || item.url;

            return (
              <div key={item.localId} className="border border-stone-200 bg-white rounded-none">
                {isReady ? (
                  <>
                    <input type="hidden" name="imageUrl" value={item.url} />
                    <input type="hidden" name="imageAlt" value={item.alt} />
                    <input type="hidden" name="imageSortOrder" value={item.sortOrder} />
                  </>
                ) : null}

                <div className="relative aspect-[4/5] overflow-hidden border-b border-stone-200 bg-[#FAFAF8] rounded-none">
                  {previewSource ? (
                    <img
                      src={previewSource}
                      alt={item.alt || item.fileName || "Product upload preview"}
                      className={`h-full w-full object-cover transition ${
                        item.status === "uploading" || item.status === "pending" ? "opacity-60" : "opacity-100"
                      }`}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <ImagePlus className="h-8 w-8 text-stone-300" />
                    </div>
                  )}

                  <div className="absolute left-3 top-3 flex items-center gap-2 bg-stone-900 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                    <GripVertical className="h-3 w-3" />
                    {index === 0 ? "Cover" : `Image ${index + 1}`}
                  </div>

                  <button
                    type="button"
                    onClick={() => removeItem(item.localId)}
                    className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center border border-stone-900 bg-white text-stone-900 transition hover:bg-brand hover:text-white rounded-none"
                    aria-label="Remove product image"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>

                  {item.status === "uploading" || item.status === "pending" ? (
                    <div className="absolute bottom-0 left-0 right-0 bg-stone-900/80 p-3">
                      <div className="mb-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-white">
                        <span>Uploading</span>
                        <span>{item.progress}%</span>
                      </div>
                      <div className="h-1 bg-white/30">
                        <div className="h-full bg-brand transition-all" style={{ width: `${item.progress}%` }} />
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="space-y-3 p-4">
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider">
                    {item.status === "ready" ? (
                      <>
                        <CheckCircle className="h-3.5 w-3.5 text-emerald-700" />
                        <span className="text-emerald-700">Ready</span>
                      </>
                    ) : item.status === "error" ? (
                      <>
                        <AlertCircle className="h-3.5 w-3.5 text-red-700" />
                        <span className="text-red-700">{item.error || "Upload failed"}</span>
                      </>
                    ) : (
                      <span className="text-stone-400">Authorizing upload</span>
                    )}
                  </div>

                  <label className="block text-[9px] font-bold uppercase tracking-wider text-stone-400">
                    Alt text
                    <input
                      type="text"
                      value={item.alt}
                      onChange={(event) => updateItem(item.localId, { alt: event.target.value })}
                      className="mt-1.5 h-9 w-full border border-stone-200 bg-[#FAFAF8] px-3 text-xs outline-none transition focus:border-brand rounded-none"
                    />
                  </label>

                  <label className="block text-[9px] font-bold uppercase tracking-wider text-stone-400">
                    Sort order
                    <input
                      type="number"
                      min={1}
                      value={item.sortOrder}
                      onChange={(event) =>
                        updateItem(item.localId, {
                          sortOrder: Number.parseInt(event.target.value || "0", 10)
                        })
                      }
                      className="mt-1.5 h-9 w-full border border-stone-200 bg-[#FAFAF8] px-3 text-xs font-mono outline-none transition focus:border-brand rounded-none"
                    />
                  </label>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}