import type { Metadata } from "next";
import { PublicSitePage } from "@/components/public-site";

export const metadata: Metadata = {
  title: "Product | Orvelle Call Intelligence Platform",
  description:
    "Explore Orvelle's call analysis engine, revenue detection layer, dashboard workspace, and operational recovery workflows for service businesses.",
  alternates: {
    canonical: "https://orvellehq.com/product"
  }
};

export default function ProductPage() {
  return <PublicSitePage page="product" />;
}
