import Link from "next/link";
import { WorkspacePageHeader } from "@/components/workspace-page-header";

export default function CallNotFoundPage() {
  return (
    <main>
      <WorkspacePageHeader
        title="Call Analysis Record"
        description="The requested interaction record could not be located in the active call dataset."
      />

      <section className="surface-primary mt-6 p-8">
        <div className="inline-flex rounded-full border border-[#F3DDAF] bg-[#FFF6E4] px-3 py-1 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#9A6A1B]">
          Record Not Found
        </div>
        <h2 className="type-page-title mt-5 text-[28px]">
          The selected call record is unavailable.
        </h2>
        <p className="type-body-text mt-3 max-w-[720px] text-[15px]">
          The interaction may have been removed, the identifier may be invalid, or the record has not yet been
          synchronized into the operational dataset.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/dashboard"
            className="button-primary-accent inline-flex items-center justify-center px-4 py-3 text-[14px] transition hover:border-[#1D4ED8] hover:bg-[#1D4ED8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
          >
            Return to Dashboard
          </Link>
          <Link
            href="/upload"
            className="button-secondary-ui inline-flex items-center justify-center px-4 py-3 text-[14px] transition hover:border-[#D1D5DB] hover:bg-[#F9FAFB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
          >
            Review Uploaded Records
          </Link>
        </div>
      </section>
    </main>
  );
}
