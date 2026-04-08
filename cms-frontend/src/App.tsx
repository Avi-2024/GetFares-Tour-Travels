import { Component } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import LoginPage from "./modules/auth/login.page";
import CmsSectionPage from "./modules/cms/cms-section.page";
import { cmsRouteDefinitions } from "./modules/cms/cms-route.config";
import MainLayout from "./modules/layout/layout";
import NotFoundPage from "./modules/not_found/not_found.page";
import { ThemeProvider } from "./shared/contexts/theme.context";

class App extends Component {
  render() {
    return (
      <ThemeProvider defaultTheme="light">
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/cms"
              element={<Navigate to="/cms/landing-places" replace />}
            />
            <Route
              path="/dashboard"
              element={<Navigate to="/cms/landing-places" replace />}
            />
            {cmsRouteDefinitions.map((route) => (
              <Route
                key={route.path}
                path={route.path}
                element={
                  <MainLayout
                    title={route.title}
                    subtitle={route.subtitle} 
                    breadcrumb={route.breadcrumb}
                  >
                    <CmsSectionPage sectionKey={route.sectionKey} />
                  </MainLayout>
                }
              />
            ))}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    );
  }
}

export default App;
