import React from "react";

interface SidebarProps {
  onClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onClose }) => {
  return (
    <aside className="h-full w-64 bg-white border-r border-gray-200 flex flex-col">

      {/* Logo Area */}
      <div className="h-16 flex items-center px-6 border-b border-gray-100">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white text-sm mr-3">
          <i className="fa-solid fa-plane-departure"></i>
        </div>

        <span className="text-xl font-bold text-gray-900">TravelCRM</span>

        {/* Close button (mobile) */}
        <button
          onClick={onClose}
          className="lg:hidden ml-auto text-gray-400"
        >
          <i className="fa-solid fa-times"></i>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">

        <a
          href="/dashboard"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-blue-50 text-blue-600 font-medium"
        >
          <i className="fa-solid fa-grid-2 w-5 text-center"></i>
          <span>Main Dashboard</span>
        </a>

        <a
          href="/leads"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-gray-900 font-medium"
        >
          <i className="fa-solid fa-user-group w-5 text-center"></i>
          <span>Leads</span>
        </a>

        <a
          href="/quotations"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-gray-900 font-medium"
        >
          <i className="fa-solid fa-file-invoice-dollar w-5 text-center"></i>
          <span>Quotations</span>
        </a>

        <a
          href="/bookings"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-gray-900 font-medium"
        >
          <i className="fa-solid fa-calendar-check w-5 text-center"></i>
          <span>Bookings</span>
        </a>

        <a
          href="/payments"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-gray-900 font-medium"
        >
          <i className="fa-solid fa-credit-card w-5 text-center"></i>
          <span>Payments</span>
        </a>

        <a
          href="#"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-gray-900 font-medium"
        >
          <i className="fa-solid fa-passport w-5 text-center"></i>
          <span>Visa</span>
        </a>

        <a
          href="#"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-gray-900 font-medium"
        >
          <i className="fa-solid fa-folder-open w-5 text-center"></i>
          <span>Documents</span>
        </a>

        <a
          href="#"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-gray-900 font-medium"
        >
          <i className="fa-solid fa-users w-5 text-center"></i>
          <span>Customers</span>
        </a>

        <a
          href="#"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-gray-900 font-medium"
        >
          <i className="fa-solid fa-chart-pie w-5 text-center"></i>
          <span>Reports</span>
        </a>

        <div className="pt-4 mt-4 border-t border-gray-100">
          <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            System
          </p>

          <a
            href="/settings"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-gray-900 font-medium"
          >
            <i className="fa-solid fa-gear w-5 text-center"></i>
            <span>Settings</span>
          </a>
        </div>
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-gray-100">
        <div className="flex items-center gap-3">

          <img
            className="w-9 h-9 rounded-full object-cover border"
            src="https://storage.googleapis.com/uxpilot-auth.appspot.com/28c2bdaa36-0690aa93f5755609852b.png"
            alt="profile"
          />

          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              Alex Morgan
            </p>
            <p className="text-xs text-gray-500 truncate">
              Senior Consultant
            </p>
          </div>

          <button className="text-gray-400 hover:text-gray-600">
            <i className="fa-solid fa-right-from-bracket"></i>
          </button>

        </div>
      </div>
    </aside>
  );
};

export default Sidebar;