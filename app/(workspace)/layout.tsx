import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard-shell";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { getCurrentBusinessAccount } from "@/lib/business-account";
import {
  getPlatformAdminBusinessOverride,
  isPlatformAdminUser
} from "@/lib/platform-admin";

export default async function WorkspaceLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  const adminInspectionActive = Boolean(await getPlatformAdminBusinessOverride(user));

  if (isPlatformAdminUser(user) && !adminInspectionActive) {
    redirect("/admin");
  }

  const businessAccount = await getCurrentBusinessAccount();

  if (!businessAccount) {
    if (isPlatformAdminUser(user)) {
      redirect("/admin");
    }

    redirect("/login");
  }

  console.info("[workspace-layout] Rendering workspace for business account.", {
    businessId: businessAccount.businessId,
    businessName: businessAccount.businessName,
    solutionMode: businessAccount.solutionMode,
    businessVertical: businessAccount.businessVertical
  });

  return (
    <DashboardShell
      businessId={businessAccount.businessId}
      businessName={businessAccount.businessName}
      solutionMode={businessAccount.solutionMode}
      businessVertical={businessAccount.businessVertical}
      adminInspectionActive={adminInspectionActive}
    >
      {children}
    </DashboardShell>
  );
}
