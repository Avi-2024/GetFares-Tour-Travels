import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import Header from "./Header";
import Sidebar from "./Sidebar";

const Layout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth >= 1024;
  });
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
      {sidebarOpen ? (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      <div
        className={`fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
      >
        <Sidebar
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((p) => !p)}
          onClose={() => setSidebarOpen(false)}
        />
      </div>

      <div
        className={`flex flex-1 flex-col transition-all duration-300 ${collapsed ? "lg:pl-20" : "lg:pl-72"}`}
      >
        <Header onMenuClick={() => setSidebarOpen((p) => !p)} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-6 transition-all">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
