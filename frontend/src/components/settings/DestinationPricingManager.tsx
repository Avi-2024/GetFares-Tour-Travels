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
  const [destinationDrafts, setDestinationDrafts] = useState<
    Record<string, DestinationDraft>
  >({});
  const [pricingRows, setPricingRows] = useState<DestinationPricingRecord[]>([]);
  const [pricingDrafts, setPricingDrafts] = useState<Record<string, PricingDraft>>(
    {},
  );
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

  const [newPricing, setNewPricing] = useState<PricingDraft>({
    baseCost: "",
    minProfitPercent: "",
    recommendedProfitPercent: "",
    taxPercent: "0",
    validFrom: "",
    validTo: "",
  });

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
        previous && rows.some((item) => item.id === previous)
          ? previous
          : (rows[0]?.id ?? ""),
      );
    } catch (e) {
      setDestinations([]);
      setError(getApiErrorMessage(e, "Unable to load destinations"));
    } finally {
      setLoadingDestinations(false);
    }
  }, [canReadSettings]);

  const loadPricing = useCallback(
    async (destinationId: string) => {
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
    },
    [],
  );

  useEffect(() => {
    void loadDestinations();
  }, [loadDestinations]);

  useEffect(() => {
    void loadPricing(selectedDestinationId);
  }, [loadPricing, selectedDestinationId]);

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
        recommendedProfitPercent: newPricing.recommendedProfitPercent
          ? Number(newPricing.recommendedProfitPercent)
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
        recommendedProfitPercent: draft.recommendedProfitPercent
          ? Number(draft.recommendedProfitPercent)
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
              <input
                className="field-input"
                placeholder="Destination name"
                value={newDestination.name}
                onChange={(e) =>
                  setNewDestination((prev) => ({
                    ...prev,
                    name: e.target.value,
                  }))
                }
              />
              <input
                className="field-input"
                placeholder="Country"
                value={newDestination.country}
                onChange={(e) =>
                  setNewDestination((prev) => ({
                    ...prev,
                    country: e.target.value,
                  }))
                }
              />
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
              Destination Master
            </h3>
            {loadingDestinations ? (
              <p className="text-sm text-gray-500">Loading destinations...</p>
            ) : destinations.length === 0 ? (
              <p className="text-sm text-gray-500">No destinations found.</p>
            ) : (
              <div className="space-y-3">
                {destinations.map((item) => {
                  const draft = destinationDrafts[item.id] || {
                    name: item.name || "",
                    country: item.country || "",
                    isActive: item.isActive !== false,
                  };
                  const active = selectedDestinationId === item.id;
                  return (
                    <div
                      key={item.id}
                      className={`rounded-xl border p-3 ${
                        active
                          ? "border-blue-300 bg-blue-50"
                          : "border-gray-200 bg-white"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedDestinationId(item.id)}
                        className="mb-2 text-left text-sm font-semibold text-gray-900"
                      >
                        {item.name}
                      </button>
                      <div className="grid grid-cols-1 gap-2">
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
                        <button
                          onClick={() => void onSaveDestination(item.id)}
                          disabled={
                            !canUpdateSettings || savingDestinationId === item.id
                          }
                          className="rounded-xl border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 disabled:opacity-50"
                        >
                          {savingDestinationId === item.id ? "Saving..." : "Save"}
                        </button>
                      </div>
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
              Pricing for {selectedDestination?.name || "Destination"}
            </h3>
            {!selectedDestination ? (
              <p className="text-sm text-gray-500">
                Select a destination to manage pricing.
              </p>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <input
                    type="number"
                    className="field-input"
                    placeholder="Base Cost"
                    value={newPricing.baseCost}
                    onChange={(e) =>
                      setNewPricing((prev) => ({
                        ...prev,
                        baseCost: e.target.value,
                      }))
                    }
                  />
                  <input
                    type="number"
                    className="field-input"
                    placeholder="Min Profit %"
                    value={newPricing.minProfitPercent}
                    onChange={(e) =>
                      setNewPricing((prev) => ({
                        ...prev,
                        minProfitPercent: e.target.value,
                      }))
                    }
                  />
                  <input
                    type="number"
                    className="field-input"
                    placeholder="Recommended Profit %"
                    value={newPricing.recommendedProfitPercent}
                    onChange={(e) =>
                      setNewPricing((prev) => ({
                        ...prev,
                        recommendedProfitPercent: e.target.value,
                      }))
                    }
                  />
                  <input
                    type="number"
                    className="field-input"
                    placeholder="Tax %"
                    value={newPricing.taxPercent}
                    onChange={(e) =>
                      setNewPricing((prev) => ({
                        ...prev,
                        taxPercent: e.target.value,
                      }))
                    }
                  />
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
            ) : pricingRows.length === 0 ? (
              <p className="text-sm text-gray-500">No pricing slabs found.</p>
            ) : (
              <div className="space-y-3">
                {pricingRows.map((item) => {
                  const draft = pricingDrafts[item.id] || toPricingDraft(item);
                  return (
                    <div
                      key={item.id}
                      className="rounded-xl border border-gray-200 bg-gray-50 p-3"
                    >
                      <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                        <input
                          type="number"
                          className="field-input"
                          value={draft.baseCost}
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
                        <input
                          type="number"
                          className="field-input"
                          value={draft.minProfitPercent}
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
                        <input
                          type="number"
                          className="field-input"
                          value={draft.recommendedProfitPercent}
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
                        <input
                          type="number"
                          className="field-input"
                          value={draft.taxPercent}
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
                      <div className="mt-2 flex items-center justify-between text-xs text-gray-600">
                        <span>
                          Created:{" "}
                          {item.createdAt
                            ? new Date(item.createdAt).toLocaleString()
                            : "-"}
                        </span>
                        <button
                          onClick={() => void onSavePricing(item.id)}
                          disabled={
                            !canUpdateSettings || savingPricingId === item.id
                          }
                          className="rounded-lg border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 disabled:opacity-50"
                        >
                          {savingPricingId === item.id ? "Saving..." : "Save Slab"}
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
