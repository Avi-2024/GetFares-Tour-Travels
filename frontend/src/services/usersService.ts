import type { UsersDatasource, UsersQuery } from "../datasource/usersDatasource";

export const createUsersService = (datasource: UsersDatasource) => ({
  list: (params?: UsersQuery) => datasource.list(params),
  create: (payload: unknown) => datasource.create(payload),
  update: (id: string, payload: unknown) => datasource.update(id, payload),
});

export type UsersService = ReturnType<typeof createUsersService>;
