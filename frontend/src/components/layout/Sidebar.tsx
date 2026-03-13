import React from "react";
import { NavLink } from "react-router-dom";
import { FaChartPie, FaChevronLeft, FaChevronRight, FaCreditCard, FaFileInvoiceDollar, FaFolderOpen, FaGear, FaPassport, FaPlaneDeparture, FaTableCellsLarge, FaUserGroup, FaUsers, FaXmark } from "react-icons/fa6";
import { useAuth } from "../../context/AuthContext";

const sections = [
  {
    title: "Main",
    items: [
      { label: "Dashboard", to: "/dashboard", icon: FaTableCellsLarge, permission: "reports.read" },
      { label: "Leads", to: "/leads", icon: FaUserGroup, permission: "leads.read" },
      { label: "Quotations", to: "/quotations", icon: FaFileInvoiceDollar, permission: "quotations.read" },
      { label: "Bookings", to: "/bookings", icon: FaPassport, permission: "bookings.read" },
      { label: "Payments", to: "/payments", icon: FaCreditCard, permission: "payments.read" },
      { label: "Refunds", to: "/refunds", icon: FaCreditCard, permission: "refunds.read" },
      { label: "Visa", to: "/visa", icon: FaPassport, permission: "visa.read" },
      { label: "Complaints", to: "/complaints", icon: FaFolderOpen, permission: "complaints.read" },
      { label: "Documents", to: "#", icon: FaFolderOpen },
      { label: "Customers", to: "#", icon: FaUsers },
      { label: "Reports", to: "/reports", icon: FaChartPie, permission: "reports.read" },
    ],
  },
  { title: "System", items: [{ label: "Settings", to: "/settings", icon: FaGear, permission: "settings.read" }] },
];

const Sidebar: React.FC<{ collapsed: boolean; onToggleCollapse: () => void; onClose?: () => void }> = ({ collapsed, onToggleCollapse, onClose }) => {
  const { hasPermission } = useAuth();

  return (
    <aside className={`flex h-full flex-col border-r border-gray-200 bg-white transition-all duration-300 dark:border-gray-700 dark:bg-gray-900 ${collapsed ? "w-20" : "w-72"}`}>
    <div className="flex h-16 items-center border-b border-gray-100 px-4 dark:border-gray-800">
      <div className="mr-3 flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white"><FaPlaneDeparture /></div>
      {!collapsed ? <span className="text-lg font-bold text-gray-900 dark:text-gray-100">GetFares CRM</span> : null}
      <button onClick={onClose} className="ml-auto rounded-lg p-2 text-gray-400 hover:bg-gray-100 lg:hidden dark:hover:bg-gray-800"><FaXmark /></button>
    </div>

    <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
      {sections.map((section) => (
        <div key={section.title}>
          {!collapsed ? <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-gray-400">{section.title}</p> : null}
          <div className="space-y-1">
            {section.items.map((item) => {
              if (item.permission && !hasPermission(item.permission)) return null;
              const Icon = item.icon;
              if (item.to === "#") {
                return <button key={item.label} className={`flex w-full rounded-xl px-3 py-2.5 text-sm text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 ${collapsed ? "justify-center" : "items-center gap-3"}`}><Icon />{!collapsed ? item.label : null}</button>;
              }
              return (
                <NavLink
                  key={item.label}
                  to={item.to}
                  onClick={onClose}
                  className={({ isActive }) => `flex rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${collapsed ? "justify-center" : "items-center gap-3"} ${isActive ? "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300" : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"}`}
                >
                  <Icon /> {!collapsed ? item.label : null}
                </NavLink>
              );
            })}
          </div>
        </div>
      ))}
    </nav>

    <div className="border-t border-gray-100 p-3 dark:border-gray-800">
      <button onClick={onToggleCollapse} className="flex w-full items-center justify-center rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">
        {collapsed ? <FaChevronRight /> : <><FaChevronLeft /><span className="ml-2">Collapse</span></>}
      </button>
    </div>
  </aside>
  );
};

export default Sidebar;
