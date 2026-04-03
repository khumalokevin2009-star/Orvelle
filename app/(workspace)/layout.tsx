import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard-shell";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { defaultSolutionMode } from "@/lib/solution-mode";
import { getMissedCallRecoverySettings } from "@/lib/missed-call-recovery-settings";

export default async function WorkspaceLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  let solutionMode = defaultSolutionMode;

  try {
    const settings = await getMissedCallRecoverySettings(user.id);
    solutionMode = settings.solutionMode;
  } catch (error) {
    console.error("[workspace-layout] Failed to load solution mode.", error);
  }

  return <DashboardShell solutionMode={solutionMode}>{children}</DashboardShell>;
}
