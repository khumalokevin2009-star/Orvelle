import type { Metadata } from "next";
import { LandingPage } from "@/components/landing-page";

export const metadata: Metadata = {
  title: "Orvelle | Call Intelligence and Revenue Recovery Platform",
  description:
    "Orvelle connects call systems, recordings, and workflows so service businesses can detect lost revenue, prioritise callbacks, and operationalise call intelligence.",
  alternates: {
    canonical: "https://orvellehq.com"
  },
  openGraph: {
    title: "Orvelle | Call Intelligence and Revenue Recovery Platform",
    description:
      "Orvelle connects call systems, recordings, and workflows so service businesses can detect lost revenue, prioritise callbacks, and operationalise call intelligence.",
    url: "https://orvellehq.com",
    images: [
      {
        url: "/landing/dashboard-preview-final.png",
        width: 1792,
        height: 1024,
        alt: "Orvelle dashboard preview for missed revenue recovery from call activity."
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "Orvelle | Call Intelligence and Revenue Recovery Platform",
    description:
      "Orvelle connects call systems, recordings, and workflows so service businesses can detect lost revenue, prioritise callbacks, and operationalise call intelligence.",
    images: ["/landing/dashboard-preview-final.png"]
  }
};

export default function Page() {
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "Orvelle",
      url: "https://orvellehq.com",
      logo: "https://orvellehq.com/logo-icon.svg"
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "Orvelle",
      url: "https://orvellehq.com"
    }
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData)
        }}
      />
      <LandingPage />
    </>
  );
}
