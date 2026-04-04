import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { getCurrentBusinessAccount } from "@/lib/business-account";
import {
  getMissedCallRecoverySettings,
  normalizeMissedCallRecoverySettings,
  updateMissedCallRecoverySettingsByBusinessId,
  validateMissedCallRecoverySettings
} from "@/lib/missed-call-recovery-settings";
import type { ServiceCallRoutingMode } from "@/lib/service-call-routing-mode";
import type { BusinessVertical, SolutionMode } from "@/lib/solution-mode";

export async function GET() {
  const user = await getAuthenticatedUser();

  if (!user) {
    return NextResponse.json(
      {
        message: "Authentication required."
      },
      { status: 401 }
    );
  }

  try {
    const businessAccount = await getCurrentBusinessAccount();

    if (!businessAccount) {
      return NextResponse.json(
        {
          message: "Business context is required."
        },
        { status: 403 }
      );
    }

    const settings = await getMissedCallRecoverySettings(businessAccount.businessId);

    return NextResponse.json({
      settings
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Unable to load missed call recovery settings."
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();

  if (!user) {
    return NextResponse.json(
      {
        message: "Authentication required."
      },
      { status: 401 }
    );
  }

  const businessAccount = await getCurrentBusinessAccount();

  if (!businessAccount) {
    return NextResponse.json(
      {
        message: "Business context is required."
      },
      { status: 403 }
    );
  }

  const payload = (await request.json().catch(() => null)) as
    | {
        settings?: Partial<{
          businessName: string;
          solutionMode: SolutionMode;
          businessVertical: BusinessVertical;
          twilioNumber: string;
          callRoutingMode: ServiceCallRoutingMode;
          callbackNumber: string;
          defaultCallbackWindow: string;
          businessHours: string;
          autoFollowUpEnabled: boolean;
          smsTemplate: string;
        }>;
      }
    | null;

  if (!payload?.settings) {
    return NextResponse.json(
      {
        message: "Settings payload is required."
      },
      { status: 400 }
    );
  }

  const nextSettings = normalizeMissedCallRecoverySettings(payload.settings);
  const validationErrors = validateMissedCallRecoverySettings(nextSettings);

  if (validationErrors.length > 0) {
    return NextResponse.json(
      {
        message: validationErrors[0],
        errors: validationErrors
      },
      { status: 400 }
    );
  }

  try {
    const settings = await updateMissedCallRecoverySettingsByBusinessId({
      businessId: businessAccount.businessId,
      settings: nextSettings
    });

    return NextResponse.json({
      message: "Missed call recovery settings saved.",
      settings
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Unable to save missed call recovery settings."
      },
      { status: 500 }
    );
  }
}
