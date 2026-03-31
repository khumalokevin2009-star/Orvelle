"use client";

import Link from "next/link";
import { useEffect } from "react";
import { WorkspacePageHeader } from "@/components/workspace-page-header";

export default function CallErrorPage({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main>
      <WorkspacePageHeader
        title="Call Analysis Record"
        description="The interaction record could not be loaded from the active operational dataset."
      />

      <section className="surface-primary mt-6 p-8">
        <div className="inline-flex rounded-full border border-[#F2D4D4] bg-[#FFF6F6] px-3 py-1 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#A24E4E]">
          Retrieval Error
        </div>
        <h2 className="type-page-title mt-5 text-[28px]">
          Call record retrieval was unsuccessful.
        </h2>
        <p className="type-body-text mt-3 max-w-[720px] text-[15px]">
          The platform could not load this interaction record from Supabase. Retry the request or return to the
          dashboard to inspect other flagged interactions.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={reset}
            className="button-primary-accent inline-flex items-center justify-center px-4 py-3 text-[14px] transition hover:border-[#1D4ED8] hover:bg-[#1D4ED8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
          >
            Retry Retrieval
          </button>
          <Link
            href="/dashboard"
            className="button-secondary-ui inline-flex items-center justify-center px-4 py-3 text-[14px] transition hover:border-[#D1D5DB] hover:bg-[#F9FAFB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
          >
            Return to Dashboard
          </Link>
        </div>
      </section>
    </main>
  );
}
