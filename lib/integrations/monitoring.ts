import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export type MonitoringEventType = "call_ingested" | "ingestion_failed" | "analysis_failed";

export type MonitoringEventRecord = {
  id: string;
  type: MonitoringEventType;
  provider: string;
  userId: string;
  callId: string | null;
  message: string | null;
  createdAt: string;
};

export type MonitoringSnapshot = {
  totalCallsIngested: number;
  failedIngestions: number;
  analysisFailures: number;
  recentActivity: MonitoringEventRecord[];
};

type MonitoringCollection = {
  summary?: {
    totalCallsIngested?: number;
    failedIngestions?: number;
    analysisFailures?: number;
  };
  recentActivity?: MonitoringEventRecord[];
};

function getExistingMonitoring(appMetadata: unknown) {
  if (!appMetadata || typeof appMetadata !== "object") {
    return {} as MonitoringCollection;
  }

  const metadata = appMetadata as {
    orvelle_monitoring?: MonitoringCollection;
  };

  return metadata.orvelle_monitoring ?? {};
}

export function readMonitoringSnapshot(appMetadata: unknown): MonitoringSnapshot {
  const existing = getExistingMonitoring(appMetadata);

  return {
    totalCallsIngested: existing.summary?.totalCallsIngested ?? 0,
    failedIngestions: existing.summary?.failedIngestions ?? 0,
    analysisFailures: existing.summary?.analysisFailures ?? 0,
    recentActivity: existing.recentActivity ?? []
  };
}

export async function recordMonitoringEvent({
  userId,
  provider,
  type,
  callId,
  message
}: {
  userId: string;
  provider: string;
  type: MonitoringEventType;
  callId?: string | null;
  message?: string | null;
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
  const snapshot = readMonitoringSnapshot(data.user?.app_metadata);
  const nextEvent: MonitoringEventRecord = {
    id: crypto.randomUUID(),
    type,
    provider,
    userId,
    callId: callId ?? null,
    message: message ?? null,
    createdAt: new Date().toISOString()
  };

  const nextSummary = {
    totalCallsIngested:
      snapshot.totalCallsIngested + (type === "call_ingested" ? 1 : 0),
    failedIngestions:
      snapshot.failedIngestions + (type === "ingestion_failed" ? 1 : 0),
    analysisFailures:
      snapshot.analysisFailures + (type === "analysis_failed" ? 1 : 0)
  };

  existingAppMetadata.orvelle_monitoring = {
    summary: nextSummary,
    recentActivity: [nextEvent, ...snapshot.recentActivity].slice(0, 25)
  };

  const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
    app_metadata: existingAppMetadata
  });

  if (updateError) {
    throw updateError;
  }

  return {
    summary: nextSummary,
    event: nextEvent
  };
}
