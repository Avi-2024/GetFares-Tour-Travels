import { Component } from "react";
import { Navigate } from "react-router-dom";

import { LoginForm } from "./components/LoginForm";
import { LoginSidebar } from "./components/LoginSidebar";
import { serviceContainer } from "../../shared/core/service.container";
import {
  ThemeContext,
  type IThemeContext,
} from "../../shared/contexts/ThemeContext";
import ThemeToggle from "../../shared/components/theme.component";

interface LoginPageState {
  loading: boolean;
  username: string;
  password: string;
  showPassword: boolean;
  remember: boolean;
  error: string;
  redirectToCms: boolean;
}

class LoginPage extends Component<object, LoginPageState> {
  static contextType = ThemeContext;
  declare context: IThemeContext;
  private readonly authService = serviceContainer.getAuthService();

  state: LoginPageState = {
    loading: false,
    username: "",
    password: "",
    showPassword: false,
    remember: false,
    error: "",
    redirectToCms: false,
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

    try {
      const result = await this.authService.login(username, password);
      if (result === true) {
        this._setState("error", "");
        this._setState("redirectToCms", true);
      } else {
        this._setState("error", result || "Unable to sign in.");
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to sign in.";
      this._setState("error", message);
    } finally {
      this._setState("loading", false);
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
      redirectToCms,
    } = this.state;
    const { theme } = this.context;

    if (redirectToCms) {
      return <Navigate to="/cms/landing-places" replace />;
    }

    return (
      <main className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-900 dark:text-slate-100">
        <div className="relative min-h-screen overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(37,99,235,0.18),transparent_55%)] dark:bg-[radial-gradient(circle_at_top,rgba(37,99,235,0.08),transparent_55%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(6,182,212,0.14),transparent_45%)] dark:bg-[radial-gradient(circle_at_bottom_left,rgba(6,182,212,0.06),transparent_45%)]" />

          <div className="relative z-10 grid min-h-screen lg:grid-cols-[1.1fr_0.9fr]">
            <LoginSidebar />
            <LoginForm
              theme={theme}
              username={username}
              password={password}
              showPassword={showPassword}
              remember={remember}
              loading={loading}
              error={error}
              onUsernameChange={(value) => this._setState("username", value)}
              onPasswordChange={(value) => this._setState("password", value)}
              onTogglePassword={() =>
                this._setState("showPassword", !showPassword)
              }
              onRememberChange={(checked) =>
                this._setState("remember", checked)
              }
              onSubmit={this.handleSubmit}
            />
          </div>
        </div>
      </main>
    );
  }
}

export default LoginPage;
