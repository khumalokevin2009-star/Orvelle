import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard-shell";
import { getAuthenticatedUser } from "@/lib/auth/session";

export default async function WorkspaceLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  return <DashboardShell>{children}</DashboardShell>;
}
