import "server-only";

import type { User } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth/session";

export const platformAdminRole = "platform_admin";
export const platformAdminRoleMetadataKey = "orvelle_platform_role";
export const platformAdminBusinessOverrideCookieName = "orvelle_admin_business_override";

export function readPlatformRoleFromUser(user: {
  app_metadata?: unknown;
} | null | undefined) {
  if (!user?.app_metadata || typeof user.app_metadata !== "object") {
    return null;
  }

  const metadata = user.app_metadata as Record<string, unknown>;
  const value = metadata[platformAdminRoleMetadataKey];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function isPlatformAdminUser(user: Pick<User, "app_metadata"> | null | undefined) {
  return readPlatformRoleFromUser(user) === platformAdminRole;
}

export async function requirePlatformAdminUser() {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  if (!isPlatformAdminUser(user)) {
    redirect("/dashboard");
  }

  return user;
}

export async function getPlatformAdminBusinessOverride(user?: Pick<User, "app_metadata"> | null) {
  const authenticatedUser = user ?? (await getAuthenticatedUser());

  if (!authenticatedUser || !isPlatformAdminUser(authenticatedUser)) {
    return null;
  }

  const cookieStore = await cookies();
  return cookieStore.get(platformAdminBusinessOverrideCookieName)?.value?.trim() || null;
}
