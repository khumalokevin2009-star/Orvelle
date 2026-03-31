import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { transcribeAudioAsset } from "@/lib/transcription/service";

type CallAudioRecord = {
  id: string;
  caller_name: string | null;
  audio_url: string | null;
  recording_filename: string | null;
};

type TranscriptRow = {
  transcript_text: string | null;
  version: number;
  confidence_score?: number | null;
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

function getSegmentTime(index: number) {
  return `Segment ${String(index + 1).padStart(2, "0")}`;
}

function toTranscriptEntries(transcriptText: string) {
  const matches = Array.from(
    transcriptText.matchAll(/(Caller voicemail|Caller|Agent|System):\s*([\s\S]*?)(?=(?:Caller voicemail|Caller|Agent|System):|$)/gi)
  );

  if (matches.length === 0) {
    return [
      {
        speaker: "System",
        time: getSegmentTime(0),
        text: transcriptText.trim()
      }
    ];
  }

  return matches.map((match, index) => {
    const rawSpeaker = match[1].toLowerCase();
    const speaker = rawSpeaker.startsWith("agent")
      ? "Agent"
      : rawSpeaker.startsWith("system")
        ? "System"
        : "Caller";

    return {
      speaker,
      time: getSegmentTime(index),
      text: match[2].trim()
    };
  });
}

export async function POST(
  _request: Request,
  context: {
    params: Promise<{ id: string }>;
  }
) {
  const { id } = await context.params;
  let supabase;

  try {
    supabase = createAdminClient();
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Unable to initialize the Supabase admin client for transcription."
      },
      { status: 500 }
    );
  }

  const { data: callRecord, error: callError } = await supabase
    .from("calls")
    .select("id, caller_name, audio_url, recording_filename")
    .eq("id", id)
    .maybeSingle();

  if (callError) {
    return NextResponse.json(
      {
        message: callError.message || "Unable to load the call record for transcription."
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

  const typedCallRecord = callRecord as CallAudioRecord;

  if (!typedCallRecord.audio_url) {
    return NextResponse.json(
      {
        message: "The selected call record does not include a stored audio reference."
      },
      { status: 400 }
    );
  }

  const { data: existingTranscript, error: existingTranscriptError } = await supabase
    .from("transcripts")
    .select("transcript_text, version, confidence_score")
    .eq("call_id", id)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingTranscriptError) {
    return NextResponse.json(
      {
        message: existingTranscriptError.message || "Unable to inspect existing transcript state."
      },
      { status: 500 }
    );
  }

  const latestTranscript = existingTranscript as TranscriptRow | null;

  if (latestTranscript?.transcript_text?.trim()) {
    const transcriptText = latestTranscript.transcript_text.trim();

    return NextResponse.json({
      message: "An existing transcript was loaded for this call record.",
      status: "existing",
      transcriptText,
      transcriptEntries: toTranscriptEntries(transcriptText),
      confidenceScore: latestTranscript.confidence_score ?? null
    });
  }

  try {
    const storageRef = parseStorageReference(typedCallRecord.audio_url);
    const { data: audioFile, error: downloadError } = await supabase.storage
      .from(storageRef.bucket)
      .download(storageRef.path);

    if (downloadError || !audioFile) {
      throw new Error(downloadError?.message || "Unable to download the recording from Supabase Storage.");
    }

    const bytes = Buffer.from(await audioFile.arrayBuffer());
    const fileName =
      typedCallRecord.recording_filename || storageRef.path.split("/").pop() || `${typedCallRecord.id}.audio`;
    const transcriptResult = await transcribeAudioAsset({
      fileName,
      mimeType: audioFile.type || null,
      bytes,
      callerName: typedCallRecord.caller_name
    });

    const nextVersion = (latestTranscript?.version ?? 0) + 1;
    const { error: insertError } = await supabase.from("transcripts").insert({
      call_id: typedCallRecord.id,
      transcript_text: transcriptResult.transcriptText,
      transcript_source: `${transcriptResult.provider}:${transcriptResult.model}`,
      confidence_score: transcriptResult.confidenceScore,
      version: nextVersion
    });

    if (insertError) {
      throw new Error(insertError.message || "Unable to store the generated transcript.");
    }

    return NextResponse.json({
      message: "Transcript generated and stored successfully.",
      status: "generated",
      transcriptText: transcriptResult.transcriptText,
      transcriptEntries: toTranscriptEntries(transcriptResult.transcriptText),
      provider: transcriptResult.provider,
      confidenceScore: transcriptResult.confidenceScore
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Transcription failed before transcript data could be stored."
      },
      { status: 500 }
    );
  }
}
