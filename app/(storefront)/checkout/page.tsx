import type { Metadata } from "next";
import { auth } from "@/auth";
import { CheckoutClient } from "@/components/checkout/CheckoutClient";
import { getCheckoutSettings } from "@/lib/checkout-settings";

export const metadata: Metadata = {
  title: "Checkout | Hearts & Beans",
  description: "Complete your custom magazine order with secure payment options."
};

export default async function CheckoutPage(): Promise<React.JSX.Element> {
  const [session, checkoutSettings] = await Promise.all([
    auth(),
    getCheckoutSettings()
  ]);

  return <CheckoutClient session={session} checkoutSettings={checkoutSettings} />;
}
