import type { DateRangeKey } from "@/lib/analysis-window";

export type CallTabId = "missed-booking" | "delayed-response" | "original-bookings";

export type CallTableRow = {
  id: string;
  caller: string;
  time: string;
  issue: string;
  reason: string;
  recommendedAction: string;
  status: "Action Required" | "Under Review" | "Resolved" | "Escalated";
  actionStatus?: "Needs Action" | "No Action Needed";
  statusTone: "critical" | "pending" | "recovered";
  urgency: "Critical Priority" | "Elevated Priority" | "Closed";
  urgencyTone: "critical" | "pending" | "recovered";
  assignedOwner: string;
  dueBy: string;
  responseDelayHours: number;
  revenue: string;
  revenueValue: number;
  noteTop: string;
  noteBottom: string;
  category: CallTabId;
  periodByRange: Record<DateRangeKey, string>;
  phone: string;
  date: string;
  summary: string;
  nextStep: string;
  notes: string[];
  analysisPending?: boolean;
  analysisStatus?: string;
  intentLevel?: string;
  callOutcome?: string;
  missedOpportunityLabel?: string;
  missedOpportunityDetected?: boolean | null;
  primaryIssue?: string;
  revenueImpact?: string;
  revenueImpactValue?: number;
  analystNote?: string;
  conciseAnalystNote?: string;
};

export type TranscriptEntry = {
  speaker: "Caller" | "Agent" | "System";
  time: string;
  text: string;
};

export type CallDetailRecord = {
  subtitle: string;
  duration: string;
  revenueContext: string;
  transcript: TranscriptEntry[];
};

export const ACCEPTED_AUDIO_EXTENSIONS = [".mp3", ".wav", ".m4a"] as const;

export const acceptedAudioFormats = [
  ".mp3 audio recordings",
  ".wav call captures",
  ".m4a mobile call exports"
] as const;

export const uploadProcessingGuidance = [
  "Multiple recordings can be submitted within a single upload batch.",
  "Files are validated before entry into the analysis queue.",
  "Analysis preparation begins after selecting Analyze Calls."
] as const;

export const callRows: CallTableRow[] = [
  {
    id: "adam-spencer",
    caller: "Adam Spencer",
    time: "2 days ago",
    issue: "Estimated revenue leakage",
    reason: "Unconverted high-intent lead",
    recommendedAction:
      "Immediate outbound follow-up required. High purchase intent was identified during the initial interaction. No booking attempt or return contact was recorded.",
    status: "Action Required",
    statusTone: "critical",
    urgency: "Critical Priority",
    urgencyTone: "critical",
    assignedOwner: "M. Patel",
    dueBy: "Today • 16:00",
    responseDelayHours: 4.2,
    revenue: "£250",
    revenueValue: 250,
    noteTop: "Inbound voicemail captured -",
    noteBottom: "no outbound contact",
    category: "missed-booking",
    periodByRange: {
      "7d": "Fri",
      "30d": "W5",
      "90d": "May"
    },
    phone: "+1 (949) 256-9004",
    date: "March 28, 2026 • 11:12 AM",
    summary:
      "The caller requested appointment availability and demonstrated direct purchase intent. The interaction concluded without a booking attempt or documented outbound follow-up.",
    nextStep: "Inspect the voicemail record and initiate same-day outbound contact.",
    notes: ["Voicemail captured during midday coverage gap."]
  },
  {
    id: "emily-green",
    caller: "Emily Green",
    time: "2 days ago",
    issue: "Estimated revenue leakage",
    reason: "Response SLA breach",
    recommendedAction:
      "Immediate ownership assignment required. Response timing exceeded the defined service-level window. Complete customer outreach before end of business day.",
    status: "Under Review",
    statusTone: "pending",
    urgency: "Elevated Priority",
    urgencyTone: "pending",
    assignedOwner: "R. Chen",
    dueBy: "Today • 18:00",
    responseDelayHours: 6.8,
    revenue: "£250",
    revenueValue: 250,
    noteTop: "Response window exceeded -",
    noteBottom: "conversion risk elevated",
    category: "delayed-response",
    periodByRange: {
      "7d": "Thu",
      "30d": "W4",
      "90d": "Apr"
    },
    phone: "+1 (714) 818-0193",
    date: "March 28, 2026 • 2:45 PM",
    summary:
      "The caller requested same-day availability; however, the return contact was not completed within the defined response window, increasing the probability of conversion loss.",
    nextStep: "Validate response timestamps and assign accountable follow-up ownership.",
    notes: ["Customer requested same-day service availability."]
  },
  {
    id: "brian-thompson",
    caller: "Brian Thompson",
    time: "2 days ago",
    issue: "Revenue reinstated",
    reason: "Resolved revenue recovery case",
    recommendedAction:
      "No additional remediation is required. Booking recovery was completed and the revenue opportunity has been restored to pipeline.",
    status: "Resolved",
    statusTone: "recovered",
    urgency: "Closed",
    urgencyTone: "recovered",
    assignedOwner: "L. Mercer",
    dueBy: "Completed",
    responseDelayHours: 1.9,
    revenue: "£500",
    revenueValue: 500,
    noteTop: "Booking intent recovered -",
    noteBottom: "appointment confirmed",
    category: "original-bookings",
    periodByRange: {
      "7d": "Tue",
      "30d": "W2",
      "90d": "Feb"
    },
    phone: "+1 (657) 341-2280",
    date: "March 27, 2026 • 4:08 PM",
    summary:
      "The caller confirmed budget and timing requirements. A subsequent remediation action was completed and the appointment was successfully reinstated.",
    nextStep: "Confirm appointment metadata and archive the interaction record.",
    notes: ["Outbound recovery contact completed and appointment confirmed."]
  },
  {
    id: "sarah-lee",
    caller: "Sarah Lee",
    time: "2 days ago",
    issue: "Estimated revenue leakage",
    reason: "Escalated voicemail interaction",
    recommendedAction:
      "Escalation required. Booking intent was communicated through voicemail and no same-day response was issued. Assign front desk ownership and schedule immediate outbound contact.",
    status: "Escalated",
    statusTone: "critical",
    urgency: "Critical Priority",
    urgencyTone: "critical",
    assignedOwner: "Front Desk Ops",
    dueBy: "Immediate",
    responseDelayHours: 8.4,
    revenue: "£200",
    revenueValue: 200,
    noteTop: "Voicemail request unattended -",
    noteBottom: "no same-day response",
    category: "missed-booking",
    periodByRange: {
      "7d": "Mon",
      "30d": "W1",
      "90d": "Jan"
    },
    phone: "+1 (310) 440-7818",
    date: "March 27, 2026 • 9:36 AM",
    summary:
      "A voicemail-based booking request was received before operating hours and remained without documented outreach during the same business day.",
    nextStep: "Escalate to front desk operations and schedule next-available callback.",
    notes: ["No queue ownership was assigned before office opening."]
  }
];

const callDetailContent: Record<string, CallDetailRecord> = {
  "adam-spencer": {
    subtitle: "Unconverted High-Intent Lead",
    duration: "3m 18s",
    revenueContext:
      "Estimated revenue exposure is based on standard first-visit repair value and the customer's stated purchase intent during the interaction.",
    transcript: [
      {
        speaker: "Caller",
        time: "00:04",
        text: "Hi, this is Adam Spencer. I wanted to check whether you have an appointment available for tomorrow afternoon."
      },
      {
        speaker: "Agent",
        time: "00:17",
        text: "I can review the schedule. Can I take your number and have someone call you back shortly?"
      },
      {
        speaker: "Caller",
        time: "00:41",
        text: "Yes, please. The air conditioning has stopped working and I am ready to book if there is availability."
      },
      {
        speaker: "Agent",
        time: "01:06",
        text: "Understood. I will have the team review tomorrow's calendar and return the call."
      },
      {
        speaker: "System",
        time: "03:18",
        text: "Interaction closed without booking confirmation, callback log, or documented follow-up."
      }
    ]
  },
  "emily-green": {
    subtitle: "Response SLA Breach",
    duration: "4m 06s",
    revenueContext:
      "Revenue impact is derived from the customer's same-day service request and expected appointment conversion value.",
    transcript: [
      {
        speaker: "Caller",
        time: "00:06",
        text: "Hello, I need to know if someone can come out today. The unit is leaking and I would like to get this booked now."
      },
      {
        speaker: "Agent",
        time: "00:28",
        text: "I will need to route this to dispatch. Someone should follow up with you this afternoon."
      },
      {
        speaker: "Caller",
        time: "01:02",
        text: "That is fine, but I would appreciate a call back as soon as possible because I need to confirm before leaving work."
      },
      {
        speaker: "System",
        time: "04:06",
        text: "No completed callback event was recorded within the configured service-level response window."
      }
    ]
  },
  "brian-thompson": {
    subtitle: "Recovered Revenue Opportunity",
    duration: "5m 11s",
    revenueContext:
      "This record reflects an originally at-risk booking that was subsequently recovered through outbound remediation.",
    transcript: [
      {
        speaker: "Caller",
        time: "00:09",
        text: "I am calling because I need to schedule a system inspection this week if possible. I would like to move forward today."
      },
      {
        speaker: "Agent",
        time: "00:37",
        text: "I can capture the request and have the office confirm the exact appointment slot."
      },
      {
        speaker: "Caller",
        time: "01:20",
        text: "That works. Please call me back once the schedule is confirmed."
      },
      {
        speaker: "System",
        time: "05:11",
        text: "Follow-up completed. Appointment confirmed during recovery outreach and revenue exposure closed."
      }
    ]
  },
  "sarah-lee": {
    subtitle: "Unconverted High-Intent Lead",
    duration: "1m 42s",
    revenueContext:
      "Estimated revenue exposure is based on voicemail-requested service intent and the average booking value for priority callouts.",
    transcript: [
      {
        speaker: "Caller",
        time: "00:03",
        text: "Hi, this is Sarah Lee. I would like to schedule an appointment as soon as possible for a heating issue at my home."
      },
      {
        speaker: "Caller",
        time: "00:24",
        text: "Please call me back this morning if you have anything available. I am ready to confirm the booking."
      },
      {
        speaker: "System",
        time: "01:42",
        text: "Voicemail received before operating hours. No same-day callback log or booking attempt was documented."
      }
    ]
  }
};

function getDefaultSubtitle(row: CallTableRow) {
  if (row.category === "original-bookings") {
    return "Recovered Revenue Opportunity";
  }

  if (row.category === "delayed-response") {
    return "Response SLA Breach";
  }

  return "Unconverted High-Intent Lead";
}

export function getCallRecordById(id: string) {
  return callRows.find((entry) => entry.id === id);
}

export function getCallDetailRecord(row: CallTableRow): CallDetailRecord {
  return (
    callDetailContent[row.id] ?? {
      subtitle: getDefaultSubtitle(row),
      duration: "3m 00s",
      revenueContext:
        "Estimated revenue impact is calculated using the projected appointment value associated with the flagged interaction.",
      transcript: [
        {
          speaker: "Caller",
          time: "00:06",
          text: "Customer contacted the business to request service and indicated clear purchase intent."
        },
        {
          speaker: "System",
          time: "03:00",
          text: "Interaction record closed without a completed booking or sufficient follow-up documentation."
        }
      ]
    }
  );
}
