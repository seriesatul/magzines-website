"use client";

import type React from "react";
import { SessionProvider } from "next-auth/react";

type AuthSessionProviderProps = Readonly<{
  children: React.ReactNode;
}>;

export function AuthSessionProvider({ children }: AuthSessionProviderProps): React.JSX.Element {
  return (
    <SessionProvider refetchOnWindowFocus refetchWhenOffline={false}>
      {children}
    </SessionProvider>
  );
}
