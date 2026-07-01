import type { Metadata } from "next";
import { auth } from "@/auth";
import { CheckoutClient } from "@/components/checkout/CheckoutClient";

export const metadata: Metadata = {
  title: "Checkout | Hearts & Beans",
  description: "Complete your custom magazine order with secure payment options."
};

export default async function CheckoutPage(): Promise<React.JSX.Element> {
  // Fetch active NextAuth v5 session to support pre-filled customer details
  const session = await auth();

  return (
    <CheckoutClient session={session} />
  );
}