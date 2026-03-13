import { apiRequest } from "./apiClient";
import { withQuery } from "./query";

export const usersApi = {
  list: (params?: Record<string, string | number | boolean>) => apiRequest(withQuery("/api/users", params)),
  create: (payload: unknown) => apiRequest("/api/users", { method: "POST", body: payload }),
  update: (id: string, payload: unknown) => apiRequest(`/api/users/${id}`, { method: "PATCH", body: payload }),
};
