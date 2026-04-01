export const CALL_RECORDINGS_BUCKET = "call-recordings";
export const MAX_AUDIO_UPLOAD_BYTES = 50 * 1024 * 1024;
export const ACCEPTED_AUDIO_EXTENSIONS = [".mp3", ".wav", ".m4a"] as const;
export const ACCEPTED_AUDIO_MIME_TYPES = [
  "audio/mpeg",
  "audio/wav",
  "audio/x-wav",
  "audio/mp4",
  "audio/m4a"
] as const;

export type UploadFailureReason =
  | "missing_bucket"
  | "permission_denied"
  | "wrong_path"
  | "route_failure"
  | "file_validation"
  | "missing_service_role"
  | "unknown";

export function getAudioFileExtension(fileName: string) {
  const lastDotIndex = fileName.lastIndexOf(".");
  return lastDotIndex >= 0 ? fileName.slice(lastDotIndex).toLowerCase() : "";
}

export function getAudioMimeType(fileName: string, providedType?: string | null) {
  if (providedType) {
    return providedType.toLowerCase();
  }

  const extension = getAudioFileExtension(fileName);

  if (extension === ".mp3") return "audio/mpeg";
  if (extension === ".wav") return "audio/wav";
  if (extension === ".m4a") return "audio/m4a";

  return "";
}

export function isSupportedAudioFile(fileName: string, providedType?: string | null) {
  const extension = getAudioFileExtension(fileName);
  const mimeType = getAudioMimeType(fileName, providedType);

  return (
    ACCEPTED_AUDIO_EXTENSIONS.includes(extension as (typeof ACCEPTED_AUDIO_EXTENSIONS)[number]) &&
    ACCEPTED_AUDIO_MIME_TYPES.includes(mimeType as (typeof ACCEPTED_AUDIO_MIME_TYPES)[number])
  );
}

export function classifyUploadFailure(message: string): UploadFailureReason {
  const normalized = message.toLowerCase();

  if (normalized.includes("supabase_service_role_key")) {
    return "missing_service_role";
  }

  if (normalized.includes("bucket") && (normalized.includes("not found") || normalized.includes("does not exist"))) {
    return "missing_bucket";
  }

  if (
    normalized.includes("permission") ||
    normalized.includes("not authorized") ||
    normalized.includes("access denied") ||
    normalized.includes("row-level security")
  ) {
    return "permission_denied";
  }

  if (normalized.includes("path") || normalized.includes("object not found")) {
    return "wrong_path";
  }

  if (
    normalized.includes("unsupported") ||
    normalized.includes("invalid mime") ||
    normalized.includes("file validation") ||
    normalized.includes("exceeds the 50 mb") ||
    normalized.includes("too large")
  ) {
    return "file_validation";
  }

  if (
    normalized.includes("failed to fetch") ||
    normalized.includes("network") ||
    normalized.includes("route returned") ||
    normalized.includes("server")
  ) {
    return "route_failure";
  }

  return "unknown";
}

export function formatUploadFailure(message: string) {
  const reason = classifyUploadFailure(message);

  switch (reason) {
    case "missing_service_role":
      return {
        reason,
        message: `Server upload configuration is incomplete. ${message}`
      };
    case "missing_bucket":
      return {
        reason,
        message: `Supabase Storage bucket "${CALL_RECORDINGS_BUCKET}" is missing. ${message}`
      };
    case "permission_denied":
      return {
        reason,
        message: `Supabase Storage permissions blocked the upload. ${message}`
      };
    case "wrong_path":
      return {
        reason,
        message: `The storage path could not be resolved correctly. ${message}`
      };
    case "route_failure":
      return {
        reason,
        message: `The upload route failed before Supabase finished the upload. ${message}`
      };
    case "file_validation":
      return {
        reason,
        message: message.startsWith("File validation failed") ? message : `File validation failed. ${message}`
      };
    default:
      return {
        reason,
        message
      };
  }
}
