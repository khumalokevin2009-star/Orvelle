"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { WorkspacePageHeader } from "@/components/workspace-page-header";
import type { DashboardCallRow } from "@/lib/dashboard-calls";
import type { CallRecordDetail, TranscriptEntry } from "@/lib/call-detail";

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
  detail
}: {
  initialRow: DashboardCallRow;
  detail: CallRecordDetail;
}) {
  const router = useRouter();
  const [row, setRow] = useState(initialRow);
  const [detailState, setDetailState] = useState(() => normalizeDetailState(detail));
  const [notice, setNotice] = useState<string | null>(null);
  const [isGeneratingTranscript, setIsGeneratingTranscript] = useState(false);
  const [transcriptError, setTranscriptError] = useState<string | null>(null);
  const [isGeneratingAnalysis, setIsGeneratingAnalysis] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const analysisSummary = detailState.analysisSummary ?? defaultAnalysisSummary;
  const operationalOutcome = row.callOutcome ?? analysisSummary.callOutcome;
  const isMissedCallRecoveryRecord = row.id.startsWith("missed-call-");
  const backHref = isMissedCallRecoveryRecord ? "/missed-calls" : "/dashboard";
  const backLabel = isMissedCallRecoveryRecord ? "Back to Missed Calls" : "Back to Dashboard";
  const primaryStatusValue = isMissedCallRecoveryRecord
    ? row.workflowStatusLabel ?? row.status
    : operationalOutcome;
  const issueIdentified =
    analysisSummary.primaryIssue !== "Pending classification"
      ? analysisSummary.primaryIssue
      : row.primaryIssue ?? row.reason;

  function pushNote(note: string) {
    setRow((currentRow) => ({
      ...currentRow,
      notes: currentRow.notes.includes(note) ? currentRow.notes : [note, ...currentRow.notes]
    }));
  }

  function handleResolve() {
    if (row.status === "Resolved") {
      setNotice("This interaction record is already marked as resolved.");
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
    setNotice("Interaction marked as resolved.");
  }

  function handleSendFollowUp() {
    if (row.status === "Resolved") {
      setNotice("Resolved interaction records do not require additional follow-up scheduling.");
      return;
    }

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
    setNotice("Follow-up sent and recovery workflow updated.");
  }

  function handleEscalate() {
    if (row.status === "Resolved") {
      setNotice("Resolved interaction records cannot be escalated.");
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
    setNotice("Case escalated for immediate recovery handling.");
  }

  function handleAddNote() {
    const note = window.prompt(`Enter an operational note for ${row.caller}`);

    if (!note?.trim()) {
      return;
    }

    pushNote(note.trim());
    setNotice("Operational note recorded.");
  }

  async function handleGenerateTranscript() {
    if (isGeneratingTranscript) {
      return;
    }

    setIsGeneratingTranscript(true);
    setTranscriptError(null);
    setNotice(null);

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
        <div className="surface-primary mb-4 px-4 py-3 text-[14px] font-medium text-[#374151]">
          {notice}
        </div>
      ) : null}

      <WorkspacePageHeader
        title={isMissedCallRecoveryRecord ? "Missed Call Recovery Record" : "Call Analysis Record"}
        description={
          isMissedCallRecoveryRecord
            ? "Detailed review of a missed inbound call, the revenue risk attached to it, and the next operational recovery step."
            : "Detailed inspection of a flagged interaction, associated conversion failure indicators, and required revenue recovery actions."
        }
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
                {detailState.subtitle}
              </span>
              <span
                className={`inline-flex rounded-full border px-3 py-1 text-[12px] font-semibold ${getOperationalOutcomeTone(
                  row.statusTone
                )}`}
              >
                {isMissedCallRecoveryRecord ? primaryStatusValue : row.status}
              </span>
            </div>

            <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_340px]">
              <div>
                <h2 className="type-page-title text-[32px] leading-[1.02] sm:text-[36px]">{row.caller}</h2>
                <p className="type-body-text mt-3 max-w-[820px] text-[15px] leading-7">{row.summary}</p>

                <div
                  className={`mt-5 grid gap-3 sm:grid-cols-2 ${
                    isMissedCallRecoveryRecord ? "xl:grid-cols-3" : "xl:grid-cols-4"
                  }`}
                >
                  <SummaryField
                    label={isMissedCallRecoveryRecord ? "Follow-Up Status" : "Outcome"}
                    value={primaryStatusValue}
                    detail={isMissedCallRecoveryRecord ? operationalOutcome : row.status}
                  />
                  <SummaryField
                    label={isMissedCallRecoveryRecord ? "Revenue Risk" : "Estimated Revenue"}
                    value={row.revenue}
                    detail={isMissedCallRecoveryRecord ? "Estimated revenue at risk" : "Projected recovery value"}
                  />
                  <SummaryField
                    label="Issue Identified"
                    value={issueIdentified}
                    detail={row.reason}
                  />
                  {isMissedCallRecoveryRecord ? (
                    <SummaryField label="Phone Number" value={row.phone} detail={row.sourceSystem ?? "Inbound call"} />
                  ) : null}
                  <SummaryField
                    label="Timestamp"
                    value={row.date}
                    detail={isMissedCallRecoveryRecord ? "Inbound call received" : `${row.phone} • ${detailState.duration}`}
                  />
                  {isMissedCallRecoveryRecord ? (
                    <SummaryField label="Call Duration" value={detailState.duration} detail="Recorded interaction length" />
                  ) : null}
                </div>
              </div>

              <div className="surface-secondary px-5 py-5">
                <div className="type-label-text text-[11px]">Recommended next action</div>
                <div className="type-section-title mt-2 text-[22px] leading-8">
                  {row.nextStep}
                </div>
                <p className="type-body-text mt-3 text-[14px] leading-7">{row.recommendedAction}</p>

                <div className="mt-5 flex flex-col gap-2.5">
                  <button
                    type="button"
                    onClick={handleResolve}
                    disabled={row.status === "Resolved"}
                    className="button-primary-accent inline-flex w-full items-center justify-center px-4 py-3 text-[14px] transition hover:border-[#1D4ED8] hover:bg-[#1D4ED8] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] disabled:cursor-not-allowed disabled:border-[#D1D5DB] disabled:bg-[#D1D5DB] disabled:text-white/80"
                  >
                    Mark as Resolved
                  </button>
                  <button
                    type="button"
                    onClick={handleSendFollowUp}
                    disabled={row.status === "Resolved"}
                    className="button-secondary-ui inline-flex w-full items-center justify-center px-4 py-3 text-[14px] transition hover:border-[#D1D5DB] hover:bg-[#F9FAFB] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] disabled:cursor-not-allowed disabled:border-[#E5E7EB] disabled:bg-[#F9FAFB] disabled:text-[#9CA3AF]"
                  >
                    Send Follow-Up
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
            </div>
          </section>

          <CardSection
            title="Transcript"
            description="Readable conversation record for operational review, issue confirmation, and next-step planning."
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

          <CardSection
            title={isMissedCallRecoveryRecord ? "Notes & Timeline" : "Analyst Notes"}
            description={
              isMissedCallRecoveryRecord
                ? "Operational notes, follow-up history, and recovery timeline for this missed call."
                : "Audit trail and operational annotations associated with the interaction."
            }
          >
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
          </CardSection>
        </div>

        <aside className="space-y-5 xl:border-l xl:border-[#E5E7EB] xl:pl-5">
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

          <CardSection
            title="Action Controls"
            description="Update the case status and keep the recovery workflow moving."
          >
            <div className="space-y-3">
              <button
                type="button"
                onClick={handleSendFollowUp}
                disabled={row.status === "Resolved"}
                className="button-primary-accent inline-flex w-full items-center justify-center px-4 py-3 text-[14px] transition hover:border-[#1D4ED8] hover:bg-[#1D4ED8] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] disabled:cursor-not-allowed disabled:border-[#D1D5DB] disabled:bg-[#D1D5DB] disabled:text-white/80"
                >
                Send Follow-Up
              </button>
              <button
                type="button"
                onClick={handleResolve}
                disabled={row.status === "Resolved"}
                className="button-secondary-ui inline-flex w-full items-center justify-center px-4 py-3 text-[14px] transition hover:border-[#D1D5DB] hover:bg-[#F9FAFB] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] disabled:cursor-not-allowed disabled:border-[#E5E7EB] disabled:bg-[#F9FAFB] disabled:text-[#9CA3AF]"
              >
                Mark as Resolved
              </button>
              <button
                type="button"
                onClick={handleEscalate}
                disabled={row.status === "Resolved"}
                className="button-secondary-ui inline-flex w-full items-center justify-center px-4 py-3 text-[14px] transition hover:border-[#D1D5DB] hover:bg-[#F9FAFB] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] disabled:cursor-not-allowed disabled:border-[#E5E7EB] disabled:bg-[#F9FAFB] disabled:text-[#9CA3AF]"
              >
                Escalate
              </button>
              <button
                type="button"
                onClick={handleAddNote}
                className="button-secondary-ui inline-flex w-full items-center justify-center px-4 py-3 text-[14px] transition hover:border-[#D1D5DB] hover:bg-[#F9FAFB] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
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
