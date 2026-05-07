import { HttpClient } from "./http-client";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "";

export const apiClient = new HttpClient({
  baseURL: API_BASE_URL,
  timeout: 20000,
});

apiClient.setTokenProvider(() => localStorage.getItem("auth_token"));

apiClient.setUnauthorizedHandler(() => {
  localStorage.removeItem("auth_token");
  localStorage.removeItem("auth_user");
  localStorage.removeItem("auth_permissions");
  if (window.location.pathname !== "/login") window.location.replace("/login");
});

export { HttpClient } from "./http-client";
export type { HttpClientConfig, RequestConfig } from "./http-client";
