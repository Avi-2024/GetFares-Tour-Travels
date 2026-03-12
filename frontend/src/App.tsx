import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/auth/Login";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";
import Dashboard from "./pages/core/Dashboard";
import Leads from "./pages/leads/Leads";
import BookingsPage from "./pages/Booking/BookingsPage";
import QuotationsPage from "./pages/Quotation/QuotationsPage";
import QuotationBuilderPage from "./pages/Quotation/QuotationBuilderPage";
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
import QuotationDetailPage from "./pages/Quotation/QuotationDetailPage";
import QuotationTemplatesPage from "./pages/Quotation/QuotationTemplatesPage";
import BookingDetailPage from "./pages/Booking/BookingDetailPage";
import CampaignsPage from "./pages/campaigns/CampaignsPage";
import CustomersPage from "./pages/customers/CustomersPage";
import CustomerDetailPage from "./pages/customers/CustomerDetailPage";
import ComplaintDetailPage from "./pages/complaints/ComplaintDetailPage";
import NotificationsPage from "./pages/notifications/NotificationsPage";
import UsersPage from "./pages/users/UsersPage";
import PublicLeadCapturePage from "./pages/public/PublicLeadCapturePage";

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
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/leads" element={<Leads />} />
            <Route path="/leads/:id" element={<LeadsDetail />} />
            <Route path="/bookings" element={<BookingsPage />} />
            <Route path="/bookings/:id" element={<BookingDetailPage />} />
            <Route path="/quotations" element={<QuotationsPage />} />
            <Route path="/quotations/builder" element={<QuotationBuilderPage />} />
            <Route path="/quotations/:id" element={<QuotationDetailPage />} />
            <Route path="/quotations/templates" element={<QuotationTemplatesPage />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/leads-details" element={<LeadsDetail />} />
            <Route path="/create-lead" element={<CreateLead />} />
            <Route path="/payments" element={<Payments />} />
            <Route path="/refunds" element={<RefundsPage />} />
            <Route path="/visa" element={<VisaCasesPage />} />
            <Route path="/visa/:id" element={<VisaDetailPage />} />
            <Route path="/complaints" element={<ComplaintsPage />} />
            <Route path="/complaints/:id" element={<ComplaintDetailPage />} />
            <Route path="/reports" element={<ReportsHubPage />} />
            <Route path="/campaigns" element={<CampaignsPage />} />
            <Route path="/customers" element={<CustomersPage />} />
            <Route path="/customers/:id" element={<CustomerDetailPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/public/lead-capture" element={<PublicLeadCapturePage />} />
          </Route>
        </Route>

 

      </Routes>
    </BrowserRouter>
  );
}

export default App;
