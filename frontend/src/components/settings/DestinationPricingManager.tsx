import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  destinationsApi,
  type DestinationPricingRecord,
  type DestinationRecord,
} from "../../api/destinations";
import { getApiErrorMessage } from "../../api/apiClient";
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

const DEFAULT_NEW_PRICING: PricingDraft = {
  baseCost: "",
  minProfitPercent: "",
  recommendedProfitPercent: "",
  taxPercent: "0",
  validFrom: "",
  validTo: "",
};

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
    item.recommendedProfitPercent !== null &&
    item.recommendedProfitPercent !== undefined
      ? String(item.recommendedProfitPercent)
      : "",
  taxPercent: String(item.taxPercent ?? 0),
  validFrom: item.validFrom ?? "",
  validTo: item.validTo ?? "",
});

const DestinationPricingManager: React.FC<DestinationPricingManagerProps> = ({
  canReadSettings,
  canUpdateSettings,
}) => {
  const [destinations, setDestinations] = useState<DestinationRecord[]>([]);
  const [loadingDestinations, setLoadingDestinations] = useState(false);
  const [selectedDestinationId, setSelectedDestinationId] = useState("");
  const [editingDestinationId, setEditingDestinationId] = useState("");
  const [destinationDrafts, setDestinationDrafts] = useState<
    Record<string, DestinationDraft>
  >({});

  const [pricingRows, setPricingRows] = useState<DestinationPricingRecord[]>([]);
  const [pricingDrafts, setPricingDrafts] = useState<Record<string, PricingDraft>>(
    {},
  );
  const [editingPricingId, setEditingPricingId] = useState("");
  const [loadingPricing, setLoadingPricing] = useState(false);

  const [savingDestinationId, setSavingDestinationId] = useState("");
  const [savingPricingId, setSavingPricingId] = useState("");
  const [creatingDestination, setCreatingDestination] = useState(false);
  const [creatingPricing, setCreatingPricing] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [newDestination, setNewDestination] = useState({
    name: "",
    country: "",
    isActive: true,
  });
  const [newPricing, setNewPricing] = useState<PricingDraft>(DEFAULT_NEW_PRICING);

  const selectedDestination = useMemo(
    () => destinations.find((item) => item.id === selectedDestinationId) ?? null,
    [destinations, selectedDestinationId],
  );

  const loadDestinations = useCallback(async () => {
    if (!canReadSettings) {
      setDestinations([]);
      setSelectedDestinationId("");
      return;
    }

    setLoadingDestinations(true);
    setError("");
    try {
      const response = await destinationsApi.list();
      const rows = extractRows<DestinationRecord>(response);
      setDestinations(rows);
      setDestinationDrafts(
        Object.fromEntries(
          rows.map((item) => [
            item.id,
            {
              name: item.name || "",
              country: item.country || "",
              isActive: item.isActive !== false,
            },
          ]),
        ),
      );
      setSelectedDestinationId((previous) =>
        previous && rows.some((item) => item.id === previous) ? previous : "",
      );
    } catch (e) {
      setDestinations([]);
      setError(getApiErrorMessage(e, "Unable to load destinations"));
    } finally {
      setLoadingDestinations(false);
    }
  }, [canReadSettings]);

  const loadPricing = useCallback(async (destinationId: string) => {
    if (!destinationId) {
      setPricingRows([]);
      setPricingDrafts({});
      setEditingPricingId("");
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

  useEffect(() => {
    if (!selectedDestination) {
      setNewPricing(DEFAULT_NEW_PRICING);
      return;
    }

    const current = selectedDestination.currentPricing;
    if (!current) {
      setNewPricing(DEFAULT_NEW_PRICING);
      return;
    }

    setNewPricing({
      baseCost:
        current.baseCost !== undefined && current.baseCost !== null
          ? String(current.baseCost)
          : "",
      minProfitPercent:
        current.minProfitPercent !== undefined && current.minProfitPercent !== null
          ? String(current.minProfitPercent)
          : "",
      recommendedProfitPercent:
        current.recommendedProfitPercent !== undefined &&
        current.recommendedProfitPercent !== null
          ? String(current.recommendedProfitPercent)
          : "",
      taxPercent:
        current.taxPercent !== undefined && current.taxPercent !== null
          ? String(current.taxPercent)
          : "0",
      validFrom: "",
      validTo: "",
    });
  }, [selectedDestination]);

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
      const response = await destinationsApi.create({
        name,
        country: newDestination.country.trim() || undefined,
        isActive: newDestination.isActive,
      });
      const created = (response as { data?: DestinationRecord })?.data;
      setNewDestination({ name: "", country: "", isActive: true });
      setMessage("Destination created.");
      await loadDestinations();
      if (created?.id) {
        setSelectedDestinationId(created.id);
      }
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
    if (!draft?.name.trim()) {
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
      setEditingDestinationId("");
      await loadDestinations();
    } catch (e) {
      setError(getApiErrorMessage(e, "Unable to update destination"));
    } finally {
      setSavingDestinationId("");
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
    const recommendedProfitPercent = Number(newPricing.recommendedProfitPercent);
    const taxPercent = Number(newPricing.taxPercent);

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
    if (
      newPricing.recommendedProfitPercent &&
      (!Number.isFinite(recommendedProfitPercent) ||
        recommendedProfitPercent < 0 ||
        recommendedProfitPercent > 100)
    ) {
      setError("Recommended profit % must be between 0 and 100.");
      return;
    }
    if (!Number.isFinite(taxPercent) || taxPercent < 0 || taxPercent > 100) {
      setError("Tax % must be between 0 and 100.");
      return;
    }

    setCreatingPricing(true);
    setError("");
    setMessage("");
    try {
      await destinationsApi.createPricing(selectedDestinationId, {
        baseCost,
        minProfitPercent,
        recommendedProfitPercent: newPricing.recommendedProfitPercent
          ? recommendedProfitPercent
          : undefined,
        taxPercent,
        validFrom: newPricing.validFrom || undefined,
        validTo: newPricing.validTo || undefined,
      });
      setNewPricing(DEFAULT_NEW_PRICING);
      setMessage("Pricing slab added.");
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
    const recommendedProfitPercent = Number(draft.recommendedProfitPercent);
    const taxPercent = Number(draft.taxPercent);

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
    if (
      draft.recommendedProfitPercent &&
      (!Number.isFinite(recommendedProfitPercent) ||
        recommendedProfitPercent < 0 ||
        recommendedProfitPercent > 100)
    ) {
      setError("Recommended profit % must be between 0 and 100.");
      return;
    }
    if (!Number.isFinite(taxPercent) || taxPercent < 0 || taxPercent > 100) {
      setError("Tax % must be between 0 and 100.");
      return;
    }

    setSavingPricingId(pricingId);
    setError("");
    setMessage("");
    try {
      await destinationsApi.updatePricing(pricingId, {
        baseCost,
        minProfitPercent,
        recommendedProfitPercent: draft.recommendedProfitPercent
          ? recommendedProfitPercent
          : undefined,
        taxPercent,
        validFrom: draft.validFrom || undefined,
        validTo: draft.validTo || undefined,
      });
      setMessage("Pricing slab updated.");
      setEditingPricingId("");
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
      <SurfaceCard>
        <p className="text-sm text-gray-500">
          You do not have permission to view destination settings.
        </p>
      </SurfaceCard>
    );
  }

  return (
    <SurfaceCard>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Destinations & Pricing</h2>
        <button
          onClick={() => void loadDestinations()}
          className="rounded-xl border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700"
        >
          Refresh
        </button>
      </div>

      {error ? (
        <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      {message ? (
        <div className="mb-3 rounded-xl border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-700">
          {message}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_1.3fr]">
        <div className="space-y-4">
          <div className="rounded-xl border border-gray-200 p-4">
            <h3 className="mb-3 text-sm font-semibold text-gray-700">
              Add Destination
            </h3>
            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="field-label">Destination Name</label>
                <input
                  className="field-input"
                  placeholder="e.g. Dubai"
                  value={newDestination.name}
                  onChange={(e) =>
                    setNewDestination((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <label className="field-label">Country</label>
                <input
                  className="field-input"
                  placeholder="e.g. UAE"
                  value={newDestination.country}
                  onChange={(e) =>
                    setNewDestination((prev) => ({
                      ...prev,
                      country: e.target.value,
                    }))
                  }
                />
              </div>
              <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={newDestination.isActive}
                  onChange={(e) =>
                    setNewDestination((prev) => ({
                      ...prev,
                      isActive: e.target.checked,
                    }))
                  }
                />
                Active destination
              </label>
              <button
                onClick={() => void onCreateDestination()}
                disabled={creatingDestination || !canUpdateSettings}
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {creatingDestination ? "Creating..." : "Create Destination"}
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 p-4">
            <h3 className="mb-3 text-sm font-semibold text-gray-700">
              Destination List
            </h3>
            {loadingDestinations ? (
              <p className="text-sm text-gray-500">Loading destinations...</p>
            ) : destinations.length === 0 ? (
              <p className="text-sm text-gray-500">
                No destinations found. Add destination first.
              </p>
            ) : (
              <div className="space-y-3">
                {destinations.map((item) => {
                  const draft = destinationDrafts[item.id] || {
                    name: item.name || "",
                    country: item.country || "",
                    isActive: item.isActive !== false,
                  };
                  const isSelected = selectedDestinationId === item.id;
                  const isEditing = editingDestinationId === item.id;

                  return (
                    <div
                      key={item.id}
                      className={`rounded-xl border p-3 ${
                        isSelected
                          ? "border-blue-300 bg-blue-50"
                          : "border-gray-200 bg-white"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedDestinationId(item.id)}
                        className="w-full text-left"
                      >
                        <p className="text-sm font-semibold text-gray-900">
                          {item.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {item.country || "-"} |{" "}
                          {item.isActive !== false ? "Active" : "Inactive"}
                        </p>
                      </button>

                      <div className="mt-3 flex gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedDestinationId(item.id)}
                          className="rounded-lg border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700"
                        >
                          {isSelected ? "Selected" : "Select"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedDestinationId(item.id);
                            setEditingDestinationId(
                              isEditing ? "" : item.id,
                            );
                          }}
                          className="rounded-lg border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700"
                        >
                          {isEditing ? "Close Edit" : "Edit"}
                        </button>
                      </div>

                      {isEditing ? (
                        <div className="mt-3 grid grid-cols-1 gap-2 rounded-lg border border-gray-200 bg-white p-3">
                          <div>
                            <label className="field-label">Destination Name</label>
                            <input
                              className="field-input"
                              value={draft.name}
                              onChange={(e) =>
                                setDestinationDrafts((prev) => ({
                                  ...prev,
                                  [item.id]: {
                                    ...draft,
                                    name: e.target.value,
                                  },
                                }))
                              }
                            />
                          </div>
                          <div>
                            <label className="field-label">Country</label>
                            <input
                              className="field-input"
                              value={draft.country}
                              onChange={(e) =>
                                setDestinationDrafts((prev) => ({
                                  ...prev,
                                  [item.id]: {
                                    ...draft,
                                    country: e.target.value,
                                  },
                                }))
                              }
                            />
                          </div>
                          <label className="inline-flex items-center gap-2 text-xs text-gray-600">
                            <input
                              type="checkbox"
                              checked={draft.isActive}
                              onChange={(e) =>
                                setDestinationDrafts((prev) => ({
                                  ...prev,
                                  [item.id]: {
                                    ...draft,
                                    isActive: e.target.checked,
                                  },
                                }))
                              }
                            />
                            Active
                          </label>
                          <div className="flex gap-2">
                            <button
                              onClick={() => void onSaveDestination(item.id)}
                              disabled={
                                !canUpdateSettings ||
                                savingDestinationId === item.id
                              }
                              className="rounded-lg border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 disabled:opacity-50"
                            >
                              {savingDestinationId === item.id
                                ? "Saving..."
                                : "Save"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingDestinationId("")}
                              className="rounded-lg border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-gray-200 p-4">
            <h3 className="mb-2 text-sm font-semibold text-gray-700">
              Pricing Details
            </h3>
            {!selectedDestination ? (
              <p className="text-sm text-gray-500">
                Select destination from list to view/manage pricing.
              </p>
            ) : (
              <>
                <p className="mb-3 text-sm text-gray-600">
                  Destination:{" "}
                  <span className="font-semibold">{selectedDestination.name}</span>
                </p>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div>
                    <label className="field-label">Base Cost</label>
                    <input
                      type="number"
                      className="field-input"
                      value={newPricing.baseCost}
                      min={0}
                      step="0.01"
                      onChange={(e) =>
                        setNewPricing((prev) => ({
                          ...prev,
                          baseCost: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="field-label">Min Profit %</label>
                    <input
                      type="number"
                      className="field-input"
                      value={newPricing.minProfitPercent}
                      min={0}
                      max={100}
                      step="0.01"
                      onChange={(e) =>
                        setNewPricing((prev) => ({
                          ...prev,
                          minProfitPercent: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="field-label">Recommended Profit %</label>
                    <input
                      type="number"
                      className="field-input"
                      value={newPricing.recommendedProfitPercent}
                      min={0}
                      max={100}
                      step="0.01"
                      onChange={(e) =>
                        setNewPricing((prev) => ({
                          ...prev,
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
                      value={newPricing.taxPercent}
                      min={0}
                      max={100}
                      step="0.01"
                      onChange={(e) =>
                        setNewPricing((prev) => ({
                          ...prev,
                          taxPercent: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="field-label">Valid From</label>
                    <input
                      type="date"
                      className="field-input"
                      value={newPricing.validFrom}
                      onChange={(e) =>
                        setNewPricing((prev) => ({
                          ...prev,
                          validFrom: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="field-label">Valid To</label>
                    <input
                      type="date"
                      className="field-input"
                      value={newPricing.validTo}
                      onChange={(e) =>
                        setNewPricing((prev) => ({
                          ...prev,
                          validTo: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
                <button
                  onClick={() => void onCreatePricing()}
                  disabled={creatingPricing || !canUpdateSettings}
                  className="mt-3 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  {creatingPricing ? "Creating..." : "Add Pricing Slab"}
                </button>
              </>
            )}
          </div>

          <div className="rounded-xl border border-gray-200 p-4">
            <h3 className="mb-3 text-sm font-semibold text-gray-700">
              Pricing History
            </h3>
            {loadingPricing ? (
              <p className="text-sm text-gray-500">Loading pricing...</p>
            ) : !selectedDestination ? (
              <p className="text-sm text-gray-500">
                Select destination to see pricing history.
              </p>
            ) : pricingRows.length === 0 ? (
              <p className="text-sm text-gray-500">No pricing slabs found.</p>
            ) : (
              <div className="space-y-3">
                {pricingRows.map((item) => {
                  const draft = pricingDrafts[item.id] || toPricingDraft(item);
                  const isEditing = editingPricingId === item.id;

                  if (!isEditing) {
                    return (
                      <div
                        key={item.id}
                        className="rounded-xl border border-gray-200 bg-gray-50 p-3"
                      >
                        <div className="grid grid-cols-2 gap-2 text-sm text-gray-700 md:grid-cols-3">
                          <p>Base: {item.baseCost}</p>
                          <p>Min Profit: {item.minProfitPercent}%</p>
                          <p>
                            Recommended: {item.recommendedProfitPercent ?? "-"}%
                          </p>
                          <p>Tax: {item.taxPercent ?? 0}%</p>
                          <p>From: {item.validFrom || "-"}</p>
                          <p>To: {item.validTo || "-"}</p>
                        </div>
                        <div className="mt-2 flex items-center justify-between text-xs text-gray-600">
                          <span>
                            Created:{" "}
                            {item.createdAt
                              ? new Date(item.createdAt).toLocaleString()
                              : "-"}
                          </span>
                          <button
                            type="button"
                            onClick={() => setEditingPricingId(item.id)}
                            className="rounded-lg border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700"
                          >
                            Edit
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={item.id}
                      className="rounded-xl border border-blue-200 bg-blue-50 p-3"
                    >
                      <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                        <div>
                          <label className="field-label">Base Cost</label>
                          <input
                            type="number"
                            className="field-input"
                            value={draft.baseCost}
                            min={0}
                            step="0.01"
                            onChange={(e) =>
                              setPricingDrafts((prev) => ({
                                ...prev,
                                [item.id]: {
                                  ...draft,
                                  baseCost: e.target.value,
                                },
                              }))
                            }
                          />
                        </div>
                        <div>
                          <label className="field-label">Min Profit %</label>
                          <input
                            type="number"
                            className="field-input"
                            value={draft.minProfitPercent}
                            min={0}
                            max={100}
                            step="0.01"
                            onChange={(e) =>
                              setPricingDrafts((prev) => ({
                                ...prev,
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
                            Recommended Profit %
                          </label>
                          <input
                            type="number"
                            className="field-input"
                            value={draft.recommendedProfitPercent}
                            min={0}
                            max={100}
                            step="0.01"
                            onChange={(e) =>
                              setPricingDrafts((prev) => ({
                                ...prev,
                                [item.id]: {
                                  ...draft,
                                  recommendedProfitPercent: e.target.value,
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
                            min={0}
                            max={100}
                            step="0.01"
                            onChange={(e) =>
                              setPricingDrafts((prev) => ({
                                ...prev,
                                [item.id]: {
                                  ...draft,
                                  taxPercent: e.target.value,
                                },
                              }))
                            }
                          />
                        </div>
                        <div>
                          <label className="field-label">Valid From</label>
                          <input
                            type="date"
                            className="field-input"
                            value={draft.validFrom}
                            onChange={(e) =>
                              setPricingDrafts((prev) => ({
                                ...prev,
                                [item.id]: {
                                  ...draft,
                                  validFrom: e.target.value,
                                },
                              }))
                            }
                          />
                        </div>
                        <div>
                          <label className="field-label">Valid To</label>
                          <input
                            type="date"
                            className="field-input"
                            value={draft.validTo}
                            onChange={(e) =>
                              setPricingDrafts((prev) => ({
                                ...prev,
                                [item.id]: {
                                  ...draft,
                                  validTo: e.target.value,
                                },
                              }))
                            }
                          />
                        </div>
                      </div>
                      <div className="mt-2 flex gap-2">
                        <button
                          onClick={() => void onSavePricing(item.id)}
                          disabled={
                            !canUpdateSettings || savingPricingId === item.id
                          }
                          className="rounded-lg border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 disabled:opacity-50"
                        >
                          {savingPricingId === item.id ? "Saving..." : "Save"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingPricingId("")}
                          className="rounded-lg border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </SurfaceCard>
  );
};

export default DestinationPricingManager;