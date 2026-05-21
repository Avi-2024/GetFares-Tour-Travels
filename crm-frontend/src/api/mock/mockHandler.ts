import type { ApiRequestConfig } from "../apiClient";
import { STANDALONE_TOKEN } from "../../config/standalone";
import {
  allPermissions,
  demoUser,
  mockBookings,
  mockCampaigns,
  mockComplaints,
  mockCustomers,
  mockDestinations,
  mockLeads,
  mockNotifications,
  mockPackages,
  mockPayments,
  mockQuotations,
  mockRoles,
  mockSuppliers,
  mockUsers,
  mockVisaCases,
  nextId,
} from "./mockStore";

type MockRequest = {
  method: string;
  path: string;
  data?: unknown;
  params?: Record<string, unknown>;
  responseType?: string;
};

const paginate = <T>(items: T[], params?: Record<string, unknown>) => {
  const page = Math.max(1, Number(params?.page) || 1);
  const limit = Math.max(1, Number(params?.limit) || 20);
  const start = (page - 1) * limit;
  const slice = items.slice(start, start + limit);
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return {
    items: slice,
    data: slice,
    pagination: { page, limit, total, totalPages },
  };
};

const listResponse = <T>(items: T[], params?: Record<string, unknown>) => ({
  success: true,
  data: paginate(items, params),
});

const itemResponse = <T>(item: T) => ({
  success: true,
  data: item,
});

const okMessage = (message: string) => ({
  success: true,
  message,
});

const findById = <T extends { id?: string }>(
  items: T[],
  id: string,
): T | undefined => items.find((row) => String(row.id) === String(id));

const parsePath = (url: string) => {
  const [path, query = ""] = url.split("?");
  const params: Record<string, string> = {};
  new URLSearchParams(query).forEach((value, key) => {
    params[key] = value;
  });
  return { path, params };
};

const dashboardStats = () => ({
  totalLeads: mockLeads.length,
  totalLeadsChange: 12,
  revenue: 245000,
  currency: "AED",
  revenueChange: 8,
  pendingCalls: 3,
  pendingCallsChange: -2,
  bookings: mockBookings.length,
  bookingsChange: 5,
});

const revenueChart = (range?: string) => {
  const labels =
    range === "Today"
      ? ["9 AM", "12 PM", "3 PM", "6 PM"]
      : range === "Month" || range === "Year"
        ? ["Jan", "Feb", "Mar", "Apr", "May", "Jun"]
        : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return labels.map((name, index) => ({
    name,
    revenue: 12000 + index * 3500,
    last: 9000 + index * 2800,
  }));
};

const currencyRates = () => ({
  baseCurrency: "AED",
  source: "mock" as const,
  updatedAt: new Date().toISOString(),
  rates: {
    AED: { code: "AED", value: 1 },
    USD: { code: "USD", value: 0.27 },
    EUR: { code: "EUR", value: 0.25 },
    GBP: { code: "GBP", value: 0.21 },
    INR: { code: "INR", value: 22.5 },
    SAR: { code: "SAR", value: 1.02 },
  },
});

export const handleMockRequest = async (req: MockRequest): Promise<unknown> => {
  const method = req.method.toUpperCase();
  const { path, params: queryParams } = parsePath(req.path);
  const params = { ...queryParams, ...(req.params as Record<string, unknown>) };

  if (req.responseType === "blob") {
    return new Blob(["demo,export,data"], { type: "text/csv" });
  }

  if (path === "/api/auth/login" && method === "POST") {
    const body = (req.data || {}) as { email?: string; password?: string };
    if (!body.email || !body.password || String(body.password).length < 6) {
      throw Object.assign(new Error("Invalid credentials"), { status: 401 });
    }
    return {
      data: {
        accessToken: STANDALONE_TOKEN,
        user: { ...demoUser, email: body.email },
      },
    };
  }

  if (path.startsWith("/api/auth/me")) {
    return { data: demoUser };
  }

  if (path === "/api/auth/forgot-password" || path === "/api/auth/reset-password") {
    return okMessage("Demo mode: email flow simulated.");
  }

  if (path === "/api/auth/toggle-active") {
    return { data: { ...demoUser, active: true } };
  }

  if (path === "/api/rbac/me/permissions") {
    return { data: { role: "admin", roleId: demoUser.roleId, permissions: ["*"] } };
  }

  if (path === "/api/permissions") {
    return {
      data: allPermissions.map((key, index) => ({
        id: `perm-${index}`,
        key,
        isActive: true,
      })),
    };
  }

  if (path === "/api/roles") {
    return { data: mockRoles };
  }

  if (/^\/api\/roles\/[^/]+\/permissions$/.test(path)) {
    return { data: allPermissions };
  }

  if (path === "/api/currency/rates") {
    return { success: true, data: currencyRates() };
  }

  if (path.startsWith("/api/currency/convert")) {
    const amount = Number(params.amount) || 0;
    const from = String(params.from || "AED").toUpperCase();
    const to = String(params.to || "INR").toUpperCase();
    const rates = currencyRates().rates;
    const fromRate = rates[from as keyof typeof rates]?.value ?? 1;
    const toRate = rates[to as keyof typeof rates]?.value ?? 1;
    const converted = (amount / fromRate) * toRate;
    return { success: true, data: { amount, from, to, converted } };
  }

  if (path === "/api/dashboard/stats") {
    return { data: dashboardStats() };
  }

  if (path === "/api/dashboard/revenue") {
    return { data: revenueChart(String(params.range || "Week")) };
  }

  if (path === "/api/dashboard/lead-sources") {
    return {
      data: [
        { name: "Website", value: 35 },
        { name: "Meta Ads", value: 28 },
        { name: "Referral", value: 18 },
        { name: "Walk-in", value: 12 },
      ],
    };
  }

  if (path.startsWith("/api/reports/")) {
    return {
      data: {
        rows: [],
        summary: {},
        kpis: dashboardStats(),
        series: revenueChart("Month"),
      },
    };
  }

  if (path === "/api/leads" && method === "GET") {
    return listResponse(mockLeads, params);
  }

  if (path === "/api/leads" && method === "POST") {
    const body = (req.data || {}) as Record<string, unknown>;
    const created = {
      ...mockLeads[0],
      id: nextId(),
      leadId: `LD-${nextId()}`,
      leadCode: `LD-${nextId()}`,
      fullName: String(body.fullName || body.name || "New Lead"),
      email: String(body.email || ""),
      phone: String(body.phone || ""),
      status: "OPEN",
      statusLabel: "New",
      createdAt: new Date().toISOString(),
      destination:
        (body.destination as { name: string; country: string }) ||
        { name: "Dubai", country: "UAE" },
      adultsCount: Number(body.adultsCount) || 2,
      childrenCount: Number(body.childrenCount) || 0,
    };
    mockLeads.unshift(created);
    return itemResponse(created);
  }

  if (/^\/api\/leads\/[^/]+$/.test(path) && method === "GET") {
    const id = path.split("/").pop() || "";
    return itemResponse(findById(mockLeads, id) || mockLeads[0]);
  }

  if (/^\/api\/leads\/[^/]+$/.test(path) && (method === "PATCH" || method === "PUT")) {
    const id = path.split("/").pop() || "";
    const existing = findById(mockLeads, id);
    if (existing) Object.assign(existing, req.data as object);
    return itemResponse(existing || mockLeads[0]);
  }

  if (path.endsWith("/followups")) {
    return { data: { items: [], data: [] } };
  }

  if (path === "/api/customers" && method === "GET") {
    return listResponse(mockCustomers, params);
  }

  if (path === "/api/customers" && method === "POST") {
    const created = { id: nextId(), ...(req.data as object), createdAt: new Date().toISOString() };
    mockCustomers.unshift(created as (typeof mockCustomers)[0]);
    return itemResponse(created);
  }

  if (/^\/api\/customers\/[^/]+\/leads$/.test(path)) {
    return listResponse(mockLeads.slice(0, 1), params);
  }

  if (/^\/api\/customers\/[^/]+\/bookings$/.test(path)) {
    return listResponse(mockBookings.slice(0, 1), params);
  }

  if (/^\/api\/customers\/[^/]+$/.test(path)) {
    const id = path.split("/")[3] || "";
    return itemResponse(findById(mockCustomers, id) || mockCustomers[0]);
  }

  if (path === "/api/bookings" && method === "GET") {
    return listResponse(mockBookings, params);
  }

  if (path === "/api/bookings/stats") {
    return {
      data: {
        total: mockBookings.length,
        confirmed: 1,
        pending: 1,
        cancelled: 0,
      },
    };
  }

  if (/^\/api\/bookings\/[^/]+$/.test(path)) {
    const id = path.split("/")[3] || "";
    return itemResponse(findById(mockBookings, id) || mockBookings[0]);
  }

  if (path === "/api/quotations" && method === "GET") {
    return listResponse(mockQuotations, params);
  }

  if (path === "/api/quotations/templates") {
    return { data: [{ id: "tpl1", name: "Standard Package", isDefault: true }] };
  }

  if (/^\/api\/quotations\/[^/]+$/.test(path)) {
    const id = path.split("/")[3] || "";
    return itemResponse(findById(mockQuotations, id) || mockQuotations[0]);
  }

  if (path === "/api/campaigns" && method === "GET") {
    return listResponse(mockCampaigns, params);
  }

  if (/^\/api\/campaigns\/[^/]+$/.test(path)) {
    const id = path.split("/")[3] || "";
    return itemResponse(findById(mockCampaigns, id) || mockCampaigns[0]);
  }

  if (path === "/api/complaints" && method === "GET") {
    return listResponse(mockComplaints, params);
  }

  if (/^\/api\/complaints\/[^/]+\/activities$/.test(path)) {
    return { data: [] };
  }

  if (/^\/api\/complaints\/[^/]+$/.test(path)) {
    const id = path.split("/")[3] || "";
    return itemResponse(findById(mockComplaints, id) || mockComplaints[0]);
  }

  if (path === "/api/refunds" && method === "GET") {
    return listResponse([], params);
  }

  if (path === "/api/users" && method === "GET") {
    return listResponse(mockUsers, params);
  }

  if (path === "/api/users/roles") {
    return { data: mockRoles };
  }

  if (path === "/api/notifications" && method === "GET") {
    return {
      data: {
        items: mockNotifications,
        unreadCount: mockNotifications.filter((n) => !n.isRead).length,
        pagination: paginate(mockNotifications, params).pagination,
      },
    };
  }

  if (path === "/api/notifications/unread-count") {
    return {
      data: {
        unreadCount: mockNotifications.filter((n) => !n.isRead).length,
      },
    };
  }

  if (path === "/api/destinations" && method === "GET") {
    return { data: mockDestinations };
  }

  if (/^\/api\/destinations\/[^/]+$/.test(path)) {
    const id = path.split("/")[3] || "";
    return itemResponse(findById(mockDestinations, id) || mockDestinations[0]);
  }

  if (path === "/api/packages" && method === "GET") {
    return listResponse(mockPackages, params);
  }

  if (path.startsWith("/api/packages/main")) {
    return listResponse(
      mockPackages.map((p) => ({ ...p, type: "main" })),
      params,
    );
  }

  if (path.startsWith("/api/packages/sub")) {
    return listResponse([], params);
  }

  if (/^\/api\/packages\/[^/]+$/.test(path)) {
    const id = path.split("/")[3] || "";
    return itemResponse(findById(mockPackages, id) || mockPackages[0]);
  }

  if (path === "/api/suppliers" && method === "GET") {
    return listResponse(mockSuppliers, params);
  }

  if (/^\/api\/suppliers\/[^/]+$/.test(path)) {
    const id = path.split("/")[3] || "";
    return itemResponse(findById(mockSuppliers, id) || mockSuppliers[0]);
  }

  if (path === "/api/visa" && method === "GET") {
    return listResponse(mockVisaCases, params);
  }

  if (/^\/api\/visa\/[^/]+$/.test(path)) {
    const id = path.split("/")[3] || "";
    return itemResponse(findById(mockVisaCases, id) || mockVisaCases[0]);
  }

  if (path === "/api/payments" && method === "GET") {
    return listResponse(mockPayments, params);
  }

  if (path === "/api/payments/stats") {
    return {
      data: {
        totalReceived: 125000,
        pending: 25000,
        overdue: 5000,
      },
    };
  }

  if (/^\/api\/payments\/[^/]+$/.test(path)) {
    const id = path.split("/")[3] || "";
    return itemResponse(findById(mockPayments, id) || mockPayments[0]);
  }

  if (path.startsWith("/api/settings")) {
    return { data: {} };
  }

  if (path === "/api/countries" && method === "GET") {
    return {
      data: [
        { id: "in", name: "India", code: "IN" },
        { id: "ae", name: "United Arab Emirates", code: "AE" },
      ],
    };
  }

  if (path === "/api/lead-activities" && method === "GET") {
    return { data: [] };
  }

  if (method === "POST" || method === "PATCH" || method === "PUT" || method === "DELETE") {
    return okMessage("Saved in demo mode.");
  }

  if (method === "GET") {
    return listResponse([], params);
  }

  return okMessage("OK");
};

export const toMockRequest = (config: ApiRequestConfig): MockRequest => {
  const url = String(config.url || "");
  const method = String(config.method || "GET").toUpperCase();
  return {
    method,
    path: url.startsWith("/") ? url : `/${url}`,
    data: config.data,
    params: config.params as Record<string, unknown>,
    responseType: config.responseType,
  };
};
