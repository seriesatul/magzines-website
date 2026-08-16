import type React from "react";
import { Eye, Lock, Shield } from "lucide-react";
import { siteConfig } from "@/config/site";
import { LegalDocumentPage } from "@/components/legal/LegalDocumentPage";
import { getLegalDocumentDefinition } from "@/lib/legal-documents";

export const dynamic = "force-dynamic";

export const metadata = {
  title: `Privacy Policy | ${siteConfig.name}`,
  description: "Review our data protection guidelines and secure file storage guarantees."
};

export default function PrivacyPolicyPage(): Promise<React.JSX.Element> {
  return LegalDocumentPage({
    definition: getLegalDocumentDefinition("privacy-policy"),
    cards: [
      {
        title: "Photo Security",
        description: "Uploaded photos are kept private and used only for custom magazine production.",
        icon: Lock
      },
      {
        title: "Payment Safety",
        description: "Payment details are processed through the configured payment gateway, not stored by Hearts & Beans.",
        icon: Shield
      },
      {
        title: "No Spam",
        description: "Contact details are used for essential order, verification, and delivery updates.",
        icon: Eye
      }
    ]
  });
}
