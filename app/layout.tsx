import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Call Performance Overview",
  description:
    "Enterprise revenue operations workspace for monitoring conversion failures, response SLA breaches, and estimated revenue leakage across inbound call activity.",
  icons: {
    icon: [{ url: "/logo-icon.svg", type: "image/svg+xml" }],
    shortcut: ["/logo-icon.svg"],
    apple: ["/logo-icon.svg"]
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
