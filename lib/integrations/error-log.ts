import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export type IntegrationErrorSeverity = "error" | "warning";

export type IntegrationErrorRecord = {
  id: string;
  callId: string | null;
  provider: string;
  errorMessage: string;
  severity: IntegrationErrorSeverity;
  eventType: string | null;
  createdAt: string;
};

type ErrorLogCollection = {
  recent?: IntegrationErrorRecord[];
};

function getExistingErrorLog(appMetadata: unknown) {
  if (!appMetadata || typeof appMetadata !== "object") {
    return { recent: [] } satisfies ErrorLogCollection;
  }

  const metadata = appMetadata as {
    orvelle_integration_errors?: ErrorLogCollection;
  };

  return metadata.orvelle_integration_errors ?? { recent: [] };
}

export async function appendIntegrationError({
  userId,
  provider,
  callId,
  errorMessage,
  severity = "error",
  eventType = null
}: {
  userId: string;
  provider: string;
  callId?: string | null;
  errorMessage: string;
  severity?: IntegrationErrorSeverity;
  eventType?: string | null;
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
  const existingLog = getExistingErrorLog(data.user?.app_metadata);
  const nextEntry: IntegrationErrorRecord = {
    id: crypto.randomUUID(),
    callId: callId ?? null,
    provider,
    errorMessage,
    severity,
    eventType,
    createdAt: new Date().toISOString()
  };

  existingAppMetadata.orvelle_integration_errors = {
    recent: [nextEntry, ...(existingLog.recent ?? [])].slice(0, 20)
  };

  const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
    app_metadata: existingAppMetadata
  });

  if (updateError) {
    throw updateError;
  }

  return nextEntry;
}
