import { useCallback, useEffect, useMemo, useState } from "react";
import { FaRotate, FaTriangleExclamation } from "react-icons/fa6";
import CurrencySelector from "../../components/ui/CurrencySelector";
import SurfaceCard from "../../components/ui/SurfaceCard";
import { reportsApi } from "../../api/reports";
import { useCurrency } from "../../hooks/useCurrency";

type ExecutiveKpis = {
  totalLeads?: number;
  convertedLeads?: number;
  totalBookings?: number;
  revenue?: number;
  profit?: number;
  pendingFollowups?: number;
  overdueFollowups?: number;
  currency?: string;
};

type RevenueServiceRow = {
  serviceType?: string;
  totalBookings?: number;
  revenue?: number;
};

type RevenueDestinationRow = {
  destination?: string;
  totalBookings?: number;
  revenue?: number;
};

type CurrencyBreakdownRow = {
  currency?: string;
  totalQuotes?: number;
  supplierCost?: number;
  markupAmount?: number;
  serviceFeeAmount?: number;
  gstAmount?: number;
  tcsAmount?: number;
  totalSaleValue?: number;
};

type CostSummary = {
  totalQuotes?: number;
  supplierCost?: number;
  markupAmount?: number;
  serviceFeeAmount?: number;
  gstAmount?: number;
  tcsAmount?: number;
  totalSaleValue?: number;
};

type ReportState = {
  executive: ExecutiveKpis | null;
  serviceRows: RevenueServiceRow[];
  destinationRows: RevenueDestinationRow[];
  currencyBreakdown: CurrencyBreakdownRow[];
  costSummary: CostSummary | null;
};

type CostBreakupPayload = {
  summary?: CostSummary;
  currencyBreakdown?: CurrencyBreakdownRow[];
};

type ApiResult<T> = {
  label: string;
  ok: boolean;
  data: T;
  error?: string;
};

const emptyState: ReportState = {
  executive: null,
  serviceRows: [],
  destinationRows: [],
  currencyBreakdown: [],
  costSummary: null,
};

const toDateInput = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const getMonthStart = () => {
  const now = new Date();
  return toDateInput(new Date(now.getFullYear(), now.getMonth(), 1));
};

const getToday = () => toDateInput(new Date());

const unwrapData = <T,>(response: unknown, fallback: T): T => {
  const payload = (response as { data?: unknown })?.data ?? response;
  return (payload ?? fallback) as T;
};

const unwrapArray = <T,>(response: unknown): T[] => {
  const payload = unwrapData<unknown>(response, []);
  return Array.isArray(payload) ? (payload as T[]) : [];
};

const unwrapObject = <T extends object>(response: unknown, fallback: T): T => {
  const payload = unwrapData<unknown>(response, fallback);
  return payload && typeof payload === "object" && !Array.isArray(payload)
    ? (payload as T)
    : fallback;
};

const toNumber = (value: unknown) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatNumber = (value: unknown) => {
  if (value === null || value === undefined || value === "") return "-";
  return Number(toNumber(value)).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  });
};

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Request failed.";

const fetchReport = async <T,>(
  label: string,
  request: () => Promise<unknown>,
  parser: (response: unknown) => T,
  fallback: T,
): Promise<ApiResult<T>> => {
  try {
    return {
      label,
      ok: true,
      data: parser(await request()),
    };
  } catch (error) {
    return {
      label,
      ok: false,
      data: fallback,
      error: getErrorMessage(error),
    };
  }
};

const ReportsPage = () => {
  const [from, setFrom] = useState(getMonthStart);
  const [to, setTo] = useState(getToday);
  const [selectedCurrency, setSelectedCurrency] = useState("AED");
  const [data, setData] = useState<ReportState>(emptyState);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [apiErrors, setApiErrors] = useState<string[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [conversionWarning, setConversionWarning] = useState<string | null>(null);
  const [convertedRevenue, setConvertedRevenue] = useState(0);
  const [convertedProfit, setConvertedProfit] = useState(0);
  const { convert, formatAmount } = useCurrency();

  const baseCurrency = String(data.executive?.currency || "AED").toUpperCase();

  const loadReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    setApiErrors([]);
    const params = { from, to };

    const [executive, serviceRows, destinationRows, costBreakup] =
      await Promise.all([
        fetchReport(
          "Executive KPIs",
          () => reportsApi.dashboardExecutiveKpis(params),
          (response) => unwrapObject<ExecutiveKpis>(response, {}),
          {},
        ),
        fetchReport(
          "Revenue by service type",
          () => reportsApi.revenueByServiceType(params),
          unwrapArray<RevenueServiceRow>,
          [],
        ),
        fetchReport(
          "Revenue by destination",
          () => reportsApi.revenueByDestination(params),
          unwrapArray<RevenueDestinationRow>,
          [],
        ),
        fetchReport(
          "Finance cost breakup",
          () => reportsApi.financeCostBreakup(params),
          (response) => unwrapObject<CostBreakupPayload>(response, {}),
          {},
        ),
      ]);

    const failedApis = [executive, serviceRows, destinationRows, costBreakup]
      .filter((result) => !result.ok)
      .map((result) => `${result.label}: ${result.error}`);
    const costPayload = costBreakup.data;

    setData({
      executive: executive.ok ? executive.data : null,
      serviceRows: serviceRows.data,
      destinationRows: destinationRows.data,
      currencyBreakdown: Array.isArray(costPayload.currencyBreakdown)
        ? costPayload.currencyBreakdown
        : [],
      costSummary: costPayload.summary ?? null,
    });
    setApiErrors(failedApis);
    setError(failedApis.length === 4 ? "All report APIs failed." : null);
    setLastUpdated(new Date().toLocaleString("en-IN"));
    setLoading(false);
  }, [from, to]);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  useEffect(() => {
    let mounted = true;

    const syncConvertedTotals = async () => {
      const revenue = toNumber(data.executive?.revenue);
      const profit = toNumber(data.executive?.profit);
      setConversionWarning(null);

      if (!data.executive) {
        setConvertedRevenue(0);
        setConvertedProfit(0);
        return;
      }

      if (selectedCurrency === baseCurrency) {
        setConvertedRevenue(revenue);
        setConvertedProfit(profit);
        return;
      }

      try {
        const [nextRevenue, nextProfit] = await Promise.all([
          convert(revenue, baseCurrency, selectedCurrency),
          convert(profit, baseCurrency, selectedCurrency),
        ]);
        if (mounted) {
          setConvertedRevenue(nextRevenue);
          setConvertedProfit(nextProfit);
        }
      } catch {
        if (mounted) {
          setConvertedRevenue(revenue);
          setConvertedProfit(profit);
          setConversionWarning(`Currency conversion failed. Showing ${baseCurrency} values.`);
        }
      }
    };

    void syncConvertedTotals();
    return () => {
      mounted = false;
    };
  }, [baseCurrency, convert, data.executive, selectedCurrency]);

  const kpis = useMemo(
    () => [
      { label: "Total Leads", value: formatNumber(data.executive?.totalLeads) },
      { label: "Converted Leads", value: formatNumber(data.executive?.convertedLeads) },
      { label: "Total Bookings", value: formatNumber(data.executive?.totalBookings) },
      {
        label: "Revenue",
        value: data.executive
          ? formatAmount(convertedRevenue, selectedCurrency)
          : "-",
      },
      {
        label: "Profit",
        value: data.executive
          ? formatAmount(convertedProfit, selectedCurrency)
          : "-",
      },
      { label: "Pending Follow-ups", value: formatNumber(data.executive?.pendingFollowups) },
      { label: "Overdue Follow-ups", value: formatNumber(data.executive?.overdueFollowups) },
    ],
    [convertedProfit, convertedRevenue, data.executive, formatAmount, selectedCurrency],
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-950 dark:text-gray-50">
            Overall Report
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Simple CRM summary with currency-aware totals.
          </p>
          <p className="mt-1 text-xs text-gray-400">
            APIs: Executive KPIs, service revenue, destination revenue, finance cost breakup.
          </p>
          {lastUpdated ? (
            <p className="mt-1 text-xs text-gray-400">
              Last updated: {lastUpdated}
            </p>
          ) : null}
        </div>
        <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-3 shadow-sm sm:flex-row sm:items-end dark:border-gray-800 dark:bg-gray-950">
          <label className="text-xs font-medium text-gray-600 dark:text-gray-300">
            From
            <input
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              className="mt-1 h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900"
            />
          </label>
          <label className="text-xs font-medium text-gray-600 dark:text-gray-300">
            To
            <input
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              className="mt-1 h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900"
            />
          </label>
          <div>
            <p className="mb-1 text-xs font-medium text-gray-600 dark:text-gray-300">
              Currency
            </p>
            <CurrencySelector value={selectedCurrency} onChange={setSelectedCurrency} />
          </div>
          <p className="pb-2 text-xs text-gray-500">Base: {baseCurrency}</p>
          <button
            type="button"
            onClick={() => void loadReports()}
            disabled={loading}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white disabled:opacity-60"
          >
            <FaRotate className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {conversionWarning ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
          {conversionWarning}
        </div>
      ) : null}

      {apiErrors.length ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <p className="font-semibold">Some report APIs failed.</p>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            {apiErrors.map((apiError) => (
              <li key={apiError}>{apiError}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {error ? (
        <SurfaceCard className="border border-red-200 bg-red-50 p-4 text-red-700">
          <div className="flex items-start gap-3">
            <FaTriangleExclamation className="mt-1" />
            <div>
              <p className="font-semibold">Unable to load overall report.</p>
              <p className="mt-1 text-sm">{error}</p>
            </div>
          </div>
        </SurfaceCard>
      ) : null}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {kpis.map((item) => (
          <SurfaceCard key={item.label} className="border border-gray-200 p-4 dark:border-gray-800">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              {item.label}
            </p>
            <p className="mt-3 text-2xl font-semibold leading-tight text-gray-950 dark:text-gray-50">
              {loading ? "Loading..." : item.value}
            </p>
          </SurfaceCard>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ReportTable
          title="Revenue By Service Type"
          rows={data.serviceRows}
          columns={[
            { key: "serviceType", label: "Service" },
            { key: "totalBookings", label: "Bookings", format: formatNumber },
            { key: "revenue", label: `Revenue (${baseCurrency})`, format: (value) => formatAmount(toNumber(value), baseCurrency) },
          ]}
          loading={loading}
        />
        <ReportTable
          title="Revenue By Destination"
          rows={data.destinationRows}
          columns={[
            { key: "destination", label: "Destination" },
            { key: "totalBookings", label: "Bookings", format: formatNumber },
            { key: "revenue", label: `Revenue (${baseCurrency})`, format: (value) => formatAmount(toNumber(value), baseCurrency) },
          ]}
          loading={loading}
        />
      </div>

      <ReportTable
        title="Finance Currency Breakdown"
        rows={data.currencyBreakdown}
        columns={[
          { key: "currency", label: "Currency" },
          { key: "totalQuotes", label: "Quotes", format: formatNumber },
          { key: "supplierCost", label: "Supplier Cost", format: formatNumber },
          { key: "markupAmount", label: "Markup", format: formatNumber },
          { key: "serviceFeeAmount", label: "Service Fee", format: formatNumber },
          { key: "gstAmount", label: "GST", format: formatNumber },
          { key: "tcsAmount", label: "TCS", format: formatNumber },
          { key: "totalSaleValue", label: "Sale Value", format: formatNumber },
        ]}
        loading={loading}
      />

      <ReportTable
        title="Recent Summary Table"
        rows={data.costSummary ? [data.costSummary] : []}
        columns={[
          { key: "totalQuotes", label: "Quotes", format: formatNumber },
          { key: "supplierCost", label: "Supplier Cost", format: formatNumber },
          { key: "markupAmount", label: "Markup", format: formatNumber },
          { key: "serviceFeeAmount", label: "Service Fee", format: formatNumber },
          { key: "gstAmount", label: "GST", format: formatNumber },
          { key: "tcsAmount", label: "TCS", format: formatNumber },
          { key: "totalSaleValue", label: "Sale Value", format: formatNumber },
        ]}
        loading={loading}
      />
    </div>
  );
};

type ReportColumn = {
  key: string;
  label: string;
  format?: (value: unknown) => string;
};

const ReportTable = ({
  title,
  rows,
  columns,
  loading,
}: {
  title: string;
  rows: Array<Record<string, unknown>>;
  columns: ReportColumn[];
  loading: boolean;
}) => (
  <SurfaceCard className="overflow-hidden border border-gray-200 p-0 dark:border-gray-800">
    <div className="border-b border-gray-100 px-4 py-3 dark:border-gray-800">
      <h2 className="text-sm font-semibold text-gray-950 dark:text-gray-50">{title}</h2>
    </div>
    {loading ? (
      <div className="p-5 text-sm text-gray-500">Loading...</div>
    ) : rows.length ? (
      <div className="overflow-x-auto">
        <table className="min-w-[720px] w-full table-fixed">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              {columns.map((column) => (
                <th key={String(column.key)} className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index} className="border-b border-gray-100 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900/60">
                {columns.map((column) => {
                  const value = row[column.key];
                  return (
                    <td key={String(column.key)} className="truncate px-3 py-2.5 text-sm text-gray-800 dark:text-gray-200" title={String(value ?? "")}> 
                      {column.format ? column.format(value) : String(value ?? "-")}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ) : (
      <div className="p-5 text-sm text-gray-500">No data found for selected filters.</div>
    )}
  </SurfaceCard>
);

export default ReportsPage;
