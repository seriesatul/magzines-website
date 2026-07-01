import { UserRole } from "@prisma/client";
import type { Session } from "next-auth";

export function isAdminRole(role: UserRole | undefined): boolean {
  return role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN;
}

export function canAccessAdmin(session: Session | null): boolean {
  return isAdminRole(session?.user?.role);
}

export function requireUserId(session: Session | null): string {
  if (!session?.user?.id) {
    throw new Error("Authenticated user is required.");
  }

  return session.user.id;
}
