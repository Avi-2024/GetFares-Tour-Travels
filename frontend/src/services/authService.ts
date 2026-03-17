import type { AuthDatasource, AuthUserDto, LoginPayload } from "../datasource/authDatasource";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role?: string;
  roleId?: string;
};

export type AuthSession = {
  token: string;
  user: AuthUser;
};

const normalizeUser = (user: AuthUserDto): AuthUser => {
  const fallbackName = user.email?.split("@")[0] ?? "User";
  return {
    id: user.id,
    name: user.fullName || user.name || fallbackName,
    email: user.email,
    role: user.role,
    roleId: user.roleId,
  };
};

export const createAuthService = (datasource: AuthDatasource) => ({
  login: async (payload: LoginPayload): Promise<AuthSession> => {
    const response = await datasource.login(payload);
    return {
      token: response.data.accessToken,
      user: normalizeUser(response.data.user),
    };
  },
  forgotPassword: (payload: { email: string }) => datasource.forgotPassword(payload),
  resetPassword: (payload: { token: string; password: string }) =>
    datasource.resetPassword(payload),
  getPermissions: async () => {
    const response = await datasource.myPermissions();
    return response.data?.permissions ?? response.permissions ?? [];
  },
});

export type AuthService = ReturnType<typeof createAuthService>;
