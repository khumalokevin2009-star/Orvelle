import { getAuthenticatedUser } from "@/lib/auth/session";
import { getMissedCallRecoverySettings } from "@/lib/missed-call-recovery-settings";
import { defaultSolutionMode } from "@/lib/solution-mode";
import { MissedCallRecoveryPage } from "@/components/missed-call-recovery-page";

export default async function MissedCallsPage() {
  const user = await getAuthenticatedUser();
  let solutionMode = defaultSolutionMode;

  if (user) {
    try {
      const settings = await getMissedCallRecoverySettings(user.id);
      solutionMode = settings.solutionMode;
    } catch (error) {
      console.error("[missed-calls-page] Failed to load solution mode.", error);
    }
  }

  return <MissedCallRecoveryPage solutionMode={solutionMode} />;
}
