import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaCalendarPlus,
  FaChevronLeft,
  FaChevronRight,
  FaEye,
  FaFire,
  FaPlus,
  FaSearch,
  FaUsers,
} from "react-icons/fa";
import EmptyState from "../../components/ui/EmptyState";
import StatusBadge from "../../components/ui/StatusBadge";
import SurfaceCard from "../../components/ui/SurfaceCard";
import { getApiErrorMessage } from "../../api/apiClient";
import { useLeadsService } from "../../hooks/useLeadsService";
import type { LeadListItem } from "../../services/leadsService";
import {
  SOP_STATUS_LABELS,
  type SopStatusLabel,
  toStatusLabelText,
} from "../../utils/leadStatus";

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

const leadJourneySteps = [
  {
    title: "1. Lead Captured",
    detail:
      "Lead enters CRM from website, ads, call, referral, or walk-in and starts in New status.",
  },
  {
    title: "2. First Contact in 15 Minutes",
    detail:
      "Consultant must call first within 15 minutes. If this misses, it appears in Late Response.",
  },
  {
    title: "3. If No Answer, Send WhatsApp",
    detail:
      "After missed call, send WhatsApp and schedule next follow-up immediately.",
  },
  {
    title: "4. Mandatory Qualification",
    detail:
      "Capture destination, travel date, adults/children, budget, visa need, hotel category, and travel purpose.",
  },
  {
    title: "5. Classify Priority",
    detail:
      "Mark as Hot, Warm, or Cold based on travel timeline and readiness.",
  },
  {
    title: "6. Send Quotation",
    detail:
      "Send quote with SLA buckets (30/120/360 minutes depending journey complexity).",
  },
  {
    title: "7. Follow-up Compliance",
    detail:
      "Do required cadence: minimum 4 calls + 2 WhatsApp + 1 final reminder.",
  },
  {
    title: "8. Close Outcome",
    detail:
      "Convert to booking if customer confirms; otherwise mark Lost/Non-Responsive as per SOP.",
  },
];

const Leads: React.FC = () => {
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("ALL");
  const [statusFilter, setStatusFilter] = useState<SopStatusLabel | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fetchedLeads, setFetchedLeads] = useState<LeadListItem[]>([]);
  const pageSize = 15;
  const nav = useNavigate();
  const leadsService = useLeadsService();

  useEffect(() => {
    const fetchLeads = async () => {
      setLoading(true);
      setError("");
      try {
        const mapped = await leadsService.listLeads({
          page: 1,
          limit: 500,
        });
        setFetchedLeads(mapped);
      } catch (err) {
        setError(getApiErrorMessage(err, "Failed to load leads"));
        setFetchedLeads([]);
      } finally {
        setLoading(false);
      }
    };
    void fetchLeads();
  }, [leadsService]);

  const filtered = useMemo(
    () =>
      fetchedLeads.filter((lead) => {
        const quickMatch =
          quickFilter === "ALL" ||
          (quickFilter === "ACTIVE" &&
            ["NEW", "CONTACTED", "NEGOTIATION", "QUOTED"].includes(lead.statusLabel)) ||
          (quickFilter === "FOLLOW_UP" &&
            (lead.statusLabel.startsWith("FOLLOW_UP") ||
              lead.statusLabel === "FINAL_REMINDER")) ||
          (quickFilter === "CLOSED" &&
            ["CONVERTED", "LOST", "NON_RESPONSIVE"].includes(lead.statusLabel)) ||
          (quickFilter === "LATE_RESPONSE" && lead.slaBreached);
        const statusMatch =
          statusFilter === "ALL" || lead.statusLabel === statusFilter;
        const text = `${lead.name} ${lead.email} ${lead.destination} ${lead.phone}`.toLowerCase();
        return quickMatch && statusMatch && text.includes(search.toLowerCase());
      }),
    [fetchedLeads, quickFilter, search, statusFilter],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const rows = filtered.slice((page - 1) * pageSize, page * pageSize);

  const leadStats = useMemo<LeadStats>(
    () => ({
      totalLeads: fetchedLeads.length,
      newToday: fetchedLeads.filter((lead) => lead.statusLabel === "NEW").length,
      followupActive: fetchedLeads.filter(
        (lead) =>
          lead.statusLabel.startsWith("FOLLOW_UP") ||
          lead.statusLabel === "FINAL_REMINDER",
      ).length,
      slaBreached: fetchedLeads.filter((lead) => lead.slaBreached).length,
    }),
    [fetchedLeads],
  );

  const handleViewLead = (lead: LeadListItem) => {
    sessionStorage.setItem(`lead:${lead.id}`, JSON.stringify(lead));
    nav(`/leads/${lead.id}`, { state: { lead } });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-9xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Leads Management
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              SOP-aligned lead pipeline with follow-up and SLA visibility.
            </p>
          </div>
          <button
            onClick={() => nav("/create-lead")}
            className="inline-flex h-10 min-w-[140px] items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 text-sm font-semibold text-white transition-colors"
          >
            <FaPlus /> Create Lead
          </button>
        </div>

        {/* <SurfaceCard className="border border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Lead Journey Guide (As Per HOLIDAYS SOP)
            </h2>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              First-response target: 15 minutes
            </span>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            {leadJourneySteps.map((step) => (
              <div
                key={step.title}
                className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/40"
              >
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {step.title}
                </p>
                <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">
                  {step.detail}
                </p>
              </div>
            ))}
          </div>
        </SurfaceCard> */}

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
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

        <SurfaceCard className="overflow-hidden border border-gray-200 dark:border-gray-800">
          <div className="p-4 border-b border-gray-200 dark:border-gray-800 space-y-3">
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
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_220px]">
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
              <select
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value as SopStatusLabel | "ALL");
                  setPage(1);
                }}
                className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="ALL">All Statuses</option>
                {SOP_STATUS_LABELS.map((status) => (
                  <option key={status} value={status}>
                    {toStatusLabelText(status)}
                  </option>
                ))}
              </select>
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
                description="Try adjusting your search or status filters."
                icon={<FaUsers className="text-4xl" />}
              />
            </div>
          ) : (
            <>
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-800/50">
                    <tr>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Lead
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Contact
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Destination
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        SLA
                      </th>
                      <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {rows.map((lead) => (
                      <tr
                        key={lead.id}
                        className="hover:bg-blue-50/40 dark:hover:bg-gray-800/50 transition-colors"
                      >
                        <td className="px-5 py-4">
                          <p className="font-medium text-gray-900 dark:text-gray-100">
                            {lead.name}
                          </p>
                          <p className="text-xs text-gray-500">{lead.leadId}</p>
                        </td>
                        <td className="px-5 py-4">
                          <p className="text-sm text-gray-800 dark:text-gray-200">
                            {lead.email}
                          </p>
                          <p className="text-xs text-gray-500">{lead.phone}</p>
                        </td>
                        <td className="px-5 py-4 text-sm text-gray-800 dark:text-gray-200">
                          {lead.destination}
                        </td>
                        <td className="px-5 py-4">
                          <StatusBadge status={lead.statusLabel} />
                        </td>
                        <td className="px-5 py-4">
                          <p
                            className={`text-xs ${
                              lead.slaBreached ? "text-red-600" : "text-gray-500"
                            }`}
                          >
                            {lead.slaBreached
                              ? "Late response (15m target missed)"
                              : lead.sla}
                          </p>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <button
                            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5 text-xs hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
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
                        <p className="font-semibold text-gray-900 dark:text-gray-100">
                          {lead.name}
                        </p>
                        <p className="text-xs text-gray-500">{lead.leadId}</p>
                      </div>
                      <StatusBadge status={lead.statusLabel} />
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-300">
                      {lead.email} | {lead.phone}
                    </p>
                    <p className="text-sm text-gray-700 dark:text-gray-200">{lead.destination}</p>
                    <div className="flex items-center justify-between">
                      <p
                        className={`text-xs ${
                          lead.slaBreached ? "text-red-600" : "text-gray-500"
                        }`}
                      >
                        SLA:{" "}
                        {lead.slaBreached
                          ? "Late response (15m target missed)"
                          : lead.sla}
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

              <div className="flex items-center justify-between px-4 py-4 border-t border-gray-200 dark:border-gray-800">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Showing {Math.min(filtered.length, (page - 1) * pageSize + 1)}-
                  {Math.min(filtered.length, page * pageSize)} of {filtered.length}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                    disabled={page === 1}
                    className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 disabled:opacity-40"
                  >
                    <FaChevronLeft />
                  </button>
                  <span className="px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-sm font-medium">
                    {page}
                  </span>
                  <button
                    onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={page === totalPages}
                    className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 disabled:opacity-40"
                  >
                    <FaChevronRight />
                  </button>
                </div>
              </div>
            </>
          )}
        </SurfaceCard>
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
  <SurfaceCard className="p-5 hover:shadow-md transition-shadow">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
          {title}
        </p>
        <h3 className="mt-2 text-2xl font-semibold text-gray-900 dark:text-gray-100">
          {value}
        </h3>
      </div>
      <div className="text-2xl">{icon}</div>
    </div>
  </SurfaceCard>
);

export default Leads;
