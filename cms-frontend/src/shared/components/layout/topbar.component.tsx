import { useEffect, useRef, useState } from "react";
import { Menu } from "lucide-react";
import ThemeToggle from "../theme.component";
import { serviceContainer } from "../../core/service.container";

interface TopbarProps {
  title: string;
  subtitle: string;
  breadcrumb: string;
  showMenuButton: boolean;
  onMenuClick: () => void;
}

const TopbarComponent = ({
  title,
  subtitle,
  showMenuButton,
  onMenuClick,
}: TopbarProps) => {
  const authService = serviceContainer.getAuthService();
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      if (!profileMenuRef.current) return;
      if (profileMenuRef.current.contains(event.target as Node)) return;
      setIsProfileMenuOpen(false);
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleDocumentClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleDocumentClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const handleLogoutClick = async (): Promise<void> => {
    setIsProfileMenuOpen(false);
    await authService.logout();
    window.location.replace("/login");
  };

  const currentUser = authService.getCurrentUser();
  const initials = (currentUser?.fullName || "CMS User")
    .split(" ")
    .map((chunk) => chunk.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const roleLabel =
    currentUser?.role ? currentUser.role.replace(/_/g, " ") : "CMS Access";

  return (
    <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-(--surface-muted) px-3 py-[max(0.5rem,env(safe-area-inset-top))] backdrop-blur-xl sm:px-4 md:px-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {showMenuButton && (
              <button
                type="button"
                onClick={onMenuClick}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] bg-(--surface) text-[var(--text-secondary)] transition hover:bg-(--background-soft)"
                aria-label="Open sidebar menu"
              >
                <Menu size={18} />
              </button>
            )}
            <h1 className="truncate font-display text-[clamp(1.05rem,3.4vw,1.55rem)] font-semibold text-[var(--text-primary)]">
              {title}
            </h1>
          </div>
          <p className="mt-1 truncate text-xs text-[var(--text-secondary)] sm:text-sm">
            {subtitle}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <div className="hidden items-center gap-2 xl:flex">
            <div className="inline-flex h-[38px] items-center rounded-full border border-[var(--border)] bg-(--surface) px-3 shadow-[var(--shadow-soft)]">
              <img
                alt="Tabby"
                className="h-5 w-auto object-contain"
                src="/tabby.svg"
              />
            </div>
            <div className="inline-flex h-[38px] items-center rounded-full border border-[var(--border)] bg-(--surface) px-3 shadow-[var(--shadow-soft)]">
              <img
                alt="Tamara"
                className="h-5 w-auto object-contain"
                src="/tamara.svg"
              />
            </div>
          </div>
          <ThemeToggle />

          <div className="relative" ref={profileMenuRef}>
            <button
              type="button"
              aria-expanded={isProfileMenuOpen}
              aria-haspopup="menu"
              onClick={() => setIsProfileMenuOpen((prev) => !prev)}
              className="inline-flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-(--surface) px-2 py-1.5 transition hover:border-[var(--primary)]/30 hover:bg-(--surface-muted)"
            >
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] text-xs font-bold text-white">
                {initials}
              </span>
              <span className="hidden text-left md:block">
                <span className="block max-w-[10rem] truncate text-xs font-semibold text-[var(--text-primary)]">
                  {currentUser?.fullName || "CMS User"}
                </span>
                <span className="block max-w-[10rem] truncate text-[11px] text-[var(--text-secondary)]">
                  {roleLabel}
                </span>
              </span>
              <span className="text-xs text-[var(--text-secondary)]">
                {isProfileMenuOpen ? "▲" : "▼"}
              </span>
            </button>

            {isProfileMenuOpen && (
              <div
                role="menu"
                className="absolute right-0 z-40 mt-2 w-44 rounded-2xl border border-[var(--border)] bg-(--surface) p-1 shadow-xl"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    void handleLogoutClick();
                  }}
                  className="w-full rounded-xl px-3 py-2 text-left text-sm text-rose-500 transition hover:bg-rose-50 dark:hover:bg-rose-950/30"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default TopbarComponent;
