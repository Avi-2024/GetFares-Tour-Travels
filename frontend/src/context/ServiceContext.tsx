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
import { createCampaignsDatasource } from "../datasource/campaignsDatasource";
import { createCustomersDatasource } from "../datasource/customersDatasource";
import { createBookingsDatasource } from "../datasource/bookingsDatasource";
import { createComplaintsDatasource } from "../datasource/complaintsDatasource";
import { createUsersDatasource } from "../datasource/usersDatasource";
import { createNotificationsDatasource } from "../datasource/notificationsDatasource";
import { createAuthService, type AuthService } from "../services/authService";
import {
  createLeadsService,
  type LeadsService,
} from "../services/leadsService";
import {
  createCampaignsService,
  type CampaignsService,
} from "../services/campaignsService";
import {
  createCustomersService,
  type CustomersService,
} from "../services/customersService";
import {
  createBookingsService,
  type BookingsService,
} from "../services/bookingsService";
import {
  createComplaintsService,
  type ComplaintsService,
} from "../services/complaintsService";
import {
  createUsersService,
  type UsersService,
} from "../services/usersService";
import {
  createNotificationsService,
  type NotificationsService,
} from "../services/notificationsService";
import { useAuth } from "./AuthContext";

export type ServiceContextValue = {
  authService: AuthService;
  leadsService: LeadsService;
  campaignsService: CampaignsService;
  customersService: CustomersService;
  bookingsService: BookingsService;
  complaintsService: ComplaintsService;
  usersService: UsersService;
  notificationsService: NotificationsService;
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
    const campaignsDatasource = createCampaignsDatasource(apiClient);
    const customersDatasource = createCustomersDatasource(apiClient);
    const bookingsDatasource = createBookingsDatasource(apiClient);
    const complaintsDatasource = createComplaintsDatasource(apiClient);
    const usersDatasource = createUsersDatasource(apiClient);
    const notificationsDatasource = createNotificationsDatasource(apiClient);

    return {
      authService: createAuthService(authDatasource),
      leadsService: createLeadsService(leadsDatasource),
      campaignsService: createCampaignsService(campaignsDatasource),
      customersService: createCustomersService(customersDatasource),
      bookingsService: createBookingsService(bookingsDatasource),
      complaintsService: createComplaintsService(complaintsDatasource),
      usersService: createUsersService(usersDatasource),
      notificationsService: createNotificationsService(notificationsDatasource),
    };
  }, [apiClient]);

  return (
    <ServiceContext.Provider value={services}>
      {children}
    </ServiceContext.Provider>
  );
};

export const useServices = () => {
  const context = useContext(ServiceContext);
  if (!context) {
    throw new Error("useServices must be used within a ServiceProvider.");
  }
  return context;
};
