import Link from "next/link";
import { WorkspacePageHeader } from "@/components/workspace-page-header";
import { requirePlatformAdminUser } from "@/lib/platform-admin";
import { listPlatformBusinesses } from "@/lib/platform-admin-businesses";
import { businessVerticalOptions, solutionModeOptions } from "@/lib/solution-mode";
import { serviceCallRoutingModeOptions } from "@/lib/service-call-routing-mode";

function SectionCard({
  title,
  description,
  children
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="surface-primary p-4 sm:p-5">
      <div>
        <h2 className="type-section-title text-[18px]">{title}</h2>
        <p className="type-body-text mt-2 max-w-[720px] text-[14px]">{description}</p>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Field({
  label,
  children
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="type-label-text text-[12px]">{label}</div>
      <div className="mt-2">{children}</div>
    </label>
  );
}

const inputClassName =
  "h-12 w-full rounded-[12px] border border-[#E5E7EB] bg-[#FFFFFF] px-4 text-[15px] text-[#111827] outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]";

function formatDate(value: string | null) {
  if (!value) {
    return "Not available";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.valueOf())) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(parsed);
}

export default async function AdminPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePlatformAdminUser();
  const params = searchParams ? await searchParams : {};
  const notice = typeof params.notice === "string" ? params.notice : null;
  const error = typeof params.error === "string" ? params.error : null;
  const businesses = await listPlatformBusinesses();

  return (
    <main className="min-h-screen bg-[#F3F4F6] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1320px] space-y-5">
        <WorkspacePageHeader
          title="Platform Admin"
          description="Manage client businesses, seed new accounts, and switch into a business workspace for testing without logging in as a tenant user."
          actions={
            <Link
              href="/admin/stop-inspecting"
              className="button-secondary-ui inline-flex h-11 items-center justify-center px-4 text-[14px] no-underline transition hover:border-[#D1D5DB] hover:bg-[#F9FAFB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
            >
              Clear inspection mode
            </Link>
          }
        />

        {notice ? (
          <div className="rounded-[12px] border border-[#D1FAE5] bg-[#ECFDF5] px-4 py-3 text-[14px] text-[#047857]">
            {notice}
          </div>
        ) : null}

        {error ? (
          <div className="rounded-[12px] border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-[14px] text-[#B91C1C]">
            {error}
          </div>
        ) : null}

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_420px]">
          <section className="space-y-4">
            <SectionCard
              title="Client Businesses"
              description="Each business below maps to the existing business_memberships model and the current business settings metadata used throughout Orvelle."
            >
              <div className="space-y-3">
                {businesses.length === 0 ? (
                  <div className="surface-secondary px-4 py-4 text-[14px] text-[#6B7280]">
                    No client businesses have been created yet.
                  </div>
                ) : (
                  businesses.map((business) => (
                    <div key={business.businessId} className="surface-secondary px-4 py-4">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <div className="type-section-title text-[17px]">{business.businessName}</div>
                          <div className="type-body-text mt-1 text-[13px] break-all">{business.businessId}</div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <span className="surface-primary inline-flex rounded-full px-3 py-1 text-[12px] font-semibold text-[#374151]">
                              {solutionModeOptions.find((option) => option.value === business.solutionMode)?.label ??
                                business.solutionMode}
                            </span>
                            <span className="surface-primary inline-flex rounded-full px-3 py-1 text-[12px] font-semibold text-[#374151]">
                              {businessVerticalOptions.find((option) => option.value === business.businessVertical)
                                ?.label ?? business.businessVertical}
                            </span>
                            <span className="surface-primary inline-flex rounded-full px-3 py-1 text-[12px] font-semibold text-[#374151]">
                              {business.memberCount} {business.memberCount === 1 ? "member" : "members"}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Link
                            href={`/admin/businesses/${business.businessId}`}
                            className="button-secondary-ui inline-flex h-10 items-center justify-center px-4 text-[13px] no-underline transition hover:border-[#D1D5DB] hover:bg-[#F9FAFB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                          >
                            Manage team
                          </Link>
                          <Link
                            href={`/admin/businesses/${business.businessId}/inspect?redirect=%2Fdashboard`}
                            className="button-secondary-ui inline-flex h-10 items-center justify-center px-4 text-[13px] no-underline transition hover:border-[#D1D5DB] hover:bg-[#F9FAFB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                          >
                            Inspect dashboard
                          </Link>
                          <Link
                            href={`/admin/businesses/${business.businessId}/inspect?redirect=%2Fsettings`}
                            className="button-secondary-ui inline-flex h-10 items-center justify-center px-4 text-[13px] no-underline transition hover:border-[#D1D5DB] hover:bg-[#F9FAFB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                          >
                            Edit settings
                          </Link>
                          <Link
                            href={`/admin/businesses/${business.businessId}/inspect?redirect=%2Fsettings%2Fintegrations`}
                            className="button-secondary-ui inline-flex h-10 items-center justify-center px-4 text-[13px] no-underline transition hover:border-[#D1D5DB] hover:bg-[#F9FAFB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                          >
                            Integrations
                          </Link>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <div className="rounded-[12px] border border-[#E5E7EB] bg-[#FFFFFF] px-3.5 py-3">
                          <div className="type-label-text text-[11px]">Twilio Number</div>
                          <div className="type-section-title mt-2 break-words text-[15px]">
                            {business.twilioNumber || "Not configured"}
                          </div>
                        </div>
                        <div className="rounded-[12px] border border-[#E5E7EB] bg-[#FFFFFF] px-3.5 py-3">
                          <div className="type-label-text text-[11px]">Answer / Callback</div>
                          <div className="type-section-title mt-2 break-words text-[15px]">
                            {business.callbackNumber || "Not configured"}
                          </div>
                        </div>
                        <div className="rounded-[12px] border border-[#E5E7EB] bg-[#FFFFFF] px-3.5 py-3">
                          <div className="type-label-text text-[11px]">Call Routing Mode</div>
                          <div className="type-section-title mt-2 break-words text-[15px]">
                            {serviceCallRoutingModeOptions.find((option) => option.value === business.callRoutingMode)
                              ?.label ?? business.callRoutingMode}
                          </div>
                        </div>
                        <div className="rounded-[12px] border border-[#E5E7EB] bg-[#FFFFFF] px-3.5 py-3">
                          <div className="type-label-text text-[11px]">Updated</div>
                          <div className="type-section-title mt-2 text-[15px]">{formatDate(business.updatedAt)}</div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </SectionCard>
          </section>

          <aside className="space-y-4">
            <SectionCard
              title="Create New Business"
              description="Create the first owner-backed business account and seed the business settings in one internal admin flow."
            >
              <form action="/api/admin/businesses" method="post" className="space-y-4">
                <Field label="Owner Email">
                  <input
                    type="email"
                    name="ownerEmail"
                    required
                    placeholder="owner@clientbusiness.com"
                    className={inputClassName}
                  />
                </Field>
                <Field label="Owner Contact Name">
                  <input
                    type="text"
                    name="contactName"
                    placeholder="Optional"
                    className={inputClassName}
                  />
                </Field>
                <Field label="Business Name">
                  <input
                    type="text"
                    name="businessName"
                    required
                    placeholder="Northflow HVAC Ltd."
                    className={inputClassName}
                  />
                </Field>
                <Field label="Solution Mode">
                  <select name="solutionMode" defaultValue="service_business_missed_call_recovery" className={inputClassName}>
                    {solutionModeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Business Vertical">
                  <select name="businessVertical" defaultValue="hvac" className={inputClassName}>
                    {businessVerticalOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Assigned Twilio Number">
                  <input type="tel" name="twilioNumber" placeholder="+44 20 7946 0123" className={inputClassName} />
                </Field>
                <Field label="Answer / Callback Number">
                  <input type="tel" name="callbackNumber" placeholder="+44 7900 261143" className={inputClassName} />
                </Field>
                <Field label="Call Routing Mode">
                  <select name="callRoutingMode" defaultValue="missed_call_only_forwarding" className={inputClassName}>
                    {serviceCallRoutingModeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <button
                  type="submit"
                  className="button-primary-accent inline-flex h-11 items-center justify-center px-4 text-[14px] transition hover:border-[#1D4ED8] hover:bg-[#1D4ED8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                >
                  Create business and invite owner
                </button>
              </form>
            </SectionCard>
          </aside>
        </div>
      </div>
    </main>
  );
}
