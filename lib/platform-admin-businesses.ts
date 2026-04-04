import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  getBusinessAccountByBusinessId,
  getBusinessAccountByUserId,
  mergeBusinessAccountMetadata,
  readBusinessAccountFromUser,
  upsertBusinessAccountMembership
} from "@/lib/business-account";
import {
  normalizeBusinessUserRole,
  type BusinessUserRole
} from "@/lib/business-user-roles";
import {
  defaultMissedCallRecoverySettings,
  getMissedCallRecoverySettings,
  normalizeMissedCallRecoverySettings,
  updateMissedCallRecoverySettingsByBusinessId,
  type MissedCallRecoverySettings
} from "@/lib/missed-call-recovery-settings";
import {
  normalizeBusinessVertical,
  normalizeSolutionMode,
  type BusinessVertical,
  type SolutionMode
} from "@/lib/solution-mode";
import { normalizeServiceCallRoutingMode, type ServiceCallRoutingMode } from "@/lib/service-call-routing-mode";

type BusinessMembershipRecord = {
  user_id: string;
  business_id: string;
  business_name: string;
  solution_mode: string;
  business_vertical: string;
  created_at?: string | null;
  updated_at?: string | null;
};

export type PlatformBusinessSummary = {
  businessId: string;
  businessName: string;
  solutionMode: SolutionMode;
  businessVertical: BusinessVertical;
  twilioNumber: string;
  callbackNumber: string;
  callRoutingMode: ServiceCallRoutingMode;
  memberCount: number;
  createdAt: string | null;
  updatedAt: string | null;
};

export type PlatformBusinessMember = {
  userId: string;
  email: string;
  fullName: string;
  role: BusinessUserRole;
  invitedAt: string | null;
};

export type PlatformBusinessSnapshot = PlatformBusinessSummary & {
  members: PlatformBusinessMember[];
};

function deriveContactName(email: string, explicitName?: string | null) {
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

function buildPasswordSetupRedirect(origin: string) {
  return new URL("/auth/set-password", origin).toString();
}

function createSettingsMetadataRecord(settings: MissedCallRecoverySettings) {
  return {
    twilioNumber: settings.twilioNumber,
    callRoutingMode: settings.callRoutingMode,
    callbackNumber: settings.callbackNumber,
    defaultCallbackWindow: settings.defaultCallbackWindow,
    businessHours: settings.businessHours,
    autoFollowUpEnabled: settings.autoFollowUpEnabled,
    smsTemplate: settings.smsTemplate,
    updatedAt: settings.updatedAt
  };
}

async function findUserByEmail(email: string) {
  const supabase = createAdminClient();
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

async function listBusinessMemberships() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("business_memberships")
    .select("user_id, business_id, business_name, solution_mode, business_vertical, created_at, updated_at")
    .order("business_name", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return (data as BusinessMembershipRecord[] | null) ?? [];
}

function groupMembershipsByBusiness(rows: BusinessMembershipRecord[]) {
  const grouped = new Map<string, BusinessMembershipRecord[]>();

  for (const row of rows) {
    const businessRows = grouped.get(row.business_id) ?? [];
    businessRows.push(row);
    grouped.set(row.business_id, businessRows);
  }

  return grouped;
}

async function readUserById(userId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase.auth.admin.getUserById(userId);

  if (error) {
    throw error;
  }

  return data.user ?? null;
}

function createBusinessSettingsFromInput({
  businessName,
  solutionMode,
  businessVertical,
  twilioNumber,
  callRoutingMode,
  callbackNumber
}: {
  businessName: string;
  solutionMode: SolutionMode;
  businessVertical: BusinessVertical;
  twilioNumber?: string | null;
  callRoutingMode?: string | null;
  callbackNumber?: string | null;
}) {
  return normalizeMissedCallRecoverySettings({
    businessName,
    solutionMode,
    businessVertical,
    twilioNumber: twilioNumber?.trim() || "",
    callRoutingMode: normalizeServiceCallRoutingMode(callRoutingMode),
    callbackNumber: callbackNumber?.trim() || "",
    defaultCallbackWindow: defaultMissedCallRecoverySettings.defaultCallbackWindow,
    businessHours: defaultMissedCallRecoverySettings.businessHours,
    autoFollowUpEnabled: defaultMissedCallRecoverySettings.autoFollowUpEnabled,
    smsTemplate: defaultMissedCallRecoverySettings.smsTemplate,
    updatedAt: new Date().toISOString()
  });
}

async function inviteOrResetUser({
  email,
  origin,
  contactName,
  businessName
}: {
  email: string;
  origin: string;
  contactName: string;
  businessName: string;
}) {
  const supabase = createAdminClient();
  const redirectTo = buildPasswordSetupRedirect(origin);
  let user = await findUserByEmail(email);
  let deliveryMode: "invite_email" | "password_setup_email" = "password_setup_email";

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

    user = data.user ?? (await findUserByEmail(email));
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
    throw new Error("Unable to resolve the invited user after sending the onboarding email.");
  }

  return {
    user,
    deliveryMode
  };
}

async function syncUserBusinessMetadata({
  userId,
  email,
  contactName,
  businessId,
  businessName,
  solutionMode,
  businessVertical,
  role,
  mirroredSettings
}: {
  userId: string;
  email: string;
  contactName: string;
  businessId: string;
  businessName: string;
  solutionMode: SolutionMode;
  businessVertical: BusinessVertical;
  role: BusinessUserRole;
  mirroredSettings: MissedCallRecoverySettings;
}) {
  const supabase = createAdminClient();
  const user = await readUserById(userId);
  const existingAppMetadata =
    user?.app_metadata && typeof user.app_metadata === "object"
      ? { ...(user.app_metadata as Record<string, unknown>) }
      : {};
  const existingUserMetadata =
    user?.user_metadata && typeof user.user_metadata === "object"
      ? { ...(user.user_metadata as Record<string, unknown>) }
      : {};

  const metadataPayload: Record<string, unknown> = mergeBusinessAccountMetadata({
    existingAppMetadata,
    userId,
    businessId,
    businessName,
    solutionMode,
    businessVertical,
    role
  });

  metadataPayload.orvelle_missed_call_recovery_settings = createSettingsMetadataRecord(mirroredSettings);

  const { error } = await supabase.auth.admin.updateUserById(userId, {
    user_metadata: {
      ...existingUserMetadata,
      full_name: contactName,
      name: contactName,
      business_name: businessName,
      role,
      email
    },
    app_metadata: metadataPayload
  });

  if (error) {
    throw error;
  }
}

export async function listPlatformBusinesses(): Promise<PlatformBusinessSummary[]> {
  const membershipRows = await listBusinessMemberships();
  const grouped = groupMembershipsByBusiness(membershipRows);
  const summaries = await Promise.all(
    Array.from(grouped.entries()).map(async ([businessId, rows]) => {
      const primaryRow = rows[0];
      const settings = await getMissedCallRecoverySettings(businessId).catch(() => null);

      return {
        businessId,
        businessName: primaryRow.business_name,
        solutionMode: normalizeSolutionMode(primaryRow.solution_mode),
        businessVertical: normalizeBusinessVertical(primaryRow.business_vertical),
        twilioNumber: settings?.twilioNumber ?? "",
        callbackNumber: settings?.callbackNumber ?? "",
        callRoutingMode: settings?.callRoutingMode ?? defaultMissedCallRecoverySettings.callRoutingMode,
        memberCount: rows.length,
        createdAt: primaryRow.created_at ?? null,
        updatedAt: settings?.updatedAt ?? primaryRow.updated_at ?? null
      } satisfies PlatformBusinessSummary;
    })
  );

  return summaries.sort((left, right) => left.businessName.localeCompare(right.businessName));
}

export async function getPlatformBusinessSnapshot(businessId: string): Promise<PlatformBusinessSnapshot | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("business_memberships")
    .select("user_id, business_id, business_name, solution_mode, business_vertical, created_at, updated_at")
    .eq("business_id", businessId)
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  const rows = (data as BusinessMembershipRecord[] | null) ?? [];

  if (rows.length === 0) {
    return null;
  }

  const primaryRow = rows[0];
  const settings = await getMissedCallRecoverySettings(businessId);
  const members = await Promise.all(
    rows.map(async (row) => {
      const user = await readUserById(row.user_id);
      const businessAccount = readBusinessAccountFromUser({
        id: row.user_id,
        app_metadata: user?.app_metadata
      });
      const fullName =
        (user?.user_metadata &&
        typeof user.user_metadata === "object" &&
        typeof (user.user_metadata as Record<string, unknown>).full_name === "string"
          ? ((user.user_metadata as Record<string, unknown>).full_name as string)
          : null) ||
        (user?.email ? deriveContactName(user.email) : "Invited user");

      return {
        userId: row.user_id,
        email: user?.email ?? "Unknown email",
        fullName,
        role: normalizeBusinessUserRole(businessAccount.role),
        invitedAt: row.created_at ?? null
      } satisfies PlatformBusinessMember;
    })
  );

  return {
    businessId,
    businessName: primaryRow.business_name,
    solutionMode: normalizeSolutionMode(primaryRow.solution_mode),
    businessVertical: normalizeBusinessVertical(primaryRow.business_vertical),
    twilioNumber: settings.twilioNumber,
    callbackNumber: settings.callbackNumber,
    callRoutingMode: settings.callRoutingMode,
    memberCount: rows.length,
    createdAt: primaryRow.created_at ?? null,
    updatedAt: settings.updatedAt ?? primaryRow.updated_at ?? null,
    members
  };
}

export async function createBusinessWithOwnerInvite({
  ownerEmail,
  contactName,
  businessName,
  solutionMode,
  businessVertical,
  twilioNumber,
  callbackNumber,
  callRoutingMode,
  origin
}: {
  ownerEmail: string;
  contactName?: string | null;
  businessName: string;
  solutionMode: SolutionMode;
  businessVertical: BusinessVertical;
  twilioNumber?: string | null;
  callbackNumber?: string | null;
  callRoutingMode?: ServiceCallRoutingMode | null;
  origin: string;
}) {
  const normalizedEmail = ownerEmail.trim().toLowerCase();
  const resolvedContactName = deriveContactName(normalizedEmail, contactName);
  const businessSettings = createBusinessSettingsFromInput({
    businessName,
    solutionMode,
    businessVertical,
    twilioNumber,
    callRoutingMode,
    callbackNumber
  });
  const existingUser = await findUserByEmail(normalizedEmail);

  if (existingUser) {
    const existingBusinessAccount = await getBusinessAccountByUserId(existingUser.id);

    if (existingBusinessAccount) {
      throw new Error("That email address is already assigned to an existing business.");
    }
  }

  const { user, deliveryMode } = await inviteOrResetUser({
    email: normalizedEmail,
    origin,
    contactName: resolvedContactName,
    businessName
  });
  const businessId = user.id;

  await syncUserBusinessMetadata({
    userId: user.id,
    email: normalizedEmail,
    contactName: resolvedContactName,
    businessId,
    businessName,
    solutionMode,
    businessVertical,
    role: "owner",
    mirroredSettings: businessSettings
  });

  await upsertBusinessAccountMembership({
    userId: user.id,
    businessId,
    businessName,
    solutionMode,
    businessVertical,
    role: "owner"
  });

  await updateMissedCallRecoverySettingsByBusinessId({
    businessId,
    settings: businessSettings
  });

  return {
    businessId,
    ownerUserId: user.id,
    deliveryMode
  };
}

export async function inviteUserToBusiness({
  businessId,
  email,
  contactName,
  role,
  origin
}: {
  businessId: string;
  email: string;
  contactName?: string | null;
  role: BusinessUserRole;
  origin: string;
}) {
  const business = await getBusinessAccountByBusinessId(businessId);

  if (!business) {
    throw new Error("Business not found.");
  }

  const normalizedEmail = email.trim().toLowerCase();
  const normalizedRole = normalizeBusinessUserRole(role);
  const resolvedContactName = deriveContactName(normalizedEmail, contactName);
  const existingUser = await findUserByEmail(normalizedEmail);

  if (existingUser) {
    const existingBusinessAccount = await getBusinessAccountByUserId(existingUser.id);

    if (existingBusinessAccount && existingBusinessAccount.businessId !== businessId) {
      throw new Error("That user is already assigned to another business.");
    }
  }

  const settings = await getMissedCallRecoverySettings(businessId);
  const { user, deliveryMode } = await inviteOrResetUser({
    email: normalizedEmail,
    origin,
    contactName: resolvedContactName,
    businessName: business.businessName
  });

  await syncUserBusinessMetadata({
    userId: user.id,
    email: normalizedEmail,
    contactName: resolvedContactName,
    businessId,
    businessName: business.businessName,
    solutionMode: business.solutionMode,
    businessVertical: business.businessVertical,
    role: normalizedRole,
    mirroredSettings: settings
  });

  await upsertBusinessAccountMembership({
    userId: user.id,
    businessId,
    businessName: business.businessName,
    solutionMode: business.solutionMode,
    businessVertical: business.businessVertical,
    role: normalizedRole
  });

  return {
    businessId,
    userId: user.id,
    deliveryMode
  };
}
