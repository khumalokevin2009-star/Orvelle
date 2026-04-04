import "server-only";

import {
  ACCEPTED_AUDIO_MIME_TYPES,
  CALL_RECORDINGS_BUCKET,
  MAX_AUDIO_UPLOAD_BYTES
} from "@/lib/call-uploads";
import { createAdminClient } from "@/lib/supabase/admin";

type SupabaseAdminClient = ReturnType<typeof createAdminClient>;

function sanitizeFileName(fileName: string) {
  return fileName
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function getTwilioVoiceAuthEnv() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();

  if (!accountSid || !authToken) {
    return null;
  }

  return {
    accountSid,
    authToken
  };
}

function isSupabaseStorageAudioReference(audioUrl: string) {
  const normalized = audioUrl.trim();
  return (
    normalized.startsWith(`${CALL_RECORDINGS_BUCKET}/`) ||
    normalized.includes(`/object/public/${CALL_RECORDINGS_BUCKET}/`) ||
    normalized.includes(`/object/authenticated/${CALL_RECORDINGS_BUCKET}/`) ||
    normalized.includes(`/object/sign/${CALL_RECORDINGS_BUCKET}/`)
  );
}

function ensureExtension(fileName: string, extension: string) {
  return fileName.toLowerCase().endsWith(extension) ? fileName : `${fileName}${extension}`;
}

function deriveRecordingExtension(contentType: string | null, recordingUrl: string) {
  if (contentType?.toLowerCase().includes("mpeg")) {
    return ".mp3";
  }

  if (contentType?.toLowerCase().includes("wav")) {
    return ".wav";
  }

  if (recordingUrl.toLowerCase().endsWith(".wav")) {
    return ".wav";
  }

  return ".mp3";
}

function buildStoragePath(callSid: string, fileName: string) {
  const now = new Date();
  const year = String(now.getUTCFullYear());
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");
  return `twilio/${year}/${month}/${day}/${sanitizeFileName(callSid)}-${sanitizeFileName(fileName)}`;
}

async function ensureCallRecordingsBucketExists(supabase: SupabaseAdminClient) {
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

export function getTwilioRecordingFileName(recordingUrl?: string | null) {
  const lastSegment = recordingUrl?.split("/").pop()?.trim();

  if (!lastSegment) {
    return null;
  }

  return lastSegment.includes(".") ? lastSegment : `${lastSegment}.mp3`;
}

export async function storeTwilioRecordingInSupabase({
  supabase,
  recordingUrl,
  callSid,
  preferredFileName
}: {
  supabase: SupabaseAdminClient;
  recordingUrl: string;
  callSid: string;
  preferredFileName?: string | null;
}) {
  const normalizedRecordingUrl = recordingUrl.trim();

  if (!normalizedRecordingUrl) {
    throw new Error("Twilio recording storage requires a recording URL.");
  }

  if (isSupabaseStorageAudioReference(normalizedRecordingUrl)) {
    return {
      audioUrl: normalizedRecordingUrl,
      recordingFileName:
        preferredFileName?.trim() || getTwilioRecordingFileName(normalizedRecordingUrl)
    };
  }

  const twilioEnv = getTwilioVoiceAuthEnv();

  if (!twilioEnv) {
    throw new Error(
      "TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN are required to store captured Twilio recordings."
    );
  }

  const downloadUrl =
    normalizedRecordingUrl.toLowerCase().endsWith(".mp3") ||
    normalizedRecordingUrl.toLowerCase().endsWith(".wav")
      ? normalizedRecordingUrl
      : `${normalizedRecordingUrl}.mp3`;
  const authorization = Buffer.from(
    `${twilioEnv.accountSid}:${twilioEnv.authToken}`
  ).toString("base64");

  const response = await fetch(downloadUrl, {
    method: "GET",
    headers: {
      Authorization: `Basic ${authorization}`
    }
  });

  if (!response.ok) {
    throw new Error(
      `Twilio recording download failed with status ${response.status}.`
    );
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  const contentType = response.headers.get("content-type");
  const extension = deriveRecordingExtension(contentType, downloadUrl);
  const recordingFileName = ensureExtension(
    preferredFileName?.trim() || getTwilioRecordingFileName(normalizedRecordingUrl) || callSid,
    extension
  );

  await ensureCallRecordingsBucketExists(supabase);

  const storagePath = buildStoragePath(callSid, recordingFileName);
  const { error: uploadError } = await supabase.storage
    .from(CALL_RECORDINGS_BUCKET)
    .upload(storagePath, bytes, {
      upsert: true,
      contentType:
        contentType && ACCEPTED_AUDIO_MIME_TYPES.includes(contentType as (typeof ACCEPTED_AUDIO_MIME_TYPES)[number])
          ? contentType
          : extension === ".wav"
            ? "audio/wav"
            : "audio/mpeg"
    });

  if (uploadError) {
    throw new Error(uploadError.message || "Unable to upload the Twilio recording to Supabase Storage.");
  }

  return {
    audioUrl: `${CALL_RECORDINGS_BUCKET}/${storagePath}`,
    recordingFileName
  };
}
