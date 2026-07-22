"use client";

import React, { useEffect, useState } from "react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getProviders, signIn } from "next-auth/react";
import { ArrowRight, KeyRound, Lock, Mail, ShieldCheck, ShoppingBag } from "lucide-react";

type LoginMode = "customer" | "admin";

const PASSWORD_PLACEHOLDER = "\u2022".repeat(8);

export default function SignInPage(): React.JSX.Element {
  const router = useRouter();

  const [loginMode, setLoginMode] = useState<LoginMode>("customer");
  const [callbackUrl, setCallbackUrl] = useState("/account");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isGoogleAvailable, setIsGoogleAvailable] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedMode = params.get("mode");
    const requestedCallbackUrl = params.get("callbackUrl");
    const signInError = params.get("error");
    const safeCallbackUrl = getSafeCallbackUrl(requestedCallbackUrl);

    setCallbackUrl(safeCallbackUrl);

    if (signInError) {
      setError(getAuthErrorMessage(signInError));
    }

    if (requestedMode === "admin" || safeCallbackUrl.startsWith("/admin")) {
      setLoginMode("admin");
      setCallbackUrl(safeCallbackUrl.startsWith("/admin") ? safeCallbackUrl : "/admin");
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    getProviders()
      .then((providers) => {
        if (isMounted) {
          setIsGoogleAvailable(Boolean(providers?.google));
        }
      })
      .catch(() => {
        if (isMounted) {
          setIsGoogleAvailable(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleGoogleSignIn(): Promise<void> {
    setError(null);
    setMessage(null);
    setIsSubmitting(true);

    try {
      await signIn("google", {
        redirectTo: callbackUrl
      });
    } catch {
      setError("Google sign-in could not be started. Please try again or use an email code.");
      setIsSubmitting(false);
    }
  }

  async function requestOtp(cleanEmail: string): Promise<void> {
    const response = await fetch("/api/auth/otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: cleanEmail })
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data?.error || "We could not send your verification code. Please try again.");
    }

    setIsOtpSent(true);
    setMessage(`We sent a 6-digit code to ${cleanEmail}.`);
  }

  async function verifyOtp(cleanEmail: string): Promise<void> {
    const cleanOtp = otp.replace(/\D/g, "");

    if (!/^\d{6}$/.test(cleanOtp)) {
      throw new Error("Please enter the 6-digit verification code.");
    }

    const result = await signIn("otp", {
      email: cleanEmail,
      otp: cleanOtp,
      redirectTo: callbackUrl,
      redirect: false
    });

    if (result?.error || !result?.ok) {
      throw new Error("The verification code is invalid or expired.");
    }

    router.push(callbackUrl as Route);
    router.refresh();
  }

  async function handleAdminSignIn(cleanEmail: string): Promise<void> {
    if (!password.trim()) {
      throw new Error("Please enter your administrator password.");
    }

    const result = await signIn("credentials", {
      email: cleanEmail,
      password: password.trim(),
      redirectTo: callbackUrl.startsWith("/admin") ? callbackUrl : "/admin",
      redirect: false
    });

    if (result?.error || !result?.ok) {
      throw new Error("Invalid administrator email or password credentials.");
    }

    router.push(callbackUrl.startsWith("/admin") ? (callbackUrl as Route) : "/admin");
    router.refresh();
  }

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setIsSubmitting(true);

    const cleanEmail = email.toLowerCase().trim();

    try {
      if (!cleanEmail) {
        throw new Error("Please enter a valid email address.");
      }

      if (loginMode === "admin") {
        await handleAdminSignIn(cleanEmail);
      } else if (isOtpSent) {
        await verifyOtp(cleanEmail);
      } else {
        await requestOtp(cleanEmail);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Sign in failed. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function toggleLoginMode(): void {
    setLoginMode(loginMode === "customer" ? "admin" : "customer");
    setEmail("");
    setOtp("");
    setPassword("");
    setError(null);
    setMessage(null);
    setIsOtpSent(false);
    setCallbackUrl(loginMode === "customer" ? "/admin" : "/account");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#FAFAF8] p-6 text-[#0A0A0A]">
      <div className="w-full max-w-[460px] space-y-8 border border-stone-200 bg-white p-8 md:p-10">
        <div className="space-y-3 text-left">
          <div className="flex items-center gap-2 text-brand">
            {loginMode === "customer" ? (
              <ShoppingBag className="h-4 w-4" />
            ) : (
              <ShieldCheck className="h-4 w-4" />
            )}
            <span className="text-xs font-bold uppercase tracking-wider">
              {loginMode === "customer" ? "Secure Access" : "Admin Panel Access"}
            </span>
          </div>
          <h1 className="font-serif text-4xl font-black leading-none tracking-tight text-stone-900">
            {loginMode === "customer" ? (
              <>
                Welcome back, <br />
                <span className="font-normal italic text-stone-700">Verify your email</span>
              </>
            ) : (
              <>
                Control Center, <br />
                <span className="font-normal italic text-stone-700">Administrator login</span>
              </>
            )}
          </h1>
          <p className="text-xs font-light leading-relaxed text-stone-500">
            {loginMode === "customer"
              ? isGoogleAvailable
                ? "Use Google or receive a 6-digit email code to access your client account."
                : "Receive a 6-digit email code to access your client account."
              : "Enter your administrator credentials to securely access the workshop panel."}
          </p>
        </div>

        {loginMode === "customer" && isGoogleAvailable ? (
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isSubmitting}
            className="flex h-12 w-full items-center justify-center gap-3 border border-stone-900 bg-white text-xs font-bold uppercase tracking-widest text-stone-900 transition duration-200 hover:bg-stone-900 hover:text-white disabled:border-stone-300 disabled:text-stone-400"
          >
            <span className="font-serif text-base font-black">G</span>
            Sign in with Google
          </button>
        ) : null}

        {loginMode === "customer" && isGoogleAvailable ? (
          <div className="flex items-center gap-3 text-[0.68rem] font-medium uppercase tracking-[0.12em] text-stone-400">
            <span className="h-px flex-1 bg-stone-200" />
            Email code
            <span className="h-px flex-1 bg-stone-200" />
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400">
            Email Address
            <input
              required
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setError(null);
                setMessage(null);
              }}
              placeholder="name@example.com"
              className="mt-2 h-11 w-full border border-stone-200 bg-[#FAFAF8] px-4 font-mono text-xs text-stone-900 outline-none focus:border-brand"
            />
          </label>

          {loginMode === "customer" && isOtpSent ? (
            <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400">
              Verification Code
              <input
                required
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(event) => {
                  setOtp(event.target.value.replace(/\D/g, "").slice(0, 6));
                  setError(null);
                }}
                placeholder="123456"
                className="mt-2 h-11 w-full border border-stone-200 bg-[#FAFAF8] px-4 font-mono text-xs tracking-[0.2em] text-stone-900 outline-none focus:border-brand"
              />
            </label>
          ) : null}

          {loginMode === "admin" ? (
            <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400">
              Password Key
              <input
                required
                type="password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setError(null);
                }}
                placeholder={PASSWORD_PLACEHOLDER}
                className="mt-2 h-11 w-full border border-stone-200 bg-[#FAFAF8] px-4 font-mono text-xs text-stone-900 outline-none focus:border-brand"
              />
            </label>
          ) : null}

          {message ? (
            <div className="border border-stone-200 bg-stone-50 p-3 text-xs font-light leading-relaxed text-stone-600">
              {message}
            </div>
          ) : null}

          {error ? (
            <div className="border border-red-100 bg-red-50 p-3 text-xs font-semibold text-red-700">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex h-12 w-full items-center justify-center gap-2 bg-stone-900 text-xs font-bold uppercase tracking-widest text-white transition duration-200 hover:bg-brand disabled:bg-stone-300"
          >
            {loginMode === "admin" ? (
              <Lock className="h-3.5 w-3.5" />
            ) : isOtpSent ? (
              <KeyRound className="h-3.5 w-3.5" />
            ) : (
              <Mail className="h-3.5 w-3.5" />
            )}
            {getSubmitLabel(loginMode, isOtpSent, isSubmitting)}
          </button>
        </form>

        {loginMode === "customer" && isOtpSent ? (
          <button
            type="button"
            onClick={() => {
              setIsOtpSent(false);
              setOtp("");
              setMessage(null);
              setError(null);
            }}
            className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-brand hover:underline"
          >
            Use a different email
            <ArrowRight className="h-3 w-3" />
          </button>
        ) : null}

        <div className="border-t border-stone-100 pt-4 text-center">
          <button
            type="button"
            onClick={toggleLoginMode}
            className="text-[10px] font-bold uppercase tracking-widest text-stone-400 transition duration-150 hover:text-brand"
          >
            {loginMode === "customer"
              ? "Are you an Administrator? Login here"
              : "Customer? Access your client account here"}
          </button>
        </div>

        <div className="text-center">
          <Link
            href="/"
            className="text-[11px] font-bold uppercase tracking-wider text-brand hover:underline"
          >
            Back to homepage
          </Link>
        </div>
      </div>
    </main>
  );
}

function getAuthErrorMessage(errorCode: string): string {
  switch (errorCode) {
    case "AccessDenied":
      return "Google could not verify that email address. Please use a verified Google account or request an email code.";
    case "OAuthAccountNotLinked":
      return "That email is already registered with another sign-in method. Please use your email code once, then try Google again.";
    case "Configuration":
      return "Google sign-in is not reachable right now. Please use an email code while the connection is checked.";
    case "Verification":
      return "That sign-in link is invalid or expired. Please request a fresh email code.";
    case "unauthorized_admin":
      return "Please sign in with an administrator account to access the control center.";
    default:
      return "Sign in failed. Please try again or use an email code.";
  }
}

function getSafeCallbackUrl(callbackUrl: string | null): string {
  if (!callbackUrl?.startsWith("/") || callbackUrl.startsWith("//")) {
    return "/account";
  }

  return callbackUrl;
}

function getSubmitLabel(loginMode: LoginMode, isOtpSent: boolean, isSubmitting: boolean): string {
  if (loginMode === "admin") {
    return isSubmitting ? "Authorizing..." : "Log In As Admin";
  }

  if (isOtpSent) {
    return isSubmitting ? "Verifying..." : "Verify Code";
  }

  return isSubmitting ? "Sending code..." : "Send Verification Code";
}
