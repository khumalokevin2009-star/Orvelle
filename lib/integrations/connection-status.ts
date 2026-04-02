import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export type IntegrationStatus = "connected" | "waiting_for_data" | "error";
export type IntegrationConnectionHealth = "healthy" | "waiting" | "error";

export type ProviderConnectionState = {
  provider: string;
  accountIdentifier: string;
  status: IntegrationStatus;
  connectionHealth: IntegrationConnectionHealth;
  lastEventReceived: string | null;
  lastErrorAt: string | null;
  lastErrorMessage: string | null;
  updatedAt: string;
};

type ProviderConnectionStateRecord = Record<string, ProviderConnectionState>;

function normalizeConnectionState(
  provider: string,
  accountIdentifier: string,
  state?: Partial<ProviderConnectionState> | null
): ProviderConnectionState {
  return {
    provider,
    accountIdentifier,
    status: state?.status ?? "waiting_for_data",
    connectionHealth: state?.connectionHealth ?? "waiting",
    lastEventReceived: state?.lastEventReceived ?? null,
    lastErrorAt: state?.lastErrorAt ?? null,
    lastErrorMessage: state?.lastErrorMessage ?? null,
    updatedAt: state?.updatedAt ?? new Date().toISOString()
  };
}

function getIntegrationRecord(appMetadata: unknown) {
  if (!appMetadata || typeof appMetadata !== "object") {
    return {} as ProviderConnectionStateRecord;
  }

  const metadata = appMetadata as {
    orvelle_integrations?: ProviderConnectionStateRecord;
  };

  return metadata.orvelle_integrations ?? {};
}

export function readProviderConnectionState({
  appMetadata,
  provider,
  accountIdentifier
}: {
  appMetadata: unknown;
  provider: string;
  accountIdentifier: string;
}) {
  const integrationRecord = getIntegrationRecord(appMetadata);
  const state = integrationRecord[provider];

  if (!state) {
    return null;
  }

  return normalizeConnectionState(provider, accountIdentifier, state);
}

async function writeProviderConnectionState({
  userId,
  provider,
  accountIdentifier,
  existingAppMetadata,
  nextState
}: {
  userId: string;
  provider: string;
  accountIdentifier: string;
  existingAppMetadata: unknown;
  nextState: ProviderConnectionState;
}) {
  const supabase = createAdminClient();
  const integrationRecord = getIntegrationRecord(existingAppMetadata);
  const metadataPayload =
    existingAppMetadata && typeof existingAppMetadata === "object"
      ? { ...(existingAppMetadata as Record<string, unknown>) }
      : {};

  metadataPayload.orvelle_integrations = {
    ...integrationRecord,
    [provider]: nextState
  };

  const { data, error } = await supabase.auth.admin.updateUserById(userId, {
    app_metadata: metadataPayload
  });

  if (error) {
    throw error;
  }

  return data.user;
}

export async function ensureProviderConnectionState({
  userId,
  provider,
  accountIdentifier
}: {
  userId: string;
  provider: string;
  accountIdentifier: string;
}) {
  const supabase = createAdminClient();
  const { data, error } = await supabase.auth.admin.getUserById(userId);

  if (error) {
    throw error;
  }

  const existingState = readProviderConnectionState({
    appMetadata: data.user?.app_metadata,
    provider,
    accountIdentifier
  });

  if (existingState) {
    return existingState;
  }

  const nextState = normalizeConnectionState(provider, accountIdentifier);
  await writeProviderConnectionState({
    userId,
    provider,
    accountIdentifier,
    existingAppMetadata: data.user?.app_metadata,
    nextState
  });

  return nextState;
}

export async function updateProviderConnectionState({
  userId,
  provider,
  accountIdentifier,
  status,
  connectionHealth,
  lastEventReceived,
  lastErrorMessage
}: {
  userId: string;
  provider: string;
  accountIdentifier: string;
  status: IntegrationStatus;
  connectionHealth: IntegrationConnectionHealth;
  lastEventReceived?: string | null;
  lastErrorMessage?: string | null;
}) {
  const supabase = createAdminClient();
  const { data, error } = await supabase.auth.admin.getUserById(userId);

  if (error) {
    throw error;
  }

  const existingState = readProviderConnectionState({
    appMetadata: data.user?.app_metadata,
    provider,
    accountIdentifier
  });

  const now = new Date().toISOString();
  const nextState = normalizeConnectionState(provider, accountIdentifier, {
    ...existingState,
    status,
    connectionHealth,
    lastEventReceived:
      lastEventReceived === undefined
        ? existingState?.lastEventReceived ?? null
        : lastEventReceived,
    lastErrorAt: status === "error" ? now : null,
    lastErrorMessage: status === "error" ? lastErrorMessage ?? "Unknown integration error." : null,
    updatedAt: now
  });

  await writeProviderConnectionState({
    userId,
    provider,
    accountIdentifier,
    existingAppMetadata: data.user?.app_metadata,
    nextState
  });

  return nextState;
}
