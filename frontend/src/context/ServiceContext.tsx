import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { createApiClient, type ApiClient } from "../api/apiClient";
import { createAuthDatasource } from "../datasource/authDatasource";
import { createLeadsDatasource } from "../datasource/leadsDatasource";
import { createAuthService, type AuthService } from "../services/authService";
import { createLeadsService, type LeadsService } from "../services/leadsService";
import { useAuth } from "./AuthContext";

export type ServiceContextValue = {
  authService: AuthService;
  leadsService: LeadsService;
};

const ServiceContext = createContext<ServiceContextValue | null>(null);

export const ServiceProvider = ({ children }: { children: ReactNode }) => {
  const { token, logout } = useAuth();
  const apiClientRef = useRef<ApiClient | null>(null);

  if (!apiClientRef.current) {
    apiClientRef.current = createApiClient({
      getAuthToken: () => token,
    });
  }

  const apiClient = apiClientRef.current;
  if (!apiClient) return null;

  useEffect(() => {
    apiClient.setAuthTokenProvider(() => token);
    apiClient.setOnUnauthorized(() => logout());
  }, [apiClient, token, logout]); 

  const services = useMemo<ServiceContextValue>(() => {
    const authDatasource = createAuthDatasource(apiClient);
    const leadsDatasource = createLeadsDatasource(apiClient);

    return {
      authService: createAuthService(authDatasource),
      leadsService: createLeadsService(leadsDatasource),
    };
  }, [apiClient]);

  return <ServiceContext.Provider value={services}>{children}</ServiceContext.Provider>;
};

export const useServices = () => {
  const context = useContext(ServiceContext);
  if (!context) {
    throw new Error("useServices must be used within a ServiceProvider.");
  }
  return context;
};
