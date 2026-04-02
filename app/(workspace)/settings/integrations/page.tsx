import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { IntegrationSettingsPage } from "@/components/integration-settings-page";
import {
  deriveOriginFromHeaders,
  getTwilioIntegrationSnapshot
} from "@/lib/integrations/twilio-settings";
import { getAuthenticatedUser } from "@/lib/auth/session";

export default async function SettingsIntegrationsPage() {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  const headerStore = await headers();
  const origin = deriveOriginFromHeaders(headerStore);
  const integration = await getTwilioIntegrationSnapshot({
    user,
    origin
  });

  return <IntegrationSettingsPage {...integration} />;
}
