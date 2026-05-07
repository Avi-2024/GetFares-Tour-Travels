import { type ReactNode, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import SidebarComponent from "../sidebar/sidebar.component";
import TopbarComponent from "./topbar.component";

interface AppShellProps {
  title: string;
  subtitle: string;
  breadcrumb: string;
  children: ReactNode;
}

const DESKTOP_BREAKPOINT = 1024;
const LARGE_DESKTOP_BREAKPOINT = 1440;

const AppShellComponent = ({
  title,
  subtitle,
  breadcrumb,
  children,
}: AppShellProps) => {
  const location = useLocation();
  const [viewportWidth, setViewportWidth] = useState<number>(
    typeof window === "undefined" ? DESKTOP_BREAKPOINT : window.innerWidth,
  );
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(
    typeof window === "undefined" ? false : (
      window.innerWidth < LARGE_DESKTOP_BREAKPOINT
    ),
  );
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const isDesktop = viewportWidth >= DESKTOP_BREAKPOINT;

  useEffect(() => {
    const handleResize = () => {
      setViewportWidth(window.innerWidth);
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    if (!isDesktop) {
      setSidebarCollapsed(true);
    }
  }, [isDesktop]);

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location.pathname, location.search, location.hash]);

  useEffect(() => {
    if (!mobileSidebarOpen) {
      return;
    }
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileSidebarOpen(false);
      }
    };
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("keydown", onEscape);
    };
  }, [mobileSidebarOpen]);

  return (
    <div className="flex h-screen w-full  overflow-hidden bg-(--background) text-(--text-primary)">
      <SidebarComponent
        isDesktop={isDesktop}
        collapsed={sidebarCollapsed}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
        onToggleCollapsed={() => setSidebarCollapsed((prev) => !prev)}
      />
      <div className="min-w-0 flex-1 flex flex-col overflow-hidden">
        <TopbarComponent
          title={title}
          subtitle={subtitle}
          breadcrumb={breadcrumb}
          showMenuButton={!isDesktop}
          onMenuClick={() => setMobileSidebarOpen(true)}
        />
        <main className="flex-1 overflow-y-auto mx-auto w-full max-w-525 px-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 sm:px-4 md:px-6 lg:px-8 lg:pb-8 2xl:px-10">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AppShellComponent;
