export interface ApiEndpoints {
  login: string;
  logout: string;
}

export interface IApiConfig {
  baseURL: string;
  endpoints: ApiEndpoints;
}
