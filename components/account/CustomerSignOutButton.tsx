"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

export function CustomerSignOutButton(): React.JSX.Element {
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleSignOut(): Promise<void> {
    setIsSigningOut(true);

    try {
      await signOut({ redirectTo: "/" });
    } catch {
      window.location.assign("/");
    }
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={isSigningOut}
      className="inline-flex h-11 w-full items-center justify-center gap-2 border border-stone-300 bg-white px-5 text-xs font-bold uppercase tracking-widest text-stone-900 transition duration-200 hover:border-brand hover:text-brand disabled:cursor-wait disabled:border-stone-200 disabled:text-stone-400"
    >
      <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
      {isSigningOut ? "Signing out..." : "Sign out"}
    </button>
  );
}
