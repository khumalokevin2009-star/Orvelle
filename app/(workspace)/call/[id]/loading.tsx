import { WorkspacePageHeader } from "@/components/workspace-page-header";

function LoadingBlock({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-[12px] bg-[#EEF2F7] ${className}`} />;
}

export default function LoadingCallPage() {
  return (
    <main>
      <WorkspacePageHeader
        title="Call Analysis Record"
        description="Loading the selected interaction record and associated operational context."
      />

      <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1.32fr)_360px] xl:items-start">
        <div className="space-y-5">
          <section className="surface-primary p-6">
            <LoadingBlock className="h-7 w-[220px]" />
            <LoadingBlock className="mt-5 h-4 w-[180px]" />
            <LoadingBlock className="mt-3 h-10 w-[280px]" />
            <LoadingBlock className="mt-4 h-4 w-full max-w-[720px]" />
            <LoadingBlock className="mt-3 h-4 w-full max-w-[640px]" />

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={`loading-meta-${index}`} className="surface-secondary px-4 py-4">
                  <LoadingBlock className="h-3 w-[110px]" />
                  <LoadingBlock className="mt-3 h-4 w-[150px]" />
                </div>
              ))}
            </div>
          </section>

          {["Transcript", "Recommended Action", "Analyst Notes"].map((section) => (
            <section
              key={section}
              className="surface-primary p-6"
            >
              <LoadingBlock className="h-6 w-[180px]" />
              <LoadingBlock className="mt-3 h-4 w-full max-w-[540px]" />
              <LoadingBlock className="mt-5 h-[92px] w-full" />
            </section>
          ))}
        </div>

        <aside className="space-y-5">
          {Array.from({ length: 3 }).map((_, index) => (
            <section
              key={`loading-side-${index}`}
              className="surface-primary p-6"
            >
              <LoadingBlock className="h-6 w-[190px]" />
              <LoadingBlock className="mt-3 h-4 w-full" />
              <LoadingBlock className="mt-5 h-[120px] w-full" />
            </section>
          ))}
        </aside>
      </div>
    </main>
  );
}
