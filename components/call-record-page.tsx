"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useSolutionMode } from "@/components/solution-mode-provider";
import { WorkspacePageHeader } from "@/components/workspace-page-header";
import { getServiceMissedCallStatus, SERVICE_MISSED_CALL_CALLED_BACK_NOTE, SERVICE_MISSED_CALL_RESOLVED_NOTE } from "@/lib/service-missed-call-status";
import { getServiceCallerIdentity, isPersistedCallRecordId, type DashboardCallRow } from "@/lib/dashboard-calls";
import type { CallRecordDetail, TranscriptEntry } from "@/lib/call-detail";
import { getSolutionModeCopy } from "@/lib/solution-mode-copy";
import { defaultSolutionMode, type SolutionMode } from "@/lib/solution-mode";
import {
  formatServiceAnsweredCallOutcomeLabel,
  normalizeServiceAnsweredCallOutcome,
  serviceAnsweredCallOutcomeOptions,
  type ServiceAnsweredCallOutcome
} from "@/lib/service-answered-call-outcomes";
import { createClient } from "@/lib/supabase/client";
import {
  assignMissedCallWorkflowOwner,
  buildMissedCallHistory,
  formatMissedCallLastAction,
  getMissedCallBookingCreatedLabel,
  getMissedCallRecoveredValue,
  getMissedCallRecoveryOutcome,
  getMissedCallResolutionReason,
  getMissedCallWorkflowStatus,
  getOwnerLabelFromAuthUser,
  isMissedCallAssignedToOwner,
  isMissedCallRecoveryRecord,
  mergeMissedCallWorkflowRow,
  setMissedCallRecoveryOutcome,
  transitionMissedCallWorkflowRow
} from "@/lib/missed-call-workflow";

const defaultAnalysisSummary: CallRecordDetail["analysisSummary"] = {
  intentLevel: "Analysis not yet generated",
  callOutcome: "Analysis not yet generated",
  missedOpportunity: "Analysis not yet generated",
  revenueImpact: "Analysis not yet generated",
  primaryIssue: "Pending classification",
  confidenceScore: "Not available",
  callOutcomeTone: "neutral",
  missedOpportunityTone: "neutral"
};

function normalizeDetailState(detail: CallRecordDetail): CallRecordDetail {
  return {
    ...detail,
    analysisSummary: {
      ...defaultAnalysisSummary,
      ...(detail.analysisSummary ?? {})
    }
  };
}

function CardSection({
  title,
  description,
  children
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="surface-primary p-6">
      <div>
        <h3 className="type-section-title text-[18px]">{title}</h3>
        {description ? <p className="type-body-text mt-2 text-[14px]">{description}</p> : null}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function MetaField({ label, value }: { label: string; value: string }) {
  return (
    <div className="surface-secondary px-4 py-4">
      <div className="type-label-text text-[12px]">{label}</div>
      <div className="type-section-title mt-2 text-[15px]">{value}</div>
    </div>
  );
}

function formatTimelineTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0
  }).format(value);
}

function getSummaryToneClasses(tone: "neutral" | "success" | "warning" | "critical") {
  switch (tone) {
    case "success":
      return "border-[#D9ECDD] bg-[#F3FBF5]";
    case "warning":
      return "border-[#F0DFC1] bg-[#FFF9EE]";
    case "critical":
      return "border-[#F2D8D8] bg-[#FFF6F6]";
    case "neutral":
    default:
      return "border-[#E5E7EB] bg-[#F9FAFB]";
  }
}

function getSummaryValueToneClasses(tone: "neutral" | "success" | "warning" | "critical") {
  switch (tone) {
    case "success":
      return "text-[#2D7046]";
    case "warning":
      return "text-[#946C19]";
    case "critical":
      return "text-[#A04C4C]";
    case "neutral":
    default:
      return "text-[#111827]";
  }
}

function getTranscriptTone(speaker: TranscriptEntry["speaker"]) {
  if (speaker === "Caller") {
    return "border-[#E5EAF4] bg-[#FBFCFF]";
  }

  if (speaker === "Agent") {
    return "border-[#DCE7F8] bg-[#F7FAFF]";
  }

  return "border-[#F0E4C9] bg-[#FFF9ED]";
}

function getOperationalOutcomeTone(statusTone: DashboardCallRow["statusTone"]) {
  if (statusTone === "recovered") {
    return "border-[#D9ECDD] bg-[#F3FBF5] text-[#2D7046]";
  }

  if (statusTone === "pending") {
    return "border-[#DCE7F8] bg-[#F7FAFF] text-[#355A93]";
  }

  return "border-[#F2D8D8] bg-[#FFF6F6] text-[#A04C4C]";
}

function getServiceMissedCallStatusClasses(status: string) {
  const normalizedStatus = status.toLowerCase();

  if (normalizedStatus === "resolved") {
    return "border-[#D1E9D7] bg-[#F4FBF5] text-[#256B44]";
  }

  if (normalizedStatus === "sms sent") {
    return "border-[#DCE7F8] bg-[#F7FAFF] text-[#355A93]";
  }

  if (normalizedStatus === "called back") {
    return "border-[#FDE68A] bg-[#FFFBEB] text-[#92400E]";
  }

  return "border-[#F2D8D8] bg-[#FFF6F6] text-[#A04C4C]";
}

function getServiceNoteSummary(row: DashboardCallRow) {
  const noteCount = row.noteCount ?? 0;
  const latestNote = row.latestNotePreview?.trim();

  if (noteCount <= 0) {
    return "No note added";
  }

  if (latestNote) {
    return `${noteCount} note${noteCount === 1 ? "" : "s"} • ${latestNote}`;
  }

  return `${noteCount} note${noteCount === 1 ? "" : "s"} saved`;
}

function SummaryField({
  label,
  value,
  detail
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="surface-secondary px-4 py-4">
      <div className="type-label-text text-[11px]">{label}</div>
      <div className="type-section-title mt-2 text-[17px] leading-6">{value}</div>
      {detail ? <p className="type-body-text mt-2 text-[13px]">{detail}</p> : null}
    </div>
  );
}

function parseTranscriptEntriesFromText(transcriptText: string): TranscriptEntry[] {
  if (!transcriptText.trim()) {
    return [];
  }

  const matches = Array.from(
    transcriptText.matchAll(/(Caller voicemail|Caller|Agent|System):\s*([\s\S]*?)(?=(?:Caller voicemail|Caller|Agent|System):|$)/gi)
  );

  if (matches.length === 0) {
    return [
      {
        speaker: "System",
        time: "Segment 01",
        text: transcriptText.trim()
      }
    ];
  }

  return matches.map((match, index) => {
    const rawSpeaker = match[1].toLowerCase();
    const speaker: TranscriptEntry["speaker"] =
      rawSpeaker.startsWith("agent")
        ? "Agent"
        : rawSpeaker.startsWith("system")
          ? "System"
          : "Caller";

    return {
      speaker,
      time: `Segment ${String(index + 1).padStart(2, "0")}`,
      text: match[2].trim()
    };
  });
}

export function CallRecordPage({
  initialRow,
  detail,
  solutionMode = defaultSolutionMode
}: {
  initialRow: DashboardCallRow;
  detail: CallRecordDetail;
  solutionMode?: SolutionMode;
}) {
  const router = useRouter();
  const resolvedSolutionMode = useSolutionMode(solutionMode);
  const copy = getSolutionModeCopy(resolvedSolutionMode);
  const isServiceBusinessMode = resolvedSolutionMode === "service_business_missed_call_recovery";
  const [row, setRow] = useState(() => mergeMissedCallWorkflowRow(initialRow));
  const [detailState, setDetailState] = useState(() => normalizeDetailState(detail));
  const [notice, setNotice] = useState<string | null>(null);
  const [noticeTone, setNoticeTone] = useState<"success" | "error">("success");
  const [isGeneratingTranscript, setIsGeneratingTranscript] = useState(false);
  const [transcriptError, setTranscriptError] = useState<string | null>(null);
  const [isGeneratingAnalysis, setIsGeneratingAnalysis] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [isSendingFollowUp, setIsSendingFollowUp] = useState(false);
  const [currentOwnerLabel, setCurrentOwnerLabel] = useState<string | null>(null);
  const analysisSummary = detailState.analysisSummary ?? defaultAnalysisSummary;
  const operationalOutcome = row.callOutcome ?? analysisSummary.callOutcome;
  const isMissedCallRecovery = isMissedCallRecoveryRecord(row);
  const isServiceAnsweredCall =
    isServiceBusinessMode && !isMissedCallRecovery;
  const manualAnsweredCallOutcome = normalizeServiceAnsweredCallOutcome(row.callOutcome);
  const serviceMissedCallStatus =
    isServiceBusinessMode && isMissedCallRecovery ? getServiceMissedCallStatus(row) : null;
  const serviceCallerLabel = getServiceCallerIdentity(row.phone);
  const callerLabel = isServiceBusinessMode ? serviceCallerLabel : row.caller;
  const canPersistCallNote = isPersistedCallRecordId(row.id);
  const historyEntries = isMissedCallRecovery ? buildMissedCallHistory(row) : [];
  const recoveryOutcome = isMissedCallRecovery ? getMissedCallRecoveryOutcome(row) : null;
  const recoveredValue = isMissedCallRecovery ? getMissedCallRecoveredValue(row) : 0;
  const resolutionReason = isMissedCallRecovery ? getMissedCallResolutionReason(row) : null;
  const bookingCreatedLabel = isMissedCallRecovery ? getMissedCallBookingCreatedLabel(row) : null;
  const currentWorkflowStatus = isMissedCallRecovery ? getMissedCallWorkflowStatus(row) : null;
  const backHref = isServiceBusinessMode ? "/dashboard" : isMissedCallRecovery ? "/missed-calls" : "/dashboard";
  const backLabel =
    isServiceBusinessMode || !isMissedCallRecovery ? "Back to Dashboard" : copy.callRecord.backLabel;
  const primaryStatusValue = isMissedCallRecovery
    ? (currentWorkflowStatus ?? "Action Required")
    : operationalOutcome;
  const callRecordTitle = isMissedCallRecovery
    ? (isServiceBusinessMode ? "Missed Call Record" : copy.callRecord.missedCallTitle)
    : isServiceBusinessMode
      ? "Call Record"
      : "Call Analysis Record";
  const callRecordDescription = isMissedCallRecovery
    ? isServiceBusinessMode
      ? "Review the missed call, add notes, and keep the callback work simple and clear."
      : copy.callRecord.missedCallDescription
    : isServiceBusinessMode
      ? "View the transcript, add notes, and set a simple outcome for this answered call."
      : "Detailed inspection of a flagged interaction, associated conversion failure indicators, and required revenue recovery actions.";
  const heroLabel = isServiceBusinessMode
    ? isMissedCallRecovery
      ? "Missed inbound call"
      : "Answered inbound call"
    : detailState.subtitle;
  const heroStatusLabel = isServiceBusinessMode
    ? isMissedCallRecovery
      ? (serviceMissedCallStatus ?? primaryStatusValue)
      : "Answered call"
    : isMissedCallRecovery
      ? primaryStatusValue
      : row.status;
  const issueIdentified =
    analysisSummary.primaryIssue !== "Pending classification"
      ? analysisSummary.primaryIssue
      : row.primaryIssue ?? row.reason;

  useEffect(() => {
    setRow(mergeMissedCallWorkflowRow(initialRow));
  }, [initialRow]);

  useEffect(() => {
    let isActive = true;

    async function hydrateCurrentUser() {
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getUser();

        if (!isActive) {
          return;
        }

        setCurrentOwnerLabel(getOwnerLabelFromAuthUser(data.user));
      } catch (error) {
        console.error("[call-record] Failed to resolve current owner label.", error);
      }
    }

    void hydrateCurrentUser();

    return () => {
      isActive = false;
    };
  }, []);

  async function saveCallNote(note: string) {
    if (!canPersistCallNote) {
      throw new Error("Notes are only available for saved live call records.");
    }

    const response = await fetch(`/api/calls/${row.id}/notes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ note })
    });

    const payload = (await response.json().catch(() => null)) as
      | {
          message?: string;
          latestNote?: string | null;
          noteCount?: number;
        }
      | null;

    if (!response.ok) {
      throw new Error(payload?.message || "Unable to save the note right now.");
    }

    return {
      latestNote: payload?.latestNote ?? note,
      noteCount: payload?.noteCount
    };
  }

  async function handleResolve() {
    if (!isMissedCallRecovery && row.status === "Resolved") {
      setNoticeTone("error");
      setNotice("This interaction record is already marked as resolved.");
      return;
    }

    if (isMissedCallRecovery) {
      if (recoveryOutcome === "Not Recovered") {
        setNoticeTone("error");
        setNotice("This case is already closed as not recovered.");
        return;
      }

      if (isServiceBusinessMode) {
        try {
          const savedNote = await saveCallNote(SERVICE_MISSED_CALL_RESOLVED_NOTE);

          setRow((currentRow) => ({
            ...setMissedCallRecoveryOutcome(currentRow, "Not Recovered"),
            latestNotePreview: savedNote.latestNote,
            noteCount: savedNote.noteCount ?? (currentRow.noteCount ?? 0) + 1,
            notes: currentRow.notes.includes(savedNote.latestNote)
              ? currentRow.notes
              : [savedNote.latestNote, ...currentRow.notes]
          }));
          setNoticeTone("success");
          setNotice("Case marked as resolved.");
        } catch (error) {
          setNoticeTone("error");
          setNotice(error instanceof Error ? error.message : "Unable to update the case right now.");
        }
        return;
      }

      setRow(setMissedCallRecoveryOutcome(row, "Not Recovered"));
      setNoticeTone("success");
      setNotice("Case closed as not recovered.");
      return;
    }

    setRow((currentRow) => ({
      ...currentRow,
      issue: "Recovered revenue opportunity",
      reason: "Remediation workflow completed",
      status: "Resolved",
      workflowStatusLabel: "Resolved",
      statusTone: "recovered",
      urgency: "Closed",
      urgencyTone: "recovered",
      dueBy: "Completed",
      recommendedAction:
        "No further remediation is required. Revenue recovery workflow has been completed and the interaction record may remain in monitoring status for audit purposes.",
      notes: currentRow.notes.includes("Interaction marked as resolved from the call detail page.")
        ? currentRow.notes
        : ["Interaction marked as resolved from the call detail page.", ...currentRow.notes]
    }));
    setNoticeTone("success");
    setNotice("Interaction marked as resolved.");
  }

  function handleMarkRecovered() {
    if (!isMissedCallRecovery) {
      return;
    }

    if (recoveryOutcome === "Recovered") {
      setNoticeTone("error");
      setNotice("This case is already marked as recovered.");
      return;
    }

    setRow(setMissedCallRecoveryOutcome(row, "Recovered"));
    setNoticeTone("success");
    setNotice("Case closed as recovered.");
  }

  async function handleSendFollowUp() {
    if (isSendingFollowUp) {
      return;
    }

    if (row.status === "Resolved") {
      setNoticeTone("error");
      setNotice("Resolved interaction records do not require additional follow-up scheduling.");
      return;
    }

    setIsSendingFollowUp(true);
    setNotice(null);

    try {
      const response = await fetch(`/api/calls/${row.id}/follow-up`, {
        method: "POST"
      });

      const payload = (await response.json().catch(() => null)) as
        | {
            message?: string;
          }
        | null;

      if (!response.ok) {
        throw new Error(payload?.message || "Unable to send the follow-up right now.");
      }

      if (isMissedCallRecovery) {
        setRow(transitionMissedCallWorkflowRow(row, "Follow-Up Sent"));
      } else {
        setRow((currentRow) => ({
          ...currentRow,
          status: currentRow.status === "Escalated" ? "Escalated" : "Under Review",
          workflowStatusLabel: "Follow-Up Sent",
          statusTone: currentRow.status === "Escalated" ? "critical" : "pending",
          dueBy: "Within 2 Hours",
          recommendedAction:
            "Immediate outbound follow-up required. Lead exhibited high purchase intent and should be contacted within the active recovery window. Document call outcome and booking disposition upon completion.",
          notes: currentRow.notes.includes("Follow-up sent from the call detail page.")
            ? currentRow.notes
            : ["Follow-up sent from the call detail page.", ...currentRow.notes]
        }));
      }
      setNoticeTone("success");
      setNotice(payload?.message || "Follow-up sent and recovery workflow updated.");
    } catch (error) {
      setNoticeTone("error");
      setNotice(error instanceof Error ? error.message : "Unable to send the follow-up right now.");
    } finally {
      setIsSendingFollowUp(false);
    }
  }

  function handleEscalate() {
    if (row.status === "Resolved") {
      setNoticeTone("error");
      setNotice("Resolved interaction records cannot be escalated.");
      return;
    }

    if (isMissedCallRecovery) {
      if (currentWorkflowStatus === "Escalated") {
        setNoticeTone("error");
        setNotice("This case is already escalated.");
        return;
      }

      setRow(transitionMissedCallWorkflowRow(row, "Escalated"));
      setNoticeTone("success");
      setNotice("Case escalated for immediate recovery handling.");
      return;
    }

    setRow((currentRow) => ({
      ...currentRow,
      status: "Escalated",
      workflowStatusLabel: "Escalated",
      statusTone: "critical",
      urgency: "Critical Priority",
      urgencyTone: "critical",
      dueBy: "Immediate escalation",
      nextStep: "Escalate to manager and call back",
      recommendedAction:
        "Escalate the case to senior operations ownership immediately, then complete an outbound recovery call while purchase intent remains active.",
      notes: currentRow.notes.includes("Case escalated from the call detail page.")
        ? currentRow.notes
        : ["Case escalated from the call detail page.", ...currentRow.notes]
    }));
    setNoticeTone("success");
    setNotice("Case escalated for immediate recovery handling.");
  }

  async function handleAddNote() {
    if (!canPersistCallNote) {
      setNoticeTone("error");
      setNotice("Notes are only available for saved live call records.");
      return;
    }

    const note = window.prompt(`Enter an operational note for ${callerLabel}`);

    if (!note?.trim()) {
      return;
    }

    try {
      const savedNote = await saveCallNote(note.trim());

      setRow((currentRow) => ({
        ...currentRow,
        updatedAtRaw: new Date().toISOString(),
        latestNotePreview: savedNote.latestNote,
        noteCount: savedNote.noteCount ?? (currentRow.noteCount ?? 0) + 1,
        notes: currentRow.notes.includes(savedNote.latestNote)
          ? currentRow.notes
          : [savedNote.latestNote, ...currentRow.notes]
      }));
      setNoticeTone("success");
      setNotice("Operational note recorded.");
    } catch (error) {
      setNoticeTone("error");
      setNotice(error instanceof Error ? error.message : "Unable to save the note right now.");
    }
  }

  function handleSetAnsweredCallOutcome(outcome: ServiceAnsweredCallOutcome) {
    if (!isServiceAnsweredCall) {
      return;
    }

    setRow((currentRow) => ({
      ...currentRow,
      callOutcome: outcome,
      notes: currentRow.notes.includes(`Outcome recorded: ${formatServiceAnsweredCallOutcomeLabel(outcome)}`)
        ? currentRow.notes
        : [`Outcome recorded: ${formatServiceAnsweredCallOutcomeLabel(outcome)}`, ...currentRow.notes]
    }));
    setNoticeTone("success");
    setNotice(`Outcome updated to ${formatServiceAnsweredCallOutcomeLabel(outcome)}.`);
  }

  async function handleMarkCalledBack() {
    if (!isMissedCallRecovery) {
      return;
    }

    try {
      const savedNote = await saveCallNote(SERVICE_MISSED_CALL_CALLED_BACK_NOTE);

      setRow((currentRow) => ({
        ...currentRow,
        status: currentRow.status === "Resolved" ? currentRow.status : "Under Review",
        statusTone: currentRow.status === "Resolved" ? currentRow.statusTone : "pending",
        actionStatus: currentRow.status === "Resolved" ? "No Action Needed" : "Needs Action",
        updatedAtRaw: new Date().toISOString(),
        latestNotePreview: savedNote.latestNote,
        noteCount: savedNote.noteCount ?? (currentRow.noteCount ?? 0) + 1,
        notes: currentRow.notes.includes(savedNote.latestNote)
          ? currentRow.notes
          : [savedNote.latestNote, ...currentRow.notes]
      }));
      setNoticeTone("success");
      setNotice("Marked as called back.");
    } catch (error) {
      setNoticeTone("error");
      setNotice(error instanceof Error ? error.message : "Unable to update the call right now.");
    }
  }

  function handleToggleOwnership() {
    if (!isMissedCallRecovery || !currentOwnerLabel) {
      return;
    }

    const nextOwner = isMissedCallAssignedToOwner(row, currentOwnerLabel)
      ? null
      : currentOwnerLabel;

    setRow(assignMissedCallWorkflowOwner(row, nextOwner));
    setNoticeTone("success");
    setNotice(
      nextOwner
        ? `Ownership assigned to ${nextOwner}.`
        : "Case returned to the unassigned queue."
    );
  }

  async function handleGenerateTranscript() {
    if (isGeneratingTranscript) {
      return;
    }

    setIsGeneratingTranscript(true);
    setTranscriptError(null);
    setNotice(null);
    setNoticeTone("success");

    try {
      const response = await fetch(`/api/calls/${row.id}/transcript`, {
        method: "POST"
      });

      const payload = (await response.json().catch(() => null)) as
        | {
            message?: string;
            transcriptText?: string;
            transcriptEntries?: TranscriptEntry[];
            confidenceScore?: number | null;
          }
        | null;

      if (!response.ok) {
        throw new Error(payload?.message || "Transcript generation failed.");
      }

      const nextEntries =
        payload?.transcriptEntries && payload.transcriptEntries.length > 0
          ? payload.transcriptEntries
          : parseTranscriptEntriesFromText(payload?.transcriptText || "");

      if (nextEntries.length === 0) {
        throw new Error("Transcript generation completed without transcript content.");
      }

      setDetailState((currentDetail) => ({
        ...normalizeDetailState(currentDetail),
        transcriptPending: false,
        transcript: nextEntries,
        analysisSummary: {
          ...(currentDetail.analysisSummary ?? defaultAnalysisSummary),
          confidenceScore:
            typeof payload?.confidenceScore === "number"
              ? `${payload.confidenceScore.toFixed(1)}%`
              : (currentDetail.analysisSummary?.confidenceScore ?? defaultAnalysisSummary.confidenceScore)
        }
      }));
      setAnalysisError(null);
      setNoticeTone("success");
      setNotice(payload?.message || "Transcript generated and stored successfully.");
    } catch (error) {
      setTranscriptError(error instanceof Error ? error.message : "Transcript generation failed.");
    } finally {
      setIsGeneratingTranscript(false);
    }
  }

  async function handleGenerateAnalysis() {
    if (isGeneratingAnalysis) {
      return;
    }

    setIsGeneratingAnalysis(true);
    setAnalysisError(null);
    setNotice(null);
    setNoticeTone("success");

    try {
      const response = await fetch(`/api/calls/${row.id}/analysis`, {
        method: "POST"
      });

      const payload = (await response.json().catch(() => null)) as
        | {
            message?: string;
            row?: DashboardCallRow;
            detail?: CallRecordDetail;
          }
        | null;

      if (!response.ok) {
        throw new Error(payload?.message || "Analysis generation failed.");
      }

      if (payload?.row) {
        setRow(payload.row);
      }

      if (payload?.detail) {
        setDetailState(normalizeDetailState(payload.detail));
      }

      setNoticeTone("success");
      setNotice(payload?.message || "Structured analysis generated and stored successfully.");
      router.refresh();
    } catch (error) {
      setAnalysisError(error instanceof Error ? error.message : "Analysis generation failed.");
    } finally {
      setIsGeneratingAnalysis(false);
    }
  }

  return (
      <main>
      {notice ? (
        <div
          className={`surface-primary mb-4 border px-4 py-3 text-[14px] font-medium ${
            noticeTone === "error"
              ? "border-[#F2D8D8] text-[#A24E4E]"
              : "border-[#E5E7EB] text-[#374151]"
          }`}
        >
          {notice}
        </div>
      ) : null}

      <WorkspacePageHeader
        title={callRecordTitle}
        description={callRecordDescription}
        actions={
          <Link
            href={backHref}
            className="button-secondary-ui inline-flex items-center justify-center px-4 py-2.5 text-[14px] transition hover:border-[#D1D5DB] hover:bg-[#F9FAFB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
          >
            {backLabel}
          </Link>
        }
      />

      <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1.32fr)_360px] xl:items-start">
        <div className="space-y-5">
          <section className="surface-primary overflow-hidden p-6">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex rounded-full border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-1 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#374151]">
                {heroLabel}
              </span>
              <span
                className={`inline-flex rounded-full border px-3 py-1 text-[12px] font-semibold ${
                  isServiceBusinessMode
                    ? isMissedCallRecovery
                      ? getServiceMissedCallStatusClasses(heroStatusLabel)
                      : "border-[#DCE7F8] bg-[#F7FAFF] text-[#355A93]"
                    : getOperationalOutcomeTone(row.statusTone)
                }`}
              >
                {heroStatusLabel}
              </span>
            </div>

            <div className={`mt-5 grid gap-5 ${isServiceBusinessMode ? "" : "xl:grid-cols-[minmax(0,1.25fr)_340px]"}`}>
              <div>
                <h2 className="type-page-title text-[32px] leading-[1.02] sm:text-[36px]">{callerLabel}</h2>
                <p className="type-body-text mt-3 max-w-[820px] text-[15px] leading-7">{row.summary}</p>

                <div
                  className={`mt-5 grid gap-3 sm:grid-cols-2 ${
                    isMissedCallRecovery ? "xl:grid-cols-4" : "xl:grid-cols-4"
                  }`}
                >
                  <SummaryField
                    label={
                      isServiceBusinessMode
                        ? isMissedCallRecovery
                          ? "Status"
                          : "Call Type"
                        : isMissedCallRecovery
                          ? "Follow-Up Status"
                          : "Outcome"
                    }
                    value={isServiceBusinessMode ? heroStatusLabel : primaryStatusValue}
                    detail={
                      isServiceBusinessMode
                        ? isMissedCallRecovery
                          ? "Simple missed-call status for your team."
                          : "Answered inbound call."
                        : isMissedCallRecovery
                          ? operationalOutcome
                          : row.status
                    }
                  />
                  {isServiceAnsweredCall ? (
                    <SummaryField
                      label="Manual Outcome"
                      value={formatServiceAnsweredCallOutcomeLabel(row.callOutcome)}
                      detail="Set by staff for this answered call."
                    />
                  ) : null}
                  {!isServiceBusinessMode && isMissedCallRecovery ? (
                    <SummaryField
                      label="Recovery Outcome"
                      value={recoveryOutcome ?? "Pending"}
                      detail={resolutionReason ?? "Recovery outcome still pending."}
                    />
                  ) : null}
                  {!isServiceBusinessMode ? (
                    <SummaryField
                      label={isMissedCallRecovery ? "Revenue Risk" : "Estimated Revenue"}
                      value={row.revenue}
                      detail={isMissedCallRecovery ? "Estimated revenue at risk" : "Projected recovery value"}
                    />
                  ) : null}
                  {!isServiceBusinessMode && isMissedCallRecovery ? (
                    <SummaryField
                      label="Recovered Value"
                      value={recoveryOutcome === "Pending" ? "Pending" : formatCurrency(recoveredValue)}
                      detail={
                        recoveryOutcome === "Recovered"
                          ? "Recovered revenue secured from this case"
                          : "No recovered revenue recorded"
                      }
                    />
                  ) : null}
                  <SummaryField
                    label={isServiceBusinessMode ? "Phone Number" : "Issue Identified"}
                    value={isServiceBusinessMode ? row.phone : issueIdentified}
                    detail={isServiceBusinessMode ? (row.sourceSystem ?? "Inbound call") : row.reason}
                  />
                  {!isServiceBusinessMode && isMissedCallRecovery ? (
                    <SummaryField
                      label="Booking Created"
                      value={bookingCreatedLabel ?? "Pending"}
                      detail={
                        bookingCreatedLabel === "Yes"
                          ? "Booking confirmed in the recovery workflow"
                          : bookingCreatedLabel === "No"
                            ? "No booking recorded for this case"
                            : "Booking outcome not yet recorded"
                      }
                    />
                  ) : null}
                  <SummaryField
                    label="Timestamp"
                    value={row.date}
                    detail={
                      isServiceBusinessMode
                        ? isMissedCallRecovery
                          ? "Inbound call received"
                          : `${detailState.duration} • ${row.phone}`
                        : isMissedCallRecovery
                          ? "Inbound call received"
                          : `${row.phone} • ${detailState.duration}`
                    }
                  />
                  {isServiceBusinessMode ? (
                    <SummaryField
                      label="Notes"
                      value={row.noteCount && row.noteCount > 0 ? `${row.noteCount}` : "0"}
                      detail={getServiceNoteSummary(row)}
                    />
                  ) : null}
                  {!isServiceBusinessMode && isMissedCallRecovery ? (
                    <SummaryField label="Call Duration" value={detailState.duration} detail="Recorded interaction length" />
                  ) : null}
                  {!isServiceBusinessMode && isMissedCallRecovery ? (
                    <SummaryField label="Assigned Owner" value={row.assignedOwner} detail="Current recovery owner" />
                  ) : null}
                  {!isServiceBusinessMode && isMissedCallRecovery ? (
                    <SummaryField label="Last Action" value={formatMissedCallLastAction(row)} detail="Latest workflow update" />
                  ) : null}
                </div>
              </div>

              {!isServiceBusinessMode ? (
                <div className="surface-secondary px-5 py-5">
                <div className="type-label-text text-[11px]">Recommended next action</div>
                <div className="type-section-title mt-2 text-[22px] leading-8">
                  {row.nextStep}
                </div>
                <p className="type-body-text mt-3 text-[14px] leading-7">{row.recommendedAction}</p>

                <div className="mt-5 flex flex-col gap-2.5">
                  {isMissedCallRecovery ? (
                    <>
                      <button
                        type="button"
                        onClick={handleMarkRecovered}
                        className="button-primary-accent inline-flex w-full items-center justify-center px-4 py-3 text-[14px] transition hover:border-[#1D4ED8] hover:bg-[#1D4ED8] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                      >
                        Mark Recovered
                      </button>
                      <button
                        type="button"
                        onClick={handleResolve}
                        className="button-primary-accent inline-flex w-full items-center justify-center px-4 py-3 text-[14px] transition hover:border-[#1D4ED8] hover:bg-[#1D4ED8] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] disabled:cursor-not-allowed disabled:border-[#D1D5DB] disabled:bg-[#D1D5DB] disabled:text-white/80"
                      >
                        Mark Not Recovered
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResolve}
                      disabled={row.status === "Resolved"}
                      className="button-primary-accent inline-flex w-full items-center justify-center px-4 py-3 text-[14px] transition hover:border-[#1D4ED8] hover:bg-[#1D4ED8] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] disabled:cursor-not-allowed disabled:border-[#D1D5DB] disabled:bg-[#D1D5DB] disabled:text-white/80"
                    >
                      Mark as Resolved
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleSendFollowUp}
                    disabled={row.status === "Resolved" || isSendingFollowUp}
                    className="button-secondary-ui inline-flex w-full items-center justify-center px-4 py-3 text-[14px] transition hover:border-[#D1D5DB] hover:bg-[#F9FAFB] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] disabled:cursor-not-allowed disabled:border-[#E5E7EB] disabled:bg-[#F9FAFB] disabled:text-[#9CA3AF]"
                  >
                    {isSendingFollowUp ? "Sending Follow-Up..." : "Send Follow-Up"}
                  </button>
                  <button
                    type="button"
                    onClick={handleEscalate}
                    disabled={row.status === "Resolved"}
                    className="button-secondary-ui inline-flex w-full items-center justify-center px-4 py-3 text-[14px] transition hover:border-[#D1D5DB] hover:bg-[#F9FAFB] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] disabled:cursor-not-allowed disabled:border-[#E5E7EB] disabled:bg-[#F9FAFB] disabled:text-[#9CA3AF]"
                  >
                    Escalate
                  </button>
                </div>
                </div>
              ) : null}
            </div>
          </section>

          {!isServiceBusinessMode || isServiceAnsweredCall ? (
          <CardSection
            title="Transcript"
            description={
              isServiceBusinessMode
                ? "Conversation record for answered calls when transcription is available."
                : "Readable conversation record for operational review, issue confirmation, and next-step planning."
            }
          >
            {detailState.transcriptPending ? (
              <div className="surface-secondary px-4 py-4">
                <div className="type-label-text text-[13px]">
                  Transcript Status
                </div>
                <p className="type-body-text mt-3 text-[15px]">
                  {isGeneratingTranscript ? "Generating transcript..." : "Transcript not yet generated."}
                </p>
                <p className="type-body-text mt-2 text-[14px]">
                  {isGeneratingTranscript
                    ? "The platform is processing the stored audio recording and will save transcript content to the transcript record when processing completes."
                    : "The call record has been stored successfully. Transcript content will populate here after processing is completed."}
                </p>
                {transcriptError ? (
                  <p className="mt-3 text-[14px] leading-6 text-[#A24E4E]">{transcriptError}</p>
                ) : null}
                <button
                  type="button"
                  onClick={handleGenerateTranscript}
                  disabled={isGeneratingTranscript}
                  className="button-primary-accent mt-4 inline-flex items-center justify-center px-4 py-2.5 text-[13px] transition hover:border-[#1D4ED8] hover:bg-[#1D4ED8] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] disabled:cursor-not-allowed disabled:border-[#D1D5DB] disabled:bg-[#D1D5DB] disabled:text-white/80"
                >
                  {isGeneratingTranscript ? "Generating Transcript..." : "Generate Transcript"}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {detailState.transcript.map((entry) => (
                  <div
                    key={`${row.id}-${entry.time}-${entry.speaker}`}
                    className={`rounded-[14px] border px-5 py-4 ${getTranscriptTone(entry.speaker)}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="type-label-text text-[12px]">
                        {entry.speaker}
                      </div>
                      <div className="type-muted-text text-[12px]">{entry.time}</div>
                    </div>
                    <p className="type-body-text mt-3 text-[15px] leading-7 text-[#374151]">{entry.text}</p>
                  </div>
                ))}
              </div>
            )}
          </CardSection>
          ) : null}

          {!isServiceBusinessMode ? (
            <CardSection
              title="Analysis Summary"
              description="Decision-oriented summary of what happened, what it means commercially, and how confident the system is."
            >
            <div className="grid gap-3 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
              <div className="space-y-3">
                <div className="surface-secondary px-4 py-4">
                  <div className="type-label-text text-[11px]">Decision Summary</div>
                  <div className="type-section-title mt-2 text-[18px] leading-7">
                    {analysisSummary.callOutcome}
                  </div>
                  <p className="type-body-text mt-2 text-[14px] leading-7">
                    {analysisSummary.missedOpportunity === "Detected"
                      ? "This call should remain in the recovery workflow and be treated as a commercial opportunity requiring follow-up."
                      : "Current analysis suggests this call does not require revenue recovery escalation."}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="surface-secondary px-4 py-4">
                    <div className="type-label-text text-[11px]">Primary Issue</div>
                    <div className="type-section-title mt-2 text-[16px] leading-6">
                      {analysisSummary.primaryIssue}
                    </div>
                  </div>

                  <div className="surface-secondary px-4 py-4">
                    <div className="type-label-text text-[11px]">Intent Level</div>
                    <div className="type-section-title mt-2 text-[16px]">
                      {analysisSummary.intentLevel}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className={`rounded-[12px] border px-4 py-4 ${getSummaryToneClasses(analysisSummary.callOutcomeTone)}`}>
                  <div className="type-label-text text-[11px]">
                    Outcome
                  </div>
                  <div
                    className={`type-section-title mt-2 text-[18px] ${getSummaryValueToneClasses(analysisSummary.callOutcomeTone)}`}
                  >
                    {analysisSummary.callOutcome}
                  </div>
                </div>

                <div className={`rounded-[12px] border px-4 py-4 ${getSummaryToneClasses(analysisSummary.missedOpportunityTone)}`}>
                  <div className="type-label-text text-[11px]">
                    Opportunity Status
                  </div>
                  <div
                    className={`type-section-title mt-2 text-[18px] ${getSummaryValueToneClasses(
                      analysisSummary.missedOpportunityTone
                    )}`}
                  >
                    {analysisSummary.missedOpportunity}
                  </div>
                </div>

                <div className="surface-secondary px-4 py-4">
                  <div className="type-label-text text-[11px]">
                    Revenue Impact
                  </div>
                  <div className="type-page-title mt-2 text-[28px] leading-none">
                    {analysisSummary.revenueImpact}
                  </div>
                </div>

                <div className="surface-secondary px-4 py-4">
                  <div className="type-label-text text-[11px]">
                    Confidence Score
                  </div>
                  <div className="type-section-title mt-2 text-[16px]">
                    {analysisSummary.confidenceScore}
                  </div>
                </div>
              </div>
            </div>
            </CardSection>
          ) : null}

          {!isServiceBusinessMode ? (
            <CardSection
              title="Recommended Action"
              description="Operational next step for the team responsible for recovering the opportunity."
            >
            <div className="surface-secondary px-5 py-5">
              <div className="type-label-text text-[11px]">Next best action</div>
              <div className="type-section-title mt-2 text-[22px] leading-8">{row.nextStep}</div>
              <p className="type-body-text mt-3 text-[15px] leading-7">{row.recommendedAction}</p>
              {analysisError ? (
                <p className="mt-3 text-[14px] leading-6 text-[#A24E4E]">{analysisError}</p>
              ) : null}
              {detailState.analysisPending ? (
                <button
                  type="button"
                  onClick={handleGenerateAnalysis}
                  disabled={isGeneratingAnalysis || detailState.transcriptPending}
                  className="button-primary-accent mt-4 inline-flex items-center justify-center px-4 py-2.5 text-[13px] transition hover:border-[#1D4ED8] hover:bg-[#1D4ED8] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] disabled:cursor-not-allowed disabled:border-[#D1D5DB] disabled:bg-[#D1D5DB] disabled:text-white/80"
                >
                  {isGeneratingAnalysis
                    ? "Generating Analysis..."
                    : detailState.transcriptPending
                      ? "Generate Transcript First"
                      : "Generate Analysis"}
                </button>
              ) : null}
            </div>
            </CardSection>
          ) : null}

          <CardSection
            title={
              isServiceBusinessMode
                ? "Notes"
                : isMissedCallRecovery
                  ? "Notes & Timeline"
                  : "Analyst Notes"
            }
            description={
              isServiceBusinessMode
                ? "Saved notes for this call."
                : isMissedCallRecovery
                ? "Operational notes, follow-up history, and recovery timeline for this missed call."
                : "Audit trail and operational annotations associated with the interaction."
            }
          >
            {isMissedCallRecovery ? (
              <div className="space-y-3">
                {historyEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="surface-secondary px-4 py-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="type-section-title text-[15px]">{entry.title}</div>
                      <div className="type-muted-text text-[12px]">
                        {formatTimelineTimestamp(entry.timestamp)}
                      </div>
                    </div>
                    <p className="type-body-text mt-2 text-[14px]">{entry.detail}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {row.notes.map((note, index) => (
                  <div
                    key={`${row.id}-note-${index}`}
                    className="type-body-text surface-secondary px-4 py-3 text-[14px]"
                  >
                    {note}
                  </div>
                ))}
              </div>
            )}
          </CardSection>
        </div>

        <aside className="space-y-5 xl:border-l xl:border-[#E5E7EB] xl:pl-5">
          {!isServiceBusinessMode ? (
            <CardSection
              title="Estimated Revenue Impact"
              description="Projected commercial value at risk for this interaction."
            >
            <div className="rounded-[12px] border border-[#D1D5DB] bg-[#FFFFFF] px-5 py-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
              <div className="type-label-text text-[12px] text-[#9A782C]">
                Estimated Revenue Impact
              </div>
              <div className="mt-3 text-[28px] font-bold tracking-[-0.03em] text-[#111827]">
                {row.revenue}
              </div>
              <p className="type-body-text mt-3 text-[14px]">{detailState.revenueContext}</p>
            </div>
            </CardSection>
          ) : null}

          {!isServiceBusinessMode ? (
            <CardSection
              title="Detected Issues"
              description="Operational failure indicators identified within the interaction workflow."
            >
            <div className="space-y-3">
              {detailState.issues.map((issue) => (
                <div key={issue.title} className="surface-secondary px-4 py-4">
                  <div className="flex items-center gap-3">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#2563EB]" />
                    <h4 className="type-section-title text-[15px]">{issue.title}</h4>
                  </div>
                  <p className="type-body-text mt-2 text-[14px]">{issue.description}</p>
                </div>
              ))}
            </div>
            </CardSection>
          ) : null}

          <CardSection
            title="Action Controls"
            description={
              isServiceAnsweredCall
                ? "Set the answered-call outcome and keep notes up to date."
                : isServiceBusinessMode
                  ? "Keep this missed call moving with simple status updates and notes."
                : "Update the case status and keep the recovery workflow moving."
            }
          >
            <div className="space-y-3">
              {isServiceAnsweredCall ? (
                <div className="surface-secondary px-4 py-4">
                  <div className="type-label-text text-[11px]">Manual Outcome</div>
                  <div className="mt-3 flex flex-wrap gap-2.5">
                    {serviceAnsweredCallOutcomeOptions.map((option) => {
                      const isActive = manualAnsweredCallOutcome === option.value;

                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => handleSetAnsweredCallOutcome(option.value)}
                          className={`inline-flex min-h-[38px] items-center justify-center rounded-[12px] border px-3.5 py-2 text-[13px] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] ${
                            isActive
                              ? "border-[#2563EB] bg-[#EEF4FF] text-[#1D4ED8]"
                              : "border-[#E5E7EB] bg-[#FFFFFF] text-[#374151] hover:border-[#D1D5DB] hover:bg-[#F9FAFB]"
                          }`}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
              {!isServiceAnsweredCall ? (
                <button
                  type="button"
                  onClick={handleSendFollowUp}
                  disabled={row.status === "Resolved" || isSendingFollowUp}
                  className="button-primary-accent inline-flex w-full items-center justify-center px-4 py-3 text-[14px] transition hover:border-[#1D4ED8] hover:bg-[#1D4ED8] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] disabled:cursor-not-allowed disabled:border-[#D1D5DB] disabled:bg-[#D1D5DB] disabled:text-white/80"
                >
                  {isSendingFollowUp ? "Sending Follow-Up..." : isServiceBusinessMode ? "Send SMS" : "Send Follow-Up"}
                </button>
              ) : null}
              {!isServiceBusinessMode && isMissedCallRecovery ? (
                <button
                  type="button"
                  onClick={handleMarkRecovered}
                  className="button-secondary-ui inline-flex w-full items-center justify-center px-4 py-3 text-[14px] transition hover:border-[#D1D5DB] hover:bg-[#F9FAFB] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                >
                  Mark Recovered
                </button>
              ) : null}
              <button
                type="button"
                onClick={isServiceBusinessMode && isMissedCallRecovery ? handleMarkCalledBack : handleResolve}
                className="button-secondary-ui inline-flex w-full items-center justify-center px-4 py-3 text-[14px] transition hover:border-[#D1D5DB] hover:bg-[#F9FAFB] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] disabled:cursor-not-allowed disabled:border-[#E5E7EB] disabled:bg-[#F9FAFB] disabled:text-[#9CA3AF]"
              >
                {isServiceBusinessMode && isMissedCallRecovery
                  ? "Mark called back"
                  : isMissedCallRecovery
                    ? "Mark Not Recovered"
                    : "Mark as Resolved"}
              </button>
              {!isServiceAnsweredCall ? (
                <button
                  type="button"
                  onClick={handleResolve}
                  className="button-secondary-ui inline-flex w-full items-center justify-center px-4 py-3 text-[14px] transition hover:border-[#D1D5DB] hover:bg-[#F9FAFB] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] disabled:cursor-not-allowed disabled:border-[#E5E7EB] disabled:bg-[#F9FAFB] disabled:text-[#9CA3AF]"
                >
                  {isServiceBusinessMode && isMissedCallRecovery ? "Mark resolved" : isMissedCallRecovery ? "Mark Not Recovered" : "Mark as Resolved"}
                </button>
              ) : null}
              {!isServiceBusinessMode ? (
                <button
                  type="button"
                  onClick={handleEscalate}
                  disabled={row.status === "Resolved"}
                  className="button-secondary-ui inline-flex w-full items-center justify-center px-4 py-3 text-[14px] transition hover:border-[#D1D5DB] hover:bg-[#F9FAFB] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] disabled:cursor-not-allowed disabled:border-[#E5E7EB] disabled:bg-[#F9FAFB] disabled:text-[#9CA3AF]"
                >
                  Escalate
                </button>
              ) : null}
              {isMissedCallRecovery && currentOwnerLabel ? (
                <button
                  type="button"
                  onClick={handleToggleOwnership}
                  className="button-secondary-ui inline-flex w-full items-center justify-center px-4 py-3 text-[14px] transition hover:border-[#D1D5DB] hover:bg-[#F9FAFB] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                >
                  {isMissedCallAssignedToOwner(row, currentOwnerLabel) ? "Mark Unassigned" : "Assign to Me"}
                </button>
              ) : null}
              <button
                type="button"
                onClick={handleAddNote}
                disabled={!canPersistCallNote}
                title={!canPersistCallNote ? "Notes are only available for saved live call records." : undefined}
                className="button-secondary-ui inline-flex w-full items-center justify-center px-4 py-3 text-[14px] transition hover:border-[#D1D5DB] hover:bg-[#F9FAFB] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] disabled:cursor-not-allowed disabled:border-[#E5E7EB] disabled:bg-[#F9FAFB] disabled:text-[#9CA3AF]"
              >
                Add Note
              </button>
            </div>
          </CardSection>
        </aside>
      </div>
    </main>
  );
}
