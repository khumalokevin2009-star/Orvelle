import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { analyzeTranscript } from "@/lib/analysis/service";
import { transcribeAudioAsset } from "@/lib/transcription/service";

type SupabaseAdminClient = ReturnType<typeof createAdminClient>;

type CallAudioRecord = {
  id: string;
  caller_name: string | null;
  audio_url: string | null;
  recording_filename: string | null;
  status: string;
};

type TranscriptRow = {
  id: string;
  transcript_text: string | null;
  version: number | null;
  confidence_score?: number | null;
};

type AnalysisRow = {
  id?: string | null;
  call_id: string;
  transcript_id?: string | null;
  analysis_status: string;
};

type CallLifecycleStatus = "uploaded" | "processing" | "analyzed" | "failed";

export type ProcessCallResult =
  | {
      status: "completed";
      callId: string;
      lifecycleStatus: CallLifecycleStatus;
    }
  | {
      status: "skipped";
      reason: "already_processing" | "already_analyzed";
      callId: string;
      lifecycleStatus: CallLifecycleStatus;
    }
  | {
      status: "failed";
      callId: string;
      lifecycleStatus: "failed";
      message: string;
    };

const lifecycleFallbackStatus: Record<
  CallLifecycleStatus,
  "action_required" | "under_review" | "escalated"
> = {
  uploaded: "action_required",
  processing: "under_review",
  analyzed: "under_review",
  failed: "escalated"
};

function parseStorageReference(audioUrl: string) {
  const normalized = audioUrl.trim().replace(/^\/+/, "");

  if (/^https?:\/\//i.test(normalized)) {
    const match = normalized.match(/\/object\/(?:public|authenticated|sign)\/([^/]+)\/(.+)$/i);

    if (!match) {
      throw new Error("The stored audio URL could not be converted into a Supabase Storage object path.");
    }

    return {
      bucket: match[1],
      path: match[2]
    };
  }

  const [bucket, ...segments] = normalized.split("/");

  if (!bucket || segments.length === 0) {
    throw new Error("The stored audio path is invalid.");
  }

  return {
    bucket,
    path: segments.join("/")
  };
}

function isUnsupportedLifecycleStatusError(
  error: { message?: string } | null | undefined,
  lifecycleStatus: CallLifecycleStatus
) {
  const message = error?.message?.toLowerCase() ?? "";
  return message.includes("status") && message.includes(lifecycleStatus);
}

async function setCallLifecycleStatus(
  supabase: SupabaseAdminClient,
  callId: string,
  lifecycleStatus: CallLifecycleStatus
) {
  const { error } = await supabase.from("calls").update({ status: lifecycleStatus }).eq("id", callId);

  if (error && isUnsupportedLifecycleStatusError(error, lifecycleStatus)) {
    const fallbackStatus = lifecycleFallbackStatus[lifecycleStatus];

    console.warn("[call-processing] Falling back to legacy database status mapping.", {
      callId,
      lifecycleStatus,
      fallbackStatus
    });

    const { error: fallbackError } = await supabase
      .from("calls")
      .update({ status: fallbackStatus })
      .eq("id", callId);

    if (fallbackError) {
      throw fallbackError;
    }

    return fallbackStatus;
  }

  if (error) {
    throw error;
  }

  return lifecycleStatus;
}

async function claimCallForProcessing(supabase: SupabaseAdminClient, callId: string) {
  const { data, error } = await supabase
    .from("calls")
    .update({ status: "processing" })
    .eq("id", callId)
    .in("status", ["uploaded", "failed", "action_required"])
    .select("id")
    .maybeSingle();

  if (!error && data?.id) {
    return { claimed: true };
  }

  if (error && !isUnsupportedLifecycleStatusError(error, "processing")) {
    throw error;
  }

  const fallbackStatus = lifecycleFallbackStatus.processing;
  const { data: fallbackData, error: fallbackError } = await supabase
    .from("calls")
    .update({ status: fallbackStatus })
    .eq("id", callId)
    .in("status", ["uploaded", "failed", "action_required"])
    .select("id")
    .maybeSingle();

  if (fallbackError) {
    throw fallbackError;
  }

  return {
    claimed: Boolean(fallbackData?.id)
  };
}

async function fetchCallProcessingState(supabase: SupabaseAdminClient, callId: string) {
  const [
    { data: callRecord, error: callError },
    { data: transcriptRecord, error: transcriptError },
    { data: analysisRecord, error: analysisError }
  ] = await Promise.all([
    supabase
      .from("calls")
      .select("id, caller_name, audio_url, recording_filename, status")
      .eq("id", callId)
      .maybeSingle(),
    supabase
      .from("transcripts")
      .select("id, transcript_text, version, confidence_score")
      .eq("call_id", callId)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("analysis")
      .select("id, call_id, transcript_id, analysis_status")
      .eq("call_id", callId)
      .maybeSingle()
  ]);

  if (callError) throw callError;
  if (transcriptError) throw transcriptError;
  if (analysisError) throw analysisError;

  if (!callRecord) {
    throw new Error(`Call "${callId}" could not be found for automatic processing.`);
  }

  return {
    callRecord: callRecord as CallAudioRecord,
    transcriptRecord: transcriptRecord as TranscriptRow | null,
    analysisRecord: analysisRecord as AnalysisRow | null
  };
}

async function ensureTranscript(
  supabase: SupabaseAdminClient,
  callRecord: CallAudioRecord,
  transcriptRecord: TranscriptRow | null
) {
  if (transcriptRecord?.transcript_text?.trim()) {
    return transcriptRecord;
  }

  if (!callRecord.audio_url) {
    throw new Error("The selected call record does not include a stored audio reference.");
  }

  const storageRef = parseStorageReference(callRecord.audio_url);
  const { data: audioFile, error: downloadError } = await supabase.storage
    .from(storageRef.bucket)
    .download(storageRef.path);

  if (downloadError || !audioFile) {
    throw new Error(downloadError?.message || "Unable to download the recording from Supabase Storage.");
  }

  const bytes = Buffer.from(await audioFile.arrayBuffer());
  const fileName =
    callRecord.recording_filename || storageRef.path.split("/").pop() || `${callRecord.id}.audio`;
  const transcriptResult = await transcribeAudioAsset({
    fileName,
    mimeType: audioFile.type || null,
    bytes,
    callerName: callRecord.caller_name
  });

  const nextVersion = (transcriptRecord?.version ?? 0) + 1;
  const { data: insertedTranscript, error: insertError } = await supabase
    .from("transcripts")
    .insert({
      call_id: callRecord.id,
      transcript_text: transcriptResult.transcriptText,
      transcript_source: `${transcriptResult.provider}:${transcriptResult.model}`,
      confidence_score: transcriptResult.confidenceScore,
      version: nextVersion
    })
    .select("id, transcript_text, version, confidence_score")
    .single();

  if (insertError) {
    throw new Error(insertError.message || "Unable to store the generated transcript.");
  }

  return insertedTranscript as TranscriptRow;
}

export async function processCallAfterIngestion(
  callId: string,
  options: {
    supabase?: SupabaseAdminClient;
  } = {}
): Promise<ProcessCallResult> {
  const supabase = options.supabase ?? createAdminClient();
  const initialState = await fetchCallProcessingState(supabase, callId);

  if (
    initialState.callRecord.status === "analyzed" ||
    initialState.analysisRecord?.analysis_status === "completed"
  ) {
    console.info("[call-processing] Skipping automatic analysis because the call is already analyzed.", {
      callId
    });

    return {
      status: "skipped",
      reason: "already_analyzed",
      callId,
      lifecycleStatus: "analyzed"
    };
  }

  if (
    initialState.callRecord.status === "processing" ||
    initialState.analysisRecord?.analysis_status === "processing"
  ) {
    console.info("[call-processing] Skipping automatic analysis because the call is already processing.", {
      callId
    });

    return {
      status: "skipped",
      reason: "already_processing",
      callId,
      lifecycleStatus: "processing"
    };
  }

  const claim = await claimCallForProcessing(supabase, callId);

  if (!claim.claimed) {
    console.info("[call-processing] Automatic analysis claim was skipped because another worker already claimed the call.", {
      callId
    });

    return {
      status: "skipped",
      reason: "already_processing",
      callId,
      lifecycleStatus: "processing"
    };
  }

  await supabase.from("analysis").upsert(
    {
      call_id: callId,
      transcript_id: initialState.transcriptRecord?.id ?? null,
      analysis_status: "processing",
      analyst_note: null
    },
    {
      onConflict: "call_id"
    }
  );

  try {
    const refreshedState = await fetchCallProcessingState(supabase, callId);
    const transcriptRecord = await ensureTranscript(
      supabase,
      refreshedState.callRecord,
      refreshedState.transcriptRecord
    );

    const transcriptText = transcriptRecord.transcript_text?.trim();

    if (!transcriptText) {
      throw new Error("Transcript generation completed without transcript text.");
    }

    const analysisOutput = await analyzeTranscript(transcriptText);
    const estimatedRevenue = Math.max(0, Math.round(analysisOutput.revenue_estimate));

    const { error: analysisError } = await supabase.from("analysis").upsert(
      {
        call_id: callId,
        transcript_id: transcriptRecord.id,
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
      },
      {
        onConflict: "call_id"
      }
    );

    if (analysisError) {
      throw new Error(analysisError.message || "Unable to store the structured analysis output.");
    }

    await setCallLifecycleStatus(supabase, callId, "analyzed");

    console.info("[call-processing] Automatic analysis completed successfully.", {
      callId
    });

    return {
      status: "completed",
      callId,
      lifecycleStatus: "analyzed"
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Automatic call processing failed.";

    await supabase.from("analysis").upsert(
      {
        call_id: callId,
        transcript_id: initialState.transcriptRecord?.id ?? null,
        analysis_status: "failed",
        analyst_note: message
      },
      {
        onConflict: "call_id"
      }
    );

    await setCallLifecycleStatus(supabase, callId, "failed");

    console.error("[call-processing] Automatic analysis failed.", {
      callId,
      message
    });

    return {
      status: "failed",
      callId,
      lifecycleStatus: "failed",
      message
    };
  }
}
