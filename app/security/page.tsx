import type { Metadata } from "next";
import { PublicSitePage } from "@/components/public-site";

export const metadata: Metadata = {
  title: "Security | Orvelle",
  description:
    "Learn how Orvelle is designed to support secure data handling, protected access, and reliable operational workflows.",
  alternates: {
    canonical: "https://orvellehq.com/security"
  }
};

export default function SecurityPage() {
  return <PublicSitePage page="security" />;
}
