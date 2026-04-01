"use client";

import { ChangeEvent, DragEvent, useEffect, useRef, useState } from "react";
import { AudioFileIcon, TrashIcon, UploadIcon } from "@/components/icons";
import { createClient } from "@/lib/supabase/client";
import {
  ACCEPTED_AUDIO_EXTENSIONS,
  CALL_RECORDINGS_BUCKET,
  MAX_AUDIO_UPLOAD_BYTES,
  formatUploadFailure,
  getAudioFileExtension,
  getAudioMimeType,
  isSupportedAudioFile,
  type UploadFailureReason
} from "@/lib/call-uploads";

type UploadStatus = "Uploading" | "Ready for analysis" | "Queued for analysis" | "Upload failed";

type UploadedCallFile = {
  id: string;
  name: string;
  extension: string;
  size: number;
  status: UploadStatus;
  file: File;
  callId?: string;
  storagePath?: string;
  failureReason?: UploadFailureReason;
  errorMessage?: string;
};

function formatFileSize(size: number) {
  if (size < 1024 * 1024) {
    return `${Math.max(1, Math.round(size / 1024))} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

type UploadApiResult = {
  clientId: string;
  ok: boolean;
  callId?: string;
  storagePath?: string;
  bucketName?: string;
  token?: string;
  contentType?: string;
  reason?: UploadFailureReason;
  error?: string;
};

async function readUploadResponse(response: Response) {
  const responseText = await response.text();

  if (!responseText) {
    return {} as { message?: string; results?: UploadApiResult[] };
  }

  try {
    return JSON.parse(responseText) as { message?: string; results?: UploadApiResult[] };
  } catch {
    throw new Error(
      `Upload route returned HTTP ${response.status} ${response.statusText} instead of JSON.`
    );
  }
}

function getStatusStyles(status: UploadStatus) {
  switch (status) {
    case "Uploading":
      return "border-[#E5E7EB] bg-[#F9FAFB] text-[#111827]";
    case "Upload failed":
      return "border-[#3F1D2B] bg-[#2B1220] text-[#FCA5A5]";
    case "Queued for analysis":
      return "border-[#E5E7EB] bg-[#F9FAFB] text-[#111827]";
    case "Ready for analysis":
    default:
      return "border-[#E5E7EB] bg-[#F9FAFB] text-[#111827]";
  }
}

export function CallDataUploadPanel() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const timeoutsRef = useRef<number[]>([]);
  const [isDragActive, setIsDragActive] = useState(false);
  const [files, setFiles] = useState<UploadedCallFile[]>([]);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [feedbackTone, setFeedbackTone] = useState<"neutral" | "success" | "error">("neutral");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    };
  }, []);

  function queueFiles(fileList: FileList | File[]) {
    const incomingFiles = Array.from(fileList);
    const validFiles = incomingFiles.filter(
      (file) =>
        isSupportedAudioFile(file.name, file.type) &&
        file.size > 0 &&
        file.size <= MAX_AUDIO_UPLOAD_BYTES
    );
    const rejectedFiles = incomingFiles.filter((file) => !validFiles.includes(file));

    if (rejectedFiles.length > 0) {
      setFeedbackTone("error");
      setFeedbackMessage(
        `Unsupported or oversized files were excluded. Accepted formats: ${ACCEPTED_AUDIO_EXTENSIONS.join(", ")} up to 50 MB.`
      );
    } else {
      setFeedbackTone("neutral");
      setFeedbackMessage(null);
    }

    if (validFiles.length === 0) {
      return;
    }

    const preparedFiles = validFiles.map((file, index) => {
      const id = `${file.name}-${file.size}-${Date.now()}-${index}`;

      const timeoutId = window.setTimeout(() => {
        setFiles((current) =>
          current.map((entry) =>
            entry.id === id ? { ...entry, status: "Ready for analysis" } : entry
          )
        );
      }, 700 + index * 180);

      timeoutsRef.current.push(timeoutId);

      return {
        id,
        name: file.name,
        extension: getAudioFileExtension(file.name),
        size: file.size,
        status: "Uploading" as const,
        file
      };
    });

    setFiles((current) => [...preparedFiles, ...current]);
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files) {
      queueFiles(event.target.files);
      event.target.value = "";
    }
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragActive(true);
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragActive(false);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragActive(false);
    queueFiles(event.dataTransfer.files);
  }

  function handleRemoveFile(fileId: string) {
    setFiles((current) => {
      const fileToRemove = current.find((file) => file.id === fileId);

      if (fileToRemove?.callId) {
        setFeedbackTone("neutral");
        setFeedbackMessage(
          `${fileToRemove.name} was removed from the local upload list. The stored call record remains available in Supabase.`
        );
      }

      return current.filter((file) => file.id !== fileId);
    });
  }

  async function handleAnalyzeCalls() {
    const filesToUpload = files.filter((file) => file.status === "Ready for analysis");

    if (filesToUpload.length === 0 || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setFeedbackTone("neutral");
    setFeedbackMessage(
      `${filesToUpload.length} call recording${filesToUpload.length === 1 ? "" : "s"} uploading to Supabase.`
    );

    setFiles((current) =>
      current.map((file) =>
        file.status === "Ready for analysis"
          ? { ...file, status: "Uploading", errorMessage: undefined }
          : file
      )
    );

    try {
      const supabase = createClient();
      const prepareResponse = await fetch("/api/call-uploads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          action: "prepare",
          files: filesToUpload.map((file) => ({
            clientId: file.id,
            fileName: file.name,
            fileSize: file.size,
            contentType: file.file.type || getAudioMimeType(file.name)
          }))
        })
      });

      const preparePayload = await readUploadResponse(prepareResponse);
      const prepareResults = preparePayload.results ?? [];
      const successfulPreparations = prepareResults.filter((result) => result.ok && result.storagePath && result.token);
      const uploadResults = await Promise.all(
        successfulPreparations.map(async (result) => {
          const matchingFile = filesToUpload.find((file) => file.id === result.clientId);

          if (!matchingFile || !result.storagePath || !result.token) {
            const failure = formatUploadFailure("The upload route returned incomplete signed upload data.");
            console.error("[call-data-upload-panel] Missing signed upload payload.", {
              clientId: result.clientId,
              reason: failure.reason
            });

            return {
              clientId: result.clientId,
              ok: false,
              error: failure.message,
              reason: failure.reason
            } satisfies UploadApiResult;
          }

          const { error } = await supabase.storage
            .from(result.bucketName ?? CALL_RECORDINGS_BUCKET)
            .uploadToSignedUrl(result.storagePath, result.token, matchingFile.file, {
              contentType: result.contentType || matchingFile.file.type || getAudioMimeType(matchingFile.name),
              upsert: false
            });

          if (error) {
            const failure = formatUploadFailure(error.message);
            console.error("[call-data-upload-panel] Direct Supabase Storage upload failed.", {
              clientId: result.clientId,
              storagePath: result.storagePath,
              reason: failure.reason,
              message: failure.message
            });

            return {
              clientId: result.clientId,
              ok: false,
              error: failure.message,
              reason: failure.reason
            } satisfies UploadApiResult;
          }

          return {
            clientId: result.clientId,
            ok: true,
            storagePath: result.storagePath
          } satisfies UploadApiResult;
        })
      );

      const successfulUploads = uploadResults.filter((result) => result.ok && result.storagePath);
      let finalizeResults: UploadApiResult[] = [];
      let finalizeMessage = "";
      let finalizeStatusOk = true;

      if (successfulUploads.length > 0) {
        const finalizeResponse = await fetch("/api/call-uploads", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            action: "finalize",
            uploads: successfulUploads.map((result) => {
              const matchingFile = filesToUpload.find((file) => file.id === result.clientId);

              return {
                clientId: result.clientId,
                fileName: matchingFile?.name ?? "uploaded-file",
                storagePath: result.storagePath
              };
            })
          })
        });

        const finalizePayload = await readUploadResponse(finalizeResponse);
        finalizeResults = finalizePayload.results ?? [];
        finalizeMessage = finalizePayload.message ?? "";
        finalizeStatusOk = finalizeResponse.ok;
      }

      const resultMap = new Map<string, UploadApiResult>();
      prepareResults.forEach((result) => {
        if (!result.ok) {
          resultMap.set(result.clientId, result);
        }
      });
      uploadResults.forEach((result) => {
        if (!result.ok) {
          resultMap.set(result.clientId, result);
        }
      });
      finalizeResults.forEach((result) => {
        resultMap.set(result.clientId, result);
      });

      setFiles((current) =>
        current.map((file) => {
          const result = resultMap.get(file.id);

          if (!result) {
            return file;
          }

          if (result.ok) {
            return {
              ...file,
              status: "Queued for analysis",
              callId: result.callId,
              storagePath: result.storagePath,
              failureReason: undefined,
              errorMessage: undefined
            };
          }

          return {
            ...file,
            status: "Upload failed",
            failureReason: result.reason,
            errorMessage: result.error ?? "Unable to upload this call recording."
          };
        })
      );

      const successCount = finalizeResults.filter((result) => result.ok).length;
      const failureCount = filesToUpload.length - successCount;

      if (!prepareResponse.ok && successCount === 0) {
        setFeedbackTone("error");
        setFeedbackMessage(
          preparePayload.message ?? "Supabase upload preparation failed."
        );
      } else if (!finalizeStatusOk && successCount === 0 && finalizeMessage) {
        setFeedbackTone("error");
        setFeedbackMessage(finalizeMessage);
      } else if (failureCount === 0) {
        setFeedbackTone("success");
        setFeedbackMessage(
          `${successCount} call recording${successCount === 1 ? "" : "s"} uploaded and registered in the calls table.`
        );
      } else {
        setFeedbackTone("error");
        setFeedbackMessage(
          `${successCount} upload${successCount === 1 ? "" : "s"} completed and ${failureCount} failed. Review the file list for details.`
        );
      }
    } catch (error) {
      const failure = formatUploadFailure(
        error instanceof Error
          ? error.message
          : "Connection failed before Supabase upload completed."
      );

      console.error("[call-data-upload-panel] Upload flow failed before completion.", {
        reason: failure.reason,
        message: failure.message
      });

      setFiles((current) =>
        current.map((file) =>
          filesToUpload.some((candidate) => candidate.id === file.id)
            ? {
                ...file,
                status: "Upload failed",
                failureReason: failure.reason,
                errorMessage: failure.message
              }
            : file
        )
      );
      setFeedbackTone("error");
      setFeedbackMessage(failure.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  const feedbackClasses =
    feedbackTone === "success"
      ? "border-[#E5E7EB] bg-[#F9FAFB] text-[#111827]"
      : feedbackTone === "error"
        ? "border-[#3F1D2B] bg-[#2B1220] text-[#FCA5A5]"
        : "border-[#E5E7EB] bg-[#FFFFFF] text-[#6B7280]";

  const readyCount = files.filter((file) => file.status === "Ready for analysis").length;
  const queuedCount = files.filter((file) => file.status === "Queued for analysis").length;

  return (
    <section className="surface-primary motion-fade-up motion-delay-1 p-6">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`cursor-pointer rounded-[12px] border border-dashed px-6 py-10 text-center transition ${
          isDragActive
            ? "border-[#2563EB] bg-[#F9FAFB]"
            : "border-[#E5E7EB] bg-transparent hover:border-[#D1D5DB] hover:bg-[#F9FAFB]"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".mp3,.wav,.m4a,audio/mpeg,audio/wav,audio/x-wav,audio/mp4,audio/m4a"
          multiple
          className="hidden"
          onChange={handleInputChange}
        />

        <div className="inline-flex h-14 w-14 items-center justify-center rounded-[18px] border border-[#E5E7EB] bg-[#FFFFFF] text-[#111827]">
          <UploadIcon className="h-7 w-7" />
        </div>
        <h2 className="type-page-title mt-5 text-[24px]">
          Upload Call Data
        </h2>
        <p className="type-body-text mt-2 max-w-[560px] text-[14px]">
          Drag and drop recent call recordings here, or select multiple files for upload and
          analysis preparation.
        </p>
        <div className="button-primary-accent mt-5 inline-flex items-center justify-center px-5 py-3 text-[14px] transition hover:bg-[#1D4ED8] hover:border-[#1D4ED8]">
          Select Files
        </div>
        <p className="type-label-text mt-4 text-[12px]">
          Accepted audio formats: {ACCEPTED_AUDIO_EXTENSIONS.join(", ")}
        </p>
      </div>

      {feedbackMessage ? (
        <div
          aria-live="polite"
          className={`mt-4 rounded-[16px] border px-4 py-3 text-[13px] ${feedbackClasses}`}
        >
          {feedbackMessage}
        </div>
      ) : null}

      <div className="surface-plain mt-5">
        <div className="flex flex-col gap-3 border-b border-[#E5E7EB] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="type-section-title text-[17px]">
              Uploaded Recordings
            </h3>
            <p className="type-body-text mt-1 text-[13px]">
              {files.length === 0
                ? "No call recordings have been added to the upload queue."
                : `${files.length} file${files.length === 1 ? "" : "s"} in queue${
                    readyCount > 0 ? ` • ${readyCount} ready for analysis` : ""
                  }${queuedCount > 0 ? ` • ${queuedCount} stored in Supabase` : ""}`}
            </p>
          </div>

          <button
            type="button"
            onClick={handleAnalyzeCalls}
            disabled={readyCount === 0 || isSubmitting}
            className="button-primary-accent inline-flex cursor-pointer items-center justify-center px-4 py-2.5 text-[14px] transition hover:bg-[#1D4ED8] hover:border-[#1D4ED8] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] disabled:cursor-not-allowed disabled:border-[#9CA3AF] disabled:bg-[#9CA3AF]"
          >
            {isSubmitting ? "Uploading..." : "Analyze Calls"}
          </button>
        </div>

        {files.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-[12px] border border-[#E5E7EB] bg-[#F9FAFB] text-[#6B7280]">
              <AudioFileIcon className="h-6 w-6" />
            </div>
            <h4 className="type-section-title mt-4 text-[16px]">No files uploaded</h4>
            <p className="type-body-text mt-2 max-w-[420px] text-[14px]">
              Upload recent call recordings to populate the analysis queue and begin reviewing
              conversion failures, follow-up gaps, and revenue leakage.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#E5E7EB]">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex flex-col gap-4 px-5 py-3.5 transition hover:bg-[#F9FAFB] sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] border border-[#E5E7EB] bg-[#F9FAFB] text-[#6B7280]">
                    <AudioFileIcon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="type-section-title truncate text-[15px]">{file.name}</div>
                    <div className="type-body-text mt-1 text-[13px]">
                      {file.extension.replace(".", "").toUpperCase()} audio • {formatFileSize(file.size)}
                    </div>
                    {file.errorMessage ? (
                      <div className="mt-2 text-[12px] font-medium text-[#FCA5A5]">
                        {file.errorMessage}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="flex items-center gap-3 sm:ml-6">
                  <span
                    className={`inline-flex rounded-full border px-3 py-1 text-[12px] font-semibold ${getStatusStyles(
                      file.status
                    )}`}
                  >
                    {file.status}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveFile(file.id)}
                    className="button-secondary-ui inline-flex cursor-pointer items-center justify-center px-3 py-2 text-[13px] transition hover:border-[#D1D5DB] hover:bg-[#F9FAFB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                  >
                    <TrashIcon className="mr-1.5 h-4 w-4" />
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
