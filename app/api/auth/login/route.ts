import { NextResponse } from "next/server";
import { ensureBusinessAccountForUser } from "@/lib/business-account";
import { createClient as createServerClient } from "@/lib/supabase/server";

type LoginFailureCode =
  | "missing_credentials"
  | "invalid_credentials"
  | "invite_incomplete"
  | "config_error"
  | "auth_unavailable"
  | "account_setup_failed";

function classifyLoginFailure(error: unknown): {
  code: LoginFailureCode;
  message: string;
  logMessage: string;
} {
  const message = error instanceof Error ? error.message : "Unknown authentication error.";
  const normalized = message.toLowerCase();

  if (
    normalized.includes("missing required supabase environment variable") ||
    normalized.includes("next_public_supabase_url") ||
    normalized.includes("next_public_supabase_publishable_key") ||
    normalized.includes("invalid api key") ||
    normalized.includes("invalid apikey")
  ) {
    return {
      code: "config_error",
      message: "Login is temporarily unavailable. Please try again later.",
      logMessage: message
    };
  }

  if (
    normalized.includes("fetch failed") ||
    normalized.includes("network") ||
    normalized.includes("timed out") ||
    normalized.includes("econnrefused") ||
    normalized.includes("enotfound")
  ) {
    return {
      code: "auth_unavailable",
      message: "Authentication service is temporarily unavailable. Please try again shortly.",
      logMessage: message
    };
  }

  if (
    normalized.includes("invalid login credentials") ||
    normalized.includes("invalid email or password")
  ) {
    return {
      code: "invalid_credentials",
      message: "Invalid email or password.",
      logMessage: message
    };
  }

  if (
    normalized.includes("email not confirmed") ||
    normalized.includes("invite") ||
    normalized.includes("expired")
  ) {
    return {
      code: "invite_incomplete",
      message:
        "Your invite may not be completed yet. Set your password from the invite email or request a new invite.",
      logMessage: message
    };
  }

  return {
    code: "auth_unavailable",
    message: "Unable to sign in right now. Please try again.",
    logMessage: message
  };
}

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as
    | {
        email?: string;
        password?: string;
      }
    | null;

  const email = payload?.email?.trim().toLowerCase() ?? "";
  const password = payload?.password ?? "";

  if (!email || !password) {
    return NextResponse.json(
      {
        ok: false,
        code: "missing_credentials" satisfies LoginFailureCode,
        message: "Email and password are required."
      },
      { status: 400 }
    );
  }

  console.info("[auth-login] Login attempt received.", {
    email
  });

  let supabase;

  try {
    supabase = await createServerClient();
  } catch (error) {
    const failure = classifyLoginFailure(error);

    console.error("[auth-login] Failed to initialize Supabase server client for login.", {
      email,
      code: failure.code,
      message: failure.logMessage
    });

    return NextResponse.json(
      {
        ok: false,
        code: failure.code,
        message: failure.message
      },
      { status: 500 }
    );
  }

  let signInResult;

  try {
    signInResult = await supabase.auth.signInWithPassword({
      email,
      password
    });
  } catch (error) {
    const failure = classifyLoginFailure(error);

    console.error("[auth-login] Supabase password sign-in request crashed.", {
      email,
      code: failure.code,
      message: failure.logMessage
    });

    return NextResponse.json(
      {
        ok: false,
        code: failure.code,
        message: failure.message
      },
      { status: failure.code === "config_error" ? 500 : 503 }
    );
  }

  const { data, error } = signInResult;

  if (error) {
    const failure = classifyLoginFailure(error);

    console.warn("[auth-login] Supabase password sign-in failed.", {
      email,
      code: failure.code,
      message: failure.logMessage
    });

    return NextResponse.json(
      {
        ok: false,
        code: failure.code,
        message: failure.message
      },
      { status: failure.code === "invalid_credentials" || failure.code === "invite_incomplete" ? 401 : 503 }
    );
  }

  if (!data.user) {
    console.error("[auth-login] Supabase sign-in returned without a user record.", {
      email
    });

    return NextResponse.json(
      {
        ok: false,
        code: "auth_unavailable" satisfies LoginFailureCode,
        message: "Unable to sign in right now. Please try again."
      },
      { status: 503 }
    );
  }

  console.info("[auth-login] Supabase password sign-in succeeded.", {
    email,
    userId: data.user.id
  });

  try {
    const businessAccount = await ensureBusinessAccountForUser(data.user);

    console.info("[auth-login] Business account resolved after successful sign-in.", {
      email,
      userId: data.user.id,
      businessId: businessAccount.businessId,
      solutionMode: businessAccount.solutionMode,
      businessVertical: businessAccount.businessVertical
    });

    return NextResponse.json({
      ok: true,
      redirectTo: "/dashboard"
    });
  } catch (error) {
    console.error("[auth-login] Business account resolution failed after successful sign-in.", {
      email,
      userId: data.user.id,
      message: error instanceof Error ? error.message : "Unknown error"
    });

    await supabase.auth.signOut().catch((signOutError) => {
      console.warn("[auth-login] Failed to clear session after business account resolution failure.", {
        email,
        userId: data.user.id,
        message: signOutError instanceof Error ? signOutError.message : "Unknown error"
      });
    });

    return NextResponse.json(
      {
        ok: false,
        code: "account_setup_failed" satisfies LoginFailureCode,
        message:
          "Your sign-in worked, but your business account is not fully set up yet. Contact support to finish access."
      },
      { status: 409 }
    );
  }
}
