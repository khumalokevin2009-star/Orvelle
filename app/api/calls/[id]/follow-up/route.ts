import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { demoMissedCallRecoveryRows } from "@/lib/demo-dashboard-data";
import { analysisSelectFields, callsSelectFields, mapSupabaseCallToDashboardRow, type SupabaseAnalysisRecord, type SupabaseCallRecord } from "@/lib/dashboard-calls";
import { sendFollowUpForCall } from "@/lib/follow-up-sms";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(
  _request: Request,
  context: {
    params: Promise<{ id: string }>;
  }
) {
  const { id } = await context.params;
  const user = await getAuthenticatedUser();

  if (!user) {
    return NextResponse.json(
      {
        message: "Authentication required."
      },
      { status: 401 }
    );
  }

  const demoRow = demoMissedCallRecoveryRows.find((row) => row.id === id);

  if (demoRow) {
    const result = await sendFollowUpForCall({
      row: demoRow,
      forceMock: true
    });

    console.info("[follow-up] Demo follow-up request completed.", {
      callId: demoRow.id,
      caller: demoRow.caller,
      phone: demoRow.phone,
      mode: result.ok ? result.mode : "error"
    });

    return NextResponse.json(
      {
        message: result.message,
        mode: result.ok ? result.mode : "mock",
        statusLabel: "Follow-Up Sent"
      },
      { status: result.ok ? 200 : result.status }
    );
  }

  let supabase;

  try {
    supabase = createAdminClient();
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Unable to initialize the follow-up service."
      },
      { status: 500 }
    );
  }

  const [callResult, analysisResult] = await Promise.all([
    supabase.from("calls").select(callsSelectFields).eq("id", id).maybeSingle(),
    supabase.from("analysis").select(analysisSelectFields).eq("call_id", id).maybeSingle()
  ]);

  if (callResult.error) {
    return NextResponse.json(
      {
        message: callResult.error.message || "Unable to load the call record for follow-up."
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

  const row = mapSupabaseCallToDashboardRow(
    callResult.data as SupabaseCallRecord,
    analysisResult.error ? null : (analysisResult.data as SupabaseAnalysisRecord | null)
  );
  const result = await sendFollowUpForCall({ row });

  if (!result.ok) {
    console.error("[follow-up] Follow-up request failed.", {
      callId: row.id,
      caller: row.caller,
      phone: row.phone,
      status: result.status,
      message: result.message
    });

    return NextResponse.json(
      {
        message: result.message
      },
      { status: result.status }
    );
  }

  console.info("[follow-up] Follow-up request sent.", {
    callId: row.id,
    caller: row.caller,
    phone: row.phone,
    mode: result.mode,
    sid: result.sid
  });

  return NextResponse.json({
    message: result.message,
    mode: result.mode,
    sid: result.sid,
    statusLabel: "Follow-Up Sent"
  });
}
