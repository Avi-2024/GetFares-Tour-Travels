import React, { useEffect, useMemo, useState } from "react";
import {
  FaChartLine,
  FaChevronLeft,
  FaChevronRight,
  FaDownload,
  FaFacebook,
  FaGoogle,
  FaInstagram,
  FaLinkedin,
  FaPlay,

  FaSearch,
  FaTwitter,
} from "react-icons/fa";
import { MdAccessTime, MdCheckCircle } from "react-icons/md";
import { campaignsApi } from "../../api/campaigns";
import { reportApiError } from "../../lib/notify";

type CampaignStatus = "ACTIVE" | "COMPLETED" | "DRAFT";

type Campaign = {
  id: string;
  name: string;
  country: string;
  source: string;
  budget: number;
  actualSpend: number;
  leadsGenerated: number;
  revenueGenerated: number;
  revenueCurrency: string;
  metaCampaignId?: string;
  metaAdsetId?: string;
  metaAdId?: string;
  startDate: string;
  endDate: string;
  createdAt?: string;
};

type CampaignPayload = {
  name: string;
  country?: string;
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

type CampaignSummary = {
  campaignsCount: number;
  budget: number;
  actualSpend: number;
  leadsGenerated: number;
  revenueGenerated: number;
  revenueCurrency: string;
};

const pageSize = 5;
const revenueCurrencyOptions = ["AED", "INR"] as const;

const sourceOptions = [
  { value: "META", label: "Meta (Facebook/Instagram)" },
  { value: "GOOGLE", label: "Google Ads" },
  { value: "INSTAGRAM", label: "Instagram" },
  { value: "LINKEDIN", label: "LinkedIn" },
  { value: "TWITTER", label: "Twitter/X" },
  { value: "OTHER", label: "Other" },
];

const countryOptions = [
  { value: "India", label: "India" },
  { value: "UAE", label: "UAE" },
  { value: "Other", label: "Other" },
] as const;

const countryFilterOptions = [
  { value: "all", label: "All" },
  ...countryOptions,
] as const;

const emptyForm = {
  name: "",
  country: "India",
  source: "META",
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

const normalizeCampaignCountry = (value?: unknown) => {
  const normalized = String(value || "").trim();
  if (!normalized) return "Other";
  if (/^india$/i.test(normalized)) return "India";
  if (/^(uae|united arab emirates)$/i.test(normalized)) return "UAE";
  return normalized;
};

const normalizeCampaign = (item: any): Campaign => ({
  id: String(item.id),
  name: item.name || "Untitled Campaign",
  country: normalizeCampaignCountry(item.country),
  source: item.source || "OTHER",
  budget: Number(item.budget || 0),
  actualSpend: Number(item.actualSpend || 0),
  leadsGenerated: Number(item.leadsGenerated || 0),
  revenueGenerated: Number(item.revenueGenerated || 0),
  revenueCurrency: String(item.revenueCurrency || "AED").toUpperCase(),
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

const getRevenueLabel = (campaign: Campaign) => {
  return formatCurrency(campaign.revenueGenerated, campaign.revenueCurrency);
};

const getRoiLabel = (campaign: Campaign) => {
  return `${getCampaignRoi(campaign).toFixed(1)}x`;
};

const getCostPerLead = (campaign: Campaign) => {
  if (!campaign.leadsGenerated || campaign.leadsGenerated <= 0) {
    return 0;
  }
  return campaign.actualSpend / campaign.leadsGenerated;
};

const getCampaignRunDays = (campaign: Campaign) => {
  const startSource = campaign.startDate || campaign.createdAt;
  if (!startSource) {
    return 0;
  }

  const start = new Date(startSource);
  const end = campaign.endDate ? new Date(campaign.endDate) : new Date();
  const diff = end.getTime() - start.getTime();

  if (Number.isNaN(diff) || diff < 0) {
    return 0;
  }

  return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
};

const getAvgDailySpend = (campaign: Campaign) => {
  const runDays = getCampaignRunDays(campaign);
  if (!runDays) {
    return 0;
  }
  return campaign.actualSpend / runDays;
};

const getAvgDailyLeads = (campaign: Campaign) => {
  const runDays = getCampaignRunDays(campaign);
  if (!runDays) {
    return 0;
  }
  return campaign.leadsGenerated / runDays;
};

const getDisplayMetricId = (value?: string) => value || "0";

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

const getCountryClass = (country: string) => {
  switch (normalizeCampaignCountry(country)) {
    case "India":
      return "bg-amber-100 text-amber-700 border-amber-200";
    case "UAE":
      return "bg-emerald-100 text-emerald-700 border-emerald-200";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
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

const formatCurrency = (amount: number, currency = "INR") =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
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

const emptySummary: CampaignSummary = {
  campaignsCount: 0,
  budget: 0,
  actualSpend: 0,
  leadsGenerated: 0,
  revenueGenerated: 0,
  revenueCurrency: "AED",
};

const CampaignsPage: React.FC = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [search, setSearch] = useState("");
  const [countryFilter, setCountryFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [selectedCampaignId, setSelectedCampaignId] = useState("");
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [summary, setSummary] = useState<CampaignSummary>(emptySummary);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedRevenueCurrency, setSelectedRevenueCurrency] = useState("INR");
  

  const loadCampaigns = async () => {
    setLoading(true);
    setError("");
    try {
      const response = (await campaignsApi.list({
        targetCurrency: selectedRevenueCurrency,
      })) as { data?: unknown[] };
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
  }, [selectedRevenueCurrency]);

  const summaryFilters = useMemo(
    () => ({
      ...(search.trim() ? { search: search.trim() } : {}),
      ...(countryFilter !== "all" ? { country: countryFilter } : {}),
      ...(sourceFilter !== "all" ? { source: sourceFilter } : {}),
      ...(statusFilter !== "all" ? { status: statusFilter } : {}),
      targetCurrency: selectedRevenueCurrency,
      ...(dateRange.start ? { startDate: dateRange.start } : {}),
      ...(dateRange.end ? { endDate: dateRange.end } : {}),
    }),
    [countryFilter, dateRange.end, dateRange.start, search, selectedRevenueCurrency, sourceFilter, statusFilter],
  );

  useEffect(() => {
    let cancelled = false;

    const loadSummary = async () => {
      setSummaryLoading(true);
      try {
        const response = (await campaignsApi.summary(summaryFilters)) as {
          data?: Partial<CampaignSummary>;
        };

        if (cancelled) {
          return;
        }

        setSummary({
          campaignsCount: Number(response?.data?.campaignsCount || 0),
          budget: Number(response?.data?.budget || 0),
          actualSpend: Number(response?.data?.actualSpend || 0),
          leadsGenerated: Number(response?.data?.leadsGenerated || 0),
          revenueGenerated: Number(response?.data?.revenueGenerated || 0),
          revenueCurrency: String(response?.data?.revenueCurrency || "AED").toUpperCase(),
        });
      } catch (err) {
        if (!cancelled) {
          setSummary(emptySummary);
          reportApiError(err, "Failed to load campaign summary");
        }
      } finally {
        if (!cancelled) {
          setSummaryLoading(false);
        }
      }
    };

    void loadSummary();

    return () => {
      cancelled = true;
    };
  }, [summaryFilters]);

  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((campaign) => {
      const status = getCampaignStatus(campaign);
      const matchesSearch =
        campaign.name.toLowerCase().includes(search.toLowerCase()) ||
        campaign.country.toLowerCase().includes(search.toLowerCase()) ||
        campaign.source.toLowerCase().includes(search.toLowerCase()) ||
        String(campaign.metaCampaignId || "")
          .toLowerCase()
          .includes(search.toLowerCase());
      const matchesCountry =
        countryFilter === "all" ||
        normalizeCampaignCountry(campaign.country) === countryFilter;
      const matchesSource =
        sourceFilter === "all" || campaign.source === sourceFilter;
      const matchesStatus =
        statusFilter === "all" || status === statusFilter;
      const matchesDate =
        (!dateRange.start || (campaign.startDate && campaign.startDate >= dateRange.start)) &&
        (!dateRange.end || (campaign.endDate && campaign.endDate <= dateRange.end));

      return (
        matchesSearch &&
        matchesCountry &&
        matchesSource &&
        matchesStatus &&
        matchesDate
      );
    });
  }, [campaigns, countryFilter, search, sourceFilter, statusFilter, dateRange]);

  const sortedCampaigns = useMemo(
    () =>
      [...filteredCampaigns].sort((left, right) => {
        const countryCompare = normalizeCampaignCountry(left.country).localeCompare(
          normalizeCampaignCountry(right.country),
        );
        if (countryCompare !== 0) return countryCompare;
        return left.name.localeCompare(right.name);
      }),
    [filteredCampaigns],
  );

  const countryCounts = useMemo(
    () =>
      campaigns.reduce(
        (acc, campaign) => {
          const normalized = normalizeCampaignCountry(campaign.country);
          acc[normalized] = (acc[normalized] || 0) + 1;
          return acc;
        },
        { India: 0, UAE: 0, Other: 0 } as Record<string, number>,
      ),
    [campaigns],
  );

  const totalPages = Math.max(1, Math.ceil(sortedCampaigns.length / pageSize));
  const paginatedCampaigns = sortedCampaigns.slice(
    (page - 1) * pageSize,
    page * pageSize,
  );

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  useEffect(() => {
    if (!sortedCampaigns.length) {
      setSelectedCampaignId("");
      return;
    }

    setSelectedCampaignId((current) => {
      if (current && sortedCampaigns.some((campaign) => campaign.id === current)) {
        return current;
      }
      return sortedCampaigns[0].id;
    });
  }, [sortedCampaigns]);

  const selectedCampaign = useMemo(
    () => sortedCampaigns.find((campaign) => campaign.id === selectedCampaignId) || null,
    [selectedCampaignId, sortedCampaigns],
  );

 

  const handleSelectCampaign = (campaignId: string) => {
    setSelectedCampaignId(campaignId);
    setShowDetailsModal(true);
  };

  const buildPayload = (): CampaignPayload => ({
    name: formData.name.trim(),
    country: normalizeCampaignCountry(formData.country),
    source: formData.source,
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

    if (!formData.country.trim()) {
      setError("Campaign country is required");
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
      await campaignsApi.create(payload);
      setShowModal(false);
      await loadCampaigns();
    } catch (err) {
      reportApiError(err, "Failed to save campaign", setError);
    } finally {
      setSaving(false);
    }
  };

  const handleExport = () => {
    const headers = [
      "Campaign Name",
      "Country",
      "Source",
      "Status",
      "Actual Spend",
      "Meta Leads",
      "CRM Revenue",
      "Meta Campaign ID",
      "Meta Adset ID",
      "Meta Ad ID",
      "Start Date",
      "End Date",
    ];

    const rows = filteredCampaigns.map((campaign) => [
      campaign.name,
      campaign.country,
      campaign.source,
      getCampaignStatus(campaign),
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
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.18),_transparent_35%),linear-gradient(135deg,#ffffff_0%,#f8fbff_45%,#eef4ff_100%)] p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)] dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
            <div className="max-w-2xl">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
                Campaigns Overview
              </p>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">
                Marketing Campaigns
              </h1>
              <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                Cleaner Meta dashboard. Click row for full campaign context.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/90 px-3 py-2 text-sm font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
                <span>CRM Currency</span>
                <select
                  value={selectedRevenueCurrency}
                  onChange={(event) => setSelectedRevenueCurrency(event.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                >
                  {revenueCurrencyOptions.map((currency) => (
                    <option key={currency} value={currency}>
                      {currency}
                    </option>
                  ))}
                </select>
              </label>
              <button
                onClick={handleExport}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/90 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-white dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
              >
                <FaDownload />
                Export
              </button>
              {/* <button
                onClick={openCreateModal}
                className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-500"
              >
                <FaPlus />
                New Campaign
              </button> */}
            </div>
          </div>

          {error ? (
            <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
              {error}
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[24px] border border-white/70 bg-white/85 p-5 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-950">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Meta Spend</p>
              <p className="text-3xl font-semibold text-slate-950 dark:text-white">{formatCurrency(summary.actualSpend)}</p>
              <p className="mt-2 text-sm text-slate-500">
                {summaryLoading ? "Refreshing totals" : `${summary.campaignsCount} campaigns tracked`}
              </p>
            </div>
            <div className="rounded-[24px] border border-white/70 bg-white/85 p-5 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-950">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Meta Leads</p>
              <p className="text-3xl font-semibold text-slate-950 dark:text-white">{summary.leadsGenerated}</p>
              <p className="mt-2 text-sm text-slate-500">
                Live Meta lead volume
              </p>
            </div>
            <div className="rounded-[24px] border border-white/70 bg-white/85 p-5 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-950">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{`CRM Revenue (${summary.revenueCurrency})`}</p>
              <p className="text-3xl font-semibold text-slate-950 dark:text-white">{formatCurrency(summary.revenueGenerated, summary.revenueCurrency)}</p>
              <p className="mt-2 text-sm text-slate-500">{`Booking revenue in ${summary.revenueCurrency}`}</p>
            </div>
            <div className="rounded-[24px] border border-white/70 bg-white/85 p-5 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-950">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{`Avg Revenue Per Lead (${summary.revenueCurrency})`}</p>
              <p className="text-3xl font-semibold text-slate-950 dark:text-white">
                {formatCurrency(
                  summary.leadsGenerated > 0
                    ? summary.revenueGenerated / summary.leadsGenerated
                    : 0,
                  summary.revenueCurrency,
                )}
              </p>
              <p className="mt-2 text-sm text-slate-500">
                {`Lead value in ${summary.revenueCurrency}`}
              </p>
            </div>
          </div>
        </section>

      

        <div className="mb-6 rounded-[28px] border border-slate-200 bg-white shadow-[0_12px_30px_rgba(15,23,42,0.05)] dark:border-slate-800 dark:bg-slate-900">
	          <div className="border-b border-gray-100 p-4 dark:border-gray-800">
	            <div className="flex flex-col gap-4">
	              <div className="flex flex-wrap gap-2">
	                {countryFilterOptions.map((option) => {
	                  const count =
	                    option.value === "all" ?
	                      campaigns.length
	                    : countryCounts[option.value] || 0;
	                  const active = countryFilter === option.value;
	                  return (
	                    <button
	                      key={option.value}
	                      onClick={() => {
	                        setCountryFilter(option.value);
	                        setPage(1);
	                      }}
	                      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
	                        active ?
	                          "border-blue-200 bg-blue-50 text-blue-700"
	                        : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-300 dark:hover:bg-gray-800"
	                      }`}
	                    >
	                      <span>{option.label}</span>
	                      <span className="rounded-full bg-black/5 px-2 py-0.5 text-xs dark:bg-white/10">
	                        {count}
	                      </span>
	                    </button>
	                  );
	                })}
	              </div>
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
	                        Country
	                      </th>
	                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
	                        Source
	                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                         Spend
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                        Meta Leads
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                        CRM Revenue
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
		                      paginatedCampaigns.map((campaign, index) => {
		                        const status = getCampaignStatus(campaign);
		                        const normalizedCountry = normalizeCampaignCountry(campaign.country);
	                        const previousCountry =
	                          index > 0 ?
	                            normalizeCampaignCountry(paginatedCampaigns[index - 1].country)
	                          : null;
	                        const showCountryDivider = normalizedCountry !== previousCountry;

		                        return (
		                          <React.Fragment key={campaign.id}>
		                            {showCountryDivider ? (
		                              <tr className="bg-gray-50/80 dark:bg-gray-950/80">
		                                <td colSpan={9} className="px-6 py-3">
		                                  <div className="flex items-center justify-between gap-3">
	                                    <div className="flex items-center gap-3">
	                                      <span
	                                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${getCountryClass(normalizedCountry)}`}
	                                      >
	                                        {normalizedCountry}
	                                      </span>
	                                      <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
	                                        {normalizedCountry} Campaigns
	                                      </span>
	                                    </div>
	                                  </div>
	                                </td>
	                              </tr>
	                            ) : null}
		                            <tr
                                  onClick={() => handleSelectCampaign(campaign.id)}
                                  onKeyDown={(event) => {
                                    if (event.key === "Enter" || event.key === " ") {
                                      event.preventDefault();
                                      handleSelectCampaign(campaign.id);
                                    }
                                  }}
                                  tabIndex={0}
                                  role="button"
                                  aria-pressed={selectedCampaignId === campaign.id}
                                  className={`cursor-pointer transition hover:bg-blue-50/60 dark:hover:bg-slate-800/60 ${
                                    selectedCampaignId === campaign.id ? "bg-blue-50/70 dark:bg-slate-800/70" : ""
                                  }`}
                                >
		                              <td className="px-6 py-4">
		                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
		                                  {campaign.name}
		                                </p>
                                        <p className="mt-1 text-xs font-medium text-blue-600">
                                          Click for details
                                        </p>
		                                {campaign.metaCampaignId ? (
		                                  <p className="text-xs text-gray-500">
		                                    ID: {campaign.metaCampaignId}
	                                  </p>
	                                ) : null}
	                              </td>
	                              <td className="px-6 py-4">
	                                <span
	                                  className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${getCountryClass(campaign.country)}`}
	                                >
	                                  {campaign.country}
	                                </span>
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
	                                  {formatCurrency(campaign.actualSpend)}
	                                </p>
	                               
	                              </td>
		                              <td className="px-6 py-4">
		                                <p className="text-sm text-gray-900 dark:text-gray-100">
		                                  {campaign.leadsGenerated}
		                                </p>
		                                <p className="text-xs text-gray-500">Meta tracked</p>
		                              </td>
		                              <td className="px-6 py-4">
		                                <p className="text-sm font-medium text-green-600">
		                                  {getRevenueLabel(campaign)}
		                                </p>
		                                <p className="text-xs text-gray-500">{`CRM revenue ${campaign.revenueCurrency}`}</p>
		                              </td>
		                              <td className="px-6 py-4">
		                                <span className="text-sm font-medium text-blue-600">
		                                  {getRoiLabel(campaign)}
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
		                            </tr>
	                          </React.Fragment>
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

        {showDetailsModal && selectedCampaign ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
            <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-[28px] border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5 dark:border-slate-800">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Campaign Details</p>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">{selectedCampaign.name}</h2>
                </div>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="rounded-full border border-slate-200 px-3 py-1 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Close
                </button>
              </div>

              <div className="space-y-6 p-6">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${getCountryClass(selectedCampaign.country)}`}>
                    {selectedCampaign.country}
                  </span>
                  <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClass(getCampaignStatus(selectedCampaign))}`}>
                    {getStatusIcon(getCampaignStatus(selectedCampaign))}
                    {getCampaignStatus(selectedCampaign)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
                  <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950">
                    <p className="text-xs uppercase tracking-wide text-slate-400">Meta Spend</p>
                    <p className="mt-2 text-xl font-semibold text-slate-950 dark:text-white">{formatCurrency(selectedCampaign.actualSpend)}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950">
                    <p className="text-xs uppercase tracking-wide text-slate-400">Meta Leads</p>
                    <p className="mt-2 text-xl font-semibold text-slate-950 dark:text-white">{selectedCampaign.leadsGenerated}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950">
                    <p className="text-xs uppercase tracking-wide text-slate-400">{`CRM Revenue (${selectedCampaign.revenueCurrency})`}</p>
                    <p className="mt-2 text-xl font-semibold text-emerald-600">{getRevenueLabel(selectedCampaign)}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950">
                    <p className="text-xs uppercase tracking-wide text-slate-400">ROI</p>
                    <p className="mt-2 text-xl font-semibold text-blue-600">{getRoiLabel(selectedCampaign)}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950">
                    <p className="text-xs uppercase tracking-wide text-slate-400">Cost Per Lead</p>
                    <p className="mt-2 text-xl font-semibold text-slate-950 dark:text-white">{formatCurrency(getCostPerLead(selectedCampaign))}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950">
                    <p className="text-xs uppercase tracking-wide text-slate-400">Run Days</p>
                    <p className="mt-2 text-xl font-semibold text-slate-950 dark:text-white">{getCampaignRunDays(selectedCampaign)}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950">
                    <p className="text-xs uppercase tracking-wide text-slate-400">Daily Spend</p>
                    <p className="mt-2 text-xl font-semibold text-slate-950 dark:text-white">{formatCurrency(getAvgDailySpend(selectedCampaign))}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950">
                    <p className="text-xs uppercase tracking-wide text-slate-400">Daily Leads</p>
                    <p className="mt-2 text-xl font-semibold text-slate-950 dark:text-white">{getAvgDailyLeads(selectedCampaign).toFixed(1)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                    <p className="text-xs uppercase tracking-wide text-slate-400">Meta Campaign ID</p>
                    <p className="mt-2 break-all text-sm font-medium text-slate-950 dark:text-white">
                      {getDisplayMetricId(selectedCampaign.metaCampaignId)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                    <p className="text-xs uppercase tracking-wide text-slate-400">Source</p>
                    <div className="mt-2 flex items-center gap-2 text-sm font-medium text-slate-950 dark:text-white">
                      {getSourceIcon(selectedCampaign.source)}
                      <span>{selectedCampaign.source}</span>
                    </div>
                  </div>
               
               
                  <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                    <p className="text-xs uppercase tracking-wide text-slate-400">Start Date</p>
                    <p className="mt-2 text-sm font-medium text-slate-950 dark:text-white">{formatDisplayDate(selectedCampaign.startDate)}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                    <p className="text-xs uppercase tracking-wide text-slate-400">End Date</p>
                    <p className="mt-2 text-sm font-medium text-slate-950 dark:text-white">{formatDisplayDate(selectedCampaign.endDate)}</p>
                  </div>
               
             
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {showModal ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-900">
	              <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-gray-800">
	                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
	                  Create Campaign
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
	                    Country
	                  </label>
	                  <select
	                    value={formData.country}
	                    onChange={(event) =>
	                      setFormData((prev) => ({ ...prev, country: event.target.value }))
	                    }
	                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-950"
	                  >
	                    {countryOptions.map((country) => (
	                      <option key={country.value} value={country.value}>
	                        {country.label}
	                      </option>
	                    ))}
	                  </select>
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
	                    Meta Spend
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
	                    Meta Leads
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
	                    CRM Revenue
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
	                  {saving ? "Saving..." : "Create Campaign"}
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
