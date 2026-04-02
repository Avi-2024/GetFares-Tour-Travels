import { Component } from "react";
import type { SyntheticEvent } from "react";
import { Button } from "../../../shared/components/button.component";

interface LoginFormProps {
  username: string;
  password: string;
  showPassword: boolean;
  remember: boolean;
  loading: boolean;
  error: string;
  theme: "light" | "dark";
  onUsernameChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onTogglePassword: () => void;
  onRememberChange: (checked: boolean) => void;
  onSubmit: () => void;
}

class LoginFormTheme {
  private readonly isDark: boolean;

  constructor(theme: "light" | "dark") {
    this.isDark = theme === "dark";
  }

  public section(): string {
    return `flex items-center justify-center px-6 py-12 lg:px-10 ${
      this.isDark ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"
    }`;
  }

  public card(): string {
    return `rounded-3xl border p-8 shadow-[0_25px_80px_rgba(59,130,246,0.15)] ${
      this.isDark ? "border-slate-800 bg-slate-900/95" : "border-slate-200/70 bg-white"
    }`;
  }

  public title(): string {
    return `text-lg font-semibold ${this.isDark ? "text-slate-100" : "text-slate-900"}`;
  }

  public heading(): string {
    return `text-2xl font-semibold ${this.isDark ? "text-slate-100" : "text-slate-900"}`;
  }

  public subText(): string {
    return `text-sm ${this.isDark ? "text-slate-400" : "text-slate-500"}`;
  }

  public label(): string {
    return `text-sm font-medium ${this.isDark ? "text-slate-300" : "text-slate-700"}`;
  }

  public input(): string {
    return `w-full rounded-xl border py-3 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 ${
      this.isDark
        ? "border-slate-700 bg-slate-950 text-slate-100 placeholder:text-slate-500 focus:ring-blue-900/60"
        : "border-slate-200 bg-white text-slate-900 placeholder:text-slate-400"
    }`;
  }

  public checkbox(): string {
    return `h-4 w-4 rounded border-slate-300 text-blue-600 ${
      this.isDark ? "border-slate-600 bg-slate-900" : ""
    }`;
  }

  public link(): string {
    return `font-medium ${
      this.isDark ? "text-blue-400 hover:text-blue-300" : "text-blue-600 hover:text-blue-700"
    }`;
  }

  public error(): string {
    return `text-center text-sm ${this.isDark ? "text-red-400" : "text-red-600"}`;
  }

  public footer(): string {
    return `mt-6 text-center text-xs ${this.isDark ? "text-slate-500" : "text-slate-400"}`;
  }

  public brand(): string {
    return `text-xs font-semibold uppercase tracking-[0.2em] ${
      this.isDark ? "text-blue-400" : "text-blue-600"
    }`;
  }

  public statusBadge(): string {
    return `flex h-8 w-8 items-center justify-center rounded-lg border text-emerald-500 ${
      this.isDark
        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
        : "border-emerald-100 bg-emerald-50"
    }`;
  }

  public mutedText(): string {
    return `flex items-center gap-2 ${this.isDark ? "text-slate-400" : "text-slate-600"}`;
  }

  public eyeButton(): string {
    return `absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 transition-colors ${
      this.isDark ? "hover:text-slate-300" : "hover:text-slate-600"
    }`;
  }
}

export class LoginForm extends Component<LoginFormProps> {
  private handleSubmit = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    this.props.onSubmit();
  };

  render() {
    const {
      username,
      password,
      showPassword,
      remember,
      loading,
      error,
      theme,
      onUsernameChange,
      onPasswordChange,
      onTogglePassword,
      onRememberChange,
    } = this.props;
    const themeTokens = new LoginFormTheme(theme);

    return (
      <section className={themeTokens.section()}>
        <div className="w-full max-w-md">
          <div className={themeTokens.card()}>
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl">
                <img
                  src="/logo1.png"
                  alt="Get2Vacation CMS"
                  className="h-8 w-6"
                />
              </div>
              <div>
                <p className={themeTokens.brand()}>GET2VACATION CMS</p>
                <p className={themeTokens.title()}>Sign in to continue</p>
              </div>
            </div>

            <div className="mb-6">
              <h2 className={themeTokens.heading()}>Welcome back</h2>
              <p className={themeTokens.subText()}>
                Use your admin or team credentials to enter the workspace.
              </p>
            </div>

            <form className="space-y-5" onSubmit={this.handleSubmit}>
              <div>
                <label className={themeTokens.label()}>Email address</label>
                <div className="relative mt-2">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M4 4h16v16H4z" opacity="0" />
                      <rect x="3" y="5" width="18" height="14" rx="2" />
                      <path d="M3 7l9 6 9-6" />
                    </svg>
                  </div>
                  <input
                    type="email"
                    value={username}
                    onChange={(event) => onUsernameChange(event.target.value)}
                    placeholder="admin@travel-cms.com"
                    disabled={loading}
                    className={`${themeTokens.input()} pl-10 pr-12`}
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    <div className={themeTokens.statusBadge()}>
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <rect x="3" y="5" width="18" height="14" rx="2" />
                        <path d="M3 7l9 6 9-6" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className={themeTokens.label()}>Password</label>
                <div className="relative mt-2">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <rect x="3" y="11" width="18" height="10" rx="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => onPasswordChange(event.target.value)}
                    placeholder="Enter your password"
                    disabled={loading}
                    className={`${themeTokens.input()} pl-10 pr-10`}
                  />
                  <button
                    type="button"
                    onClick={onTogglePassword}
                    className={themeTokens.eyeButton()}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ?
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.75"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    : <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.75"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    }
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <label className={themeTokens.mutedText()}>
                  <input
                    type="checkbox"
                    className={themeTokens.checkbox()}
                    checked={remember}
                    onChange={(event) => onRememberChange(event.target.checked)}
                    disabled={loading}
                  />
                  Remember me
                </label>
                <a href="/forgot-password" className={themeTokens.link()}>
                  Forgot password?
                </a>
              </div>

              <Button
                type="submit"
                className="w-full justify-center gap-2 rounded-xl bg-blue-600 py-3.5 text-white shadow-md shadow-blue-500/30 hover:bg-blue-700"
                disabled={loading}
              >
                {loading ? "Signing in..." : "Sign in"}
                {!loading && (
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M5 12h14" />
                    <path d="M13 5l6 7-6 7" />
                  </svg>
                )}
              </Button>

              {error && <p className={themeTokens.error()}>{error}</p>}
            </form>
          </div>

          <p className={themeTokens.footer()}>Powered by Get2Vacation CMS</p>
        </div>
      </section>
    );
  }
}
