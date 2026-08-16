import type React from "react";
import { Calendar, MapPin, Truck } from "lucide-react";
import { siteConfig } from "@/config/site";
import { LegalDocumentPage } from "@/components/legal/LegalDocumentPage";
import { getLegalDocumentDefinition } from "@/lib/legal-documents";

export const dynamic = "force-dynamic";

export const metadata = {
  title: `Shipping & Delivery Policy | ${siteConfig.name}`,
  description: "Review our shipping rates, delivery timelines, and logistics carrier partnerships across India."
};

export default function ShippingPolicyPage(): Promise<React.JSX.Element> {
  return LegalDocumentPage({
    definition: getLegalDocumentDefinition("shipping"),
    cards: [
      {
        title: "National Delivery",
        description: "Custom magazines ship across serviceable Indian pincodes through courier partners.",
        icon: Truck
      },
      {
        title: "Careful Crafting",
        description: "Every order includes design, print, binding, packing, and dispatch preparation time.",
        icon: Calendar
      },
      {
        title: "Live Updates",
        description: "Order tracking keeps customers informed as the edition moves through delivery stages.",
        icon: MapPin
      }
    ]
  });
}
