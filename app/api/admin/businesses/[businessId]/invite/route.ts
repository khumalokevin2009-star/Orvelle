import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { normalizeBusinessUserRole } from "@/lib/business-user-roles";
import { inviteUserToBusiness } from "@/lib/platform-admin-businesses";
import { isPlatformAdminUser } from "@/lib/platform-admin";

export async function POST(
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
  const formData = await request.formData();
  const email = String(formData.get("email") ?? "").trim();
  const contactName = String(formData.get("contactName") ?? "").trim();

  if (!email) {
    return NextResponse.redirect(
      new URL(
        `/admin/businesses/${businessId}?error=Client%20email%20is%20required.`,
        request.url
      )
    );
  }

  try {
    await inviteUserToBusiness({
      businessId,
      email,
      contactName: contactName || null,
      role: normalizeBusinessUserRole(String(formData.get("role") ?? "")),
      origin: new URL(request.url).origin
    });

    return NextResponse.redirect(
      new URL(
        `/admin/businesses/${businessId}?notice=Invite%20email%20sent%20and%20business%20membership%20updated.`,
        request.url
      )
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to invite that client user right now.";

    return NextResponse.redirect(
      new URL(`/admin/businesses/${businessId}?error=${encodeURIComponent(message)}`, request.url)
    );
  }
}
