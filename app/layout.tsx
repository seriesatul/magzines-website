import { Suspense } from "react";
import type { Metadata, Viewport } from "next";
import "./globals.css";
import { siteConfig } from "@/config/site";
import { ToastProvider } from "@/components/ToastProvider";
import { AuthSessionProvider } from "@/components/auth/AuthSessionProvider";
import { NavigationLoadingIndicator } from "@/components/loading/NavigationLoadingIndicator";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  authors: [{ name: siteConfig.name }],
  creator: siteConfig.name,
  openGraph: {
    title: siteConfig.name,
    description: siteConfig.description,
    url: siteConfig.url,
    siteName: siteConfig.name,
    locale: "en_IN",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.name,
    description: siteConfig.description
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#C1440E"
};

type RootLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps): React.JSX.Element {
  return (
    <html lang="en-IN" suppressHydrationWarning className="scroll-smooth" data-scroll-behavior="smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;700&family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700;1,900&display=swap"
        />
      </head>
      <body className="bg-stone-50 font-sans text-stone-900 antialiased selection:bg-brand/10 selection:text-brand">
        <AuthSessionProvider>
          <Suspense fallback={null}>
            <NavigationLoadingIndicator />
          </Suspense>
          {children}
          <ToastProvider />
        </AuthSessionProvider>
      </body>
    </html>
  );
}

