import { defaultSolutionMode, type SolutionMode } from "@/lib/solution-mode";

export function getSolutionModeCopy(solutionMode: SolutionMode = defaultSolutionMode) {
  if (solutionMode === "service_business_missed_call_recovery") {
    return {
      shell: {
        dashboardLabel: "Missed Calls",
        dashboardMobileLabel: "Missed",
        recoveryLabel: "Missed Calls",
        recoveryMobileLabel: "Missed",
        automationsLabel: "Follow-Up Rules",
        settingsLabel: "Business Settings"
      },
      recoveryPage: {
        title: "Missed Calls",
        description: "Review missed inbound calls and keep callbacks moving.",
        summaryPrimaryLabel: "Missed Calls Today",
        summaryFollowUpLabel: "Open Follow-Ups",
        summaryRiskLabel: "Open Cases",
        summaryRiskDetail: "Missed calls that still need a callback or a final resolution.",
        focusedLabel: "Selected missed call",
        queueTitle: "Missed Calls",
        queueDescription:
          "Simple working list for missed inbound calls and callback follow-up."
      },
      callRecord: {
        missedCallTitle: "Missed Call Record",
        missedCallDescription:
          "Open the missed call, review the transcript if available, and keep notes and callback status up to date.",
        backLabel: "Back to Missed Calls"
      },
      dashboard: {
        serviceFollowUpLabel: "Open Follow-Ups",
        serviceJobsAtRiskLabel: "Open Cases"
      }
    };
  }

  return {
    shell: {
      dashboardLabel: "Call Performance",
      dashboardMobileLabel: "Performance",
      recoveryLabel: "Revenue Recovery",
      recoveryMobileLabel: "Recovery",
      automationsLabel: "Workflow Rules",
      settingsLabel: "Configuration"
    },
    recoveryPage: {
      title: "Revenue Recovery Queue",
      description:
        "Review conversion failures, missed inbound calls, revenue at risk, and follow-up actions requiring commercial recovery.",
      summaryPrimaryLabel: "Conversion Failures",
      summaryFollowUpLabel: "Follow-Up Required",
      summaryRiskLabel: "Revenue At Risk",
      summaryRiskDetail: "Estimated revenue still exposed across unresolved recovery cases.",
      focusedLabel: "Focused recovery case",
      queueTitle: "Revenue Recovery Queue",
      queueDescription:
        "Operational work surface for reviewing conversion failures, missed-call recovery cases, and follow-up actions still affecting revenue recovery."
    },
    callRecord: {
      missedCallTitle: "Revenue Recovery Record",
      missedCallDescription:
        "Detailed review of a recovery case, the revenue risk attached to it, and the next commercial action required.",
      backLabel: "Back to Revenue Recovery Queue"
    },
    dashboard: {
      serviceFollowUpLabel: "Follow-Up Required",
      serviceJobsAtRiskLabel: "Jobs At Risk"
    }
  };
}
