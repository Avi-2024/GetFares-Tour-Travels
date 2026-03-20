import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  type AxiosRequestHeaders,
  type InternalAxiosRequestConfig,
} from "axios";

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ??
  (import.meta.env.DEV
    ? "http://localhost:3000"
    : "https://get-fares-tour-travels-575u.vercel.app");

export type ApiError = Error & {
  status: number;
  details?: unknown;
};

export const createApiError = (
  message: string,
  status: number,
  details?: unknown,
): ApiError => {
  const error = new Error(message) as ApiError;
  error.status = status;
  error.details = details;
  return error;
};

export const isApiError = (error: unknown): error is ApiError => {
  if (!error || typeof error !== "object") return false;
  return "status" in error && typeof (error as ApiError).status === "number";
};

export const getApiErrorMessage = (
  error: unknown,
  fallback = "Something went wrong",
) => {
  if (isApiError(error) && error.message?.trim()) {
    return error.message.trim();
  }
  return fallback;
};

export type ApiRequestConfig = AxiosRequestConfig & {
  skipAuth?: boolean;
  token?: string;
};

export interface HttpClient {
  request<T>(config: ApiRequestConfig): Promise<T>;
  get<T>(url: string, config?: ApiRequestConfig): Promise<T>;
  post<T>(url: string, data?: unknown, config?: ApiRequestConfig): Promise<T>;
  put<T>(url: string, data?: unknown, config?: ApiRequestConfig): Promise<T>;
  patch<T>(url: string, data?: unknown, config?: ApiRequestConfig): Promise<T>;
  delete<T>(url: string, config?: ApiRequestConfig): Promise<T>;
}

export type ApiClientConfig = {
  baseURL?: string;
  timeoutMs?: number;
  defaultHeaders?: Record<string, string>;
  getAuthToken?: () => string | null | undefined;
  onUnauthorized?: () => void;
};

export type ApiClient = HttpClient & {
  setAuthTokenProvider: (getAuthToken: () => string | null | undefined) => void;
  setOnUnauthorized: (onUnauthorized?: () => void) => void;
  addRequestInterceptor: (
    onFulfilled: (
      config: ApiRequestConfig,
    ) => ApiRequestConfig | Promise<ApiRequestConfig>,
    onRejected?: (error: unknown) => unknown,
  ) => number;
  addResponseInterceptor: (
    onFulfilled: (
      response: AxiosResponse,
    ) => AxiosResponse | Promise<AxiosResponse>,
    onRejected?: (error: unknown) => unknown,
  ) => number;
};

const STORAGE_TOKEN = "auth_token";
const STORAGE_USER = "auth_user";
const STORAGE_PERMISSIONS = "auth_permissions";

const hasContentType = (headers?: ApiRequestConfig["headers"]) => {
  if (!headers) return false;
  if (Array.isArray(headers)) {
    return headers.some(([key]) => key.toLowerCase() === "content-type");
  }
  return Object.keys(headers).some(
    (key) => key.toLowerCase() === "content-type",
  );
};

const isFormData = (data: unknown) => {
  if (typeof FormData === "undefined") return false;
  return data instanceof FormData;
};

const extractMessage = (data: unknown) => {
  if (!data) return null;
  if (typeof data === "string") return data;
  if (typeof data === "object") {
    const obj = data as Record<string, unknown>;
    if ("message" in obj && obj.message) return String(obj.message);
    if ("error" in obj && obj.error) {
      if (typeof obj.error === "string") return obj.error;
      if (typeof obj.error === "object") {
        const nested = obj.error as Record<string, unknown>;
        if ("message" in nested && nested.message) return String(nested.message);
      }
    }
  }
  if (typeof data === "object" && "error" in data) {
    const error = (data as { error?: { message?: unknown } }).error;
    const message = error?.message;
    return message ? String(message) : null;
  }
  return null;
};

const toApiError = (error: unknown): ApiError => {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status ?? 0;
    const data = error.response?.data;
    const message =
      extractMessage(data) ??
      (status ? `API Error ${status}` : "Network error");
    return createApiError(message, status, data);
  }

  if (error instanceof Error) {
    return createApiError(error.message, 0);
  }

  return createApiError("Unknown error", 0);
};

const attachInterceptors = (
  axiosInstance: AxiosInstance,
  getAuthToken: () => string | null | undefined,
  onUnauthorized?: () => void,
) => {
  axiosInstance.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      const typedConfig = config as InternalAxiosRequestConfig &
        ApiRequestConfig;
      const shouldAttachToken = !typedConfig.skipAuth;
      const resolvedToken =
        typedConfig.token ?? (shouldAttachToken ? getAuthToken() : null);

      if (resolvedToken) {
        const headers = (typedConfig.headers ??
          ({} as AxiosRequestHeaders)) as AxiosRequestHeaders;
        headers.Authorization = `Bearer ${resolvedToken}`;
        typedConfig.headers = headers;
      }

      if (
        typedConfig.data &&
        !hasContentType(typedConfig.headers) &&
        !isFormData(typedConfig.data)
      ) {
        const headers = (typedConfig.headers ??
          ({} as AxiosRequestHeaders)) as AxiosRequestHeaders;
        headers["Content-Type"] = "application/json";
        typedConfig.headers = headers;
      }

      return typedConfig;
    },
  );

  axiosInstance.interceptors.response.use(
    (response) => response,
    (error) => {
      const apiError = toApiError(error);
      if (apiError.status === 401 && onUnauthorized) {
        onUnauthorized();
      }
      return Promise.reject(apiError);
    },
  );
};

export const createApiClient = (config: ApiClientConfig = {}): ApiClient => {
  const {
    baseURL = API_BASE_URL,
    timeoutMs = 20000,
    defaultHeaders,
    getAuthToken,
    onUnauthorized,
  } = config;

  const axiosInstance = axios.create({
    baseURL,
    timeout: timeoutMs,
    headers: {
      ...defaultHeaders,
    },
  });

  let tokenProvider =
    getAuthToken ?? (() => localStorage.getItem(STORAGE_TOKEN));
  let unauthorizedHandler = onUnauthorized;

  attachInterceptors(
    axiosInstance,
    () => tokenProvider(),
    () => unauthorizedHandler?.(),
  );

  const request = async <T>(requestConfig: ApiRequestConfig): Promise<T> => {
    const response = await axiosInstance.request<T>(requestConfig);
    return response.data;
  };

  return {
    request,
    get: <T>(url: string, cfg: ApiRequestConfig = {}) =>
      request<T>({ ...cfg, url, method: "GET" }),
    post: <T>(url: string, data?: unknown, cfg: ApiRequestConfig = {}) =>
      request<T>({ ...cfg, url, method: "POST", data }),
    put: <T>(url: string, data?: unknown, cfg: ApiRequestConfig = {}) =>
      request<T>({ ...cfg, url, method: "PUT", data }),
    patch: <T>(url: string, data?: unknown, cfg: ApiRequestConfig = {}) =>
      request<T>({ ...cfg, url, method: "PATCH", data }),
    delete: <T>(url: string, cfg: ApiRequestConfig = {}) =>
      request<T>({ ...cfg, url, method: "DELETE" }),
    setAuthTokenProvider: (nextProvider) => {
      tokenProvider = nextProvider;
    },
    setOnUnauthorized: (nextHandler) => {
      unauthorizedHandler = nextHandler;
    },
    addRequestInterceptor: (onFulfilled, onRejected) =>
      axiosInstance.interceptors.request.use(
        onFulfilled as unknown as (config: any) => any,
        onRejected,
      ),
    addResponseInterceptor: (onFulfilled, onRejected) =>
      axiosInstance.interceptors.response.use(
        onFulfilled as unknown as (response: any) => any,
        onRejected,
      ),
  };
};

type LegacyRequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  token?: string;
  skipAuth?: boolean;
  responseType?: "json" | "blob" | "text";
};

const clearAuthStorage = () => {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(STORAGE_TOKEN);
  localStorage.removeItem(STORAGE_USER);
  localStorage.removeItem(STORAGE_PERMISSIONS);
};

const handleLegacyUnauthorized = () => {
  if (typeof localStorage === "undefined") return;
  const hadToken = Boolean(localStorage.getItem(STORAGE_TOKEN));
  clearAuthStorage();

  if (
    hadToken &&
    typeof window !== "undefined" &&
    window.location.pathname !== "/login"
  ) {
    window.location.replace("/login");
  }
};

const legacyClient = createApiClient({
  getAuthToken: () => localStorage.getItem(STORAGE_TOKEN),
  onUnauthorized: handleLegacyUnauthorized,
});

const resolveResponseType = (
  responseType: LegacyRequestOptions["responseType"],
): AxiosRequestConfig["responseType"] => {
  if (responseType === "blob" || responseType === "text") return responseType;
  return "json";
};

export async function apiRequest<T>(
  path: string,
  options: LegacyRequestOptions = {},
): Promise<T> {
  const {
    method = "GET",
    body,
    token,
    skipAuth,
    responseType = "json",
  } = options;

  const config: ApiRequestConfig = {
    url: path,
    method,
    responseType: resolveResponseType(responseType),
    skipAuth,
  };

  if (token) {
    config.token = token;
  }

  if (body !== undefined && method !== "GET") {
    config.data = body;
  }

  return legacyClient.request<T>(config);
}
