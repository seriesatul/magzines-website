"use client";

import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

type SettingFieldInputProps = Readonly<{
  name: string;
  defaultValue: string;
  placeholder?: string | undefined;
  kind: "rupees" | "number" | "text" | "url" | "email" | "secret";
}>;

export function SettingFieldInput({
  name,
  defaultValue,
  placeholder,
  kind
}: SettingFieldInputProps): React.JSX.Element {
  const [isSecretVisible, setIsSecretVisible] = useState(false);
  const isSecret = kind === "secret";

  return (
    <div className="relative mt-3">
      <input
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        type={isSecret && !isSecretVisible ? "password" : getInputType(kind)}
        inputMode={kind === "rupees" || kind === "number" ? "decimal" : undefined}
        autoComplete="off"
        className="h-11 w-full border border-stone-200 bg-white px-3 pr-11 font-sans text-sm text-stone-900 outline-none transition focus:border-brand"
      />
      {isSecret ? (
        <button
          type="button"
          onClick={() => setIsSecretVisible((current) => !current)}
          aria-label={isSecretVisible ? "Hide secret" : "Show secret"}
          title={isSecretVisible ? "Hide secret" : "Show secret"}
          className="absolute right-1 top-1 inline-flex h-9 w-9 items-center justify-center text-stone-500 transition hover:text-brand"
        >
          {isSecretVisible ? (
            <EyeOff className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Eye className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
      ) : null}
    </div>
  );
}

function getInputType(kind: SettingFieldInputProps["kind"]): string {
  if (kind === "url") {
    return "url";
  }

  if (kind === "email") {
    return "email";
  }

  return "text";
}
