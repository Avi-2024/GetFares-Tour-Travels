import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { AuthProvider } from "./context/AuthContext.tsx";
import { NotificationsProvider } from "./context/NotificationsContext.tsx";
import { ServiceProvider } from "./context/ServiceContext.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <ServiceProvider>
        <NotificationsProvider>
          <App />
        </NotificationsProvider>
      </ServiceProvider>
    </AuthProvider>
  </StrictMode>,
);
