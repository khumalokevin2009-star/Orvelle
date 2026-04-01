import "server-only";

import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export async function getAuthenticatedUser(): Promise<User | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    console.error("[auth] Failed to resolve authenticated user.", error.message);
    return null;
  }

  return data.user ?? null;
}
