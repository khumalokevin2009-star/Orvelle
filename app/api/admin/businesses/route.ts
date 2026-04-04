import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { createBusinessWithOwnerInvite } from "@/lib/platform-admin-businesses";
import { isPlatformAdminUser } from "@/lib/platform-admin";
import { normalizeBusinessVertical, normalizeSolutionMode } from "@/lib/solution-mode";
import { normalizeServiceCallRoutingMode } from "@/lib/service-call-routing-mode";

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (!isPlatformAdminUser(user)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  const formData = await request.formData();
  const ownerEmail = String(formData.get("ownerEmail") ?? "").trim();
  const contactName = String(formData.get("contactName") ?? "").trim();
  const businessName = String(formData.get("businessName") ?? "").trim();

  if (!ownerEmail || !businessName) {
    return NextResponse.redirect(
      new URL("/admin?error=Owner%20email%20and%20business%20name%20are%20required.", request.url)
    );
  }

  try {
    const solutionMode = normalizeSolutionMode(String(formData.get("solutionMode") ?? ""));

    const createdBusiness = await createBusinessWithOwnerInvite({
      ownerEmail,
      contactName: contactName || null,
      businessName,
      solutionMode,
      businessVertical: normalizeBusinessVertical(String(formData.get("businessVertical") ?? "")),
      twilioNumber: String(formData.get("twilioNumber") ?? "").trim() || null,
      callbackNumber: String(formData.get("callbackNumber") ?? "").trim() || null,
      callRoutingMode: normalizeServiceCallRoutingMode(
        String(formData.get("callRoutingMode") ?? "")
      ),
      origin: new URL(request.url).origin
    });

    return NextResponse.redirect(
      new URL(
        `/admin/businesses/${createdBusiness.businessId}?notice=Business%20created%20and%20owner%20invite%20sent.`,
        request.url
      )
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to create the business right now.";

    return NextResponse.redirect(
      new URL(`/admin?error=${encodeURIComponent(message)}`, request.url)
    );
  }
}
