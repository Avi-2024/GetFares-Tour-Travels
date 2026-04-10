import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaBars,
  FaBell,
  FaChevronDown,
  FaMagnifyingGlass,
  FaMoon,
  FaSun,
} from "react-icons/fa6";
import { authApi } from "../../api/auth";
import { useAuth } from "../../context/AuthContext";
import { useNotifications } from "../../context/NotificationsContext";

const getDisplayName = (name?: string, email?: string) => {
  const value = name?.trim() || email?.split("@")[0] || "User";
  return value;
};

const getInitials = (name: string) => {
  const parts = name.split(" ").filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
};

const formatRoleLabel = (role?: string) => {
  if (!role) return "Signed in";
  return role
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
};

type PresencePayload = {
  id?: string;
  fullName?: string;
  name?: string;
  email?: string;
  role?: string;
  roleId?: string;
  active?: boolean | null;
  isActive?: boolean;
};

const Header: React.FC<{
  onMenuClick: () => void;
}> = ({ onMenuClick }) => {
  const navigate = useNavigate();
  const { hasPermission, logout, user, token, setAuthState } = useAuth();
  const { unreadCount } = useNotifications();

  const [dark, setDark] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("theme") === "dark";
  });
  const [menuOpen, setMenuOpen] = useState(false);
  const [workingMode, setWorkingMode] = useState<boolean | null>(
    typeof user?.active === "boolean" ? user.active : null,
  );
  const [togglingWorkingMode, setTogglingWorkingMode] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  const displayName = getDisplayName(user?.name, user?.email);
  const roleLabel = formatRoleLabel(user?.role);
  const initials = getInitials(displayName);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  useEffect(() => {
    setWorkingMode(typeof user?.active === "boolean" ? user.active : null);
  }, [user?.active]);

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    localStorage.setItem("theme", next ? "dark" : "light");
    document.documentElement.classList.toggle("dark", next);
  };

  const syncPresenceUser = (payload: PresencePayload) => {
    if (!token) return;
    setAuthState(token, {
      id: payload.id || user?.id || "",
      name:
        payload.fullName?.trim() ||
        payload.name?.trim() ||
        user?.name ||
        "User",
      email: payload.email || user?.email || "",
      role: payload.role ?? user?.role,
      roleId: payload.roleId ?? user?.roleId,
      active: payload.active ?? null,
      isActive: payload.isActive,
    });
  };

  const handleToggleWorkingMode = async () => {
    if (togglingWorkingMode || workingMode === null) return;

    const next = !workingMode;
    setTogglingWorkingMode(true);
    try {
      const response = await authApi.toggleActive(next);
      const payload = response?.data;
      const confirmed =
        typeof payload?.active === "boolean" ? payload.active : null;
      setWorkingMode(confirmed);
      if (payload) {
        syncPresenceUser(payload);
      }
    } catch {
      setWorkingMode(typeof user?.active === "boolean" ? user.active : null);
    } finally {
      setTogglingWorkingMode(false);
    }
  };

  const workingModeSupported = workingMode !== null;
  const workingModeLabel =
    workingMode === null ? "Working Mode"
    : workingMode ? "Working"
    : "Away";
  const workingModeTitle =
    !workingModeSupported ?
      "Backend working mode is unavailable until active presence is configured in the database"
    : workingMode ? "Click to switch to away mode"
    : "Click to switch to working mode";
  const workingModeClasses =
    !workingModeSupported ?
      "border-gray-200 bg-gray-100 text-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-500"
    : workingMode ?
      "border-green-200 bg-green-50 text-green-700 hover:bg-green-100 dark:border-green-700 dark:bg-green-900/30 dark:text-green-200"
    : "border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-400 dark:bg-amber-900/30 dark:text-amber-200 dark:hover:bg-amber-900/40";
  const workingModeDotClasses =
    !workingModeSupported ? "bg-gray-400"
    : workingMode ?
      togglingWorkingMode ? "bg-green-400 animate-pulse"
      : "bg-green-500"
    : togglingWorkingMode ? "bg-amber-400 animate-pulse"
    : "bg-amber-500";

  return (
    <header className="sticky top-0 z-30 flex h-16 min-w-0 items-center justify-between border-b border-gray-200 bg-white/90 px-4 backdrop-blur lg:px-8 dark:border-gray-700 dark:bg-gray-900/90">
      <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
        <button
          onClick={onMenuClick}
          className="rounded-xl p-2 text-gray-600 hover:bg-gray-100 lg:hidden dark:text-gray-300 dark:hover:bg-gray-800"
        >
          <FaBars />
        </button>
        <div className="relative hidden w-full max-w-[22rem] md:block lg:max-w-[26rem]">
          <input
            className="field-input pl-9"
            placeholder="Search leads, bookings, customers..."
          />
          <FaMagnifyingGlass className="pointer-events-none absolute left-3 top-3 text-xs text-gray-400" />
        </div>
      </div>
      <div className="hidden lg:flex items-center gap-3">
        <img
          alt="Tabby"
          className="h-6 w-auto object-contain"
          src="tabby.svg"
        />
        <img
          alt="Tamara"
          className="h-6 w-auto object-contain"
          src="tamara.svg"
        />
      </div>
      <div className="width:10px"></div>
      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={() => void handleToggleWorkingMode()}
          disabled={!workingModeSupported || togglingWorkingMode}
          title={workingModeTitle}
          className={`flex items-center gap-1.5 whitespace-nowrap rounded-xl border px-2 py-2 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 sm:gap-2 sm:px-3 sm:text-sm ${workingModeClasses}`}
        >
          <span className={`h-2 w-2 rounded-full ${workingModeDotClasses}`} />
          <span>{workingModeLabel}</span>
        </button>
        <button
          onClick={toggleTheme}
          className="rounded-xl border border-gray-200 bg-white p-2 text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
        >
          {dark ?
            <FaSun />
          : <FaMoon />}
        </button>
        {hasPermission("notifications:read") ?
          <div className="relative">
            <button
              onClick={() => navigate("/notifications")}
              className="relative rounded-xl border border-gray-200 bg-white p-2 text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              <FaBell />
              {unreadCount > 0 ?
                <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
                  {unreadCount}
                </span>
              : null}
            </button>
          </div>
        : null}
        <div ref={ref} className="relative">
          <button
            onClick={() => setMenuOpen((p) => !p)}
            className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-2 py-1.5 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-800"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">
              {initials}
            </div>
            <div className="hidden max-w-[220px] text-left xl:block">
              <p className="truncate text-sm font-medium text-gray-800 dark:text-gray-100">
                {displayName}
              </p>
              <p className="truncate text-xs text-gray-500">{roleLabel}</p>
            </div>
            <FaChevronDown className="text-xs text-gray-500" />
          </button>
          {menuOpen ?
            <div className="absolute right-0 mt-2 w-52 rounded-xl border border-gray-200 bg-white p-1 shadow-lg dark:border-gray-700 dark:bg-gray-900">
              {[
                { label: "Profile", action: () => navigate("/profile") },
                {
                  label: "Notifications",
                  action: () => navigate("/notifications"),
                },
                { label: "Settings", action: () => navigate("/settings") },
                {
                  label: "Logout",
                  action: () => {
                    logout();
                    navigate("/login");
                  },
                  variant: "danger" as const,
                },
              ].map((item) => (
                <button
                  key={item.label}
                  onClick={() => {
                    setMenuOpen(false);
                    item.action();
                  }}
                  className={`w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-800 ${
                    item.variant === "danger" ?
                      "bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-200 dark:hover:bg-red-800/40"
                    : "text-gray-700 dark:text-gray-200"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          : null}
        </div>
      </div>
    </header>
  );
};

export default Header;
