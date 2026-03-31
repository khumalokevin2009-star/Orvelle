import type { Metadata } from "next";
import { LandingPage } from "@/components/landing-page";

export const metadata: Metadata = {
  title: "See Exactly Which Calls Cost You Revenue",
  description:
    "Identify missed revenue, quantify the financial loss from failed inbound calls, and give your team a prioritized recovery queue."
};

export default function Page() {
  return <LandingPage />;
}
