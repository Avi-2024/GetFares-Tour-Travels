import { Component } from "react";

import { LoginForm } from "./components/LoginForm";
import { LoginSidebar } from "./components/LoginSidebar";

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
      <div className="relative min-h-screen overflow-hidden bg-ink-950 text-mist-50">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-40 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-brand-500/20 blur-[120px]" />
          <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-white/5 blur-[120px]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(92,199,255,0.12),_transparent_55%)]" />
        </div>

        <div className="relative z-10 flex min-h-screen flex-col lg:flex-row">
          <LoginSidebar />
          <LoginForm
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
            onRememberChange={(checked) => this._setState("remember", checked)}
            onSubmit={this.handleSubmit}
          />
        </div>
      </div>
    );
  }
}

export default LoginPage;
