import { CartProvider } from "@/components/storefront/CartProvider";
import { StorefrontLayoutClient } from "@/components/storefront/StorefrontLayoutClient";
import { getStorefrontAnnouncement } from "@/lib/products";
import { logger } from "@/server/logger/logger";

type StorefrontLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default async function StorefrontLayout({
  children
}: StorefrontLayoutProps): Promise<React.JSX.Element> {
  let announcement = null;

  try {
    announcement = await getStorefrontAnnouncement();
  } catch (error) {
    // Log structured error using production logger, preventing layout crashes
    logger.error(
      { error: error instanceof Error ? error.message : String(error) },
      "Failed to retrieve storefront announcement"
    );
  }

  return (
    <CartProvider>
      <StorefrontLayoutClient announcement={announcement}>
        {children}
      </StorefrontLayoutClient>
    </CartProvider>
  );
}