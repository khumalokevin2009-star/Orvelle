"use client";

import { PasswordAccessPage } from "@/components/password-access-page";

export default function ResetPasswordPage() {
  return (
    <PasswordAccessPage
      eyebrow="Password Recovery"
      title="Reset Your Password"
      description="Choose a new password to restore access to your Orvelle account."
      submitLabel="Reset Password"
      savingLabel="Saving Password..."
      successRedirect="/login"
    />
  );
}
