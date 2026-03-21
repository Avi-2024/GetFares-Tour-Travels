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

const Header: React.FC<{
  onMenuClick: () => void;
}> = ({ onMenuClick }) => {
  const [dark, setDark] = useState(() => localStorage.getItem("theme") === "dark");
  const [menuOpen, setMenuOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();
  const { hasPermission, logout, user } = useAuth();
  const { unreadCount } = useNotifications();
  const displayName = getDisplayName(user?.name, user?.email);
  const roleLabel = formatRoleLabel(user?.role);
  const initials = getInitials(displayName);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setMenuOpen(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    localStorage.setItem("theme", next ? "dark" : "light");
    document.documentElement.classList.toggle("dark", next);
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-200 bg-white/90 px-4 backdrop-blur lg:px-8 dark:border-gray-700 dark:bg-gray-900/90">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="rounded-xl p-2 text-gray-600 hover:bg-gray-100 lg:hidden dark:text-gray-300 dark:hover:bg-gray-800"
        >
          <FaBars />
        </button>
        <div className="relative hidden w-72 md:block">
          <input
            className="field-input pl-9"
            placeholder="Search leads, bookings, customers..."
          />
          <FaMagnifyingGlass className="pointer-events-none absolute left-3 top-3 text-xs text-gray-400" />
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <button
          onClick={toggle}
          className="rounded-xl border border-gray-200 bg-white p-2 text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
        >
          {dark ? <FaSun /> : <FaMoon />}
        </button>
        {hasPermission("notifications:read") ? (
          <div className="relative">
            <button
              onClick={() => navigate("/notifications")}
              className="relative rounded-xl border border-gray-200 bg-white p-2 text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              <FaBell />
              {unreadCount > 0 ? (
                <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
                  {unreadCount}
                </span>
              ) : null}
            </button>
          </div>
        ) : null}
        <div ref={ref} className="relative">
          <button
            onClick={() => setMenuOpen((p) => !p)}
            className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-2 py-1.5 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-800"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">
              {initials}
            </div>
            <div className="hidden text-left sm:block">
              <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
                {displayName}
              </p>
              <p className="text-xs text-gray-500">{roleLabel}</p>
            </div>
            <FaChevronDown className="text-xs text-gray-500" />
          </button>
          {menuOpen ? (
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
                    item.variant === "danger"
                      ? "bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-200 dark:hover:bg-red-800/40"
                      : "text-gray-700 dark:text-gray-200"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
};

export default Header;
