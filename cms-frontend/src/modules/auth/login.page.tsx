import { Component } from "react";
import "./Login.page.css";

interface LoginPageState {
  loading: boolean;
  username: string;
  password: string;
  showPassword: boolean;
  remember: boolean;
  error: string;
}

class LoginPage extends Component<object, LoginPageState> {
  state: LoginPageState = {
    loading: false,
    username: "",
    password: "",
    showPassword: false,
    remember: false,
    error: "",
  };

  private _setState = <K extends keyof LoginPageState>(
    key: K,
    value: LoginPageState[K],
  ) => {
    this.setState({ [key]: value } as Pick<LoginPageState, K>);
  };

  private handleSubmit = async () => {
    const { username, password } = this.state;
    if (!username || !password) {
      this._setState("error", "Please enter your credentials.");
      return;
    }
    this._setState("error", "");
    this._setState("loading", true);
    // Simulate API call — replace with real auth logic
    await new Promise((r) => setTimeout(r, 1600));
    this._setState("loading", false);
    this._setState("error", "Invalid username or password.");
  };

  render() {
    const { username, password, showPassword, remember, loading, error } =
      this.state;

    return (
      <div className="login-root">
        {/* ── Left decorative panel ── */}
        <aside className="login-mural">
          <div className="login-mural__grid" />
          <div className="login-mural__orb login-mural__orb--1" />
          <div className="login-mural__orb login-mural__orb--2" />
          <span className="login-mural__version">v4.2.1</span>
          <div className="login-mural__tagline">
            <h2>
              Content shaped with <em>intention.</em>
              <br />
              Published with precision.
            </h2>
            <p>MANAGE · PUBLISH · ANALYSE</p>
          </div>
        </aside>

        {/* ── Right form panel ── */}
        <main className="login-panel">
          {/* Brand */}
          <div className="login-brand">
            <div className="login-brand__logo">
              <div className="login-brand__icon">
                <svg
                  viewBox="0 0 32 32"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <rect
                    x="2"
                    y="2"
                    width="28"
                    height="28"
                    rx="6"
                    stroke="#c8a96e"
                    strokeWidth="1.5"
                  />
                  <rect
                    x="7"
                    y="8"
                    width="12"
                    height="1.5"
                    rx="0.75"
                    fill="#c8a96e"
                  />
                  <rect
                    x="7"
                    y="12"
                    width="18"
                    height="1.5"
                    rx="0.75"
                    fill="#c8a96e"
                    fillOpacity="0.5"
                  />
                  <rect
                    x="7"
                    y="16"
                    width="15"
                    height="1.5"
                    rx="0.75"
                    fill="#c8a96e"
                    fillOpacity="0.5"
                  />
                  <rect
                    x="7"
                    y="20"
                    width="10"
                    height="1.5"
                    rx="0.75"
                    fill="#c8a96e"
                    fillOpacity="0.3"
                  />
                </svg>
              </div>
              <span className="login-brand__name">Prism CMS</span>
            </div>
            <div className="login-brand__sub">Content Management</div>
          </div>

          {/* Heading */}
          <div className="login-heading">
            <h1>Welcome back.</h1>
            <p>Sign in to your workspace to continue.</p>
          </div>

          {/* Form */}
          <div className="login-form">
            {/* Username */}
            <div className="login-field">
              <label className="login-field__label" htmlFor="cms-username">
                Username or Email
              </label>
              <div className="login-field__input-wrap">
                <input
                  id="cms-username"
                  className="login-field__input"
                  type="text"
                  placeholder="you@organisation.com"
                  autoComplete="username"
                  value={username}
                  disabled={loading}
                  onChange={(e) => this._setState("username", e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && this.handleSubmit()}
                />
              </div>
            </div>

            {/* Password */}
            <div className="login-field">
              <label className="login-field__label" htmlFor="cms-password">
                Password
              </label>
              <div className="login-field__input-wrap">
                <input
                  id="cms-password"
                  className="login-field__input"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                  value={password}
                  disabled={loading}
                  onChange={(e) => this._setState("password", e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && this.handleSubmit()}
                  style={{ paddingRight: "2.75rem" }}
                />
                <button
                  type="button"
                  className="login-field__reveal"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => this._setState("showPassword", !showPassword)}
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
                    >
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  }
                </button>
              </div>
            </div>

            {/* Remember + Forgot */}
            <div className="login-row">
              <label className="login-checkbox-label">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => this._setState("remember", e.target.checked)}
                />
                Keep me signed in
              </label>
              <a href="/forgot-password" className="login-forgot">
                Forgot password?
              </a>
            </div>

            {/* Error */}
            {error && (
              <div className="login-error" role="alert">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              className="login-submit"
              disabled={loading}
              onClick={this.handleSubmit}
            >
              {loading && <span className="login-submit__spinner" />}
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </div>

          {/* Footer */}
          <footer className="login-footer">
            <span>© 2026 Prism CMS</span>
            <span>
              <a href="/privacy">Privacy</a>
              {" · "}
              <a href="/terms">Terms</a>
              {" · "}
              <a href="/support">Support</a>
            </span>
          </footer>
        </main>
      </div>
    );
  }
}

export default LoginPage;
