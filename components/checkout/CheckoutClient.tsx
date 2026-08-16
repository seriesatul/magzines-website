"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import Script from "next/script";
import { useRouter, useSearchParams } from "next/navigation";
import type { Session } from "next-auth";
import { signIn } from "next-auth/react";
import {
  CheckCircle,
  ChevronLeft,
  CreditCard,
  Landmark,
  Mail,
  ShoppingBag,
  ShieldCheck,
  Truck,
  X,
  type LucideIcon
} from "lucide-react";
import { useCart } from "@/components/storefront/CartProvider";
import { formatPaise } from "@/server/db/money";
import { INDIAN_STATES } from "@/server/validators/checkout";
import type { PhotobookCartItem } from "@/types/photobook";
import type { CheckoutSettings } from "@/lib/checkout-settings";
import { LoadingMark } from "@/components/loading/LoadingMark";
import {
  CoverPhotoUploader,
  type CoverUploadLifecycle,
  type UploadedCoverPhoto
} from "@/components/checkout/CoverPhotoUploader";

type RazorpayCheckoutResponse = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type RazorpayOptions = {
  key: string;
  amount: number;
  currency: "INR";
  name: string;
  description: string;
  order_id: string;
  handler: (response: RazorpayCheckoutResponse) => Promise<void>;
  prefill: {
    name: string;
    email: string;
    contact: string;
  };
  notes: {
    address: string;
  };
  theme: {
    color: string;
  };
};

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => { open: () => void };
  }
}

type CheckoutPaymentType = "PREPAID" | "COD" | "PARTIAL_COD";

type CheckoutClientProps = {
  session: Session | null;
  checkoutSettings: CheckoutSettings;
};

type PlacedOrder = {
  orderId: string;
  orderNumber: string;
};

type PaymentOption = {
  type: CheckoutPaymentType;
  title: string;
  description: string;
  icon: LucideIcon;
  disabledReason?: string;
};

const PHONE_REGEX = /^[6-9]\d{9}$/;
const PINCODE_REGEX = /^[1-9][0-9]{5}$/;
const DIRECT_CHECKOUT_STORAGE_KEY = "hearts-and-beans-direct-checkout";

export function CheckoutClient({
  session,
  checkoutSettings
}: CheckoutClientProps): React.JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { items, clearCart } = useCart();
  const isDirectCheckout = searchParams.get("mode") === "direct";

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [line1, setLine1] = useState("");
  const [line2, setLine2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentType, setPaymentType] = useState<CheckoutPaymentType>("PREPAID");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [pendingOrder, setPendingOrder] = useState<PlacedOrder | null>(null);
  const [signupEmail, setSignupEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpMessage, setOtpMessage] = useState<string | null>(null);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [directCheckoutItem, setDirectCheckoutItem] = useState<PhotobookCartItem | null>(null);
  const [hasLoadedDirectCheckout, setHasLoadedDirectCheckout] = useState(false);
  const [coverPhotos, setCoverPhotos] = useState<UploadedCoverPhoto[]>([]);
  const [coverUploadState, setCoverUploadState] = useState<CoverUploadLifecycle>("idle");

  useEffect(() => {
    if (session?.user?.name) {
      setCustomerName(session.user.name);
    }

    if (session?.user?.email) {
      setCustomerEmail(session.user.email);
    }
  }, [session]);

  useEffect(() => {
    if (!isDirectCheckout) {
      setHasLoadedDirectCheckout(true);
      return;
    }

    try {
      const rawItem = window.localStorage.getItem(DIRECT_CHECKOUT_STORAGE_KEY);
      if (!rawItem) {
        setDirectCheckoutItem(null);
        return;
      }

      const parsedItem = JSON.parse(rawItem) as PhotobookCartItem;
      setDirectCheckoutItem(parsedItem);
    } catch {
      setDirectCheckoutItem(null);
    } finally {
      setHasLoadedDirectCheckout(true);
    }
  }, [isDirectCheckout]);

  const checkoutItems = useMemo(() => {
    if (isDirectCheckout) {
      return directCheckoutItem ? [directCheckoutItem] : [];
    }

    return items;
  }, [directCheckoutItem, isDirectCheckout, items]);

  const checkoutSubtotalPaise = useMemo(() => {
    return checkoutItems.reduce(
      (sum, item) => sum + item.pricePaise * item.quantity,
      0
    );
  }, [checkoutItems]);

  useEffect(() => {
    if (!hasLoadedDirectCheckout) {
      return;
    }

    if (checkoutItems.length === 0 && !pendingOrder) {
      router.replace("/cart");
    }
  }, [checkoutItems.length, hasLoadedDirectCheckout, pendingOrder, router]);

  const shippingFeePaise = useMemo(() => {
    if (
      checkoutSubtotalPaise === 0 ||
      checkoutSubtotalPaise >= checkoutSettings.freeShippingThresholdPaise
    ) {
      return 0;
    }

    return checkoutSettings.defaultShippingFeePaise;
  }, [
    checkoutSettings.defaultShippingFeePaise,
    checkoutSettings.freeShippingThresholdPaise,
    checkoutSubtotalPaise
  ]);

  const paymentOptions = useMemo(
    () => buildPaymentOptions(checkoutSettings, checkoutSubtotalPaise),
    [checkoutSettings, checkoutSubtotalPaise]
  );

  const selectablePaymentTypes = useMemo(
    () => paymentOptions.filter((option) => !option.disabledReason).map((option) => option.type),
    [paymentOptions]
  );

  useEffect(() => {
    if (selectablePaymentTypes.length === 0) {
      return;
    }

    if (!selectablePaymentTypes.includes(paymentType)) {
      setPaymentType(selectablePaymentTypes[0] ?? "PREPAID");
    }
  }, [paymentType, selectablePaymentTypes]);

  const codFeePaise =
    paymentType === "PARTIAL_COD" && selectablePaymentTypes.includes("PARTIAL_COD")
      ? checkoutSettings.partialCodFeePaise
      : 0;
  const finalTotalPaise = checkoutSubtotalPaise + shippingFeePaise + codFeePaise;
  const payableNowPaise =
    paymentType === "PREPAID"
      ? finalTotalPaise
      : paymentType === "PARTIAL_COD"
        ? Math.min(checkoutSettings.partialCodAdvancePaise, finalTotalPaise)
        : 0;
  const payableOnDeliveryPaise = Math.max(finalTotalPaise - payableNowPaise, 0);

  function completeCheckout(order: PlacedOrder): void {
    setPendingOrder(order);
    setSignupEmail(customerEmail.trim().toLowerCase());
    setOtp("");
    setOtpError(null);
    setOtpMessage(null);
  }

  function clearCheckoutState(): void {
    if (isDirectCheckout) {
      window.localStorage.removeItem(DIRECT_CHECKOUT_STORAGE_KEY);
      setDirectCheckoutItem(null);
      return;
    }

    clearCart();
  }

  function getOrderTrackingUrl(order: PlacedOrder): string {
    const params = new URLSearchParams({ success: "true" });
    const phoneCleaned = customerPhone.replace(/\D/g, "");

    if (phoneCleaned) {
      params.set("phone", phoneCleaned);
    }

    return `/orders/${order.orderNumber}?${params.toString()}`;
  }

  function finishCheckout(order: PlacedOrder): void {
    clearCheckoutState();
    router.push(getOrderTrackingUrl(order) as Route);
  }

  const handleCoverUploadsChange = useCallback((
    photos: UploadedCoverPhoto[],
    lifecycle: CoverUploadLifecycle
  ): void => {
    setCoverPhotos(photos);
    setCoverUploadState(lifecycle);
  }, []);

  async function handleGoogleSignup(order: PlacedOrder): Promise<void> {
    setOtpError(null);
    clearCheckoutState();

    await signIn("google", {
      callbackUrl: getOrderTrackingUrl(order)
    });
  }

  async function sendOtp(): Promise<void> {
    const email = signupEmail.toLowerCase().trim();

    if (!email) {
      setOtpError("Enter an email address to receive your verification code.");
      return;
    }

    setIsSendingOtp(true);
    setOtpError(null);
    setOtpMessage(null);

    try {
      const response = await fetch("/api/auth/otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(getResponseError(data.error, "We could not send your verification code."));
      }

      setSignupEmail(email);
      setOtp("");
      setOtpMessage("Verification code sent. It expires in 10 minutes.");
    } catch (error) {
      setOtpError(
        error instanceof Error
          ? error.message
          : "We could not send your verification code. Please try again."
      );
    } finally {
      setIsSendingOtp(false);
    }
  }

  async function verifyOtp(order: PlacedOrder): Promise<void> {
    const cleanEmail = signupEmail.toLowerCase().trim();
    const cleanOtp = otp.replace(/\D/g, "");

    if (!cleanEmail || cleanOtp.length !== 6) {
      setOtpError("Enter the 6-digit verification code from your email.");
      return;
    }

    setIsVerifyingOtp(true);
    setOtpError(null);

    try {
      const result = await signIn("otp", {
        email: cleanEmail,
        otp: cleanOtp,
        redirect: false
      });

      if (result?.error || !result?.ok) {
        throw new Error("That code is invalid or has expired.");
      }

      const claimResponse = await fetch("/api/orders/claim", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(order)
      });
      const claimData = await claimResponse.json();

      if (!claimResponse.ok) {
        throw new Error(getResponseError(claimData.error, "Your account was created, but the order could not be linked."));
      }

      finishCheckout(order);
    } catch (error) {
      setOtpError(
        error instanceof Error
          ? error.message
          : "We could not verify that code. Please try again."
      );
    } finally {
      setIsVerifyingOtp(false);
    }
  }

  function openRazorpayCheckout(data: {
    razorpayOrderId: string;
    razorpayKeyId: string;
    payableNowPaise: number;
    orderNumber: string;
  }): void {
    const options: RazorpayOptions = {
      key: data.razorpayKeyId,
      amount: data.payableNowPaise,
      currency: "INR",
      name: "Hearts & Beans",
      description: "Custom Magazine Print Order",
      order_id: data.razorpayOrderId,
      handler: async (response: RazorpayCheckoutResponse) => {
        setIsSubmitting(true);
        setValidationError(null);

        try {
          const verifyResponse = await fetch("/api/checkout/verify", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
              orderNumber: data.orderNumber
            })
          });

          const verifyData = await verifyResponse.json();

          if (!verifyResponse.ok) {
            throw new Error(getResponseError(verifyData.error, "Payment verification failed."));
          }

          completeCheckout({
            orderId: verifyData.orderId ?? "",
            orderNumber: verifyData.orderNumber ?? data.orderNumber
          });
        } catch (error) {
          setValidationError(
            error instanceof Error
              ? error.message
              : "Payment verification failed. Please contact support with your transaction ID."
          );
        } finally {
          setIsSubmitting(false);
        }
      },
      prefill: {
        name: customerName,
        email: customerEmail,
        contact: customerPhone
      },
      notes: {
        address: `${line1}, ${line2 || ""}, ${city}, ${state} - ${pincode}`
      },
      theme: {
        color: "#C1440E"
      }
    };

    const rzp = new window.Razorpay(options);
    rzp.open();
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setValidationError(null);

    const phoneCleaned = customerPhone.replace(/\D/g, "");
    if (!PHONE_REGEX.test(phoneCleaned)) {
      setValidationError("Please enter a valid 10-digit Indian mobile number.");
      return;
    }

    if (!PINCODE_REGEX.test(pincode.trim())) {
      setValidationError("Please enter a valid 6-digit Indian postal pincode.");
      return;
    }

    if (!state) {
      setValidationError("Please select your state or union territory.");
      return;
    }

    if (!selectablePaymentTypes.includes(paymentType)) {
      setValidationError("Please select an available payment method.");
      return;
    }

    if (checkoutSettings.coverPhotoUploadEnabled) {
      if (coverUploadState === "busy") {
        setValidationError("Please wait for your cover photos to finish uploading.");
        return;
      }

      if (coverUploadState === "error") {
        setValidationError("Some cover photos failed to upload. Retry or remove them before placing the order.");
        return;
      }

      if (
        checkoutSettings.coverPhotoUploadRequired &&
        coverPhotos.length < checkoutSettings.coverPhotoMinFiles
      ) {
        setValidationError(`Upload at least ${checkoutSettings.coverPhotoMinFiles} cover photo${checkoutSettings.coverPhotoMinFiles === 1 ? "" : "s"}.`);
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const payload = {
        customerName: customerName.trim(),
        customerPhone: phoneCleaned,
        customerEmail: customerEmail.trim() || undefined,
        line1: line1.trim(),
        line2: line2.trim() || undefined,
        city: city.trim(),
        state,
        pincode: pincode.trim(),
        notes: notes.trim() || undefined,
        paymentType,
        coverPhotos: checkoutSettings.coverPhotoUploadEnabled ? coverPhotos : [],
        items: checkoutItems.map((item) => ({
          id: item.productId || item.id,
          slug: item.slug,
          name: item.name,
          pricePaise: item.pricePaise,
          quantity: item.quantity,
          customMessage: item.customMessage || undefined,
          uploadLaterOnWhatsApp: item.uploadLaterOnWhatsApp || false,
          photosCount: item.photosCount || 0,
          photos: item.photos || [],
          layoutMetadata: item.layoutMetadata || []
        }))
      };

      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(getResponseError(data.error, "We were unable to place your order."));
      }

      if (data.payableNowPaise > 0 && data.razorpayOrderId) {
        openRazorpayCheckout({
          razorpayOrderId: data.razorpayOrderId,
          razorpayKeyId: data.razorpayKeyId,
          payableNowPaise: data.payableNowPaise,
          orderNumber: data.orderNumber
        });
      } else {
        completeCheckout({
          orderId: data.orderId ?? "",
          orderNumber: data.orderNumber
        });
      }
    } catch (error) {
      setValidationError(
        error instanceof Error ? error.message : "Gateway connection failed. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!hasLoadedDirectCheckout) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#FAFAF8] px-6 text-[#0A0A0A]">
        <div className="border border-stone-200 bg-white p-6 text-sm font-medium text-stone-600">
          Preparing checkout...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FAFAF8] text-[#0A0A0A]">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />

      <section className="mx-auto max-w-[1200px] px-6 py-20 md:py-28">
        <div className="mb-6 flex items-center gap-3 text-brand">
          <ShoppingBag className="h-4 w-4" />
          <p className="text-xs font-semibold uppercase tracking-wider">Secure Checkout</p>
        </div>

        <div className="grid items-start gap-12 lg:grid-cols-[1.2fr_0.8fr]">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="border border-stone-200 bg-white p-6 md:p-8">
              <h2 className="border-b border-stone-100 pb-4 text-2xl font-semibold text-stone-900">
                Contact details
              </h2>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <Field label="Full name">
                  <input
                    required
                    value={customerName}
                    onChange={(event) => setCustomerName(event.target.value)}
                    placeholder="John Doe"
                    className="mt-2 h-11 w-full border border-stone-200 bg-white px-4 text-sm outline-none focus-visible:border-brand"
                  />
                </Field>
                <Field label="Phone">
                  <input
                    required
                    type="tel"
                    value={customerPhone}
                    onChange={(event) => setCustomerPhone(event.target.value)}
                    placeholder="9876543210"
                    className="mt-2 h-11 w-full border border-stone-200 bg-white px-4 font-mono text-sm outline-none focus-visible:border-brand"
                  />
                </Field>
                <Field label="Email" className="sm:col-span-2">
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(event) => setCustomerEmail(event.target.value)}
                    placeholder="john@example.com"
                    className="mt-2 h-11 w-full border border-stone-200 bg-white px-4 text-sm outline-none focus-visible:border-brand"
                  />
                </Field>
              </div>
            </div>

            <div className="border border-stone-200 bg-white p-6 md:p-8">
              <h2 className="border-b border-stone-100 pb-4 text-2xl font-semibold text-stone-900">
                Shipping address
              </h2>
              <div className="mt-6 grid gap-4">
                <Field label="Address line 1">
                  <input
                    required
                    value={line1}
                    onChange={(event) => setLine1(event.target.value)}
                    placeholder="Flat, building, street"
                    className="mt-2 h-11 w-full border border-stone-200 bg-white px-4 text-sm outline-none focus-visible:border-brand"
                  />
                </Field>
                <Field label="Address line 2">
                  <input
                    value={line2}
                    onChange={(event) => setLine2(event.target.value)}
                    placeholder="Area, landmark"
                    className="mt-2 h-11 w-full border border-stone-200 bg-white px-4 text-sm outline-none focus-visible:border-brand"
                  />
                </Field>
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field label="City">
                    <input
                      required
                      value={city}
                      onChange={(event) => setCity(event.target.value)}
                      placeholder="Mumbai"
                      className="mt-2 h-11 w-full border border-stone-200 bg-white px-4 text-sm outline-none focus-visible:border-brand"
                    />
                  </Field>
                  <Field label="State">
                    <select
                      required
                      value={state}
                      onChange={(event) => setState(event.target.value)}
                      className="mt-2 h-11 w-full border border-stone-200 bg-white px-3 text-sm outline-none focus-visible:border-brand"
                    >
                      <option value="" disabled>
                        Select State
                      </option>
                      {INDIAN_STATES.map((stateName) => (
                        <option key={stateName} value={stateName}>
                          {stateName}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Pincode">
                    <input
                      required
                      value={pincode}
                      onChange={(event) => setPincode(event.target.value)}
                      placeholder="400001"
                      className="mt-2 h-11 w-full border border-stone-200 bg-white px-4 font-mono text-sm outline-none focus-visible:border-brand"
                    />
                  </Field>
                </div>
              </div>
            </div>

            <div className="border border-stone-200 bg-white p-6 md:p-8">
              <h2 className="border-b border-stone-100 pb-4 text-2xl font-semibold text-stone-900">
                Payment method
              </h2>
              <div className="mt-6 space-y-3">
                {paymentOptions.length > 0 ? (
                  paymentOptions.map((option) => {
                    const Icon = option.icon;
                    const isDisabled = Boolean(option.disabledReason);

                    return (
                      <label
                        key={option.type}
                        className={`flex items-center justify-between border p-4 transition ${
                          isDisabled
                            ? "cursor-not-allowed border-stone-200 bg-stone-50"
                            : paymentType === option.type
                              ? "cursor-pointer border-brand bg-brand/5"
                              : "cursor-pointer border-stone-200 hover:bg-stone-50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className="h-4 w-4 text-stone-600" />
                          <div>
                            <span className="block text-xs font-bold uppercase tracking-wider text-stone-900">
                              {option.title}
                            </span>
                            <span className="mt-0.5 block text-[11px] text-stone-500">
                              {option.disabledReason ?? option.description}
                            </span>
                          </div>
                        </div>
                        <input
                          type="radio"
                          name="paymentType"
                          disabled={isDisabled}
                          checked={paymentType === option.type}
                          onChange={() => setPaymentType(option.type)}
                          className="accent-brand"
                        />
                      </label>
                    );
                  })
                ) : (
                  <div className="border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
                    No payment methods are enabled right now. Please contact support.
                  </div>
                )}
              </div>
            </div>

            {checkoutSettings.coverPhotoUploadEnabled ? (
              <CoverPhotoUploader
                minFiles={checkoutSettings.coverPhotoMinFiles}
                maxFiles={checkoutSettings.coverPhotoMaxFiles}
                required={checkoutSettings.coverPhotoUploadRequired}
                helpText={checkoutSettings.coverPhotoHelpText}
                disabled={isSubmitting}
                onChange={handleCoverUploadsChange}
              />
            ) : null}

            <div className="border border-stone-200 bg-white p-6 md:p-8">
              <h2 className="border-b border-stone-100 pb-4 text-2xl font-semibold text-stone-900">
                Special notes
              </h2>
              <textarea
                rows={3}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                className="mt-6 w-full resize-none border border-stone-200 bg-[#FAFAF8] px-4 py-3 text-sm leading-6 outline-none placeholder:text-stone-400 focus-visible:border-brand"
                placeholder="Delivery timing, custom dedication, or photo preferences..."
              />
            </div>

            {validationError ? (
              <p className="border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-600">
                {validationError}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting || selectablePaymentTypes.length === 0}
              className="inline-flex h-14 w-full items-center justify-center bg-stone-900 px-8 text-xs font-bold uppercase tracking-widest text-white transition hover:bg-brand disabled:cursor-not-allowed disabled:bg-stone-300"
            >
              {isSubmitting ? (
                <span className="inline-flex items-center gap-2">
                  <LoadingMark />
                  Processing order...
                </span>
              ) : (
                "Place order"
              )}
            </button>
          </form>

          <aside className="sticky top-24 space-y-6 border border-stone-200 bg-white p-6 md:p-8">
            <p className="text-xs font-bold uppercase tracking-wider text-stone-400">
              Order summary
            </p>

            <div className="space-y-4 border-b border-stone-100 pb-6">
              {checkoutItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between text-sm text-stone-600"
                >
                  <div className="max-w-[70%]">
                    <span className="font-semibold text-stone-900">{item.name}</span>
                    <span className="ml-2 font-mono text-stone-400">x {item.quantity}</span>
                    {item.customMessage ? (
                      <span className="mt-0.5 block truncate text-[11px] text-stone-400">
                        Customization: {item.customMessage}
                      </span>
                    ) : null}
                    {item.uploadLaterOnWhatsApp ? (
                      <span className="mt-0.5 block text-[11px] text-brand">
                        Photos will be shared after ordering
                      </span>
                    ) : null}
                  </div>
                  <span className="font-mono font-semibold text-stone-950">
                    {formatPaise(item.pricePaise * item.quantity)}
                  </span>
                </div>
              ))}
            </div>

            {checkoutSettings.coverPhotoUploadEnabled ? (
              <div className="border-b border-stone-100 pb-6 text-sm text-stone-600">
                <SummaryRow
                  label="Cover photos"
                  value={`${coverPhotos.length}/${checkoutSettings.coverPhotoMaxFiles}`}
                  isPositive={coverPhotos.length >= checkoutSettings.coverPhotoMinFiles}
                />
              </div>
            ) : null}

            <div className="space-y-3 border-b border-stone-100 pb-6 text-sm text-stone-600">
              <SummaryRow label="Subtotal" value={formatPaise(checkoutSubtotalPaise)} />
              <SummaryRow
                label="Shipping"
                value={shippingFeePaise === 0 ? "FREE" : formatPaise(shippingFeePaise)}
                isPositive={shippingFeePaise === 0}
              />
              {codFeePaise > 0 ? (
                <SummaryRow label="Partial COD fee" value={formatPaise(codFeePaise)} />
              ) : null}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-base font-semibold text-stone-900">
                <span>Total due</span>
                <span className="font-mono text-xl font-black">{formatPaise(finalTotalPaise)}</span>
              </div>
              <div className="space-y-2 border-t border-stone-100 pt-3 text-sm text-stone-600">
                <SummaryRow label="Pay now" value={formatPaise(payableNowPaise)} />
                <SummaryRow
                  label="Pay on delivery"
                  value={formatPaise(payableOnDeliveryPaise)}
                />
              </div>
            </div>

            {!isDirectCheckout ? (
              <div className="flex pt-4">
                <Link
                  href="/cart"
                  className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-brand hover:underline"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Back to cart
                </Link>
              </div>
            ) : null}
          </aside>
        </div>
      </section>

      {pendingOrder ? (
        <PostCheckoutSignupDialog
          order={pendingOrder}
          email={signupEmail}
          otp={otp}
          error={otpError}
          message={otpMessage}
          isSendingOtp={isSendingOtp}
          isVerifyingOtp={isVerifyingOtp}
          onEmailChange={(value) => {
            setSignupEmail(value);
            setOtpError(null);
          }}
          onOtpChange={(value) => {
            setOtp(value.replace(/\D/g, "").slice(0, 6));
            setOtpError(null);
          }}
          onSendOtp={sendOtp}
          onVerifyOtp={() => verifyOtp(pendingOrder)}
          onGoogleSignup={() => handleGoogleSignup(pendingOrder)}
          onSkip={() => finishCheckout(pendingOrder)}
        />
      ) : null}
    </main>
  );
}

function Field({
  label,
  className,
  children
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <label className={`block text-xs font-bold uppercase tracking-wider text-stone-400 ${className ?? ""}`}>
      {label}
      {children}
    </label>
  );
}

function SummaryRow({
  label,
  value,
  isPositive = false
}: {
  label: string;
  value: string;
  isPositive?: boolean;
}): React.JSX.Element {
  return (
    <div className="flex items-center justify-between">
      <span>{label}</span>
      <span
        className={`font-mono font-semibold ${
          isPositive ? "text-emerald-700" : "text-stone-900"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function buildPaymentOptions(
  settings: CheckoutSettings,
  subtotalPaise: number
): PaymentOption[] {
  const options: PaymentOption[] = [];

  if (settings.paymentPrepaidEnabled) {
    options.push({
      type: "PREPAID",
      title: "Online payment",
      description: "Pay now using UPI, debit card, credit card, or netbanking.",
      icon: CreditCard
    });
  }

  if (settings.paymentPartialCodEnabled) {
    const disabledReason =
      subtotalPaise < settings.partialCodMinOrderPaise
        ? `Available above ${formatPaise(settings.partialCodMinOrderPaise)} order value.`
        : undefined;

    options.push({
      type: "PARTIAL_COD",
      title: `Partial COD (${formatPaise(settings.partialCodAdvancePaise)} advance)`,
      description: `Pay ${formatPaise(settings.partialCodAdvancePaise)} now and the balance on delivery.`,
      icon: Landmark,
      ...(disabledReason ? { disabledReason } : {})
    });
  }

  if (settings.paymentCodEnabled) {
    options.push({
      type: "COD",
      title: "Cash on delivery",
      description: "Pay the full amount when your order arrives.",
      icon: Truck
    });
  }

  return options;
}

function PostCheckoutSignupDialog({
  order,
  email,
  otp,
  error,
  message,
  isSendingOtp,
  isVerifyingOtp,
  onEmailChange,
  onOtpChange,
  onSendOtp,
  onVerifyOtp,
  onGoogleSignup,
  onSkip
}: {
  order: PlacedOrder;
  email: string;
  otp: string;
  error: string | null;
  message: string | null;
  isSendingOtp: boolean;
  isVerifyingOtp: boolean;
  onEmailChange: (value: string) => void;
  onOtpChange: (value: string) => void;
  onSendOtp: () => void;
  onVerifyOtp: () => void;
  onGoogleSignup: () => void;
  onSkip: () => void;
}): React.JSX.Element {
  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/65 px-4 py-6">
      <div className="grid max-h-[92vh] w-full max-w-4xl overflow-y-auto border border-stone-200 bg-white text-stone-900 md:grid-cols-[0.88fr_1.12fr]">
        <aside className="border-b border-stone-200 bg-[#0A0A0A] p-6 text-[#F0EDE8] md:border-b-0 md:border-r md:p-8">
          <div className="flex items-center gap-3 text-brand">
            <CheckCircle className="h-5 w-5" />
            <span className="text-[10px] font-bold uppercase tracking-widest">
              Order Placed
            </span>
          </div>
          <h2 className="mt-6 font-serif text-4xl font-black leading-none tracking-tight">
            Save this <span className="font-normal italic">order</span>
          </h2>
          <p className="mt-5 text-sm font-light leading-7 text-[#F0EDE8]/75">
            Create an account now to keep tracking, delivery details, and future reprints together.
          </p>
          <div className="mt-8 border border-white/15 bg-white/5 p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#F0EDE8]/45">
              Order Number
            </p>
            <p className="mt-2 break-all font-mono text-lg font-bold text-white">
              {order.orderNumber}
            </p>
          </div>
        </aside>

        <section className="relative p-6 md:p-8">
          <button
            type="button"
            onClick={onSkip}
            className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center border border-stone-200 text-stone-500 transition hover:border-brand hover:text-brand"
            aria-label="Skip account creation"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="max-w-xl pr-10">
            <div className="flex items-center gap-3 text-brand">
              <ShieldCheck className="h-4 w-4" />
              <p className="text-[10px] font-bold uppercase tracking-widest">
                Optional Account Setup
              </p>
            </div>
            <h3 className="mt-4 font-serif text-3xl font-black leading-none text-stone-900">
              Continue with <span className="font-normal italic">less friction</span>
            </h3>
            <p className="mt-4 text-sm font-light leading-7 text-stone-600">
              This is optional. Your order is already placed, and you can view it immediately.
            </p>
          </div>

          <div className="mt-8 space-y-5">
            <button
              type="button"
              onClick={onGoogleSignup}
              className="flex h-12 w-full items-center justify-center gap-3 border border-stone-900 bg-white px-5 text-xs font-bold uppercase tracking-widest text-stone-900 transition hover:bg-stone-900 hover:text-white"
            >
              <span className="font-serif text-lg font-black normal-case tracking-normal">G</span>
              Continue With Google
            </button>

            <div className="flex items-center gap-3">
              <span className="h-px flex-1 bg-stone-200" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400">
                Or verify by email
              </span>
              <span className="h-px flex-1 bg-stone-200" />
            </div>

            <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400">
              Email address
              <div className="relative mt-2">
                <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(event) => onEmailChange(event.target.value)}
                  placeholder="name@example.com"
                  className="h-11 w-full border border-stone-200 bg-[#FAFAF8] pl-11 pr-4 text-sm outline-none focus:border-brand"
                />
              </div>
            </label>

            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <input
                inputMode="numeric"
                value={otp}
                onChange={(event) => onOtpChange(event.target.value)}
                placeholder="6-digit code"
                className="h-12 border border-stone-200 bg-white px-4 text-center font-mono text-lg font-bold tracking-[0.28em] outline-none focus:border-brand"
                aria-label="6-digit email verification code"
              />
              <button
                type="button"
                onClick={onSendOtp}
                disabled={isSendingOtp}
                className="h-12 bg-stone-900 px-6 text-xs font-bold uppercase tracking-widest text-white transition hover:bg-brand disabled:cursor-not-allowed disabled:bg-stone-300"
              >
                {isSendingOtp ? (
                  <span className="inline-flex items-center gap-2">
                    <LoadingMark />
                    Sending...
                  </span>
                ) : (
                  "Send Code"
                )}
              </button>
            </div>

            {message ? (
              <p className="border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-700">
                {message}
              </p>
            ) : null}

            {error ? (
              <p className="border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
                {error}
              </p>
            ) : null}

            <button
              type="button"
              onClick={onVerifyOtp}
              disabled={isVerifyingOtp}
              className="flex h-12 w-full items-center justify-center bg-brand px-6 text-xs font-bold uppercase tracking-widest text-white transition hover:bg-stone-900 disabled:cursor-not-allowed disabled:bg-stone-300"
            >
              {isVerifyingOtp ? (
                <span className="inline-flex items-center gap-2">
                  <LoadingMark />
                  Verifying...
                </span>
              ) : (
                "Verify & Save"
              )}
            </button>

            <button
              type="button"
              onClick={onSkip}
              className="w-full text-left text-xs font-bold uppercase tracking-widest text-stone-400 underline decoration-stone-300 underline-offset-4 transition hover:text-brand hover:decoration-brand"
            >
              Skip & View Order
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

function getResponseError(value: unknown, fallback: string): string {
  if (typeof value === "string") {
    return value;
  }

  if (value && typeof value === "object") {
    return Object.values(value)
      .flat()
      .filter((entry): entry is string => typeof entry === "string")
      .join(" ");
  }

  return fallback;
}
