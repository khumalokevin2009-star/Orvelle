import "server-only";

const OPENAI_TRANSCRIPTION_URL = "https://api.openai.com/v1/audio/transcriptions";
const OPENAI_MAX_FILE_BYTES = 25 * 1024 * 1024;

export type TranscriptionAudioAsset = {
  fileName: string;
  mimeType: string | null;
  bytes: Buffer;
  callerName?: string | null;
};

export type TranscriptionResult = {
  provider: "openai" | "mock";
  transcriptText: string;
  model: string;
  confidenceScore: number | null;
};

type TranscriptionProvider = "openai" | "mock";

function getConfiguredProvider(): TranscriptionProvider | null {
  const value = process.env.TRANSCRIPTION_PROVIDER?.trim().toLowerCase();

  if (!value) {
    return null;
  }

  if (value === "openai" || value === "mock") {
    return value;
  }

  throw new Error(
    `Unsupported transcription provider "${process.env.TRANSCRIPTION_PROVIDER}". Use "openai" or "mock".`
  );
}

function getOpenAIModel() {
  return process.env.OPENAI_TRANSCRIPTION_MODEL?.trim() || "gpt-4o-mini-transcribe";
}

function getAudioMimeType(fileName: string, fallback: string | null) {
  if (fallback?.trim()) {
    return fallback;
  }

  const normalized = fileName.toLowerCase();

  if (normalized.endsWith(".mp3")) return "audio/mpeg";
  if (normalized.endsWith(".wav")) return "audio/wav";
  if (normalized.endsWith(".m4a")) return "audio/m4a";

  return "application/octet-stream";
}

async function transcribeWithOpenAI(asset: TranscriptionAudioAsset): Promise<TranscriptionResult> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    throw new Error(
      "OpenAI transcription is not configured. Add OPENAI_API_KEY or switch TRANSCRIPTION_PROVIDER to mock."
    );
  }

  if (asset.bytes.byteLength > OPENAI_MAX_FILE_BYTES) {
    throw new Error("The selected recording exceeds the OpenAI transcription file limit of 25 MB.");
  }

  const model = getOpenAIModel();
  const formData = new FormData();
  const mimeType = getAudioMimeType(asset.fileName, asset.mimeType);
  const file = new File([new Uint8Array(asset.bytes)], asset.fileName, {
    type: mimeType
  });

  formData.append("file", file);
  formData.append("model", model);
  formData.append("response_format", "json");
  formData.append("include[]", "logprobs");

  const response = await fetch(OPENAI_TRANSCRIPTION_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`
    },
    body: formData
  });

  const payload = (await response.json().catch(() => null)) as
    | {
        text?: string;
        logprobs?: Array<{
          logprob?: number;
          token?: string;
        }>;
        error?: {
          message?: string;
        };
      }
    | null;

  if (!response.ok) {
    throw new Error(
      payload?.error?.message || "The transcription provider returned an error while processing the recording."
    );
  }

  const transcriptText = payload?.text?.trim();

  if (!transcriptText) {
    throw new Error("The transcription provider returned an empty transcript.");
  }

  const confidenceScore =
    payload?.logprobs && payload.logprobs.length > 0
      ? Number(
          (
            (payload.logprobs.reduce((sum, entry) => sum + Math.exp(entry.logprob ?? -10), 0) /
              payload.logprobs.length) *
            100
          ).toFixed(2)
        )
      : null;

  return {
    provider: "openai",
    transcriptText,
    model,
    confidenceScore
  };
}

async function transcribeWithMock(asset: TranscriptionAudioAsset): Promise<TranscriptionResult> {
  const subject = asset.callerName?.trim() || "Unknown Caller";

  return {
    provider: "mock",
    model: "mock-transcriber-v1",
    transcriptText: [
      `Caller: This is ${subject}. I am calling about scheduling service as soon as possible.`,
      "Agent: Thank you for contacting the office. I am documenting the request for follow-up review.",
      "System: Mock transcription provider generated this placeholder transcript for local pipeline testing."
    ].join("\n"),
    confidenceScore: null
  };
}

export async function transcribeAudioAsset(asset: TranscriptionAudioAsset): Promise<TranscriptionResult> {
  const provider = getConfiguredProvider();

  if (!provider) {
    throw new Error(
      "No transcription provider is configured. Set TRANSCRIPTION_PROVIDER to openai or mock before generating transcripts."
    );
  }

  if (provider === "mock") {
    return transcribeWithMock(asset);
  }

  return transcribeWithOpenAI(asset);
}
