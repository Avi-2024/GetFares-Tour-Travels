import type {
  AuthDatasource,
  AuthUserDto,
  LoginPayload,
  PermissionRecord,
  RoleRecord,
} from "../datasource/authDatasource";

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
  forgotPassword: (payload: { email: string }) =>
    datasource.forgotPassword(payload),
  resetPassword: (payload: { token: string; password: string }) =>
    datasource.resetPassword(payload),
  getPermissions: async () => {
    const response = await datasource.myPermissions();
    return response.data?.permissions ?? response.permissions ?? [];
  },
  assignRole: (payload: { userId: string; role?: string; roleId?: string }) =>
    datasource.assignRole(payload),
  listPermissions: async (): Promise<PermissionRecord[]> => {
    const response = await datasource.listPermissions();
    return Array.isArray(response.data) ? response.data : [];
  },
  listRoles: async (): Promise<RoleRecord[]> => {
    const response = await datasource.listRoles();
    return Array.isArray(response.data) ? response.data : [];
  },
  getRolePermissions: async (role: string) => {
    const response = await datasource.getRolePermissions(role);
    return response.data ?? [];
  },
  getRolePermissionsById: async (roleId: string) => {
    const response = await datasource.getRolePermissionsById(roleId);
    return response.data ?? [];
  },
  updateRolePermissions: (
    roleId: string,
    payload: {
      replace?: boolean;
      permissionIds?: string[];
      permissions?: { permissionId?: string; key?: string; enabled?: boolean }[];
    },
  ) => datasource.updateRolePermissions(roleId, payload),
  setRolePermissions: (role: string, permissions: string[]) =>
    datasource.setRolePermissions(role, { permissions }),
});

export type AuthService = ReturnType<typeof createAuthService>;
