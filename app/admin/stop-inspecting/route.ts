import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/session";
import {
  isPlatformAdminUser,
  platformAdminBusinessOverrideCookieName
} from "@/lib/platform-admin";

export async function GET(request: Request) {
  const user = await getAuthenticatedUser();
  const response = NextResponse.redirect(
    new URL(user && isPlatformAdminUser(user) ? "/admin" : "/dashboard", request.url)
  );

  response.cookies.set(platformAdminBusinessOverrideCookieName, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0
  });

  return response;
}
