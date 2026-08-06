import React from "react";
import { LoadingMark } from "@/components/loading/LoadingMark";

type PageLoaderProps = Readonly<{
  label?: string;
}>;

export function PageLoader({
  label = "Preparing the page"
}: PageLoaderProps): React.JSX.Element {
  return (
    <main className="flex min-h-[100svh] items-center justify-center bg-[#FAFAF8] px-6 text-[#0A0A0A]">
      <section
        className="w-full max-w-xl border-y border-stone-200 py-10"
        aria-live="polite"
        aria-busy="true"
      >
        <div className="flex items-center gap-3 text-brand">
          <span className="h-px w-8 bg-brand" />
          <span className="text-[0.68rem] font-medium uppercase tracking-[0.12em]">
            Loading
          </span>
        </div>
        <h1 className="mt-5 font-serif text-4xl font-black leading-[0.95] tracking-[-0.03em] text-stone-900 md:text-5xl">
          Hearts & Beans <span className="font-normal italic">is opening</span>
        </h1>
        <div className="mt-8 flex items-center justify-between gap-6">
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-stone-500">
            {label}
          </p>
          <LoadingMark />
        </div>
        <div className="editorial-loading-rule mt-5 h-px w-full overflow-hidden bg-stone-200" />
      </section>
    </main>
  );
}
