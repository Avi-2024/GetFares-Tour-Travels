
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaFileImport,
  FaPlus,
  FaUsers,
  FaCalendarPlus,
  FaFire,
  FaChartLine,
  FaSearch,
  FaChevronDown,
  FaFilter,
  FaTrashAlt,
  FaSort,
  FaRegEye,
  FaFileInvoiceDollar,
  FaEllipsisV,
  FaCheck,
  FaClock,
  FaExclamationTriangle,
  FaChevronLeft,
  FaChevronRight,
} from "react-icons/fa";

interface Lead {
  id: number;
  leadId: string;
  name: string;
  email: string;
  phone: string;
  destination: string;
  package: string;
  status: string;
  statusColor: string;
  priority: string;
  sla: string;
  slaColor: string;
  consultant: string;
  avatar: string | null;
  initials: string | null;
  bgColor?: string;
}

const LeadDashboard: React.FC = () => {
  const [selectedLeads, setSelectedLeads] = useState<number[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const navigate = useNavigate();

  const leads: Lead[] = [
    {
      id: 1,
      leadId: "#LD-2023-001",
      name: "Sarah Connor",
      email: "sarah.c@gmail.com",
      phone: "+1 (555) 123-4567",
      destination: "Maldives",
      package: "Honeymoon Package",
      status: "New",
      statusColor: "green",
      priority: "High",
      sla: "1h left",
      slaColor: "orange",
      consultant: "Alex Morgan",
      avatar:
        "https://storage.googleapis.com/uxpilot-auth.appspot.com/avatars/avatar-1.jpg",
      initials: null,
    },
    {
      id: 2,
      leadId: "#LD-2023-002",
      name: "John Miller",
      email: "john.m@corp.com",
      phone: "+44 20 7123 4567",
      destination: "Dubai",
      package: "Business Trip",
      status: "Contacted",
      statusColor: "blue",
      priority: "Medium",
      sla: "4h left",
      slaColor: "gray",
      consultant: "Sarah Jenkins",
      avatar: null,
      initials: "JM",
      bgColor: "purple",
    },
  ];

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedLeads([]);
    } else {
      setSelectedLeads(leads.map((l) => l.id));
    }
    setSelectAll(!selectAll);
  };

  const handleSelectLead = (id: number) => {
    if (selectedLeads.includes(id)) {
      setSelectedLeads(selectedLeads.filter((l) => l !== id));
      setSelectAll(false);
    } else {
      setSelectedLeads([...selectedLeads, id]);
    }
  };

  const getStatusStyles = (color: string) => {
    const styles = {
      green: "bg-green-100 text-green-800 border-green-200",
      blue: "bg-blue-100 text-blue-800 border-blue-200",
      purple: "bg-purple-100 text-purple-800 border-purple-200",
      gray: "bg-gray-100 text-gray-800 border-gray-200",
      teal: "bg-teal-100 text-teal-800 border-teal-200",
    };
    return styles[color as keyof typeof styles];
  };

  const getPriorityColor = (priority: string) => {
    if (priority === "High") return "bg-red-500";
    if (priority === "Medium") return "bg-yellow-400";
    if (priority === "Low") return "bg-green-500";
    return "bg-gray-300";
  };

  const getSlaStyles = (color: string) => {
    const styles = {
      orange: "text-orange-600 bg-orange-50 border-orange-100",
      green: "text-green-600 bg-green-50 border-green-100",
      red: "text-red-600 bg-red-50 border-red-100",
      gray: "text-gray-500 bg-gray-50 border-gray-100",
    };
    return styles[color as keyof typeof styles];
  };

  const getSlaIcon = (sla: string) => {
    if (sla.includes("Overdue"))
      return <FaExclamationTriangle className="text-xs" />;
    if (sla.includes("On Time")) return <FaCheck className="text-xs" />;
    return <FaClock className="text-xs" />;
  };

  const getAvatarBg = (color?: string) => {
    const colors = {
      purple: "bg-purple-100 text-purple-600",
      orange: "bg-orange-100 text-orange-600",
      indigo: "bg-indigo-100 text-indigo-600",
    };
    return colors[color as keyof typeof colors] || "bg-gray-100 text-gray-600";
  };

  return (
    <div className="space-y-6 min-w-0">

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Leads</h1>
          <p className="text-sm text-gray-500">
            Manage your potential customers
          </p>
        </div>

        <div className="flex gap-3">
          <button className="bg-white border px-4 py-2 rounded-lg flex items-center gap-2">
            <FaFileImport /> Import
          </button>

          <button onClick={()=> navigate('/create-lead')} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2">
            <FaPlus /> Create Lead
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl flex justify-between">
          <div>
            <p className="text-xs text-gray-500">All Leads</p>
            <h3 className="text-xl font-bold">1248</h3>
          </div>
          <FaUsers className="text-blue-500" />
        </div>

        <div className="bg-white p-4 rounded-xl flex justify-between">
          <div>
            <p className="text-xs text-gray-500">New Today</p>
            <h3 className="text-xl font-bold">24</h3>
          </div>
          <FaCalendarPlus className="text-green-500" />
        </div>

        <div className="bg-white p-4 rounded-xl flex justify-between">
          <div>
            <p className="text-xs text-gray-500">Hot Leads</p>
            <h3 className="text-xl font-bold">86</h3>
          </div>
          <FaFire className="text-red-500" />
        </div>

        <div className="bg-white p-4 rounded-xl flex justify-between">
          <div>
            <p className="text-xs text-gray-500">Conversion</p>
            <h3 className="text-xl font-bold">18.5%</h3>
          </div>
          <FaChartLine className="text-purple-500" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border overflow-hidden">

        <div className="w-full overflow-x-auto">

          <table className="min-w-[1100px] w-full divide-y divide-gray-200">

            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3">
                  <input
                    type="checkbox"
                    checked={selectAll}
                    onChange={handleSelectAll}
                  />
                </th>

                <th className="px-6 py-3 text-left text-xs uppercase">
                  Lead Name <FaSort className="inline ml-1" />
                </th>

                <th className="px-6 py-3 text-left text-xs uppercase">
                  Contact Info
                </th>

                <th className="px-6 py-3 text-left text-xs uppercase">
                  Destination
                </th>

                <th className="px-6 py-3 text-left text-xs uppercase">
                  Status
                </th>

                <th className="px-6 py-3 text-left text-xs uppercase">
                  Priority / SLA
                </th>

                <th className="px-6 py-3 text-left text-xs uppercase">
                  Consultant
                </th>

                <th className="px-6 py-3"></th>
              </tr>
            </thead>

            <tbody>

              {leads.map((lead) => (
                <tr key={lead.id} className="hover:bg-gray-50">

                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedLeads.includes(lead.id)}
                      onChange={() => handleSelectLead(lead.id)}
                    />
                  </td>

                  <td className="px-6 py-4 flex items-center gap-3">
                    {lead.avatar ? (
                      <img
                        src={lead.avatar}
                        className="w-10 h-10 rounded-full"
                      />
                    ) : (
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center ${getAvatarBg(
                          lead.bgColor
                        )}`}
                      >
                        {lead.initials}
                      </div>
                    )}

                    <div>
                      <p className="font-medium">{lead.name}</p>
                      <p className="text-xs text-gray-500">
                        {lead.leadId}
                      </p>
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <p>{lead.email}</p>
                    <p className="text-xs text-gray-500">
                      {lead.phone}
                    </p>
                  </td>

                  <td className="px-6 py-4">
                    <p>{lead.destination}</p>
                    <p className="text-xs text-gray-500">
                      {lead.package}
                    </p>
                  </td>

                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 text-xs rounded border ${getStatusStyles(
                        lead.statusColor
                      )}`}
                    >
                      {lead.status}
                    </span>
                  </td>

                  <td className="px-6 py-4 flex gap-2 items-center">
                    <div
                      className={`w-2 h-2 rounded-full ${getPriorityColor(
                        lead.priority
                      )}`}
                    ></div>

                    <span
                      className={`text-xs px-2 py-1 rounded border ${getSlaStyles(
                        lead.slaColor
                      )}`}
                    >
                      {getSlaIcon(lead.sla)} {lead.sla}
                    </span>
                  </td>

                  <td className="px-6 py-4">{lead.consultant}</td>

                  <td className="px-6 py-4 flex gap-2 justify-end">
                    <FaRegEye className="cursor-pointer text-gray-500" />
                    <FaFileInvoiceDollar className="cursor-pointer text-gray-500" />
                    <FaEllipsisV className="cursor-pointer text-gray-500" />
                  </td>

                </tr>
              ))}

            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex justify-between items-center p-4 border-t">

          <button className="px-3 py-2 border rounded">
            <FaChevronLeft />
          </button>

          <div className="flex gap-2">
            <button className="px-4 py-2 border bg-blue-50 text-blue-600">
              1
            </button>
            <button className="px-4 py-2 border">2</button>
            <button className="px-4 py-2 border">3</button>
          </div>

          <button className="px-3 py-2 border rounded">
            <FaChevronRight />
          </button>

        </div>
      </div>
    </div>
  );
};

export default LeadDashboard;