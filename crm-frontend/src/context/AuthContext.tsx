import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { authApi, rbacApi } from "../api";

type AuthUser = {
  id: string;
  name: string;
  email: string;
  role?: string;
  roleId?: string;
  active?: boolean | null;
  isActive?: boolean;
};

type AuthContextValue = {
  token: string;
  user: AuthUser | null;
  permissions: string[];
  loadingPermissions: boolean;
  bootstrappingSession: boolean;
  setAuthState: (user: AuthUser) => void;
  logout: () => void;
  refreshPermissions: (customToken?: string) => Promise<string[]>;
  hasPermission: (permission: string) => boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_USER = "auth_user";
const STORAGE_PERMISSIONS = "auth_permissions";
const STORAGE_TOKEN = "auth_token";
const SESSION_MARKER = "cookie_session";

type ProfileApiUser = {
  id?: string;
  email?: string;
  fullName?: string;
  name?: string;
  role?: string;
  roleId?: string;
  active?: boolean | null;
  isActive?: boolean;
};

const normalizePermissionKey = (permission: string) =>
  String(permission || "")
    .trim()
    .toLowerCase()
    .replace(/\./g, ":");

const normalizeBooleanFlag = (value: unknown): boolean | null => {
  if (value === true || value === 1 || value === "1" || value === "true") {
    return true;
  }
  if (value === false || value === 0 || value === "0" || value === "false") {
    return false;
  }
  return null;
};

const normalizeAuthUser = (payload?: ProfileApiUser | null): AuthUser | null => {
  if (!payload?.id && !payload?.email) return null;
  const fallbackName = payload.email?.split("@")[0] ?? "User";
  const active = normalizeBooleanFlag(payload.active ?? payload.isActive ?? null);
  const isActive = normalizeBooleanFlag(payload.isActive ?? payload.active ?? null);

  return {
    id: payload.id ?? "",
    name: payload.fullName?.trim() || payload.name?.trim() || fallbackName,
    email: payload.email ?? "",
    role: payload.role,
    roleId: payload.roleId,
    active,
    isActive: isActive ?? undefined,
  };
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string>(() => {
    return localStorage.getItem(STORAGE_TOKEN) || "";
  });
  const [user, setUser] = useState<AuthUser | null>(() => {
    const raw = localStorage.getItem(STORAGE_USER);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  });
  const [permissions, setPermissions] = useState<string[]>(() => {
    const raw = localStorage.getItem(STORAGE_PERMISSIONS);
    return raw ? (JSON.parse(raw) as string[]) : [];
  });
  const [loadingPermissions, setLoadingPermissions] = useState(false);
  const [bootstrappingSession, setBootstrappingSession] = useState(true);
  const permissionsRequestRef = useRef<{
    token: string;
    promise: Promise<string[]>;
  } | null>(null);
  const isAdmin = useMemo(
    () => {
      const role = String(user?.role ?? "").toLowerCase();
      return role === "admin" || role === "super_admin";
    },
    [user?.role],
  );

  const refreshPermissions = useCallback(
    async (customToken?: string) => {
      const activeToken = customToken || token;
      const tokenKey = activeToken || "__cookie_session__";

      if (permissionsRequestRef.current?.token === tokenKey) {
        return permissionsRequestRef.current.promise;
      }

      const requestPromise = (async (): Promise<string[]> => {
        if (isAdmin) {
          const allPermissions = ["*"];
          setPermissions(allPermissions);
          localStorage.setItem(
            STORAGE_PERMISSIONS,
            JSON.stringify(allPermissions),
          );
          return allPermissions;
        }

        setLoadingPermissions(true);
        try {
          const response = await rbacApi.myPermissions();
          const next =
            (response as { data?: { permissions?: string[] } }).data
              ?.permissions ??
            (response as { permissions?: string[] }).permissions ??
            [];
          const normalized = next.map(normalizePermissionKey).filter(Boolean);
          setPermissions(normalized);
          localStorage.setItem(STORAGE_PERMISSIONS, JSON.stringify(normalized));
          return normalized;
        } catch {
          setPermissions([]);
          localStorage.setItem(STORAGE_PERMISSIONS, JSON.stringify([]));
          return [];
        } finally {
          setLoadingPermissions(false);
        }
      })().finally(() => {
        if (permissionsRequestRef.current?.promise === requestPromise) {
          permissionsRequestRef.current = null;
        }
      });

      permissionsRequestRef.current = {
        token: tokenKey,
        promise: requestPromise,
      };

      return requestPromise;
    },
    [token, isAdmin],
  );

  useEffect(() => {
    if (permissions.length === 0) {
      void refreshPermissions();
    }
  }, [permissions.length, refreshPermissions]);

  useEffect(() => {
    let cancelled = false;

    const syncProfile = async () => {
      try {
        const response = await authApi.profile();
        const nextUser = normalizeAuthUser(response?.data);
        if (!nextUser || cancelled) return;
        localStorage.setItem(STORAGE_USER, JSON.stringify(nextUser));
        localStorage.setItem(STORAGE_TOKEN, SESSION_MARKER);
        setUser(nextUser);
        setToken(SESSION_MARKER);
      } catch {
        if (cancelled) return;
        setToken("");
      } finally {
        if (!cancelled) {
          setBootstrappingSession(false);
        }
      }
    };

    void syncProfile();

    return () => {
      cancelled = true;
    };
  }, []);

  const setAuthState = (nextUser: AuthUser) => {
    localStorage.setItem(STORAGE_USER, JSON.stringify(nextUser));
    localStorage.setItem(STORAGE_TOKEN, SESSION_MARKER);
    setToken(SESSION_MARKER);
    setUser(nextUser);
  };

  const logout = useCallback(() => {
    void authApi.logout().catch(() => {
      // ignore logout API failures during local cleanup
    });
    localStorage.removeItem(STORAGE_TOKEN);
    localStorage.removeItem(STORAGE_USER);
    localStorage.removeItem(STORAGE_PERMISSIONS);
    setToken("");
    setUser(null);
    setPermissions([]);
    setBootstrappingSession(false);
  }, []);

  const hasPermission = useCallback(
    (permission: string) => {
      if (isAdmin) return true;
      const required = normalizePermissionKey(permission);
      if (!required) {
        return true;
      }

      const granted = permissions.map(normalizePermissionKey).filter(Boolean);
      return granted.some((item) => {
        if (item === "*" || item === required) {
          return true;
        }

        if (item.endsWith(":*")) {
          const scope = item.slice(0, -2);
          return required.startsWith(`${scope}:`);
        }

        if (item.endsWith(":write")) {
          const scope = item.slice(0, -6);
          return (
            required === `${scope}:read` ||
            required === `${scope}:create` ||
            required === `${scope}:update` ||
            required === `${scope}:delete` ||
            required === `${scope}:write`
          );
        }

        return false;
      });
    },
    [permissions, isAdmin],
  );

  const value = useMemo(
    () => ({
      token,
      user,
      permissions,
      loadingPermissions,
      bootstrappingSession,
      setAuthState,
      logout,
      refreshPermissions,
      hasPermission,
    }),
    [
      token,
      user,
      permissions,
      loadingPermissions,
      bootstrappingSession,
      refreshPermissions,
      hasPermission,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider.");
  return value;
};
