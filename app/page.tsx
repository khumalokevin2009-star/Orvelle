import type { Metadata } from "next";
import { LandingPage } from "@/components/landing-page";

export const metadata: Metadata = {
  title: "Orvelle | Recover Lost Revenue From Inbound Calls",
  description:
    "Orvelle helps service businesses connect call systems, detect high-intent calls that did not convert, and recover lost revenue from inbound demand.",
  alternates: {
    canonical: "https://orvellehq.com"
  },
  openGraph: {
    title: "Orvelle | Recover Lost Revenue From Inbound Calls",
    description:
      "Orvelle helps service businesses connect call systems, detect high-intent calls that did not convert, and recover lost revenue from inbound demand.",
    url: "https://orvellehq.com",
    images: [
      {
        url: "/landing/dashboard-preview-final.png",
        width: 1792,
        height: 1024,
        alt: "Orvelle homepage preview showing call intelligence and revenue recovery."
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "Orvelle | Recover Lost Revenue From Inbound Calls",
    description:
      "Orvelle helps service businesses connect call systems, detect high-intent calls that did not convert, and recover lost revenue from inbound demand.",
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
