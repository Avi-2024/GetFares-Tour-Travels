import React, { useCallback, useEffect, useMemo, useState } from "react";
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
import { isApiError } from "../../api/apiClient";
import {
  settingsApi,
  type IntegrationSettingsPayload,
  type SystemSettingsPayload,
} from "../../api/settings";
import { useAuthService } from "../../hooks/useAuthService";
import { useUsersService } from "../../hooks/useUsersService";
import SurfaceCard from "../ui/SurfaceCard";

type Tab =
  | "user-management"
  | "roles-permissions"
  | "system-settings"
  | "pdf-templates"
  | "integrations";

type UserStatusFilter = "all" | "active" | "inactive";

type UserRecord = {
  id: string;
  fullName: string;
  email: string;
  role?: string;
  isActive: boolean;
  lastActive: string;
};

type RawUser = {
  id?: string;
  fullName?: string;
  full_name?: string;
  name?: string;
  email?: string;
  role?: string;
  isActive?: boolean;
  is_active?: boolean;
  lastLogin?: string;
  last_login?: string;
  createdAt?: string;
  created_at?: string;
};

type RoleOption = {
  id: string;
  name: string;
  value: string;
};

type SystemSettingsForm = Required<SystemSettingsPayload>;
type IntegrationSettingsForm = Required<
  Omit<IntegrationSettingsPayload, "smtpPort">
> & { smtpPort: number };

type SettingsResponse = {
  system?: Partial<SystemSettingsForm>;
  integrations?: Partial<IntegrationSettingsForm>;
};

const tabs: Array<{ id: Tab; label: string }> = [
  { id: "user-management", label: "User Management" },
  { id: "roles-permissions", label: "Roles & Permissions" },
  { id: "system-settings", label: "System Settings" },
  { id: "pdf-templates", label: "PDF Templates" },
  { id: "integrations", label: "Integrations" },
];

const roles: RoleOption[] = [
  { id: "admin", name: "Admin", value: "admin" },
  { id: "manager", name: "Manager", value: "manager" },
  { id: "sales_consultant", name: "Sales Consultant", value: "sales_consultant" },
  { id: "visa_executive", name: "Visa Executive", value: "visa_executive" },
  { id: "accounts", name: "Accounts", value: "accounts" },
  { id: "marketing", name: "Marketing", value: "marketing" },
  { id: "operations", name: "Operations", value: "operations" },
  { id: "management", name: "Management", value: "management" },
];

const roleLabel = new Map(roles.map((r) => [r.value, r.name] as const));
const getRoleLabel = (role?: string) => roleLabel.get(role ?? "") ?? role ?? "-";

const DEFAULT_SYSTEM: SystemSettingsForm = {
  companyName: "GetFares Travel CRM",
  supportEmail: "support@getfares.com",
  supportPhone: "",
  timezone: "Asia/Kolkata",
  currency: "INR",
  dateFormat: "DD/MM/YYYY",
  websiteUrl: "",
};

const DEFAULT_INTEGRATIONS: IntegrationSettingsForm = {
  metaAppId: "",
  metaAccessToken: "",
  whatsappApiToken: "",
  smtpHost: "",
  smtpPort: 587,
  smtpUser: "",
  smtpPassword: "",
  smtpFromEmail: "",
  webhookUrl: "",
};

const parseDate = (value?: string) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
};

const extractRows = <T,>(response: unknown): T[] => {
  const payload = response as { data?: T[] | { data?: T[]; items?: T[] } };
  if (Array.isArray(payload?.data)) return payload.data;
  const nested = payload?.data as { data?: T[]; items?: T[] } | undefined;
  if (Array.isArray(nested?.data)) return nested.data;
  if (Array.isArray(nested?.items)) return nested.items;
  return Array.isArray(response) ? (response as T[]) : [];
};

const extractObject = <T extends object>(response: unknown): T | null => {
  if (!response || typeof response !== "object") return null;
  const payload = response as { data?: unknown };
  if (payload.data && typeof payload.data === "object") return payload.data as T;
  return response as T;
};

const normalizeUsers = (rows: RawUser[]): UserRecord[] =>
  rows
    .filter((row) => row.id && row.email)
    .map((row) => ({
      id: row.id as string,
      fullName:
        row.fullName || row.full_name || row.name || row.email?.split("@")[0] || "User",
      email: row.email as string,
      role: row.role,
      isActive: typeof row.isActive === "boolean" ? row.isActive : row.is_active !== false,
      lastActive: parseDate(
        row.lastLogin || row.last_login || row.createdAt || row.created_at,
      ),
    }));

const Settings: React.FC = () => {
  const usersService = useUsersService();
  const authService = useAuthService();
  const [activeTab, setActiveTab] = useState<Tab>("user-management");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<UserStatusFilter>("all");
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    fullName: "",
    email: "",
    password: "",
    role: "",
  });

  const [assignOpen, setAssignOpen] = useState(false);
  const [assignUserId, setAssignUserId] = useState("");
  const [assignRole, setAssignRole] = useState("");
  const [assignLoading, setAssignLoading] = useState(false);

  const [systemSettings, setSystemSettings] = useState<SystemSettingsForm>(DEFAULT_SYSTEM);
  const [integrationSettings, setIntegrationSettings] =
    useState<IntegrationSettingsForm>(DEFAULT_INTEGRATIONS);
  const [savingSystem, setSavingSystem] = useState(false);
  const [savingIntegrations, setSavingIntegrations] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const response = await usersService.list();
      setUsers(normalizeUsers(extractRows<RawUser>(response)));
    } catch (e) {
      setError(isApiError(e) ? e.message : "Unable to load users");
    } finally {
      setLoadingUsers(false);
    }
  }, [usersService]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await settingsApi.getAll();
        const data = extractObject<SettingsResponse>(response);
        if (data?.system) setSystemSettings((s) => ({ ...s, ...data.system }));
        if (data?.integrations) {
          setIntegrationSettings((s) => ({ ...s, ...data.integrations }));
        }
      } catch (e) {
        setError(isApiError(e) ? e.message : "Unable to load settings");
      }
    };
    void loadSettings();
  }, []);

  const filteredUsers = useMemo(
    () =>
      users.filter((user) => {
        const matched =
          user.fullName.toLowerCase().includes(search.toLowerCase()) ||
          user.email.toLowerCase().includes(search.toLowerCase()) ||
          getRoleLabel(user.role).toLowerCase().includes(search.toLowerCase());
        const statusMatched =
          statusFilter === "all" ||
          (statusFilter === "active" && user.isActive) ||
          (statusFilter === "inactive" && !user.isActive);
        return matched && statusMatched;
      }),
    [users, search, statusFilter],
  );

  const roleStats = useMemo(
    () =>
      roles.map((r) => ({
        ...r,
        users: users.filter((u) => u.role === r.value).length,
      })),
    [users],
  );

  const onInvite = async () => {
    setError("");
    setMessage("");
    if (!inviteForm.fullName.trim() || !inviteForm.email.trim()) {
      setError("Full name and email are required.");
      return;
    }
    if (inviteForm.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setInviteLoading(true);
    try {
      const created = extractObject<{ id?: string }>(
        await usersService.create({
          fullName: inviteForm.fullName.trim(),
          email: inviteForm.email.trim(),
          password: inviteForm.password,
          isActive: true,
        }),
      );
      if (created?.id && inviteForm.role) {
        await authService.assignRole({ userId: created.id, role: inviteForm.role });
      }
      setInviteOpen(false);
      setInviteForm({ fullName: "", email: "", password: "", role: "" });
      setMessage("User invited successfully.");
      await loadUsers();
    } catch (e) {
      setError(isApiError(e) ? e.message : "Unable to invite user");
    } finally {
      setInviteLoading(false);
    }
  };

  const onDeactivate = async (id: string) => {
    setError("");
    setMessage("");
    try {
      await usersService.update(id, { isActive: false });
      setMessage("User deactivated.");
      await loadUsers();
    } catch (e) {
      setError(isApiError(e) ? e.message : "Unable to deactivate user");
    }
  };

  const onAssignRole = async () => {
    if (!assignUserId || !assignRole) {
      setError("Select both user and role.");
      return;
    }
    setAssignLoading(true);
    try {
      await authService.assignRole({ userId: assignUserId, role: assignRole });
      setAssignOpen(false);
      setMessage("Role assigned successfully.");
      await loadUsers();
    } catch (e) {
      setError(isApiError(e) ? e.message : "Unable to assign role");
    } finally {
      setAssignLoading(false);
    }
  };

  const onExport = () => {
    const lines = [
      ["Name", "Email", "Role", "Status", "Last Active"].join(","),
      ...filteredUsers.map((u) =>
        [u.fullName, u.email, getRoleLabel(u.role), u.isActive ? "Active" : "Inactive", u.lastActive]
          .map((v) => `\"${String(v).replace(/\"/g, '\"\"')}\"`)
          .join(","),
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "settings-users.csv";
    document.body.append(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const saveSystem = async () => {
    setSavingSystem(true);
    setError("");
    try {
      const data = extractObject<Partial<SystemSettingsForm>>(
        await settingsApi.updateSystem(systemSettings),
      );
      if (data) setSystemSettings((s) => ({ ...s, ...data }));
      setMessage("System settings saved.");
    } catch (e) {
      setError(isApiError(e) ? e.message : "Unable to save system settings");
    } finally {
      setSavingSystem(false);
    }
  };

  const saveIntegrations = async () => {
    setSavingIntegrations(true);
    setError("");
    try {
      const data = extractObject<Partial<IntegrationSettingsForm>>(
        await settingsApi.updateIntegrations(integrationSettings),
      );
      if (data) setIntegrationSettings((s) => ({ ...s, ...data }));
      setMessage("Integration settings saved.");
    } catch (e) {
      setError(isApiError(e) ? e.message : "Unable to save integration settings");
    } finally {
      setSavingIntegrations(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-[260px_1fr]">
      <SurfaceCard className="h-fit p-3">
        <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-gray-500">Administration</p>
        <div className="space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full rounded-xl px-3 py-2 text-left text-sm font-medium ${
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
        {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div> : null}
        {message ? <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-700">{message}</div> : null}

        {activeTab === "user-management" ? (
          <SurfaceCard className="p-0 overflow-hidden">
            <div className="flex items-center justify-between border-b border-gray-100 p-4">
              <div className="relative w-full max-w-sm">
                <FaMagnifyingGlass className="pointer-events-none absolute left-3 top-3 text-xs text-gray-400" />
                <input className="field-input pl-9" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search users" />
              </div>
              <div className="ml-3 flex gap-2">
                <button onClick={() => setStatusFilter(statusFilter === "all" ? "active" : statusFilter === "active" ? "inactive" : "all")} className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-100"><FaFilter /></button>
                <button onClick={onExport} className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-100"><FaDownload /></button>
                <button onClick={() => setInviteOpen(true)} className="rounded-lg bg-blue-600 px-3 py-2 text-white"><FaUserPlus /></button>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 px-4 pt-4 sm:grid-cols-3">
              <StatCard title="Total Users" value={String(users.length)} icon={<FaUsers className="text-blue-600" />} />
              <StatCard title="Active" value={String(users.filter((u) => u.isActive).length)} icon={<FaShield className="text-green-500" />} />
              <StatCard title="Inactive" value={String(users.filter((u) => !u.isActive).length)} icon={<FaFilter className="text-amber-500" />} />
            </div>
            <div className="overflow-x-auto p-4">
              <table className="min-w-[780px] w-full divide-y divide-gray-200">
                <thead><tr><th className="px-3 py-2 text-left text-xs text-gray-500">User</th><th className="px-3 py-2 text-left text-xs text-gray-500">Role</th><th className="px-3 py-2 text-left text-xs text-gray-500">Status</th><th className="px-3 py-2 text-left text-xs text-gray-500">Last Active</th><th className="px-3 py-2 text-right text-xs text-gray-500">Actions</th></tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {loadingUsers ? (
                    <tr><td colSpan={5} className="px-3 py-4 text-sm text-gray-500">Loading users...</td></tr>
                  ) : filteredUsers.map((u) => (
                    <tr key={u.id}>
                      <td className="px-3 py-3"><p className="text-sm font-medium">{u.fullName}</p><p className="text-xs text-gray-500">{u.email}</p></td>
                      <td className="px-3 py-3 text-sm">{getRoleLabel(u.role)}</td>
                      <td className="px-3 py-3 text-sm">{u.isActive ? "Active" : "Inactive"}</td>
                      <td className="px-3 py-3 text-sm text-gray-500">{u.lastActive}</td>
                      <td className="px-3 py-3 text-right"><button disabled={!u.isActive} onClick={() => void onDeactivate(u.id)} className="text-red-500 disabled:opacity-30"><FaTrash /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SurfaceCard>
        ) : null}

        {activeTab === "roles-permissions" ? (
          <SurfaceCard>
            <h2 className="mb-3 text-xl font-semibold">Roles & Permissions</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {roleStats.map((r) => (
                <button key={r.id} onClick={() => { setAssignRole(r.value); setAssignOpen(true); }} className="rounded-xl border border-gray-200 p-4 text-left hover:bg-gray-50">
                  <div className="flex items-center justify-between"><p className="font-medium">{r.name}</p><FaChevronRight className="text-gray-400" /></div>
                  <p className="mt-1 text-sm text-gray-500">{r.users} users assigned</p>
                </button>
              ))}
            </div>
            <button onClick={() => setAssignOpen(true)} className="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white"><FaPlus className="mr-2 inline" /> Assign Role</button>
          </SurfaceCard>
        ) : null}

        {activeTab === "system-settings" ? (
          <SurfaceCard>
            <h2 className="mb-3 text-xl font-semibold">System Settings</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div><label className="field-label">Company Name</label><input className="field-input" value={systemSettings.companyName} onChange={(e) => setSystemSettings((s) => ({ ...s, companyName: e.target.value }))} /></div>
              <div><label className="field-label">Support Email</label><input className="field-input" value={systemSettings.supportEmail} onChange={(e) => setSystemSettings((s) => ({ ...s, supportEmail: e.target.value }))} /></div>
              <div><label className="field-label">Support Phone</label><input className="field-input" value={systemSettings.supportPhone} onChange={(e) => setSystemSettings((s) => ({ ...s, supportPhone: e.target.value }))} /></div>
              <div><label className="field-label">Website URL</label><input className="field-input" value={systemSettings.websiteUrl} onChange={(e) => setSystemSettings((s) => ({ ...s, websiteUrl: e.target.value }))} /></div>
            </div>
            <button onClick={() => void saveSystem()} disabled={savingSystem} className="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white">{savingSystem ? "Saving..." : "Save Settings"}</button>
          </SurfaceCard>
        ) : null}

        {activeTab === "pdf-templates" ? (
          <SurfaceCard>
            <h2 className="text-xl font-semibold">PDF Templates</h2>
            <p className="mt-1 text-sm text-gray-500">Template editor module ready for integration.</p>
          </SurfaceCard>
        ) : null}

        {activeTab === "integrations" ? (
          <SurfaceCard>
            <h2 className="text-xl font-semibold">Integrations</h2>
            <p className="mt-1 text-sm text-gray-500">Configure Meta, WhatsApp, SMTP, and webhook settings.</p>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div><label className="field-label">Meta App ID</label><input className="field-input" value={integrationSettings.metaAppId} onChange={(e) => setIntegrationSettings((s) => ({ ...s, metaAppId: e.target.value }))} /></div>
              <div><label className="field-label">Meta Access Token</label><input className="field-input" value={integrationSettings.metaAccessToken} onChange={(e) => setIntegrationSettings((s) => ({ ...s, metaAccessToken: e.target.value }))} /></div>
              <div><label className="field-label">WhatsApp API Token</label><input className="field-input" value={integrationSettings.whatsappApiToken} onChange={(e) => setIntegrationSettings((s) => ({ ...s, whatsappApiToken: e.target.value }))} /></div>
              <div><label className="field-label">SMTP Host</label><input className="field-input" value={integrationSettings.smtpHost} onChange={(e) => setIntegrationSettings((s) => ({ ...s, smtpHost: e.target.value }))} /></div>
            </div>
            <button onClick={() => void saveIntegrations()} disabled={savingIntegrations} className="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white">{savingIntegrations ? "Saving..." : "Save Integrations"}</button>
          </SurfaceCard>
        ) : null}
      </div>

      {inviteOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setInviteOpen(false)} />
          <div className="relative w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold">Invite Team Member</h3>
            <div className="mt-4 space-y-3">
              <input className="field-input" placeholder="Full Name" value={inviteForm.fullName} onChange={(e) => setInviteForm((f) => ({ ...f, fullName: e.target.value }))} />
              <input className="field-input" placeholder="Email" value={inviteForm.email} onChange={(e) => setInviteForm((f) => ({ ...f, email: e.target.value }))} />
              <input className="field-input" placeholder="Temporary Password" type="password" value={inviteForm.password} onChange={(e) => setInviteForm((f) => ({ ...f, password: e.target.value }))} />
              <select className="field-input" value={inviteForm.role} onChange={(e) => setInviteForm((f) => ({ ...f, role: e.target.value }))}>
                <option value="">Select Role (optional)</option>
                {roles.map((r) => <option key={r.id} value={r.value}>{r.name}</option>)}
              </select>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setInviteOpen(false)} className="rounded-xl border border-gray-200 px-4 py-2 text-sm">Cancel</button>
              <button onClick={() => void onInvite()} disabled={inviteLoading} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white">{inviteLoading ? "Inviting..." : "Send Invitation"}</button>
            </div>
          </div>
        </div>
      ) : null}

      {assignOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setAssignOpen(false)} />
          <div className="relative w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold">Assign Role</h3>
            <div className="mt-4 space-y-3">
              <select className="field-input" value={assignUserId} onChange={(e) => setAssignUserId(e.target.value)}>
                <option value="">Select user</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.fullName} ({u.email})</option>)}
              </select>
              <select className="field-input" value={assignRole} onChange={(e) => setAssignRole(e.target.value)}>
                <option value="">Select role</option>
                {roles.map((r) => <option key={r.id} value={r.value}>{r.name}</option>)}
              </select>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setAssignOpen(false)} className="rounded-xl border border-gray-200 px-4 py-2 text-sm">Cancel</button>
              <button onClick={() => void onAssignRole()} disabled={assignLoading} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white">{assignLoading ? "Assigning..." : "Assign Role"}</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

const StatCard = ({
  title,
  value,
  icon,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
}) => (
  <SurfaceCard hoverable className="flex items-center justify-between p-5">
    <div>
      <p className="text-xs uppercase tracking-wide text-gray-500">{title}</p>
      <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">{value}</p>
    </div>
    {icon}
  </SurfaceCard>
);

export default Settings;
