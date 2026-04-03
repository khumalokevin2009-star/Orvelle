import { notFound, redirect } from "next/navigation";
import { CallRecordPage } from "@/components/call-record-page";
import { getCurrentBusinessAccount } from "@/lib/business-account";
import { buildCallRecordView, type AnalysisRecord, type TranscriptRecord } from "@/lib/call-detail";
import { getDemoCallRecordView } from "@/lib/demo-dashboard-data";
import {
  callsSelectFields,
  mapSupabaseCallToDashboardRow,
  type SupabaseCallRecord
} from "@/lib/dashboard-calls";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function CallPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const demoRecord = getDemoCallRecordView(id);

  if (demoRecord) {
    return <CallRecordPage initialRow={demoRecord.row} detail={demoRecord.detail} />;
  }

  const businessAccount = await getCurrentBusinessAccount();

  if (!businessAccount) {
    redirect("/login");
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("calls")
    .select(callsSelectFields)
    .eq("id", id)
    .eq("business_id", businessAccount.businessId)
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

  return <CallRecordPage initialRow={row} detail={detail} />;
}
