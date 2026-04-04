import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { getBusinessAccountByBusinessId } from "@/lib/business-account";
import {
  isPlatformAdminUser,
  platformAdminBusinessOverrideCookieName
} from "@/lib/platform-admin";

const allowedRedirects = new Set(["/dashboard", "/settings", "/settings/integrations"]);

export async function GET(
  request: Request,
  context: {
    params: Promise<{ businessId: string }>;
  }
) {
  const user = await getAuthenticatedUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (!isPlatformAdminUser(user)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  const { businessId } = await context.params;
  const businessAccount = await getBusinessAccountByBusinessId(businessId);

  if (!businessAccount) {
    return NextResponse.redirect(
      new URL("/admin?error=Business%20not%20found.", request.url)
    );
  }

  const requestUrl = new URL(request.url);
  const requestedRedirect = requestUrl.searchParams.get("redirect")?.trim() || "/dashboard";
  const safeRedirect = allowedRedirects.has(requestedRedirect) ? requestedRedirect : "/dashboard";
  const response = NextResponse.redirect(new URL(safeRedirect, request.url));

  response.cookies.set(platformAdminBusinessOverrideCookieName, businessId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/"
  });

  return response;
}
