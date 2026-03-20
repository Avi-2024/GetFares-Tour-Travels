import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  FaArrowLeft,
  FaCheck,
  FaEnvelope,
  FaEye,
  FaFilePdf,
  FaPaperPlane,
  FaPlus,
  FaXmark,
  FaClockRotateLeft,
} from "react-icons/fa6";
import SurfaceCard from "../../components/ui/SurfaceCard";
import StatusBadge from "../../components/ui/StatusBadge";
import EmptyState from "../../components/ui/EmptyState";
import { quotationsApi } from "../../api/quotations";
import { getApiErrorMessage } from "../../api/apiClient";
import { validateQuoteTransition } from "../../utils/workflowValidation";

type QuoteStatus =
  | "DRAFT"
  | "SENT"
  | "VIEWED"
  | "APPROVED"
  | "REJECTED"
  | "EXPIRED"
  | "PENDING";

type TabId = "components" | "versions" | "logs";

type ComponentRow = {
  id: string;
  itemType: "HOTEL" | "FLIGHT" | "TRANSFER" | "VISA" | "INSURANCE" | "OTHER";
  description: string;
  cost: number;
};

type VersionRow = {
  id: string;
  version: number;
  createdAt: string;
  createdBy: string;
  changes: string;
};

type SendLogRow = {
  id: string;
  sentAt: string;
  sentTo: string;
  method: "email" | "whatsapp" | "manual";
  viewedAt?: string;
  viewCount: number;
};

const tabs: Array<{ id: TabId; label: string }> = [
  { id: "components", label: "Components" },
  { id: "versions", label: "Versions" },
  { id: "logs", label: "Send Logs" },
];

const unwrapData = <T,>(response: unknown): T | null => {
  if (!response) return null;
  if (typeof response === "object" && response && "data" in response) {
    return (response as { data: T }).data ?? null;
  }
  return response as T;
};

const toNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const formatDate = (value?: string | null) => {
  if (!value) return "N/A";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const mapStatus = (value?: string): QuoteStatus => {
  switch (String(value || "").toUpperCase()) {
    case "DRAFT":
      return "DRAFT";
    case "SENT":
      return "SENT";
    case "VIEWED":
      return "VIEWED";
    case "APPROVED":
      return "APPROVED";
    case "REJECTED":
      return "REJECTED";
    case "EXPIRED":
      return "EXPIRED";
    default:
      return "PENDING";
  }
};

const toTs = (value?: string | null) => {
  if (!value) return 0;
  const ts = new Date(value).getTime();
  return Number.isFinite(ts) ? ts : 0;
};

const mapChannel = (value?: string): "email" | "whatsapp" | "manual" => {
  const channel = String(value || "").toUpperCase();
  if (channel === "WHATSAPP") return "whatsapp";
  if (channel === "EMAIL") return "email";
  return "manual";
};

const QuotationDetailPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [quotation, setQuotation] = useState<any | null>(null);
  const [rows, setRows] = useState<ComponentRow[]>([]);
  const [versions, setVersions] = useState<VersionRow[]>([]);
  const [logs, setLogs] = useState<SendLogRow[]>([]);

  const [activeTab, setActiveTab] = useState<TabId>("components");
  const [status, setStatus] = useState<QuoteStatus>("PENDING");
  const [savingStatus, setSavingStatus] = useState(false);
  const [showSendDropdown, setShowSendDropdown] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectError, setRejectError] = useState("");

  const loadDetails = useCallback(async () => {
    if (!id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const [quoteRes, versionsRes, logsRes, viewsRes] = await Promise.allSettled([
        quotationsApi.getById(id),
        quotationsApi.versions(id),
        quotationsApi.sendLogs(id),
        quotationsApi.views(id),
      ]);

      if (quoteRes.status !== "fulfilled") {
        throw quoteRes.reason;
      }

      const quoteData = unwrapData<any>(quoteRes.value);
      if (!quoteData) {
        throw new Error("Quotation not found");
      }

      setQuotation(quoteData);
      setStatus(mapStatus(quoteData.status));

      const itemRows = Array.isArray(quoteData.items)
        ? quoteData.items.map((item: any) => ({
            id: String(item.id ?? `${item.itemType}-${item.description}`),
            itemType: (item.itemType || "OTHER") as ComponentRow["itemType"],
            description: String(item.description || "N/A"),
            cost: toNumber(item.cost, 0),
          }))
        : [];
      setRows(itemRows);

      const versionRowsRaw =
        versionsRes.status === "fulfilled"
          ? unwrapData<any[]>(versionsRes.value) ?? []
          : [];
      const mappedVersions: VersionRow[] = (Array.isArray(versionRowsRaw)
        ? versionRowsRaw
        : []
      ).map((row, index) => ({
        id: String(row.id ?? index),
        version: Number(row.versionNumber ?? row.version ?? index + 1),
        createdAt: String(row.createdAt ?? row.created_at ?? ""),
        createdBy: row.editorId
          ? `User ${String(row.editorId).slice(0, 8)}`
          : "System",
        changes: String(row.action || "Updated"),
      }));
      setVersions(mappedVersions);

      const sendLogsRaw =
        logsRes.status === "fulfilled" ? unwrapData<any[]>(logsRes.value) ?? [] : [];
      const viewRows =
        viewsRes.status === "fulfilled"
          ? (unwrapData<any[]>(viewsRes.value) ?? [])
          : [];

      const mappedLogs: SendLogRow[] = (Array.isArray(sendLogsRaw)
        ? sendLogsRaw
        : []
      ).map((log, index) => {
        const sentAt = String(log.sentAt ?? log.sent_at ?? "");
        const sentTs = toTs(sentAt);
        const matchingViews = (Array.isArray(viewRows) ? viewRows : []).filter((view) => {
          const viewedTs = toTs(view.viewedAt ?? view.viewed_at);
          return sentTs ? viewedTs >= sentTs : viewedTs > 0;
        });
        const lastViewedAt = matchingViews
          .map((view) => String(view.viewedAt ?? view.viewed_at ?? ""))
          .filter(Boolean)
          .sort((a, b) => toTs(b) - toTs(a))[0];

        return {
          id: String(log.id ?? index),
          sentAt,
          sentTo: String(
            log.recipientEmail ?? log.recipient_email ?? log.recipientPhone ?? log.recipient_phone ?? "N/A"
          ),
          method: mapChannel(log.deliveryChannel ?? log.delivery_channel),
          viewedAt: lastViewedAt,
          viewCount: matchingViews.length,
        };
      });

      setLogs(mappedLogs);
    } catch (err) {
      console.error("Failed to load quotation detail:", err);
      setError(getApiErrorMessage(err, "Failed to load quotation details"));
      setQuotation(null);
      setRows([]);
      setVersions([]);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadDetails();
  }, [loadDetails]);

  const lead = quotation?.lead ?? quotation?.relations?.lead ?? null;
  const destination =
    quotation?.destination ??
    quotation?.relations?.destination ??
    quotation?.lead?.destination ??
    null;
  const template = quotation?.template ?? quotation?.relations?.template ?? null;
  const pricing = quotation?.pricing ?? quotation?.relations?.pricing ?? null;
  const booking = quotation?.booking ?? quotation?.relations?.booking ?? null;
  const createdByUser = quotation?.createdByUser ?? quotation?.relations?.createdByUser ?? null;
  const approvedByUser = quotation?.approvedByUser ?? quotation?.relations?.approvedByUser ?? null;
  const sentByUser = quotation?.sentByUser ?? quotation?.relations?.sentByUser ?? null;

  const summary = useMemo(() => {
    const totalCost =
      toNumber(quotation?.totalCost, NaN) ||
      rows.reduce((sum, row) => sum + toNumber(row.cost, 0), 0);
    const marginPercent = toNumber(quotation?.marginPercent, 0);
    const discount = toNumber(quotation?.discount, 0);
    const taxAmount = toNumber(quotation?.taxAmount ?? quotation?.tax, 0);
    const finalPrice = toNumber(
      quotation?.finalPrice ?? quotation?.totalSaleValue,
      totalCost - discount + taxAmount
    );

    return { totalCost, marginPercent, discount, taxAmount, finalPrice };
  }, [quotation, rows]);

  const handleApprove = async () => {
    if (!id) return;
    setSavingStatus(true);
    setError("");
    try {
      await quotationsApi.changeStatus(id, { status: "APPROVED" });
      setStatus("APPROVED");
      await loadDetails();
    } catch (err) {
      console.error("Failed to approve quotation:", err);
      setError(getApiErrorMessage(err, "Failed to approve quotation"));
    } finally {
      setSavingStatus(false);
    }
  };

  const handleRejectConfirm = async () => {
    if (!id) return;
    const validationError = validateQuoteTransition("REJECTED", rejectReason || "");
    if (validationError) {
      setRejectError(validationError);
      return;
    }

    setSavingStatus(true);
    setError("");
    try {
      await quotationsApi.changeStatus(id, {
        status: "REJECTED",
        reason: rejectReason,
      });
      setStatus("REJECTED");
      setShowRejectModal(false);
      setRejectReason("");
      setRejectError("");
      await loadDetails();
    } catch (err) {
      console.error("Failed to reject quotation:", err);
      setRejectError(getApiErrorMessage(err, "Failed to reject quotation"));
    } finally {
      setSavingStatus(false);
    }
  };

  const handleSend = async (method: "email" | "whatsapp") => {
    if (!id) return;

    const recipientEmail = lead?.email || "";
    const recipientPhone = lead?.phone || "";

    if (method === "email" && !recipientEmail) {
      setError("Lead email is missing. Cannot send quotation by email.");
      setShowSendDropdown(false);
      return;
    }

    if (method === "whatsapp" && !recipientPhone) {
      setError("Lead phone is missing. Cannot send quotation by WhatsApp.");
      setShowSendDropdown(false);
      return;
    }

    setSavingStatus(true);
    setError("");
    try {
      await quotationsApi.send(id, {
        channel: method === "email" ? "EMAIL" : "WHATSAPP",
        ...(method === "email" ? { recipientEmail } : { recipientPhone }),
      });
      setShowSendDropdown(false);
      await loadDetails();
    } catch (err) {
      console.error("Failed to send quotation:", err);
      setError(getApiErrorMessage(err, "Failed to send quotation"));
    } finally {
      setSavingStatus(false);
    }
  };

  if (!id) {
    return (
      <EmptyState
        title="Quotation ID missing"
        description="Open this page from quotation list with a valid quotation ID."
        icon={<FaFilePdf className="text-4xl" />}
      />
    );
  }

  if (loading) {
    return <div className="p-4 text-sm text-gray-500">Loading quotation details...</div>;
  }

  if (!quotation) {
    return (
      <EmptyState
        title="Quotation not found"
        description={error || "No quotation found for this ID."}
        icon={<FaFilePdf className="text-4xl" />}
      />
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 px-4 sm:px-0">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate("/quotations")}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                aria-label="Back to quotations"
                title="Back to Quotations"
              >
                <FaArrowLeft className="text-sm" />
              </button>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
                Quotation #{quotation.quoteNumber ?? quotation.id}
              </h1>
            </div>
            <div className="sm:hidden">
              <StatusBadge status={status} />
            </div>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-xs sm:text-sm text-gray-500">
              Created {formatDate(quotation.createdAt)}
            </p>
            <span className="text-gray-300">-</span>
            <p className="text-xs sm:text-sm text-gray-500">
              Last sent {formatDate(quotation.sentAt)}
            </p>
          </div>
          {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="hidden sm:flex">
            <StatusBadge status={status} />
          </div>

          <button className="h-9 px-4 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors inline-flex items-center">
            <FaFilePdf className="mr-2" /> PDF
          </button>

          <div className="relative">
            <button
              onClick={() => setShowSendDropdown((prev) => !prev)}
              className="h-9 px-4 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors inline-flex items-center"
              disabled={savingStatus}
            >
              <FaPaperPlane className="mr-2" /> Send
            </button>

            {showSendDropdown && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowSendDropdown(false)} />
                <div className="absolute right-0 mt-1 w-44 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20 py-1">
                  <button
                    onClick={() => void handleSend("email")}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2"
                  >
                    <FaEnvelope className="text-gray-500" /> Email
                  </button>
                  <button
                    onClick={() => void handleSend("whatsapp")}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2"
                  >
                    <FaPaperPlane className="text-green-500" /> WhatsApp
                  </button>
                </div>
              </>
            )}
          </div>

          <button
            onClick={() => void handleApprove()}
            disabled={savingStatus || status === "APPROVED"}
            className="h-9 px-4 rounded-lg bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60 transition-colors inline-flex items-center"
          >
            <FaCheck className="mr-2" /> Approve
          </button>

          <button
            onClick={() => setShowRejectModal(true)}
            disabled={savingStatus || status === "REJECTED"}
            className="h-9 px-4 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-60 transition-colors inline-flex items-center"
          >
            <FaXmark className="mr-2" /> Reject
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2 sm:gap-4">
        <SurfaceCard className="p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">Total Cost</p>
          <p className="text-xl font-bold mt-1 text-gray-900 dark:text-gray-100">
            ${summary.totalCost.toLocaleString()}
          </p>
        </SurfaceCard>
        <SurfaceCard className="p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">Margin</p>
          <p className="text-xl font-bold mt-1 text-gray-900 dark:text-gray-100">
            {summary.marginPercent}%
          </p>
        </SurfaceCard>
        <SurfaceCard className="p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">Discount</p>
          <p className="text-xl font-bold mt-1 text-gray-900 dark:text-gray-100">
            ${summary.discount.toLocaleString()}
          </p>
        </SurfaceCard>
        <SurfaceCard className="p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">Final Price</p>
          <p className="text-xl font-bold mt-1 text-blue-600 dark:text-blue-400">
            ${summary.finalPrice.toLocaleString()}
          </p>
        </SurfaceCard>
      </div>

      <SurfaceCard className="p-4 sm:p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">Customer</p>
            <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100">
              {lead?.fullName || "N/A"}
            </p>
            <p className="text-xs text-gray-500">{lead?.email || "N/A"}</p>
            <p className="text-xs text-gray-500">{lead?.phone || "N/A"}</p>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">Destination</p>
            <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100">
              {destination?.name || lead?.destinationName || "N/A"}
            </p>
            <p className="text-xs text-gray-500">{destination?.country || "N/A"}</p>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">Template</p>
            <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100">
              {template?.name || quotation.templateSnapshot?.name || "N/A"}
            </p>
            <p className="text-xs text-gray-500">{template?.code || quotation.templateSnapshot?.code || "N/A"}</p>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">Created By</p>
            <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100">
              {createdByUser?.fullName || quotation.createdBy || "N/A"}
            </p>
            <p className="text-xs text-gray-500">{createdByUser?.email || "N/A"}</p>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">Approved By</p>
            <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100">
              {approvedByUser?.fullName || quotation.approvedBy || "N/A"}
            </p>
            <p className="text-xs text-gray-500">{formatDate(quotation.approvedAt)}</p>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">Linked Booking</p>
            <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100">
              {booking?.bookingNumber || "N/A"}
            </p>
            <p className="text-xs text-gray-500">
              {booking ? `${booking.status || "N/A"} / ${booking.paymentStatus || "N/A"}` : "N/A"}
            </p>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">Pricing Reference</p>
            <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100">
              {pricing?.id || quotation.pricingId || "N/A"}
            </p>
            <p className="text-xs text-gray-500">
              Base {pricing ? `$${toNumber(pricing.baseCost, 0).toLocaleString()}` : "N/A"}
            </p>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">Sent By</p>
            <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100">
              {sentByUser?.fullName || quotation.sentBy || "N/A"}
            </p>
            <p className="text-xs text-gray-500">{formatDate(quotation.sentAt)}</p>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">View Count</p>
            <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100">
              {toNumber(quotation.viewCount, 0)}
            </p>
            <p className="text-xs text-gray-500">Last viewed {formatDate(quotation.lastViewedAt)}</p>
          </div>
        </div>
      </SurfaceCard>

      <SurfaceCard className="overflow-hidden border border-gray-200 dark:border-gray-800">
        <div className="border-b border-gray-200 dark:border-gray-800 p-3 sm:p-4">
          <div className="sm:hidden">
            <select
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value as TabId)}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
            >
              {tabs.map((tab) => (
                <option key={tab.id} value={tab.id}>
                  {tab.label}
                </option>
              ))}
            </select>
          </div>

          <div className="hidden sm:flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg w-max">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                  activeTab === tab.id
                    ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4">
          {activeTab === "components" && (
            <div className="space-y-4">
              {rows.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-800">
                        <th className="pb-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                        <th className="pb-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Description</th>
                        <th className="pb-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Cost</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {rows.map((row) => (
                        <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                          <td className="py-3 text-sm text-gray-700 dark:text-gray-300">{row.itemType}</td>
                          <td className="py-3 text-sm text-gray-900 dark:text-gray-100">{row.description}</td>
                          <td className="py-3 text-right text-sm font-medium text-gray-900 dark:text-gray-100">
                            ${row.cost.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState
                  title="No components"
                  description="This quotation has no quotation items."
                  icon={<FaPlus className="text-4xl" />}
                />
              )}
            </div>
          )}

          {activeTab === "versions" && (
            <div className="space-y-3">
              {versions.length ? (
                versions.map((version) => (
                  <div key={version.id} className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                      <FaClockRotateLeft className="text-blue-600 dark:text-blue-400 text-sm" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Version {version.version}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{formatDate(version.createdAt)}</p>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">{version.changes}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">by {version.createdBy}</p>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState
                  title="No version history"
                  description="No version logs found for this quotation."
                  icon={<FaClockRotateLeft className="text-4xl" />}
                />
              )}
            </div>
          )}

          {activeTab === "logs" && (
            <div className="space-y-3">
              {logs.length ? (
                logs.map((log) => (
                  <div key={log.id} className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {log.method === "email" ? (
                          <FaEnvelope className="text-blue-500" />
                        ) : log.method === "whatsapp" ? (
                          <FaPaperPlane className="text-green-500" />
                        ) : (
                          <FaPaperPlane className="text-gray-500" />
                        )}
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          Sent via {log.method}
                        </p>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{formatDate(log.sentAt)}</p>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-300">To: {log.sentTo}</p>
                    {log.viewedAt ? (
                      <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                        <FaEye /> Viewed {log.viewCount} times - Last {formatDate(log.viewedAt)}
                      </p>
                    ) : (
                      <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                        <FaEye /> Not viewed yet
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <EmptyState
                  title="No send logs"
                  description="Send this quotation to start tracking delivery and views."
                  icon={<FaEye className="text-4xl" />}
                />
              )}
            </div>
          )}
        </div>
      </SurfaceCard>

      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Reject Quotation</h3>
              <button onClick={() => setShowRejectModal(false)} className="text-gray-400 hover:text-gray-600">
                <FaXmark className="text-xl" />
              </button>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Please provide a reason for rejection.
            </p>

            <textarea
              value={rejectReason}
              onChange={(e) => {
                setRejectReason(e.target.value);
                setRejectError("");
              }}
              rows={4}
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-red-500 dark:bg-gray-800 dark:text-gray-100 ${
                rejectError ? "border-red-500" : "border-gray-300 dark:border-gray-700"
              }`}
              placeholder="Enter rejection reason..."
            />

            {rejectError ? <p className="mt-2 text-sm text-red-600">{rejectError}</p> : null}

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleRejectConfirm()}
                disabled={savingStatus}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-60 transition-colors"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuotationDetailPage;
