import { NextResponse } from "next/server";
import {
  analysisSelectFields,
  callsSelectFields,
  mapSupabaseCallToDashboardRow,
  type SupabaseAnalysisRecord,
  type SupabaseCallRecord
} from "@/lib/dashboard-calls";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { demoDashboardRows, shouldUseDemoDashboardData } from "@/lib/demo-dashboard-data";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const user = await getAuthenticatedUser();

  if (!user) {
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
    console.error("[dashboard-calls] Failed to initialize Supabase admin client.", error);

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
    console.error("[dashboard-calls] Supabase calls query failed.", callsError);

    return NextResponse.json(
      {
        message: callsError.message || "Unable to load call records from Supabase.",
        rows: []
      },
      { status: 500 }
    );
  }

  if (analysesError) {
    console.error("[dashboard-calls] Supabase analysis query failed.", analysesError);

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

  console.info("[dashboard-calls] Query completed.", {
    callsReturned: calls?.length ?? 0,
    analysesReturned: analyses?.length ?? 0
  });

  if ((calls?.length ?? 0) === 0) {
    console.warn("[dashboard-calls] Supabase returned zero call rows. Dashboard will render the empty state.");
  }

  const mappedRows = (calls ?? []).map((call) =>
    mapSupabaseCallToDashboardRow(
      call as SupabaseCallRecord,
      analysisByCallId.get((call as SupabaseCallRecord).id) ?? null
    )
  );

  const useDemoData = shouldUseDemoDashboardData(mappedRows);

  return NextResponse.json({
    mode: useDemoData ? "demo" : "live",
    rows: useDemoData ? demoDashboardRows : mappedRows,
    liveRows: mappedRows
  });
}
