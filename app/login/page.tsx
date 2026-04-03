"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogoIcon } from "@/components/icons";

function getLoginErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  const normalized = message.toLowerCase();

  if (
    normalized.includes("missing required supabase environment variable") ||
    normalized.includes("next_public_supabase_url") ||
    normalized.includes("next_public_supabase_publishable_key")
  ) {
    return "Login is temporarily unavailable. Please try again later.";
  }

  if (
    normalized.includes("invalid login credentials") ||
    normalized.includes("invalid email or password")
  ) {
    return "Invalid email or password.";
  }

  if (
    normalized.includes("email not confirmed") ||
    normalized.includes("invite") ||
    normalized.includes("expired")
  ) {
    return "Your invite may not be completed yet. Set your password from the invite email or request a new invite.";
  }

  if (
    normalized.includes("business account is not fully set up") ||
    normalized.includes("business account") ||
    normalized.includes("account setup")
  ) {
    return "Your sign-in worked, but your business account is not fully set up yet. Contact support to finish access.";
  }

  return "Unable to sign in right now. Please try again.";
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isPending) {
      return;
    }

    setIsPending(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: email.trim(),
          password
        })
      });

      const payload = (await response.json().catch(() => null)) as
        | {
            ok?: boolean;
            message?: string;
            redirectTo?: string;
          }
        | null;

      if (!response.ok || !payload?.ok) {
        setErrorMessage(getLoginErrorMessage(payload?.message || "Unable to sign in right now."));
        return;
      }

      router.replace(payload.redirectTo || "/dashboard");
      router.refresh();
    } catch (error) {
      setErrorMessage(getLoginErrorMessage(error));
    } finally {
      setIsPending(false);
    }
  }

  return (
    <main className="relative min-h-screen bg-[#F3F4F6] px-4 py-8 sm:px-6 lg:px-8">
      <div className="absolute left-4 top-4 z-10 sm:left-6 sm:top-6 lg:left-8 lg:top-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-[12px] border border-[#E5E7EB] bg-[#FFFFFF] px-3 py-2 text-[14px] font-medium text-[#6B7280] no-underline shadow-[0_1px_2px_rgba(17,24,39,0.04)] transition hover:border-[#D1D5DB] hover:bg-[#F9FAFB] hover:text-[#111827] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
        >
          <span aria-hidden="true">←</span>
          <span>Back to homepage</span>
        </Link>
      </div>

      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-[1180px] items-center justify-center">
        <div className="w-full max-w-[480px]">
          <section className="surface-primary w-full px-8 py-9 shadow-[0_18px_55px_rgba(17,24,39,0.08)] sm:px-10 sm:py-11">
            <div className="surface-secondary inline-flex h-14 w-14 items-center justify-center">
              <LogoIcon className="h-10 w-10" />
            </div>

            <div className="mt-7">
              <div className="type-label-text text-[12px]">
                Revenue Operations Platform
              </div>
              <h1 className="type-page-title text-[32px]">Access Platform</h1>
              <p className="type-body-text mt-3 text-[15px]">
                Sign in to review flagged interactions and revenue leakage across call activity.
              </p>
            </div>

            <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
              <label className="block">
                <span className="type-label-text text-[13px]">Email</span>
                <input
                  type="email"
                  name="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="analyst@revenueops.io"
                  required
                  className="mt-2 h-12 w-full rounded-[12px] border border-[#E5E7EB] bg-[#FFFFFF] px-4 text-[15px] text-[#111827] outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]"
                  autoComplete="email"
                />
              </label>

              <label className="block">
                <div className="flex items-center justify-between gap-4">
                  <span className="type-label-text text-[13px]">Password</span>
                  <a
                    href="mailto:access@revenueops.io?subject=Password%20Reset%20Request"
                    className="text-[13px] font-medium text-[#6B7280] transition hover:text-[#111827] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                  >
                    Forgot password
                  </a>
                </div>
                <input
                  type="password"
                  name="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  required
                  className="mt-2 h-12 w-full rounded-[12px] border border-[#E5E7EB] bg-[#FFFFFF] px-4 text-[15px] text-[#111827] outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]"
                  autoComplete="current-password"
                />
              </label>

              {errorMessage ? (
                <div
                  aria-live="polite"
                  className="rounded-[12px] border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-[14px] text-[#B91C1C]"
                >
                  {errorMessage}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={isPending}
                className="button-primary-accent inline-flex w-full items-center justify-center px-4 py-3 text-[15px] transition hover:border-[#1D4ED8] hover:bg-[#1D4ED8] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] disabled:cursor-not-allowed disabled:border-[#D1D5DB] disabled:bg-[#D1D5DB] disabled:text-white/80"
              >
                {isPending ? "Signing In..." : "Sign In"}
              </button>
            </form>

            <div className="surface-secondary mt-6 px-4 py-4">
              <div className="type-label-text text-[13px]">
                Security Notice
              </div>
              <p className="type-body-text mt-2 text-[14px]">
                Access is restricted to authorized revenue operations and service leadership personnel.
              </p>
            </div>
          </section>

          <footer className="mt-5 flex items-center justify-center gap-4 text-[14px]">
            <Link href="/privacy" className="font-medium text-[#6B7280] no-underline transition hover:text-[#111827]">
              Privacy Policy
            </Link>
            <Link href="/terms" className="font-medium text-[#6B7280] no-underline transition hover:text-[#111827]">
              Terms of Service
            </Link>
          </footer>
        </div>
      </div>
    </main>
  );
}
