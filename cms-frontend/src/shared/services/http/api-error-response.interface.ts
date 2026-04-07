interface ApiErrorResponse {
  message?: string;
  errors?: Record<string, string[]>;
  error?: {
    message?: string;
    code?: string;
    details?: unknown;
    requestId?: string;
  };
}

export type { ApiErrorResponse };
