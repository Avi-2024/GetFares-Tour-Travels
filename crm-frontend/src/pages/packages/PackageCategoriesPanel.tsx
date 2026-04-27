import React, { useCallback, useEffect, useMemo, useState } from "react";
import SurfaceCard from "../../components/ui/SurfaceCard";
import StatusBadge from "../../components/ui/StatusBadge";
import EmptyState from "../../components/ui/EmptyState";
import { reportApiError } from "../../lib/notify";
import { usePackageCategoriesService } from "../../hooks/usePackageCategoriesService";
import type {
  MainPackageRecord,
  SubPackageRecord,
} from "../../services/packageCategoriesService";
import { FaEye, FaPencilAlt, FaPlus, FaTrash, FaGlobe } from "react-icons/fa";

type Mode =
  | "LIST"
  | "VIEW_SUB"
  | "EDIT_SUB"
  | "NEW_SUB"
  | "VIEW_MAIN"
  | "EDIT_MAIN"
  | "NEW_MAIN";

const toUpper = (value: unknown, fallback = "") =>
  String(value ?? fallback).trim().toUpperCase();

const safeJsonText = (value: unknown) => {
  if (Array.isArray(value)) return JSON.stringify(value, null, 2);
  if (value && typeof value === "object") return JSON.stringify(value, null, 2);
  if (typeof value === "string") return value;
  return "[]";
};

const parseJsonList = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return [];
  try {
    const parsed = JSON.parse(trimmed);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const toLinesText = (value: unknown) => {
  if (!value) return "";
  if (Array.isArray(value)) {
    return value.map((v) => String(v ?? "").trim()).filter(Boolean).join("\n");
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return "";
    // If already JSON array, prefer nicer newline view
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map((v) => String(v ?? "").trim()).filter(Boolean).join("\n");
      }
    } catch {
      // ignore
    }
    return trimmed;
  }
  return String(value);
};

const parseLinesList = (value: string) =>
  value
    .split(/\r?\n/g)
    .map((line) => line.trim())
    .filter(Boolean);

const formatMoney = (value: unknown) => {
  const parsed = Number(value ?? 0);
  if (!Number.isFinite(parsed)) {
    return "0";
  }
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: parsed % 1 === 0 ? 0 : 2,
  }).format(parsed);
};

const buildMainMeta = (item: MainPackageRecord) =>
  [String(item.destination || "").trim(), String(item.country || "").trim()]
    .filter(Boolean)
    .join(" | ");

const buildSubMeta = (item: SubPackageRecord) => {
  const duration =
    item.duration || `${item.durationNights ?? 0}N/${item.durationDays ?? 0}D`;
  const location = String(item.location || "").trim();
  return [duration, location].filter(Boolean).join(" | ");
};

const Kv: React.FC<{ label: string; value: React.ReactNode }> = ({
  label,
  value,
}) => (
  <div className="flex justify-between gap-3 text-sm">
    <span className="text-gray-500">{label}</span>
    <span className="text-gray-800 dark:text-gray-200">{value}</span>
  </div>
);

const MetaTile: React.FC<{ label: string; value: React.ReactNode }> = ({
  label,
  value,
}) => (
  <div className="rounded-xl border border-gray-200 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-900">
    <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500">
      {label}
    </p>
    <div className="mt-1 break-words text-sm text-gray-900 dark:text-gray-100">
      {value}
    </div>
  </div>
);

const DetailSection: React.FC<{
  title: string;
  children: React.ReactNode;
  className?: string;
}> = ({ title, children, className = "" }) => (
  <SurfaceCard className={`p-4 ${className}`.trim()}>
    <h4 className="mb-2 font-semibold text-gray-900 dark:text-gray-100">
      {title}
    </h4>
    {children}
  </SurfaceCard>
);

const ImagePreviewCard: React.FC<{
  title: string;
  url?: string | null;
}> = ({ title, url }) => (
  <SurfaceCard className="overflow-hidden p-0">
    <div className="border-b border-gray-200 px-4 py-3 text-sm font-semibold text-gray-800 dark:border-gray-700 dark:text-gray-200">
      {title}
    </div>
    {url ? (
      <div className="p-4">
        <img
          src={url}
          alt={title}
          className="h-40 w-full rounded-xl border border-gray-200 object-cover dark:border-gray-700"
          onError={(event) => {
            (event.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      </div>
    ) : (
      <div className="p-4 text-sm text-gray-500">No image</div>
    )}
  </SurfaceCard>
);

const toObjectSummary = (value: unknown) => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") {
        return String(item ?? "").trim();
      }
      const record = item as Record<string, unknown>;
      return [
        String(
          record.title ?? record.iconName ?? record.icon_name ?? record.day ?? "",
        ).trim(),
        String(record.description ?? "").trim(),
      ]
        .filter(Boolean)
        .join(": ");
    })
    .filter(Boolean);
};

const SubViewModal: React.FC<{
  sub: SubPackageRecord;
  onClose: () => void;
  onEdit: () => void;
}> = ({ sub, onClose, onEdit }) => {
  const heroImage = sub.bannerImageUrl || sub.image || "";
  const featureLines = sub.featuresDisplay?.length
    ? sub.featuresDisplay
    : toObjectSummary(sub.features);
  const itineraryLines = sub.itinerariesDisplay?.length
    ? sub.itinerariesDisplay
    : toObjectSummary(sub.itineraries);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-5xl overflow-hidden rounded-xl bg-white shadow-xl dark:bg-gray-900">
        <div className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-700">
          <div>
            <p className="text-xs text-gray-500">Sub package</p>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {sub.title || sub.name || "Sub"}
            </h3>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onEdit}
              className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Edit
            </button>
            <button
              onClick={onClose}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
            >
              Close
            </button>
          </div>
        </div>
        <div className="max-h-[86vh] overflow-y-auto p-4 space-y-4">
          <header className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-950">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  {sub.title || sub.name || "Sub package"}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {sub.duration ||
                    `${sub.durationDays ?? 0}D/${sub.durationNights ?? 0}N`}
                </p>
              </div>
              <StatusBadge status={sub.status || "DRAFT"} />
            </div>
            {sub.description ? (
              <p className="mt-3 whitespace-pre-wrap text-sm text-gray-600 dark:text-gray-300">
                {sub.description}
              </p>
            ) : null}
          </header>

          {heroImage ? (
            <button
              type="button"
              className="w-full overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700"
            >
              <img
                src={heroImage}
                alt={sub.title || sub.name || "Sub package"}
                className="h-56 w-full object-cover"
              />
            </button>
          ) : null}

          <DetailSection title="Metadata">
            <div className="grid gap-2 md:grid-cols-2">
              <MetaTile label="Parent package" value={sub.parentPackageName || "-"} />
              <MetaTile label="Title" value={sub.title || sub.name || "-"} />
              <MetaTile label="Rating" value={sub.rating ?? "-"} />
              <MetaTile label="Location" value={sub.location || "-"} />
              <MetaTile label="Duration days" value={sub.durationDays ?? "-"} />
              <MetaTile label="Duration nights" value={sub.durationNights ?? "-"} />
              <MetaTile
                label="Currency"
                value={toUpper(sub.startingPriceCurrency, "INR")}
              />
              <MetaTile
                label="Starting price"
                value={`${formatMoney(sub.startingPrice)} ${toUpper(
                  sub.startingPriceCurrency,
                  "INR",
                )}`}
              />
              <MetaTile label="Transport" value={sub.transport || "-"} />
              <MetaTile label="Display order" value={sub.displayOrder ?? "-"} />
              <MetaTile label="Slug" value={sub.websiteSlug || "-"} />
            </div>
          </DetailSection>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {featureLines.length ? (
              <DetailSection title="Features">
                <pre className="whitespace-pre-wrap text-xs text-gray-700 dark:text-gray-300">
                  {featureLines.join("\n")}
                </pre>
              </DetailSection>
            ) : null}
            {sub.highlights?.length ? (
              <DetailSection title="Highlights">
                <pre className="whitespace-pre-wrap text-xs text-gray-700 dark:text-gray-300">
                  {sub.highlights.join("\n")}
                </pre>
              </DetailSection>
            ) : null}
          </div>

          {itineraryLines.length ? (
            <DetailSection title="Itineraries">
              <pre className="whitespace-pre-wrap text-xs text-gray-700 dark:text-gray-300">
                {itineraryLines.join("\n")}
              </pre>
            </DetailSection>
          ) : null}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <DetailSection title="Inclusions">
              <pre className="whitespace-pre-wrap text-xs text-gray-700 dark:text-gray-300">
                {sub.inclusions?.length ? sub.inclusions.join("\n") : "-"}
              </pre>
            </DetailSection>
            <DetailSection title="Exclusions">
              <pre className="whitespace-pre-wrap text-xs text-gray-700 dark:text-gray-300">
                {sub.exclusions?.length ? sub.exclusions.join("\n") : "-"}
              </pre>
            </DetailSection>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <DetailSection title="Payment terms">
              <pre className="whitespace-pre-wrap text-xs text-gray-700 dark:text-gray-300">
                {sub.paymentTerms?.length ? sub.paymentTerms.join("\n") : "-"}
              </pre>
            </DetailSection>
            <DetailSection title="Cancellation policy">
              <pre className="whitespace-pre-wrap text-xs text-gray-700 dark:text-gray-300">
                {sub.cancellationPolicy?.length
                  ? sub.cancellationPolicy.join("\n")
                  : "-"}
              </pre>
            </DetailSection>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <DetailSection title="T&C">
              <pre className="whitespace-pre-wrap text-xs text-gray-700 dark:text-gray-300">
                {sub.tnc?.length ? sub.tnc.join("\n") : "-"}
              </pre>
            </DetailSection>
            <DetailSection title="Important notes">
              <pre className="whitespace-pre-wrap text-xs text-gray-700 dark:text-gray-300">
                {sub.impNotes?.length ? sub.impNotes.join("\n") : "-"}
              </pre>
            </DetailSection>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <DetailSection title="Website">
              <div className="space-y-2 text-gray-700 dark:text-gray-300">
                <Kv
                  label="Published"
                  value={
                    <span className={sub.publishToWebsite ? "text-green-600" : ""}>
                      {sub.publishToWebsite ? "Yes" : "No"}
                    </span>
                  }
                />
                <Kv label="Slug" value={sub.websiteSlug || "-"} />
                <Kv
                  label="Deleted"
                  value={
                    <span className={sub.isDeleted ? "text-red-600" : ""}>
                      {sub.isDeleted ? "Yes" : "No"}
                    </span>
                  }
                />
              </div>
            </DetailSection>
            <DetailSection title="Commercial">
              <div className="space-y-2 text-gray-700 dark:text-gray-300">
                <Kv
                  label="Starting"
                  value={`${formatMoney(sub.startingPrice)} ${toUpper(
                    sub.startingPriceCurrency,
                    "INR",
                  )}`}
                />
                <Kv
                  label="Duration"
                  value={
                    sub.duration ||
                    `${sub.durationNights ?? 0}N/${sub.durationDays ?? 0}D`
                  }
                />
                <Kv label="Transport" value={sub.transport || "-"} />
                <Kv label="Hotel details" value={sub.hotelDetails || "-"} />
              </div>
            </DetailSection>
          </div>

          {sub.snapshot ? (
            <DetailSection title="Snapshot">
              <pre className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">
                {sub.snapshot}
              </pre>
            </DetailSection>
          ) : null}

          {sub.galleryImageUrls?.length ? (
            <DetailSection title="Media gallery">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {sub.galleryImageUrls.map((url, index) => (
                  <div
                    key={`${url}-${index}`}
                    className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700"
                  >
                    <img
                      src={url}
                      alt={`Gallery ${index + 1}`}
                      className="h-28 w-full object-cover"
                      onError={(event) => {
                        (event.currentTarget as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </div>
                ))}
              </div>
            </DetailSection>
          ) : null}
        </div>
      </div>
    </div>
  );
};

const PackageCategoriesPanel: React.FC = () => {
  const api = usePackageCategoriesService();
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);

  const [mainLoading, setMainLoading] = useState(false);
  const [mainPackages, setMainPackages] = useState<MainPackageRecord[]>([]);
  const [selectedMainId, setSelectedMainId] = useState("");
  const selectedMain = useMemo(
    () => mainPackages.find((m) => m.id === selectedMainId) || null,
    [mainPackages, selectedMainId],
  );

  const [subLoading, setSubLoading] = useState(false);
  const [subPackages, setSubPackages] = useState<SubPackageRecord[]>([]);
  const [selectedSubId, setSelectedSubId] = useState("");
  const [mainSearch, setMainSearch] = useState("");
  const [subSearch, setSubSearch] = useState("");
  const selectedSub = useMemo(
    () => subPackages.find((s) => s.id === selectedSubId) || null,
    [subPackages, selectedSubId],
  );
  const filteredMainPackages = useMemo(() => {
    const query = mainSearch.trim().toLowerCase();
    if (!query) {
      return mainPackages;
    }
    return mainPackages.filter((item) =>
      [
        item.title,
        item.destination,
        item.country,
        item.amountCurrency,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [mainPackages, mainSearch]);
  const filteredSubPackages = useMemo(() => {
    const query = subSearch.trim().toLowerCase();
    if (!query) {
      return subPackages;
    }
    return subPackages.filter((item) =>
      [
        item.title,
        item.name,
        item.location,
        item.status,
        item.websiteSlug,
        item.startingPriceCurrency,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [subPackages, subSearch]);

  const [mode, setMode] = useState<Mode>("LIST");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [publishingId, setPublishingId] = useState("");

  const [subForm, setSubForm] = useState({
    title: "",
    startingPrice: "",
    startingPriceCurrency: "INR",
    durationDays: "",
    durationNights: "",
    duration: "",
    location: "",
    image: "",
    bannerImageUrl: "",
    rating: "",
    transport: "",
    hotelDetails: "",
    status: "DRAFT",
    publishToWebsite: false,
    websiteSlug: "",
    isSoldOut: false,
    displayOrder: "",
    metaTitle: "",
    metaDescription: "",
    keywords: "",
    description: "",
    snapshot: "",
    highlightsText: "",
    featuresJson: "[]",
    inclusionsText: "",
    exclusionsText: "",
    paymentTermsText: "",
    cancellationPolicyText: "",
    tncText: "",
    impNotesText: "",
    galleryImageUrlsText: "",
  });

  const loadMain = useCallback(async () => {
    setMainLoading(true);
    setError("");
    try {
      const rows = await api.listMain({ includeDeleted: false });
      setMainPackages(rows);
      if (selectedMainId && !rows.some((m) => m.id === selectedMainId)) {
        setSelectedMainId("");
      }
    } catch (err) {
      reportApiError(err, "Failed to load main packages.", setError);
      setMainPackages([]);
    } finally {
      setMainLoading(false);
    }
  }, [api]);

  const loadSub = useCallback(
    async (mainId: string) => {
      if (!mainId) return;
      setSubLoading(true);
      setError("");
      try {
        const rows = await api.listSub(mainId, { includeDeleted: false });
        setSubPackages(rows);
        if (selectedSubId && !rows.some((s) => s.id === selectedSubId)) {
          setSelectedSubId("");
        }
      } catch (err) {
        reportApiError(err, "Failed to load sub packages.", setError);
        setSubPackages([]);
      } finally {
        setSubLoading(false);
      }
    },
    [api],
  );

  useEffect(() => {
    void loadMain();
  }, [loadMain]);

  useEffect(() => {
    if (!selectedMainId) {
      setSubPackages([]);
      setSelectedSubId("");
      return;
    }
    void loadSub(selectedMainId);
  }, [selectedMainId]);

  const openNewSub = () => {
    if (!selectedMainId) {
      setError("Select main package first.");
      return;
    }
    setSelectedSubId("");
    setMode("NEW_SUB");
    setSubForm({
      title: "",
      startingPrice: "",
      startingPriceCurrency: "INR",
      durationDays: "",
      durationNights: "",
      duration: "",
      location: "",
      image: "",
      bannerImageUrl: "",
      rating: "",
      transport: "",
      hotelDetails: "",
      status: "DRAFT",
      publishToWebsite: false,
      websiteSlug: "",
      isSoldOut: false,
      displayOrder: "",
      metaTitle: "",
      metaDescription: "",
      keywords: "",
      description: "",
      snapshot: "",
      highlightsText: "",
      featuresJson: "[]",
      inclusionsText: "",
      exclusionsText: "",
      paymentTermsText: "",
      cancellationPolicyText: "",
      tncText: "",
      impNotesText: "",
      galleryImageUrlsText: "",
    });
  };

  const openEditSub = (sub: SubPackageRecord) => {
    setSelectedSubId(sub.id);
    setMode("EDIT_SUB");
    setSubForm({
      title: sub.title || sub.name || "",
      startingPrice: String(sub.startingPrice ?? ""),
      startingPriceCurrency: toUpper(sub.startingPriceCurrency, "INR") || "INR",
      durationDays: String(sub.durationDays ?? ""),
      durationNights: String(sub.durationNights ?? ""),
      duration: String(sub.duration ?? ""),
      location: String(sub.location ?? ""),
      image: String((sub as any).image ?? ""),
      bannerImageUrl: String((sub as any).bannerImageUrl ?? ""),
      rating: String((sub as any).rating ?? ""),
      transport: String(sub.transport ?? ""),
      hotelDetails: String(sub.hotelDetails ?? ""),
      status: String(sub.status ?? "DRAFT"),
      publishToWebsite: Boolean(sub.publishToWebsite),
      websiteSlug: String(sub.websiteSlug ?? ""),
      isSoldOut: Boolean(sub.isSoldOut),
      displayOrder: String((sub as any).displayOrder ?? ""),
      metaTitle: String((sub as any).metaTitle ?? ""),
      metaDescription: String((sub as any).metaDescription ?? ""),
      keywords: String((sub as any).keywords ?? ""),
      description: String(sub.description ?? ""),
      snapshot: String(sub.snapshot ?? ""),
      highlightsText: toLinesText((sub as any).highlights),
      featuresJson: safeJsonText((sub as any).features),
      inclusionsText: toLinesText(sub.inclusions),
      exclusionsText: toLinesText(sub.exclusions),
      paymentTermsText: toLinesText(sub.paymentTerms),
      cancellationPolicyText: toLinesText(sub.cancellationPolicy),
      tncText: toLinesText(sub.tnc),
      impNotesText: toLinesText(sub.impNotes),
      galleryImageUrlsText: toLinesText(sub.galleryImageUrls),
    });
  };

  const saveSub = async () => {
    if (!selectedMainId) {
      setError("Select main package first.");
      return;
    }
    if (!subForm.title.trim()) {
      setError("Title required.");
      return;
    }
    if (subForm.publishToWebsite && !subForm.websiteSlug.trim()) {
      setError("Website slug required for publish.");
      return;
    }
    setSaving(true);
    setError("");
    const payload = {
      mainPackageId: selectedMainId,
      title: subForm.title.trim(),
      startingPrice: Number(subForm.startingPrice || 0),
      startingPriceCurrency: toUpper(subForm.startingPriceCurrency, "INR") || "INR",
      durationDays: Number(subForm.durationDays || 0),
      durationNights: Number(subForm.durationNights || 0),
      duration: subForm.duration.trim() || undefined,
      location: subForm.location.trim() || undefined,
      image: subForm.image.trim() || undefined,
      bannerImageUrl: subForm.bannerImageUrl.trim() || undefined,
      rating: Number(subForm.rating || 0),
      transport: subForm.transport.trim() || undefined,
      hotelDetails: subForm.hotelDetails.trim() || undefined,
      status: subForm.status.trim() || "DRAFT",
      publishToWebsite: Boolean(subForm.publishToWebsite),
      websiteSlug: subForm.websiteSlug.trim() || undefined,
      isSoldOut: Boolean(subForm.isSoldOut),
      displayOrder: subForm.displayOrder.trim() ? Number(subForm.displayOrder) : undefined,
      metaTitle: subForm.metaTitle.trim() || undefined,
      metaDescription: subForm.metaDescription.trim() || undefined,
      keywords: subForm.keywords.trim() || undefined,
      description: subForm.description.trim() || undefined,
      snapshot: subForm.snapshot.trim() || undefined,
      highlights: parseLinesList(subForm.highlightsText),
      features: parseJsonList(subForm.featuresJson),
      inclusions: parseLinesList(subForm.inclusionsText),
      exclusions: parseLinesList(subForm.exclusionsText),
      paymentTerms: parseLinesList(subForm.paymentTermsText),
      cancellationPolicy: parseLinesList(subForm.cancellationPolicyText),
      tnc: parseLinesList(subForm.tncText),
      impNotes: parseLinesList(subForm.impNotesText),
      galleryImageUrls: parseLinesList(subForm.galleryImageUrlsText),
    };
    try {
      if (mode === "EDIT_SUB" && selectedSubId) {
        await api.updateSub(selectedSubId, payload);
      } else {
        await api.createSub(payload);
      }
      await loadSub(selectedMainId);
      setMode("LIST");
    } catch (err) {
      reportApiError(err, "Failed to save sub package.", setError);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-200">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <SurfaceCard className="overflow-hidden">
          <div className="mb-3 flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-800">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Main packages
              </h2>
              <p className="text-xs text-gray-500">
                Select main package to manage subs.
              </p>
            </div>
            <button
              onClick={() => void loadMain()}
              className="rounded-xl border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
            >
              Refresh
            </button>
          </div>
          <div className="px-5 pb-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto]">
              <input
                className="field-input"
                placeholder="Search main packages"
                value={mainSearch}
                onChange={(event) => setMainSearch(event.target.value)}
              />
              <div className="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-600 dark:border-gray-700 dark:text-gray-300">
                {mainPackages.length} total
              </div>
              <div className="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-600 dark:border-gray-700 dark:text-gray-300">
                {selectedMain ? "1 selected" : "No selection"}
              </div>
            </div>
          </div>
          <div className="max-h-[720px] overflow-y-auto px-5 pb-5">
          {mainLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="h-24 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800"
                />
              ))}
            </div>
          ) : filteredMainPackages.length === 0 ? (
            <EmptyState
              title="No main packages"
              description={
                mainSearch.trim() ? "Try different search." : "Create main package first."
              }
            />
          ) : (
            <div className="space-y-3">
              {filteredMainPackages.map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    setSelectedMainId(m.id);
                    setSelectedSubId("");
                    setSubPackages([]);
                    setMode("LIST");
                    setSubLoading(true);
                  }}
                  className={`w-full rounded-2xl border px-4 py-4 text-left transition ${
                    selectedMainId === m.id
                      ? "border-blue-500 bg-blue-50/70 shadow-sm dark:bg-blue-900/10"
                      : "border-gray-200 bg-white hover:border-blue-200 hover:bg-gray-50 dark:border-gray-700 dark:bg-transparent dark:hover:bg-gray-800/60"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="truncate text-lg font-semibold text-gray-900 dark:text-gray-100">
                        {m.title}
                      </p>
                      <p className="mt-1 text-sm text-gray-500">
                        {buildMainMeta(m) || "Package details available"}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-lg font-semibold text-blue-600">
                        {formatMoney(m.amount)} {toUpper(m.amountCurrency, "INR")}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        {selectedMainId === m.id ? "Selected" : "Select"}
                      </p>
                      {m.isFeatured ? (
                        <span className="mt-1 inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
                          Featured
                        </span>
                      ) : null}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
          </div>
        </SurfaceCard>

        <SurfaceCard className="overflow-hidden">
          <div className="mb-3 border-b border-gray-200 px-5 py-4 dark:border-gray-800">
            <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Sub packages
              </h2>
              <p className="text-xs text-gray-500">
                {selectedMain ? selectedMain.title : "Select main package"}
              </p>
            </div>
            <button
              onClick={openNewSub}
              disabled={!selectedMainId}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              <FaPlus />
              New
            </button>
            </div>
            <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <input
                className="field-input md:max-w-sm"
                placeholder="Search sub packages"
                value={subSearch}
                onChange={(event) => setSubSearch(event.target.value)}
                disabled={!selectedMainId}
              />
              <div className="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-600 dark:border-gray-700 dark:text-gray-300">
                {selectedMainId ? `${subPackages.length} total` : "Select main first"}
              </div>
            </div>
          </div>

          <div className="max-h-[720px] overflow-y-auto px-5 pb-5">
          {!selectedMainId ? (
            <EmptyState
              title="No main selected"
              description="Select main package from left panel."
            />
          ) : subLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="h-24 rounded-2xl bg-gray-100 animate-pulse dark:bg-gray-800"
                />
              ))}
            </div>
          ) : filteredSubPackages.length === 0 ? (
            <EmptyState
              title="No sub packages"
              description={
                subSearch.trim() ? "Try different search." : "Create first sub package."
              }
              action={
                subSearch.trim() ?
                  <button
                    onClick={() => setSubSearch("")}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    Clear Search
                  </button>
                : <button
                    onClick={openNewSub}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    Create Sub Package
                  </button>
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b text-[10px] uppercase tracking-wider text-gray-500 dark:border-gray-700">
                    <th className="py-2 font-semibold">Title</th>
                    <th className="py-2 font-semibold">Price</th>
                    <th className="py-2 font-semibold">Status</th>
                    <th className="py-2 font-semibold">Website</th>
                    <th className="py-2 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {filteredSubPackages.map((s) => (
                    <tr key={s.id}>
                      <td className="py-3">
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          {s.title || s.name}
                        </div>
                        <div className="mt-1 text-xs text-gray-500">
                          {buildSubMeta(s) || "Sub package details available"}
                        </div>
                        {s.websiteSlug ? (
                          <div className="mt-1 font-mono text-[11px] text-gray-500">
                            {s.websiteSlug}
                          </div>
                        ) : null}
                      </td>
                      <td className="py-3 tabular-nums font-semibold text-blue-600">
                        {formatMoney(s.startingPrice)}{" "}
                        {toUpper(s.startingPriceCurrency, "INR")}
                      </td>
                      <td className="py-3">
                        <StatusBadge status={(s.status as any) || "DRAFT"} />
                      </td>
                      <td className="py-3">
                        <button
                          disabled={publishingId === s.id}
                          onClick={async () => {
                            const slug = String(s.websiteSlug || "").trim();
                            if (!s.publishToWebsite && !slug) {
                              setError("Set website slug, then publish.");
                              return;
                            }
                            setPublishingId(s.id);
                            setError("");
                            try {
                              await api.updateSub(s.id, {
                                publishToWebsite: !s.publishToWebsite,
                                ...(slug ? { websiteSlug: slug } : {}),
                              });
                              await loadSub(selectedMainId);
                            } catch (err) {
                              reportApiError(err, "Publish toggle failed.", setError);
                            } finally {
                              setPublishingId("");
                            }
                          }}
                          className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold ${
                            s.publishToWebsite
                              ? "bg-emerald-600 text-white hover:bg-emerald-700"
                              : "border border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                          } disabled:opacity-60`}
                          title={
                            s.publishToWebsite
                              ? "Unpublish"
                              : "Publish (needs slug)"
                          }
                        >
                          <FaGlobe className="text-[10px]" />
                          {s.publishToWebsite ? "Published" : "Publish"}
                        </button>
                      </td>
                      <td className="py-3 text-right">
                        <div className="inline-flex gap-2">
                          <button
                            title="View"
                            onClick={() => {
                              setSelectedSubId(s.id);
                              setMode("VIEW_SUB");
                            }}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                          >
                            <FaEye className="text-xs" />
                          </button>
                          <button
                            title="Edit"
                            onClick={() => openEditSub(s)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                          >
                            <FaPencilAlt className="text-xs" />
                          </button>
                          <button
                            title="Delete"
                            disabled={deletingId === s.id}
                            onClick={async () => {
                              setDeletingId(s.id);
                              setError("");
                              try {
                                await api.deleteSub(s.id);
                                await loadSub(selectedMainId);
                              } catch (err) {
                                reportApiError(err, "Delete failed.", setError);
                              } finally {
                                setDeletingId("");
                              }
                            }}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-900/20 disabled:opacity-60"
                          >
                            <FaTrash className="text-xs" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          </div>
        </SurfaceCard>
      </div>

      {(mode === "EDIT_SUB" || mode === "NEW_SUB") ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-4xl overflow-hidden rounded-xl bg-white shadow-xl dark:bg-gray-900">
            <div className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-700">
              <div>
                <p className="text-xs text-gray-500">
                  {mode === "EDIT_SUB" ? "Edit sub" : "New sub"}
                </p>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {selectedMain?.title || "Main"}
                </h3>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={saveSub}
                  disabled={saving}
                  className="rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Save"}
                </button>
                <button
                  onClick={() => setMode("LIST")}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                >
                  Cancel
                </button>
              </div>
            </div>
            <div className="max-h-[80vh] overflow-y-auto p-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="field-label">Title</label>
                  <input
                    className="field-input"
                    value={subForm.title}
                    onChange={(e) =>
                      setSubForm((p) => ({ ...p, title: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="field-label">Starting price</label>
                  <input
                    className="field-input"
                    value={subForm.startingPrice}
                    onChange={(e) =>
                      setSubForm((p) => ({ ...p, startingPrice: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="field-label">Currency</label>
                  <input
                    className="field-input"
                    value={subForm.startingPriceCurrency}
                    onChange={(e) =>
                      setSubForm((p) => ({
                        ...p,
                        startingPriceCurrency: e.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <label className="field-label">Days</label>
                  <input
                    className="field-input"
                    value={subForm.durationDays}
                    onChange={(e) =>
                      setSubForm((p) => ({ ...p, durationDays: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="field-label">Nights</label>
                  <input
                    className="field-input"
                    value={subForm.durationNights}
                    onChange={(e) =>
                      setSubForm((p) => ({
                        ...p,
                        durationNights: e.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <label className="field-label">Duration</label>
                  <input
                    className="field-input"
                    value={subForm.duration}
                    onChange={(e) =>
                      setSubForm((p) => ({ ...p, duration: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="field-label">Location</label>
                  <input
                    className="field-input"
                    value={subForm.location}
                    onChange={(e) =>
                      setSubForm((p) => ({ ...p, location: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="field-label">Status</label>
                  <input
                    className="field-input"
                    value={subForm.status}
                    onChange={(e) =>
                      setSubForm((p) => ({ ...p, status: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="field-label">Website slug</label>
                  <input
                    className="field-input"
                    value={subForm.websiteSlug}
                    onChange={(e) =>
                      setSubForm((p) => ({ ...p, websiteSlug: e.target.value }))
                    }
                  />
                </div>
                <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 md:col-span-2">
                  <input
                    type="checkbox"
                    checked={subForm.publishToWebsite}
                    onChange={(e) =>
                      setSubForm((p) => ({
                        ...p,
                        publishToWebsite: e.target.checked,
                      }))
                    }
                  />
                  Publish to website
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 md:col-span-2">
                  <input
                    type="checkbox"
                    checked={subForm.isSoldOut}
                    onChange={(e) =>
                      setSubForm((p) => ({ ...p, isSoldOut: e.target.checked }))
                    }
                  />
                  Sold out
                </label>
                <div className="md:col-span-2">
                  <label className="field-label">Transport</label>
                  <input
                    className="field-input"
                    value={subForm.transport}
                    onChange={(e) =>
                      setSubForm((p) => ({ ...p, transport: e.target.value }))
                    }
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="field-label">Hotel details</label>
                  <textarea
                    className="field-input"
                    rows={3}
                    value={subForm.hotelDetails}
                    onChange={(e) =>
                      setSubForm((p) => ({ ...p, hotelDetails: e.target.value }))
                    }
                  />
                </div>
	                <div className="md:col-span-2">
	                  <label className="field-label">Upload image / banner</label>
	                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    <div className="rounded-xl border border-gray-200 p-3 dark:border-gray-700">
                      <div className="text-xs font-semibold text-gray-700 dark:text-gray-200">
                        Main image
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        disabled={uploading}
                        className="mt-2 block w-full text-sm"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setUploading(true);
                          setError("");
                          try {
                            const fd = new FormData();
                            fd.append("image", file);
                            const res = await api.uploadMedia(fd);
                            const url = res?.bannerUrl;
                            if (url) {
                              setSubForm((p) => ({ ...p, image: url }));
                            }
                          } catch (err) {
                            reportApiError(err, "Upload failed.", setError);
                          } finally {
                            setUploading(false);
                            e.target.value = "";
                          }
                        }}
                      />
                      <div className="mt-1 text-[11px] text-gray-500">
                        {uploading ? "Uploading..." : "Saved to backend on Save"}
                      </div>
                    </div>
                    <div className="rounded-xl border border-gray-200 p-3 dark:border-gray-700">
                      <div className="text-xs font-semibold text-gray-700 dark:text-gray-200">
                        Banner image
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        disabled={uploading}
                        className="mt-2 block w-full text-sm"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setUploading(true);
                          setError("");
                          try {
                            const fd = new FormData();
                            fd.append("banner", file);
                            const res = await api.uploadMedia(fd);
                            const url = res?.bannerUrl;
                            if (url) {
                              setSubForm((p) => ({ ...p, bannerImageUrl: url }));
                            }
                          } catch (err) {
                            reportApiError(err, "Upload failed.", setError);
                          } finally {
                            setUploading(false);
                            e.target.value = "";
                          }
                        }}
                      />
                      <div className="mt-1 text-[11px] text-gray-500">
                        {uploading ? "Uploading..." : "Saved to backend on Save"}
                      </div>
                    </div>
	                  </div>
	                </div>
	                <div className="md:col-span-2 grid grid-cols-1 gap-4 md:grid-cols-2">
	                  <ImagePreviewCard title="Main image preview" url={subForm.image} />
	                  <ImagePreviewCard
	                    title="Banner preview"
	                    url={subForm.bannerImageUrl}
	                  />
	                </div>
	                <div className="md:col-span-2 grid grid-cols-1 gap-2 md:grid-cols-3">
	                  <div>
	                    <label className="field-label">Rating</label>
                    <input
                      className="field-input"
                      value={subForm.rating}
                      onChange={(e) =>
                        setSubForm((p) => ({ ...p, rating: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <label className="field-label">Display order</label>
                    <input
                      className="field-input"
                      value={subForm.displayOrder}
                      onChange={(e) =>
                        setSubForm((p) => ({ ...p, displayOrder: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <label className="field-label">Keywords</label>
                    <input
                      className="field-input"
                      value={subForm.keywords}
                      onChange={(e) =>
                        setSubForm((p) => ({ ...p, keywords: e.target.value }))
                      }
                    />
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="field-label">Meta title</label>
                  <input
                    className="field-input"
                    value={subForm.metaTitle}
                    onChange={(e) =>
                      setSubForm((p) => ({ ...p, metaTitle: e.target.value }))
                    }
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="field-label">Meta description</label>
                  <input
                    className="field-input"
                    value={subForm.metaDescription}
                    onChange={(e) =>
                      setSubForm((p) => ({
                        ...p,
                        metaDescription: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="field-label">Highlights (one per line)</label>
                  <textarea
                    className="field-input"
                    rows={4}
                    value={subForm.highlightsText}
                    onChange={(e) =>
                      setSubForm((p) => ({ ...p, highlightsText: e.target.value }))
                    }
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="field-label">Features (JSON array)</label>
                  <textarea
                    className="field-input font-mono text-xs"
                    rows={4}
                    value={subForm.featuresJson}
                    onChange={(e) =>
                      setSubForm((p) => ({ ...p, featuresJson: e.target.value }))
                    }
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="field-label">Inclusions (one per line)</label>
                  <textarea
                    className="field-input"
                    rows={4}
                    value={subForm.inclusionsText}
                    onChange={(e) =>
                      setSubForm((p) => ({ ...p, inclusionsText: e.target.value }))
                    }
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="field-label">Exclusions (one per line)</label>
                  <textarea
                    className="field-input"
                    rows={4}
                    value={subForm.exclusionsText}
                    onChange={(e) =>
                      setSubForm((p) => ({ ...p, exclusionsText: e.target.value }))
                    }
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="field-label">Payment terms (one per line)</label>
                  <textarea
                    className="field-input"
                    rows={4}
                    value={subForm.paymentTermsText}
                    onChange={(e) =>
                      setSubForm((p) => ({
                        ...p,
                        paymentTermsText: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="field-label">Cancellation policy (one per line)</label>
                  <textarea
                    className="field-input"
                    rows={4}
                    value={subForm.cancellationPolicyText}
                    onChange={(e) =>
                      setSubForm((p) => ({
                        ...p,
                        cancellationPolicyText: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="field-label">T&C (one per line)</label>
                  <textarea
                    className="field-input"
                    rows={4}
                    value={subForm.tncText}
                    onChange={(e) =>
                      setSubForm((p) => ({ ...p, tncText: e.target.value }))
                    }
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="field-label">Important notes (one per line)</label>
                  <textarea
                    className="field-input"
                    rows={4}
                    value={subForm.impNotesText}
                    onChange={(e) =>
                      setSubForm((p) => ({ ...p, impNotesText: e.target.value }))
                    }
                  />
                </div>
	                <div className="md:col-span-2">
	                  <label className="field-label">Gallery image URLs (one per line)</label>
	                  <textarea
                    className="field-input"
                    rows={4}
                    value={subForm.galleryImageUrlsText}
                    onChange={(e) =>
                      setSubForm((p) => ({
                        ...p,
                        galleryImageUrlsText: e.target.value,
                      }))
	                    }
	                  />
	                </div>
	                {parseLinesList(subForm.galleryImageUrlsText).length ? (
	                  <div className="md:col-span-2">
	                    <label className="field-label">Gallery preview</label>
	                    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
	                      {parseLinesList(subForm.galleryImageUrlsText).map((url, index) => (
	                        <div
	                          key={`${url}-${index}`}
	                          className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700"
	                        >
	                          <img
	                            src={url}
	                            alt={`Gallery preview ${index + 1}`}
	                            className="h-28 w-full object-cover"
	                            onError={(event) => {
	                              (event.currentTarget as HTMLImageElement).style.display = "none";
	                            }}
	                          />
	                        </div>
	                      ))}
	                    </div>
	                  </div>
	                ) : null}
	                <div className="md:col-span-2">
	                  <label className="field-label">Description</label>
                  <textarea
                    className="field-input"
                    rows={4}
                    value={subForm.description}
                    onChange={(e) =>
                      setSubForm((p) => ({ ...p, description: e.target.value }))
                    }
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="field-label">Snapshot</label>
                  <textarea
                    className="field-input"
                    rows={3}
                    value={subForm.snapshot}
                    onChange={(e) =>
                      setSubForm((p) => ({ ...p, snapshot: e.target.value }))
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {mode === "VIEW_SUB" && selectedSub ? (
        <SubViewModal
          sub={selectedSub}
          onClose={() => setMode("LIST")}
          onEdit={() => openEditSub(selectedSub)}
        />
      ) : null}
    </div>
  );
};

export default PackageCategoriesPanel;

