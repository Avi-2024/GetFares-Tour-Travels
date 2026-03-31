import { Component } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import LoginPage from "./modules/auth/login.page";

class NotFoundPage extends Component {
  render() {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-6 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
        <div className="max-w-md space-y-4 rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-600 dark:text-blue-400">
            Page not found
          </p>
          <h1 className="font-display text-3xl font-semibold">
            We could not find that screen
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            The Get2Vacation CMS route you tried does not exist yet. Head back
            to the login screen to continue.
          </p>
          <a
            href="/login"
            className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
          >
            Go to login
          </a>
        </div>
      </div>
    );
  }
}

class ThemeToggle extends Component<{
  theme: "light" | "dark";
  onToggle: () => void;
}> {
  render() {
    const { theme, onToggle } = this.props;
    const isDark = theme === "dark";

    return (
      <button
        type="button"
        onClick={onToggle}
        className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
        aria-label="Toggle theme"
      >
        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-300">
          {isDark ?
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z" />
            </svg>
          : <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2" />
              <path d="M12 20v2" />
              <path d="M4.93 4.93l1.41 1.41" />
              <path d="M17.66 17.66l1.41 1.41" />
              <path d="M2 12h2" />
              <path d="M20 12h2" />
              <path d="M4.93 19.07l1.41-1.41" />
              <path d="M17.66 6.34l1.41-1.41" />
            </svg>
          }
        </span>
        {isDark ? "Dark" : "Light"}
      </button>
    );
  }
}

class App extends Component<object, { theme: "light" | "dark" }> {
  state = {
    theme: "light" as "light" | "dark",
  };

  componentDidMount() {
    const savedTheme =
      typeof window !== "undefined" ?
        window.localStorage.getItem("theme")
      : null;
    const nextTheme =
      savedTheme === "light" || savedTheme === "dark" ? savedTheme : "light";
    this.applyTheme(nextTheme);
  }

  private applyTheme = (theme: "light" | "dark") => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("theme", theme);
    }
    this.setState({ theme });
  };

  private handleToggleTheme = () => {
    this.applyTheme(this.state.theme === "dark" ? "light" : "dark");
  };

  render() {
    const { theme } = this.state;

    return (
      <BrowserRouter>
        <div className={theme === "dark" ? "dark fixed right-4 top-4 z-50" : "fixed right-4 top-4 z-50"}>
          <ThemeToggle theme={theme} onToggle={this.handleToggleTheme} />
        </div>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<LoginPage theme={theme} />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    );
  }
}

export default App;
