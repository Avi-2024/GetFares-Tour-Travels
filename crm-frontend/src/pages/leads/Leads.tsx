import React, { useDeferredValue, useEffect, useMemo, useState } from "react";
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
import VirtualizedTable from "../../components/ui/VirtualizedTable";
import { reportApiError } from "../../lib/notify";
import { useLeadsService } from "../../hooks/useLeadsService";
import { useUsersService } from "../../hooks/useUsersService";
import { metaConnectionApi } from "../../api/metaConnection";

import type { LeadListItem, LeadsPagination } from "../../services/leadsService";
import { sopLabelToCanonical } from "../../utils/leadStatus";

interface LeadStats {
  totalLeads: number;
  newToday: number;
  followupActive: number;
  slaBreached: number;
}

const EMPTY_LEAD_STATS: LeadStats = {
  totalLeads: 0,
  newToday: 0,
  followupActive: 0,
  slaBreached: 0,
};

const quickFilters = [
  { key: "ALL", label: "All" },
  { key: "ACTIVE", label: "Active" },
  { key: "FOLLOW_UP", label: "Follow-up" },
  { key: "CLOSED", label: "Closed" },
  { key: "LATE_RESPONSE", label: "Late Response" },
  { key: "LOST", label: "Lost" },
] as const;
type QuickFilter = (typeof quickFilters)[number]["key"];
type LeadSourceFilter = "ALL" | "INDIA" | "UAE" | "WALKIN";

type LeadFilterState = {
  fromDate: string;
  toDate: string;
  country: string;
  destination: string;
  leadSource: string;
  email: string;
  phone: string;
  leadId: string;
  consultant: string;
  status: "ALL" | "NEW" | "CONTACTED" | "NEGOTIATION" | "QUOTED" | "FOLLOW_UP_1" | "FOLLOW_UP_2" | "FOLLOW_UP_3" | "FOLLOW_UP_4" | "FINAL_REMINDER" | "CONVERTED" | "LOST" | "NON_RESPONSIVE";
  sla: "ALL" | "OVERDUE" | "WITHIN_SLA" | "PENDING";
  sortBy: "CREATED_AT_DESC" | "CREATED_AT_ASC" | "NAME_ASC" | "STATUS_ASC" | "COUNTRY_ASC";
};

type ConsultantUser = {
  id?: string;
  fullName?: string;
  full_name?: string;
  name?: string;
  email?: string;
  role?: string;
  isActive?: boolean;
  is_active?: boolean;
  active?: boolean | null;
};

const defaultFilters: LeadFilterState = {
  fromDate: "",
  toDate: "",
  country: "",
  destination: "",
  leadSource: "",
  email: "",
  phone: "",
  leadId: "",
  consultant: "",
  status: "ALL",
  sla: "ALL" as const,
  sortBy: "CREATED_AT_DESC",
};

const LEADS_VIEW_STATE_KEY = "leads:view_state:v1";

type LeadsViewState = {
  quickFilter: QuickFilter;
  leadSourceFilter: LeadSourceFilter;
  search: string;
  page: number;
  pageSize: number;
  draftFilters: LeadFilterState;
  appliedFilters: LeadFilterState;
};

const parseLeadViewState = (): LeadsViewState | null => {
  try {
    const raw = sessionStorage.getItem(LEADS_VIEW_STATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<LeadsViewState>;
    if (!parsed || typeof parsed !== "object") return null;
    return {
      quickFilter:
        parsed.quickFilter && quickFilters.some((q) => q.key === parsed.quickFilter)
          ? parsed.quickFilter
          : "ALL",
      leadSourceFilter:
        parsed.leadSourceFilter === "ALL" ||
        parsed.leadSourceFilter === "INDIA" ||
        parsed.leadSourceFilter === "UAE" ||
        parsed.leadSourceFilter === "WALKIN"
          ? parsed.leadSourceFilter
          : "ALL",
      search: typeof parsed.search === "string" ? parsed.search : "",
      page:
        Number.isInteger(parsed.page) && Number(parsed.page) > 0
          ? Number(parsed.page)
          : 1,
      pageSize:
        Number.isInteger(parsed.pageSize) && Number(parsed.pageSize) > 0
          ? Number(parsed.pageSize)
          : 25,
      draftFilters: {
        ...defaultFilters,
        ...(parsed.draftFilters && typeof parsed.draftFilters === "object"
          ? parsed.draftFilters
          : {}),
      },
      appliedFilters: {
        ...defaultFilters,
        ...(parsed.appliedFilters && typeof parsed.appliedFilters === "object"
          ? parsed.appliedFilters
          : {}),
      },
    };
  } catch {
    return null;
  }
};

const formatPaxSummary = (lead: LeadListItem) => {
  const adults = Math.max(lead.adultsCount ?? 0, 0);
  const children = Math.max(lead.childrenCount ?? 0, 0);
  const adultLabel = `${adults} Adult${adults === 1 ? "" : "s"}`;

  if (children <= 0) return adultLabel;

  return `${adultLabel}, ${children} ${children === 1 ? "Child" : "Children"}`;
};

const formatMoney = (amount: number, currency = 'INR') => {
  const normalized = String(currency || 'INR').toUpperCase()
  try {
    return new Intl.NumberFormat(normalized === 'INR' ? 'en-IN' : 'en-US', {
      style: 'currency',
      currency: normalized,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(Number.isFinite(amount) ? amount : 0)
  } catch (_error) {
    return `${(Number.isFinite(amount) ? amount : 0).toLocaleString()} ${normalized}`
  }
}

const truncateEmail = (value: string, maxLength = 26) => {
  const safe = (value || "").trim();
  if (!safe) return "N/A";
  if (safe.length <= maxLength) return safe;
  return `${safe.slice(0, Math.max(3, maxLength - 3))}...`;
};

const extractRows = <T,>(response: unknown): T[] => {
  const payload = response as { data?: T[] | { data?: T[]; items?: T[] } };
  if (Array.isArray(payload?.data)) return payload.data;
  const nested = payload?.data as { data?: T[]; items?: T[] } | undefined;
  if (Array.isArray(nested?.data)) return nested.data;
  if (Array.isArray(nested?.items)) return nested.items;
  return Array.isArray(response) ? (response as T[]) : [];
};

const Leads: React.FC = () => {
  const initialViewState = useMemo(() => parseLeadViewState(), []);
  const [quickFilter, setQuickFilter] = useState<QuickFilter>(
    initialViewState?.quickFilter ?? "ALL",
  );
  const [leadSourceFilter, setLeadSourceFilter] = useState<LeadSourceFilter>(
    initialViewState?.leadSourceFilter ?? "ALL",
  );
  const [search, setSearch] = useState(initialViewState?.search ?? "");
  const [page, setPage] = useState(initialViewState?.page ?? 1);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const [fetchedLeads, setFetchedLeads] = useState<LeadListItem[]>([]);
  const [leadStats, setLeadStats] = useState<LeadStats>(EMPTY_LEAD_STATS);
  const [pagination, setPagination] = useState<LeadsPagination | null>(null);
  const [destinationNames, setDestinationNames] = useState<string[]>([]);
  const destinationsFetchedRef = React.useRef(false);
  const [leadSourceNames, setLeadSourceNames] = useState<string[]>([]);
  const leadSourcesFetchedRef = React.useRef(false);
  const [consultantUsers, setConsultantUsers] = useState<Array<{ id: string; name: string }>>([]);
  const consultantsFetchedRef = React.useRef(false);
  const [pageSize, setPageSize] = useState(initialViewState?.pageSize ?? 25);
  const [draftFilters, setDraftFilters] = useState<LeadFilterState>(
    initialViewState?.draftFilters ?? defaultFilters,
  );
  const [appliedFilters, setAppliedFilters] = useState<LeadFilterState>(
    initialViewState?.appliedFilters ?? defaultFilters,
  );
  const [debouncedSearch, setDebouncedSearch] = useState(
    initialViewState?.search?.trim() ?? "",
  );
  const nav = useNavigate();
  const leadsService = useLeadsService();
  const usersService = useUsersService();
  const deferredSearch = useDeferredValue(debouncedSearch);

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
      { value: "OVERDUE", label: "Breached SLA" },
      { value: "WITHIN_SLA", label: "Within SLA" },
    ],
    [],
  );

  const destinationOptions = useMemo(
    () => [
      { value: "", label: "All Destinations" },
      ...destinationNames.map((name) => ({ value: name, label: name })),
    ],
    [destinationNames],
  );

  const leadSourceOptions = useMemo(
    () => {
      const names = Array.from(new Set(leadSourceNames)).sort((left, right) =>
        left.localeCompare(right),
      );
      return [
        { value: "", label: "All lead sources" },
        ...names.map((name) => ({ value: name, label: name })),
      ];
    },
    [leadSourceNames],
  );

  const consultantOptions = useMemo(
    () => [
      { value: "", label: "All Consultants" },
      ...consultantUsers.map((user) => ({ value: user.id, label: user.name })),
    ],
    [consultantUsers],
  );

  const sortOptions = useMemo(
    () => [
      { value: "CREATED_AT_DESC", label: "Created desc" },
      { value: "CREATED_AT_ASC", label: "Created asc" },
      { value: "NAME_ASC", label: "Name A-Z" },
      { value: "STATUS_ASC", label: "Status" },
      { value: "COUNTRY_ASC", label: "Country" },
    ],
    [],
  );

  const buildLeadQuery = (queryPage: number, queryLimit: number) => {
    const chipSourceValue =
      leadSourceFilter === "WALKIN" ? "walkin" : "";
    const chipCountryValue =
      leadSourceFilter === "INDIA"
        ? "India"
        : leadSourceFilter === "UAE"
          ? "UAE"
          : "";
    const dropdownSource = appliedFilters.leadSource.trim();
    const effectiveSource =
      leadSourceFilter !== "ALL" ?
        chipSourceValue
      : dropdownSource || undefined;

    // Resolve canonical status + subStatus from SOP label
    let canonicalStatus: string | undefined
    let subStatus: string | undefined
    if (appliedFilters.status !== 'ALL') {
      const conversion = sopLabelToCanonical(appliedFilters.status as any)
      canonicalStatus = conversion.canonical
      subStatus = conversion.subStatus
    }

    // Common filters applied in both modes
    const commonFilters = {
      ...(quickFilter !== "ALL" ? { quickFilter } : {}),
      ...(effectiveSource ? { source: effectiveSource } : {}),
      ...(chipCountryValue || appliedFilters.country
        ? { country: chipCountryValue || appliedFilters.country }
        : {}),
      ...(canonicalStatus ? { status: canonicalStatus } : {}),
      ...(subStatus ? { subStatus } : {}),
      ...(appliedFilters.fromDate ? { fromDate: appliedFilters.fromDate } : {}),
      ...(appliedFilters.toDate ? { toDate: appliedFilters.toDate } : {}),
      ...(appliedFilters.destination ? { destination: appliedFilters.destination } : {}),
      ...(appliedFilters.sla !== "ALL" ? { sla: appliedFilters.sla } : {}),
    }

    return {
      page: queryPage,
      limit: queryLimit,
      ...(deferredSearch ? { search: deferredSearch } : {}),
      ...commonFilters,
      ...(appliedFilters.email.trim() ? { email: appliedFilters.email.trim() } : {}),
      ...(appliedFilters.phone.trim() ? { phone: appliedFilters.phone.trim() } : {}),
      ...(appliedFilters.leadId.trim() ? { leadId: appliedFilters.leadId.trim() } : {}),
      ...(appliedFilters.consultant.trim() ? { assignedTo: appliedFilters.consultant.trim() } : {}),
      ...(appliedFilters.sortBy ? { sortBy: appliedFilters.sortBy } : {}),
    }
  };

  // Load all destination names once on mount — independent of filters
  useEffect(() => {
    if (destinationsFetchedRef.current) return
    destinationsFetchedRef.current = true
    const fetchDestinations = async () => {
      try {
        const names = await leadsService.getLeadDestinations({ limit: 500 })
        setDestinationNames(names)
      } catch {
        // silently ignore — destination filter just won't populate
      }
    }
    void fetchDestinations()
  }, [leadsService])

  useEffect(() => {
    if (leadSourcesFetchedRef.current) return
    leadSourcesFetchedRef.current = true
    const run = async () => {
      try {
        const [names, pages] = await Promise.all([
          leadsService.getLeadSources({ limit: 200 }).catch(() => []),
          metaConnectionApi.listPages({ isActive: true }).catch(() => []),
        ])
        const pageLabels = pages
          .map((page) =>
            String(page.sourceLabel || page.pageName || "").trim(),
          )
          .filter(Boolean)
        setLeadSourceNames([...new Set([...names, ...pageLabels])])
      } catch {
        setLeadSourceNames([])
      }
    }
    void run()
  }, [leadsService])

  // Load all unique consultants once on mount — fetch from all leads
  useEffect(() => {
    if (consultantsFetchedRef.current) return
    consultantsFetchedRef.current = true
    const fetchConsultants = async () => {
      try {
        // Fetch a large batch to get all unique consultants
        const response = await usersService.list()
        const salesConsultants = extractRows<ConsultantUser>(response)
          .filter(user => String(user.role || '').trim().toLowerCase() === 'sales_consultant')
          .filter(user => user.isActive !== false && user.is_active !== false && user.active !== false)
          .map(user => ({
            id: String(user.id || '').trim(),
            name: String(user.fullName || user.full_name || user.name || user.email || '').trim(),
          }))
          .filter(user => user.id && user.name)
          .sort((left, right) => left.name.localeCompare(right.name))
        setConsultantUsers(salesConsultants)
      } catch {
        // silently ignore — consultant filter just won't populate
      }
    }
    void fetchConsultants()
  }, [usersService])

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
        const { page: _page, limit: _limit, ...statsQuery } = query;
        const [result, stats] = await Promise.all([
          leadsService.listLeadsPage(query),
          leadsService.getLeadStats(statsQuery),
        ]);
        setFetchedLeads(result.items);
        setLeadStats(stats);
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
        setLeadStats(EMPTY_LEAD_STATS);
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
    deferredSearch,
    leadSourceFilter,
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
  const rows = fetchedLeads;
  const effectiveTotalPages = totalPages;

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (appliedFilters.fromDate) count += 1;
    if (appliedFilters.toDate) count += 1;
    if (appliedFilters.country) count += 1;
    if (appliedFilters.destination) count += 1;
    if (appliedFilters.leadSource.trim()) count += 1;
    if (appliedFilters.email) count += 1;
    if (appliedFilters.phone) count += 1;
    if (appliedFilters.leadId) count += 1;
    if (appliedFilters.consultant) count += 1;
    if (appliedFilters.status !== "ALL") count += 1;
    if (appliedFilters.sla !== "ALL") count += 1;
    if (appliedFilters.sortBy !== "CREATED_AT_DESC") count += 1;
    if (leadSourceFilter !== "ALL") count += 1;
    return count;
  }, [appliedFilters, leadSourceFilter]);

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
    // Use longer debounce for leadId to avoid firing on every keystroke
    const delay = draftFilters.leadId !== appliedFilters.leadId ? 600 : 250;
    const timer = window.setTimeout(() => {
      setAppliedFilters({
        ...draftFilters,
        email: draftFilters.email.trim(),
        phone: draftFilters.phone.trim(),
        leadId: draftFilters.leadId.trim(),
        consultant: draftFilters.consultant.trim(),
        leadSource: draftFilters.leadSource.trim(),
      });
      setPage(1);
    }, delay);

    return () => window.clearTimeout(timer);
  }, [draftFilters]);

  useEffect(() => {
    const state: LeadsViewState = {
      quickFilter,
      leadSourceFilter,
      search,
      page,
      pageSize,
      draftFilters,
      appliedFilters,
    };
    try {
      sessionStorage.setItem(LEADS_VIEW_STATE_KEY, JSON.stringify(state));
    } catch {
      // no-op
    }
  }, [
    appliedFilters,
    draftFilters,
    leadSourceFilter,
    page,
    pageSize,
    quickFilter,
    search,
  ]);

  const handleResetFilters = () => {
    setError("");
    setDraftFilters(defaultFilters);
    setAppliedFilters(defaultFilters);
    setQuickFilter("ALL");
    setLeadSourceFilter("ALL");
    setSearch("");
    setPage(1);
    try {
      sessionStorage.removeItem(LEADS_VIEW_STATE_KEY);
    } catch {
      // no-op
    }
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
      const exportLimit = 50;
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
        lead.statusDisplay,
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
    const source = `${lead.packageName ?? ""} ${lead.statusDisplay ?? ""}`
      .trim()
      .toLowerCase();
    return source.includes("visa") ? "Visa" : "Holidays";
  };

const getLeadMoneyLabel = (lead: LeadListItem) => {
  const leadType = String(lead.leadType ?? lead.lead_type ?? '').trim().toUpperCase()
  const currency = 'INR'
  if (leadType === 'VISA') {
    const value = Number(lead.salary ?? 0)
    if (!value) return null
    return { label: 'Salary', value: formatMoney(value, currency) }
  }
 
}

  const tableColumns = useMemo(
    () => [
      { key: "createdAt", label: "Date", width: "120px", align: "center" as const },
      { key: "lead", label: "Lead", width: "180px" },
      { key: "salesPerson", label: "Sales Person", width: "160px" },
      { key: "leadId", label: "Lead ID", width: "110px" },
      { key: "leadSource", label: "Lead Source", width: "180px" },
      { key: "contact", label: "Contact", width: "220px" },
      { key: "destination", label: "Destination", width: "170px" },
      { key: "type", label: "Visa/Holidays", width: "140px" },
      { key: "country", label: "Lead Country", width: "140px" },
      { key: "status", label: "Status", width: "150px", align: "center" as const },
      { key: "sla", label: "SLA", width: "120px", align: "center" as const },
      { key: "view", label: "View", width: "110px", align: "right" as const },
    ],
    [],
  );

  const renderDesktopLeadRow = (lead: LeadListItem) => {
    const money = getLeadMoneyLabel(lead);
    const dateLabel = (() => {
      const raw = String(lead.clientCreatedAt || lead.createdAt || "").trim();
      const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
      return match ? `${match[3]}/${match[2]}/${match[1]}` : "-";
    })();
    const priorityTone =
      lead.priority === "High" ?
        "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
      : lead.priority === "Medium" ?
        "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
      : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";
    const priorityLabel =
      lead.priority === "High" ? "🔥 Hot"
      : lead.priority === "Medium" ? "⚡ Warm"
      : "❄️ Cold";
    const maxNameLength = 17;
    const displayName = lead.name.length > maxNameLength ? lead.name.slice(0, maxNameLength) + '...' : lead.name;

    return (
      <div
        className="grid border-b border-gray-100 bg-white transition-colors hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:hover:bg-gray-800/40"
        style={{
          gridTemplateColumns: "120px 180px 160px 110px 180px 220px 170px 140px 140px 150px 120px 110px",
          width: "max-content",
          minWidth: "100%",
        }}
      >
        <div className="px-3 py-4 text-center text-sm font-medium text-gray-700 dark:text-gray-200">
          {dateLabel}
        </div>
        <div className="px-3 py-4">
          <div className="">
            <div className="flex items-center gap-1">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100" title={lead.name}>{displayName}</p>
              {lead.name.length > maxNameLength && (
                <FaInfoCircle className="text-gray-400 hover:text-blue-500 cursor-help flex-shrink-0" title={lead.name} />
              )}
            </div>
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${priorityTone}`}>
              {priorityLabel}
            </span>
            <p className="text-xs text-gray-500 dark:text-gray-400">{formatPaxSummary(lead)}</p>
            {money ? (
              <p className="text-xs text-gray-600 dark:text-gray-300">
                {money.label}: {money.value}
              </p>
            ) : null}
          </div>
        </div>
        <div className="px-3 py-4">
          <div className="space-y-1">
            {lead.consultant && lead.consultant !== "Unassigned" && (
              <p className="text-xs text-gray-700 dark:text-gray-300">
                {lead.consultant}
              </p>
            )}
            {lead.assignedBy && (
              <p className="text-xs text-blue-600 dark:text-blue-400">
                Assigned by: {lead.assignedBy}
              </p>
            )}
            {(!lead.consultant || lead.consultant === "Unassigned") && !lead.assignedBy && (
              <p className="text-xs text-gray-500 dark:text-gray-400">-</p>
            )}
          </div>
        </div>
        <div className="px-3 py-4">
          <button
            onClick={() => handleViewLead(lead)}
            className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:underline cursor-pointer"
          >
            {lead.leadId}
          </button>
        </div>
        <div className="px-3 py-4 text-sm text-gray-700 dark:text-gray-200">
          <span className="line-clamp-2 break-words">{lead.source || "-"}</span>
        </div>
        <div className="px-3 py-4">
          <div className="flex items-center gap-1">
            <p className="truncate text-sm font-medium text-gray-800 dark:text-gray-200" title={lead.email}>
              {truncateEmail(lead.email)}
            </p>
            {lead.email && lead.email.length > 26 && (
              <FaInfoCircle className="text-gray-400 hover:text-blue-500 cursor-help flex-shrink-0" title={lead.email} />
            )}
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{lead.phone}</p>
        </div>
        <div className="px-3 py-4 text-sm font-medium text-gray-800 dark:text-gray-200">
          {lead.destination}
        </div>
        <div className="px-3 py-4 text-sm font-medium text-gray-800 dark:text-gray-200">
          {getVisaHolidayLabel(lead)}
        </div>
        <div className="px-3 py-4 text-sm font-medium text-gray-700 dark:text-gray-300">
          {lead.leadCountry || "-"}
        </div>
        <div className="flex items-center justify-center px-3 py-4">
          <StatusBadge status={lead.statusDisplay} />
        </div>
        <div className={`px-3 py-4 text-center text-sm font-medium ${lead.slaBreached ? "text-red-600" : "text-gray-700 dark:text-gray-200"}`}>
          {lead.slaBreached ? "Breached" : lead.sla}
        </div>
        <div className="px-3 py-4 text-right">
          <button
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium hover:bg-gray-50 transition-colors dark:border-gray-700 dark:hover:bg-gray-800"
            onClick={() => handleViewLead(lead)}
          >
            <FaEye />
            View
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6 min-w-0">
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

        <SurfaceCard className="max-w-full min-w-0 p-0 border border-gray-200 dark:border-gray-800">
          <div className="p-3 sm:p-4 border-b border-gray-200 dark:border-gray-800 space-y-3">
            {error ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-200">
                {error}
              </div>
            ) : null}
            <div className="w-full overflow-x-auto pb-1 scrollbar-hide">
              <div className="flex w-full min-w-max items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 p-1 dark:border-gray-700 dark:bg-gray-800">
                <div className="flex items-center gap-1">
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
                <div className="ml-auto inline-flex items-center gap-2 rounded-lg bg-gray-100 p-1 text-xs font-medium sm:text-sm">
                  <button
                    onClick={() => {
                      setLeadSourceFilter("ALL");
                      setDraftFilters((p) => ({ ...p, leadSource: "" }));
                      setAppliedFilters((p) => ({ ...p, leadSource: "" }));
                      setPage(1);
                    }}
                    className={`whitespace-nowrap rounded-md px-3 py-1.5 transition-all duration-300 hover:bg-white hover:shadow-md ${
                      leadSourceFilter === "ALL"
                        ? "bg-[#2F3640] text-white"
                        : "bg-white text-[#2F3640]"
                    }`}
                  >
                    All
                  </button>

                  <button
                    onClick={() => {
                      setLeadSourceFilter("INDIA");
                      setDraftFilters((p) => ({ ...p, leadSource: "" }));
                      setAppliedFilters((p) => ({ ...p, leadSource: "" }));
                      setPage(1);
                    }}
                    className={`whitespace-nowrap rounded-md px-3 py-1.5 transition-all duration-300 hover:bg-white hover:shadow-md ${
                      leadSourceFilter === "INDIA"
                        ? "bg-[#F97316] text-white"
                        : "bg-white text-[#F97316]"
                    }`}
                  >
                    India
                  </button>

                  <button
                    onClick={() => {
                      setLeadSourceFilter("UAE");
                      setDraftFilters((p) => ({ ...p, leadSource: "" }));
                      setAppliedFilters((p) => ({ ...p, leadSource: "" }));
                      setPage(1);
                    }}
                    className={`whitespace-nowrap rounded-md px-3 py-1.5 transition-all duration-300 hover:bg-white hover:shadow-md ${
                      leadSourceFilter === "UAE"
                        ? "bg-[#10B981] text-white"
                        : "bg-white text-[#10B981]"
                    }`}
                  >
                    UAE
                  </button>
                
                </div>
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

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
                   Lead Country
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
                    Lead source
                  </label>
                  <SearchableDropdown
                    className="w-full"
                    value={draftFilters.leadSource}
                    options={leadSourceOptions}
                    placeholder="All lead sources"
                    searchPlaceholder="Search source..."
                    onChange={(value) => updateDraftFilter("leadSource", value)}
                    disabled={leadSourceFilter !== "ALL"}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
                    Consultant
                  </label>
                  <SearchableDropdown
                    className="w-full"
                    value={draftFilters.consultant}
                    options={consultantOptions}
                    placeholder="All Consultants"
                    searchPlaceholder="Search consultant..."
                    onChange={(value) =>
                      updateDraftFilter("consultant", value)
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
                <select
                  value={pageSize}
                  onChange={(event) => {
                    setPageSize(Number(event.target.value));
                    setPage(1);
                  }}
                  className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
                >
                  {[10, 25, 50].map((size) => (
                    <option key={size} value={size}>
                      {size} rows
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <div
                  key={index}
                  className="h-20 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800"
                />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="p-8">
              <EmptyState
                title="No leads found"
                description="Try adjusting yo ur filter combination and search query."
                icon={<FaUsers className="text-4xl" />}
              />
            </div>
          ) : (
            <>
              <div className="hidden lg:block">
                <VirtualizedTable
                  columns={tableColumns}
                  rows={rows}
                  rowHeight={96}
                  height={560}
                  renderRow={(lead) => renderDesktopLeadRow(lead)}
                />
              </div>

              <div
                className="block lg:hidden leads-table-scroll max-w-full min-w-0 overflow-x-scroll overscroll-x-contain"
                style={{ WebkitOverflowScrolling: "touch" }}
              >
                <table
                  className="border-collapse"
                  style={{ width: "max-content", minWidth: "1440px" }}
                >
                  <colgroup>
                    <col style={{ width: 120, minWidth: 120 }} />
                    <col style={{ width: 180, minWidth: 180 }} />
                    <col style={{ width: 160, minWidth: 160 }} />
                    <col style={{ width: 110, minWidth: 110 }} />
                    <col style={{ width: 180, minWidth: 180 }} />
                    <col style={{ width: 220, minWidth: 220 }} />
                    <col style={{ width: 170, minWidth: 170 }} />
                    <col style={{ width: 140, minWidth: 140 }} />
                    <col style={{ width: 140, minWidth: 140 }} />
                    <col style={{ width: 150, minWidth: 150 }} />
                    <col style={{ width: 120, minWidth: 120 }} />
                    <col style={{ width: 110, minWidth: 110 }} />
                  </colgroup>
                  <thead className="bg-gray-50  dark:bg-gray-800/50 sticky top-0 z-10">
                    <tr>
                      <th className="px-3 py-3.5 text-center text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap border-b border-gray-200 dark:border-gray-700">
                        Date
                      </th>
                      <th className="px-3 py-3.5 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap border-b border-gray-200 dark:border-gray-700">
                        Lead
                      </th>
                      <th className="px-3 py-3.5 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap border-b border-gray-200 dark:border-gray-700">
                        Sales Person
                      </th>
                      <th className="px-3 py-3.5 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap border-b border-gray-200 dark:border-gray-700">
                        Lead ID
                      </th>
                      <th className="px-3 py-3.5 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap border-b border-gray-200 dark:border-gray-700">
                        Lead Source
                      </th>
                      <th className="px-3 py-3.5 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap border-b border-gray-200 dark:border-gray-700">
                        Contact
                      </th>
                      <th className="px-3 py-3.5 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap border-b border-gray-200 dark:border-gray-700">
                        Destination
                      </th>
                      <th className="px-3 py-3.5 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap border-b border-gray-200 dark:border-gray-700">
                        Visa/Holidays
                      </th>
                      <th className="px-3 py-3.5 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap border-b border-gray-200 dark:border-gray-700">
                        Lead Country
                      </th>
                      <th className="px-3 py-3.5 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap border-b border-gray-200 dark:border-gray-700">
                        Sales Person
                      </th>
                      <th className="px-3 py-3.5 text-center text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap border-b border-gray-200 dark:border-gray-700">
                        Status
                      </th>
                      <th className="px-3 py-3.5 text-center text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap border-b border-gray-200 dark:border-gray-700">
                        SLA
                      </th>
                      <th className="px-3 py-3.5 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap border-b border-gray-200 dark:border-gray-700">
                        View
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-900">
                    {rows.map((lead) => (
                      <tr
                        key={lead.id}
                        className="border-b border-gray-100 hover:bg-gray-50 transition-colors dark:border-gray-800 dark:hover:bg-gray-800/40"
                      >
                        <td className="px-3 py-4 text-center whitespace-nowrap">
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                            {(() => {
                              const raw = String(lead.clientCreatedAt || lead.createdAt || '').trim()
                              const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw)
                              return m ? `${m[3]}/${m[2]}/${m[1]}` : '-'
                            })()}
                          </p>
                        </td>
                        <td className="px-3 py-4 align-top">
                          <div className="min-w-0 space-y-1">
                            <p className="break-words text-sm font-medium text-gray-900 dark:text-gray-100">
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
                            {(() => {
                              const money = getLeadMoneyLabel(lead)
                              if (!money) return null
                              return (
                                <p className="text-xs text-gray-600 dark:text-gray-300">
                                  {money.label}: {money.value}
                                </p>
                              )
                            })()}
                          </div>
                        </td>
                        <td className="px-3 py-4 align-top">
                          <div className="space-y-1">
                            {lead.consultant && lead.consultant !== "Unassigned" && (
                              <p className="text-xs text-gray-700 dark:text-gray-300">
                                Assigned to: {lead.consultant}
                              </p>
                            )}
                            {lead.assignedBy && (
                              <p className="text-xs text-blue-600 dark:text-blue-400">
                                Assigned by: {lead.assignedBy}
                              </p>
                            )}
                            {(!lead.consultant || lead.consultant === "Unassigned") && !lead.assignedBy && (
                              <span className="text-sm text-gray-500 dark:text-gray-400">-</span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap">
                          <button
                            onClick={() => handleViewLead(lead)}
                            className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:underline cursor-pointer"
                          >
                            {lead.leadId}
                          </button>
                        </td>
                        <td className="px-3 py-4">
                          <span className="line-clamp-2 break-words text-sm text-gray-700 dark:text-gray-200">
                            {lead.source || "-"}
                          </span>
                        </td>
                        <td className="px-3 py-4">
                          <div className="space-y-1">
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
                          </div>
                        </td>
                        <td className="px-3 py-4 align-middle" title={lead.destination}>
                          <span className="line-clamp-2 break-words text-sm font-medium text-gray-800 dark:text-gray-200">
                            {lead.destination}
                          </span>
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                            {getVisaHolidayLabel(lead)}
                          </span>
                        </td>
                        <td className="px-3 py-4 align-middle">
                          <span className="line-clamp-2 break-words text-sm font-medium text-gray-700 dark:text-gray-300">
                            {lead.leadCountry || "-"}
                          </span>
                        </td>
                        <td className="min-w-[140px] px-3 py-4 text-center align-middle">
                          <div className="flex justify-center">
                            <StatusBadge status={lead.statusDisplay} />
                          </div>
                        </td>
                        <td className="px-3 py-4 text-center align-middle whitespace-nowrap">
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
                        <td className="px-3 py-4 text-right  whitespace-nowrap">
                          <button
                            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium hover:bg-gray-50 transition-colors dark:border-gray-700 dark:hover:bg-gray-800"
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



		              <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-200 dark:border-gray-800">
		                <p className="text-sm text-gray-500 dark:text-gray-400">
		                  Showing{" "}
			                  {pagination?.total
			                    ? (page - 1) * (pagination.limit || pageSize) + 1
			                    : 0}
			                  -{pagination?.total
			                    ? Math.min(pagination.total, (page - 1) * (pagination.limit || pageSize) + rows.length)
			                    : 0}{" "}
			                  of {pagination?.total ?? rows.length}
			                </p>
			                <div className="flex items-center gap-2">
			                  <button
			                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
			                    disabled={page === 1 || loading}
			                    className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 disabled:opacity-40"
			                  >
		                    <FaChevronLeft />
		                  </button>
		                  <span className="px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-sm font-medium">
		                    {page}
		                  </span>
			                  <button
			                    onClick={() => setPage((prev) => Math.min(effectiveTotalPages, prev + 1))}
			                    disabled={page === effectiveTotalPages || loading}
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
          .leads-table-scroll {
            scrollbar-width: thin;
            scrollbar-color: rgba(59, 130, 246, 0.3) rgba(243, 244, 246, 0.5);
          }

          .leads-table-scroll::-webkit-scrollbar {
            height: 8px;
          }

          .leads-table-scroll::-webkit-scrollbar-track {
            background: rgba(243, 244, 246, 0.5);
            border-radius: 4px;
          }

          .leads-table-scroll::-webkit-scrollbar-thumb {
            background: rgba(59, 130, 246, 0.3);
            border-radius: 4px;
          }

          .leads-table-scroll:hover::-webkit-scrollbar-thumb {
            background: rgba(59, 130, 246, 0.5);
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
