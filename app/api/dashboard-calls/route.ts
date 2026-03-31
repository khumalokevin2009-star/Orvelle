import { NextResponse } from "next/server";
import {
  analysisSelectFields,
  callsSelectFields,
  mapSupabaseCallToDashboardRow,
  type SupabaseAnalysisRecord,
  type SupabaseCallRecord
} from "@/lib/dashboard-calls";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  let supabase;

  try {
    supabase = createAdminClient();
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Unable to initialize the Supabase admin client.",
        rows: []
      },
      { status: 500 }
    );
  }

  const [{ data: calls, error: callsError }, { data: analyses, error: analysesError }] = await Promise.all([
    supabase
      .from("calls")
      .select(callsSelectFields)
      .order("started_at", { ascending: false }),
    supabase.from("analysis").select(analysisSelectFields)
  ]);

  if (callsError) {
    return NextResponse.json(
      {
        message: callsError.message || "Unable to load call records from Supabase.",
        rows: []
      },
      { status: 500 }
    );
  }

  if (analysesError) {
    return NextResponse.json(
      {
        message: analysesError.message || "Unable to load call analysis records from Supabase.",
        rows: []
      },
      { status: 500 }
    );
  }

  const analysisByCallId = new Map(
    (analyses ?? []).map((analysis) => {
      const record = analysis as SupabaseAnalysisRecord;
      return [record.call_id, record] as const;
    })
  );

  return NextResponse.json({
    rows: (calls ?? []).map((call) =>
      mapSupabaseCallToDashboardRow(
        call as SupabaseCallRecord,
        analysisByCallId.get((call as SupabaseCallRecord).id) ?? null
      )
    )
  });
}
