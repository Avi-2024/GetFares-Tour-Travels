import React, { useMemo, useState } from "react";
import {
  FaChevronRight,
  FaDownload,
  FaFilter,
  FaPlus,
  FaMagnifyingGlass,
  FaShield,
  FaTrash,
  FaUserPlus,
  FaUsers,
} from "react-icons/fa6";
import SurfaceCard from "../ui/SurfaceCard";

type Tab = "user-management" | "roles-permissions" | "system-settings" | "pdf-templates" | "integrations";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: "active" | "pending";
  lastActive: string;
}

interface Role {
  id: string;
  name: string;
  users: number;
}

const users: User[] = [
  { id: "1", name: "Jane Cooper", email: "jane.cooper@example.com", role: "Admin", status: "active", lastActive: "Just now" },
  { id: "2", name: "Cody Fisher", email: "cody.fisher@example.com", role: "Manager", status: "active", lastActive: "2 hours ago" },
  { id: "3", name: "Esther Howard", email: "esther.howard@example.com", role: "Agent", status: "pending", lastActive: "-" },
];

const roles: Role[] = [
  { id: "1", name: "Administrator", users: 3 },
  { id: "2", name: "Sales Manager", users: 5 },
  { id: "3", name: "Travel Agent", users: 12 },
  { id: "4", name: "Finance", users: 2 },
];

const tabs: Array<{ id: Tab; label: string }> = [
  { id: "user-management", label: "User Management" },
  { id: "roles-permissions", label: "Roles & Permissions" },
  { id: "system-settings", label: "System Settings" },
  { id: "pdf-templates", label: "PDF Templates" },
  { id: "integrations", label: "Integrations" },
];

const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>("user-management");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  const filteredUsers = useMemo(
    () => users.filter((u) => u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())),
    [search]
  );

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-[260px_1fr]">
      <SurfaceCard className="h-fit p-3">
        <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-gray-500">Administration</p>
        <div className="space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full rounded-xl px-3 py-2 text-left text-sm font-medium transition-all duration-200 ${
                activeTab === tab.id
                  ? "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300"
                  : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </SurfaceCard>

      <div className="space-y-6">
        {activeTab === "user-management" ? (
          <>
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">User Management</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">Manage users, roles, and team access controls.</p>
              </div>
              <button
                onClick={() => setModalOpen(true)}
                className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                <FaUserPlus className="mr-2" /> Invite User
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <StatCard title="Total Users" value="24" icon={<FaUsers className="text-blue-600" />} />
              <StatCard title="Active Now" value="18" icon={<FaShield className="text-green-500" />} />
              <StatCard title="Pending Invites" value="3" icon={<FaFilter className="text-amber-500" />} />
            </div>

            <SurfaceCard className="p-0 overflow-hidden">
              <div className="flex items-center justify-between border-b border-gray-100 p-4 dark:border-gray-800">
                <div className="relative w-full max-w-sm">
                  <FaMagnifyingGlass className="pointer-events-none absolute left-3 top-3 text-xs text-gray-400" />
                  <input
                    className="field-input pl-9"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search users"
                  />
                </div>
                <div className="ml-3 flex gap-2">
                  <button className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"><FaFilter /></button>
                  <button className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"><FaDownload /></button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-[780px] w-full divide-y divide-gray-200 dark:divide-gray-800">
                  <thead className="bg-gray-50 dark:bg-gray-800/95">
                    <tr>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">User</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Role</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Status</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Last Active</th>
                      <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-blue-50/30 dark:hover:bg-gray-800/40">
                        <td className="px-5 py-4">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{user.name}</p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                        </td>
                        <td className="px-5 py-4 text-sm text-gray-700 dark:text-gray-200">{user.role}</td>
                        <td className="px-5 py-4">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${user.status === "active" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                            {user.status}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-sm text-gray-500">{user.lastActive}</td>
                        <td className="px-5 py-4 text-right">
                          <button className="text-red-500 hover:text-red-700"><FaTrash /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SurfaceCard>
          </>
        ) : null}

        {activeTab === "roles-permissions" ? (
          <SurfaceCard>
            <h2 className="mb-3 text-xl font-semibold text-gray-900 dark:text-gray-100">Roles & Permissions</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {roles.map((role) => (
                <div key={role.id} className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-gray-900 dark:text-gray-100">{role.name}</p>
                    <FaChevronRight className="text-gray-400" />
                  </div>
                  <p className="mt-1 text-sm text-gray-500">{role.users} users assigned</p>
                </div>
              ))}
            </div>
            <button className="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
              <FaPlus className="mr-2 inline" /> Create Role
            </button>
          </SurfaceCard>
        ) : null}

        {activeTab === "system-settings" ? (
          <SurfaceCard>
            <h2 className="mb-3 text-xl font-semibold text-gray-900 dark:text-gray-100">System Settings</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="field-label">Company Name</label>
                <input className="field-input" defaultValue="GetFares Travel CRM" />
              </div>
              <div>
                <label className="field-label">Support Email</label>
                <input className="field-input" defaultValue="support@getfares.com" />
              </div>
            </div>
            <button className="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Save Settings</button>
          </SurfaceCard>
        ) : null}

        {activeTab === "pdf-templates" ? (
          <SurfaceCard>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">PDF Templates</h2>
            <p className="mt-1 text-sm text-gray-500">Template editor module ready for integration.</p>
          </SurfaceCard>
        ) : null}

        {activeTab === "integrations" ? (
          <SurfaceCard>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Integrations</h2>
            <p className="mt-1 text-sm text-gray-500">Connect WhatsApp, Stripe, and SMTP providers.</p>
          </SurfaceCard>
        ) : null}
      </div>

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setModalOpen(false)} />
          <div className="relative w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-700 dark:bg-gray-900">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Invite Team Member</h3>
            <p className="mt-1 text-sm text-gray-500">Send an invite email with role-based access.</p>
            <div className="mt-4 space-y-3">
              <input className="field-input" placeholder="Email address" />
              <select className="field-input">
                <option>Administrator</option>
                <option>Sales Manager</option>
                <option>Travel Agent</option>
                <option>Finance</option>
              </select>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setModalOpen(false)} className="rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-700 dark:border-gray-700 dark:text-gray-200">Cancel</button>
              <button onClick={() => setModalOpen(false)} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Send Invitation</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

const StatCard = ({ title, value, icon }: { title: string; value: string; icon: React.ReactNode }) => (
  <SurfaceCard hoverable className="flex items-center justify-between p-5">
    <div>
      <p className="text-xs uppercase tracking-wide text-gray-500">{title}</p>
      <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">{value}</p>
    </div>
    {icon}
  </SurfaceCard>
);

export default Settings;
