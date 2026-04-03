import "server-only";

import type { User } from "@supabase/supabase-js";
import { getAuthenticatedUser } from "@/lib/auth/session";
import {
  defaultBusinessVertical,
  defaultSolutionMode,
  normalizeBusinessVertical,
  normalizeSolutionMode,
  type BusinessVertical,
  type SolutionMode
} from "@/lib/solution-mode";
import { createAdminClient } from "@/lib/supabase/admin";

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

export async function ensureBusinessAccountForUser(user: User) {
  const resolvedAccount = readBusinessAccountFromUser(user);
  const businessRecord = readBusinessAccountRecord(user.app_metadata);
  const settingsRecord = readMissedCallSettingsRecord(user.app_metadata);
  const missingFields = getMissingBusinessAccountFields(businessRecord);

  if (missingFields.length === 0) {
    return resolvedAccount;
  }

  console.warn("[business-account] Incomplete business account metadata detected. Applying fallback values.", {
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

  const existingAppMetadata = asMetadataObject(user.app_metadata)
    ? { ...(user.app_metadata as Record<string, unknown>) }
    : {};

  const metadataPayload = mergeBusinessAccountMetadata({
    existingAppMetadata,
    userId: user.id
  });

  const supabase = createAdminClient();
  const { error } = await supabase.auth.admin.updateUserById(user.id, {
    app_metadata: metadataPayload
  });

  if (error) {
    throw error;
  }

  return readBusinessAccountFromUser({
    id: user.id,
    app_metadata: metadataPayload
  });
}

export async function getCurrentBusinessAccount() {
  const user = await getAuthenticatedUser();

  if (!user) {
    return null;
  }

  return ensureBusinessAccountForUser(user);
}
