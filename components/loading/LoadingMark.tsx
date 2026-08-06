import React from "react";

type LoadingMarkProps = Readonly<{
  className?: string;
}>;

export function LoadingMark({ className = "" }: LoadingMarkProps): React.JSX.Element {
  return (
    <span
      className={`editorial-loading-mark inline-flex h-3 w-6 items-end gap-1 ${className}`}
      aria-hidden="true"
    >
      <span />
      <span />
      <span />
    </span>
  );
}
