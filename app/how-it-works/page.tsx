import type { Metadata } from "next";
import { PublicSitePage } from "@/components/public-site";

export const metadata: Metadata = {
  title: "How It Works | Orvelle",
  description:
    "See how Orvelle moves from connected call data to missed revenue detection and recovery action for service businesses.",
  alternates: {
    canonical: "https://orvellehq.com/how-it-works"
  }
};

export default function HowItWorksPage() {
  return <PublicSitePage page="how-it-works" />;
}
