import React, { useEffect, useMemo, useState } from "react";
import {
  FaChartLine,
  FaChevronLeft,
  FaChevronRight,
  FaCopy,
  FaDownload,
  FaEdit,
  FaFacebook,
  FaGoogle,
  FaInstagram,
  FaLinkedin,
  FaPlay,
  FaPlus,
  FaSearch,
  FaTrash,
  FaTwitter,
} from "react-icons/fa";
import { MdAccessTime, MdCheckCircle } from "react-icons/md";
import { campaignsApi } from "../../api/campaigns";
import { reportApiError } from "../../lib/notify";

type CampaignStatus = "ACTIVE" | "COMPLETED" | "DRAFT";

type Campaign = {
  id: string;
  name: string;
  source: string;
  budget: number;
  actualSpend: number;
  leadsGenerated: number;
  revenueGenerated: number;
  metaCampaignId?: string;
  metaAdsetId?: string;
  metaAdId?: string;
  startDate: string;
  endDate: string;
  createdAt?: string;
};

type CampaignPayload = {
  name: string;
  source?: string;
  budget?: number;
  actualSpend?: number;
  leadsGenerated?: number;
  revenueGenerated?: number;
  metaCampaignId?: string;
  metaAdsetId?: string;
  metaAdId?: string;
  startDate?: string;
  endDate?: string;
};

const pageSize = 5;

const sourceOptions = [
  { value: "META", label: "Meta (Facebook/Instagram)" },
  { value: "GOOGLE", label: "Google Ads" },
  { value: "INSTAGRAM", label: "Instagram" },
  { value: "LINKEDIN", label: "LinkedIn" },
  { value: "TWITTER", label: "Twitter/X" },
  { value: "OTHER", label: "Other" },
];

const emptyForm = {
  name: "",
  source: "META",
  budget: "",
  actualSpend: "",
  leadsGenerated: "",
  revenueGenerated: "",
  metaCampaignId: "",
  metaAdsetId: "",
  metaAdId: "",
  startDate: "",
  endDate: "",
};

const toNumber = (value: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatDateValue = (value?: string | null) => {
  if (!value) return "";
  return String(value).slice(0, 10);
};

const normalizeCampaign = (item: any): Campaign => ({
  id: String(item.id),
  name: item.name || "Untitled Campaign",
  source: item.source || "OTHER",
  budget: Number(item.budget || 0),
  actualSpend: Number(item.actualSpend || 0),
  leadsGenerated: Number(item.leadsGenerated || 0),
  revenueGenerated: Number(item.revenueGenerated || 0),
  metaCampaignId: item.metaCampaignId || "",
  metaAdsetId: item.metaAdsetId || "",
  metaAdId: item.metaAdId || "",
  startDate: formatDateValue(item.startDate),
  endDate: formatDateValue(item.endDate),
  createdAt: item.createdAt,
});

const getCampaignStatus = (campaign: Campaign): CampaignStatus => {
  const today = new Date().toISOString().slice(0, 10);
  const hasActivity =
    campaign.actualSpend > 0 ||
    campaign.leadsGenerated > 0 ||
    campaign.revenueGenerated > 0;

  if (campaign.endDate && campaign.endDate < today) {
    return "COMPLETED";
  }

  if (!hasActivity) {
    return "DRAFT";
  }

  return "ACTIVE";
};

const getCampaignRoi = (campaign: Campaign) => {
  if (!campaign.actualSpend || campaign.actualSpend <= 0) {
    return 0;
  }
  return campaign.revenueGenerated / campaign.actualSpend;
};

const getSourceIcon = (source: string) => {
  switch (source) {
    case "META":
      return <FaFacebook className="text-blue-600" />;
    case "GOOGLE":
      return <FaGoogle className="text-blue-500" />;
    case "INSTAGRAM":
      return <FaInstagram className="text-pink-600" />;
    case "LINKEDIN":
      return <FaLinkedin className="text-blue-700" />;
    case "TWITTER":
      return <FaTwitter className="text-sky-500" />;
    default:
      return <FaChartLine className="text-gray-500" />;
  }
};

const getStatusClass = (status: CampaignStatus) => {
  switch (status) {
    case "ACTIVE":
      return "bg-green-100 text-green-700 border-green-200";
    case "COMPLETED":
      return "bg-blue-100 text-blue-700 border-blue-200";
    case "DRAFT":
    default:
      return "bg-gray-100 text-gray-700 border-gray-200";
  }
};

const getStatusIcon = (status: CampaignStatus) => {
  switch (status) {
    case "ACTIVE":
      return <FaPlay className="text-green-600 text-xs" />;
    case "COMPLETED":
      return <MdCheckCircle className="text-blue-600 text-xs" />;
    case "DRAFT":
    default:
      return <MdAccessTime className="text-gray-600 text-xs" />;
  }
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

const formatDisplayDate = (date: string) => {
  if (!date) return "N/A";
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const CampaignsPage: React.FC = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadCampaigns = async () => {
    setLoading(true);
    setError("");
    try {
      const response = (await campaignsApi.list()) as { data?: unknown[] };
      const next = Array.isArray(response?.data)
        ? response.data.map(normalizeCampaign)
        : [];
      setCampaigns(next);
    } catch (err) {
      reportApiError(err, "Failed to load campaigns", setError);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCampaigns();
  }, []);

  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((campaign) => {
      const status = getCampaignStatus(campaign);
      const matchesSearch =
        campaign.name.toLowerCase().includes(search.toLowerCase()) ||
        campaign.source.toLowerCase().includes(search.toLowerCase()) ||
        String(campaign.metaCampaignId || "")
          .toLowerCase()
          .includes(search.toLowerCase());
      const matchesSource =
        sourceFilter === "all" || campaign.source === sourceFilter;
      const matchesStatus =
        statusFilter === "all" || status === statusFilter;
      const matchesDate =
        (!dateRange.start || (campaign.startDate && campaign.startDate >= dateRange.start)) &&
        (!dateRange.end || (campaign.endDate && campaign.endDate <= dateRange.end));

      return matchesSearch && matchesSource && matchesStatus && matchesDate;
    });
  }, [campaigns, search, sourceFilter, statusFilter, dateRange]);

  const totals = useMemo(
    () =>
      filteredCampaigns.reduce(
        (acc, campaign) => ({
          budget: acc.budget + campaign.budget,
          spend: acc.spend + campaign.actualSpend,
          leads: acc.leads + campaign.leadsGenerated,
          revenue: acc.revenue + campaign.revenueGenerated,
        }),
        { budget: 0, spend: 0, leads: 0, revenue: 0 },
      ),
    [filteredCampaigns],
  );

  const totalPages = Math.max(1, Math.ceil(filteredCampaigns.length / pageSize));
  const paginatedCampaigns = filteredCampaigns.slice(
    (page - 1) * pageSize,
    page * pageSize,
  );

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const openCreateModal = () => {
    setEditingCampaign(null);
    setFormData(emptyForm);
    setError("");
    setShowModal(true);
  };

  const openEditModal = (campaign: Campaign) => {
    setEditingCampaign(campaign);
    setFormData({
      name: campaign.name,
      source: campaign.source,
      budget: String(campaign.budget || ""),
      actualSpend: String(campaign.actualSpend || ""),
      leadsGenerated: String(campaign.leadsGenerated || ""),
      revenueGenerated: String(campaign.revenueGenerated || ""),
      metaCampaignId: campaign.metaCampaignId || "",
      metaAdsetId: campaign.metaAdsetId || "",
      metaAdId: campaign.metaAdId || "",
      startDate: campaign.startDate || "",
      endDate: campaign.endDate || "",
    });
    setError("");
    setShowModal(true);
  };

  const buildPayload = (): CampaignPayload => ({
    name: formData.name.trim(),
    source: formData.source,
    budget: toNumber(formData.budget),
    actualSpend: toNumber(formData.actualSpend),
    leadsGenerated: Math.trunc(toNumber(formData.leadsGenerated)),
    revenueGenerated: toNumber(formData.revenueGenerated),
    metaCampaignId: formData.metaCampaignId.trim() || undefined,
    metaAdsetId: formData.metaAdsetId.trim() || undefined,
    metaAdId: formData.metaAdId.trim() || undefined,
    startDate: formData.startDate || undefined,
    endDate: formData.endDate || undefined,
  });

  const validateForm = () => {
    if (!formData.name.trim()) {
      setError("Campaign name is required");
      return false;
    }

    if (formData.startDate && formData.endDate && formData.endDate < formData.startDate) {
      setError("End date must be on or after start date");
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setSaving(true);
    setError("");

    try {
      const payload = buildPayload();

      if (editingCampaign) {
        await campaignsApi.update(editingCampaign.id, payload);
      } else {
        await campaignsApi.create(payload);
      }

      setShowModal(false);
      setEditingCampaign(null);
      await loadCampaigns();
    } catch (err) {
      reportApiError(err, "Failed to save campaign", setError);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this campaign?")) return;

    try {
      await campaignsApi.delete(id);
      await loadCampaigns();
    } catch (err) {
      reportApiError(err, "Failed to delete campaign", setError);
    }
  };

  const handleDuplicate = async (campaign: Campaign) => {
    try {
      const payload: CampaignPayload = {
        name: `${campaign.name} (Copy)`,
        source: campaign.source,
        budget: campaign.budget,
        actualSpend: 0,
        leadsGenerated: 0,
        revenueGenerated: 0,
        metaCampaignId: undefined,
        metaAdsetId: undefined,
        metaAdId: undefined,
        startDate: campaign.startDate || undefined,
        endDate: campaign.endDate || undefined,
      };
      await campaignsApi.create(payload);
      await loadCampaigns();
    } catch (err) {
      reportApiError(err, "Failed to duplicate campaign", setError);
    }
  };

  const handleExport = () => {
    const headers = [
      "Campaign Name",
      "Source",
      "Status",
      "Budget",
      "Actual Spend",
      "Leads Generated",
      "Revenue Generated",
      "Meta Campaign ID",
      "Meta Adset ID",
      "Meta Ad ID",
      "Start Date",
      "End Date",
    ];

    const rows = filteredCampaigns.map((campaign) => [
      campaign.name,
      campaign.source,
      getCampaignStatus(campaign),
      campaign.budget,
      campaign.actualSpend,
      campaign.leadsGenerated,
      campaign.revenueGenerated,
      campaign.metaCampaignId || "",
      campaign.metaAdsetId || "",
      campaign.metaAdId || "",
      campaign.startDate || "",
      campaign.endDate || "",
    ]);

    const csv = [
      headers.join(","),
      ...rows.map((row) =>
        row
          .map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`)
          .join(","),
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "campaigns.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="mb-1 text-sm text-gray-500 dark:text-gray-400">Campaigns</p>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Marketing Campaigns
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Live CRM campaigns data.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleExport}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
            >
              <FaDownload />
              Export
            </button>
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <FaPlus />
              New Campaign
            </button>
          </div>
        </div>

        {error ? (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </div>
        ) : null}

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <p className="mb-1 text-xs uppercase tracking-wide text-gray-500">Total Budget</p>
            <p className="text-2xl font-bold">{formatCurrency(totals.budget)}</p>
            <p className="mt-1 text-xs text-gray-500">
              Across {filteredCampaigns.length} campaigns
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <p className="mb-1 text-xs uppercase tracking-wide text-gray-500">Actual Spend</p>
            <p className="text-2xl font-bold">{formatCurrency(totals.spend)}</p>
            <p className="mt-1 text-xs text-gray-500">
              {totals.budget > 0 ? `${((totals.spend / totals.budget) * 100).toFixed(1)}% of budget` : "No budget"}
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <p className="mb-1 text-xs uppercase tracking-wide text-gray-500">Leads Generated</p>
            <p className="text-2xl font-bold">{totals.leads}</p>
            <p className="mt-1 text-xs text-gray-500">CRM stored count</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <p className="mb-1 text-xs uppercase tracking-wide text-gray-500">Revenue</p>
            <p className="text-2xl font-bold">{formatCurrency(totals.revenue)}</p>
            <p className="mt-1 text-xs text-gray-500">
              {totals.spend > 0 ? `ROI ${((totals.revenue / totals.spend) || 0).toFixed(1)}x` : "No spend yet"}
            </p>
          </div>
        </div>

        <div className="mb-6 rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="border-b border-gray-100 p-4 dark:border-gray-800">
            <div className="flex flex-col gap-4 lg:flex-row">
              <div className="relative flex-1">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400" />
                <input
                  type="text"
                  placeholder="Search campaigns..."
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                  className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-4 text-sm focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-950"
                />
              </div>

              <select
                value={sourceFilter}
                onChange={(event) => {
                  setSourceFilter(event.target.value);
                  setPage(1);
                }}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-950"
              >
                <option value="all">All Sources</option>
                {sourceOptions.map((source) => (
                  <option key={source.value} value={source.value}>
                    {source.label}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value);
                  setPage(1);
                }}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-950"
              >
                <option value="all">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="COMPLETED">Completed</option>
                <option value="DRAFT">Draft</option>
              </select>

              <div className="flex gap-2">
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(event) =>
                    setDateRange((prev) => ({ ...prev, start: event.target.value }))
                  }
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-950"
                />
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(event) =>
                    setDateRange((prev) => ({ ...prev, end: event.target.value }))
                  }
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-950"
                />
              </div>
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center text-sm text-gray-500">Loading campaigns...</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-950/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                        Campaign
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                        Source
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                        Budget / Spend
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                        Leads
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                        Revenue
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                        ROI
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                        Dates
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {paginatedCampaigns.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-6 py-10 text-center text-sm text-gray-500">
                          No campaigns found.
                        </td>
                      </tr>
                    ) : (
                      paginatedCampaigns.map((campaign) => {
                        const status = getCampaignStatus(campaign);
                        const roi = getCampaignRoi(campaign);

                        return (
                          <tr key={campaign.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                            <td className="px-6 py-4">
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {campaign.name}
                              </p>
                              {campaign.metaCampaignId ? (
                                <p className="text-xs text-gray-500">
                                  ID: {campaign.metaCampaignId}
                                </p>
                              ) : null}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                {getSourceIcon(campaign.source)}
                                <span className="text-sm text-gray-700 dark:text-gray-200">
                                  {campaign.source}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {formatCurrency(campaign.budget)}
                              </p>
                              <p className="text-xs text-gray-500">
                                Spent: {formatCurrency(campaign.actualSpend)}
                              </p>
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-sm text-gray-900 dark:text-gray-100">
                                {campaign.leadsGenerated}
                              </p>
                              <p className="text-xs text-gray-500">CRM tracked</p>
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-sm font-medium text-green-600">
                                {formatCurrency(campaign.revenueGenerated)}
                              </p>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-sm font-medium text-blue-600">
                                {roi.toFixed(1)}x
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${getStatusClass(status)}`}
                              >
                                {getStatusIcon(status)}
                                {status}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-xs text-gray-700 dark:text-gray-200">
                                {formatDisplayDate(campaign.startDate)}
                              </p>
                              <p className="text-xs text-gray-500">
                                to {formatDisplayDate(campaign.endDate)}
                              </p>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => openEditModal(campaign)}
                                  className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-blue-50 hover:text-blue-600"
                                  title="Edit"
                                >
                                  <FaEdit />
                                </button>
                                <button
                                  onClick={() => handleDuplicate(campaign)}
                                  className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-green-50 hover:text-green-600"
                                  title="Duplicate"
                                >
                                  <FaCopy />
                                </button>
                                <button
                                  onClick={() => handleDelete(campaign.id)}
                                  className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600"
                                  title="Delete"
                                >
                                  <FaTrash />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4 dark:border-gray-800">
                <p className="text-sm text-gray-500">
                  Showing {filteredCampaigns.length === 0 ? 0 : Math.min(filteredCampaigns.length, (page - 1) * pageSize + 1)}-
                  {Math.min(filteredCampaigns.length, page * pageSize)} of {filteredCampaigns.length}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    disabled={page === 1}
                    className="rounded-lg border border-gray-300 px-3 py-1 text-sm disabled:opacity-50"
                  >
                    <FaChevronLeft />
                  </button>
                  <span className="rounded-lg bg-blue-50 px-3 py-1 text-sm font-medium text-blue-600">
                    {page}
                  </span>
                  <button
                    onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                    disabled={page === totalPages}
                    className="rounded-lg border border-gray-300 px-3 py-1 text-sm disabled:opacity-50"
                  >
                    <FaChevronRight />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {showModal ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-900">
              <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-gray-800">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {editingCampaign ? "Edit Campaign" : "Create Campaign"}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  x
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
                    Campaign Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(event) =>
                      setFormData((prev) => ({ ...prev, name: event.target.value }))
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-950"
                    placeholder="Summer Maldives Campaign"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
                    Source
                  </label>
                  <select
                    value={formData.source}
                    onChange={(event) =>
                      setFormData((prev) => ({ ...prev, source: event.target.value }))
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-950"
                  >
                    {sourceOptions.map((source) => (
                      <option key={source.value} value={source.value}>
                        {source.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
                    Budget
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.budget}
                    onChange={(event) =>
                      setFormData((prev) => ({ ...prev, budget: event.target.value }))
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-950"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
                    Actual Spend
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.actualSpend}
                    onChange={(event) =>
                      setFormData((prev) => ({ ...prev, actualSpend: event.target.value }))
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-950"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
                    Leads Generated
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={formData.leadsGenerated}
                    onChange={(event) =>
                      setFormData((prev) => ({ ...prev, leadsGenerated: event.target.value }))
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-950"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
                    Revenue Generated
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.revenueGenerated}
                    onChange={(event) =>
                      setFormData((prev) => ({ ...prev, revenueGenerated: event.target.value }))
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-950"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
                    Meta Campaign ID
                  </label>
                  <input
                    type="text"
                    value={formData.metaCampaignId}
                    onChange={(event) =>
                      setFormData((prev) => ({ ...prev, metaCampaignId: event.target.value }))
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-950"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
                    Meta Adset ID
                  </label>
                  <input
                    type="text"
                    value={formData.metaAdsetId}
                    onChange={(event) =>
                      setFormData((prev) => ({ ...prev, metaAdsetId: event.target.value }))
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-950"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
                    Meta Ad ID
                  </label>
                  <input
                    type="text"
                    value={formData.metaAdId}
                    onChange={(event) =>
                      setFormData((prev) => ({ ...prev, metaAdId: event.target.value }))
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-950"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(event) =>
                      setFormData((prev) => ({ ...prev, startDate: event.target.value }))
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-950"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(event) =>
                      setFormData((prev) => ({ ...prev, endDate: event.target.value }))
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-950"
                  />
                </div>
              </div>

              {error ? (
                <div className="px-6 pb-4 text-sm text-red-600 dark:text-red-400">
                  {error}
                </div>
              ) : null}

              <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4 dark:border-gray-800">
                <button
                  onClick={() => setShowModal(false)}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={saving}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? "Saving..." : editingCampaign ? "Update Campaign" : "Create Campaign"}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
};

export default CampaignsPage;
