import { notFound } from "next/navigation";
import { CallRecordPage } from "@/components/call-record-page";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { buildCallRecordView, type AnalysisRecord, type TranscriptRecord } from "@/lib/call-detail";
import { getDemoCallRecordView } from "@/lib/demo-dashboard-data";
import {
  callsSelectFields,
  mapSupabaseCallToDashboardRow,
  type SupabaseCallRecord
} from "@/lib/dashboard-calls";
import { getMissedCallRecoverySettings } from "@/lib/missed-call-recovery-settings";
import { defaultSolutionMode } from "@/lib/solution-mode";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function CallPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getAuthenticatedUser();
  let solutionMode = defaultSolutionMode;

  if (user) {
    try {
      const settings = await getMissedCallRecoverySettings(user.id);
      solutionMode = settings.solutionMode;
    } catch (error) {
      console.error("[call-page] Failed to load solution mode.", error);
    }
  }

  const demoRecord = getDemoCallRecordView(id);

  if (demoRecord) {
    return <CallRecordPage initialRow={demoRecord.row} detail={demoRecord.detail} solutionMode={solutionMode} />;
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("calls")
    .select(callsSelectFields)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || "Unable to load the call record.");
  }

  if (!data) {
    notFound();
  }

  const [transcriptResult, analysisResult] = await Promise.all([
    supabase
      .from("transcripts")
      .select("id, transcript_text, version, confidence_score")
      .eq("call_id", id)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("analysis")
      .select("*")
      .eq("call_id", id)
      .maybeSingle()
  ]);

  const callRecord = data as SupabaseCallRecord;
  const mappedRow = mapSupabaseCallToDashboardRow(callRecord);
  const transcript = transcriptResult.error ? null : (transcriptResult.data as TranscriptRecord | null);
  const analysis = analysisResult.error ? null : (analysisResult.data as AnalysisRecord | null);
  const { row, detail } = buildCallRecordView(callRecord, mappedRow, transcript, analysis);

  return <CallRecordPage initialRow={row} detail={detail} solutionMode={solutionMode} />;
}
