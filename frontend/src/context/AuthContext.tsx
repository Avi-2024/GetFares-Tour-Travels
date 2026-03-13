import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { rbacApi } from "../api";

type AuthUser = {
  id: string;
  name: string;
  email: string;
};

type AuthContextValue = {
  token: string;
  user: AuthUser | null;
  permissions: string[];
  loadingPermissions: boolean;
  setAuthState: (token: string, user: AuthUser) => void;
  logout: () => void;
  refreshPermissions: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_TOKEN = "auth_token";
const STORAGE_USER = "auth_user";
const STORAGE_PERMISSIONS = "auth_permissions";

const DEFAULT_PERMISSIONS = [
  "leads.read",
  "leads.write",
  "quotations.read",
  "quotations.write",
  "bookings.read",
  "bookings.write",
  "payments.read",
  "payments.write",
  "refunds.read",
  "refunds.write",
  "visa.read",
  "visa.write",
  "complaints.read",
  "complaints.write",
  "reports.read",
  "notifications.read",
  "settings.read",
];

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string>(() => localStorage.getItem(STORAGE_TOKEN) ?? "");
  const [user, setUser] = useState<AuthUser | null>(() => {
    const raw = localStorage.getItem(STORAGE_USER);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  });
  const [permissions, setPermissions] = useState<string[]>(() => {
    const raw = localStorage.getItem(STORAGE_PERMISSIONS);
    return raw ? (JSON.parse(raw) as string[]) : [];
  });
  const [loadingPermissions, setLoadingPermissions] = useState(false);

  const refreshPermissions = useCallback(async () => {
    if (!token) return;
    setLoadingPermissions(true);
    try {
      const response = await rbacApi.myPermissions();
      const next = response.permissions ?? [];
      setPermissions(next);
      localStorage.setItem(STORAGE_PERMISSIONS, JSON.stringify(next));
    } catch {
      setPermissions(DEFAULT_PERMISSIONS);
      localStorage.setItem(STORAGE_PERMISSIONS, JSON.stringify(DEFAULT_PERMISSIONS));
    } finally {
      setLoadingPermissions(false);
    }
  }, [token]);

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

  const logout = () => {
    localStorage.removeItem(STORAGE_TOKEN);
    localStorage.removeItem(STORAGE_USER);
    localStorage.removeItem(STORAGE_PERMISSIONS);
    setToken("");
    setUser(null);
    setPermissions([]);
  };

  const hasPermission = useCallback((permission: string) => permissions.includes(permission), [permissions]);

  const value = useMemo(
    () => ({ token, user, permissions, loadingPermissions, setAuthState, logout, refreshPermissions, hasPermission }),
    [token, user, permissions, loadingPermissions, refreshPermissions, hasPermission]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider.");
  return value;
};
