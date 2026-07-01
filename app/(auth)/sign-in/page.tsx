"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Mail, ArrowRight, ShoppingBag, ShieldCheck, Lock } from "lucide-react";

export default function SignInPage(): React.JSX.Element {
  const router = useRouter();
  
  // Toggle state between passwordless customers and credentialed administrators
  const [loginMode, setLoginMode] = useState<"customer" | "admin">("customer");
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 1. Passwordless Customer Magic-Link Handler
  const handleCustomerSignIn = async (cleanEmail: string) => {
    try {
      const result = await signIn("resend", {
        email: cleanEmail,
        callbackUrl: "/account",
        redirect: false
      });

      if (result?.error) {
        throw new Error(result.error);
      }

      setIsSent(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "We were unable to send your magic link. Please check your credentials and try again."
      );
    }
  };

  // 2. Secured Admin Password Credentials Handler
  const handleAdminSignIn = async (cleanEmail: string) => {
    if (!password.trim()) {
      setError("Please enter your administrator password.");
      setIsSubmitting(false);
      return;
    }

    try {
      const result = await signIn("credentials", {
        email: cleanEmail,
        password: password.trim(),
        redirect: false
      });

      if (result?.error || !result?.ok) {
        throw new Error("Invalid administrator email or password credentials.");
      }

      // Successful login - route directly to the Admin Dashboard (Rule 7)
      router.push("/admin");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Sign in failed. Please verify your admin credentials and try again."
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const cleanEmail = email.toLowerCase().trim();
    if (!cleanEmail) {
      setError("Please enter a valid email address.");
      setIsSubmitting(false);
      return;
    }

    if (loginMode === "customer") {
      await handleCustomerSignIn(cleanEmail);
    } else {
      await handleAdminSignIn(cleanEmail);
    }

    setIsSubmitting(false);
  };

  const toggleLoginMode = () => {
    setLoginMode(loginMode === "customer" ? "admin" : "customer");
    setEmail("");
    setPassword("");
    setError(null);
    setIsSent(false);
  };

  return (
    <main className="bg-[#FAFAF8] text-[#0A0A0A] min-h-screen flex items-center justify-center p-6 select-none">
      <div className="w-full max-w-[440px] bg-white border border-stone-200 p-8 md:p-10 rounded-none space-y-8">
        
        {/* Conditional rendering based on mail dispatched status */}
        {!isSent ? (
          <>
            {/* Header Section */}
            <div className="space-y-3 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-2 text-brand">
                {loginMode === "customer" ? (
                  <ShoppingBag className="h-4 w-4" />
                ) : (
                  <ShieldCheck className="h-4 w-4" />
                )}
                <span className="text-xs font-bold uppercase tracking-wider">
                  {loginMode === "customer" ? "Secure Access" : "Admin Panel Access"}
                </span>
              </div>
              <h1 className="font-serif text-4xl font-black text-stone-900 tracking-tight leading-none">
                {loginMode === "customer" ? (
                  <>
                    Welcome back, <br />
                    <span className="font-normal italic text-stone-700">Sign in to client portal</span>
                  </>
                ) : (
                  <>
                    Control Center, <br />
                    <span className="font-normal italic text-stone-700">Administrator login</span>
                  </>
                )}
              </h1>
              <p className="text-xs font-light text-stone-500 leading-relaxed">
                {loginMode === "customer" 
                  ? "Enter your email address to receive a secure, passwordless magic link to log in."
                  : "Enter your administrator credentials to securely log in directly to your workshop panel."
                }
              </p>
            </div>

            {/* Core Sign-In Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400">
                Email Address
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError(null);
                  }}
                  placeholder="name@example.com"
                  className="mt-2 h-11 w-full bg-[#FAFAF8] border border-stone-200 px-4 text-xs font-mono focus:outline-none focus:border-brand rounded-none"
                />
              </label>

              {/* Password field - Only rendered in Admin Mode */}
              {loginMode === "admin" && (
                <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 animate-fade-in">
                  Password Key
                  <input
                    required
                    type="password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError(null);
                    }}
                    placeholder="••••••••"
                    className="mt-2 h-11 w-full bg-[#FAFAF8] border border-stone-200 px-4 text-xs font-mono focus:outline-none focus:border-brand rounded-none"
                  />
                </label>
              )}

              {/* Validation errors */}
              {error && (
                <div className="text-xs font-semibold text-red-600 bg-red-50 border border-red-100 p-3 rounded-none">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-12 bg-stone-900 hover:bg-brand text-white text-xs uppercase font-bold tracking-widest flex items-center justify-center gap-2 rounded-none transition duration-200 disabled:bg-stone-300"
              >
                {loginMode === "customer" ? <Mail className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                {isSubmitting 
                  ? (loginMode === "customer" ? "Sending link..." : "Authorizing...") 
                  : (loginMode === "customer" ? "Receive Magic Link" : "Log In As Admin")
                }
              </button>
            </form>

            {/* Dynamic Admin/Customer mode switcher trigger */}
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={toggleLoginMode}
                className="text-[10px] uppercase font-bold tracking-widest text-stone-400 hover:text-brand transition duration-150"
              >
                {loginMode === "customer" 
                  ? "Are you an Administrator? Login here" 
                  : "Customer? Access your client account here"
                }
              </button>
            </div>
          </>
        ) : (
          /* Inline Inbox success card (For Magic link dispatch) */
          <div className="space-y-6 text-center md:text-left transition-all duration-500 ease-editorial animate-fade-in">
            <div className="flex items-center justify-center md:justify-start gap-2 text-emerald-700">
              <Mail className="h-5 w-5" />
              <span className="text-xs font-bold uppercase tracking-wider">Check your inbox</span>
            </div>
            
            <h2 className="font-serif text-3xl font-black text-stone-900 tracking-tight leading-none">
              Link Dispatched.
            </h2>
            
            <p className="text-xs font-light text-stone-600 leading-relaxed">
              We have dispatched a secure, passwordless login link to <strong className="font-mono text-stone-900">{email}</strong>. 
              Open your email and click the link to instantly access your client account dashboard.
            </p>

            <div className="bg-stone-50 border border-stone-200 p-4 rounded-none text-[11px] text-stone-400 font-light leading-relaxed">
              *If the email doesn't arrive within 2 minutes, check your Spam/Junk folder or try requesting a new link.
            </div>

            <button
              onClick={() => {
                setIsSent(false);
                setEmail("");
              }}
              className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-brand hover:underline"
            >
              Request another link
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        )}

        <div className="pt-4 border-t border-stone-100 text-center">
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