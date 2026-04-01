function readRequiredServerEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required Supabase environment variable: ${name}`);
  }

  return value;
}

export function getSupabaseBrowserEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url) {
    throw new Error("Missing required Supabase environment variable: NEXT_PUBLIC_SUPABASE_URL");
  }

  if (!publishableKey) {
    throw new Error(
      "Missing required Supabase environment variable: NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
    );
  }

  return {
    url,
    publishableKey
  };
}

export function getSupabaseServerEnv() {
  const { url, publishableKey } = getSupabaseBrowserEnv();

  return {
    url,
    publishableKey,
    serviceRoleKey: readRequiredServerEnv("SUPABASE_SERVICE_ROLE_KEY")
  };
}
