"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogoIcon } from "@/components/icons";
import { createClient } from "@/lib/supabase/client";

type PasswordSetupState = "checking" | "ready" | "invalid";
type PasswordSetupLinkType = "invite" | "recovery";

function getPasswordSetupErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  const normalized = message.toLowerCase();

  if (normalized.includes("same password")) {
    return "Please choose a new password that you have not used already.";
  }

  if (normalized.includes("password should be at least")) {
    return "Password must be at least 8 characters.";
  }

  return "Unable to complete password setup right now. Please try the email link again.";
}

function getInvalidPasswordSetupLinkMessage(error?: unknown) {
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  const normalized = message.toLowerCase();

  if (normalized.includes("expired") || normalized.includes("invalid")) {
    return "This password setup link is invalid or has expired.";
  }

  if (normalized.includes("otp") || normalized.includes("token") || normalized.includes("code")) {
    return "We couldn't verify this password setup link. It may have expired or already been used.";
  }

  return "This password setup link is invalid or has expired.";
}

function normalizePasswordSetupLinkType(value: string | null): PasswordSetupLinkType | null {
  if (value === "invite" || value === "recovery") {
    return value;
  }

  return null;
}

function readPasswordSetupAuthParams() {
  const url = new URL(window.location.href);
  const hashParams = new URLSearchParams(url.hash.startsWith("#") ? url.hash.slice(1) : url.hash);

  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type =
    normalizePasswordSetupLinkType(url.searchParams.get("type")) ||
    normalizePasswordSetupLinkType(hashParams.get("type"));
  const accessToken = hashParams.get("access_token");
  const refreshToken = hashParams.get("refresh_token");
  const authError = url.searchParams.get("error") || hashParams.get("error");
  const authErrorDescription =
    url.searchParams.get("error_description") || hashParams.get("error_description");

  return {
    code,
    tokenHash,
    type,
    accessToken,
    refreshToken,
    authError,
    authErrorDescription,
    hasAuthParams:
      Boolean(code) ||
      Boolean(tokenHash) ||
      Boolean(accessToken && refreshToken) ||
      Boolean(authError) ||
      Boolean(authErrorDescription)
  };
}

function clearPasswordSetupAuthParams() {
  const cleanUrl = new URL(window.location.href);
  cleanUrl.search = "";
  cleanUrl.hash = "";
  window.history.replaceState({}, document.title, cleanUrl.toString());
}

export default function SetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [setupState, setSetupState] = useState<PasswordSetupState>("checking");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    let retrySessionTimeout: number | undefined;
    const supabase = createClient();

    function markInvalid(error?: unknown) {
      if (!isMounted) {
        return;
      }

      console.warn("[set-password] Password setup link could not establish a session.", error);
      setSetupState("invalid");
      setErrorMessage(getInvalidPasswordSetupLinkMessage(error));
    }

    async function resolveSession() {
      try {
        const authParams = readPasswordSetupAuthParams();

        if (authParams.authError || authParams.authErrorDescription) {
          markInvalid(authParams.authErrorDescription || authParams.authError);
          return;
        }

        if (authParams.code) {
          console.info("[set-password] Exchanging Supabase auth code for password setup.");
          const { error } = await supabase.auth.exchangeCodeForSession(authParams.code);

          if (error) {
            markInvalid(error);
            return;
          }
        } else if (authParams.tokenHash && authParams.type) {
          console.info("[set-password] Verifying Supabase OTP token for password setup.");
          const { error } = await supabase.auth.verifyOtp({
            token_hash: authParams.tokenHash,
            type: authParams.type
          });

          if (error) {
            markInvalid(error);
            return;
          }
        } else if (authParams.accessToken && authParams.refreshToken) {
          console.info("[set-password] Restoring Supabase session from password setup tokens.");
          const { error } = await supabase.auth.setSession({
            access_token: authParams.accessToken,
            refresh_token: authParams.refreshToken
          });

          if (error) {
            markInvalid(error);
            return;
          }
        }

        const { data, error } = await supabase.auth.getSession();

        if (!isMounted) {
          return;
        }

        if (error) {
          markInvalid(error);
          return;
        }

        if (data.session) {
          clearPasswordSetupAuthParams();
          setSetupState("ready");
          return;
        }

        if (authParams.hasAuthParams) {
          retrySessionTimeout = window.setTimeout(async () => {
            const { data: retryData, error: retryError } = await supabase.auth.getSession();

            if (!isMounted) {
              return;
            }

            if (retryError) {
              markInvalid(retryError);
              return;
            }

            if (retryData.session) {
              clearPasswordSetupAuthParams();
              setSetupState("ready");
              return;
            }

            markInvalid();
          }, 1500);
          return;
        }

        markInvalid();
      } catch (error) {
        markInvalid(error);
      }
    }

    resolveSession();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) {
        return;
      }

      if (session && (event === "SIGNED_IN" || event === "PASSWORD_RECOVERY" || event === "INITIAL_SESSION")) {
        clearPasswordSetupAuthParams();
        setSetupState("ready");
      }
    });

    return () => {
      isMounted = false;
      if (retrySessionTimeout) {
        window.clearTimeout(retrySessionTimeout);
      }
      subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isPending || setupState !== "ready") {
      return;
    }

    if (password.length < 8) {
      setErrorMessage("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setIsPending(true);
    setErrorMessage(null);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        password
      });

      if (error) {
        setErrorMessage(getPasswordSetupErrorMessage(error));
        return;
      }

      router.replace("/dashboard");
      router.refresh();
    } catch (error) {
      setErrorMessage(getPasswordSetupErrorMessage(error));
    } finally {
      setIsPending(false);
    }
  }

  return (
    <main className="relative min-h-screen bg-[#F3F4F6] px-4 py-8 sm:px-6 lg:px-8">
      <div className="absolute left-4 top-4 z-10 sm:left-6 sm:top-6 lg:left-8 lg:top-8">
        <Link
          href="/login"
          className="inline-flex items-center gap-2 rounded-[12px] border border-[#E5E7EB] bg-[#FFFFFF] px-3 py-2 text-[14px] font-medium text-[#6B7280] no-underline shadow-[0_1px_2px_rgba(17,24,39,0.04)] transition hover:border-[#D1D5DB] hover:bg-[#F9FAFB] hover:text-[#111827] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
        >
          <span aria-hidden="true">←</span>
          <span>Back to sign in</span>
        </Link>
      </div>

      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-[1180px] items-center justify-center">
        <div className="w-full max-w-[480px]">
          <section className="surface-primary w-full px-8 py-9 shadow-[0_18px_55px_rgba(17,24,39,0.08)] sm:px-10 sm:py-11">
            <div className="surface-secondary inline-flex h-14 w-14 items-center justify-center">
              <LogoIcon className="h-10 w-10" />
            </div>

            <div className="mt-7">
              <div className="type-label-text text-[12px]">Invite-Only Access</div>
              <h1 className="type-page-title text-[32px]">Set Your Password</h1>
              <p className="type-body-text mt-3 text-[15px]">
                Finish setting up your Orvelle access by choosing a password for your invited account.
              </p>
            </div>

            <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
              <label className="block">
                <span className="type-label-text text-[13px]">New password</span>
                <input
                  type="password"
                  name="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Choose a secure password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  disabled={setupState !== "ready" || isPending}
                  className="mt-2 h-12 w-full rounded-[12px] border border-[#E5E7EB] bg-[#FFFFFF] px-4 text-[15px] text-[#111827] outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB] disabled:cursor-not-allowed disabled:bg-[#F9FAFB]"
                />
              </label>

              <label className="block">
                <span className="type-label-text text-[13px]">Confirm password</span>
                <input
                  type="password"
                  name="confirmPassword"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Re-enter your password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  disabled={setupState !== "ready" || isPending}
                  className="mt-2 h-12 w-full rounded-[12px] border border-[#E5E7EB] bg-[#FFFFFF] px-4 text-[15px] text-[#111827] outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB] disabled:cursor-not-allowed disabled:bg-[#F9FAFB]"
                />
              </label>

              {setupState === "checking" ? (
                <div className="rounded-[12px] border border-[#DBEAFE] bg-[#EFF6FF] px-4 py-3 text-[14px] text-[#1D4ED8]">
                  Verifying your invite link and preparing password setup.
                </div>
              ) : null}

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
                disabled={setupState !== "ready" || isPending}
                className="button-primary-accent inline-flex w-full items-center justify-center px-4 py-3 text-[15px] transition hover:border-[#1D4ED8] hover:bg-[#1D4ED8] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] disabled:cursor-not-allowed disabled:border-[#D1D5DB] disabled:bg-[#D1D5DB] disabled:text-white/80"
              >
                {isPending ? "Saving Password..." : "Set Password"}
              </button>
            </form>

            <div className="surface-secondary mt-6 px-4 py-4">
              <div className="type-label-text text-[13px]">Access Notice</div>
              <p className="type-body-text mt-2 text-[14px]">
                Accounts are created by invitation only. If your link has expired, contact Orvelle support or the
                person who invited you.
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
