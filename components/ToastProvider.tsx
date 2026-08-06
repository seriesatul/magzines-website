"use client";

import { Toaster } from "sonner";

export function ToastProvider(): React.JSX.Element {
  return (
    <Toaster
      closeButton
      richColors
      position="top-right"
      toastOptions={{
        classNames: {
          toast: "rounded-none border-stone-200 font-sans",
          title: "text-sm font-medium",
          description: "text-xs font-light"
        }
      }}
    />
  );
}
