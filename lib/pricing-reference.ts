import { type SolutionMode } from "@/lib/solution-mode";

export type PricingReferencePackage = {
  label: string;
  onboarding: string;
  monthly: string;
  note: string;
};

export type PricingReferenceContent = {
  title: string;
  description: string;
  guidance: string;
  packages: PricingReferencePackage[];
};

export function getPricingReferenceContent(solutionMode: SolutionMode): PricingReferenceContent {
  if (solutionMode === "service_business_missed_call_recovery") {
    return {
      title: "HVAC / Service Business Pricing",
      description:
        "Founder-led reference pricing for service businesses running missed-call recovery and callback workflows.",
      guidance:
        "Use this as internal sales guidance only. Position the higher-touch option when setup support, routing rules, or operational hand-holding will be heavier.",
      packages: [
        {
          label: "Standard",
          onboarding: "£500 onboarding",
          monthly: "£349/month",
          note: "Best fit for owner-led or lean service teams adopting missed-call recovery with SMS-first follow-up."
        },
        {
          label: "Higher-touch",
          onboarding: "£750 onboarding",
          monthly: "£499/month",
          note: "Use when the account needs more setup support, tighter callback handling, or more operational guidance."
        }
      ]
    };
  }

  return {
    title: "Dental / Clinic / Call-Heavy Pricing",
    description:
      "Founder-led reference pricing for call-heavy teams focused on conversion review, call performance, and revenue recovery.",
    guidance:
      "Use this as internal sales guidance only. Position the configurable option when the account needs extra review workflows, reporting support, or higher-touch rollout.",
    packages: [
      {
        label: "Standard",
        onboarding: "£750 onboarding",
        monthly: "£499/month",
        note: "Best fit for clinics and call-heavy teams using structured review, follow-up, and conversion recovery workflows."
      },
      {
        label: "Higher-touch",
        onboarding: "Configurable onboarding",
        monthly: "Contact sales reference",
        note: "Use when the account needs custom rollout support, deeper review operations, or a more bespoke commercial scope."
      }
    ]
  };
}
