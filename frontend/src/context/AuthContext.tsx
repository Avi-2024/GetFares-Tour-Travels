import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { rbacApi } from "../api";

type AuthUser = {
  id: string;
  name: string;
  email: string;
  role?: string;
  roleId?: string;
};

type AuthContextValue = {
  token: string;
  user: AuthUser | null;
  permissions: string[];
  loadingPermissions: boolean;
  setAuthState: (token: string, user: AuthUser) => void;
  logout: () => void;
  refreshPermissions: (customToken?: string) => Promise<void>;
  hasPermission: (permission: string) => boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_TOKEN = "auth_token";
const STORAGE_USER = "auth_user";
const STORAGE_PERMISSIONS = "auth_permissions";

const normalizePermissionKey = (permission: string) =>
  String(permission || "")
    .trim()
    .toLowerCase()
    .replace(/\./g, ":");

const parseTokenExpiryMs = (token: string): number | null => {
  if (typeof window === "undefined" || !token) return null;

  const parts = token.split(".");
  if (parts.length < 2) return null;

  try {
    const normalized = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(
      normalized.length + ((4 - (normalized.length % 4)) % 4),
      "=",
    );
    const payload = JSON.parse(window.atob(padded)) as { exp?: unknown };
    if (typeof payload.exp !== "number") return null;
    return payload.exp * 1000;
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string>(
    () => localStorage.getItem(STORAGE_TOKEN) ?? "",
  );
  const [user, setUser] = useState<AuthUser | null>(() => {
    const raw = localStorage.getItem(STORAGE_USER);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  });
  const [permissions, setPermissions] = useState<string[]>(() => {
    const raw = localStorage.getItem(STORAGE_PERMISSIONS);
    return raw ? (JSON.parse(raw) as string[]) : [];
  });
  const [loadingPermissions, setLoadingPermissions] = useState(false);
  const isAdmin = useMemo(
    () => String(user?.role ?? "").toLowerCase() === "admin",
    [user?.role],
  );

  const refreshPermissions = useCallback(
    async (customToken?: string) => {
      const activeToken = customToken || token;
      if (!activeToken) return;
      if (isAdmin) {
        const allPermissions = ["*"];
        setPermissions(allPermissions);
        localStorage.setItem(
          STORAGE_PERMISSIONS,
          JSON.stringify(allPermissions),
        );
        return;
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
      } catch {
        setPermissions([]);
        localStorage.setItem(STORAGE_PERMISSIONS, JSON.stringify([]));
      } finally {
        setLoadingPermissions(false);
      }
    },
    [token, isAdmin],
  );

  useEffect(() => {
    if (token && permissions.length === 0) {
      void refreshPermissions();
    }
  }, [token, permissions.length, refreshPermissions]);

  const setAuthState = (nextToken: string, nextUser: AuthUser) => {
    localStorage.setItem(STORAGE_TOKEN, nextToken);
    localStorage.setItem(STORAGE_USER, JSON.stringify(nextUser));
    setToken(nextToken);
    setUser(nextUser);
  };

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_TOKEN);
    localStorage.removeItem(STORAGE_USER);
    localStorage.removeItem(STORAGE_PERMISSIONS);
    setToken("");
    setUser(null);
    setPermissions([]);
  }, []);

  useEffect(() => {
    if (!token) return;

    const expiryMs = parseTokenExpiryMs(token);
    if (!expiryMs) return;

    const redirectToLogin = () => {
      logout();
      if (
        typeof window !== "undefined" &&
        window.location.pathname !== "/login"
      ) {
        window.location.replace("/login");
      }
    };

    const remainingMs = expiryMs - Date.now();
    if (remainingMs <= 0) {
      redirectToLogin();
      return;
    }

    const timerId = window.setTimeout(redirectToLogin, remainingMs);
    return () => window.clearTimeout(timerId);
  }, [token, logout]);

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
