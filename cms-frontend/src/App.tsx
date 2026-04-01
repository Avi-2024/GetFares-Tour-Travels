import { Component } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import LoginPage from "./modules/auth/login.page";
import storageService from "./shared/services/storage.service";
import NotFoundPage from "./modules/main/not_fount.page";
import ThemeToggle from "./shared/components/theme.component";

class App extends Component<object, { theme: "light" | "dark" }> {
  state = {
    theme: "light" as "light" | "dark",
  };

  componentDidMount() {
    const savedTheme = storageService.theme._getTheme();
    const nextTheme =
      savedTheme === "light" || savedTheme === "dark" ? savedTheme : "light";
    this.applyTheme(nextTheme);
  }

  private applyTheme = (theme: "light" | "dark") => {
    storageService.theme._setTheme(theme);
    this.setState({ theme });
  };

  private handleToggleTheme = () => {
    this.applyTheme(this.state.theme === "dark" ? "light" : "dark");
  };

  render() {
    const { theme } = this.state;

    return (
      <BrowserRouter>
        <div
          className={
            theme === "dark" ?
              "dark fixed right-4 top-4 z-50"
            : "fixed right-4 top-4 z-50"
          }
        >
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
