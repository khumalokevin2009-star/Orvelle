import type { Metadata } from "next";
import { LandingPage } from "@/components/landing-page";

export const metadata: Metadata = {
  title: "Orvelle | Connect Call Systems and Recover Lost Revenue",
  description:
    "Orvelle helps service businesses identify high-intent calls that didn’t convert, surface missed revenue opportunities, and recover more jobs from existing call activity.",
  alternates: {
    canonical: "https://orvellehq.com"
  },
  openGraph: {
    title: "Orvelle | Connect Call Systems and Recover Lost Revenue",
    description:
      "Orvelle helps service businesses identify high-intent calls that didn’t convert, surface missed revenue opportunities, and recover more jobs from existing call activity.",
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
    title: "Orvelle | Connect Call Systems and Recover Lost Revenue",
    description:
      "Orvelle helps service businesses identify high-intent calls that didn’t convert, surface missed revenue opportunities, and recover more jobs from existing call activity.",
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
