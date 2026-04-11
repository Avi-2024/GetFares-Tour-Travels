import { Component } from "react";
import ThemeToggle from "../theme.component";
import { serviceContainer } from "../../core/service.container";

interface TopbarProps {
  title: string;
  subtitle: string;
  breadcrumb: string;
}

interface TopbarState {
  isProfileMenuOpen: boolean;
}

class TopbarComponent extends Component<TopbarProps, TopbarState> {
  private readonly authService = serviceContainer.getAuthService();
  private profileMenuRef: HTMLDivElement | null = null;

  public state: TopbarState = {
    isProfileMenuOpen: false,
  };

  public componentDidMount(): void {
    document.addEventListener("mousedown", this.handleDocumentClick);
    document.addEventListener("keydown", this.handleEscapeKey);
  }

  public componentWillUnmount(): void {
    document.removeEventListener("mousedown", this.handleDocumentClick);
    document.removeEventListener("keydown", this.handleEscapeKey);
  }

  private setProfileMenuRef = (node: HTMLDivElement | null): void => {
    this.profileMenuRef = node;
  };

  private handleDocumentClick = (event: MouseEvent): void => {
    if (!this.profileMenuRef) return;
    if (this.profileMenuRef.contains(event.target as Node)) return;
    this.setState({ isProfileMenuOpen: false });
  };

  private handleEscapeKey = (event: KeyboardEvent): void => {
    if (event.key !== "Escape") return;
    this.setState({ isProfileMenuOpen: false });
  };

  private toggleProfileMenu = (): void => {
    this.setState((prevState) => ({
      isProfileMenuOpen: !prevState.isProfileMenuOpen,
    }));
  };

  private handleLogoutClick = async (): Promise<void> => {
    this.setState({ isProfileMenuOpen: false });
    await this.authService.logout();
    window.location.replace("/login");
  };

  render() {
    const { isProfileMenuOpen } = this.state;
    const { title } = this.props;
    const currentUser = this.authService.getCurrentUser();
    const initials = (currentUser?.fullName || "CMS User")
      .split(" ")
      .map((chunk) => chunk.charAt(0))
      .join("")
      .slice(0, 2)
      .toUpperCase();
    const roleLabel =
      currentUser?.role ? currentUser.role.replace(/_/g, " ") : "CMS Access";

    return (
      <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--surface-muted)] px-6 py-3 backdrop-blur-xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-display text-2xl font-semibold text-[var(--text-primary)]">
            {title}
          </h1>

          <div className="flex items-center gap-3">
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
            <ThemeToggle />

            <div className="relative" ref={this.setProfileMenuRef}>
              <button
                type="button"
                aria-expanded={isProfileMenuOpen}
                aria-haspopup="menu"
                onClick={this.toggleProfileMenu}
                className="inline-flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 transition hover:border-[var(--primary)]/30 hover:bg-[var(--surface-muted)]"
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] text-xs font-bold text-white">
                  {initials}
                </span>
                <span className="hidden text-left sm:block">
                  <span className="block text-xs font-semibold text-[var(--text-primary)]">
                    {currentUser?.fullName || "CMS User"}
                  </span>
                  <span className="block text-[11px] text-[var(--text-secondary)]">
                    {roleLabel}
                  </span>
                </span>
                <span className="text-xs text-[var(--text-secondary)]">
                  {isProfileMenuOpen ? "▲" : "▼"}
                </span>
              </button>

              {isProfileMenuOpen ? (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-48 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-1 shadow-xl"
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      void this.handleLogoutClick();
                    }}
                    className="w-full rounded-xl px-3 py-2 text-left text-sm text-rose-500 transition hover:bg-rose-50 dark:hover:bg-rose-950/30"
                  >
                    Logout
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </header>
    );
  }
}

export default TopbarComponent;
