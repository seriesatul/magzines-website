import type React from "react";
import { HelpCircle, RefreshCw, XOctagon } from "lucide-react";
import { siteConfig } from "@/config/site";
import { LegalDocumentPage } from "@/components/legal/LegalDocumentPage";
import { getLegalDocumentDefinition } from "@/lib/legal-documents";

export const dynamic = "force-dynamic";

export const metadata = {
  title: `Refund & Cancellation Policy | ${siteConfig.name}`,
  description: "Review our custom magazine printing refund, replacement, and cancellation guidelines."
};

export default function RefundPolicyPage(): Promise<React.JSX.Element> {
  return LegalDocumentPage({
    definition: getLegalDocumentDefinition("refunds"),
    cards: [
      {
        title: "Custom Orders",
        description: "Each magazine is made from customer photos, so refund handling follows custom-product rules.",
        icon: XOctagon
      },
      {
        title: "Replacements",
        description: "Verified transit damage or manufacturing issues can be reviewed for replacement support.",
        icon: RefreshCw
      },
      {
        title: "Easy Support",
        description: "Customers can reach support through the active storefront contact channels.",
        icon: HelpCircle
      }
    ]
  });
}
