import { Component } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import LoginPage from "./modules/auth/login.page";
import NotFoundPage from "./modules/not_found/not_found.page";
import ThemeToggle from "./shared/components/theme.component";
import { ThemeProvider } from "./shared/contexts/theme.context";

/**
 * Main Application Component
 * Single Responsibility: Application routing and layout
 */
class App extends Component {
  render() {
    return (
      <ThemeProvider defaultTheme="light">
        <BrowserRouter>
          <div className="fixed right-4 top-4 z-50">
            <ThemeToggle />
          </div>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    );
  }
}

export default App;
