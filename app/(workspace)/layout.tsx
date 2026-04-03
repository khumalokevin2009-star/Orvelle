import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard-shell";
import { getCurrentBusinessAccount } from "@/lib/business-account";

export default async function WorkspaceLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const businessAccount = await getCurrentBusinessAccount();

  if (!businessAccount) {
    redirect("/login");
  }

  return (
    <DashboardShell
      businessId={businessAccount.businessId}
      businessName={businessAccount.businessName}
      solutionMode={businessAccount.solutionMode}
      businessVertical={businessAccount.businessVertical}
    >
      {children}
    </DashboardShell>
  );
}
