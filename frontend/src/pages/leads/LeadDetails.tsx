import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa6";
import { getApiErrorMessage } from "../../api/apiClient";
import { useAuth } from "../../context/AuthContext";
import { useLeadsService } from "../../hooks/useLeadsService";

type LeadRecord = {
  id?: string;
  leadId?: string | null;
  fullName?: string | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  addressLine?: string | null;
  destination?: { id?: string; name?: string | null; country?: string | null } | string | null;
  destinationName?: string | null;
  travelDate?: string | null;
  budget?: number | string | null;
  adultsCount?: number | null;
  childrenCount?: number | null;
  visaRequired?: boolean | null;
  leadType?: string | null;
  travelPurpose?: string | null;
  source?: string | null;
  status?: string | null;
  temperature?: string | null;
  priorityLevel?: number | string | null;
  assignedTo?: string | null;
  assignedUser?: { id?: string | null; fullName?: string | null; email?: string | null } | null;
  assignedAt?: string | null;
  responseDeadline?: string | null;
  responseAt?: string | null;
  slaBreached?: boolean | null;
  closedReason?: string | null;
  nextFollowupDate?: string | null;
  subStatus?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

const toText = (value: unknown, fallback = "N/A") => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || fallback;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : fallback;
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  return fallback;
};

const getDestinationLabel = (lead: LeadRecord | null) => {
  const destination = lead?.destination;
  if (destination && typeof destination === "object") {
    const parts = [destination.name, destination.country].filter(Boolean);
    if (parts.length) return parts.join(", ");
  }

  if (typeof destination === "string" && destination.trim()) {
    return destination.trim();
  }

  return toText(lead?.destinationName, "N/A");
};

const formatDate = (value?: string | null) => {
  if (!value) return "N/A";
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return value;
  return new Date(parsed).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "N/A";
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return value;
  return new Date(parsed).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatCurrency = (value?: number | string | null) => {
  if (value === null || value === undefined || value === "") return "N/A";
  const amount = Number(value);
  if (!Number.isFinite(amount)) return toText(value);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
};

const normalizeStatus = (value?: string | null) => {
  const normalized = String(value || "").trim().toUpperCase();
  if (!normalized) return "OPEN";
  return normalized;
};

const statusClasses: Record<string, string> = {
  OPEN: "bg-blue-50 text-blue-700 border-blue-200",
  NEW: "bg-blue-50 text-blue-700 border-blue-200",
  CONTACTED: "bg-amber-50 text-amber-700 border-amber-200",
  WIP: "bg-amber-50 text-amber-700 border-amber-200",
  FOLLOW_UP: "bg-amber-50 text-amber-700 border-amber-200",
  QUALIFIED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  QUOTED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  CONVERTED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  LOST: "bg-red-50 text-red-700 border-red-200",
  NON_RESPONSIVE: "bg-red-50 text-red-700 border-red-200",
};

const LeadDetails: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const leadsService = useLeadsService();

  const [lead, setLead] = useState<LeadRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [markingLost, setMarkingLost] = useState(false);

  const loadLead = async (leadId: string) => {
    setLoading(true);
    setError("");
    try {
      const response = await leadsService.getLeadById(leadId);
      const payload =
        (response as { data?: { data?: LeadRecord } })?.data?.data ??
        (response as { data?: LeadRecord })?.data ??
        response;

      if (!payload || typeof payload !== "object") {
        throw new Error("Lead details are empty.");
      }

      setLead(payload);
    } catch (loadError) {
      setLead(null);
      setError(getApiErrorMessage(loadError, "Failed to load lead details."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!id) {
      setError("Lead id is missing.");
      return;
    }

    void loadLead(id);
  }, [id, leadsService]);

  const leadName = useMemo(() => {
    return toText(lead?.fullName ?? lead?.name, "Lead");
  }, [lead]);

  const leadCode = useMemo(() => {
    return toText(lead?.leadId ?? lead?.id ?? id, "N/A");
  }, [id, lead]);

  const assignedLabel = useMemo(() => {
    return toText(
      lead?.assignedUser?.fullName ?? lead?.assignedUser?.email ?? lead?.assignedTo,
      "Unassigned",
    );
  }, [lead]);

  const summaryCards = useMemo(
    () => [
      {
        label: "Status",
        value: normalizeStatus(lead?.status),
      },
      {
        label: "Temperature",
        value: toText(lead?.temperature, "N/A"),
      },
      {
        label: "Priority",
        value:
          lead?.priorityLevel !== undefined && lead?.priorityLevel !== null
            ? `P${lead.priorityLevel}`
            : "N/A",
      },
      {
        label: "Assigned To",
        value: assignedLabel,
      },
    ],
    [assignedLabel, lead],
  );

  const activityItems = useMemo(() => {
    const items = [
      lead?.createdAt
        ? {
            title: "Lead created",
            value: formatDateTime(lead.createdAt),
          }
        : null,
      lead?.assignedAt
        ? {
            title: "Assigned",
            value: `${assignedLabel} on ${formatDateTime(lead.assignedAt)}`,
          }
        : null,
      lead?.nextFollowupDate
        ? {
            title: "Next follow-up",
            value: formatDateTime(lead.nextFollowupDate),
          }
        : null,
      lead?.updatedAt
        ? {
            title: "Last updated",
            value: formatDateTime(lead.updatedAt),
          }
        : null,
    ].filter(Boolean);

    return items as Array<{ title: string; value: string }>;
  }, [assignedLabel, lead]);

  const handleMarkLost = async () => {
    if (!id) return;

    const reason = window.prompt("Closed reason is required for LOST lead status.");
    if (!reason || !reason.trim()) {
      setActionError("Closed reason is required.");
      return;
    }

    setMarkingLost(true);
    setActionError("");
    try {
      await leadsService.markAsLost(id, reason.trim());
      await loadLead(id);
    } catch (markError) {
      setActionError(getApiErrorMessage(markError, "Failed to mark lead as lost."));
    } finally {
      setMarkingLost(false);
    }
  };

  return (
    <main className="flex-1 overflow-y-auto bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-0 sm:py-6 lg:py-8">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <button
              onClick={() => navigate("/leads")}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              aria-label="Back to leads"
              title="Back to Leads"
            >
              <FaArrowLeft className="text-sm" />
            </button>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {leadName}
                </h1>
                <span
                  className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                    statusClasses[normalizeStatus(lead?.status)] ||
                    "bg-gray-50 text-gray-700 border-gray-200"
                  }`}
                >
                  {normalizeStatus(lead?.status)}
                </span>
              </div>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Lead ID: {leadCode}
              </p>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Signed in as: {user?.name ?? user?.email ?? "User"}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                if (id) void loadLead(id);
              }}
              disabled={loading || !id}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              Refresh
            </button>
            <button
              onClick={() => navigate("/quotations/builder")}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              Create Quotation
            </button>
            <button
              onClick={() => navigate("/visa/new")}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              Create Visa Case
            </button>
            <button
              onClick={handleMarkLost}
              disabled={markingLost || normalizeStatus(lead?.status) === "LOST"}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-60"
            >
              {markingLost ? "Updating..." : "Mark Lost"}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
            Loading lead details...
          </div>
        ) : null}

        {error ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {actionError ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {actionError}
          </div>
        ) : null}

        {!loading && !error && !lead ? (
          <div className="rounded-xl border border-gray-200 bg-white px-6 py-10 text-center text-sm text-gray-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
            Lead details are not available.
          </div>
        ) : null}

        {lead ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              {summaryCards.map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900"
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    {item.label}
                  </p>
                  <p className="mt-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="space-y-6 lg:col-span-1">
                <section className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
                  <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-900 dark:text-gray-100">
                      Contact Details
                    </h2>
                  </div>
                  <div className="space-y-4 p-5">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Email</p>
                      <p className="mt-1 text-sm font-medium text-gray-900 dark:text-gray-100">
                        {toText(lead.email)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Phone</p>
                      <p className="mt-1 text-sm font-medium text-gray-900 dark:text-gray-100">
                        {toText(lead.phone)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Address</p>
                      <p className="mt-1 text-sm font-medium text-gray-900 dark:text-gray-100">
                        {toText(lead.addressLine)}
                      </p>
                    </div>
                  </div>
                </section>

                <section className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
                  <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-900 dark:text-gray-100">
                      Assignment & SLA
                    </h2>
                  </div>
                  <div className="space-y-4 p-5">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Assigned User</p>
                      <p className="mt-1 text-sm font-medium text-gray-900 dark:text-gray-100">
                        {assignedLabel}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Assigned At</p>
                      <p className="mt-1 text-sm font-medium text-gray-900 dark:text-gray-100">
                        {formatDateTime(lead.assignedAt)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Response Deadline</p>
                      <p className="mt-1 text-sm font-medium text-gray-900 dark:text-gray-100">
                        {formatDateTime(lead.responseDeadline)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">SLA Breached</p>
                      <p className="mt-1 text-sm font-medium text-gray-900 dark:text-gray-100">
                        {lead.slaBreached ? "Yes" : "No"}
                      </p>
                    </div>
                  </div>
                </section>
              </div>

              <div className="space-y-6 lg:col-span-2">
                <section className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
                  <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-900 dark:text-gray-100">
                      Travel Details
                    </h2>
                  </div>
                  <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Destination</p>
                      <p className="mt-1 text-sm font-medium text-gray-900 dark:text-gray-100">
                        {getDestinationLabel(lead)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Travel Date</p>
                      <p className="mt-1 text-sm font-medium text-gray-900 dark:text-gray-100">
                        {formatDate(lead.travelDate)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Lead Type</p>
                      <p className="mt-1 text-sm font-medium text-gray-900 dark:text-gray-100">
                        {toText(lead.leadType)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Travel Purpose</p>
                      <p className="mt-1 text-sm font-medium text-gray-900 dark:text-gray-100">
                        {toText(lead.travelPurpose)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Budget</p>
                      <p className="mt-1 text-sm font-medium text-gray-900 dark:text-gray-100">
                        {formatCurrency(lead.budget)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Travellers</p>
                      <p className="mt-1 text-sm font-medium text-gray-900 dark:text-gray-100">
                        {`${lead.adultsCount ?? 0} Adults, ${lead.childrenCount ?? 0} Children`}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Visa Required</p>
                      <p className="mt-1 text-sm font-medium text-gray-900 dark:text-gray-100">
                        {lead.visaRequired ? "Yes" : "No"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Source</p>
                      <p className="mt-1 text-sm font-medium text-gray-900 dark:text-gray-100">
                        {toText(lead.source, "Manual")}
                      </p>
                    </div>
                  </div>
                </section>

                <section className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
                  <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-900 dark:text-gray-100">
                      Lead Activity
                    </h2>
                  </div>
                  <div className="p-5">
                    {activityItems.length ? (
                      <div className="space-y-3">
                        {activityItems.map((item) => (
                          <div
                            key={`${item.title}:${item.value}`}
                            className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-950"
                          >
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                              {item.title}
                            </p>
                            <p className="mt-1 text-sm font-medium text-gray-900 dark:text-gray-100">
                              {item.value}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        No activity data is available for this lead yet.
                      </p>
                    )}
                  </div>
                </section>

                <section className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
                  <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-900 dark:text-gray-100">
                      Additional Info
                    </h2>
                  </div>
                  <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Sub Status</p>
                      <p className="mt-1 text-sm font-medium text-gray-900 dark:text-gray-100">
                        {toText(lead.subStatus)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Next Follow-up</p>
                      <p className="mt-1 text-sm font-medium text-gray-900 dark:text-gray-100">
                        {formatDateTime(lead.nextFollowupDate)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Created At</p>
                      <p className="mt-1 text-sm font-medium text-gray-900 dark:text-gray-100">
                        {formatDateTime(lead.createdAt)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Updated At</p>
                      <p className="mt-1 text-sm font-medium text-gray-900 dark:text-gray-100">
                        {formatDateTime(lead.updatedAt)}
                      </p>
                    </div>
                    <div className="sm:col-span-2">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Closed Reason</p>
                      <p className="mt-1 text-sm font-medium text-gray-900 dark:text-gray-100">
                        {toText(lead.closedReason)}
                      </p>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
};

export default LeadDetails;
