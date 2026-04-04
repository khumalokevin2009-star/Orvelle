"use client";

import { PasswordAccessPage } from "@/components/password-access-page";

export default function SetPasswordPage() {
  return (
    <PasswordAccessPage
      eyebrow="Invite-Only Access"
      title="Set Your Password"
      description="Finish setting up your Orvelle access by choosing a password for your invited account."
      submitLabel="Set Password"
      savingLabel="Saving Password..."
      successRedirect="/workspace"
    />
  );
}
