import "server-only";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function getDatabaseUrlWithConnectionLimit(): string | undefined {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    return undefined;
  }

  try {
    const url = new URL(databaseUrl);

    if (!url.searchParams.has("connection_limit")) {
      url.searchParams.set("connection_limit", "1");
    }

    if (!url.searchParams.has("pool_timeout")) {
      url.searchParams.set("pool_timeout", "20");
    }

    return url.toString();
  } catch {
    return databaseUrl;
  }
}

const databaseUrl = getDatabaseUrlWithConnectionLimit();

export const db: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    ...(databaseUrl
      ? {
          datasources: {
            db: {
              url: databaseUrl
            }
          }
        }
      : {}),
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"]
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
