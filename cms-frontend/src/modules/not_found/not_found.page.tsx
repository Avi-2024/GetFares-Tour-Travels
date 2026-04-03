import { Component } from "react";

class NotFoundPage extends Component {
  render() {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)] px-6 text-[var(--text-primary)]">
        <div className="surface-card-elevated max-w-md space-y-4 p-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--primary)]">
            Page not found
          </p>
          <h1 className="font-display text-3xl font-semibold">
            We could not find that screen
          </h1>
          <p className="text-sm text-[var(--text-secondary)]">
            The Get2Vacation CMS route you tried does not exist yet. Head back
            to the login screen to continue.
          </p>
          <a
            href="/login"
            className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] px-4 py-2 text-sm font-semibold text-white"
          >
            Go to login
          </a>
        </div>
      </div>
    );
  }
}

export default NotFoundPage;
