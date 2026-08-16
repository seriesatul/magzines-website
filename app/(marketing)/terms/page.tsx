import type React from "react";
import { CheckCircle, FileText, Scale } from "lucide-react";
import { siteConfig } from "@/config/site";
import { LegalDocumentPage } from "@/components/legal/LegalDocumentPage";
import { getLegalDocumentDefinition } from "@/lib/legal-documents";

export const dynamic = "force-dynamic";

export const metadata = {
  title: `Terms & Conditions | ${siteConfig.name}`,
  description: "Review our terms of service, custom print copy boundaries, and service governance guidelines."
};

export default function TermsPage(): Promise<React.JSX.Element> {
  return LegalDocumentPage({
    definition: getLegalDocumentDefinition("terms"),
    cards: [
      {
        title: "Legal Governance",
        description: "Terms are written for the custom magazine printing workflow and Indian storefront operations.",
        icon: Scale
      },
      {
        title: "Image Ownership",
        description: "Customers must own or have legal rights to all uploaded photographs and submitted copy.",
        icon: FileText
      },
      {
        title: "Print Quality",
        description: "High-resolution uploads help the design team produce a cleaner final printed edition.",
        icon: CheckCircle
      }
    ]
  });
}
