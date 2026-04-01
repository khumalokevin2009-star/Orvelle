import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://orvellehq.com"),
  applicationName: "Orvelle",
  title: "Orvelle",
  description:
    "Orvelle connects call systems, recordings, and workflows so service businesses can detect lost revenue, prioritise callbacks, and operationalise call intelligence.",
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
    title: "Orvelle | Call Intelligence and Revenue Recovery Platform",
    description:
      "Orvelle connects call systems, recordings, and workflows so service businesses can detect lost revenue, prioritise callbacks, and operationalise call intelligence.",
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
    title: "Orvelle | Call Intelligence and Revenue Recovery Platform",
    description:
      "Orvelle connects call systems, recordings, and workflows so service businesses can detect lost revenue, prioritise callbacks, and operationalise call intelligence.",
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
