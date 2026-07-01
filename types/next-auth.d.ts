import type { UserRole } from "@prisma/client";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      phone?: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    role: UserRole;
    phone?: string | null;
  }
}
