import { Component } from "react";
import type { KeyboardEvent } from "react";

import { Button } from "../../../shared/components/Button";
import { Card } from "../../../shared/components/Card";
import { TextField } from "../../../shared/components/TextField";

interface LoginFormProps {
  username: string;
  password: string;
  showPassword: boolean;
  remember: boolean;
  loading: boolean;
  error: string;
  onUsernameChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onTogglePassword: () => void;
  onRememberChange: (checked: boolean) => void;
  onSubmit: () => void;
}

export class LoginForm extends Component<LoginFormProps> {
  private handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      this.props.onSubmit();
    }
  };

  render() {
    const {
      username,
      password,
      showPassword,
      remember,
      loading,
      error,
      onUsernameChange,
      onPasswordChange,
      onTogglePassword,
      onRememberChange,
      onSubmit,
    } = this.props;

    return (
      <main className="flex flex-1 items-center justify-center px-6 py-12 sm:px-10">
        <Card className="w-full max-w-md space-y-8">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-300">
              Welcome back
            </p>
            <div>
              <h1 className="font-['Space_Grotesk'] text-3xl font-semibold text-mist-50">
                Sign in to your workspace
              </h1>
              <p className="mt-2 text-sm text-mist-200/80">
                Keep projects moving with secure, unified access.
              </p>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-3 rounded-2xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
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
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {error}
            </div>
          )}

          <div className="space-y-6">
            <TextField
              id="cms-username"
              label="Username or Email"
              type="text"
              placeholder="you@organisation.com"
              autoComplete="username"
              value={username}
              disabled={loading}
              onChange={(event) => onUsernameChange(event.target.value)}
              onKeyDown={this.handleKeyDown}
              startIcon={
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              }
            />

            <TextField
              id="cms-password"
              label="Password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••••••"
              autoComplete="current-password"
              value={password}
              disabled={loading}
              onChange={(event) => onPasswordChange(event.target.value)}
              onKeyDown={this.handleKeyDown}
              startIcon={
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="11" width="18" height="10" rx="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              }
              endAdornment={
                <button
                  type="button"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full text-mist-200/70 transition hover:bg-white/10 hover:text-mist-50"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={onTogglePassword}
                >
                  {showPassword ? (
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              }
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-mist-200/80">
            <label className="flex items-center gap-2">
              <input
                className="h-4 w-4 rounded border-white/20 bg-white/10 text-brand-400 focus:ring-brand-300"
                type="checkbox"
                checked={remember}
                onChange={(event) => onRememberChange(event.target.checked)}
              />
              Keep me signed in
            </label>
            <a
              href="/forgot-password"
              className="text-brand-300 transition hover:text-brand-200"
            >
              Forgot password?
            </a>
          </div>

          <Button
            className="w-full bg-brand-500 text-ink-950 shadow-glow hover:bg-brand-400"
            disabled={loading}
            onClick={onSubmit}
          >
            {loading && (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-ink-950/30 border-t-ink-950" />
            )}
            {loading ? "Signing in…" : "Sign in"}
          </Button>

          <div className="flex items-center justify-between text-xs text-mist-200/60">
            <span>Need help?</span>
            <a href="/support" className="text-brand-300 hover:text-brand-200">
              Contact support
            </a>
          </div>
        </Card>
      </main>
    );
  }
}
