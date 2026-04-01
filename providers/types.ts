export interface CallProviderPayload {
  phone_number: string;
  timestamp: string;
  duration: number;
  answered: boolean;
  recording_url?: string;
  external_call_id: string;
  provider: string;
}

export interface CallProviderAdapter<TInput = unknown> {
  readonly provider: string;
  mapToCallPayload(input: TInput): CallProviderPayload;
}
