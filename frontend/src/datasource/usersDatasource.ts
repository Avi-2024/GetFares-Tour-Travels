import type { HttpClient } from "../api/apiClient";

export type UsersQuery = Record<string, string | number | boolean | undefined>;

export const createUsersDatasource = (client: HttpClient) => ({
  list: (params?: UsersQuery) => client.get("/api/users", { params }),
  create: (payload: unknown) => client.post("/api/users", payload),
  update: (id: string, payload: unknown) =>
    client.patch(`/api/users/${id}`, payload),
});

export type UsersDatasource = ReturnType<typeof createUsersDatasource>;
