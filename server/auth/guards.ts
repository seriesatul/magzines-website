import "server-only";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { canAccessAdmin } from "@/server/auth/permissions";

export async function requireAdminSession(): Promise<void> {
  const session = await auth();

  if (!session?.user) {
    redirect("/sign-in");
  }

  if (!canAccessAdmin(session)) {
    redirect("/unauthorized");
  }
}
