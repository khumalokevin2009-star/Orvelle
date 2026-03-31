import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const bucketName = "call-recordings";
const defaultCallerName = "Unknown Caller";
const defaultCallerPhone = "Phone number placeholder";
const defaultAssignedOwner = "unassigned";
const defaultSourceSystem = "manual_upload";

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

  const bucketExists = (buckets ?? []).some((bucket) => bucket.id === bucketName || bucket.name === bucketName);

  if (bucketExists) {
    return;
  }

  const { error: createError } = await supabase.storage.createBucket(bucketName, {
    public: false,
    allowedMimeTypes: ["audio/mpeg", "audio/wav", "audio/x-wav", "audio/mp4", "audio/m4a"],
    fileSizeLimit: 52428800
  });

  if (createError && !createError.message.toLowerCase().includes("already exists")) {
    throw new Error(`Unable to create the Supabase storage bucket "${bucketName}": ${createError.message}`);
  }
}

export async function POST(request: Request) {
  let supabase;

  try {
    supabase = createAdminClient();
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Unable to initialize the Supabase admin client.",
        results: []
      },
      { status: 500 }
    );
  }

  try {
    await ensureBucketExists(supabase);
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : `Unable to prepare the Supabase storage bucket "${bucketName}".`,
        results: []
      },
      { status: 500 }
    );
  }

  const formData = await request.formData();
  const files = formData
    .getAll("files")
    .filter((entry): entry is File => entry instanceof File);
  const clientIds = formData
    .getAll("clientIds")
    .map((value) => String(value));

  if (files.length === 0) {
    return NextResponse.json(
      {
        message: "No audio files were submitted for upload.",
        results: []
      },
      { status: 400 }
    );
  }

  const results = await Promise.all(
    files.map(async (file, index) => {
      const clientId = clientIds[index] ?? `${file.name}-${index}`;
      const storagePath = getStoragePath(file.name);

      try {
        const fileBuffer = Buffer.from(await file.arrayBuffer());
        const { error: storageError } = await supabase.storage
          .from(bucketName)
          .upload(storagePath, fileBuffer, {
            contentType: file.type || undefined,
            upsert: false
          });

        if (storageError) {
          throw new Error(storageError.message);
        }

        const startedAt = new Date().toISOString();

        const { data: insertedCall, error: insertError } = await supabase
          .from("calls")
          .insert({
            caller_name: defaultCallerName,
            caller_phone: defaultCallerPhone,
            direction: "inbound",
            started_at: startedAt,
            ended_at: null,
            audio_url: `${bucketName}/${storagePath}`,
            recording_filename: file.name,
            source_system: defaultSourceSystem,
            assigned_owner: defaultAssignedOwner,
            status: "action_required",
            revenue_estimate: 0,
            currency_code: "GBP"
          })
          .select("id")
          .single();

        if (insertError) {
          await supabase.storage.from(bucketName).remove([storagePath]);
          throw new Error(insertError.message);
        }

        return {
          clientId,
          ok: true,
          callId: insertedCall.id as string,
          storagePath: `${bucketName}/${storagePath}`
        };
      } catch (error) {
        return {
          clientId,
          ok: false,
          error:
            error instanceof Error
              ? error.message
              : "Unable to upload the file and create a call record."
        };
      }
    })
  );

  const successCount = results.filter((result) => result.ok).length;
  const failureCount = results.length - successCount;

  if (successCount === 0) {
    return NextResponse.json(
      {
        message:
          failureCount === 1
            ? "The upload failed before a call record could be created."
            : "All uploads failed before call records could be created.",
        results
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    message:
      failureCount === 0
        ? `${successCount} call recording${successCount === 1 ? "" : "s"} uploaded successfully.`
        : `${successCount} call recording${successCount === 1 ? "" : "s"} uploaded successfully and ${failureCount} failed.`,
    results
  });
}
