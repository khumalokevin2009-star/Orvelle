import "server-only";

import type { User } from "@supabase/supabase-js";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";
import {
  defaultBusinessVertical,
  defaultSolutionMode,
  normalizeBusinessVertical,
  normalizeSolutionMode,
  type BusinessVertical,
  type SolutionMode
} from "@/lib/solution-mode";

const businessAccountMetadataKey = "orvelle_business_account";
const missedCallSettingsMetadataKey = "orvelle_missed_call_recovery_settings";

type BusinessAccountMetadataRecord = {
  businessId?: string | null;
  businessName?: string | null;
  solutionMode?: string | null;
  businessVertical?: string | null;
  updatedAt?: string | null;
};

type MissedCallSettingsMetadataRecord = {
  businessName?: string | null;
  solutionMode?: string | null;
  businessVertical?: string | null;
};

type BusinessMembershipRow = {
  user_id: string;
  business_id: string;
  business_name: string;
  solution_mode: string;
  business_vertical: string;
  updated_at?: string | null;
};

export type BusinessAccount = {
  userId: string;
  businessId: string;
  businessName: string;
  solutionMode: SolutionMode;
  businessVertical: BusinessVertical;
  updatedAt: string | null;
};

function asMetadataObject(value: unknown) {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function readBusinessAccountRecord(appMetadata: unknown) {
  const metadata = asMetadataObject(appMetadata);
  const record = metadata?.[businessAccountMetadataKey];
  return asMetadataObject(record) as BusinessAccountMetadataRecord | null;
}

function readMissedCallSettingsRecord(appMetadata: unknown) {
  const metadata = asMetadataObject(appMetadata);
  const record = metadata?.[missedCallSettingsMetadataKey];
  return asMetadataObject(record) as MissedCallSettingsMetadataRecord | null;
}

function normalizeBusinessName(input?: string | null) {
  return input?.trim() || "Business Account";
}

function isMissingBusinessMembershipTableError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const candidate = error as {
    code?: string;
    message?: string;
  };

  return (
    candidate.code === "42P01" ||
    (candidate.message?.includes("business_memberships") && candidate.message?.includes("does not exist")) ||
    false
  );
}

function getMissingBusinessAccountFields(record: BusinessAccountMetadataRecord | null) {
  const missingFields: string[] = [];

  if (!record?.businessId?.trim()) {
    missingFields.push("businessId");
  }

  if (!record?.businessName?.trim()) {
    missingFields.push("businessName");
  }

  if (!record?.solutionMode?.trim()) {
    missingFields.push("solutionMode");
  }

  if (!record?.businessVertical?.trim()) {
    missingFields.push("businessVertical");
  }

  return missingFields;
}

function readBusinessAccountFromMembershipRow(row: BusinessMembershipRow): BusinessAccount {
  return {
    userId: row.user_id,
    businessId: row.business_id?.trim() || row.user_id,
    businessName: normalizeBusinessName(row.business_name),
    solutionMode: normalizeSolutionMode(row.solution_mode),
    businessVertical: normalizeBusinessVertical(row.business_vertical),
    updatedAt: row.updated_at ?? null
  };
}

function businessAccountNeedsMetadataSync(user: { id: string; app_metadata?: unknown }, account: BusinessAccount) {
  const businessRecord = readBusinessAccountRecord(user.app_metadata);

  return (
    getMissingBusinessAccountFields(businessRecord).length > 0 ||
    (businessRecord?.businessId?.trim() || user.id) !== account.businessId ||
    normalizeBusinessName(businessRecord?.businessName) !== account.businessName ||
    normalizeSolutionMode(businessRecord?.solutionMode) !== account.solutionMode ||
    normalizeBusinessVertical(businessRecord?.businessVertical) !== account.businessVertical
  );
}

async function syncBusinessAccountMetadata(
  user: { id: string; app_metadata?: unknown },
  account: BusinessAccount
) {
  const existingAppMetadata = asMetadataObject(user.app_metadata)
    ? { ...(user.app_metadata as Record<string, unknown>) }
    : {};

  const metadataPayload = mergeBusinessAccountMetadata({
    existingAppMetadata,
    userId: user.id,
    businessId: account.businessId,
    businessName: account.businessName,
    solutionMode: account.solutionMode,
    businessVertical: account.businessVertical
  });

  const supabase = createAdminClient();
  const { error } = await supabase.auth.admin.updateUserById(user.id, {
    app_metadata: metadataPayload
  });

  if (error) {
    throw error;
  }
}

async function getBusinessMembershipRowByUserId(userId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("business_memberships")
    .select("user_id, business_id, business_name, solution_mode, business_vertical, updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    if (isMissingBusinessMembershipTableError(error)) {
      console.warn("[business-account] business_memberships table is not available yet. Falling back to auth metadata for current-business resolution.");
      return null;
    }

    throw error;
  }

  return (data as BusinessMembershipRow | null) ?? null;
}

async function getCurrentBusinessMembershipRow(userId: string) {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("business_memberships")
    .select("user_id, business_id, business_name, solution_mode, business_vertical, updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    if (isMissingBusinessMembershipTableError(error)) {
      console.warn("[business-account] business_memberships table is not available yet. Falling back to auth metadata for current-business resolution.");
      return null;
    }

    throw error;
  }

  return (data as BusinessMembershipRow | null) ?? null;
}

export function readBusinessAccountFromUser(user: {
  id: string;
  app_metadata?: unknown;
}): BusinessAccount {
  const businessRecord = readBusinessAccountRecord(user.app_metadata);
  const settingsRecord = readMissedCallSettingsRecord(user.app_metadata);

  return {
    userId: user.id,
    businessId: businessRecord?.businessId?.trim() || user.id,
    businessName: normalizeBusinessName(businessRecord?.businessName ?? settingsRecord?.businessName),
    solutionMode: normalizeSolutionMode(businessRecord?.solutionMode ?? settingsRecord?.solutionMode),
    businessVertical: normalizeBusinessVertical(
      businessRecord?.businessVertical ?? settingsRecord?.businessVertical
    ),
    updatedAt: businessRecord?.updatedAt ?? null
  };
}

export function mergeBusinessAccountMetadata({
  existingAppMetadata,
  userId,
  businessId,
  businessName,
  solutionMode,
  businessVertical
}: {
  existingAppMetadata: Record<string, unknown>;
  userId: string;
  businessId?: string | null;
  businessName?: string | null;
  solutionMode?: SolutionMode | null;
  businessVertical?: BusinessVertical | null;
}) {
  const currentAccount = readBusinessAccountFromUser({
    id: userId,
    app_metadata: existingAppMetadata
  });

  return {
    ...existingAppMetadata,
    [businessAccountMetadataKey]: {
      businessId: businessId?.trim() || currentAccount.businessId || userId,
      businessName: normalizeBusinessName(businessName ?? currentAccount.businessName),
      solutionMode: normalizeSolutionMode(solutionMode ?? currentAccount.solutionMode ?? defaultSolutionMode),
      businessVertical: normalizeBusinessVertical(
        businessVertical ?? currentAccount.businessVertical ?? defaultBusinessVertical
      ),
      updatedAt: new Date().toISOString()
    }
  };
}

export async function getBusinessAccountByUserId(userId: string) {
  const membershipRow = await getBusinessMembershipRowByUserId(userId);
  return membershipRow ? readBusinessAccountFromMembershipRow(membershipRow) : null;
}

export async function upsertBusinessAccountMembership({
  userId,
  businessId,
  businessName,
  solutionMode,
  businessVertical
}: {
  userId: string;
  businessId?: string | null;
  businessName?: string | null;
  solutionMode?: SolutionMode | null;
  businessVertical?: BusinessVertical | null;
}) {
  const currentAccount = (await getBusinessAccountByUserId(userId)) ?? {
    userId,
    businessId: userId,
    businessName: normalizeBusinessName(businessName),
    solutionMode: normalizeSolutionMode(solutionMode),
    businessVertical: normalizeBusinessVertical(businessVertical),
    updatedAt: null
  };

  const nextAccount: BusinessAccount = {
    userId,
    businessId: businessId?.trim() || currentAccount.businessId || userId,
    businessName: normalizeBusinessName(businessName ?? currentAccount.businessName),
    solutionMode: normalizeSolutionMode(solutionMode ?? currentAccount.solutionMode),
    businessVertical: normalizeBusinessVertical(businessVertical ?? currentAccount.businessVertical),
    updatedAt: currentAccount.updatedAt
  };

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("business_memberships")
    .upsert(
      {
        user_id: nextAccount.userId,
        business_id: nextAccount.businessId,
        business_name: nextAccount.businessName,
        solution_mode: nextAccount.solutionMode,
        business_vertical: nextAccount.businessVertical
      },
      {
        onConflict: "user_id"
      }
    )
    .select("user_id, business_id, business_name, solution_mode, business_vertical, updated_at")
    .single();

  if (error) {
    if (isMissingBusinessMembershipTableError(error)) {
      console.warn("[business-account] business_memberships table is not available yet. Skipping membership upsert and keeping auth metadata as the temporary fallback.");
      return nextAccount;
    }

    throw error;
  }

  return readBusinessAccountFromMembershipRow(data as BusinessMembershipRow);
}

export async function ensureBusinessAccountForUser(user: User) {
  const membershipAccount = await getBusinessAccountByUserId(user.id);

  if (membershipAccount) {
    if (businessAccountNeedsMetadataSync(user, membershipAccount)) {
      console.info("[business-account] Syncing auth metadata from business membership record.", {
        userId: user.id,
        businessId: membershipAccount.businessId
      });
      await syncBusinessAccountMetadata(user, membershipAccount);
    }

    return membershipAccount;
  }

  const resolvedAccount = readBusinessAccountFromUser(user);
  const businessRecord = readBusinessAccountRecord(user.app_metadata);
  const settingsRecord = readMissedCallSettingsRecord(user.app_metadata);
  const missingFields = getMissingBusinessAccountFields(businessRecord);

  console.warn("[business-account] Missing business membership record. Creating admin-assigned fallback membership.", {
    userId: user.id,
    missingFields,
    resolvedBusinessId: resolvedAccount.businessId,
    resolvedBusinessName: resolvedAccount.businessName,
    resolvedSolutionMode: resolvedAccount.solutionMode,
    resolvedBusinessVertical: resolvedAccount.businessVertical,
    fallbackSource:
      settingsRecord?.businessName || settingsRecord?.solutionMode || settingsRecord?.businessVertical
        ? "legacy_recovery_settings"
        : "default_business_account"
  });

  await upsertBusinessAccountMembership({
    userId: user.id,
    businessId: resolvedAccount.businessId,
    businessName: resolvedAccount.businessName,
    solutionMode: resolvedAccount.solutionMode,
    businessVertical: resolvedAccount.businessVertical
  });

  if (businessAccountNeedsMetadataSync(user, resolvedAccount)) {
    await syncBusinessAccountMetadata(user, resolvedAccount);
  }

  return resolvedAccount;
}

export async function getCurrentBusinessAccount() {
  const user = await getAuthenticatedUser();

  if (!user) {
    return null;
  }

  const membershipRow = await getCurrentBusinessMembershipRow(user.id);

  if (membershipRow) {
    const membershipAccount = readBusinessAccountFromMembershipRow(membershipRow);

    if (businessAccountNeedsMetadataSync(user, membershipAccount)) {
      await syncBusinessAccountMetadata(user, membershipAccount);
    }

    return membershipAccount;
  }

  return ensureBusinessAccountForUser(user);
}
