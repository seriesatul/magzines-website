import { CartProvider } from "@/components/storefront/CartProvider";
import { StorefrontLayoutClient } from "@/components/storefront/StorefrontLayoutClient";
import { getPublicContactSettings } from "@/server/services/settings";

type StorefrontLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default async function StorefrontLayout({
  children
}: StorefrontLayoutProps): Promise<React.JSX.Element> {
  const contactSettings = await getPublicContactSettings();

  return (
    <CartProvider>
      <StorefrontLayoutClient contactSettings={contactSettings}>
        {children}
      </StorefrontLayoutClient>
    </CartProvider>
  );
}
