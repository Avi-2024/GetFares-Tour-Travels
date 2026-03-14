const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

export class ApiError extends Error {
  status: number;
  details: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  token?: string;
  responseType?: "json" | "blob" | "text";
};

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, token, responseType = "json" } = options;
  const authToken = token ?? localStorage.getItem("auth_token") ?? "";

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  if (!response.ok) {
    let parsed: unknown = null;
    try {
      parsed = await response.json();
    } catch {
      try {
        parsed = await response.text();
      } catch {
        parsed = null;
      }
    }
    const message = typeof parsed === "object" && parsed && "message" in parsed ? String((parsed as { message: unknown }).message) : `API Error ${response.status}`;
    throw new ApiError(message, response.status, parsed);
  }

  if (responseType === "blob") {
    return (await response.blob()) as T;
  }

  if (responseType === "text") {
    return (await response.text()) as T;
  }

  let parsed: unknown = null;
  try {
    parsed = await response.json();
  } catch {
    parsed = null;
  }

  return parsed as T;
}
