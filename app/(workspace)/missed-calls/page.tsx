import { redirect } from "next/navigation";
import { MissedCallRecoveryPage } from "@/components/missed-call-recovery-page";
import { getCurrentBusinessAccount } from "@/lib/business-account";

export default async function MissedCallsPage() {
  const businessAccount = await getCurrentBusinessAccount();

  if (businessAccount?.solutionMode === "service_business_missed_call_recovery") {
    redirect("/dashboard");
  }

  return <MissedCallRecoveryPage />;
}
