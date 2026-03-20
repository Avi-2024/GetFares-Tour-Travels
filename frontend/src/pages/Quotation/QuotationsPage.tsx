import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaCalendarDays,
  FaChevronLeft,
  FaChevronRight,
  FaEye,
  FaFileInvoice,
  FaMagnifyingGlass,
  FaPlus,
  FaWhatsapp,
  FaFilter,
  FaXmark,
  FaCircleXmark,
} from "react-icons/fa6";
import SurfaceCard from "../../components/ui/SurfaceCard";
import EmptyState from "../../components/ui/EmptyState";
import { validateQuoteTransition } from "../../utils/workflowValidation";
import { quotationsApi } from "../../api/quotations";
import { getApiErrorMessage } from "../../api/apiClient";
import { useAuth } from "../../context/AuthContext";

type Status = "pending" | "accepted" | "expired" | "rejected" | "draft";
interface Quotation {
  id: string;
  leadId?: string | null;
  quoteNumber: string;
  customer: string;
  email: string;
  phone?: string | null;
  destination: string;
  details: string;
  total: number;
  margin: number;
  status: Status;
  lastSent: string | null;
  sentDate: string | null;
  createdAt?: string | null;
}

const tabs = [
  "All",
  "pending",
  "accepted",
  "expired",
  "rejected",
  "draft",
] as const;
const styles: Record<Status, string> = {
  pending:
    "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-900",
  accepted:
    "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-900",
  expired:
    "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-900",
  rejected:
    "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-900",
  draft:
    "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700",
};

const mapApiStatusToUi = (status?: string): Status => {
  switch (String(status || "").toUpperCase()) {
    case "SENT":
    case "VIEWED":
      return "pending";
    case "APPROVED":
      return "accepted";
    case "REJECTED":
      return "rejected";
    case "EXPIRED":
      return "expired";
    case "DRAFT":
    default:
      return "draft";
  }
};

const QuotationsPage: React.FC = () => {
  const nav = useNavigate();
  const { token } = useAuth();
  const [tab, setTab] = useState<(typeof tabs)[number]>("All");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);
  const pageSize = 4;

  const handleViewQuotation = (quotation: Quotation) => {
    const snapshot = {
      id: quotation.id,
      quoteNumber: quotation.quoteNumber,
      customer: quotation.customer,
      email: quotation.email,
      destination: quotation.destination,
      details: quotation.details,
      total: quotation.total,
      margin: quotation.margin,
      status: quotation.status,
      lastSent: quotation.lastSent,
      sentDate: quotation.sentDate,
      createdAt: quotation.createdAt,
    };
    sessionStorage.setItem(
      `quotation:${quotation.id}`,
      JSON.stringify(snapshot),
    );
    nav(`/quotations/${quotation.id}`, { state: { quotation: snapshot } });
  };

  useEffect(() => {
    const loadQuotations = async () => {
      // Don't make API calls if no token
      if (!token) {
        console.log('No auth token available, skipping API call');
        setQuotations([]);
        setError('Please login to view quotations.');
        return;
      }
      
      setLoading(true);
      try {
        const response = await quotationsApi.list({ includeItems: false });
        
        // Check if response has the expected structure
        if (response && typeof response === 'object') {
          const payload = (response as any).data ?? response;
          const data =
            (payload as any)?.data ||
            (payload as any)?.quotations ||
            payload;
          
          if (Array.isArray(data)) {
            // Process quotations and fetch customer data
            const quotationsWithCustomers = await Promise.all(
              data.map(async (q: any) => {
                const leadId = q.leadId || q.lead_id;
                const leadData = q.lead || q.relations?.lead || null;
                const destinationData = q.destination || q.relations?.destination || null;
                const customerName =
                  leadData?.fullName ||
                  leadData?.customerName ||
                  leadData?.name ||
                  "Unknown Customer";
                const customerEmail = leadData?.email || "No email";
                const customerPhone = leadData?.phone || "No phone";
                const destinationName =
                  destinationData?.name ||
                  leadData?.destination?.name ||
                  leadData?.destinationName ||
                  "Unknown Destination";

                const sentAt = q.sentAt || q.sent_at;
                const sentDate = sentAt
                  ? new Date(sentAt).toISOString().split('T')[0]
                  : null;
                const lastSent = sentAt
                  ? `${new Date(sentAt).toLocaleDateString()} - Sent`
                  : null;
                const createdAt = q.createdAt || q.created_at || null;
                
                return {
                  id: q.id || Math.random().toString(),
                  leadId,
                  quoteNumber: q.quoteNumber || q.quote_number || 'N/A',
                  customer: customerName,
                  email: customerEmail,
                  phone: customerPhone,
                  destination: destinationName,
                  details: q.details || q.description || q.templateSnapshot?.description || 
                          (leadData ? `${leadData.adultsCount || 0} Adults${leadData.childrenCount ? `, ${leadData.childrenCount} Children` : ''} - ${leadData.travelPurpose || 'Travel'}` : 'No details'),
                  total: Number(q.totalSaleValue || q.finalPrice || q.total || q.amount || 0),
                  margin: Number(q.marginPercent || q.margin || 0),
                  status: mapApiStatusToUi(q.status),
                  lastSent,
                  sentDate,
                  createdAt
                };
              })
            );

            const withStatusOverrides = quotationsWithCustomers.map((item) => {
              const stored =
                typeof window !== "undefined"
                  ? sessionStorage.getItem(`quotation:${item.id}`)
                  : null;
              if (!stored) return item;
              try {
                const parsed = JSON.parse(stored) as { status?: string };
                if (!parsed?.status) return item;
                return {
                  ...item,
                  status: mapApiStatusToUi(parsed.status),
                };
              } catch {
                return item;
              }
            });

            setQuotations(withStatusOverrides);
            setError('');
          } else {
            console.warn('API response data is not an array:', data);
            setQuotations([]);
            setError('Invalid data format from API.');
          }
        } else {
          console.warn('Unexpected API response format:', response);
          setQuotations([]);
          setError('Unexpected response format.');
        }
      } catch (error: any) {
        console.error('Failed to load quotations:', error);
        setError(getApiErrorMessage(error, 'Failed to load quotations.'));
        
        // No fallback data on error
        setQuotations([]);
      } finally {
        setLoading(false);
      }
    };

    loadQuotations();
  }, [token]);

  const allItems = useMemo(() => quotations, [quotations]);

  const kpis = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const isInCurrentMonth = (dateStr?: string | null) => {
      if (!dateStr) return false;
      const date = new Date(dateStr);
      if (Number.isNaN(date.getTime())) return false;
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    };

    const activeCount = quotations.filter((q) =>
      q.status === "pending" || q.status === "draft",
    ).length;
    const pendingCount = quotations.filter((q) => q.status === "pending").length;
    const convertedCount = quotations.filter((q) => q.status === "accepted").length;
    const valueThisMonth = quotations
      .filter((q) => q.status === "accepted")
      .filter((q) => isInCurrentMonth(q.createdAt) || isInCurrentMonth(q.sentDate))
      .reduce((sum, q) => sum + Number(q.total || 0), 0);

    return {
      activeCount,
      pendingCount,
      convertedCount,
      valueThisMonth,
    };
  }, [quotations]);

  const filtered = useMemo(
    () =>
      allItems
        .filter(q => q && typeof q === 'object') // Ensure valid objects
        .filter(
          (q) =>
            (tab === "All" || q.status === tab) &&
            `${q.quoteNumber || ''} ${q.customer || ''} ${q.destination || ''}`
              .toLowerCase()
              .includes(search.toLowerCase()) &&
            (!selectedDate || q.sentDate === selectedDate),
        ),
    [tab, search, selectedDate, allItems],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const rows = filtered.slice((page - 1) * pageSize, page * pageSize);

  const rejectQuotation = (quotation: Quotation) => {
    setSelectedQuotation(quotation);
    setRejectReason("");
    setRejectModalOpen(true);
  };

  const handleRejectSubmit = async () => {
    if (!selectedQuotation) return;
    
    const validationError = validateQuoteTransition(
      "REJECTED",
      rejectReason ?? "",
    );
    
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      await quotationsApi.changeStatus(selectedQuotation.id, {
        status: 'REJECTED',
        reason: rejectReason
      });
      
      // Update local state
      setQuotations(prev => prev.map(q => 
        q.id === selectedQuotation.id 
          ? { ...q, status: 'rejected' as Status }
          : q
      ));
      
      setRejectModalOpen(false);
      setSelectedQuotation(null);
      setError('');
    } catch (error) {
      console.error('Failed to reject quotation:', error);
      setError(getApiErrorMessage(error, 'Failed to reject quotation'));
    } finally {
      setLoading(false);
    }
  };

  const handleSendWhatsApp = async (quotation: Quotation) => {
    setLoading(true);
    try {
      const phone = quotation.phone;

      if (!phone || phone === 'No phone') {
        setError('Phone number not available for WhatsApp sending');
        setLoading(false);
        return;
      }
      
      await quotationsApi.send(quotation.id, {
        channel: 'WHATSAPP',
        recipientPhone: phone
      });
      
      // Update local state to reflect sent status
      setQuotations(prev => prev.map(q => 
        q.id === quotation.id 
          ? { 
              ...q, 
              status: 'pending',
              lastSent: `${new Date().toLocaleDateString()} - WhatsApp`,
              sentDate: new Date().toISOString().split('T')[0]
            }
          : q
      ));
      
      setError('');
    } catch (error) {
      console.error('Failed to send via WhatsApp:', error);
      setError(getApiErrorMessage(error, 'Failed to send quotation via WhatsApp'));
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePdf = async (quotation: Quotation) => {
    setLoading(true);
    try {
      await quotationsApi.generatePdf(quotation.id);
      setError('');
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      setError(getApiErrorMessage(error, 'Failed to generate PDF'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
            Quotations
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            Manage, track, and convert quotations faster.
          </p>
          <div className="flex flex-wrap gap-2 mt-1 relative">
            <div className="relative">
              <FaMagnifyingGlass className="pointer-events-none absolute left-3 top-3 text-xs text-gray-400" />
              <input
                className="field-input pl-9 pr-3 w-56"
                placeholder="Search quotations..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
          </div>
        </div>

        <button
          onClick={() => nav("/quotations/builder")}
          className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors w-full sm:w-auto"
        >
          <FaPlus className="mr-2" />
          <span>Create Quotation</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        {[
          { t: "Total Active", v: kpis.activeCount.toLocaleString(), c: "Live" },
          { t: "Pending", v: kpis.pendingCount.toLocaleString(), c: "Awaiting" },
          { t: "Converted", v: kpis.convertedCount.toLocaleString(), c: "Approved" },
          {
            t: "Value",
            v: `₹${kpis.valueThisMonth.toLocaleString("en-IN", {
              maximumFractionDigits: 0,
            })}`,
            c: "This Month",
          },
        ].map((k) => (
          <SurfaceCard key={k.t} hoverable className="p-3 sm:p-5">
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <p className="text-[10px] sm:text-xs uppercase tracking-wide text-gray-500 truncate">
                  {k.t}
                </p>
                <p className="text-base sm:text-2xl font-semibold text-gray-900 dark:text-gray-100 mt-0.5 sm:mt-1">
                  {k.v}
                </p>
              </div>
              <span className="text-[10px] sm:text-xs whitespace-nowrap rounded-full bg-gray-100 dark:bg-gray-800 px-1.5 sm:px-2 py-0.5 sm:py-1 text-gray-700 dark:text-gray-300">
                {k.c}
              </span>
            </div>
          </SurfaceCard>
        ))}
      </div>

      {/* Main Card */}
      <SurfaceCard className="p-0 overflow-hidden border border-gray-200 dark:border-gray-800">
        {error && (
          <div className="border-b border-gray-100 dark:border-gray-800 px-4 py-2">
            <p className="text-xs sm:text-sm text-red-500">{error}</p>
          </div>
        )}

        {/* Filters Section */}
        <div className="border-b border-gray-100 dark:border-gray-800 p-3 sm:p-4">
          {/* Mobile: Search + Filter Button */}
          <div className="flex items-center gap-2 lg:hidden">
            <div className="flex-1 relative">
              <FaMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400" />
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500"
                placeholder="Search quotations..."
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

          {/* Filters (Desktop always visible, Mobile toggleable) */}
          <div
            className={`${
              showMobileFilters ? "block" : "hidden"
            } lg:block mt-3 lg:mt-0`}
          >
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
              {/* Tabs */}
              <div className="w-full lg:w-auto overflow-x-auto pb-1 scrollbar-hide">
                <div className="inline-flex rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-1 min-w-max">
                  {tabs.map((t) => (
                    <button
                      key={t}
                      onClick={() => {
                        setTab(t);
                        setPage(1);
                        setShowMobileFilters(false);
                      }}
                      className={`px-3 py-1.5 text-xs sm:text-sm font-medium capitalize rounded-lg whitespace-nowrap transition-all ${
                        tab === t
                          ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm"
                          : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Desktop Search and Date Range (unchanged) */}
              <div className="hidden lg:flex items-center gap-2">
                <div className="relative w-80">
                  <FaMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400" />
                  <input
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                    className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-gray-800"
                    placeholder="Search quote, customer, destination"
                  />
                </div>
                <div className="relative">
                  <button
                    onClick={() => setShowDatePicker((p) => !p)}
                    className="inline-flex items-center rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <FaCalendarDays className="mr-2" /> Select Date
                  </button>
                  {showDatePicker && (
                    <div className="absolute right-0 mt-2 z-30 w-64 rounded-xl border border-gray-200 bg-white p-3 shadow-lg dark:border-gray-700 dark:bg-gray-900">
                      <label className="text-xs text-gray-500 dark:text-gray-400">
                        Date
                      </label>
                      <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="field-input w-full mt-1"
                      />
                      <div className="flex justify-end gap-2 mt-3">
                        <button
                          onClick={() => {
                            setSelectedDate("");
                            setPage(1);
                            setShowDatePicker(false);
                          }}
                          className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                        >
                          Clear
                        </button>
                        <button
                          onClick={() => {
                            setPage(1);
                            setShowDatePicker(false);
                          }}
                          className="px-3 py-1.5 text-xs rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                        >
                          Apply
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Close filter button on mobile */}
              {showMobileFilters && (
                <button
                  onClick={() => setShowMobileFilters(false)}
                  className="lg:hidden p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400"
                >
                  <FaXmark />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Quotations List */}
        {loading ? (
          <div className="p-8 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : rows.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="No quotations found"
              description="Try different filters or create a new quotation."
              icon={<FaFileInvoice className="text-4xl" />}
            />
          </div>
        ) : (
          <>
            {/* Mobile View - Cards */}
            <div className="block lg:hidden divide-y divide-gray-100 dark:divide-gray-800">
              {rows.map((q, index) => (
                <div
                  key={q.id}
                  className={`p-4 space-y-3 hover:bg-blue-50/40 dark:hover:bg-gray-800/50 transition-colors ${
                    index !== rows.length - 1
                      ? "border-b border-gray-100 dark:border-gray-800"
                      : ""
                  }`}
                >
                  {/* Header with Quote Number and Status */}
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                        {q.quoteNumber}
                      </p>
                      <p className="text-xs text-gray-500">{q.customer}</p>
                    </div>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${
                        styles[q.status]
                      }`}
                    >
                      {q.status}
                    </span>
                  </div>

                  {/* Destination and Details */}
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {q.destination}
                    </p>
                    <p className="text-xs text-gray-500">{q.details}</p>
                  </div>

                  {/* Email */}
                  <p className="text-xs text-gray-500 truncate">{q.email}</p>

                  {/* Total and Margin */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        ${(q.total || 0).toLocaleString()}
                      </p>
                      <p className="text-xs text-green-600 dark:text-green-400">
                        Margin {q.margin || 0}%
                      </p>
                    </div>
                    <p className="text-xs text-gray-500">
                      {q.lastSent ?? "Never Sent"}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      onClick={() => handleViewQuotation(q)}
                      className="p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                      title="View"
                    >
                      <FaEye className="text-sm" />
                    </button>
                    <button
                      onClick={() => handleSendWhatsApp(q)}
                      disabled={loading}
                      className="p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors disabled:opacity-50"
                      title="Send via WhatsApp"
                    >
                      <FaWhatsapp className="text-sm" />
                    </button>
                    <button
                      onClick={() => rejectQuotation(q)}
                      disabled={loading}
                      className="p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                      title="Reject quotation"
                    >
                      <FaCircleXmark className="text-sm" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop View - Table (UNCHANGED) */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="min-w-[980px] w-full divide-y divide-gray-200 dark:divide-gray-800">
                <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-800/95">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Quote #
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Customer
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Destination
                    </th>
                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Total
                    </th>
                    <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Status
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Last Sent
                    </th>
                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {rows.map((q) => (
                    <tr
                      key={q.id}
                      className="group hover:bg-blue-50/30 dark:hover:bg-gray-800/40 transition-colors"
                    >
                      <td className="px-5 py-4 text-sm font-medium text-blue-600 dark:text-blue-300">
                        {q.quoteNumber}
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {q.customer}
                        </p>
                        <p className="text-xs text-gray-500">{q.email}</p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-sm text-gray-800 dark:text-gray-100">
                          {q.destination}
                        </p>
                        <p className="text-xs text-gray-500">{q.details}</p>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                          ${(q.total || 0).toFixed(2)}
                        </p>
                        <p className="text-xs text-green-600 dark:text-green-400">
                          Margin {q.margin || 0}%
                        </p>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span
                          className={`rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${
                            styles[q.status]
                          }`}
                        >
                          {q.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-xs text-gray-500">
                        {q.lastSent ?? "Never Sent"}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2 transition-all duration-200">
                          <button
                            onClick={() => handleViewQuotation(q)}
                            className="rounded-lg border border-gray-200 p-2 text-gray-500 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                          >
                            <FaEye />
                          </button>
                          <button
                            onClick={() => handleSendWhatsApp(q)}
                            disabled={loading}
                            className="rounded-lg border border-gray-200 p-2 text-green-600 dark:border-gray-700 hover:bg-green-50 dark:hover:bg-green-900/20 disabled:opacity-50"
                            title="Send via WhatsApp"
                          >
                            <FaWhatsapp />
                          </button>
                          <button
                            onClick={() => rejectQuotation(q)}
                            disabled={loading}
                            className="rounded-lg border border-gray-200 p-2 text-red-600 dark:border-gray-700 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
                            title="Reject quotation"
                          >
                            <FaCircleXmark />
                          </button>
                        </div>
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
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <FaChevronLeft className="text-sm" />
                </button>
                <span className="px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-sm font-medium min-w-[40px] text-center">
                  {page}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
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
      {rejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 px-5 py-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Reject Quotation
              </h3>
              <button
                onClick={() => setRejectModalOpen(false)}
                className="p-2 rounded-full text-gray-500 hover:text-gray-800 dark:text-gray-300 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <FaXmark />
              </button>
            </div>
            <div className="px-5 py-4 space-y-3">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Please provide a reason for rejection.
              </p>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-800 dark:text-gray-100 px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                placeholder="Reason for rejection"
              />
              {error && (
                <p className="text-sm text-red-500 flex items-center gap-2">
                  <FaCircleXmark className="text-xs" /> {error}
                </p>
              )}
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-gray-200 dark:border-gray-800 px-5 py-4">
              <button
                onClick={() => setRejectModalOpen(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-gray-100 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectSubmit}
                disabled={loading}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-700 shadow-sm flex items-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <span className="animate-spin">⌛</span>
                    Rejecting...
                  </>
                ) : (
                  <>
                    <FaCircleXmark className="text-xs" />
                    Reject
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuotationsPage;
