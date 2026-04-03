import { createClient } from "@supabase/supabase-js";

const solutionModeValues = new Set([
  "service_business_missed_call_recovery",
  "call_performance_revenue_recovery"
]);

const businessVerticalValues = new Set([
  "hvac",
  "plumbing",
  "electrical",
  "dental",
  "cosmetic_clinic",
  "legal_intake",
  "call_centre",
  "other"
]);

const defaultSmsTemplate =
  "Sorry we missed your call. This is {{businessName}}. We’ve received your enquiry and will call you back within {{callbackWindow}}. If urgent, call us on {{phoneNumber}}.";

function readRequiredEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function parseArgs(argv) {
  const args = {};

  for (let index = 2; index < argv.length; index += 1) {
    const token = argv[index];

    if (!token.startsWith("--")) {
      continue;
    }

    const key = token.slice(2);
    const nextToken = argv[index + 1];

    if (!nextToken || nextToken.startsWith("--")) {
      args[key] = "true";
      continue;
    }

    args[key] = nextToken;
    index += 1;
  }

  return args;
}

function deriveContactName(email, explicitName) {
  if (explicitName?.trim()) {
    return explicitName.trim();
  }

  const localPart = email.split("@")[0] ?? "Client";
  return localPart
    .split(/[._-]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function normalizeSolutionMode(input) {
  if (solutionModeValues.has(input)) {
    return input;
  }

  return "service_business_missed_call_recovery";
}

function normalizeBusinessVertical(input, solutionMode) {
  if (input && businessVerticalValues.has(input)) {
    return input;
  }

  return solutionMode === "call_performance_revenue_recovery" ? "dental" : "hvac";
}

function buildBusinessAccountMetadata({
  userId,
  businessId,
  businessName,
  solutionMode,
  businessVertical
}) {
  return {
    businessId: businessId || userId,
    businessName,
    solutionMode,
    businessVertical,
    updatedAt: new Date().toISOString()
  };
}

function buildBusinessMembershipRecord({
  userId,
  businessId,
  businessName,
  solutionMode,
  businessVertical
}) {
  return {
    user_id: userId,
    business_id: businessId || userId,
    business_name: businessName,
    solution_mode: solutionMode,
    business_vertical: businessVertical
  };
}

function buildRecoverySettingsMetadata({
  solutionMode,
  callbackNumber,
  callbackWindow,
  businessHours,
  smsTemplate
}) {
  const defaultCallbackWindow =
    callbackWindow?.trim() ||
    (solutionMode === "call_performance_revenue_recovery" ? "Same business day" : "15 minutes");

  const defaultBusinessHours =
    businessHours?.trim() ||
    (solutionMode === "call_performance_revenue_recovery"
      ? "Mon-Fri, 08:00-17:30"
      : "Mon-Sat, 07:00-19:00");

  return {
    callbackNumber: callbackNumber?.trim() || "",
    defaultCallbackWindow,
    businessHours: defaultBusinessHours,
    autoFollowUpEnabled: true,
    smsTemplate: smsTemplate?.trim() || defaultSmsTemplate,
    updatedAt: new Date().toISOString()
  };
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

    const user = data.users.find((candidate) => candidate.email?.toLowerCase() === email.toLowerCase());

    if (user) {
      return user;
    }

    if (data.users.length < 200) {
      return null;
    }

    page += 1;
  }
}

function buildPasswordSetupRedirect(appUrl) {
  const redirectUrl = new URL("/auth/set-password", appUrl);
  return redirectUrl.toString();
}

function isMissingBusinessMembershipTableError(error) {
  return (
    error &&
    typeof error === "object" &&
    (error.code === "42P01" ||
      (typeof error.message === "string" &&
        error.message.includes("business_memberships") &&
        error.message.includes("does not exist")))
  );
}

function printUsage() {
  console.log(`Usage:
  npm run invite:client -- --email client@example.com --business-name "Northflow HVAC Ltd." --solution-mode service_business_missed_call_recovery --business-vertical hvac --contact-name "Sam Client"

Required:
  --email
  --business-name
  --solution-mode  service_business_missed_call_recovery | call_performance_revenue_recovery

Optional:
  --business-vertical hvac | plumbing | electrical | dental | cosmetic_clinic | legal_intake | call_centre | other
  --contact-name
  --callback-number
  --callback-window
  --business-hours
  --sms-template
`);
}

async function main() {
  const args = parseArgs(process.argv);

  if (args.help === "true" || !args.email || !args["business-name"] || !args["solution-mode"]) {
    printUsage();
    process.exit(args.help === "true" ? 0 : 1);
  }

  const appUrl = readRequiredEnv("APP_URL");
  const supabaseUrl = readRequiredEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = readRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");

  const email = args.email.trim().toLowerCase();
  const solutionMode = normalizeSolutionMode(args["solution-mode"]);
  const businessVertical = normalizeBusinessVertical(args["business-vertical"], solutionMode);
  const businessName = args["business-name"].trim();
  const contactName = deriveContactName(email, args["contact-name"]);
  const redirectTo = buildPasswordSetupRedirect(appUrl);

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  let user = await findUserByEmail(supabase, email);
  let deliveryMode = "password_setup_email";

  if (!user) {
    const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
      redirectTo,
      data: {
        full_name: contactName,
        name: contactName,
        business_name: businessName
      }
    });

    if (error) {
      throw error;
    }

    user = data.user ?? (await findUserByEmail(supabase, email));
    deliveryMode = "invite_email";
  } else {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo
    });

    if (error) {
      throw error;
    }
  }

  if (!user) {
    throw new Error("Unable to resolve the invited user after creating the onboarding email.");
  }

  const existingAppMetadata =
    user.app_metadata && typeof user.app_metadata === "object" ? { ...user.app_metadata } : {};
  const businessId = user.id;

  existingAppMetadata.orvelle_business_account = buildBusinessAccountMetadata({
    userId: user.id,
    businessId,
    businessName,
    solutionMode,
    businessVertical
  });

  existingAppMetadata.orvelle_missed_call_recovery_settings = buildRecoverySettingsMetadata({
    solutionMode,
    callbackNumber: args["callback-number"],
    callbackWindow: args["callback-window"],
    businessHours: args["business-hours"],
    smsTemplate: args["sms-template"]
  });

  const existingUserMetadata =
    user.user_metadata && typeof user.user_metadata === "object" ? { ...user.user_metadata } : {};

  const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
    user_metadata: {
      ...existingUserMetadata,
      full_name: contactName,
      name: contactName,
      business_name: businessName
    },
    app_metadata: existingAppMetadata
  });

  if (updateError) {
    throw updateError;
  }

  const { error: membershipError } = await supabase
    .from("business_memberships")
    .upsert(buildBusinessMembershipRecord({
      userId: user.id,
      businessId,
      businessName,
      solutionMode,
      businessVertical
    }), {
      onConflict: "user_id"
    });

  if (membershipError && !isMissingBusinessMembershipTableError(membershipError)) {
    throw membershipError;
  }

  if (isMissingBusinessMembershipTableError(membershipError)) {
    console.warn("business_memberships table is not available yet. Invite completed using auth metadata only.");
  }

  console.log("");
  console.log("Invite-only onboarding email sent successfully.");
  console.log("");
  console.log(`Email: ${email}`);
  console.log(`Contact name: ${contactName}`);
  console.log(`Business name: ${businessName}`);
  console.log(`User ID / Business ID: ${user.id}`);
  console.log(`Solution mode: ${solutionMode}`);
  console.log(`Business vertical: ${businessVertical}`);
  console.log(`Delivery mode: ${deliveryMode}`);
  console.log(`Password setup URL: ${redirectTo}`);
  console.log("");
  console.log("Next step: the client opens the Supabase email, follows the password setup link, chooses a password, and then signs in normally at /login.");
}

main().catch((error) => {
  console.error("Invite-only onboarding failed.");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
