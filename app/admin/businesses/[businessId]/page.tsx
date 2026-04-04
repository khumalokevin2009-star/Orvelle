import Link from "next/link";
import { notFound } from "next/navigation";
import { WorkspacePageHeader } from "@/components/workspace-page-header";
import { businessUserRoleOptions, formatBusinessUserRole } from "@/lib/business-user-roles";
import { requirePlatformAdminUser } from "@/lib/platform-admin";
import { getPlatformBusinessSnapshot } from "@/lib/platform-admin-businesses";
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

export default async function PlatformBusinessPage({
  params,
  searchParams
}: {
  params: Promise<{ businessId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePlatformAdminUser();
  const { businessId } = await params;
  const query = searchParams ? await searchParams : {};
  const notice = typeof query.notice === "string" ? query.notice : null;
  const error = typeof query.error === "string" ? query.error : null;
  const business = await getPlatformBusinessSnapshot(businessId);

  if (!business) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#F3F4F6] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1280px] space-y-5">
        <WorkspacePageHeader
          title={business.businessName}
          description="Manage this client business from the platform admin layer, invite client users, and jump into the business workspace for verification."
          actions={
            <>
              <Link
                href="/admin"
                className="button-secondary-ui inline-flex h-11 items-center justify-center px-4 text-[14px] no-underline transition hover:border-[#D1D5DB] hover:bg-[#F9FAFB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
              >
                Back to admin
              </Link>
              <Link
                href={`/admin/businesses/${business.businessId}/inspect?redirect=%2Fdashboard`}
                className="button-secondary-ui inline-flex h-11 items-center justify-center px-4 text-[14px] no-underline transition hover:border-[#D1D5DB] hover:bg-[#F9FAFB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
              >
                Inspect dashboard
              </Link>
              <Link
                href={`/admin/businesses/${business.businessId}/inspect?redirect=%2Fsettings`}
                className="button-secondary-ui inline-flex h-11 items-center justify-center px-4 text-[14px] no-underline transition hover:border-[#D1D5DB] hover:bg-[#F9FAFB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
              >
                Open settings
              </Link>
              <Link
                href={`/admin/businesses/${business.businessId}/inspect?redirect=%2Fsettings%2Fintegrations`}
                className="button-secondary-ui inline-flex h-11 items-center justify-center px-4 text-[14px] no-underline transition hover:border-[#D1D5DB] hover:bg-[#F9FAFB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
              >
                Open integrations
              </Link>
            </>
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

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_400px]">
          <section className="space-y-4">
            <SectionCard
              title="Business Summary"
              description="These values come from the same business_memberships and business settings metadata the client workspace already uses."
            >
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-[12px] border border-[#E5E7EB] bg-[#FFFFFF] px-3.5 py-3">
                  <div className="type-label-text text-[11px]">Solution Mode</div>
                  <div className="type-section-title mt-2 text-[15px]">
                    {solutionModeOptions.find((option) => option.value === business.solutionMode)?.label ??
                      business.solutionMode}
                  </div>
                </div>
                <div className="rounded-[12px] border border-[#E5E7EB] bg-[#FFFFFF] px-3.5 py-3">
                  <div className="type-label-text text-[11px]">Business Vertical</div>
                  <div className="type-section-title mt-2 text-[15px]">
                    {businessVerticalOptions.find((option) => option.value === business.businessVertical)?.label ??
                      business.businessVertical}
                  </div>
                </div>
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
                    {serviceCallRoutingModeOptions.find((option) => option.value === business.callRoutingMode)?.label ??
                      business.callRoutingMode}
                  </div>
                </div>
                <div className="rounded-[12px] border border-[#E5E7EB] bg-[#FFFFFF] px-3.5 py-3">
                  <div className="type-label-text text-[11px]">Members</div>
                  <div className="type-section-title mt-2 text-[15px]">{business.memberCount}</div>
                </div>
                <div className="rounded-[12px] border border-[#E5E7EB] bg-[#FFFFFF] px-3.5 py-3">
                  <div className="type-label-text text-[11px]">Created</div>
                  <div className="type-section-title mt-2 text-[15px]">{formatDate(business.createdAt)}</div>
                </div>
                <div className="rounded-[12px] border border-[#E5E7EB] bg-[#FFFFFF] px-3.5 py-3">
                  <div className="type-label-text text-[11px]">Updated</div>
                  <div className="type-section-title mt-2 text-[15px]">{formatDate(business.updatedAt)}</div>
                </div>
              </div>
            </SectionCard>

            <SectionCard
              title="Business Members"
              description="Business-level roles stay attached to each invited user. Platform admins can invite additional users into this business from here."
            >
              <div className="space-y-3">
                {business.members.map((member) => (
                  <div key={member.userId} className="surface-secondary px-4 py-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="type-section-title text-[15px]">{member.fullName}</div>
                        <div className="type-body-text mt-1 text-[13px]">{member.email}</div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <span className="surface-primary inline-flex rounded-full px-3 py-1 text-[12px] font-semibold text-[#374151]">
                            {formatBusinessUserRole(member.role)}
                          </span>
                          <span className="surface-primary inline-flex rounded-full px-3 py-1 text-[12px] font-semibold text-[#374151]">
                            Invited {formatDate(member.invitedAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          </section>

          <aside className="space-y-4">
            <SectionCard
              title="Invite Client User"
              description="Invite a client user directly into this business. The business membership and role are assigned automatically."
            >
              <form action={`/api/admin/businesses/${business.businessId}/invite`} method="post" className="space-y-4">
                <Field label="Email">
                  <input
                    type="email"
                    name="email"
                    required
                    placeholder="dispatcher@clientbusiness.com"
                    className={inputClassName}
                  />
                </Field>
                <Field label="Contact Name">
                  <input type="text" name="contactName" placeholder="Optional" className={inputClassName} />
                </Field>
                <Field label="Role">
                  <select name="role" defaultValue="staff" className={inputClassName}>
                    {businessUserRoleOptions.map((option) => (
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
                  Invite user into business
                </button>
              </form>
            </SectionCard>
          </aside>
        </div>
      </div>
    </main>
  );
}
