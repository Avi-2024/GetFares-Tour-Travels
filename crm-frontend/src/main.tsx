import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "sonner";
import "./index.css";
import App from "./App.tsx";
import { AuthProvider } from "./context/AuthContext.tsx";
import { DateTimePreferencesProvider } from "./context/DateTimePreferencesContext.tsx";
import { NotificationsProvider } from "./context/NotificationsContext.tsx";
import { ServiceProvider } from "./context/ServiceContext.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <DateTimePreferencesProvider>
        <ServiceProvider>
          <NotificationsProvider>
            <App />
            <Toaster richColors position="top-right" closeButton />
          </NotificationsProvider>
        </ServiceProvider>
      </DateTimePreferencesProvider>
    </AuthProvider>
  </StrictMode>,
);

// this is comment
