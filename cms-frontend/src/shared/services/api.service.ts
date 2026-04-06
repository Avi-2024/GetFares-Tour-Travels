import { HttpClient } from "./http/http-client.service";

export const apiService = HttpClient.getInstance();
export { HttpClient } from "./http/http-client.service";
export { AuthInterceptor } from "./http/auth.interceptor";
export { ErrorInterceptor } from "./http/error.interceptor";
