"use client";

import React, { useState, useMemo, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { type StorefrontProductDetails } from "@/lib/products";
import { formatPaise } from "@/server/db/money";
import { RevealOnScroll } from "@/components/storefront/RevealOnScroll";

const FALLBACK_PRODUCT_IMAGE =
  "https://images.unsplash.com/photo-1495020689067-958852a7765e?auto=format&fit=crop&w=1200&q=80";

interface ProductDetailClientProps {
  product: StorefrontProductDetails;
}

// Track R2 upload status per file dynamically
interface PhotoUploadState {
  id: string; // Unique file ID (filename + size)
  file: File;
  progress: number; // 0 to 100
  status: "pending" | "uploading" | "success" | "error";
  key?: string;
  publicUrl?: string;
  localPreviewUrl: string;
}

interface LocalCartItem {
  productId: string;
  name: string;
  pricePaise: number;
  quantity: number;
  customMessage: string;
  uploadLaterOnWhatsApp: boolean;
  photos: Array<{
    key: string;
    url: string;
    name: string;
    size: number;
  }>;
  imageUrl: string;
}

export function ProductDetailClient({ product }: ProductDetailClientProps): React.JSX.Element {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [customMessage, setCustomMessage] = useState("");
  const [uploadLater, setUploadLater] = useState(false);
  
  // Track direct R2 uploads in progress (Rule 4.2 & 4.3)
  const [photoUploads, setPhotoUploads] = useState<PhotoUploadState[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [addSuccess, setAddSuccess] = useState(false);

  // Dynamic Date calculation
  const deliveryEstimate = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() + product.productionDays + 4);

    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const months = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];

    const dayName = days[date.getDay()];
    const dayNum = date.getDate();
    const monthName = months[date.getMonth()];

    return `Arrives by ${dayName}, ${dayNum} ${monthName}`;
  }, [product.productionDays]);

  // Size/Type limits
  const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    processAndUploadFiles(Array.from(e.target.files));
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      processAndUploadFiles(Array.from(e.dataTransfer.files));
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

      const id = `${file.name}-${file.size}-${Date.now()}`;
      newUploads.push({
        id,
        file,
        progress: 0,
        status: "pending",
        localPreviewUrl: URL.createObjectURL(file)
      });
    }

    setPhotoUploads((prev) => {
      const combined = [...prev, ...newUploads];
      if (combined.length > product.maxPhotos) {
        setValidationError(`Maximum photo limit exceeded. This format is capped at ${product.maxPhotos} photos.`);
        return prev;
      }
      
      // Instantly trigger parallel background uploads for all added files
      newUploads.forEach((item) => uploadFileToR2(item.id, item.file));
      return combined;
    });
  };

  // Perform Direct Browser-to-R2 progressive upload (Rule 4.1 & 4.2)
  const uploadFileToR2 = async (id: string, file: File) => {
    updateUploadStatus(id, { status: "uploading", progress: 0 });

    try {
      // 1. Fetch secure pre-signed PUT signature from our API
      const presignRes = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
          fileSize: file.size
        })
      });

      const presignData = await presignRes.json();

      if (!presignRes.ok || !presignData.uploadUrl) {
        throw new Error(presignData.error || "Presigning authorization failed");
      }

      // 2. Perform direct upload using standard XHR to track progress events natively
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", presignData.uploadUrl, true);
      xhr.setRequestHeader("Content-Type", file.type);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded / event.total) * 100);
          updateUploadStatus(id, { progress: percentComplete });
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200) {
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

      xhr.onerror = () => {
        updateUploadStatus(id, { status: "error" });
      };

      xhr.send(file);
    } catch {
      updateUploadStatus(id, { status: "error" });
    }
  };

  const updateUploadStatus = (id: string, updates: Partial<PhotoUploadState>) => {
    setPhotoUploads((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  };

  const removeUpload = (id: string) => {
    setPhotoUploads((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target) {
        URL.revokeObjectURL(target.localPreviewUrl); // Revoke memory link cleanly
      }
      return prev.filter((item) => item.id !== id);
    });
    setValidationError(null);
  };

  const retryUpload = (id: string) => {
    const target = photoUploads.find((item) => item.id === id);
    if (target) {
      uploadFileToR2(id, target.file);
    }
  };

  // 3. Add to Persistent Local Cart
  const handleAddToCart = () => {
    setValidationError(null);

    // Filter uploads
    const successfulUploads = photoUploads.filter((item) => item.status === "success");
    const activeUploads = photoUploads.filter((item) => item.status === "uploading" || item.status === "pending");
    const failedUploads = photoUploads.filter((item) => item.status === "error");

    if (!uploadLater) {
      if (activeUploads.length > 0) {
        setValidationError("Please wait for your photos to finish uploading before adding to cart.");
        return;
      }
      if (failedUploads.length > 0) {
        setValidationError("Some of your photos failed to upload. Please click 'Retry' or remove them.");
        return;
      }
      if (successfulUploads.length < product.minPhotos) {
        setValidationError(
          `Please attach at least ${product.minPhotos} photos to order this layout, or toggle the "Upload later via WhatsApp" switch.`
        );
        return;
      }
    }

    setIsAdding(true);

    try {
      const existingCartRaw = localStorage.getItem("hearts-and-beans-cart");
      const cart: LocalCartItem[] = existingCartRaw ? JSON.parse(existingCartRaw) : [];

      const cartItem: LocalCartItem = {
        productId: product.id,
        name: product.name,
        pricePaise: product.pricePaise,
        quantity: 1,
        customMessage,
        uploadLaterOnWhatsApp: uploadLater,
        // Map permanent R2 storage keys and public links into cart item
        photos: uploadLater
          ? []
          : successfulUploads.map((item) => ({
              key: item.key || "",
              url: item.publicUrl || "",
              name: item.file.name,
              size: item.file.size
            })),
        imageUrl: product.imageUrl
      };

      cart.push(cartItem);
      localStorage.setItem("hearts-and-beans-cart", JSON.stringify(cart));

      setAddSuccess(true);
      setTimeout(() => {
        setAddSuccess(false);
      }, 2500);
    } catch {
      setValidationError("Failed to save item to cart. Please try again.");
    } finally {
      setIsAdding(false);
    }
  };

  const isOutOfStock = product.stockQuantity <= 0;

  return (
    <main className="bg-[#FAFAF8] text-[#0A0A0A] p-6 md:p-12 min-h-screen">
      <div className="mx-auto max-w-[1440px] grid lg:grid-cols-[1.1fr_0.9fr] gap-12 lg:gap-16 pt-6">
        
        {/* Left Column: Image Galleries */}
        <div className="space-y-6">
          <RevealOnScroll className="relative w-full aspect-[4/5] border border-stone-200 overflow-hidden bg-white">
            <Image
              src={product.images[activeImageIndex]?.url || FALLBACK_PRODUCT_IMAGE}
              alt={product.images[activeImageIndex]?.alt || product.imageAlt}
              fill
              priority
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-cover scale-100 hover:scale-[1.04] transition duration-500 ease-editorial"
            />
          </RevealOnScroll>

          {/* Secondary Thumbnail Swapper */}
          {product.images.length > 1 && (
            <div className="grid grid-cols-4 gap-2">
              {product.images.map((img, i) => (
                <button
                  key={`${product.id}-thumbnail-${i}`}
                  onClick={() => setActiveImageIndex(i)}
                  className={`relative aspect-[4/5] border transition duration-200 ${
                    activeImageIndex === i ? "border-brand border-2" : "border-stone-200"
                  }`}
                >
                  <Image src={img.url} alt={img.alt} fill className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Custom Configuration Panel */}
        <div className="flex flex-col justify-center">
          <RevealOnScroll className="space-y-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-brand">
                Premium Format / {product.productionDays} Days Crafting
              </p>
              <h1 className="mt-4 font-serif text-5xl font-black leading-[0.95] text-stone-900 md:text-6xl">
                {product.name}
              </h1>
              <p className="mt-4 text-xl font-bold text-stone-900">
                {formatPaise(product.pricePaise)}
              </p>
              <p className="mt-6 text-sm font-light leading-7 text-stone-600">
                {product.description}
              </p>
            </div>

            {/* Dynamic Estimated Delivery Box */}
            <div className="bg-stone-50 border border-stone-200/80 p-4 rounded-none text-xs flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="font-semibold text-stone-900">{deliveryEstimate}</span>
              <span className="text-stone-400 font-mono">| Metro Express Courier</span>
            </div>

            {/* Special Dedication Textarea */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-500">
                  Custom Dedication (Optional)
                </label>
                <span className="text-[10px] text-stone-400 font-mono">
                  {customMessage.length}/250 chars
                </span>
              </div>
              <textarea
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value.slice(0, 250))}
                placeholder="Write your custom spine title, year, or a short message to print on page 1..."
                className="w-full min-h-[90px] p-4 text-sm bg-white border border-stone-200 focus:outline-none focus:border-brand rounded-none resize-none font-light placeholder:text-stone-400"
              />
            </div>

            {/* Photos Upload Switcher */}
            <div className="space-y-6">
              <div className="flex items-center justify-between border-t border-stone-200 pt-6">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-stone-900">
                    Upload photos later on WhatsApp?
                  </h3>
                  <p className="text-[11px] text-stone-500 font-light mt-1">
                    Toggle this if you do not have your photos ready right now.
                  </p>
                </div>
                <button
                  onClick={() => setUploadLater(!uploadLater)}
                  className={`w-12 h-6 flex items-center p-1 cursor-pointer transition duration-300 rounded-none ${
                    uploadLater ? "bg-brand" : "bg-stone-300"
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 shadow-sm transition duration-300 ${
                      uploadLater ? "translate-x-6" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Dynamic Dropper Zone */}
              {!uploadLater ? (
                <div className="space-y-4 transition duration-300">
                  <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider text-stone-500">
                    <span>Select photos ({product.minPhotos}-{product.maxPhotos} required)</span>
                    <span className="font-mono text-stone-900">
                      {photoUploads.filter((item) => item.status === "success").length} / {product.maxPhotos} Uploaded
                    </span>
                  </div>

                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                    className="border border-dashed border-stone-300 hover:border-brand bg-white p-8 text-center cursor-pointer transition duration-200"
                  >
                    <input
                      type="file"
                      multiple
                      id="photo-uploader"
                      className="hidden"
                      onChange={handleFileChange}
                      accept="image/*"
                    />
                    <label htmlFor="photo-uploader" className="cursor-pointer block space-y-2">
                      <span className="block text-xs font-bold uppercase tracking-wider text-stone-900">
                        Drag & Drop or click to select
                      </span>
                      <span className="block text-[11px] text-stone-400">
                        PNG, JPG, or WEBP formats up to 10MB per image
                      </span>
                    </label>
                  </div>

                  {/* Attachment Progress Previews & Grids (Rule 4.2 & 4.3) */}
                  {photoUploads.length > 0 && (
                    <div className="grid grid-cols-5 md:grid-cols-6 gap-2 max-h-[220px] overflow-y-auto border border-stone-200 p-3 bg-white">
                      {photoUploads.map((item) => (
                        <div
                          key={item.id}
                          className="relative aspect-square border border-stone-200 group overflow-hidden bg-stone-950"
                        >
                          <Image
                            src={item.localPreviewUrl}
                            alt="Attached uploader thumbnail"
                            fill
                            className={`object-cover transition-opacity duration-300 ${
                              item.status === "uploading" || item.status === "pending" ? "opacity-40" : "opacity-100"
                            }`}
                          />

                          {/* Progress bar overlay indicator */}
                          {(item.status === "uploading" || item.status === "pending") && (
                            <div className="absolute inset-0 flex flex-col justify-end p-1.5 bg-stone-950/40">
                              <span className="text-[10px] font-mono text-white font-bold leading-none mb-1">
                                {item.progress}%
                              </span>
                              <div className="w-full h-1 bg-white/20 overflow-hidden">
                                <div className="h-full bg-brand transition-all" style={{ width: `${item.progress}%` }} />
                              </div>
                            </div>
                          )}

                          {/* Success checkmark overlay */}
                          {item.status === "success" && (
                            <div className="absolute top-1 right-1 bg-emerald-600 text-white rounded-none p-0.5 text-[8px] uppercase tracking-wider font-bold">
                              OK
                            </div>
                          )}

                          {/* Error overlay with retry options */}
                          {item.status === "error" && (
                            <div className="absolute inset-0 bg-red-950/80 flex flex-col items-center justify-center p-1 text-center space-y-1">
                              <span className="text-[8px] text-red-200 font-bold uppercase leading-none">Failed</span>
                              <button
                                onClick={() => retryUpload(item.id)}
                                className="text-[9px] text-white underline font-bold uppercase tracking-wider"
                              >
                                Retry
                              </button>
                            </div>
                          )}

                          {/* Remove overlay button */}
                          <button
                            onClick={() => removeUpload(item.id)}
                            className="absolute inset-0 bg-stone-950/70 opacity-0 group-hover:opacity-100 flex items-center justify-center transition duration-150 text-white text-[9px] uppercase font-black"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-stone-50 border border-dashed border-stone-300 p-5 space-y-2 transition duration-300">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#C1440E]">
                    Order now, Upload on WhatsApp later
                  </h4>
                  <p className="text-[11px] text-stone-500 leading-5 font-light">
                    You can finish your checkout securely now. Once your payment confirms, our direct Meta WhatsApp API 
                    system will message you with a step-by-step layout guide and a secure link to upload your {product.minPhotos} photos directly over chat.
                  </p>
                </div>
              )}
            </div>

            {/* Validation errors */}
            {validationError && (
              <div className="text-xs text-red-600 bg-red-50 border border-red-200 p-3 rounded-none font-medium">
                {validationError}
              </div>
            )}

            {/* Action buy buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-stone-200">
              <button
                onClick={handleAddToCart}
                disabled={isOutOfStock || isAdding}
                className={`flex-1 h-14 inline-flex items-center justify-center text-xs uppercase font-bold tracking-widest text-white transition duration-300 rounded-none ${
                  isOutOfStock
                    ? "bg-stone-300 cursor-not-allowed text-stone-500"
                    : addSuccess
                    ? "bg-emerald-600"
                    : "bg-stone-900 hover:bg-brand"
                }`}
              >
                {isOutOfStock ? "Out of Stock" : isAdding ? "Saving to Cart..." : addSuccess ? "Added to Cart! ✓" : "Start your order"}
              </button>
              <Link
                href="/#products"
                className="h-14 inline-flex items-center justify-center border border-stone-300 text-stone-900 text-xs uppercase font-bold tracking-widest px-8 rounded-none hover:border-brand hover:text-brand transition duration-300 bg-white"
              >
                Back to collection
              </Link>
            </div>
          </RevealOnScroll>
        </div>

      </div>
    </main>
  );
}