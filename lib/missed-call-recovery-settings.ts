import "server-only";

import {
  defaultBusinessVertical,
  defaultSolutionMode,
  normalizeBusinessVertical,
  normalizeSolutionMode,
  type BusinessVertical,
  type SolutionMode
} from "@/lib/solution-mode";
import { createAdminClient } from "@/lib/supabase/admin";

export type MissedCallRecoverySettings = {
  businessName: string;
  solutionMode: SolutionMode;
  businessVertical: BusinessVertical;
  callbackNumber: string;
  defaultCallbackWindow: string;
  businessHours: string;
  autoFollowUpEnabled: boolean;
  smsTemplate: string;
  updatedAt: string | null;
};

type MissedCallRecoverySettingsRecord = Omit<MissedCallRecoverySettings, "updatedAt"> & {
  updatedAt?: string | null;
};

const defaultSmsTemplate =
  "Sorry we missed your call. This is {{businessName}}. We’ve received your enquiry and will call you back within {{callbackWindow}}. If urgent, call us on {{phoneNumber}}.";

export const defaultMissedCallRecoverySettings: MissedCallRecoverySettings = {
  businessName: "Cotrnested Services Ltd.",
  solutionMode: defaultSolutionMode,
  businessVertical: defaultBusinessVertical,
  callbackNumber: "",
  defaultCallbackWindow: "2 business hours",
  businessHours: "Mon-Fri, 08:00-18:00",
  autoFollowUpEnabled: true,
  smsTemplate: defaultSmsTemplate,
  updatedAt: null
};

function getSettingsRecord(appMetadata: unknown) {
  if (!appMetadata || typeof appMetadata !== "object") {
    return null;
  }

  const metadata = appMetadata as {
    orvelle_missed_call_recovery_settings?: MissedCallRecoverySettingsRecord;
  };

  return metadata.orvelle_missed_call_recovery_settings ?? null;
}

export function normalizeMissedCallRecoverySettings(
  input?: Partial<MissedCallRecoverySettingsRecord> | null
): MissedCallRecoverySettings {
  return {
    businessName: input?.businessName?.trim() || defaultMissedCallRecoverySettings.businessName,
    solutionMode: normalizeSolutionMode(input?.solutionMode),
    businessVertical: normalizeBusinessVertical(input?.businessVertical),
    callbackNumber: input?.callbackNumber?.trim() || defaultMissedCallRecoverySettings.callbackNumber,
    defaultCallbackWindow:
      input?.defaultCallbackWindow?.trim() || defaultMissedCallRecoverySettings.defaultCallbackWindow,
    businessHours: input?.businessHours?.trim() || defaultMissedCallRecoverySettings.businessHours,
    autoFollowUpEnabled: input?.autoFollowUpEnabled ?? defaultMissedCallRecoverySettings.autoFollowUpEnabled,
    smsTemplate: input?.smsTemplate?.trim() || defaultMissedCallRecoverySettings.smsTemplate,
    updatedAt: input?.updatedAt ?? null
  };
}

export function readMissedCallRecoverySettings(appMetadata: unknown) {
  return normalizeMissedCallRecoverySettings(getSettingsRecord(appMetadata));
}

export function validateMissedCallRecoverySettings(settings: MissedCallRecoverySettings) {
  const errors: string[] = [];

  if (!settings.defaultCallbackWindow.trim()) {
    errors.push("Default callback window is required.");
  }

  if (settings.autoFollowUpEnabled && !settings.callbackNumber.trim()) {
    errors.push("Callback number is required when auto follow-up is enabled.");
  }

  if (settings.autoFollowUpEnabled && !settings.smsTemplate.trim()) {
    errors.push("SMS template is required when auto follow-up is enabled.");
  }

  return errors;
}

export async function getMissedCallRecoverySettings(userId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase.auth.admin.getUserById(userId);

  if (error) {
    throw error;
  }

  return readMissedCallRecoverySettings(data.user?.app_metadata);
}

export async function updateMissedCallRecoverySettings({
  userId,
  settings
}: {
  userId: string;
  settings: MissedCallRecoverySettings;
}) {
  const supabase = createAdminClient();
  const { data, error } = await supabase.auth.admin.getUserById(userId);

  if (error) {
    throw error;
  }

  const existingAppMetadata =
    data.user?.app_metadata && typeof data.user.app_metadata === "object"
      ? { ...(data.user.app_metadata as Record<string, unknown>) }
      : {};

  const nextSettings = normalizeMissedCallRecoverySettings({
    ...settings,
    updatedAt: new Date().toISOString()
  });

  existingAppMetadata.orvelle_missed_call_recovery_settings = nextSettings;

  const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
    app_metadata: existingAppMetadata
  });

  if (updateError) {
    throw updateError;
  }

  return nextSettings;
}

export function renderMissedCallRecoverySmsTemplate({
  template,
  businessName,
  callbackWindow,
  phoneNumber
}: {
  template: string;
  businessName: string;
  callbackWindow: string;
  phoneNumber: string;
}) {
  return template
    .replaceAll("{{businessName}}", businessName)
    .replaceAll("{{callbackWindow}}", callbackWindow)
    .replaceAll("{{phoneNumber}}", phoneNumber);
}
