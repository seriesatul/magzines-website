import React from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowLeft } from "lucide-react";
import { getLegalDocument, type LegalDocumentDefinition } from "@/lib/legal-documents";

type LegalTrustCard = {
  title: string;
  description: string;
  icon: LucideIcon;
};

type LegalDocumentPageProps = Readonly<{
  definition: LegalDocumentDefinition;
  cards: LegalTrustCard[];
}>;

export async function LegalDocumentPage({
  definition,
  cards
}: LegalDocumentPageProps): Promise<React.JSX.Element> {
  const document = await getLegalDocument(definition);
  const updatedAt = document.updatedAt
    ? new Intl.DateTimeFormat("en-IN", {
        day: "2-digit",
        month: "long",
        year: "numeric"
      }).format(document.updatedAt)
    : "Pending admin update";

  return (
    <main className="min-h-screen bg-[#FAFAF8] px-6 py-16 text-[#0A0A0A] md:py-24">
      <div className="mx-auto max-w-[800px] space-y-12">
        <div className="space-y-4 border-b border-stone-200 pb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-stone-400 transition hover:text-brand"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to homepage
          </Link>
          <h1 className="font-serif text-5xl font-black leading-none tracking-tight text-stone-900">
            {definition.headingLead} <br />
            <span className="font-normal italic text-stone-700">{definition.headingAccent}</span>
          </h1>
          <p className="text-xs font-mono text-stone-400">
            Last Updated: {updatedAt}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {cards.map((card) => {
            const Icon = card.icon;

            return (
              <div key={card.title} className="space-y-2 border border-stone-200 bg-white p-5">
                <Icon className="h-5 w-5 text-brand" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-900">{card.title}</h3>
                <p className="text-[11px] font-light leading-relaxed text-stone-500">{card.description}</p>
              </div>
            );
          })}
        </div>

        <article
          className="legal-document-content font-sans text-sm font-light leading-8 text-stone-600 md:text-base"
          dangerouslySetInnerHTML={{ __html: document.bodyHtml }}
        />
      </div>
    </main>
  );
}
