import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaChevronLeft,
  FaChevronRight,
  FaDownload,
  FaFilter,
  FaMagnifyingGlass,
  FaPlus,
  FaXmark,
} from "react-icons/fa6";
import FilterTabs from "../../components/ui/FilterTabs";
import StatusBadge from "../../components/ui/StatusBadge";
import SurfaceCard from "../../components/ui/SurfaceCard";
import EmptyState from "../../components/ui/EmptyState";
import { SUPPLIERS } from "../../data/staticLists";
import { visaApi } from "../../api/visa";
import { bookingsApi } from "../../api/bookings";
import { suppliersApi } from "../../api/suppliers";
import { reportApiError } from "../../lib/notify";
import { useAuth } from "../../context/AuthContext";
import {
  humanizeVisaStage,
  normalizeVisaStage,
  type VisaWorkflowStage,
} from "./visaWorkflow";

type VisaCase = {
  id: string;
  bookingId: string;
  country: string;
  visaType: string;
  workflowStage: VisaWorkflowStage;
  appointmentDate: string;
  submissionDate: string;
  visaValidUntil?: string;
  supplierId: string;
  fees?: number;
};

const mapApiVisa = (visa: any): VisaCase => ({
  id: visa?.id || "",
  bookingId: visa?.bookingId ?? visa?.booking_id ?? "",
  country: visa?.country ?? "",
  visaType: visa?.visaType ?? visa?.visa_type ?? "",
  workflowStage: normalizeVisaStage(visa?.workflowStage ?? visa?.workflow_stage ?? visa?.status),
  appointmentDate: visa?.appointmentDate ?? visa?.appointment_date ?? "",
  submissionDate: visa?.submissionDate ?? visa?.submission_date ?? "",
  visaValidUntil: visa?.visaValidUntil ?? visa?.visa_valid_until ?? undefined,
  supplierId: visa?.supplierId ?? visa?.supplier_id ?? "",
  fees: typeof visa?.fees === "number" ? visa.fees : Number(visa?.fees ?? 0),
});

const tabs: Array<{ id: "ALL" | VisaWorkflowStage; label: string }> = [
  { id: "ALL", label: "All" },
  { id: "DOCUMENT_COLLECTION", label: "Collection" },
  { id: "APPLICATION_SUBMITTED", label: "Submitted" },
  { id: "BIOMETRICS_SCHEDULED", label: "Biometrics" },
  { id: "UNDER_PROCESS", label: "Under Process" },
  { id: "APPROVED", label: "Approved" },
  { id: "REJECTED", label: "Rejected" },
  { id: "DELIVERED", label: "Delivered" },
];

const VisaCasesPage = () => {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [tab, setTab] = useState<(typeof tabs)[number]["id"]>("ALL");
  const [search, setSearch] = useState("");
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<VisaCase[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [bookingLabelById, setBookingLabelById] = useState<Record<string, string>>({});
  const [supplierNameById, setSupplierNameById] = useState<Record<string, string>>({});
  const pageSize = 6;

  const shortId = (value?: string) => {
    const normalized = String(value || "").trim();
    if (!normalized) return "N/A";
    if (normalized.length <= 12) return normalized;
    return `${normalized.slice(0, 8)}...`;
  };

  const formatDate = (date: string) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getDaysToExpiry = (visaValidUntil?: string) => {
    if (!visaValidUntil) return null;
    const now = new Date();
    const target = new Date(visaValidUntil);
    now.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);
    const diff = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return Number.isFinite(diff) ? diff : null;
  };

  const getBookingLabel = useCallback(
    (bookingId: string) => {
      const normalized = String(bookingId || "").trim();
      if (!normalized) return "Not linked";
      return bookingLabelById[normalized] || `Booking ${shortId(normalized)}`;
    },
    [bookingLabelById],
  );

  const getSupplierName = useCallback(
    (supplierId: string) => {
      const fromApi = supplierNameById[supplierId];
      if (fromApi) return fromApi;
      const supplier = SUPPLIERS.find((item) => item.id === supplierId);
      if (supplier?.name) return supplier.name;
      if (!supplierId) return "Not linked";
      return supplierId.length > 8 ? `${supplierId.slice(0, 8)}...` : supplierId;
    },
    [supplierNameById],
  );

  useEffect(() => {
    const loadVisaCases = async () => {
      if (!token) {
        setRows([]);
        setError("Please login to view visa cases.");
        return;
      }

      setLoading(true);
      setError("");
      try {
        const response = await visaApi.list();
        const payload = (response as any)?.data ?? response;
        const data = (payload as any)?.data || (payload as any)?.items || payload;
        setRows(Array.isArray(data) ? data.map(mapApiVisa) : []);
      } catch (err) {
        console.error("Failed to load visa cases:", err);
        setRows([]);
        reportApiError(err, "Failed to load visa cases.", setError);
      } finally {
        setLoading(false);
      }
    };

    void loadVisaCases();
  }, [token]);

  useEffect(() => {
    const loadLookups = async () => {
      if (!token) {
        setBookingLabelById({});
        setSupplierNameById({});
        return;
      }

      try {
        const [bookingsRes, suppliersRes] = await Promise.all([
          bookingsApi.list({ page: 1, limit: 300 }),
          suppliersApi.list({ page: 1, limit: 300 }),
        ]);

        const bookingsPayload = (bookingsRes as any)?.data ?? bookingsRes;
        const bookingsData =
          (bookingsPayload as any)?.data ||
          (bookingsPayload as any)?.items ||
          bookingsPayload ||
          [];
        const nextBookingLabelById: Record<string, string> = {};
        (Array.isArray(bookingsData) ? bookingsData : []).forEach((booking: any) => {
          const id = String(booking?.id || "");
          if (!id) return;
          const bookingNumber =
            booking?.bookingNumber || booking?.booking_number || booking?.code || shortId(id);
          const customer =
            booking?.customerName ||
            booking?.customer_name ||
            booking?.leadName ||
            booking?.lead_name ||
            "";
          nextBookingLabelById[id] = customer ? `${bookingNumber} - ${customer}` : String(bookingNumber);
        });
        setBookingLabelById(nextBookingLabelById);

        const suppliersPayload = (suppliersRes as any)?.data ?? suppliersRes;
        const suppliersData =
          (suppliersPayload as any)?.data ||
          (suppliersPayload as any)?.items ||
          suppliersPayload ||
          [];
        const nextSupplierNameById: Record<string, string> = {};
        (Array.isArray(suppliersData) ? suppliersData : []).forEach((supplier: any) => {
          const id = String(supplier?.id || "");
          const name = String(supplier?.name || "").trim();
          if (id && name) {
            nextSupplierNameById[id] = name;
          }
        });
        setSupplierNameById(nextSupplierNameById);
      } catch (lookupError) {
        console.error("Failed to load visa lookups:", lookupError);
      }
    };

    void loadLookups();
  }, [token]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesTab = tab === "ALL" || row.workflowStage === tab;
      if (!query) return matchesTab;
      const appointmentText = row.appointmentDate
        ? new Date(row.appointmentDate).toLocaleDateString()
        : "";
      const appointmentIso = row.appointmentDate
        ? new Date(row.appointmentDate).toISOString().split("T")[0]
        : "";
      const submissionText = row.submissionDate
        ? new Date(row.submissionDate).toLocaleDateString()
        : "";
      const submissionIso = row.submissionDate
        ? new Date(row.submissionDate).toISOString().split("T")[0]
        : "";
      const validUntilText = row.visaValidUntil
        ? new Date(row.visaValidUntil).toLocaleDateString()
        : "";
      const validUntilIso = row.visaValidUntil
        ? new Date(row.visaValidUntil).toISOString().split("T")[0]
        : "";
      const haystack = [
        row.id,
        row.bookingId,
        getBookingLabel(row.bookingId),
        row.country,
        row.visaType,
        humanizeVisaStage(row.workflowStage),
        getSupplierName(row.supplierId),
        appointmentText,
        appointmentIso,
        submissionText,
        submissionIso,
        validUntilText,
        validUntilIso,
        row.fees != null ? String(row.fees) : ""
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(query) && matchesTab;
    });
  }, [getBookingLabel, getSupplierName, rows, search, tab]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginatedRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  const exportCurrentTable = () => {
    if (!paginatedRows.length) return;

    const headers = [
      'Case ID',
      'Booking',
      'Country',
      'Visa Type',
      'Stage',
      'Appointment Date',
      'Submission Date',
      'Valid Until',
      'Supplier',
      'Fees'
    ];

    const escapeCsv = (value: string) => `"${value.replace(/"/g, '""')}"`;

    const dataRows = paginatedRows.map(row => [
      row.id ?? '',
      getBookingLabel(row.bookingId),
      row.country ?? '',
      row.visaType ?? '',
      humanizeVisaStage(row.workflowStage),
      row.appointmentDate ?? '',
      row.submissionDate ?? '',
      row.visaValidUntil ?? '',
      getSupplierName(row.supplierId),
      row.fees ?? 0
    ]);

    const csv = [headers, ...dataRows]
      .map(row => row.map(cell => escapeCsv(String(cell))).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `visa-cases-page-${page}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const summary = useMemo(() => {
    const expiringSoon = rows.filter((row) => {
      const days = getDaysToExpiry(row.visaValidUntil);
      return days !== null && days >= 0 && days <= 14;
    }).length;
    return {
      total: rows.length,
      collection: rows.filter((row) => row.workflowStage === "DOCUMENT_COLLECTION").length,
      biometrics: rows.filter((row) => row.workflowStage === "BIOMETRICS_SCHEDULED").length,
      expiringSoon,
    };
  }, [rows]);

  return (
    <div className="mx-auto max-w-8xl space-y-4 px-0 sm:space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 sm:text-2xl">
            Visa Cases
          </h1>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 sm:text-sm">
            Separate visa workflow as per PRD: document collection, application submitted, biometrics, under process, approved/rejected, and delivered.
          </p>
          {error ? <p className="mt-2 text-xs text-red-500 sm:text-sm">{error}</p> : null}
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <button
            onClick={exportCurrentTable}
            disabled={!paginatedRows.length}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-green-500 px-4 py-2 text-sm font-medium text-white transition-colors bg-[rgba(96,47,247,0.8)] hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-green-400 dark:text-gray-200 dark:hover:bg-gray-800 sm:w-auto"
          >
            <FaDownload className="text-sm" /> Export
          </button>
          <button
            onClick={() => navigate("/visa/new")}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[rgba(96,47,247,0.8)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 sm:w-auto"
          >
            <FaPlus className="text-sm" /> Create Visa Case
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Total Cases", summary.total],
          ["Pending Collection", summary.collection],
          ["Biometrics Scheduled", summary.biometrics],
          ["Expiring in 14 Days", summary.expiringSoon],
        ].map(([label, value]) => (
          <SurfaceCard key={String(label)} className="border border-gray-200 p-4 dark:border-gray-800">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
            <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-gray-100">{value}</p>
          </SurfaceCard>
        ))}
      </div>

      <SurfaceCard className="border border-blue-200 bg-purple-50/70 p-4 dark:border-blue-800 dark:bg-blue-900/20">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          Required by docs: country-specific visa checklist, appointment tracking, fee tracking, expiry visibility, and document upload. Case creation now starts from linked booking and supplier selection instead of raw IDs.
        </p>
      </SurfaceCard>

      <div className="flex flex-col gap-3 sm:hidden">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <FaMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search visa cases..."
              className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-9 pr-4 text-sm focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800"
            />
          </div>
          <button
            onClick={() => setShowMobileFilters(!showMobileFilters)}
            className={`rounded-xl border p-2.5 transition-colors ${
              showMobileFilters
                ? "border-blue-200 bg-purple-50 text-[#602FF7] dark:border-blue-800 dark:bg-blue-900/20"
                : "border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-400"
            }`}
          >
            <FaFilter />
          </button>
        </div>

        {showMobileFilters && (
          <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Filter by Stage</h3>
              <button onClick={() => setShowMobileFilters(false)} className="text-gray-400 hover:text-gray-600">
                <FaXmark />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {tabs.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setTab(item.id);
                    setPage(1);
                    setShowMobileFilters(false);
                  }}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    tab === item.id
                      ? "bg-[rgba(96,47,247,0.8)] text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="hidden gap-4 sm:flex sm:items-center sm:justify-between">
        <FilterTabs
          tabs={tabs}
          active={tab}
          onChange={(next) => {
            setTab(next as (typeof tabs)[number]["id"]);
            setPage(1);
          }}
        />
        <div className="flex items-center gap-3">
          <div className="relative w-72">
            <FaMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search visa cases..."
              className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-9 pr-4 text-sm focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800"
            />
          </div>
        </div>
      </div>

      <SurfaceCard className="overflow-hidden border border-gray-200 p-0 dark:border-gray-800">
        {loading ? (
          <div className="flex justify-center p-8">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
          </div>
        ) : paginatedRows.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="No visa cases found"
              description="Try changing search or filters, or create a new visa case."
              icon={<FaPlus className="text-4xl" />}
            />
          </div>
        ) : (
          <>
            <div className="divide-y divide-gray-100 dark:divide-gray-800 sm:hidden">
              {paginatedRows.map((row) => {
                const daysToExpiry = getDaysToExpiry(row.visaValidUntil);
                return (
                  <div key={row.id} className="space-y-3 p-4 transition-colors hover:bg-blue-50/40 dark:hover:bg-gray-800/50">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                          Case {shortId(row.id)}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">{getBookingLabel(row.bookingId)}</p>
                      </div>
                      <StatusBadge status={row.workflowStage} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-xs text-gray-500">Country</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{row.country}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Visa Type</p>
                        <p className="text-sm text-gray-700 dark:text-gray-300">{row.visaType}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-xs text-gray-500">Supplier</p>
                        <p className="text-sm text-gray-700 dark:text-gray-300">{getSupplierName(row.supplierId)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Appointment</p>
                        <p className="text-sm text-gray-700 dark:text-gray-300">{formatDate(row.appointmentDate)}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-xs text-gray-500">Submitted</p>
                        <p className="text-sm text-gray-700 dark:text-gray-300">{formatDate(row.submissionDate)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Expiry</p>
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          {row.visaValidUntil ? `${formatDate(row.visaValidUntil)}${daysToExpiry !== null ? ` (${daysToExpiry}d)` : ""}` : "-"}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => navigate(`/visa/${row.id}`)}
                      className="w-full rounded-lg border border-gray-200 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                    >
                      Open Case
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="hidden overflow-x-auto sm:block">
              <table className="min-w-[1120px] w-full divide-y divide-gray-200 dark:divide-gray-800">
                <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-800/95">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Visa Case</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Booking</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Country</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Type</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Supplier</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Workflow Stage</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Appointment</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Expiry</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {paginatedRows.map((row) => {
                    const daysToExpiry = getDaysToExpiry(row.visaValidUntil);
                    return (
                      <tr key={row.id} className="group transition-all duration-200 hover:bg-blue-50/30 dark:hover:bg-gray-800/40">
                        <td className="px-5 py-4 text-sm font-medium text-blue-600 dark:text-blue-300">Case {shortId(row.id)}</td>
                        <td className="px-5 py-4 text-sm text-gray-700 dark:text-gray-200">{getBookingLabel(row.bookingId)}</td>
                        <td className="px-5 py-4 text-sm text-gray-700 dark:text-gray-200">{row.country}</td>
                        <td className="px-5 py-4 text-sm text-gray-700 dark:text-gray-200">{row.visaType}</td>
                        <td className="px-5 py-4 text-sm text-gray-700 dark:text-gray-200">{getSupplierName(row.supplierId)}</td>
                        <td className="px-5 py-4"><StatusBadge status={row.workflowStage} /></td>
                        <td className="px-5 py-4 text-sm text-gray-700 dark:text-gray-200">{formatDate(row.appointmentDate)}</td>
                        <td className="px-5 py-4 text-sm text-gray-700 dark:text-gray-200">
                          {row.visaValidUntil ? `${formatDate(row.visaValidUntil)}${daysToExpiry !== null ? ` (${daysToExpiry}d)` : ""}` : "-"}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <button
                            onClick={() => navigate(`/visa/${row.id}`)}
                            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                          >
                            Open
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col items-center justify-between gap-4 border-t border-gray-200 px-4 py-4 dark:border-gray-800 sm:flex-row">
              <p className="order-2 text-xs text-gray-500 dark:text-gray-400 sm:order-1 sm:text-sm">
                Showing {Math.min(filtered.length, (page - 1) * pageSize + 1)}-{Math.min(filtered.length, page * pageSize)} of {filtered.length}
              </p>
              <div className="order-1 flex items-center gap-2 sm:order-2">
                <button
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  disabled={page === 1}
                  className="rounded-lg border border-gray-200 p-2 text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
                >
                  <FaChevronLeft className="text-sm" />
                </button>
                <span className="min-w-[40px] rounded-lg bg-blue-50 px-3 py-2 text-center text-sm font-medium text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                  {page}
                </span>
                <button
                  onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={page === totalPages}
                  className="rounded-lg border border-gray-200 p-2 text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
                >
                  <FaChevronRight className="text-sm" />
                </button>
              </div>
            </div>
          </>
        )}
      </SurfaceCard>
    </div>
  );
};

export default VisaCasesPage;
