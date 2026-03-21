import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/auth/Login";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";
import Dashboard from "./pages/core/Dashboard";
import Leads from "./pages/leads/Leads";
import BookingsPage from "./pages/Booking/BookingsPage";
import QuotationsPage from "./pages/Quotation/QuotationsPage";
import QuotationBuilderPage from "./pages/Quotation/QuotationBuilderPage";
import QuotationDetailPage from "./pages/Quotation/QuotationDetailPage";
import Settings from "./components/layout/Settings";

import LeadsDetail from "./pages/leads/LeadDetails";
import CreateLead from "./pages/leads/CreateLead";

import DashboardLayout from "./components/layout/Layout";
import Payments from "./components/layout/Payments";
import PermissionRoute from "./components/ui/PermissionRoute";
import RefundsPage from "./pages/refunds/RefundsPage";
import VisaCasesPage from "./pages/visa/VisaCasesPage";
import VisaDetailPage from "./pages/visa/VisaDetailPage";
import ComplaintsPage from "./pages/complaints/ComplaintsPage";
import ReportsHubPage from "./pages/reports/ReportsHubPage";
import QuotationTemplatesPage from "./pages/Quotation/QuotationTemplatesPage";
import BookingDetailPage from "./pages/Booking/BookingDetailPage";
import CampaignsPage from "./pages/campaigns/CampaignsPage";
import CustomersPage from "./pages/customers/CustomersPage";
import CustomerDetailPage from "./pages/customers/CustomerDetailPage";
import NewCustomerPage from "./pages/customers/NewCustomerPage";
import ComplaintDetailPage from "./pages/complaints/ComplaintDetailPage";
import NotificationsPage from "./pages/notifications/NotificationsPage";
import UsersPage from "./pages/users/UsersPage";
import PublicLeadCapturePage from "./pages/public/PublicLeadCapturePage";
import FinanceSystem from "./pages/Finance/FinanceSystem";
import ProfilePage from "./pages/profile/ProfilePage";
import PackagesPage from "./pages/packages/PackagesPage";
import DestinationsPage from "./pages/destinations/DestinationsPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Auth Pages (No Sidebar/Header) */}
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Dashboard Layout */}
        <Route element={<PermissionRoute />}>
          <Route element={<DashboardLayout />}>
            <Route element={<PermissionRoute permission="reports:read" />}>
              <Route path="/dashboard" element={<Dashboard />} />
            </Route>

            <Route element={<PermissionRoute permission="leads:read" />}>
              <Route path="/leads" element={<Leads />} />
              <Route path="/leads/:id" element={<LeadsDetail />} />
              <Route path="/leads-details" element={<LeadsDetail />} />
            </Route>
            <Route element={<PermissionRoute permission="leads:create" />}>
              <Route path="/create-lead" element={<CreateLead />} />
              <Route
                path="/public/lead-capture"
                element={<PublicLeadCapturePage />}
              />
            </Route>

            <Route element={<PermissionRoute permission="bookings:read" />}>
              <Route path="/bookings" element={<BookingsPage />} />
              <Route path="/bookings/:id" element={<BookingDetailPage />} />
            </Route>

            <Route element={<PermissionRoute permission="quotations:read" />}>
              <Route path="/quotations" element={<QuotationsPage />} />
              <Route path="/quotations/:id" element={<QuotationDetailPage />} />
              <Route
                path="/quotations/templates"
                element={<QuotationTemplatesPage />}
              />
            </Route>
            <Route element={<PermissionRoute permission="quotations:create" />}>
              <Route
                path="/quotations/builder"
                element={<QuotationBuilderPage />}
              />
            </Route>

            <Route element={<PermissionRoute permission="settings:read" />}>
              <Route path="/settings" element={<Settings />} />
              <Route path="/packages" element={<PackagesPage />} />
              <Route path="/destinations" element={<DestinationsPage />} />
            </Route>

            <Route element={<PermissionRoute permission="payments:read" />}>
              <Route path="/payments" element={<Payments />} />
            </Route>

            <Route element={<PermissionRoute permission="refunds:read" />}>
              <Route path="/refunds" element={<RefundsPage />} />
            </Route>

            <Route element={<PermissionRoute permission="visa:read" />}>
              <Route path="/visa" element={<VisaCasesPage />} />
              <Route path="/visa/:id" element={<VisaDetailPage />} />
            </Route>

            <Route element={<PermissionRoute permission="complaints:read" />}>
              <Route path="/complaints" element={<ComplaintsPage />} />
              <Route path="/complaints/:id" element={<ComplaintDetailPage />} />
            </Route>

            <Route element={<PermissionRoute permission="reports:read" />}>
              <Route path="/reports" element={<ReportsHubPage />} />
              <Route path="/finance-system" element={<FinanceSystem />} />
            </Route>

            <Route element={<PermissionRoute permission="campaigns:read" />}>
              <Route path="/campaigns" element={<CampaignsPage />} />
            </Route>

            <Route element={<PermissionRoute permission="customers:read" />}>
              <Route path="/customers" element={<CustomersPage />} />
              <Route path="/customers/new" element={<NewCustomerPage />} />
              <Route path="/customers/:id" element={<CustomerDetailPage />} />
            </Route>

            <Route element={<PermissionRoute permission="notifications:read" />}>
              <Route path="/notifications" element={<NotificationsPage />} />
            </Route>
            <Route path="/profile" element={<ProfilePage />} />

            <Route element={<PermissionRoute permission="users:read" />}>
              <Route path="/users" element={<UsersPage />} />
            </Route>
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
