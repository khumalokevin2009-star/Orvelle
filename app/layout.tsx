import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-geist-sans"
});

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
      <body className={`${geist.className} ${geist.variable}`}>{children}</body>
    </html>
  );
}
