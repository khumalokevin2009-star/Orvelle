import { defaultSolutionMode, type SolutionMode } from "@/lib/solution-mode";

export function getSolutionModeCopy(solutionMode: SolutionMode = defaultSolutionMode) {
  if (solutionMode === "service_business_missed_call_recovery") {
    return {
      shell: {
        dashboardLabel: "Missed Call Recovery",
        dashboardMobileLabel: "Recovery",
        recoveryLabel: "Recovery Queue",
        recoveryMobileLabel: "Queue",
        automationsLabel: "Follow-Up Rules",
        settingsLabel: "Business Settings"
      },
      recoveryPage: {
        title: "Missed Call Recovery",
        description: "Review missed inbound calls, assess jobs at risk, and trigger follow-up actions.",
        summaryPrimaryLabel: "Missed Calls Today",
        summaryFollowUpLabel: "Follow-Up Required",
        summaryRiskLabel: "Jobs At Risk",
        summaryRiskDetail: "Open missed-call recovery jobs still requiring callback action.",
        focusedLabel: "Focused recovery case",
        queueTitle: "Recovery Queue",
        queueDescription:
          "Operational work surface for triaging missed inbound calls and keeping high-value follow-up on track."
      },
      callRecord: {
        missedCallTitle: "Missed Call Recovery Record",
        missedCallDescription:
          "Detailed review of a missed inbound call, the job value attached to it, and the next operational recovery step.",
        backLabel: "Back to Recovery Queue"
      },
      dashboard: {
        serviceFollowUpLabel: "Follow-Up Required",
        serviceJobsAtRiskLabel: "Jobs At Risk"
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
