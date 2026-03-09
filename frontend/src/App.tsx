import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "./pages/auth/Login";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";
import Dashboard from "./pages/core/Dashboard";
import Leads from "./pages/leads/Leads";
import LeadsDetail from "./pages/leads/LeadDetails";
import CreateLead from "./pages/leads/CreateLead";

import DashboardLayout from "./components/layout/Layout";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        
        {/* Auth Pages (No Sidebar/Header) */}
        <Route path="/" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} /> 

        {/* Dashboard Layout */}
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<Dashboard />} /> 

          <Route path="/leads" element={<Leads />} /> 
          <Route path="/leads-details" element={<LeadsDetail />} /> 
          <Route path="/create-lead" element={<CreateLead />} /> 

        </Route>  

      </Routes>
    </BrowserRouter>
  );
}

export default App;