"use client";

import React from "react";
import { useFormStatus } from "react-dom";
import { LoadingMark } from "@/components/loading/LoadingMark";

type SubmitButtonProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children"> & Readonly<{
  children: React.ReactNode;
  pendingLabel?: string;
  icon?: React.ReactNode;
}>;

export function SubmitButton({
  children,
  pendingLabel = "Saving...",
  icon,
  className = "",
  disabled,
  type = "submit",
  ...props
}: SubmitButtonProps): React.JSX.Element {
  const { pending } = useFormStatus();
  const isDisabled = Boolean(disabled || pending);

  return (
    <button
      {...props}
      type={type}
      disabled={isDisabled}
      aria-busy={pending}
      className={className}
    >
      {pending ? <LoadingMark className="text-current" /> : icon}
      <span>{pending ? pendingLabel : children}</span>
    </button>
  );
}
