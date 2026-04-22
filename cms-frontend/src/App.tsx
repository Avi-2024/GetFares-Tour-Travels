import { Component } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import LoginPage from "./modules/auth/login.page";
import CmsDeletedPage from "./modules/cms/cms-deleted.page";
import CmsSectionPage from "./modules/cms/cms-section.page";
import { cmsRouteDefinitions } from "./modules/cms/cms-route.config";
import MainLayout from "./modules/layout/layout";
import NotFoundPage from "./modules/not_found/not_found.page";
import ToastViewportComponent from "./shared/components/toast-viewport.component";
import { ThemeProvider } from "./shared/contexts/theme.context";

class App extends Component {
  render() {
    return (
      <ThemeProvider defaultTheme="light">
        <BrowserRouter>
          <ToastViewportComponent />
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
            <Route
              path="/cms/deleted"
              element={
                <MainLayout
                  title="Deleted Objects"
                  subtitle="Review and permanently remove deleted CMS records."
                  breadcrumb="CMS / Deleted Objects"
                >
                  <CmsDeletedPage />
                </MainLayout>
              }
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
