import type { NextConfig } from "next";

const securityHeaders: Array<{ key: string; value: string }> = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(self), payment=(self)"
  }
];

type RemotePattern = NonNullable<NonNullable<NextConfig["images"]>["remotePatterns"]>[number];

function hasPlaceholderValue(value: string): boolean {
  const normalized = value.toLowerCase();

  return (
    normalized.includes("replace-with") ||
    normalized.includes("your_") ||
    normalized.includes("your-") ||
    normalized.includes("yourbucketdomain") ||
    normalized.includes("your-bucket") ||
    normalized.includes("your_bucket") ||
    normalized.includes("yourdomain") ||
    normalized.includes("example") ||
    normalized.includes("cloudflare_account_id_hex_string")
  );
}

function getRemotePatternFromPublicUrl(publicBaseUrl: string | undefined): RemotePattern | null {
  if (!publicBaseUrl || hasPlaceholderValue(publicBaseUrl)) {
    return null;
  }

  try {
    const url = new URL(publicBaseUrl);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }

    const protocol = url.protocol.replace(":", "") as "http" | "https";
    const pathname =
      url.pathname === "/" ? "/**" : `${url.pathname.replace(/\/$/, "")}/**`;

    return {
      protocol,
      hostname: url.hostname,
      ...(url.port ? { port: url.port } : {}),
      pathname
    };
  } catch {
    return null;
  }
}

const r2PublicImagePattern = getRemotePatternFromPublicUrl(
  process.env.CLOUDFLARE_R2_PUBLIC_BASE_URL
);

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  typedRoutes: true,
  eslint: {
    ignoreDuringBuilds: true
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.r2.cloudflarestorage.com"
      },
      // Corrected: Standard, valid Next.js wildcard whitelisting all .r2.dev subdomains
      {
        protocol: "https",
        hostname: "*.r2.dev"
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com"
      },
      {
        protocol: "https",
        hostname: "plus.unsplash.com"
      },
      ...(r2PublicImagePattern ? [r2PublicImagePattern] : [])
    ]
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders
      }
    ];
  }
};

export default nextConfig;