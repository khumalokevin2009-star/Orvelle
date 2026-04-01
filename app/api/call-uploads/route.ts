import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { buildCallInsertFromProviderPayload } from "@/lib/call-ingestion";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  ACCEPTED_AUDIO_EXTENSIONS,
  ACCEPTED_AUDIO_MIME_TYPES,
  CALL_RECORDINGS_BUCKET,
  MAX_AUDIO_UPLOAD_BYTES,
  formatUploadFailure,
  getAudioMimeType,
  isSupportedAudioFile
} from "@/lib/call-uploads";
import { type CallProviderPayload } from "@/providers/types";

const defaultCallerName = "Unknown Caller";
const defaultCallerPhone = "Phone number placeholder";
const defaultAssignedOwner = "unassigned";
const defaultSourceSystem = "manual_upload";

type PrepareUploadFile = {
  clientId: string;
  fileName: string;
  fileSize: number;
  contentType?: string | null;
};

type FinalizeUploadFile = {
  clientId: string;
  fileName: string;
  storagePath: string;
};

function buildManualUploadProviderPayload(upload: FinalizeUploadFile): CallProviderPayload {
  return {
    phone_number: defaultCallerPhone,
    timestamp: new Date().toISOString(),
    duration: 0,
    answered: true,
    recording_url: `${CALL_RECORDINGS_BUCKET}/${upload.storagePath}`,
    external_call_id: `manual-upload:${upload.storagePath}`,
    provider: defaultSourceSystem
  };
}

function sanitizeFileName(fileName: string) {
  return fileName
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function getStoragePath(fileName: string) {
  const now = new Date();
  const year = String(now.getUTCFullYear());
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");

  return `${year}/${month}/${day}/${crypto.randomUUID()}-${sanitizeFileName(fileName)}`;
}

async function ensureBucketExists(supabase: ReturnType<typeof createAdminClient>) {
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();

  if (listError) {
    throw new Error(`Unable to verify Supabase storage buckets: ${listError.message}`);
  }

  const bucketExists = (buckets ?? []).some(
    (bucket) => bucket.id === CALL_RECORDINGS_BUCKET || bucket.name === CALL_RECORDINGS_BUCKET
  );

  if (bucketExists) {
    return;
  }

  const { error: createError } = await supabase.storage.createBucket(CALL_RECORDINGS_BUCKET, {
    public: false,
    allowedMimeTypes: [...ACCEPTED_AUDIO_MIME_TYPES],
    fileSizeLimit: MAX_AUDIO_UPLOAD_BYTES
  });

  if (createError && !createError.message.toLowerCase().includes("already exists")) {
    throw new Error(
      `Unable to create the Supabase storage bucket "${CALL_RECORDINGS_BUCKET}": ${createError.message}`
    );
  }
}

function validateUploadFile(file: PrepareUploadFile) {
  if (!file.fileName) {
    return formatUploadFailure("File validation failed: a file name is required.");
  }

  if (!isSupportedAudioFile(file.fileName, file.contentType)) {
    return formatUploadFailure(
      `File validation failed: unsupported type. Accepted formats: ${ACCEPTED_AUDIO_EXTENSIONS.join(", ")}.`
    );
  }

  if (!Number.isFinite(file.fileSize) || file.fileSize <= 0) {
    return formatUploadFailure("File validation failed: the selected file is empty or invalid.");
  }

  if (file.fileSize > MAX_AUDIO_UPLOAD_BYTES) {
    return formatUploadFailure(
      `File validation failed: "${file.fileName}" exceeds the 50 MB upload limit.`
    );
  }

  return null;
}

async function handlePrepareUploads(
  supabase: ReturnType<typeof createAdminClient>,
  files: PrepareUploadFile[]
) {
  const results = await Promise.all(
    files.map(async (file, index) => {
      const clientId = file.clientId || `${file.fileName}-${index}`;
      const validationFailure = validateUploadFile(file);

      if (validationFailure) {
        console.warn("[call-uploads] File validation blocked upload preparation.", {
          clientId,
          fileName: file.fileName,
          reason: validationFailure.reason,
          message: validationFailure.message
        });

        return {
          clientId,
          ok: false,
          error: validationFailure.message,
          reason: validationFailure.reason
        };
      }

      const storagePath = getStoragePath(file.fileName);

      try {
        const { data, error } = await supabase.storage
          .from(CALL_RECORDINGS_BUCKET)
          .createSignedUploadUrl(storagePath);

        if (error || !data?.token) {
          throw new Error(error?.message || "Supabase did not return a signed upload token.");
        }

        return {
          clientId,
          ok: true,
          bucketName: CALL_RECORDINGS_BUCKET,
          storagePath,
          signedUrl: data.signedUrl,
          token: data.token,
          contentType: getAudioMimeType(file.fileName, file.contentType)
        };
      } catch (error) {
        const failure = formatUploadFailure(
          error instanceof Error
            ? error.message
            : "Unable to prepare a signed Supabase Storage upload."
        );

        console.error("[call-uploads] Failed to create signed upload URL.", {
          clientId,
          fileName: file.fileName,
          storagePath,
          reason: failure.reason,
          message: failure.message
        });

        return {
          clientId,
          ok: false,
          error: failure.message,
          reason: failure.reason
        };
      }
    })
  );

  const successCount = results.filter((result) => result.ok).length;
  const failureCount = results.length - successCount;

  return NextResponse.json(
    {
      message:
        successCount === 0
          ? "Supabase upload preparation failed for every selected file."
          : failureCount === 0
            ? `${successCount} upload${successCount === 1 ? "" : "s"} prepared successfully.`
            : `${successCount} upload${successCount === 1 ? "" : "s"} prepared successfully and ${failureCount} failed validation.`,
      results
    },
    { status: successCount === 0 ? 400 : 200 }
  );
}

async function handleFinalizeUploads(
  supabase: ReturnType<typeof createAdminClient>,
  uploads: FinalizeUploadFile[]
) {
  const results = await Promise.all(
    uploads.map(async (upload, index) => {
      const clientId = upload.clientId || `${upload.fileName}-${index}`;

      if (!upload.storagePath) {
        const failure = formatUploadFailure("The storage path was missing during upload finalization.");
        console.error("[call-uploads] Missing storage path during finalization.", {
          clientId,
          fileName: upload.fileName,
          reason: failure.reason
        });

        return {
          clientId,
          ok: false,
          error: failure.message,
          reason: failure.reason
        };
      }

      try {
        const providerPayload = buildManualUploadProviderPayload(upload);
        const { data: insertedCall, error: insertError } = await supabase
          .from("calls")
          .insert(
            buildCallInsertFromProviderPayload(providerPayload, {
              callerName: defaultCallerName,
              assignedOwner: defaultAssignedOwner,
              recordingFileName: upload.fileName
            })
          )
          .select("id")
          .single();

        if (insertError) {
          await supabase.storage.from(CALL_RECORDINGS_BUCKET).remove([upload.storagePath]);
          throw new Error(insertError.message);
        }

        return {
          clientId,
          ok: true,
          callId: insertedCall.id as string,
          storagePath: `${CALL_RECORDINGS_BUCKET}/${upload.storagePath}`
        };
      } catch (error) {
        const failure = formatUploadFailure(
          error instanceof Error
            ? error.message
            : "Unable to create a call record after the Supabase upload completed."
        );

        console.error("[call-uploads] Failed to finalize uploaded call recording.", {
          clientId,
          fileName: upload.fileName,
          storagePath: upload.storagePath,
          reason: failure.reason,
          message: failure.message
        });

        return {
          clientId,
          ok: false,
          error: failure.message,
          reason: failure.reason
        };
      }
    })
  );

  const successCount = results.filter((result) => result.ok).length;
  const failureCount = results.length - successCount;

  return NextResponse.json(
    {
      message:
        successCount === 0
          ? "The upload failed before a call record could be created."
          : failureCount === 0
            ? `${successCount} call recording${successCount === 1 ? "" : "s"} uploaded successfully.`
            : `${successCount} call recording${successCount === 1 ? "" : "s"} uploaded successfully and ${failureCount} failed.`,
      results
    },
    { status: successCount === 0 ? 500 : 200 }
  );
}

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();

  if (!user) {
    return NextResponse.json(
      {
        message: "Authentication required.",
        results: []
      },
      { status: 401 }
    );
  }

  let supabase;

  try {
    supabase = createAdminClient();
  } catch (error) {
    const failure = formatUploadFailure(
      error instanceof Error
        ? error.message
        : "Unable to initialize the Supabase admin client."
    );

    console.error("[call-uploads] Failed to initialize Supabase admin client.", {
      reason: failure.reason,
      message: failure.message
    });

    return NextResponse.json(
      {
        message: failure.message,
        results: []
      },
      { status: 500 }
    );
  }

  try {
    await ensureBucketExists(supabase);
  } catch (error) {
    const failure = formatUploadFailure(
      error instanceof Error
        ? error.message
        : `Unable to prepare the Supabase storage bucket "${CALL_RECORDINGS_BUCKET}".`
    );

    console.error("[call-uploads] Failed to prepare Supabase storage bucket.", {
      bucketName: CALL_RECORDINGS_BUCKET,
      reason: failure.reason,
      message: failure.message
    });

    return NextResponse.json(
      {
        message: failure.message,
        results: []
      },
      { status: 500 }
    );
  }

  const requestContentType = request.headers.get("content-type") ?? "";

  if (!requestContentType.includes("application/json")) {
    const failure = formatUploadFailure(
      "The upload route expected JSON metadata, but received a raw multipart file body instead."
    );

    console.error("[call-uploads] Unsupported upload request shape.", {
      reason: failure.reason,
      contentType: requestContentType
    });

    return NextResponse.json(
      {
        message: failure.message,
        results: []
      },
      { status: 415 }
    );
  }

  const payload = (await request.json()) as
    | {
        action: "prepare";
        files: PrepareUploadFile[];
      }
    | {
        action: "finalize";
        uploads: FinalizeUploadFile[];
      };

  if (payload.action === "prepare") {
    const files = Array.isArray(payload.files) ? payload.files : [];

    if (files.length === 0) {
      return NextResponse.json(
        {
          message: "No audio files were submitted for upload preparation.",
          results: []
        },
        { status: 400 }
      );
    }

    return handlePrepareUploads(supabase, files);
  }

  if (payload.action === "finalize") {
    const uploads = Array.isArray(payload.uploads) ? payload.uploads : [];

    if (uploads.length === 0) {
      return NextResponse.json(
        {
          message: "No uploaded files were provided for call record finalization.",
          results: []
        },
        { status: 400 }
      );
    }

    return handleFinalizeUploads(supabase, uploads);
  }

  return NextResponse.json(
    {
      message: "Unsupported upload action.",
      results: []
    },
    { status: 400 }
  );
}
