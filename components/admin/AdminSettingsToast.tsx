"use client";

import React, { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import * as Toast from "@radix-ui/react-toast";
import { AlertTriangle, CheckCircle2, X } from "lucide-react";

type AdminSettingsToastProps = Readonly<{
  status?: "success" | "failed" | undefined;
  message?: string | undefined;
}>;

export function AdminSettingsToast({
  status,
  message
}: AdminSettingsToastProps): React.JSX.Element {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(Boolean(status));

  const content = useMemo(() => {
    if (status === "success") {
      return {
        Icon: CheckCircle2,
        title: "Settings Saved",
        description: "Configuration changes are now active across the store.",
        iconClassName: "text-brand"
      };
    }

    if (status === "failed") {
      return {
        Icon: AlertTriangle,
        title: "Save Failed",
        description: message || "Configuration could not be saved. Review the form and try again.",
        iconClassName: "text-red-800"
      };
    }

    return null;
  }, [message, status]);

  useEffect(() => {
    if (!status) {
      return;
    }

    setIsOpen(true);
    window.history.replaceState(null, "", pathname);
  }, [pathname, status]);

  if (!content) {
    return <Toast.Provider />;
  }

  const Icon = content.Icon;

  return (
    <Toast.Provider swipeDirection="right" duration={5000}>
      <Toast.Root
        open={isOpen}
        onOpenChange={setIsOpen}
        className="grid w-[calc(100vw-2rem)] max-w-sm grid-cols-[auto_1fr_auto] items-start gap-3 border border-stone-200 bg-white p-4 text-stone-900 data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out data-[state=open]:fade-in data-[state=closed]:slide-out-to-right-4 data-[state=open]:slide-in-from-right-4"
      >
        <Icon className={`mt-0.5 h-4 w-4 ${content.iconClassName}`} aria-hidden="true" />
        <div className="min-w-0">
          <Toast.Title className="font-serif text-lg font-bold leading-none text-stone-900">
            {content.title}
          </Toast.Title>
          <Toast.Description className="mt-2 text-xs font-light leading-5 text-stone-600">
            {content.description}
          </Toast.Description>
        </div>
        <Toast.Close
          aria-label="Close notification"
          className="inline-flex h-7 w-7 items-center justify-center text-stone-500 transition hover:text-brand"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </Toast.Close>
      </Toast.Root>
      <Toast.Viewport className="fixed right-4 top-4 z-50 flex w-auto max-w-[calc(100vw-2rem)] list-none flex-col gap-3 outline-none md:right-6 md:top-6" />
    </Toast.Provider>
  );
}
