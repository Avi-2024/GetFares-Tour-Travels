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
  const contentFrameClass = collapsed
    ? "lg:ml-20 lg:w-[calc(100%-5rem)]"
    : "lg:ml-64 lg:w-[calc(100%-16rem)]";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {sidebarOpen ?
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      : null}

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
        className={`flex min-h-screen w-full min-w-0 flex-col transition-all duration-300 ${contentFrameClass}`}
      >
        <Header onMenuClick={() => setSidebarOpen((p) => !p)} />
        <main className="flex-1 min-w-0 overflow-y-auto p-4 transition-all md:p-6 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
