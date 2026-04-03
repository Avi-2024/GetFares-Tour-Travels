import { Component } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import LoginPage from "./modules/auth/login.page";
import CmsSectionPage from "./modules/cms/cms-section.page";
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

            <Route
              path="/cms/landing-places"
              element={
                <MainLayout
                  title="Landing Places"
                  subtitle="Manage hero cards, highlights, and storytelling entry points."
                  breadcrumb="CMS / Landing Places"
                >
                  <CmsSectionPage sectionKey="landing-places" />
                </MainLayout>
              }
            />

            <Route
              path="/cms/destinations"
              element={
                <MainLayout
                  title="Destinations"
                  subtitle="Curate regional content, gallery assets, and SEO layers."
                  breadcrumb="CMS / Destinations"
                >
                  <CmsSectionPage sectionKey="destinations" />
                </MainLayout>
              }
            />

            <Route
              path="/cms/packages/published"
              element={
                <MainLayout
                  title="Published Packages"
                  subtitle="Mirror CRM-ready inventory into CMS experience layers."
                  breadcrumb="CMS / Packages / Published"
                >
                  <CmsSectionPage sectionKey="published-packages" />
                </MainLayout>
              }
            />

            <Route
              path="/cms/packages/main"
              element={
                <MainLayout
                  title="Main Packages"
                  subtitle="Build high-level package narratives and featured blocks."
                  breadcrumb="CMS / Packages / Main"
                >
                  <CmsSectionPage sectionKey="main-packages" />
                </MainLayout>
              }
            />

            <Route
              path="/cms/packages/sub"
              element={
                <MainLayout
                  title="Sub Packages"
                  subtitle="Manage modular itinerary units nested under main packages."
                  breadcrumb="CMS / Packages / Sub"
                >
                  <CmsSectionPage sectionKey="sub-packages" />
                </MainLayout>
              }
            />

            <Route
              path="/cms/visa-destinations"
              element={
                <MainLayout
                  title="Visa Destinations"
                  subtitle="Organize visa destinations with country and regional grouping."
                  breadcrumb="CMS / Visa / Destinations"
                >
                  <CmsSectionPage sectionKey="visa-destinations" />
                </MainLayout>
              }
            />

            <Route
              path="/cms/visa-details"
              element={
                <MainLayout
                  title="Visa Details"
                  subtitle="Manage requirement lists, notes, FAQs, and supporting documents."
                  breadcrumb="CMS / Visa / Details"
                >
                  <CmsSectionPage sectionKey="visa-details" />
                </MainLayout>
              }
            />

            <Route
              path="/cms/creative-toolkit"
              element={
                <MainLayout
                  title="Creative Toolkit"
                  subtitle="Templates, brand assets, and reusable campaign blocks."
                  breadcrumb="CMS / Experience / Creative Toolkit"
                >
                  <CmsSectionPage sectionKey="creative-toolkit" />
                </MainLayout>
              }
            />

            <Route
              path="/cms/destination-map"
              element={
                <MainLayout
                  title="Destination Map"
                  subtitle="Geo-clustered destination planning and content density checks."
                  breadcrumb="CMS / Experience / Destination Map"
                >
                  <CmsSectionPage sectionKey="destination-map" />
                </MainLayout>
              }
            />

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    );
  }
}

export default App;
