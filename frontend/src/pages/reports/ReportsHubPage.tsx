import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { DateInput } from "../../components/form";
import FilterTabs from "../../components/ui/FilterTabs";
import SurfaceCard from "../../components/ui/SurfaceCard";
import { reportsApi } from "../../api/reports";
import { getApiErrorMessage } from "../../api/apiClient";

type ReportTabId =
  | "dashboard_executive_kpis"
  | "funnel_conversion"
  | "revenue_monthly"
  | "leads_by_source"
  | "leads_by_consultant"
  | "outstanding_payments"
  | "visa_summary"
  | "marketing_performance"
  | "supplier_performance"
  | "pipeline_forecast";

type ReportRow = {
  label: string;
  value: number;
};

const reportTabs: { id: ReportTabId; label: string }[] = [
  { id: "dashboard_executive_kpis", label: "Executive KPIs" },
  { id: "funnel_conversion", label: "Funnel Conversion" },
  { id: "revenue_monthly", label: "Revenue Monthly" },
  { id: "leads_by_source", label: "Leads by Source" },
  { id: "leads_by_consultant", label: "Leads by Consultant" },
  { id: "outstanding_payments", label: "Outstanding Payments" },
  { id: "visa_summary", label: "Visa Summary" },
  { id: "marketing_performance", label: "Marketing Performance" },
  { id: "supplier_performance", label: "Supplier Performance" },
  { id: "pipeline_forecast", label: "Pipeline Forecast" },
];

const fallbackRowsByTab: Record<ReportTabId, ReportRow[]> = {
  dashboard_executive_kpis: [
    { label: "Total Leads", value: 0 },
    { label: "Total Bookings", value: 0 },
    { label: "Revenue", value: 0 },
  ],
  funnel_conversion: [
    { label: "OPEN", value: 0 },
    { label: "CONTACTED", value: 0 },
    { label: "WIP", value: 0 },
    { label: "CONVERTED", value: 0 },
  ],
  leads_by_source: [
    { label: "Website", value: 82 },
    { label: "Meta Ads", value: 63 },
    { label: "Referral", value: 24 },
    { label: "Walk-in", value: 11 },
  ],
  revenue_monthly: [
    { label: "Jan", value: 98000 },
    { label: "Feb", value: 103000 },
    { label: "Mar", value: 118000 },
    { label: "Apr", value: 126000 },
  ],
  leads_by_consultant: [],
  outstanding_payments: [
    { label: "BK-2034", value: 1200 },
    { label: "BK-2033", value: 2800 },
    { label: "BK-2029", value: 650 },
  ],
  visa_summary: [
    { label: "Total Cases", value: 0 },
    { label: "Approved", value: 0 },
    { label: "Rejected", value: 0 },
  ],
  marketing_performance: [],
  supplier_performance: [],
  pipeline_forecast: [],
};

const reportsFetcher: Record<
  ReportTabId,
  (params?: Record<string, string | number | boolean>) => Promise<unknown>
> = {
  dashboard_executive_kpis: reportsApi.dashboardExecutiveKpis,
  funnel_conversion: reportsApi.funnelConversion,
  revenue_monthly: reportsApi.revenueMonthly,
  leads_by_source: reportsApi.leadsBySource,
  leads_by_consultant: reportsApi.leadsByConsultant,
  outstanding_payments: reportsApi.outstandingPayments,
  visa_summary: reportsApi.visaSummary,
  marketing_performance: reportsApi.marketingPerformance,
  supplier_performance: reportsApi.supplierPerformance,
  pipeline_forecast: reportsApi.pipelineForecast,
};

const extractPayload = (response: unknown) => {
  const payload = response as {
    data?: { data?: unknown; items?: unknown } | unknown;
  };
  return (
    (payload?.data as { data?: unknown; items?: unknown })?.data ??
    (payload?.data as { data?: unknown; items?: unknown })?.items ??
    payload?.data ??
    response
  );
};

const toReadableLabel = (key: string) =>
  key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const toNumberSafe = (value: unknown): number | null => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const mapArrayRows = (
  list: unknown[],
  labelKeys: string[],
  valueKeys: string[],
): ReportRow[] =>
  list
    .map((item, index) => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;

      const labelFromKey = labelKeys
        .map((key) => record[key])
        .find((value) => typeof value === "string");
      const fallbackLabel =
        (Object.values(record).find((value) => typeof value === "string") as
          | string
          | undefined) ?? `Row ${index + 1}`;
      const label = String(labelFromKey ?? fallbackLabel);

      const valueFromKey = valueKeys
        .map((key) => toNumberSafe(record[key]))
        .find((value) => value !== null);
      const fallbackValue =
        Object.values(record)
          .map((value) => toNumberSafe(value))
          .find((value) => value !== null) ?? 0;
      const value = Number(valueFromKey ?? fallbackValue);

      return {
        label,
        value,
      };
    })
    .filter((row): row is ReportRow => Boolean(row));

const mapObjectNumericRows = (
  payload: Record<string, unknown>,
  ignoredKeys: string[] = [],
): ReportRow[] =>
  Object.entries(payload)
    .filter(([key]) => !ignoredKeys.includes(key))
    .map(([key, value]) => ({
      label: toReadableLabel(key),
      value: toNumberSafe(value),
    }))
    .filter((row): row is ReportRow => row.value !== null)
    .map((row) => ({ label: row.label, value: Number(row.value) }));

const normalizeRowsForTab = (tab: ReportTabId, payload: unknown): ReportRow[] => {
  switch (tab) {
    case "dashboard_executive_kpis":
      if (payload && typeof payload === "object") {
        return mapObjectNumericRows(payload as Record<string, unknown>);
      }
      return [];

    case "funnel_conversion":
      if (
        payload &&
        typeof payload === "object" &&
        Array.isArray((payload as { funnel?: unknown[] }).funnel)
      ) {
        return mapArrayRows(
          (payload as { funnel: unknown[] }).funnel,
          ["stage"],
          ["count"],
        );
      }
      if (payload && typeof payload === "object") {
        return mapObjectNumericRows(payload as Record<string, unknown>, ["funnel"]);
      }
      return [];

    case "revenue_monthly":
      return Array.isArray(payload)
        ? mapArrayRows(payload, ["month"], ["revenue"])
        : [];

    case "leads_by_source":
      return Array.isArray(payload)
        ? mapArrayRows(payload, ["source"], ["totalLeads"])
        : [];

    case "leads_by_consultant":
      return Array.isArray(payload)
        ? mapArrayRows(payload, ["consultantName", "userId"], ["totalLeads"])
        : [];

    case "outstanding_payments":
      return Array.isArray(payload)
        ? mapArrayRows(payload, ["bookingNumber", "bookingId"], ["outstandingAmount"])
        : [];

    case "visa_summary":
      if (payload && typeof payload === "object") {
        return mapObjectNumericRows(payload as Record<string, unknown>);
      }
      return [];

    case "marketing_performance":
      return Array.isArray(payload)
        ? mapArrayRows(payload, ["name", "source"], ["revenue"])
        : [];

    case "supplier_performance":
      return Array.isArray(payload)
        ? mapArrayRows(payload, ["name"], ["totalCases"])
        : [];

    case "pipeline_forecast":
      if (
        payload &&
        typeof payload === "object" &&
        Array.isArray((payload as { forecastByMonth?: unknown[] }).forecastByMonth)
      ) {
        return mapArrayRows(
          (payload as { forecastByMonth: unknown[] }).forecastByMonth,
          ["month"],
          ["expectedRevenue"],
        );
      }
      if (payload && typeof payload === "object") {
        return mapObjectNumericRows(payload as Record<string, unknown>, [
          "forecastByMonth",
          "seasonalTrend",
        ]);
      }
      return [];

    default:
      return [];
  }
};

const ReportsHubPage = () => {
  const [tab, setTab] = useState<ReportTabId>("leads_by_source");
  const [from, setFrom] = useState("2026-03-01");
  const [to, setTo] = useState("2026-03-12");
  const [rows, setRows] = useState<ReportRow[]>(fallbackRowsByTab.leads_by_source);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const activeTabLabel = useMemo(
    () => reportTabs.find((item) => item.id === tab)?.label ?? "Report",
    [tab],
  );
  const reportTabIds = useMemo(() => new Set(reportTabs.map((item) => item.id)), []);
  const handleTabChange = (nextTabId: string) => {
    if (reportTabIds.has(nextTabId as ReportTabId)) {
      setTab(nextTabId as ReportTabId);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const loadReportRows = async () => {
      setLoading(true);
      setError("");

      try {
        const params: Record<string, string | number | boolean> = {};
        if (from) params.from = from;
        if (to) params.to = to;
        if (tab === "pipeline_forecast") {
          params.periodMonths = 3;
        }

        const response = await reportsFetcher[tab](params);
        const payload = extractPayload(response);
        const mappedRows = normalizeRowsForTab(tab, payload);

        if (cancelled) return;
        setRows(mappedRows.length > 0 ? mappedRows : fallbackRowsByTab[tab]);
      } catch (err) {
        if (cancelled) return;
        const message = getApiErrorMessage(err, "Failed to load report data");
        setError(message);
        setRows(fallbackRowsByTab[tab]);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadReportRows();
    return () => {
      cancelled = true;
    };
  }, [tab, from, to]);

  const exportCsv = () => {
    if (!rows.length) return;
    const csv = [
      "Label,Value",
      ...rows.map(
        (row) =>
          `"${String(row.label).replace(/"/g, '""')}",${Number(row.value)}`,
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${tab}-${from || "from"}-${to || "to"}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Reports Hub
        </h1>
        <p className="text-sm text-gray-500">
          Unified analytics for leads, revenue, payments and operations.
        </p>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300">
          {error}
        </div>
      ) : null}

      <SurfaceCard>
        <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <FilterTabs tabs={reportTabs} active={tab} onChange={handleTabChange} />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <DateInput label="From" value={from} onChange={setFrom} />
            <DateInput label="To" value={to} onChange={setTo} />
          </div>
        </div>

        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="label" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill="#2563eb" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {loading ? (
          <p className="mt-3 text-xs text-gray-500">Loading {activeTabLabel}...</p>
        ) : null}
      </SurfaceCard>

      <SurfaceCard className="p-0 overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-100 p-4 dark:border-gray-800">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            {activeTabLabel} Table
          </h2>
          <button
            onClick={exportCsv}
            disabled={!rows.length}
            className="rounded-lg border border-gray-200 px-3 py-1 text-xs text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            Export CSV
          </button>
        </div>
        <table className="w-full divide-y divide-gray-200 dark:divide-gray-800">
          <thead className="bg-gray-50 dark:bg-gray-800/95">
            <tr>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Label
              </th>
              <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                Value
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {rows.map((row, index) => (
              <tr key={`${row.label}-${index}`}>
                <td className="px-5 py-4 text-sm text-gray-700 dark:text-gray-200">
                  {row.label}
                </td>
                <td className="px-5 py-4 text-right text-sm font-medium text-gray-900 dark:text-gray-100">
                  {row.value.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </SurfaceCard>
    </div>
  );
};

export default ReportsHubPage;
