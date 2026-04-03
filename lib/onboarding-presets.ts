import type { BusinessVertical, SolutionMode } from "@/lib/solution-mode";

export type OnboardingPresetId =
  | "hvac_service_business_missed_call_recovery"
  | "dental_clinic_revenue_recovery";

export type OnboardingPreset = {
  id: OnboardingPresetId;
  label: string;
  description: string;
  businessProfile: {
    solutionMode: SolutionMode;
    businessVertical: BusinessVertical;
    businessHours: string;
  };
  missedCallRecovery: {
    defaultCallbackWindow: string;
    autoFollowUpEnabled: boolean;
    smsTemplate: string;
  };
};

export const onboardingPresets: OnboardingPreset[] = [
  {
    id: "hvac_service_business_missed_call_recovery",
    label: "HVAC / Service Business",
    description:
      "Optimised for inbound missed-call recovery with an SMS-first workflow, callback queue emphasis, and next-business-window handling after hours.",
    businessProfile: {
      solutionMode: "service_business_missed_call_recovery",
      businessVertical: "hvac",
      businessHours: "Mon-Sat, 07:00-19:00"
    },
    missedCallRecovery: {
      defaultCallbackWindow: "15 minutes during business hours / next business morning after-hours",
      autoFollowUpEnabled: true,
      smsTemplate:
        "Sorry we missed your call. This is {{businessName}}. We’ve received your service request and will call you back within {{callbackWindow}}. If urgent, call us on {{phoneNumber}}."
    }
  },
  {
    id: "dental_clinic_revenue_recovery",
    label: "Dental / Clinic / Call-Heavy",
    description:
      "Optimised for call analysis, follow-up review, and conversion recovery across high-volume enquiry workflows.",
    businessProfile: {
      solutionMode: "call_performance_revenue_recovery",
      businessVertical: "dental",
      businessHours: "Mon-Fri, 08:00-17:30"
    },
    missedCallRecovery: {
      defaultCallbackWindow: "Same business day",
      autoFollowUpEnabled: true,
      smsTemplate:
        "Thank you for calling {{businessName}}. We’ve received your enquiry and will follow up within {{callbackWindow}}. If your request is urgent, please call {{phoneNumber}}."
    }
  }
];

export function getOnboardingPresetById(presetId: OnboardingPresetId) {
  return onboardingPresets.find((preset) => preset.id === presetId) ?? null;
}
