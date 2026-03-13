import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaBars, FaBell, FaChevronDown, FaMagnifyingGlass, FaMoon, FaPlus, FaSun } from "react-icons/fa6";
import { useAuth } from "../../context/AuthContext";
import { useNotifications } from "../../context/NotificationsContext";
import NotificationDrawer from "./NotificationDrawer";

const Header: React.FC<{ onMenuClick: () => void }> = ({ onMenuClick }) => {
  const [dark, setDark] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const { unreadCount } = useNotifications();

  useEffect(() => {
    const enabled = localStorage.getItem("theme") === "dark";
    setDark(enabled);
    document.documentElement.classList.toggle("dark", enabled);
  }, []);

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setMenuOpen(false);
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
        <button onClick={onMenuClick} className="rounded-xl p-2 text-gray-600 hover:bg-gray-100 lg:hidden dark:text-gray-300 dark:hover:bg-gray-800">
          <FaBars />
        </button>
        <div className="relative hidden w-72 md:block">
          <input className="field-input pl-9" placeholder="Search leads, bookings, customers..." />
          <FaMagnifyingGlass className="pointer-events-none absolute left-3 top-3 text-xs text-gray-400" />
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <button onClick={toggle} className="rounded-xl border border-gray-200 bg-white p-2 text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800">
          {dark ? <FaSun /> : <FaMoon />}
        </button>
        {hasPermission("notifications.read") ? (
          <button onClick={() => setDrawerOpen(true)} className="relative rounded-xl border border-gray-200 bg-white p-2 text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800">
            <FaBell />
            {unreadCount > 0 ? <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">{unreadCount}</span> : null}
          </button>
        ) : null}
        {hasPermission("leads.write") ? (
          <button onClick={() => navigate("/create-lead")} className="hidden items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 sm:flex">
            <FaPlus /> New Lead
          </button>
        ) : null}

        <div ref={ref} className="relative">
          <button onClick={() => setMenuOpen((p) => !p)} className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-2 py-1.5 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-800">
            <img className="h-8 w-8 rounded-full" src="https://storage.googleapis.com/uxpilot-auth.appspot.com/28c2bdaa36-0690aa93f5755609852b.png" alt="Alex" />
            <div className="hidden text-left sm:block">
              <p className="text-sm font-medium text-gray-800 dark:text-gray-100">Alex Morgan</p>
              <p className="text-xs text-gray-500">Admin</p>
            </div>
            <FaChevronDown className="text-xs text-gray-500" />
          </button>
          {menuOpen ? (
            <div className="absolute right-0 mt-2 w-52 rounded-xl border border-gray-200 bg-white p-1 shadow-lg dark:border-gray-700 dark:bg-gray-900">
              {["Profile", "Notifications", "Settings", "Logout"].map((m) => (
                <button key={m} className="w-full rounded-lg px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800">{m}</button>
              ))}
            </div>
          ) : null}
        </div>
      </div>
      <NotificationDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </header>
  );
};

export default Header;
