import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { isPlatformAdminUser } from "@/lib/platform-admin";

export default async function WorkspaceEntryPage() {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  redirect(isPlatformAdminUser(user) ? "/admin" : "/dashboard");
}
