import { createClient } from "@supabase/supabase-js";

function readRequiredEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

async function findUserByEmail(supabase, email) {
  let page = 1;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 200
    });

    if (error) {
      throw error;
    }

    const match = data.users.find((candidate) => candidate.email?.toLowerCase() === email.toLowerCase());

    if (match) {
      return match;
    }

    if (data.users.length < 200) {
      return null;
    }

    page += 1;
  }
}

async function main() {
  const email = (process.argv[2] || "hello@orvellehq.com").trim().toLowerCase();
  const supabaseUrl = readRequiredEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = readRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
  const user = await findUserByEmail(supabase, email);

  if (!user) {
    throw new Error(`No auth user found for ${email}.`);
  }

  const appMetadata =
    user.app_metadata && typeof user.app_metadata === "object" ? { ...user.app_metadata } : {};

  appMetadata.orvelle_platform_role = "platform_admin";

  const { error } = await supabase.auth.admin.updateUserById(user.id, {
    app_metadata: appMetadata
  });

  if (error) {
    throw error;
  }

  console.log(`Promoted ${email} to platform_admin.`);
  console.log(`User ID: ${user.id}`);
}

main().catch((error) => {
  console.error("Failed to promote platform admin.");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
