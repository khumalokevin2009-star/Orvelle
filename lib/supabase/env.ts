function readRequiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required Supabase environment variable: ${name}`);
  }

  return value;
}

export function getSupabaseBrowserEnv() {
  return {
    url: readRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    publishableKey: readRequiredEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY")
  };
}

export function getSupabaseServerEnv() {
  const { url, publishableKey } = getSupabaseBrowserEnv();

  return {
    url,
    publishableKey,
    serviceRoleKey: readRequiredEnv("SUPABASE_SERVICE_ROLE_KEY")
  };
}
