interface ApiErrorResponse {
  message?: string;
  errors?: Record<string, string[]>;
}

export type { ApiErrorResponse };
