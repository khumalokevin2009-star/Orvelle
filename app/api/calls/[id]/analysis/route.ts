import { NextResponse } from "next/server";
import { getCurrentBusinessAccount } from "@/lib/business-account";
import { createAdminClient } from "@/lib/supabase/admin";
import { analyzeTranscript } from "@/lib/analysis/service";
import { buildCallRecordView, type AnalysisRecord, type TranscriptRecord } from "@/lib/call-detail";
import { callsSelectFields, mapSupabaseCallToDashboardRow, type SupabaseCallRecord } from "@/lib/dashboard-calls";

type CallTranscriptRow = {
  id: string;
  call_id: string;
  transcript_text: string | null;
  version: number | null;
};

function getAnalysisStatus(result: AnalysisRecord | null) {
  return result?.analysis_status ?? null;
}

export async function POST(
  _request: Request,
  context: {
    params: Promise<{ id: string }>;
  }
) {
  const { id } = await context.params;
  const businessAccount = await getCurrentBusinessAccount();

  if (!businessAccount) {
    return NextResponse.json(
      {
        message: "Authentication required."
      },
      { status: 401 }
    );
  }

  let supabase;

  try {
    supabase = createAdminClient();
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Unable to initialize the Supabase admin client for analysis."
      },
      { status: 500 }
    );
  }

  const { data: callRecord, error: callError } = await supabase
    .from("calls")
    .select(callsSelectFields)
    .eq("id", id)
    .eq("business_id", businessAccount.businessId)
    .maybeSingle();

  if (callError) {
    return NextResponse.json(
      {
        message: callError.message || "Unable to load the call record for analysis."
      },
      { status: 500 }
    );
  }

  if (!callRecord) {
    return NextResponse.json(
      {
        message: "The selected call record could not be found."
      },
      { status: 404 }
    );
  }

  const [{ data: transcriptRecord, error: transcriptError }, { data: existingAnalysis, error: analysisFetchError }] =
    await Promise.all([
      supabase
        .from("transcripts")
        .select("id, call_id, transcript_text, version")
        .eq("call_id", id)
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase.from("analysis").select("*").eq("call_id", id).maybeSingle()
    ]);

  if (transcriptError) {
    return NextResponse.json(
      {
        message: transcriptError.message || "Unable to load transcript data for this call."
      },
      { status: 500 }
    );
  }

  if (!transcriptRecord?.transcript_text?.trim()) {
    return NextResponse.json(
      {
        message: "Transcript not yet generated. Generate a transcript before requesting structured analysis."
      },
      { status: 400 }
    );
  }

  if (analysisFetchError) {
    return NextResponse.json(
      {
        message: analysisFetchError.message || "Unable to inspect existing analysis state."
      },
      { status: 500 }
    );
  }

  const typedCallRecord = callRecord as SupabaseCallRecord;
  const typedTranscript = transcriptRecord as CallTranscriptRow;
  const typedExistingAnalysis = existingAnalysis as AnalysisRecord | null;

  if (
    typedExistingAnalysis &&
    typedExistingAnalysis.transcript_id === typedTranscript.id &&
    getAnalysisStatus(typedExistingAnalysis) === "completed"
  ) {
    const mappedRow = mapSupabaseCallToDashboardRow(typedCallRecord);
    const view = buildCallRecordView(
      typedCallRecord,
      mappedRow,
      typedTranscript as TranscriptRecord,
      typedExistingAnalysis
    );

    return NextResponse.json({
      message: "An existing structured analysis was loaded for this transcript.",
      status: "existing",
      row: view.row,
      detail: view.detail
    });
  }

  const processingPayload = {
    call_id: id,
    transcript_id: typedTranscript.id,
    analysis_status: "processing",
    recommended_action: null,
    summary: null,
    analyst_note: null
  };

  await supabase.from("analysis").upsert(processingPayload, {
    onConflict: "call_id"
  });

  try {
    const transcriptText = typedTranscript.transcript_text;

    if (!transcriptText?.trim()) {
      throw new Error("Transcript not yet generated. Generate a transcript before requesting structured analysis.");
    }

    const analysisOutput = await analyzeTranscript(transcriptText);
    const estimatedRevenue = Math.max(0, Math.round(analysisOutput.revenue_estimate));

    const upsertPayload = {
      call_id: id,
      transcript_id: typedTranscript.id,
      analysis_status: "completed",
      failure_type: analysisOutput.failure_type,
      conversion_failure_detected: analysisOutput.missed_opportunity,
      no_booking_attempt: analysisOutput.no_booking_attempt,
      no_callback_logged: analysisOutput.no_callback_logged,
      response_sla_breach: analysisOutput.response_sla_breach,
      lead_intent_level: analysisOutput.intent_level,
      intent_level: analysisOutput.intent_level,
      call_outcome: analysisOutput.call_outcome,
      revenue_estimate: estimatedRevenue,
      primary_issue: analysisOutput.primary_issue,
      missed_opportunity: analysisOutput.missed_opportunity,
      recommended_action: analysisOutput.recommended_action,
      summary: analysisOutput.summary,
      analyst_note: analysisOutput.analyst_note,
      revenue_impact_estimate: estimatedRevenue,
      resolved_at: analysisOutput.call_outcome === "converted" ? new Date().toISOString() : null
    };

    const { data: storedAnalysis, error: upsertError } = await supabase
      .from("analysis")
      .upsert(upsertPayload, {
        onConflict: "call_id"
      })
      .select("*")
      .single();

    if (upsertError) {
      const message =
        upsertError.message && upsertError.message.toLowerCase().includes("column")
          ? `${upsertError.message}. Run the analysis schema migration before generating structured analysis.`
          : upsertError.message;

      throw new Error(message || "Unable to store the structured analysis output.");
    }

    const mappedRow = mapSupabaseCallToDashboardRow(typedCallRecord);
    const view = buildCallRecordView(
      typedCallRecord,
      mappedRow,
      typedTranscript as TranscriptRecord,
      storedAnalysis as AnalysisRecord
    );

    return NextResponse.json({
      message: "Structured analysis generated and stored successfully.",
      status: "generated",
      row: view.row,
      detail: view.detail
    });
  } catch (error) {
    await supabase.from("analysis").upsert(
      {
        call_id: id,
        transcript_id: typedTranscript.id,
        analysis_status: "failed",
        analyst_note: error instanceof Error ? error.message : "Structured analysis failed."
      },
      {
        onConflict: "call_id"
      }
    );

    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Structured analysis failed before data could be stored."
      },
      { status: 500 }
    );
  }
}
