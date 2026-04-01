import type { Metadata } from "next";
import { PublicSitePage } from "@/components/public-site";

export const metadata: Metadata = {
  title: "Integrations | Orvelle",
  description:
    "See how Orvelle is designed to fit into existing call stacks with direct integrations, email ingestion, and manual upload options.",
  alternates: {
    canonical: "https://orvellehq.com/integrations"
  }
};

export default function IntegrationsPage() {
  return <PublicSitePage page="integrations" />;
}
