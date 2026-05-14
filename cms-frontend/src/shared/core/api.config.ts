import type {
  ApiEndpoints,
  IApiConfig,
} from "../interfaces/IApiConfig.interface";

const normalizeBaseUrl = (value: string): string =>
  value.trim().replace(/\/+$/, "");

const resolveBaseUrl = (): string => {
  const candidates = [
    import.meta.env.VITE_API_BASE_URL,
    import.meta.env.VITE_BASE_API_URL,
    import.meta.env.BACKEND_URL,
  ];

  const configuredBaseUrl = candidates.find(
    (value) => String(value || "").trim().length > 0,
  );

  if (configuredBaseUrl) {
    return normalizeBaseUrl(String(configuredBaseUrl));
  }

  if (typeof window !== "undefined" && window.location?.origin) {
    return normalizeBaseUrl(window.location.origin);
  }

  return "";
};

class ApiConfig implements IApiConfig {
  public readonly baseURL: string;
  public readonly endpoints: ApiEndpoints;

  constructor(
    baseURL: string = resolveBaseUrl(),
    endpoints: ApiEndpoints = {
      login: "/api/auth/login",
      logout: "/api/auth/logout",
    },
  ) {
    this.baseURL = normalizeBaseUrl(String(baseURL || ""));
    this.endpoints = endpoints;
  }
}

export const apiConfig = new ApiConfig();
export default ApiConfig;
