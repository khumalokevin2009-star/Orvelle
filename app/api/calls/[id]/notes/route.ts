import { NextResponse } from "next/server";
import { appendStoredCallNote, getLatestStoredCallNote, getStoredCallNoteCount } from "@/lib/call-notes";
import { getCurrentBusinessAccount } from "@/lib/business-account";
import { createAdminClient } from "@/lib/supabase/admin";

type AnalysisNoteRecord = {
  call_id: string;
  transcript_id: string | null;
  analysis_status: string;
  analyst_note: string | null;
};

export async function POST(
  request: Request,
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

  const payload = (await request.json().catch(() => null)) as
    | {
        note?: string;
      }
    | null;

  const note = payload?.note?.replace(/\s+/g, " ").trim();

  if (!note) {
    return NextResponse.json(
      {
        message: "A note is required."
      },
      { status: 400 }
    );
  }

  let supabase;

  try {
    supabase = createAdminClient();
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Unable to initialize the notes service."
      },
      { status: 500 }
    );
  }

  const callResult = await supabase
    .from("calls")
    .select("id")
    .eq("id", id)
    .eq("business_id", businessAccount.businessId)
    .maybeSingle();

  if (callResult.error) {
    return NextResponse.json(
      {
        message: callResult.error.message || "Unable to load the call record."
      },
      { status: 500 }
    );
  }

  if (!callResult.data) {
    return NextResponse.json(
      {
        message: "The selected call record could not be found."
      },
      { status: 404 }
    );
  }

  const analysisResult = await supabase
    .from("analysis")
    .select("call_id, transcript_id, analysis_status, analyst_note")
    .eq("call_id", id)
    .maybeSingle();

  if (analysisResult.error) {
    return NextResponse.json(
      {
        message: analysisResult.error.message || "Unable to load the call note record."
      },
      { status: 500 }
    );
  }

  const currentRecord = (analysisResult.data as AnalysisNoteRecord | null) ?? null;
  const nextAnalystNote = appendStoredCallNote(currentRecord?.analyst_note, note);

  const upsertPayload = {
    call_id: id,
    transcript_id: currentRecord?.transcript_id ?? null,
    analysis_status: currentRecord?.analysis_status ?? "pending",
    analyst_note: nextAnalystNote
  };

  const { error: upsertError } = await supabase.from("analysis").upsert(upsertPayload, {
    onConflict: "call_id"
  });

  if (upsertError) {
    return NextResponse.json(
      {
        message: upsertError.message || "Unable to save the note right now."
      },
      { status: 500 }
    );
  }

  console.info("[call-notes] Note saved for call.", {
    businessId: businessAccount.businessId,
    callId: id,
    noteLength: note.length
  });

  return NextResponse.json({
    message: "Note saved.",
    latestNote: getLatestStoredCallNote(nextAnalystNote),
    noteCount: getStoredCallNoteCount(nextAnalystNote)
  });
}
