import type {
  ApiClient,
  ApiClientConfig,
  ApiRequestConfig,
  HttpClient,
} from "../apiClient";
import { handleMockRequest, toMockRequest } from "./mockHandler";

const delay = (ms = 40) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const createMockApiClient = (
  _config: ApiClientConfig = {},
): ApiClient => {
  const request = async <T>(requestConfig: ApiRequestConfig): Promise<T> => {
    await delay();
    return handleMockRequest(toMockRequest(requestConfig)) as T;
  };

  const client: HttpClient = {
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
  };

  return {
    ...client,
    setAuthTokenProvider: () => {},
    setOnUnauthorized: () => {},
    addRequestInterceptor: () => 0,
    addResponseInterceptor: () => 0,
  };
};
