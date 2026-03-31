import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
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
          </NotificationsProvider>
        </ServiceProvider>
      </DateTimePreferencesProvider>
    </AuthProvider>
  </StrictMode>,
);

// this is comment
