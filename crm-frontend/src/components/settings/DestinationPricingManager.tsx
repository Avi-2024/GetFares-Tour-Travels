import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FaCheckCircle,
  FaDollarSign,
  FaGlobe,
  FaMapMarkerAlt,
  FaPlus,
  FaSearch,
  FaSyncAlt,
} from "react-icons/fa";
import {
  destinationsApi,
  type DestinationPricingRecord,
  type DestinationRecord,
} from "../../api/destinations";
import { getApiErrorMessage } from "../../api/apiClient";
import EmptyState from "../ui/EmptyState";
import SurfaceCard from "../ui/SurfaceCard";

type DestinationPricingManagerProps = {
  canReadSettings: boolean;
  canUpdateSettings: boolean;
};

type DestinationDraft = {
  name: string;
  country: string;
  isActive: boolean;
};

type PricingDraft = {
  baseCost: string;
  minProfitPercent: string;
  recommendedProfitPercent: string;
  taxPercent: string;
  validFrom: string;
  validTo: string;
};

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const extractRows = <T,>(response: unknown): T[] => {
  const payload = response as { data?: T[] | { data?: T[]; items?: T[] } };
  if (Array.isArray(payload?.data)) return payload.data;
  const nested = payload?.data as { data?: T[]; items?: T[] } | undefined;
  if (Array.isArray(nested?.data)) return nested.data;
  if (Array.isArray(nested?.items)) return nested.items;
  return Array.isArray(response) ? (response as T[]) : [];
};

const toPricingDraft = (item: DestinationPricingRecord): PricingDraft => ({
  baseCost: String(item.baseCost ?? 0),
  minProfitPercent: String(item.minProfitPercent ?? 0),
  recommendedProfitPercent:
    (
      item.recommendedProfitPercent !== null &&
      item.recommendedProfitPercent !== undefined
    ) ?
      String(item.recommendedProfitPercent)
    : "",
  taxPercent: String(item.taxPercent ?? 0),
  validFrom: item.validFrom ?? "",
  validTo: item.validTo ?? "",
});

const buildDestinationDraft = (
  item?: DestinationRecord | null,
): DestinationDraft => ({
  name: item?.name || "",
  country: item?.country || "",
  isActive: item?.isActive !== false,
});

const formatCurrency = (value?: number | null) =>
  currencyFormatter.format(Number(value ?? 0));

const formatDate = (value?: string | null) => {
  if (!value) return "Open-ended";
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return value;
  return new Date(timestamp).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const getPricingSortTime = (item: DestinationPricingRecord) => {
  const timestamp = Date.parse(item.validFrom ?? item.createdAt ?? "");
  return Number.isNaN(timestamp) ? 0 : timestamp;
};

const calculateSellingPrice = (
  baseCost: number,
  profitPercent: number,
  taxPercent: number,
) => {
  const subtotal = baseCost * (1 + profitPercent / 100);
  return subtotal * (1 + taxPercent / 100);
};

const DestinationPricingManager: React.FC<DestinationPricingManagerProps> = ({
  canReadSettings,
  canUpdateSettings,
}) => {
  const [destinations, setDestinations] = useState<DestinationRecord[]>([]);
  const [loadingDestinations, setLoadingDestinations] = useState(false);
  const [selectedDestinationId, setSelectedDestinationId] = useState("");
  const [destinationDrafts, setDestinationDrafts] = useState<
    Record<string, DestinationDraft>
  >({});
  const [pricingRows, setPricingRows] = useState<DestinationPricingRecord[]>(
    [],
  );
  const [pricingDrafts, setPricingDrafts] = useState<
    Record<string, PricingDraft>
  >({});
  const [loadingPricing, setLoadingPricing] = useState(false);
  const [savingDestinationId, setSavingDestinationId] = useState("");
  const [savingPricingId, setSavingPricingId] = useState("");
  const [creatingDestination, setCreatingDestination] = useState(false);
  const [creatingPricing, setCreatingPricing] = useState(false);
  const [deletingDestinationId, setDeletingDestinationId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false);

  const [newDestination, setNewDestination] = useState({
    name: "",
    country: "",
    isActive: true,
  });

  const [newPricing, setNewPricing] = useState<PricingDraft>({
    baseCost: "",
    minProfitPercent: "",
    recommendedProfitPercent: "",
    taxPercent: "0",
    validFrom: "",
    validTo: "",
  });

  const selectedDestination = useMemo(
    () =>
      destinations.find((item) => item.id === selectedDestinationId) ?? null,
    [destinations, selectedDestinationId],
  );

  const selectedDestinationDraft = useMemo(() => {
    if (!selectedDestinationId) return null;
    return (
      destinationDrafts[selectedDestinationId] ??
      buildDestinationDraft(selectedDestination)
    );
  }, [destinationDrafts, selectedDestination, selectedDestinationId]);

  const visibleDestinations = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = destinations.filter((item) => {
      if (!query) return true;
      const name = String(item.name || "").toLowerCase();
      const country = String(item.country || "").toLowerCase();
      return name.includes(query) || country.includes(query);
    });

    return filtered.sort((left, right) => {
      if (left.id === selectedDestinationId) return -1;
      if (right.id === selectedDestinationId) return 1;
      return left.name.localeCompare(right.name);
    });
  }, [destinations, search, selectedDestinationId]);

  const pricingHistory = useMemo(
    () =>
      [...pricingRows].sort(
        (left, right) => getPricingSortTime(right) - getPricingSortTime(left),
      ),
    [pricingRows],
  );

  const destinationStats = useMemo(() => {
    const total = destinations.length;
    const active = destinations.filter(
      (item) => item.isActive !== false,
    ).length;
    return { total, active, inactive: total - active };
  }, [destinations]);

  const selectedCurrentPricing =
    pricingHistory[0] ?? selectedDestination?.currentPricing;

  const newPricingPreview = useMemo(() => {
    const baseCost = Number(newPricing.baseCost);
    const minProfitPercent = Number(newPricing.minProfitPercent);
    const recommendedProfitPercent =
      newPricing.recommendedProfitPercent ?
        Number(newPricing.recommendedProfitPercent)
      : minProfitPercent;
    const taxPercent = Number(newPricing.taxPercent || 0);

    if (
      !Number.isFinite(baseCost) ||
      baseCost < 0 ||
      !Number.isFinite(minProfitPercent) ||
      minProfitPercent < 0 ||
      !Number.isFinite(recommendedProfitPercent) ||
      recommendedProfitPercent < 0 ||
      !Number.isFinite(taxPercent) ||
      taxPercent < 0
    ) {
      return null;
    }

    return {
      minimum: calculateSellingPrice(baseCost, minProfitPercent, taxPercent),
      recommended: calculateSellingPrice(
        baseCost,
        recommendedProfitPercent,
        taxPercent,
      ),
    };
  }, [
    newPricing.baseCost,
    newPricing.minProfitPercent,
    newPricing.recommendedProfitPercent,
    newPricing.taxPercent,
  ]);

  const loadDestinations = useCallback(async () => {
    if (!canReadSettings) {
      setDestinations([]);
      setSelectedDestinationId("");
      return;
    }

    setLoadingDestinations(true);
    setError("");
    try {
      const response = await destinationsApi.list({
        isActive: showInactive ? undefined : true,
      });
      const rows = extractRows<DestinationRecord>(response);
      setDestinations(rows);
      setDestinationDrafts(
        Object.fromEntries(
          rows.map((item) => [item.id, buildDestinationDraft(item)]),
        ),
      );
      setSelectedDestinationId((previous) =>
        previous && rows.some((item) => item.id === previous) ?
          previous
        : (rows[0]?.id ?? ""),
      );
    } catch (e) {
      setDestinations([]);
      setError(getApiErrorMessage(e, "Unable to load destinations"));
    } finally {
      setLoadingDestinations(false);
    }
  }, [canReadSettings, showInactive]);

  const loadPricing = useCallback(async (destinationId: string) => {
    if (!destinationId) {
      setPricingRows([]);
      setPricingDrafts({});
      return;
    }

    setLoadingPricing(true);
    setError("");
    try {
      const response = await destinationsApi.listPricing(destinationId);
      const rows = extractRows<DestinationPricingRecord>(response);
      setPricingRows(rows);
      setPricingDrafts(
        Object.fromEntries(rows.map((item) => [item.id, toPricingDraft(item)])),
      );
    } catch (e) {
      setPricingRows([]);
      setPricingDrafts({});
      setError(getApiErrorMessage(e, "Unable to load destination pricing"));
    } finally {
      setLoadingPricing(false);
    }
  }, []);

  useEffect(() => {
    void loadDestinations();
  }, [loadDestinations]);

  useEffect(() => {
    void loadPricing(selectedDestinationId);
  }, [loadPricing, selectedDestinationId]);

  const updateDestinationDraft = (
    destinationId: string,
    patch: Partial<DestinationDraft>,
  ) => {
    const source = destinations.find((item) => item.id === destinationId);
    setDestinationDrafts((previous) => ({
      ...previous,
      [destinationId]: {
        ...buildDestinationDraft(source),
        ...previous[destinationId],
        ...patch,
      },
    }));
  };

  const onCreateDestination = async () => {
    if (!canUpdateSettings) {
      setError("You do not have permission to create destinations.");
      return;
    }

    const name = newDestination.name.trim();
    if (name.length < 2) {
      setError("Destination name must be at least 2 characters.");
      return;
    }

    setCreatingDestination(true);
    setError("");
    setMessage("");
    try {
      await destinationsApi.create({
        name,
        country: newDestination.country.trim() || undefined,
        isActive: newDestination.isActive,
      });
      setNewDestination({ name: "", country: "", isActive: true });
      setMessage("Destination created.");
      await loadDestinations();
    } catch (e) {
      setError(getApiErrorMessage(e, "Unable to create destination"));
    } finally {
      setCreatingDestination(false);
    }
  };

  const onSaveDestination = async (destinationId: string) => {
    if (!canUpdateSettings) {
      setError("You do not have permission to update destinations.");
      return;
    }

    const draft = destinationDrafts[destinationId];
    if (!draft) return;

    if (!draft.name.trim()) {
      setError("Destination name is required.");
      return;
    }

    setSavingDestinationId(destinationId);
    setError("");
    setMessage("");
    try {
      await destinationsApi.update(destinationId, {
        name: draft.name.trim(),
        country: draft.country.trim() || undefined,
        isActive: draft.isActive,
      });
      setMessage("Destination updated.");
      await loadDestinations();
    } catch (e) {
      setError(getApiErrorMessage(e, "Unable to update destination"));
    } finally {
      setSavingDestinationId("");
    }
  };

  const onRemoveDestination = async (destination: DestinationRecord) => {
    if (!canUpdateSettings) {
      setError("You do not have permission to delete destinations.");
      return;
    }

    const confirmed = window.confirm(
      `Delete ${destination.name}? This will remove it from the active destination list.`,
    );
    if (!confirmed) return;

    setDeletingDestinationId(destination.id);
    setError("");
    setMessage("");
    try {
      await destinationsApi.remove(destination.id);
      setMessage("Destination deleted.");
      if (selectedDestinationId === destination.id) {
        setSelectedDestinationId("");
        setPricingRows([]);
        setPricingDrafts({});
      }
      await loadDestinations();
    } catch (e) {
      setError(getApiErrorMessage(e, "Unable to delete destination"));
    } finally {
      setDeletingDestinationId("");
    }
  };

  const onCreatePricing = async () => {
    if (!canUpdateSettings) {
      setError("You do not have permission to create pricing.");
      return;
    }
    if (!selectedDestinationId) {
      setError("Select a destination first.");
      return;
    }

    const baseCost = Number(newPricing.baseCost);
    const minProfitPercent = Number(newPricing.minProfitPercent);
    if (!Number.isFinite(baseCost) || baseCost < 0) {
      setError("Base cost must be a valid non-negative number.");
      return;
    }
    if (
      !Number.isFinite(minProfitPercent) ||
      minProfitPercent < 0 ||
      minProfitPercent > 100
    ) {
      setError("Min profit % must be between 0 and 100.");
      return;
    }

    setCreatingPricing(true);
    setError("");
    setMessage("");
    try {
      await destinationsApi.createPricing(selectedDestinationId, {
        baseCost,
        minProfitPercent,
        recommendedProfitPercent:
          newPricing.recommendedProfitPercent ?
            Number(newPricing.recommendedProfitPercent)
          : undefined,
        taxPercent: newPricing.taxPercent ? Number(newPricing.taxPercent) : 0,
        validFrom: newPricing.validFrom || undefined,
        validTo: newPricing.validTo || undefined,
      });
      setNewPricing({
        baseCost: "",
        minProfitPercent: "",
        recommendedProfitPercent: "",
        taxPercent: "0",
        validFrom: "",
        validTo: "",
      });
      setMessage("Destination pricing created.");
      await loadPricing(selectedDestinationId);
      await loadDestinations();
    } catch (e) {
      setError(getApiErrorMessage(e, "Unable to create destination pricing"));
    } finally {
      setCreatingPricing(false);
    }
  };

  const onSavePricing = async (pricingId: string) => {
    if (!canUpdateSettings) {
      setError("You do not have permission to update pricing.");
      return;
    }
    const draft = pricingDrafts[pricingId];
    if (!draft) return;

    const baseCost = Number(draft.baseCost);
    const minProfitPercent = Number(draft.minProfitPercent);
    if (!Number.isFinite(baseCost) || baseCost < 0) {
      setError("Base cost must be a valid non-negative number.");
      return;
    }
    if (
      !Number.isFinite(minProfitPercent) ||
      minProfitPercent < 0 ||
      minProfitPercent > 100
    ) {
      setError("Min profit % must be between 0 and 100.");
      return;
    }

    setSavingPricingId(pricingId);
    setError("");
    setMessage("");
    try {
      await destinationsApi.updatePricing(pricingId, {
        baseCost,
        minProfitPercent,
        recommendedProfitPercent:
          draft.recommendedProfitPercent ?
            Number(draft.recommendedProfitPercent)
          : undefined,
        taxPercent: draft.taxPercent ? Number(draft.taxPercent) : 0,
        validFrom: draft.validFrom || undefined,
        validTo: draft.validTo || undefined,
      });
      setMessage("Destination pricing updated.");
      await loadPricing(selectedDestinationId);
      await loadDestinations();
    } catch (e) {
      setError(getApiErrorMessage(e, "Unable to update destination pricing"));
    } finally {
      setSavingPricingId("");
    }
  };

  if (!canReadSettings) {
    return (
      <EmptyState
        title="Destination settings are not available"
        description="Your role does not currently include permission to view or manage destination pricing."
        icon={<FaGlobe />}
      />
    );
  }

  return (
    <div className="space-y-5">
      {error ?
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      : null}
      {message ?
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {message}
        </div>
      : null}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="space-y-5">
          <SurfaceCard>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-600">
                  Quick Add
                </p>
                <h3 className="mt-2 text-lg font-semibold text-gray-900">
                  Create a new destination
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Add the basics now, then set pricing from the workspace.
                </p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-100 text-blue-600">
                <FaPlus />
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <label className="field-label">Destination name</label>
                <input
                  className="field-input"
                  placeholder="Example: Dubai"
                  value={newDestination.name}
                  onChange={(e) =>
                    setNewDestination((previous) => ({
                      ...previous,
                      name: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <label className="field-label">Country</label>
                <input
                  className="field-input"
                  placeholder="Example: United Arab Emirates"
                  value={newDestination.country}
                  onChange={(e) =>
                    setNewDestination((previous) => ({
                      ...previous,
                      country: e.target.value,
                    }))
                  }
                />
              </div>
              <label className="inline-flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={newDestination.isActive}
                  onChange={(e) =>
                    setNewDestination((previous) => ({
                      ...previous,
                      isActive: e.target.checked,
                    }))
                  }
                />
                Make this destination active immediately
              </label>
              <button
                onClick={() => void onCreateDestination()}
                disabled={creatingDestination || !canUpdateSettings}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FaPlus className="text-xs" />
                {creatingDestination ?
                  "Creating destination..."
                : "Create destination"}
              </button>
            </div>
          </SurfaceCard>

          <SurfaceCard className="overflow-hidden">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-600">
                  Directory
                </p>
                <h3 className="mt-2 text-lg font-semibold text-gray-900">
                  Browse destination master
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Select a destination to manage details and pricing.
                </p>
              </div>
              <button
                onClick={() => void loadDestinations()}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition hover:border-blue-200 hover:text-blue-700"
              >
                <FaSyncAlt
                  className={loadingDestinations ? "animate-spin" : ""}
                />
                Refresh
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div className="relative">
                <FaSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400" />
                <input
                  className="field-input pl-10"
                  placeholder="Search destination or country"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-gray-50 px-3 py-3 text-sm text-gray-600">
                <span>
                  Showing {visibleDestinations.length} of{" "}
                  {destinationStats.total}
                </span>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={showInactive}
                    onChange={(e) => setShowInactive(e.target.checked)}
                  />
                  Include inactive
                </label>
              </div>

              {loadingDestinations ?
                <div className="rounded-2xl border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-500">
                  Loading destinations...
                </div>
              : visibleDestinations.length === 0 ?
                <div className="rounded-2xl border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-500">
                  No destinations match this search yet.
                </div>
              : <div className="max-h-[560px] space-y-3 overflow-y-auto pr-1">
                  {visibleDestinations.map((item) => {
                    const isSelected = selectedDestinationId === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSelectedDestinationId(item.id)}
                        className={`w-full rounded-2xl border p-4 text-left transition ${
                          isSelected ?
                            "border-blue-300 bg-blue-50 shadow-sm"
                          : "border-gray-200 bg-white hover:border-blue-200 hover:bg-blue-50/40"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="truncate text-base font-semibold text-gray-900">
                                {item.name}
                              </p>
                              <span
                                className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                                  item.isActive === false ?
                                    "bg-gray-200 text-gray-700"
                                  : "bg-emerald-100 text-emerald-700"
                                }`}
                              >
                                {item.isActive === false ?
                                  "Inactive"
                                : "Active"}
                              </span>
                            </div>
                            <div className="mt-2 inline-flex items-center gap-2 text-sm text-gray-500">
                              <FaMapMarkerAlt className="text-xs" />
                              <span>{item.country || "Country not added"}</span>
                            </div>
                          </div>
                          {isSelected ?
                            <span className="rounded-full bg-blue-600 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
                              Selected
                            </span>
                          : null}
                        </div>

                        <div className="mt-4 rounded-xl bg-white/80 px-3 py-2">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                            Current pricing
                          </p>
                          <p className="mt-1 text-sm font-medium text-gray-700">
                            {item.currentPricing ?
                              formatCurrency(item.currentPricing.baseCost)
                            : "Not priced yet"}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              }
            </div>
          </SurfaceCard>
        </div>

        <div className="space-y-5">
          {!selectedDestination || !selectedDestinationDraft ?
            <EmptyState
              title="Choose a destination to start"
              description="Select a destination from the left to edit details, review active pricing, or add a new pricing slab."
              icon={<FaGlobe />}
            />
          : <>
              <SurfaceCard className="overflow-hidden border-blue-100 bg-gradient-to-br from-white via-white to-blue-50">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">
                      <FaCheckCircle className="text-[10px]" />
                      Selected destination
                    </div>
                    <h3 className="mt-3 text-2xl font-semibold text-gray-900">
                      {selectedDestination.name}
                    </h3>
                    <p className="mt-2 inline-flex items-center gap-2 text-sm text-gray-500">
                      <FaMapMarkerAlt className="text-xs" />
                      {selectedDestination.country || "Country not added"}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium">
                      <span
                        className={`rounded-full px-3 py-1 ${
                          selectedDestination.isActive === false ?
                            "bg-gray-200 text-gray-700"
                          : "bg-emerald-100 text-emerald-700"
                        }`}
                      >
                        {selectedDestination.isActive === false ?
                          "Inactive destination"
                        : "Active destination"}
                      </span>
                      <span className="rounded-full bg-white px-3 py-1 text-gray-600 ring-1 ring-gray-200">
                        Added {formatDate(selectedDestination.createdAt)}
                      </span>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm lg:min-w-[280px]">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-500">
                      Current base cost
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-gray-900">
                      {selectedCurrentPricing ?
                        formatCurrency(selectedCurrentPricing.baseCost)
                      : "Not set"}
                    </p>
                    <p className="mt-1 text-sm text-gray-500">
                      {selectedCurrentPricing ?
                        `Valid from ${formatDate(selectedCurrentPricing.validFrom)}`
                      : "Create the first pricing slab for this destination"}
                    </p>
                  </div>
                </div>
              </SurfaceCard>
              <div className="grid grid-cols-1 gap-5 2xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
                <SurfaceCard>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-600">
                      Details
                    </p>
                    <h3 className="mt-2 text-lg font-semibold text-gray-900">
                      Edit destination information
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Keep the destination name, country, and status accurate
                      for your sales team.
                    </p>
                  </div>

                  <div className="mt-5 space-y-4">
                    <div>
                      <label className="field-label">Destination name</label>
                      <input
                        className="field-input"
                        value={selectedDestinationDraft.name}
                        onChange={(e) =>
                          updateDestinationDraft(selectedDestination.id, {
                            name: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="field-label">Country</label>
                      <input
                        className="field-input"
                        value={selectedDestinationDraft.country}
                        onChange={(e) =>
                          updateDestinationDraft(selectedDestination.id, {
                            country: e.target.value,
                          })
                        }
                      />
                    </div>
                    <label className="inline-flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={selectedDestinationDraft.isActive}
                        onChange={(e) =>
                          updateDestinationDraft(selectedDestination.id, {
                            isActive: e.target.checked,
                          })
                        }
                      />
                      Destination is active and visible to the team
                    </label>

                    <div className="flex flex-col gap-3 sm:flex-row">
                      <button
                        onClick={() =>
                          void onSaveDestination(selectedDestination.id)
                        }
                        disabled={
                          !canUpdateSettings ||
                          savingDestinationId === selectedDestination.id
                        }
                        className="inline-flex flex-1 items-center justify-center rounded-xl bg-blue-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {savingDestinationId === selectedDestination.id ?
                          "Saving changes..."
                        : "Save destination"}
                      </button>
                      <button
                        onClick={() =>
                          void onRemoveDestination(selectedDestination)
                        }
                        disabled={
                          !canUpdateSettings ||
                          deletingDestinationId === selectedDestination.id ||
                          selectedDestination.isActive === false
                        }
                        className="inline-flex items-center justify-center rounded-xl border border-red-200 px-4 py-3 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {deletingDestinationId === selectedDestination.id ?
                          "Deleting..."
                        : "Delete destination"}
                      </button>
                    </div>

                    <p className="text-xs leading-5 text-gray-500">
                      Tip: if a destination should stop appearing in active
                      sales workflows, you can set it to inactive and save.
                    </p>
                  </div>
                </SurfaceCard>

                <SurfaceCard>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-600">
                      New Pricing
                    </p>
                    <h3 className="mt-2 text-lg font-semibold text-gray-900">
                      Add a pricing slab
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Set cost, margin, tax, and dates before the team starts
                      quoting.
                    </p>
                  </div>

                  <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="field-label">Base cost</label>
                      <input
                        type="number"
                        className="field-input"
                        placeholder="0"
                        value={newPricing.baseCost}
                        onChange={(e) =>
                          setNewPricing((previous) => ({
                            ...previous,
                            baseCost: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <label className="field-label">Minimum profit %</label>
                      <input
                        type="number"
                        className="field-input"
                        placeholder="0"
                        value={newPricing.minProfitPercent}
                        onChange={(e) =>
                          setNewPricing((previous) => ({
                            ...previous,
                            minProfitPercent: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <label className="field-label">
                        Recommended profit %
                      </label>
                      <input
                        type="number"
                        className="field-input"
                        placeholder="Optional"
                        value={newPricing.recommendedProfitPercent}
                        onChange={(e) =>
                          setNewPricing((previous) => ({
                            ...previous,
                            recommendedProfitPercent: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <label className="field-label">Tax %</label>
                      <input
                        type="number"
                        className="field-input"
                        placeholder="0"
                        value={newPricing.taxPercent}
                        onChange={(e) =>
                          setNewPricing((previous) => ({
                            ...previous,
                            taxPercent: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <label className="field-label">Valid from</label>
                      <input
                        type="date"
                        className="field-input"
                        value={newPricing.validFrom}
                        onChange={(e) =>
                          setNewPricing((previous) => ({
                            ...previous,
                            validFrom: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <label className="field-label">Valid to</label>
                      <input
                        type="date"
                        className="field-input"
                        value={newPricing.validTo}
                        onChange={(e) =>
                          setNewPricing((previous) => ({
                            ...previous,
                            validTo: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-gray-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-500">
                        Minimum selling price
                      </p>
                      <p className="mt-2 text-xl font-semibold text-gray-900">
                        {newPricingPreview ?
                          formatCurrency(newPricingPreview.minimum)
                        : "Add values to preview"}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-gray-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-500">
                        Recommended selling price
                      </p>
                      <p className="mt-2 text-xl font-semibold text-gray-900">
                        {newPricingPreview ?
                          formatCurrency(newPricingPreview.recommended)
                        : "Add values to preview"}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => void onCreatePricing()}
                    disabled={creatingPricing || !canUpdateSettings}
                    className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <FaPlus className="text-xs" />
                    {creatingPricing ?
                      "Creating pricing slab..."
                    : "Add pricing slab"}
                  </button>
                </SurfaceCard>
              </div>

              <SurfaceCard>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-600">
                      Pricing History
                    </p>
                    <h3 className="mt-2 text-lg font-semibold text-gray-900">
                      Review and update saved slabs
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Adjust older pricing records whenever costs or margins
                      change.
                    </p>
                  </div>
                  <div className="rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-600">
                    {pricingHistory.length} slab
                    {pricingHistory.length === 1 ? "" : "s"} saved
                  </div>
                </div>

                <div className="mt-5">
                  {loadingPricing ?
                    <div className="rounded-2xl border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-500">
                      Loading pricing...
                    </div>
                  : pricingHistory.length === 0 ?
                    <div className="rounded-2xl border border-dashed border-gray-200 px-4 py-10 text-center">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-600">
                        <FaDollarSign />
                      </div>
                      <h4 className="mt-4 text-base font-semibold text-gray-900">
                        No pricing slabs saved yet
                      </h4>
                      <p className="mt-2 text-sm text-gray-500">
                        Add the first slab above to give your team pricing
                        guidance for this destination.
                      </p>
                    </div>
                  : <div className="space-y-4">
                      {pricingHistory.map((item) => {
                        const draft =
                          pricingDrafts[item.id] || toPricingDraft(item);
                        const baseCost = Number(draft.baseCost || 0);
                        const minProfitPercent = Number(
                          draft.minProfitPercent || 0,
                        );
                        const recommendedProfitPercent =
                          draft.recommendedProfitPercent ?
                            Number(draft.recommendedProfitPercent)
                          : minProfitPercent;
                        const taxPercent = Number(draft.taxPercent || 0);

                        return (
                          <div
                            key={item.id}
                            className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4"
                          >
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-gray-600 ring-1 ring-gray-200">
                                  {formatDate(item.validFrom)} to{" "}
                                  {formatDate(item.validTo)}
                                </span>
                                <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700">
                                  Created {formatDate(item.createdAt)}
                                </span>
                                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-gray-700 ring-1 ring-gray-200">
                                  Min sell{" "}
                                  {formatCurrency(
                                    calculateSellingPrice(
                                      baseCost,
                                      minProfitPercent,
                                      taxPercent,
                                    ),
                                  )}
                                </span>
                                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-gray-700 ring-1 ring-gray-200">
                                  Recommended{" "}
                                  {formatCurrency(
                                    calculateSellingPrice(
                                      baseCost,
                                      recommendedProfitPercent,
                                      taxPercent,
                                    ),
                                  )}
                                </span>
                              </div>
                              <button
                                onClick={() => void onSavePricing(item.id)}
                                disabled={
                                  !canUpdateSettings ||
                                  savingPricingId === item.id
                                }
                                className="inline-flex items-center justify-center rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-blue-200 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {savingPricingId === item.id ?
                                  "Saving..."
                                : "Save slab"}
                              </button>
                            </div>

                            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                              <div>
                                <label className="field-label">Base cost</label>
                                <input
                                  type="number"
                                  className="field-input"
                                  value={draft.baseCost}
                                  onChange={(e) =>
                                    setPricingDrafts((previous) => ({
                                      ...previous,
                                      [item.id]: {
                                        ...draft,
                                        baseCost: e.target.value,
                                      },
                                    }))
                                  }
                                />
                              </div>
                              <div>
                                <label className="field-label">
                                  Minimum profit %
                                </label>
                                <input
                                  type="number"
                                  className="field-input"
                                  value={draft.minProfitPercent}
                                  onChange={(e) =>
                                    setPricingDrafts((previous) => ({
                                      ...previous,
                                      [item.id]: {
                                        ...draft,
                                        minProfitPercent: e.target.value,
                                      },
                                    }))
                                  }
                                />
                              </div>
                              <div>
                                <label className="field-label">
                                  Recommended profit %
                                </label>
                                <input
                                  type="number"
                                  className="field-input"
                                  value={draft.recommendedProfitPercent}
                                  onChange={(e) =>
                                    setPricingDrafts((previous) => ({
                                      ...previous,
                                      [item.id]: {
                                        ...draft,
                                        recommendedProfitPercent:
                                          e.target.value,
                                      },
                                    }))
                                  }
                                />
                              </div>
                              <div>
                                <label className="field-label">Tax %</label>
                                <input
                                  type="number"
                                  className="field-input"
                                  value={draft.taxPercent}
                                  onChange={(e) =>
                                    setPricingDrafts((previous) => ({
                                      ...previous,
                                      [item.id]: {
                                        ...draft,
                                        taxPercent: e.target.value,
                                      },
                                    }))
                                  }
                                />
                              </div>
                              <div>
                                <label className="field-label">
                                  Valid from
                                </label>
                                <input
                                  type="date"
                                  className="field-input"
                                  value={draft.validFrom}
                                  onChange={(e) =>
                                    setPricingDrafts((previous) => ({
                                      ...previous,
                                      [item.id]: {
                                        ...draft,
                                        validFrom: e.target.value,
                                      },
                                    }))
                                  }
                                />
                              </div>
                              <div>
                                <label className="field-label">Valid to</label>
                                <input
                                  type="date"
                                  className="field-input"
                                  value={draft.validTo}
                                  onChange={(e) =>
                                    setPricingDrafts((previous) => ({
                                      ...previous,
                                      [item.id]: {
                                        ...draft,
                                        validTo: e.target.value,
                                      },
                                    }))
                                  }
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  }
                </div>
              </SurfaceCard>
            </>
          }
        </div>
      </div>
    </div>
  );
};

export default DestinationPricingManager;
