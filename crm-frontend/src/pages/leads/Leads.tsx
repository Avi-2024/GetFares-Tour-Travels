import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaCalendarPlus,
  FaChevronLeft,
  FaChevronRight,
  FaDownload,
  FaEye,
  FaFire,
  FaInfoCircle,
  FaPlus,
  FaSearch,
  FaUsers,
} from "react-icons/fa";
import { Country } from "country-state-city";
import EmptyState from "../../components/ui/EmptyState";
import StatusBadge from "../../components/ui/StatusBadge";
import SurfaceCard from "../../components/ui/SurfaceCard";
import SearchableDropdown from "../../components/ui/SearchableDropdown";
import { reportApiError } from "../../lib/notify";
import { useLeadsService } from "../../hooks/useLeadsService";
import { useDateTimePreferences } from "../../context/DateTimePreferencesContext";
import type { LeadListItem, LeadsPagination } from "../../services/leadsService";
import { toStatusLabelText } from "../../utils/leadStatus";

interface LeadStats {
  totalLeads: number;
  newToday: number;
  followupActive: number;
  slaBreached: number;
}

const quickFilters = [
  { key: "ALL", label: "All" },
  { key: "ACTIVE", label: "Active" },
  { key: "FOLLOW_UP", label: "Follow-up" },
  { key: "CLOSED", label: "Closed" },
  { key: "LATE_RESPONSE", label: "Late Response" },
] as const;
type QuickFilter = (typeof quickFilters)[number]["key"];

type LeadFilterState = {
  fromDate: string;
  toDate: string;
  country: string;
  destination: string;
  email: string;
  phone: string;
  leadId: string;
  status: "ALL" | "NEW" | "CONTACTED" | "NEGOTIATION" | "QUOTED" | "FOLLOW_UP_1" | "FOLLOW_UP_2" | "FOLLOW_UP_3" | "FOLLOW_UP_4" | "FINAL_REMINDER" | "CONVERTED" | "LOST" | "NON_RESPONSIVE";
  sla: "ALL" | "BREACHED" | "ON_REQUEST";
  sortBy: "NEWEST_FIRST" | "OLDEST_FIRST" | "NAME_A_Z" | "STATUS";
};

const defaultFilters: LeadFilterState = {
  fromDate: "",
  toDate: "",
  country: "",
  destination: "",
  email: "",
  phone: "",
  leadId: "",
  status: "ALL",
  sla: "ALL",
  sortBy: "NEWEST_FIRST",
};

const formatPaxSummary = (lead: LeadListItem) => {
  const adults = Math.max(lead.adultsCount ?? 0, 0);
  const children = Math.max(lead.childrenCount ?? 0, 0);
  const adultLabel = `${adults} Adult${adults === 1 ? "" : "s"}`;

  if (children <= 0) return adultLabel;

  return `${adultLabel}, ${children} ${children === 1 ? "Child" : "Children"}`;
};


const truncateEmail = (value: string, maxLength = 26) => {
  const safe = (value || "").trim();
  if (!safe) return "N/A";
  if (safe.length <= maxLength) return safe;
  return `${safe.slice(0, Math.max(3, maxLength - 3))}...`;
};

const Leads: React.FC = () => {
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const [fetchedLeads, setFetchedLeads] = useState<LeadListItem[]>([]);
  const [pagination, setPagination] = useState<LeadsPagination | null>(null);
  const [destinationNames, setDestinationNames] = useState<string[]>([]);
  const [draftFilters, setDraftFilters] =
    useState<LeadFilterState>(defaultFilters);
  const [appliedFilters, setAppliedFilters] =
    useState<LeadFilterState>(defaultFilters);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const pageSize = 15;
  const nav = useNavigate();
  const leadsService = useLeadsService();
  const { formatDate } = useDateTimePreferences();

  const countryOptions = useMemo(
    () => [
      { value: "", label: "All Countries" },
      ...Country.getAllCountries()
        .map((country) => country.name)
        .sort((a, b) => a.localeCompare(b))
        .map((name) => ({ value: name, label: name })),
    ],
    [],
  );

  const destinationOptions = useMemo(
    () => [
      { value: "", label: "All " },
      ...destinationNames.map((name) => ({ value: name, label: name })),
    ],
    [destinationNames],
  );

  const statusOptions = useMemo(
    () => [
      { value: "ALL", label: "All " },
      { value: "NEW", label: "New" },
      { value: "CONTACTED", label: "Contacted" },
      { value: "NEGOTIATION", label: "Negotiation" },
      { value: "QUOTED", label: "Quoted" },
      { value: "FOLLOW_UP_1", label: "Follow Up 1" },
      { value: "FOLLOW_UP_2", label: "Follow Up 2" },
      { value: "FOLLOW_UP_3", label: "Follow Up 3" },
      { value: "FOLLOW_UP_4", label: "Follow Up 4" },
      { value: "FINAL_REMINDER", label: "Final Reminder" },
      { value: "CONVERTED", label: "Converted" },
      { value: "LOST", label: "Lost" },
      { value: "NON_RESPONSIVE", label: "Non Responsive" },
    ],
    [],
  );

  const slaOptions = useMemo(
    () => [
      { value: "ALL", label: "All SLA" },
      { value: "BREACHED", label: "Breached" },
      { value: "ON_REQUEST", label: "On Request (Not Breached)" },
    ],
    [],
  );

  const sortOptions = useMemo(
    () => [
      { value: "NEWEST_FIRST", label: "Newest First" },
      { value: "OLDEST_FIRST", label: "Oldest First" },
      { value: "NAME_A_Z", label: "Name A-Z" },
      { value: "STATUS", label: "Status" },
    ],
    [],
  );

  const buildLeadQuery = (queryPage: number, queryLimit: number) => {
    const normalizedLeadId = appliedFilters.leadId.trim().toUpperCase();
    const leadIdMode = Boolean(normalizedLeadId);
    const effectivePage = leadIdMode ? 1 : queryPage;
    const effectiveLimit = leadIdMode ? 500 : queryLimit;

    return {
    page: effectivePage,
    limit: effectiveLimit,
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(quickFilter !== "ALL" ? { quickFilter } : {}),
    ...(appliedFilters.country ? { country: appliedFilters.country } : {}),
    ...(appliedFilters.status !== "ALL"
      ? { status: appliedFilters.status }
      : {}),
    ...(appliedFilters.email.trim() ? { email: appliedFilters.email.trim() } : {}),
    ...(appliedFilters.phone.trim() ? { phone: appliedFilters.phone.trim() } : {}),
    ...(normalizedLeadId ? { leadId: normalizedLeadId } : {}),
    ...(appliedFilters.fromDate ? { fromDate: appliedFilters.fromDate } : {}),
    ...(appliedFilters.toDate ? { toDate: appliedFilters.toDate } : {}),
    ...(appliedFilters.destination
      ? { destination: appliedFilters.destination }
      : {}),
    ...(appliedFilters.sla !== "ALL" ? { sla: appliedFilters.sla } : {}),
    ...(appliedFilters.sortBy ? { sortBy: appliedFilters.sortBy } : {}),
  };
  };

  useEffect(() => {
    // Extract unique destinations from fetched leads
    const destinations = fetchedLeads
      .map((lead) => lead.destination)
      .filter((dest) => dest && dest !== "N/A")
      .filter((dest, index, self) => self.indexOf(dest) === index)
      .sort((a, b) => a.localeCompare(b));
    setDestinationNames(destinations);
  }, [fetchedLeads]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 400);

    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const fetchLeads = async () => {
      setLoading(true);
      setError("");
      try {
        const query = buildLeadQuery(page, pageSize);
        const result = await leadsService.listLeadsPage(query);
        setFetchedLeads(result.items);
        setPagination(
          result.pagination || {
            page,
            limit: pageSize,
            total: result.items.length,
            totalPages: 1,
          },
        );
      } catch (err) {
        reportApiError(err, "Failed to load leads", setError);
        setFetchedLeads([]);
        setPagination({
          page: 1,
          limit: pageSize,
          total: 0,
          totalPages: 1,
        });
      } finally {
        setLoading(false);
      }
    };
    void fetchLeads();
  }, [
    appliedFilters,
    debouncedSearch,
    leadsService,
    page,
    pageSize,
    quickFilter,
  ]);

  useEffect(() => {
    if (pagination && page > pagination.totalPages) {
      setPage(pagination.totalPages);
    }
  }, [page, pagination]);

  const totalPages = Math.max(1, pagination?.totalPages ?? 1);
  const leadIdFilter = appliedFilters.leadId.trim().toUpperCase();
  const rows = useMemo(() => {
    if (!leadIdFilter) {
      return fetchedLeads;
    }
    return fetchedLeads.filter((lead) => {
      const candidates = [
        String(lead.leadId || "").trim().toUpperCase(),
        String(lead.id || "").trim().toUpperCase(),
      ];
      return candidates.some((candidate) => candidate === leadIdFilter);
    });
  }, [fetchedLeads, leadIdFilter]);
  const leadIdModeActive = Boolean(leadIdFilter);
  const effectiveTotalPages = leadIdModeActive ? 1 : totalPages;

  const leadStats = useMemo<LeadStats>(
    () => ({
      totalLeads: pagination?.total ?? fetchedLeads.length,
      newToday: fetchedLeads.filter((lead) => lead.statusLabel === "NEW")
        .length,
      followupActive: fetchedLeads.filter(
        (lead) =>
          lead.statusLabel.startsWith("FOLLOW_UP") ||
          lead.statusLabel === "FINAL_REMINDER",
      ).length,
      slaBreached: fetchedLeads.filter((lead) => lead.slaBreached).length,
    }),
    [fetchedLeads, pagination?.total],
  );

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (appliedFilters.fromDate) count += 1;
    if (appliedFilters.toDate) count += 1;
    if (appliedFilters.country) count += 1;
    if (appliedFilters.destination) count += 1;
    if (appliedFilters.email) count += 1;
    if (appliedFilters.phone) count += 1;
    if (appliedFilters.leadId) count += 1;
    if (appliedFilters.status !== "ALL") count += 1;
    if (appliedFilters.sla !== "ALL") count += 1;
    if (appliedFilters.sortBy !== "NEWEST_FIRST") count += 1;
    return count;
  }, [appliedFilters]);

  const updateDraftFilter = <K extends keyof LeadFilterState>(
    key: K,
    value: LeadFilterState[K],
  ) => {
    setDraftFilters((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  useEffect(() => {
    if (
      draftFilters.fromDate &&
      draftFilters.toDate &&
      draftFilters.fromDate > draftFilters.toDate
    ) {
      setError("From Date cannot be later than To Date.");
      return;
    }

    setError("");
    const timer = window.setTimeout(() => {
      setAppliedFilters({
        ...draftFilters,
        email: draftFilters.email.trim(),
        phone: draftFilters.phone.trim(),
        leadId: draftFilters.leadId.trim(),
      });
      setPage(1);
    }, 250);

    return () => window.clearTimeout(timer);
  }, [draftFilters]);

  const handleResetFilters = () => {
    setError("");
    setDraftFilters(defaultFilters);
    setAppliedFilters(defaultFilters);
    setQuickFilter("ALL");
    setSearch("");
    setPage(1);
  };

  const handleViewLead = (lead: LeadListItem) => {
    sessionStorage.setItem(`lead:${lead.id}`, JSON.stringify(lead));
    nav(`/leads/${lead.id}`, { state: { lead } });
  };

  const exportCurrentTable = async () => {
    if (exporting) return;
    setExporting(true);
    setError("");

    const headers = [
      "Lead",
      "Lead ID",
      "Contact",
      "Destination",
      "Lead Country",
      "Visa/Holidays",
      "Assignee",
      "Assigned By",
      "Status",
      "SLA",
    ];

    const escapeCsv = (value: string) => `"${value.replace(/\"/g, '\"\"')}"`;
    try {
      const exportLimit = 500;
      const firstPage = await leadsService.listLeadsPage(
        buildLeadQuery(1, exportLimit),
      );
      const totalPages = Math.max(1, firstPage.pagination?.totalPages ?? 1);
      const exportRows = [...firstPage.items];

      for (let currentPage = 2; currentPage <= totalPages; currentPage += 1) {
        const nextPage = await leadsService.listLeadsPage(
          buildLeadQuery(currentPage, exportLimit),
        );
        exportRows.push(...nextPage.items);
      }

      if (!exportRows.length) return;

      const dataRows = exportRows.map((lead) => [
        lead.name ?? "",
        lead.leadId ?? "",
        `${lead.email ?? ""} ${lead.phone ? `| ${lead.phone}` : ""}`.trim(),
        lead.destination ?? "",
        lead.leadCountry ?? "",
        getVisaHolidayLabel(lead),
        lead.consultant && lead.consultant !== "Unassigned" ? lead.consultant : "-",
        lead.assignedBy ?? "-",
        toStatusLabelText(lead.statusLabel),
        lead.slaBreached ? "Breached" : (lead.sla ?? ""),
      ]);

      const csv = [headers, ...dataRows]
        .map((row) => row.map((cell) => escapeCsv(String(cell))).join(","))
        .join("\n");

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      const timestamp = new Date().toISOString().slice(0, 10);
      const filterSuffix =
        activeFilterCount > 0 ? `-filtered-${activeFilterCount}` : "-all";
      anchor.download = `leads${filterSuffix}-${timestamp}.csv`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      reportApiError(err, "Failed to export leads", setError);
    } finally {
      setExporting(false);
    }
  };

  const getVisaHolidayLabel = (lead: LeadListItem) => {
    // Check lead_type field first (from database)
    const leadType = String(lead.leadType ?? lead.lead_type ?? '').trim().toUpperCase();
    if (leadType === 'VISA') return 'Visa';
    if (leadType === 'HOLIDAY') return 'Holidays';
    
    // Fallback: check packageName and statusLabel
    const source = `${lead.packageName ?? ""} ${lead.statusLabel ?? ""}`
      .trim()
      .toLowerCase();
    return source.includes("visa") ? "Visa" : "Holidays";
  };

  return (
    <div className="space-y-4 sm:space-y-6 overflow-x-hidden">
      <div className=" mx-auto space-y-4 sm:space-y-6 px-0 sm:px-0 lg:pl-0 lg:pr-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
              Leads Management
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              SOP-aligned lead pipeline with follow-up and SLA visibility.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <button
              onClick={() => nav("/create-lead")}
              className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors w-full sm:w-auto"
            >
              <FaPlus className="mr-2" />
              <span>Create Lead</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
          <KpiCard
            title="All Leads"
            value={String(leadStats.totalLeads)}
            icon={<FaUsers className="text-blue-600 text-xl" />}
          />
          <KpiCard
            title="New Today"
            value={String(leadStats.newToday)}
            icon={<FaCalendarPlus className="text-green-500 text-xl" />}
          />
          <KpiCard
            title="Follow-up Active"
            value={String(leadStats.followupActive)}
            icon={<FaCalendarPlus className="text-amber-500 text-xl" />}
          />
          <KpiCard
            title="Late Responses"
            value={String(leadStats.slaBreached)}
            icon={<FaFire className="text-red-500 text-xl" />}
          />
        </div>

        <SurfaceCard className="p-0 overflow-hidden border border-gray-200 dark:border-gray-800">
          <div className="p-3 sm:p-4 border-b border-gray-200 dark:border-gray-800 space-y-3">
            {error ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-200">
                {error}
              </div>
            ) : null}
            <div className="w-full overflow-x-auto pb-1 scrollbar-hide">
              <div className="inline-flex rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-1">
                {quickFilters.map((item) => (
                  <button
                    key={item.key}
                    onClick={() => {
                      setQuickFilter(item.key);
                      setPage(1);
                    }}
                    className={`px-3 py-2 text-xs sm:text-sm font-medium rounded-lg whitespace-nowrap transition-all ${
                      quickFilter === item.key
                        ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm"
                        : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
              <div className="relative w-full">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                  placeholder="Search leads..."
                  className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {activeFilterCount > 0
                  ? `${activeFilterCount} filter(s) applied`
                  : "No filter applied"}
              </div>
            </div>

            <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50/60 p-3 dark:border-gray-700 dark:bg-gray-900/30">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
                    Lead ID
                  </label>
                  <input
                    type="text"
                    value={draftFilters.leadId}
                    onChange={(event) =>
                      updateDraftFilter("leadId", event.target.value)
                    }
                    placeholder="Exact lead ID"
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:border-gray-700 dark:bg-gray-900"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
                    Email
                  </label>
                  <input
                    type="text"
                    value={draftFilters.email}
                    onChange={(event) =>
                      updateDraftFilter("email", event.target.value)
                    }
                    placeholder="email"
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:border-gray-700 dark:bg-gray-900"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
                    Phone
                  </label>
                  <input
                    type="text"
                    value={draftFilters.phone}
                    onChange={(event) =>
                      updateDraftFilter("phone", event.target.value)
                    }
                    placeholder="phone"
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:border-gray-700 dark:bg-gray-900"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
                    From Date
                  </label>
                  <input
                    type="date"
                    value={draftFilters.fromDate}
                    onChange={(event) =>
                      updateDraftFilter("fromDate", event.target.value)
                    }
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:border-gray-700 dark:bg-gray-900"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
                    To Date
                  </label>
                  <input
                    type="date"
                    value={draftFilters.toDate}
                    onChange={(event) =>
                      updateDraftFilter("toDate", event.target.value)
                    }
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:border-gray-700 dark:bg-gray-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
                    Country
                  </label>
                  <SearchableDropdown
                    className="w-full"
                    value={draftFilters.country}
                    options={countryOptions}
                    placeholder="All Countries"
                    searchPlaceholder="Search country..."
                    onChange={(value) => updateDraftFilter("country", value)}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
                    Destination
                  </label>
                  <SearchableDropdown
                    className="w-full"
                    value={draftFilters.destination}
                    options={destinationOptions}
                    placeholder="All Destinations"
                    searchPlaceholder="Search destination..."
                    onChange={(value) =>
                      updateDraftFilter("destination", value)
                    }
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
                    Status
                  </label>
                  <SearchableDropdown
                    className="w-full"
                    value={draftFilters.status}
                    options={statusOptions}
                    placeholder="All "
                    searchPlaceholder="Search status..."
                    onChange={(value) =>
                      updateDraftFilter(
                        "status",
                        value as LeadFilterState["status"],
                      )
                    }
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
                    SLA
                  </label>
                  <SearchableDropdown
                    className="w-full"
                    value={draftFilters.sla}
                    options={slaOptions}
                    placeholder="All "
                    searchPlaceholder="Searching..."
                    onChange={(value) =>
                      updateDraftFilter("sla", value as LeadFilterState["sla"])
                    }
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
                    Sort By
                  </label>
                  <SearchableDropdown
                    className="w-full"
                    value={draftFilters.sortBy}
                    options={sortOptions}
                    placeholder="Newest First"
                    searchPlaceholder="Search sort option..."
                    onChange={(value) =>
                      updateDraftFilter(
                        "sortBy",
                        value as LeadFilterState["sortBy"],
                      )
                    }
                  />
                </div>
              </div>

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                  Reset Filters
                </button>
                <button
                  type="button"
                  onClick={exportCurrentTable}
                  disabled={exporting || (pagination?.total ?? 0) === 0}
                  className="inline-flex items-center justify-center rounded-xl border border-green-500 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:cursor-not-allowed disabled:opacity-50 dark:border-green-400 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                  <FaDownload className="mr-2" />
                  <span>{exporting ? "Exporting..." : "Export Filtered"}</span>
                </button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">
              Loading leads...
            </div>
          ) : rows.length === 0 ? (
            <div className="p-8">
              <EmptyState
                title="No leads found"
                description="Try adjusting your filter combination and search query."
                icon={<FaUsers className="text-4xl" />}
              />
            </div>
          ) : (
            <>
              <div className="hidden lg:block w-full max-w-full overflow-x-auto leads-table-scroll">
                <table className="min-w-[980px] w-full table-fixed">
                  <colgroup>
                    <col className="w-[9%]" />
                    <col className="w-[15%]" />
                    <col className="w-[8%]" />
                    <col className="w-[16%]" />
                    <col className="w-[11%]" />
                    <col className="w-[10%]" />
                    <col className="w-[10%]" />
                    <col className="w-[7%]" />
                    <col className="w-[6%]" />
                    <col className="w-[8%]" />
                  </colgroup>
                  <thead className="bg-gray-50 dark:bg-gray-800/50">
                    <tr>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                        Date
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                        Lead
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                        Lead ID
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                        Contact
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                        Destination
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                        Visa/Holidays
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                        Lead Country
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                        Status
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                        SLA
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                        View
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((lead) => (
                      <tr
                        key={lead.id}
                        className="border-b border-gray-100 hover:bg-gray-50 transition-colors dark:border-gray-800 dark:hover:bg-gray-800/40"
                      >
                        <td className="px-4 py-3 text-center leading-tight whitespace-nowrap">
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                            {lead.clientCreatedAt
                              ? `${lead.clientCreatedAt}${
                                  lead.clientTimezone
                                    ? ` ${lead.clientTimezone}`
                                    : ""
                                }`
                              : lead.createdAt
                                ? formatDate(lead.createdAt, "-")
                                : "-"}
                          </p>
                        </td>
                        <td className="px-4 py-3 leading-tight">
                          <div className="flex items-center gap-2">
                            <div>
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {lead.name}
                              </p>
                              <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                                lead.priority === "High"
                                  ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                                  : lead.priority === "Medium"
                                  ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                                  : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                              }`}
                            >
                              {lead.priority === "High" ? "🔥 Hot" : lead.priority === "Medium" ? "⚡ Warm" : "❄️ Cold"}
                            </span>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {formatPaxSummary(lead)}
                              </p>
                             
                              {lead.assignedBy && (
                                <p className="text-xs text-blue-600 dark:text-blue-400">
                                  Assigned by: {lead.assignedBy}
                                </p>
                              )}
                            </div>
                           
                          </div>
                        </td>
                        <td className="px-4 py-3 text-left leading-tight whitespace-nowrap">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                            {lead.leadId}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-left leading-tight">
                          <div className="flex items-center gap-1">
                            <p
                              className="max-w-full truncate text-sm font-medium text-gray-800 dark:text-gray-200"
                              title={lead.email}
                            >
                              {truncateEmail(lead.email)}
                            </p>
                            {lead.email && lead.email.length > 26 && (
                              <FaInfoCircle
                                className="text-gray-400 hover:text-blue-500 cursor-help flex-shrink-0"
                                title={lead.email}
                              />
                            )}
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {lead.phone}
                          </p>
                        </td>
                        <td
                          className="px-4 py-3 text-left leading-tight"
                          title={lead.destination}
                        >
                          <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                            {lead.destination}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-left leading-tight">
                          <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                            {getVisaHolidayLabel(lead)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-left leading-tight">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {lead.leadCountry || "-"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center leading-tight">
                          <StatusBadge status={lead.statusLabel} />
                        </td>
                        <td className="px-4 py-3 text-center leading-tight whitespace-nowrap">
                          <span
                            className={`text-sm font-medium ${
                              lead.slaBreached
                                ? "text-red-600"
                                : "text-gray-700 dark:text-gray-200"
                            }`}
                          >
                            {lead.slaBreached ? "Breached" : lead.sla}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right leading-tight whitespace-nowrap">
                          <button
                            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-2.5 py-1 text-xs hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                            onClick={() => handleViewLead(lead)}
                          >
                            <FaEye />
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="block lg:hidden divide-y divide-gray-100 dark:divide-gray-800">
                {rows.map((lead) => (
                  <div key={lead.id} className="p-4 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-900 dark:text-gray-100">
                            {lead.name}
                          </p>
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                              lead.priority === "High"
                                ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                                : lead.priority === "Medium"
                                ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                                : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                            }`}
                          >
                            {lead.priority === "High" ? "🔥 Hot" : lead.priority === "Medium" ? "⚡ Warm" : "❄️ Cold"}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">
                          Lead ID: {lead.leadId}
                        </p>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          {formatPaxSummary(lead)}
                        </p>
                      
                        {lead.assignedBy && (
                          <p className="mt-1 text-xs text-blue-600 dark:text-blue-400">
                            Assigned by: {lead.assignedBy}
                          </p>
                        )}
                      </div>
                      <StatusBadge status={lead.statusLabel} />
                    </div>
                    <div className="grid grid-cols-1 gap-1.5">
                      <div className="flex items-center gap-1">
                        <p className="text-xs text-gray-600 dark:text-gray-300">
                          <span className="text-gray-500">Contact:</span>{" "}
                          {truncateEmail(lead.email, 22)} • {lead.phone}
                        </p>
                        {lead.email && lead.email.length > 22 && (
                          <FaInfoCircle
                            className="text-gray-400 text-xs flex-shrink-0"
                            title={lead.email}
                          />
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-200">
                      {lead.destination}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-300">
                      <span className="text-gray-500">Visa/Holidays:</span>{" "}
                      {getVisaHolidayLabel(lead)}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-300">
                      <span className="text-gray-500">Lead Country:</span>{" "}
                      {lead.leadCountry || "-"}
                    </p>
                    <div className="flex items-center justify-between">
                      <p
                        className={`text-xs ${
                          lead.slaBreached ? "text-red-600" : "text-gray-500"
                        }`}
                      >
                        SLA: {lead.slaBreached ? "Breached" : lead.sla}
                      </p>
                      <button
                        className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5 text-xs hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                        onClick={() => handleViewLead(lead)}
                      >
                        <FaEye />
                        View
                      </button>
                    </div>
                  </div>
                ))}
              </div>

		              <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-200 dark:border-gray-800">
		                <p className="text-sm text-gray-500 dark:text-gray-400">
		                  Showing{" "}
		                  {leadIdModeActive
		                    ? (rows.length ? 1 : 0)
		                    : pagination?.total
		                      ? (page - 1) * (pagination.limit || pageSize) + 1
		                      : 0}
		                  -
		                  {leadIdModeActive
		                    ? rows.length
		                    : pagination?.total
		                      ? Math.min(
		                          pagination.total,
		                          (page - 1) * (pagination.limit || pageSize) +
		                            rows.length,
		                        )
		                      : 0}{" "}
		                  of {leadIdModeActive ? rows.length : (pagination?.total ?? rows.length)}
		                </p>
		                <div className="flex items-center gap-2">
		                  <button
		                    onClick={() => {
		                      if (leadIdModeActive) return;
		                      setPage((prev) => Math.max(1, prev - 1));
		                    }}
		                    disabled={leadIdModeActive || page === 1 || loading}
		                    className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 disabled:opacity-40"
		                  >
	                    <FaChevronLeft />
	                  </button>
	                  <span className="px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-sm font-medium">
	                    {leadIdModeActive ? 1 : page}
	                  </span>
		                  <button
		                    onClick={() => {
		                      if (leadIdModeActive) return;
		                      setPage((prev) => Math.min(effectiveTotalPages, prev + 1));
		                    }}
		                    disabled={leadIdModeActive || page === effectiveTotalPages || loading}
		                    className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 disabled:opacity-40"
		                  >
	                    <FaChevronRight />
	                  </button>
                </div>
              </div>
            </>
          )}
        </SurfaceCard>

        <style>{`
          html,
          body {
            overflow-x: hidden;
          }

          .leads-table-scroll {
            scrollbar-width: thin;
            scrollbar-color: rgba(107, 114, 128, 0.22) transparent;
          }

          .leads-table-scroll::-webkit-scrollbar {
            height: 5px;
          }

          .leads-table-scroll::-webkit-scrollbar-track {
            background: transparent;
          }

          .leads-table-scroll::-webkit-scrollbar-thumb {
            background: rgba(107, 114, 128, 0.22);
            border-radius: 9999px;
          }

          .leads-table-scroll:hover::-webkit-scrollbar-thumb {
            background: rgba(107, 114, 128, 0.35);
          }
        `}</style>
      </div>
    </div>
  );
};

const KpiCard = ({
  title,
  value,
  icon,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
}) => (
  <SurfaceCard hoverable className="p-3 sm:p-5">
    <div className="flex items-start justify-between">
      <div className="min-w-0">
        <p className="text-[10px] sm:text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 truncate">
          {title}
        </p>
        <p className="text-base sm:text-2xl font-semibold text-gray-900 dark:text-gray-100 mt-0.5 sm:mt-1">
          {value}
        </p>
      </div>
      <div className="text-2xl">{icon}</div>
    </div>
  </SurfaceCard>
);

export default Leads;
