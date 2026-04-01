import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://orvellehq.com"),
  applicationName: "Orvelle",
  title: "Orvelle",
  description:
    "Orvelle helps service businesses identify high-intent calls that didn’t convert, surface missed revenue opportunities, and recover more jobs from existing call activity.",
  icons: {
    icon: [
      {
        url: "/logo-icon.svg",
        type: "image/svg+xml",
        sizes: "any"
      }
    ],
    shortcut: ["/logo-icon.svg"],
    apple: ["/logo-icon.svg"]
  },
  openGraph: {
    type: "website",
    url: "https://orvellehq.com",
    siteName: "Orvelle",
    title: "Orvelle | Connect Call Systems and Recover Lost Revenue",
    description:
      "Orvelle helps service businesses identify high-intent calls that didn’t convert, surface missed revenue opportunities, and recover more jobs from existing call activity.",
    images: [
      {
        url: "/landing/dashboard-preview-final.png",
        width: 1792,
        height: 1024,
        alt: "Orvelle dashboard showing missed revenue recovery insights from call activity."
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

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
