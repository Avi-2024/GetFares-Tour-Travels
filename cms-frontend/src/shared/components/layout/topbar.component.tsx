import { Component } from "react";
import ThemeToggle from "../theme.component";

interface TopbarProps {
  title: string;
  subtitle: string;
  breadcrumb: string;
}

class TopbarComponent extends Component<TopbarProps> {
  render() {
    const { title } = this.props;

    return (
      <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--surface-muted)] px-6 py-3 backdrop-blur-xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-display text-2xl font-semibold text-[var(--text-primary)]">
            {title}
          </h1>

          <div className="flex items-center gap-3">
            <ThemeToggle />

            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5"
            >
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] text-xs font-bold text-white">
                AN
              </span>
              <span className="hidden text-left sm:block">
                <span className="block text-xs font-semibold text-[var(--text-primary)]">
                  Admin User
                </span>
                <span className="block text-[11px] text-[var(--text-secondary)]">
                  CMS Manager
                </span>
              </span>
            </button>
          </div>
        </div>
      </header>
    );
  }
}

export default TopbarComponent;
