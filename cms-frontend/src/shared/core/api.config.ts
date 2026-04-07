import type {
  ApiEndpoints,
  IApiConfig,
} from "../interfaces/IApiConfig.interface";

class ApiConfig implements IApiConfig {
  public readonly baseURL: string;
  public readonly endpoints: ApiEndpoints;

  constructor(
    baseURL: string =
      import.meta.env.VITE_API_BASE_URL ||
      "http://localhost:3000",
    endpoints: ApiEndpoints = {
      login: "/api/auth/login",
      logout: "/api/auth/logout",
    },
  ) {
    this.baseURL = String(baseURL || "")
      .trim()
      .replace(/\/+$/, "");
    this.endpoints = endpoints;
  }
}

export const apiConfig = new ApiConfig();
export default ApiConfig;
