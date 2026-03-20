import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaPlus,
  FaFilter,
  FaXmark,
  FaMagnifyingGlass,
  FaDownload,
  FaChevronLeft,
  FaChevronRight,
} from "react-icons/fa6";
import FilterTabs from "../../components/ui/FilterTabs";
import StatusBadge from "../../components/ui/StatusBadge";
import SurfaceCard from "../../components/ui/SurfaceCard";
import EmptyState from "../../components/ui/EmptyState";
import { SUPPLIERS } from "../../data/staticLists";
import { visaApi } from "../../api/visa";
import { getApiErrorMessage } from "../../api/apiClient";
import { useAuth } from "../../context/AuthContext";

type VisaStatus = "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED";

type VisaCase = {
  id: string;
  bookingId: string;
  country: string;
  visaType: string;
  status: VisaStatus;
  appointmentDate: string;
  submissionDate: string;
  visaValidUntil?: string;
  supplierId: string;
};

const mapApiStatusToUi = (status?: string): VisaStatus => {
  switch (String(status || "").toUpperCase()) {
    case "SUBMITTED":
      return "SUBMITTED";
    case "APPROVED":
      return "APPROVED";
    case "REJECTED":
      return "REJECTED";
    case "DOCUMENT_PENDING":
    default:
      return "DRAFT";
  }
};

const mapApiVisa = (visa: any): VisaCase => ({
  id: visa?.id || "",
  bookingId: visa?.bookingId ?? visa?.booking_id ?? "",
  country: visa?.country ?? "",
  visaType: visa?.visaType ?? visa?.visa_type ?? "",
  status: mapApiStatusToUi(visa?.status),
  appointmentDate: visa?.appointmentDate ?? visa?.appointment_date ?? "",
  submissionDate: visa?.submissionDate ?? visa?.submission_date ?? "",
  visaValidUntil: visa?.visaValidUntil ?? visa?.visa_valid_until ?? undefined,
  supplierId: visa?.supplierId ?? visa?.supplier_id ?? "",
});

const tabs = [
  { id: "ALL", label: "All" },
  { id: "DRAFT", label: "Draft" },
  { id: "SUBMITTED", label: "Submitted" },
  { id: "APPROVED", label: "Approved" },
  { id: "REJECTED", label: "Rejected" },
];

const VisaCasesPage = () => {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [tab, setTab] = useState("ALL");
  const [search, setSearch] = useState("");
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<VisaCase[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const pageSize = 4;

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
        const data =
          (payload as any)?.data || (payload as any)?.items || payload;

        if (Array.isArray(data)) {
          setRows(data.map(mapApiVisa));
        } else {
          setRows([]);
          setError("Invalid visa data from API.");
        }
      } catch (err) {
        console.error("Failed to load visa cases:", err);
        setRows([]);
        setError(getApiErrorMessage(err, "Failed to load visa cases."));
      } finally {
        setLoading(false);
      }
    };

    void loadVisaCases();
  }, [token]);

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      const matchesTab = tab === "ALL" || row.status === tab;
      const matchesSearch =
        row.id.toLowerCase().includes(search.toLowerCase()) ||
        row.bookingId.toLowerCase().includes(search.toLowerCase()) ||
        row.country.toLowerCase().includes(search.toLowerCase()) ||
        row.visaType.toLowerCase().includes(search.toLowerCase());
      return matchesTab && matchesSearch;
    });
  }, [tab, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginatedRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  const getSupplierName = (supplierId: string) => {
    const supplier = SUPPLIERS.find((s) => s.id === supplierId);
    if (supplier?.name) return supplier.name;
    if (!supplierId) return "-";
    return supplierId.length > 8 ? `${supplierId.slice(0, 8)}...` : supplierId;
  };

  const formatDate = (date: string) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-4 sm:space-y-6 max-w-8xl mx-auto px-0 sm:px-0 lg:px-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
            Visa Cases
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
            Track visa pipeline, appointments and approvals
          </p>
          {error ? (
            <p className="mt-2 text-xs sm:text-sm text-red-500">{error}</p>
          ) : null}
        </div>
        <button
          onClick={() => navigate("/visa/visa-1")}
          className="w-full sm:w-auto rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
        >
          <FaPlus className="text-sm" /> Create Visa Case
        </button>
      </div>

      {/* Filters Section - Mobile */}
      <div className="flex flex-col gap-3 sm:hidden">
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <FaMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search visa cases..."
              className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={() => setShowMobileFilters(!showMobileFilters)}
            className={`p-2.5 rounded-xl border transition-colors ${
              showMobileFilters
                ? "bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-900/20 dark:border-blue-800"
                : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400"
            }`}
          >
            <FaFilter />
          </button>
        </div>

        {/* Mobile Status Filter */}
        {showMobileFilters && (
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Filter by Status
              </h3>
              <button
                onClick={() => setShowMobileFilters(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <FaXmark />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setTab(t.id);
                    setShowMobileFilters(false);
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    tab === t.id
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Desktop: Filters */}
      <div className="hidden sm:flex sm:flex-row sm:items-center sm:justify-between gap-4">
        <FilterTabs
          tabs={tabs}
          active={tab}
          onChange={(next) => {
            setTab(next);
            setPage(1);
          }}
        />
        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <FaMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search visa cases..."
              className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button className="inline-flex items-center rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <FaDownload className="mr-2" /> Export
          </button>
        </div>
      </div>

      {/* Main Card */}
      <SurfaceCard className="p-0 overflow-hidden border border-gray-200 dark:border-gray-800">
        {loading ? (
          <div className="p-8 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : paginatedRows.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="No visa cases found"
              description="Try changing search or filters."
              icon={<FaPlus className="text-4xl" />}
            />
          </div>
        ) : (
          <>
            {/* Mobile View - Cards */}
            <div className="block sm:hidden divide-y divide-gray-100 dark:divide-gray-800">
              {paginatedRows.map((row) => (
                <div
                  key={row.id}
                  className="p-4 space-y-3 hover:bg-blue-50/40 dark:hover:bg-gray-800/50 transition-colors"
                >
                  {/* Header with ID and Status */}
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                        {row.id}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Booking: {row.bookingId}
                      </p>
                    </div>
                    <StatusBadge status={row.status} />
                  </div>

                  {/* Country and Type */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-xs text-gray-500">Country</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {row.country}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Visa Type</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        {row.visaType}
                      </p>
                    </div>
                  </div>

                  {/* Supplier and Appointment */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-xs text-gray-500">Supplier</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        {getSupplierName(row.supplierId)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Appointment</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        {formatDate(row.appointmentDate)}
                      </p>
                    </div>
                  </div>

                  {/* Submission Date */}
                  <div>
                    <p className="text-xs text-gray-500">Submitted</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      {formatDate(row.submissionDate)}
                    </p>
                  </div>

                  {/* Action Button */}
                  <div className="pt-2">
                    <button
                      onClick={() => navigate(`/visa/${row.id}`)}
                      className="w-full py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      Open Case
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop View - Table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="min-w-[900px] w-full divide-y divide-gray-200 dark:divide-gray-800">
                <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-800/95">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Visa Case ID
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Booking
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Country
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Type
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Supplier
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Status
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Appointment
                    </th>
                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {paginatedRows.map((row) => (
                    <tr
                      key={row.id}
                      className="group transition-all duration-200 hover:bg-blue-50/30 dark:hover:bg-gray-800/40"
                    >
                      <td className="px-5 py-4 text-sm font-medium text-blue-600 dark:text-blue-300">
                        {row.id}
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-700 dark:text-gray-200">
                        {row.bookingId}
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-700 dark:text-gray-200">
                        {row.country}
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-700 dark:text-gray-200">
                        {row.visaType}
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-700 dark:text-gray-200">
                        {getSupplierName(row.supplierId)}
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={row.status} />
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-700 dark:text-gray-200">
                        {formatDate(row.appointmentDate)}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => navigate(`/visa/${row.id}`)}
                          className="rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                          Open
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-4 border-t border-gray-200 dark:border-gray-800">
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 order-2 sm:order-1">
                Showing {Math.min(filtered.length, (page - 1) * pageSize + 1)}-
                {Math.min(filtered.length, page * pageSize)} of{" "}
                {filtered.length}
              </p>
              <div className="flex items-center gap-2 order-1 sm:order-2">
                <button
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  disabled={page === 1}
                  className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <FaChevronLeft className="text-sm" />
                </button>
                <span className="px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-sm font-medium min-w-[40px] text-center">
                  {page}
                </span>
                <button
                  onClick={() =>
                    setPage((prev) => Math.min(totalPages, prev + 1))
                  }
                  disabled={page === totalPages}
                  className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <FaChevronRight className="text-sm" />
                </button>
              </div>
            </div>
          </>
        )}
      </SurfaceCard>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
      `}</style>
    </div>
  );
};

export default VisaCasesPage;
