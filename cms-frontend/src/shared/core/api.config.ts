import type { ApiEndpoints, IApiConfig } from "../interfaces/IApiConfig.interface";

class ApiConfig implements IApiConfig {
  public readonly baseURL: string;
  public readonly endpoints: ApiEndpoints;

  constructor(
    baseURL: string =
      (import.meta as ImportMeta).env?.VITE_API_BASE_URL ??
      (import.meta as ImportMeta).env?.VITE_BACKEND_URL ??
      "http://localhost:3000",
    endpoints: ApiEndpoints = {
      login: "/auth/login",
      logout: "/auth/logout",
    },
  ) {
    this.baseURL = baseURL;
    this.endpoints = endpoints;
  }
}

export const apiConfig = new ApiConfig();
export default ApiConfig;
