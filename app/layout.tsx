import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Call Performance Overview",
  description:
    "Enterprise revenue operations workspace for monitoring conversion failures, response SLA breaches, and estimated revenue leakage across inbound call activity."
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
