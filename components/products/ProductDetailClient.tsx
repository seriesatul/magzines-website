"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, ImagePlus, Trash2 } from "lucide-react";
import { type StorefrontProductDetails } from "@/lib/products";
import { formatPaise } from "@/server/db/money";
import { RevealOnScroll } from "@/components/storefront/RevealOnScroll";
import { useCart } from "@/components/storefront/CartProvider";
import { type PhotobookCartItem } from "@/types/photobook";
import { LoadingMark } from "@/components/loading/LoadingMark";

const FALLBACK_PRODUCT_IMAGE =
  "https://images.unsplash.com/photo-1495020689067-958852a7765e?auto=format&fit=crop&w=1200&q=80";

type UploadStatus = "pending" | "uploading" | "success" | "error";

type PhotoUploadState = {
  id: string;
  file: File;
  progress: number;
  status: UploadStatus;
  key?: string;
  publicUrl?: string;
  localPreviewUrl: string;
};

interface ProductDetailClientProps {
  product: StorefrontProductDetails;
}

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const DIRECT_CHECKOUT_STORAGE_KEY = "hearts-and-beans-direct-checkout";

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "Upload failed.";
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ProductDetailClient({ product }: ProductDetailClientProps): React.JSX.Element {
  const router = useRouter();
  const { addItem } = useCart();
  const previewUrlsRef = useRef<Set<string>>(new Set());
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [customizationDescription, setCustomizationDescription] = useState("");
  const [photoUploads, setPhotoUploads] = useState<PhotoUploadState[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [addSuccess, setAddSuccess] = useState(false);

  useEffect(() => {
    return () => {
      previewUrlsRef.current.forEach((previewUrl) => URL.revokeObjectURL(previewUrl));
      previewUrlsRef.current.clear();
    };
  }, []);

  const successfulUploads = useMemo(
    () =>
      photoUploads.filter(
        (item): item is PhotoUploadState & { publicUrl: string } =>
          item.status === "success" && Boolean(item.publicUrl)
      ),
    [photoUploads]
  );

  const deliveryEstimate = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() + product.productionDays + 4);

    return `Arrives by ${date.toLocaleDateString("en-IN", {
      weekday: "long",
      day: "numeric",
      month: "long"
    })}`;
  }, [product.productionDays]);

  const updateUploadStatus = (id: string, updates: Partial<PhotoUploadState>) => {
    setPhotoUploads((current) =>
      current.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  };

  const uploadFileToR2 = async (id: string, file: File) => {
    updateUploadStatus(id, { status: "uploading", progress: 0 });

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
      const presignData = await presignResponse.json();

      if (!presignResponse.ok || !presignData.uploadUrl) {
        throw new Error(getErrorMessage(presignData.error) || "Could not authorize upload.");
      }

      const xhr = new XMLHttpRequest();
      xhr.open("PUT", presignData.uploadUrl, true);
      xhr.setRequestHeader("Content-Type", file.type);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          updateUploadStatus(id, { progress: Math.round((event.loaded / event.total) * 100) });
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          updateUploadStatus(id, {
            status: "success",
            progress: 100,
            key: presignData.key,
            publicUrl: presignData.publicUrl
          });
        } else {
          updateUploadStatus(id, { status: "error" });
        }
      };
      xhr.onerror = () => updateUploadStatus(id, { status: "error" });
      xhr.send(file);
    } catch {
      updateUploadStatus(id, { status: "error" });
    }
  };

  const processAndUploadFiles = (files: File[]) => {
    setValidationError(null);
    const newUploads: PhotoUploadState[] = [];

    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        setValidationError(`Invalid file type: ${file.name}. Only JPEG, PNG, and WEBP are allowed.`);
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        setValidationError(`File too large: ${file.name}. Each photo must be smaller than 10MB.`);
        return;
      }

      const localPreviewUrl = URL.createObjectURL(file);
      const id = `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      previewUrlsRef.current.add(localPreviewUrl);

      newUploads.push({
        id,
        file,
        progress: 0,
        status: "pending",
        localPreviewUrl
      });
    }

    setPhotoUploads((current) => {
      if (current.length + newUploads.length > product.maxPhotos) {
        newUploads.forEach((upload) => {
          URL.revokeObjectURL(upload.localPreviewUrl);
          previewUrlsRef.current.delete(upload.localPreviewUrl);
        });
        setValidationError(`Maximum photo limit exceeded. This format is capped at ${product.maxPhotos} photos.`);
        return current;
      }

      newUploads.forEach((item) => {
        void uploadFileToR2(item.id, item.file);
      });

      return [...current, ...newUploads];
    });
  };

  const removeUpload = (id: string) => {
    const target = photoUploads.find((item) => item.id === id);

    setPhotoUploads((current) => {
      if (target) {
        URL.revokeObjectURL(target.localPreviewUrl);
        previewUrlsRef.current.delete(target.localPreviewUrl);
      }
      return current.filter((item) => item.id !== id);
    });
  };

  const retryUpload = (id: string) => {
    const target = photoUploads.find((item) => item.id === id);
    if (target) {
      void uploadFileToR2(id, target.file);
    }
  };

  const createCartItem = (): PhotobookCartItem | null => {
    setValidationError(null);

    const activeUploads = photoUploads.filter(
      (item) => item.status === "uploading" || item.status === "pending"
    );
    const failedUploads = photoUploads.filter((item) => item.status === "error");

    if (activeUploads.length > 0) {
      setValidationError("Please wait for your photos to finish uploading before continuing.");
      return null;
    }

    if (failedUploads.length > 0) {
      setValidationError("Some photos failed to upload. Retry or remove them before checkout.");
      return null;
    }

    if (successfulUploads.length < product.minPhotos) {
      setValidationError(`Upload at least ${product.minPhotos} photos for this format.`);
      return null;
    }

    const description = customizationDescription.trim();
    const uploadedPhotos = successfulUploads.map((item) => ({
      key: item.key || "",
      url: item.publicUrl,
      name: item.file.name,
      size: item.file.size,
      mimeType: item.file.type
    }));

    const cartItem: PhotobookCartItem = {
      id: `${product.id}-${Date.now()}`,
      productId: product.id,
      slug: product.slug,
      name: product.name,
      pricePaise: product.pricePaise,
      quantity: 1,
      ...(description ? { customMessage: description } : {}),
      uploadLaterOnWhatsApp: false,
      photos: uploadedPhotos,
      photosCount: uploadedPhotos.length,
      layoutMetadata: [],
      imageUrl: product.imageUrl,
      imageAlt: product.imageAlt
    };

    return cartItem;
  };

  const handleAddToCart = () => {
    const cartItem = createCartItem();

    if (!cartItem) {
      return;
    }

    setIsAdding(true);
    addItem(cartItem, 1);
    setAddSuccess(true);
    setIsAdding(false);
    window.setTimeout(() => setAddSuccess(false), 2500);
  };

  const handlePlaceOrder = () => {
    const cartItem = createCartItem();

    if (!cartItem) {
      return;
    }

    setIsPlacingOrder(true);
    window.localStorage.setItem(DIRECT_CHECKOUT_STORAGE_KEY, JSON.stringify(cartItem));
    router.push("/checkout?mode=direct");
  };

  const isOutOfStock = product.stockQuantity <= 0;

  return (
    <main className="min-h-screen bg-[#FAFAF8] px-5 py-8 text-[#0A0A0A] md:px-8 md:py-10">
      <div className="mx-auto grid max-w-[1440px] gap-8 xl:grid-cols-[0.86fr_1.14fr] xl:items-start">
        <div className="space-y-4 xl:sticky xl:top-24">
          <RevealOnScroll className="relative aspect-[4/5] w-full overflow-hidden border border-stone-200 bg-white xl:max-h-[calc(100svh-170px)]">
            <Image
              src={product.images[activeImageIndex]?.url || FALLBACK_PRODUCT_IMAGE}
              alt={product.images[activeImageIndex]?.alt || product.imageAlt}
              fill
              priority
              sizes="(min-width: 1280px) 42vw, 100vw"
              className="object-cover transition duration-500 ease-editorial hover:scale-[1.04]"
            />
          </RevealOnScroll>

          {product.images.length > 1 ? (
            <div className="grid grid-cols-4 gap-2">
              {product.images.map((image, index) => (
                <button
                  key={`${product.id}-thumbnail-${index}`}
                  type="button"
                  onClick={() => setActiveImageIndex(index)}
                  className={`relative aspect-[4/5] overflow-hidden border transition duration-200 ${
                    activeImageIndex === index ? "border-2 border-brand" : "border-stone-200"
                  }`}
                >
                  <Image src={image.url} alt={image.alt} fill sizes="120px" className="object-cover" />
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <RevealOnScroll className="border border-stone-200 bg-white p-4 md:p-6">
          <div className="grid gap-5 border-b border-stone-200 pb-5 xl:grid-cols-[minmax(0,1fr)_220px] xl:items-end">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-brand">
                Premium Format / {product.productionDays} Days Crafting
              </p>
              <h1 className="mt-3 font-serif text-4xl font-black leading-[0.95] tracking-[-0.03em] text-stone-900 md:text-5xl">
                <span className="font-black not-italic">{product.name}</span>
                <span className="font-normal italic"> Custom</span>
              </h1>
              <p className="mt-4 max-w-[62ch] text-sm font-light leading-6 text-stone-600">
                {product.description}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs xl:grid-cols-1">
              <div className="border border-stone-200 bg-[#FAFAF8] p-3">
                <p className="text-[9px] font-bold uppercase tracking-widest text-stone-400">Price</p>
                <p className="mt-1 font-mono text-sm font-bold text-stone-900">{formatPaise(product.pricePaise)}</p>
              </div>
              <div className="border border-stone-200 bg-[#FAFAF8] p-3">
                <p className="text-[9px] font-bold uppercase tracking-widest text-stone-400">Delivery</p>
                <p className="mt-1 text-[11px] font-medium leading-4 text-stone-900">{deliveryEstimate}</p>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(320px,0.95fr)_minmax(360px,1fr)]">
            <section className="space-y-4">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="border border-stone-200 bg-[#FAFAF8] p-3">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-stone-400">Uploaded</p>
                  <p className="font-serif text-2xl font-black text-stone-900">{successfulUploads.length}</p>
                </div>
                <div className="border border-stone-200 bg-[#FAFAF8] p-3">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-stone-400">Required</p>
                  <p className="font-serif text-2xl font-black text-stone-900">{product.minPhotos}</p>
                </div>
                <div className="border border-stone-200 bg-[#FAFAF8] p-3">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-stone-400">Limit</p>
                  <p className="font-serif text-2xl font-black text-stone-900">{product.maxPhotos}</p>
                </div>
              </div>

              <label
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  processAndUploadFiles(Array.from(event.dataTransfer.files));
                }}
                className="flex min-h-[240px] cursor-pointer flex-col items-center justify-center gap-4 border border-dashed border-stone-300 bg-[#FAFAF8] p-8 text-center transition hover:border-brand"
              >
                <span className="flex h-14 w-14 items-center justify-center border border-stone-900 bg-white text-brand">
                  <ImagePlus className="h-6 w-6" />
                </span>
                <span className="font-serif text-2xl font-black leading-none text-stone-900">
                  Upload <span className="font-normal italic text-stone-700">Original Photos</span>
                </span>
                <span className="max-w-[38ch] text-xs font-light leading-5 text-stone-500">
                  Drop files here or select from your device. We upload the original image files without resizing or compression.
                </span>
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={(event) => {
                    processAndUploadFiles(Array.from(event.target.files || []));
                    event.target.value = "";
                  }}
                />
              </label>

              <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">
                JPG, PNG, or WEBP / Up to 10MB each
              </p>
            </section>

            <section className="space-y-4">
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-400">
                Customization description
                <textarea
                  value={customizationDescription}
                  onChange={(event) => setCustomizationDescription(event.target.value.slice(0, 1000))}
                  placeholder="Describe your cover text, page sequence, theme, captions, cropping notes, or any special print instructions..."
                  className="mt-2 min-h-[150px] w-full resize-none border border-stone-200 bg-[#FAFAF8] p-4 text-sm font-light leading-6 outline-none placeholder:text-stone-400 focus:border-brand"
                />
              </label>

              <div className="border border-stone-200 bg-[#FAFAF8] p-4">
                <div className="flex items-center justify-between gap-4 border-b border-stone-200 pb-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-brand">
                    Client Photos
                  </p>
                  <span className="text-[10px] font-mono text-stone-400">
                    {photoUploads.length}/{product.maxPhotos}
                  </span>
                </div>

                {photoUploads.length > 0 ? (
                  <div className="mt-4 grid max-h-[360px] gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
                    {photoUploads.map((upload) => (
                      <article key={upload.id} className="group border border-stone-200 bg-white p-2">
                        <div className="relative aspect-square overflow-hidden bg-stone-900">
                          <img
                            src={upload.localPreviewUrl}
                            alt={upload.file.name}
                            className={`h-full w-full object-cover ${
                              upload.status === "error" ? "grayscale" : ""
                            }`}
                          />
                          {upload.status === "uploading" || upload.status === "pending" ? (
                            <div className="absolute inset-x-0 bottom-0 bg-stone-900/90 p-2">
                              <div className="mb-1 flex justify-between text-[8px] font-bold uppercase tracking-wider text-white">
                                <span>Uploading Original</span>
                                <span>{upload.progress}%</span>
                              </div>
                              <div className="h-1 bg-white/20">
                                <div className="h-full bg-brand" style={{ width: `${upload.progress}%` }} />
                              </div>
                            </div>
                          ) : null}
                          {upload.status === "success" ? (
                            <span className="absolute right-2 top-2 bg-brand px-2 py-1 text-[8px] font-bold uppercase tracking-wider text-white">
                              Uploaded
                            </span>
                          ) : null}
                          {upload.status === "error" ? (
                            <button
                              type="button"
                              onClick={() => retryUpload(upload.id)}
                              className="absolute inset-0 flex items-center justify-center bg-red-950/85 text-[9px] font-bold uppercase tracking-widest text-white"
                            >
                              Retry Upload
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => removeUpload(upload.id)}
                            className="absolute left-2 top-2 flex h-8 w-8 items-center justify-center border border-stone-900 bg-white text-stone-900 transition hover:bg-brand hover:text-white"
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
                  <div className="mt-4 border border-dashed border-stone-300 bg-white p-8 text-center">
                    <p className="font-serif text-xl italic text-stone-400">No photos uploaded yet.</p>
                  </div>
                )}
              </div>

              {validationError ? (
                <div className="border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700">
                  {validationError}
                </div>
              ) : null}

              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={handlePlaceOrder}
                    disabled={isOutOfStock || isPlacingOrder}
                    className={`inline-flex h-14 items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest text-white transition duration-200 ${
                      isOutOfStock
                        ? "cursor-not-allowed bg-stone-300 text-stone-600"
                        : "bg-stone-900 hover:bg-brand"
                    }`}
                  >
                    {isOutOfStock ? (
                      "Out of Stock"
                    ) : isPlacingOrder ? (
                      <>
                        <LoadingMark />
                        Opening Checkout...
                      </>
                    ) : (
                      <>
                        Place order
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleAddToCart}
                    disabled={isOutOfStock || isAdding || isPlacingOrder}
                    className={`inline-flex h-14 items-center justify-center gap-2 border text-xs font-bold uppercase tracking-widest transition duration-200 ${
                      isOutOfStock
                        ? "cursor-not-allowed border-stone-200 bg-stone-100 text-stone-400"
                        : addSuccess
                          ? "border-emerald-700 bg-emerald-50 text-emerald-700"
                          : "border-stone-900 bg-white text-stone-900 hover:border-brand hover:text-brand"
                    }`}
                  >
                    {isAdding ? (
                      <>
                        <LoadingMark />
                        Adding...
                      </>
                    ) : addSuccess ? (
                      <>
                        <Check className="h-4 w-4" />
                        Added to Cart
                      </>
                    ) : (
                      "Add to Cart"
                    )}
                  </button>
                </div>
                <Link
                  href="/#products"
                  className="inline-flex h-11 w-full items-center justify-center border border-stone-300 bg-white px-6 text-xs font-bold uppercase tracking-widest text-stone-900 transition duration-200 hover:border-brand hover:text-brand"
                >
                  Back to collection
                </Link>
              </div>
            </section>
          </div>
        </RevealOnScroll>
      </div>
    </main>
  );
}
