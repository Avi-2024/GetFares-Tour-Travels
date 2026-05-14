import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FaPlus, FaSave, FaTrash, FaGlobe } from "react-icons/fa";
import SurfaceCard from "../../components/ui/SurfaceCard";
import StatusBadge from "../../components/ui/StatusBadge";
import SearchableDropdown from "../../components/ui/SearchableDropdown";
import EmptyState from "../../components/ui/EmptyState";
import { reportApiError } from "../../lib/notify";
import { usePackagesService } from "../../hooks/usePackagesService";
import PackageCategoriesPanel from "./PackageCategoriesPanel";
import type {
  PackageCategory,
  PackageKind,
  PackageListPagination,
  PackageRecord,
  PackageListSummary,
  PackageStatus,
} from "../../services/packagesService";

const PACKAGE_STATUSES: PackageStatus[] = [
  "DRAFT",
  "ACTIVE",
  "EXPIRED",
  "SOLD_OUT",
];
const PACKAGE_CATEGORIES: PackageCategory[] = [
  "BUDGET",
  "PREMIUM",
  "LUXURY",
  "HONEYMOON",
  "FAMILY",
];
const PAGE_SIZE_OPTIONS = [
  { value: "10", label: "10 rows" },
  { value: "25", label: "25 rows" },
  { value: "50", label: "50 rows" },
];

type CustomServiceRow = {
  id: string;
  name: string;
  description: string;
  cost: string;
  markupPercent: string;
  sellValue: string;
};

type ItineraryDayRow = {
  id: string;
  title: string;
  description: string;
};

type PackageFormState = {
  name: string;
  destination: string;
  durationNights: string;
  durationDays: string;
  baseCost: string;
  markupPercent: string;
  startingPrice: string;
  packageKind: PackageKind;
  packageCategory: PackageCategory | "";
  status: PackageStatus;
  validFrom: string;
  validTo: string;
  inclusions: string;
  exclusions: string;
  hotelDetails: string;
  itineraryItems: ItineraryDayRow[];
  cancellationPolicy: string;
  visaDetails: string;
  paymentTerms: string;
  customServices: CustomServiceRow[];
  isSoldOut: boolean;
  // CMS-like fields
  country: string;
  highlights: string[]; // list-text
  features: { iconName: string; description: string }[]; // list-object
  metaTitle: string;
  metaDescription: string;
  keywords: string;
  displayOrder: string;
  isFeatured: boolean;
  image: string;
  rating: string;
  location: string;
  transport: string;
  snapshot: string;
};

const emptyCustomRow = (): CustomServiceRow => ({
  id: `new-${Date.now()}`,
  name: "",
  description: "",
  cost: "",
  markupPercent: "",
  sellValue: "",
});

const emptyForm: PackageFormState = {
  name: "",
  destination: "",
  durationNights: "",
  durationDays: "",
  baseCost: "",
  markupPercent: "",
  startingPrice: "",
  packageKind: "READY",
  packageCategory: "",
  status: "DRAFT",
  validFrom: "",
  validTo: "",
  inclusions: "",
  exclusions: "",
  hotelDetails: "",
  itineraryItems: [],
  cancellationPolicy: "",
  visaDetails: "",
  paymentTerms: "",
  customServices: [],
  isSoldOut: false,
  // CMS-like fields
  country: "",
  highlights: [],
  features: [],
  metaTitle: "",
  metaDescription: "",
  keywords: "",
  displayOrder: "",
  isFeatured: false,
  image: "",
  rating: "",
  location: "",
  transport: "",
  snapshot: "",
};

const toNumberOrUndefined = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const formatPriceInput = (value: number) => {
  if (!Number.isFinite(value)) return "";
  return String(Number(value.toFixed(2)));
};

const calculateStartingPrice = (baseCost: string, markupPercent: string) => {
  const base = toNumberOrUndefined(baseCost);
  if (base == null) return "";
  const markup = toNumberOrUndefined(markupPercent) ?? 0;
  return formatPriceInput(base * (1 + markup / 100));
};

const hasManualStartingPrice = (
  baseCost: string,
  markupPercent: string,
  startingPrice: string,
) => {
  const trimmed = startingPrice.trim();
  if (!trimmed) return false;
  return trimmed !== calculateStartingPrice(baseCost, markupPercent);
};

const getDayLabel = (index: number) => `Day ${index + 1}`;

const parseDayCount = (value: string) => {
  const parsed = Number(value.trim());
  if (!Number.isInteger(parsed) || parsed <= 0) return 0;
  return parsed;
};

const parseDurationParts = (duration: string) => {
  const trimmed = duration.trim();
  if (!trimmed) {
    return { nights: "", days: "" };
  }
  const nightsMatch = trimmed.match(/(\d+)\s*n(?:ights?)?\b/i);
  const daysMatch =
    trimmed.match(/(\d+)\s*d(?:ays?)?\b/i) ?? trimmed.match(/^(\d+)$/);
  return {
    nights: nightsMatch?.[1] ?? "",
    days: daysMatch?.[1] ?? "",
  };
};

const buildDurationValue = (nights: string, days: string) => {
  const safeNights = nights.trim();
  const safeDays = days.trim();
  if (safeNights && safeDays) return `${safeNights}N/${safeDays}D`;
  if (safeNights) return `${safeNights}N`;
  if (safeDays) return `${safeDays}D`;
  return "";
};

const formatMoney = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(Number.isFinite(value) ? value : 0);

const formatDateLabel = (value: string | null | undefined) => {
  if (!value) return "N/A";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "N/A";
  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getActiveDays = (
  validFrom: string | null | undefined,
  validTo: string | null | undefined,
) => {
  if (!validFrom) return 0;
  const start = new Date(validFrom);
  const end = validTo ? new Date(validTo) : new Date();
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
  return Math.max(Math.ceil((end.getTime() - start.getTime()) / 86400000), 1);
};



const stripDayPrefix = (value: string) =>
  value
    .trim()
    .replace(/^day\s*\d+\s*(?:[-—:]\s*)?/i, "")
    .trim();

const parsePlainItinerary = (value: string): ItineraryDayRow[] =>
  value
    .split(/\n\s*\n+/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk, index) => {
      const lines = chunk.split("\n");
      return {
        id: `day-${index + 1}`,
        title: stripDayPrefix((lines[0] ?? "").trim()),
        description: lines.slice(1).join("\n").trim(),
      };
    });

const parseItineraryItems = (itinerary: unknown): ItineraryDayRow[] => {
  if (Array.isArray(itinerary)) {
    return itinerary.map((row: Record<string, unknown>, index: number) => ({
      id: String(row?.id ?? `day-${index + 1}`),
      title: stripDayPrefix(
        String(
          row?.title ??
            row?.heading ??
            row?.name ??
            row?.day ??
            row?.dayLabel ??
            "",
        ),
      ),
      description: String(row?.description ?? row?.details ?? ""),
    }));
  }
  if (typeof itinerary === "string") {
    return parsePlainItinerary(itinerary);
  }
  if (itinerary && typeof itinerary === "object") {
    const objectValue = itinerary as Record<string, unknown>;
    const plainText =
      typeof objectValue.plain === "string" ? objectValue.plain
      : typeof objectValue.text === "string" ? objectValue.text
      : "";
    if (plainText) {
      return parsePlainItinerary(plainText);
    }
  }
  return [];
};

const buildItineraryRows = (
  dayCount: number,
  currentItems: ItineraryDayRow[] = [],
): ItineraryDayRow[] =>
  Array.from({ length: dayCount }, (_, index) => ({
    id: currentItems[index]?.id ?? `day-${index + 1}`,
    title: currentItems[index]?.title ?? "",
    description: currentItems[index]?.description ?? "",
  }));

/** Convert stored itinerary (JSONB) to editable plain text for the form. */
export function itineraryToPlainText(itinerary: unknown): string {
  if (itinerary == null) return "";
  if (typeof itinerary === "string") return itinerary;
  if (typeof itinerary === "object" && !Array.isArray(itinerary)) {
    const o = itinerary as Record<string, unknown>;
    if (typeof o.plain === "string") return o.plain;
    if (typeof o.text === "string") return o.text;
  }
  if (Array.isArray(itinerary)) {
    return itinerary
      .map((row: Record<string, unknown>, i: number) => {
        const day = String(row?.day ?? row?.dayLabel ?? `Day ${i + 1}`);
        const title = String(row?.title ?? row?.heading ?? "");
        const desc = String(row?.description ?? row?.details ?? "");
        const head = [day, title].filter(Boolean).join(" — ");
        return desc ? `${head}\n${desc}` : head;
      })
      .join("\n\n");
  }
  return "";
}

const PackageDetailView: React.FC<{
  pkg: PackageRecord;
  onEdit: () => void;
  onTogglePublish: () => void;
  publishing: boolean;
}> = ({ pkg, onEdit, onTogglePublish, publishing }) => {
  const itineraryItems = parseItineraryItems(pkg.itinerary);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="md:max-w-[50%]">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {pkg.name}
          </h2>
          <p className="text-gray-500">
            {pkg.destination} • {pkg.duration}
          </p>
          {pkg.location && (
            <p className="text-sm text-gray-400">
              📍 {pkg.location}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            onClick={onEdit}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Edit Package
          </button>
          <button
            onClick={onTogglePublish}
            disabled={publishing}
            className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold ${
              pkg.publishToWebsite
                ? "bg-emerald-600 text-white hover:bg-emerald-700"
                : "border border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
            } disabled:opacity-60`}
          >
            <FaGlobe className="text-xs" />
            {publishing ? "Updating..." : pkg.publishToWebsite ? "Published" : "Publish"}
          </button>
        </div>
      </div>
      
      {/* Image Preview */}
      {pkg.image && (
        <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
          <img 
            src={pkg.image} 
            alt={pkg.name}
            className="w-full h-64 object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <SurfaceCard className="p-4">
          <h3 className="mb-2 font-semibold">Pricing & Status</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Starting Price:</span>{" "}
              <strong className="text-blue-600">
                {pkg.startingPrice.toLocaleString()}
              </strong>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Base Cost:</span>{" "}
              <span>{pkg.baseCost.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Markup:</span>{" "}
              <span>{pkg.markupPercent}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Category:</span>{" "}
              <span className="font-medium uppercase">
                {pkg.packageCategory || "N/A"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Status:</span>{" "}
              <StatusBadge status={pkg.status} />
            </div>
          </div>
        </SurfaceCard>

        <SurfaceCard className="p-4">
          <h3 className="mb-2 font-semibold">Validity</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Valid From:</span>{" "}
              <span>{pkg.validFrom ? pkg.validFrom.slice(0, 10) : "N/A"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Valid To:</span>{" "}
              <span>{pkg.validTo ? pkg.validTo.slice(0, 10) : "N/A"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Sold Out:</span>{" "}
              <span
                className={pkg.isSoldOut ? "text-red-600" : "text-green-600"}
              >
                {pkg.isSoldOut ? "Yes" : "No"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Kind:</span>{" "}
              <span className="font-medium">
                {pkg.packageKind === "CUSTOMIZED" ? "Custom" : "Ready"}
              </span>
            </div>
            {pkg.rating && (
              <div className="flex justify-between">
                <span className="text-gray-500">Rating:</span>{" "}
                <span className="font-medium">⭐ {pkg.rating}</span>
              </div>
            )}
            {pkg.transport && (
              <div className="flex justify-between">
                <span className="text-gray-500">Transport:</span>{" "}
                <span className="text-xs">{pkg.transport}</span>
              </div>
            )}
          </div>
        </SurfaceCard>
      </div>
      
      {/* Highlights & Features */}
      {(pkg.highlights.length > 0 || pkg.features.length > 0) && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {pkg.highlights.length > 0 && (
            <SurfaceCard className="p-4">
              <h3 className="mb-3 font-semibold text-green-600">Highlights</h3>
              <ul className="space-y-2">
                {pkg.highlights.map((highlight, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <span className="text-green-600 mt-0.5">✓</span>
                    <span className="text-gray-700 dark:text-gray-300">{highlight}</span>
                  </li>
                ))}
              </ul>
            </SurfaceCard>
          )}
          {pkg.features.length > 0 && (
            <SurfaceCard className="p-4">
              <h3 className="mb-3 font-semibold text-purple-600">Features</h3>
              <div className="space-y-3">
                {pkg.features.map((feature, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <div className="rounded-lg bg-purple-100 p-2 dark:bg-purple-900/30">
                      <span className="text-xs font-semibold text-purple-700 dark:text-purple-300">
                        {feature.iconName || "🌟"}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 flex-1">
                      {feature.description}
                    </p>
                  </div>
                ))}
              </div>
            </SurfaceCard>
          )}
        </div>
      )}
      
      {pkg.snapshot && (
        <SurfaceCard className="p-4">
          <h3 className="mb-2 font-semibold text-cyan-600">Package Snapshot</h3>
          <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
            {pkg.snapshot}
          </p>
        </SurfaceCard>
      )}

      {itineraryItems.length > 0 ?
        <SurfaceCard className="p-4">
          <h3 className="mb-2 font-semibold text-blue-600">Itinerary</h3>
          <div className="space-y-3">
            {itineraryItems.map((item, index) => (
              <div
                key={item.id}
                className="rounded-xl border border-blue-100 bg-blue-50/40 p-3 dark:border-blue-900/40 dark:bg-blue-900/10"
              >
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-white px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-200">
                    {getDayLabel(index)}
                  </span>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {item.title || getDayLabel(index)}
                  </p>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">
                  {item.description || "Details will be updated."}
                </p>
              </div>
            ))}
          </div>
        </SurfaceCard>
      : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {pkg.inclusions && (
          <SurfaceCard className="p-4">
            <h3 className="mb-2 font-semibold text-green-600">Inclusions</h3>
            <div className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">
              {pkg.inclusions}
            </div>
          </SurfaceCard>
        )}
        {pkg.exclusions && (
          <SurfaceCard className="p-4">
            <h3 className="mb-2 font-semibold text-red-600">Exclusions</h3>
            <div className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">
              {pkg.exclusions}
            </div>
          </SurfaceCard>
        )}
      </div>

      {pkg.hotelDetails && (
        <SurfaceCard className="p-4">
          <h3 className="mb-2 font-semibold text-amber-600">Hotel Details</h3>
          <div className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">
            {pkg.hotelDetails}
          </div>
        </SurfaceCard>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {pkg.visaDetails && (
          <SurfaceCard className="p-4">
            <h3 className="mb-2 font-semibold text-purple-600">Visa Details</h3>
            <div className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">
              {pkg.visaDetails}
            </div>
          </SurfaceCard>
        )}
        {pkg.paymentTerms && (
          <SurfaceCard className="p-4">
            <h3 className="mb-2 font-semibold text-indigo-600">
              Payment Terms
            </h3>
            <div className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">
              {pkg.paymentTerms}
            </div>
          </SurfaceCard>
        )}
      </div>

      {pkg.cancellationPolicy && (
        <SurfaceCard className="p-4">
          <h3 className="mb-2 font-semibold text-orange-600">
            Cancellation Policy
          </h3>
          <div className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">
            {pkg.cancellationPolicy}
          </div>
        </SurfaceCard>
      )}

      {pkg.packageKind === "CUSTOMIZED" && pkg.customServices.length > 0 && (
        <SurfaceCard className="p-4">
          <h3 className="mb-4 font-semibold">Service Lines</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b dark:border-gray-700 text-gray-500 uppercase text-[10px] tracking-wider">
                  <th className="pb-2 font-semibold">Service</th>
                  <th className="pb-2 font-semibold text-right">Cost</th>
                  <th className="pb-2 font-semibold text-right">Markup %</th>
                  <th className="pb-2 font-semibold text-right">Sell Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {pkg.customServices.map((s, i) => (
                  <tr key={i}>
                    <td className="py-3">
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {s.name}
                      </div>
                      {s.description && (
                        <div className="text-xs text-gray-500">
                          {s.description}
                        </div>
                      )}
                    </td>
                    <td className="py-3 text-right tabular-nums">
                      {s.cost.toLocaleString()}
                    </td>
                    <td className="py-3 text-right tabular-nums">
                      {s.markupPercent}%
                    </td>
                    <td className="py-3 text-right font-semibold text-blue-600 tabular-nums">
                      {(s.sellValue || 0).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SurfaceCard>
      )}
    </div>
  );
};

const PackageOverviewView: React.FC<{
  pkg: PackageRecord;
  onEdit: () => void;
  onTogglePublish: () => void;
  publishing: boolean;
}> = ({ pkg, onEdit, onTogglePublish, publishing }) => {
  const itineraryItems = parseItineraryItems(pkg.itinerary);
  const durationParts = parseDurationParts(pkg.duration || "");
  const activeDays = getActiveDays(pkg.validFrom, pkg.validTo);
  const cards = [
    {
      label: "Starting Price",
      value: `Rs ${formatMoney(pkg.startingPrice)}`,
      hint: `Base Rs ${formatMoney(pkg.baseCost)}`,
    },
    {
      label: "Markup",
      value: `${pkg.markupPercent}%`,
      hint: pkg.packageCategory || "No category",
    },
    {
      label: "Trip Days",
      value: durationParts.days || String(itineraryItems.length || 0),
      hint: `${pkg.customServices.length || 0} service lines`,
    },
    {
      label: "Validity Days",
      value: String(activeDays),
      hint: `${formatDateLabel(pkg.validFrom)} to ${formatDateLabel(pkg.validTo)}`,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {pkg.name}
          </h2>
          <p className="text-sm text-gray-500">
            {[pkg.destination, pkg.duration || "Duration N/A"].filter(Boolean).join(" | ")}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={pkg.status} />
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold uppercase text-gray-600 dark:bg-gray-800 dark:text-gray-300">
              {pkg.packageKind === "CUSTOMIZED" ? "Customized" : "Ready"}
            </span>
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-200">
              {pkg.publishToWebsite ? "Website Live" : "Website Private"}
            </span>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            onClick={onEdit}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Edit Package
          </button>
          <button
            onClick={onTogglePublish}
            disabled={publishing}
            className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold ${
              pkg.publishToWebsite
                ? "bg-emerald-600 text-white hover:bg-emerald-700"
                : "border border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
            } disabled:opacity-60`}
          >
            <FaGlobe className="text-xs" />
            {publishing ? "Updating..." : pkg.publishToWebsite ? "Published" : "Publish"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <SurfaceCard key={card.label} className="p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
              {card.label}
            </p>
            <p className="mt-3 text-2xl font-bold text-gray-900 dark:text-gray-100">
              {card.value}
            </p>
            <p className="mt-2 text-sm text-gray-500">{card.hint}</p>
          </SurfaceCard>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <SurfaceCard className="p-4">
          <h3 className="mb-3 font-semibold">Commercial Snapshot</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-900/40">
              <p className="text-xs uppercase tracking-[0.16em] text-gray-400">Base Cost</p>
              <p className="mt-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
                Rs {formatMoney(pkg.baseCost)}
              </p>
            </div>
            <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-900/40">
              <p className="text-xs uppercase tracking-[0.16em] text-gray-400">Category</p>
              <p className="mt-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
                {pkg.packageCategory || "N/A"}
              </p>
            </div>
            <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-900/40">
              <p className="text-xs uppercase tracking-[0.16em] text-gray-400">Sold Out</p>
              <p className="mt-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
                {pkg.isSoldOut ? "Yes" : "No"}
              </p>
            </div>
            <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-900/40">
              <p className="text-xs uppercase tracking-[0.16em] text-gray-400">Itinerary Days</p>
              <p className="mt-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
                {itineraryItems.length || 0}
              </p>
            </div>
          </div>
        </SurfaceCard>

        <SurfaceCard className="p-4">
          <h3 className="mb-3 font-semibold">Lifecycle</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-900/40">
              <p className="text-xs uppercase tracking-[0.16em] text-gray-400">Valid From</p>
              <p className="mt-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
                {formatDateLabel(pkg.validFrom)}
              </p>
            </div>
            <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-900/40">
              <p className="text-xs uppercase tracking-[0.16em] text-gray-400">Valid To</p>
              <p className="mt-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
                {formatDateLabel(pkg.validTo)}
              </p>
            </div>
            <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-900/40">
              <p className="text-xs uppercase tracking-[0.16em] text-gray-400">Created</p>
              <p className="mt-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
                {formatDateLabel(pkg.createdAt)}
              </p>
            </div>
            <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-900/40">
              <p className="text-xs uppercase tracking-[0.16em] text-gray-400">Updated</p>
              <p className="mt-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
                {formatDateLabel(pkg.updatedAt)}
              </p>
            </div>
          </div>
        </SurfaceCard>
      </div>

      <PackageDetailView
        pkg={pkg}
        onEdit={onEdit}
        onTogglePublish={onTogglePublish}
        publishing={publishing}
      />
    </div>
  );
};

const PackagesPage: React.FC = () => {
  const packagesService = usePackagesService();
  const [rootTab, setRootTab] = useState<"CATEGORIES" | "CRM">("CATEGORIES");
  const [activeTab, setActiveTab] = useState<"ALL" | "PUBLISHED">("ALL");
  const [items, setItems] = useState<PackageRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [publishingId, setPublishingId] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [viewMode, setViewMode] = useState<"VIEW" | "EDIT">("VIEW");
  const [form, setForm] = useState<PackageFormState>(emptyForm);
  const [startingPriceManual, setStartingPriceManual] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<PackageStatus | "ALL">(
    "ALL",
  );
  const [categoryFilter, setCategoryFilter] = useState<PackageCategory | "ALL">(
    "ALL",
  );
  const [destinationFilter, setDestinationFilter] = useState("");
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");
  const [sortBy, setSortBy] = useState<
    "createdAt" | "updatedAt" | "name" | "destination" | "status" | "startingPrice"
  >("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [pagination, setPagination] = useState<PackageListPagination>({
    page: 1,
    limit: 25,
    totalItems: 0,
    totalPages: 1,
  });
  const [summary, setSummary] = useState<PackageListSummary>({
    totalPackages: 0,
    publishedCount: 0,
    activeCount: 0,
    soldOutCount: 0,
    destinationCount: 0,
    totalValue: 0,
  });

  const summaryCards = useMemo(() => {
    return [
      {
        label: "Total Packages",
        value: String(summary.totalPackages),
        hint: `${summary.publishedCount} published`,
      },
      {
        label: "Active Packages",
        value: String(summary.activeCount),
        hint: `${summary.soldOutCount} sold out`,
      },
      {
        label: "Starting Value",
        value: summary.totalPackages ? `Rs ${formatMoney(summary.totalValue)}` : "Rs 0",
        hint:
          summary.totalPackages ?
            `Avg Rs ${formatMoney(summary.totalValue / summary.totalPackages)}`
          : "No pricing",
      },
      {
        label: "Destinations",
        value: String(summary.destinationCount),
        hint: summary.activeCount ? `${summary.activeCount} live now` : "Need activation",
      },
    ];
  }, [summary]);

  const selectedPackage = useMemo(
    () => items.find((item) => item.id === selectedId) || null,
    [items, selectedId],
  );
  const visibleItems = items;

  const pricingValidationMessage = useMemo(() => {
    const baseCost = toNumberOrUndefined(form.baseCost);
    const startingPrice = toNumberOrUndefined(form.startingPrice);
    if (
      baseCost != null &&
      baseCost > 0 &&
      startingPrice != null &&
      startingPrice <= baseCost
    ) {
      return "Starting price must be greater than base cost.";
    }
    return "";
  }, [form.baseCost, form.startingPrice]);

  const resetFilters = useCallback(() => {
    setSearch("");
    setStatusFilter("ALL");
    setCategoryFilter("ALL");
    setDestinationFilter("");
    setCreatedFrom("");
    setCreatedTo("");
    setSortBy("createdAt");
    setSortOrder("desc");
    setPage(1);
    setPageSize(25);
  }, []);

  const statusFilterOptions = useMemo(
    () => [
      { value: "ALL", label: "All Status" },
      ...PACKAGE_STATUSES.map((status) => ({ value: status, label: status })),
    ],
    [],
  );

  const categoryFilterOptions = useMemo(
    () => [
      { value: "ALL", label: "All Categories" },
      ...PACKAGE_CATEGORIES.map((category) => ({
        value: category,
        label: category,
      })),
    ],
    [],
  );

  const sortByOptions = useMemo(
    () => [
      { value: "createdAt", label: "Newest created" },
      { value: "updatedAt", label: "Latest updated" },
      { value: "name", label: "Name" },
      { value: "destination", label: "Destination" },
      { value: "status", label: "Status" },
      { value: "startingPrice", label: "Starting price" },
    ],
    [],
  );

  const sortOrderOptions = useMemo(
    () => [
      { value: "desc", label: "Descending" },
      { value: "asc", label: "Ascending" },
    ],
    [],
  );

  const formCategoryOptions = useMemo(
    () => [
      { value: "", label: "Category" },
      ...PACKAGE_CATEGORIES.map((category) => ({
        value: category,
        label: category,
      })),
    ],
    [],
  );

  const formStatusOptions = useMemo(
    () => PACKAGE_STATUSES.map((status) => ({ value: status, label: status })),
    [],
  );

  const formKindOptions = useMemo(
    () => [
      {
        value: "READY" as PackageKind,
        label: "Ready package (static, pre-costed)",
      },
      {
        value: "CUSTOMIZED" as PackageKind,
        label: "Customized package (editable service lines)",
      },
    ],
    [],
  );

  const countryOptions = useMemo(
    () => [
      { value: "", label: "Select Country" },
      { value: "Global", label: "Global" },
      { value: "United Arab Emirates", label: "United Arab Emirates" },
      { value: "India", label: "India" },
    ],
    [],
  );

  const loadPackages = useCallback(async () => {
    if (rootTab !== "CRM") {
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await packagesService.list({
        page,
        limit: pageSize,
        search: debouncedSearch || undefined,
        status: statusFilter === "ALL" ? undefined : statusFilter,
        packageCategory: categoryFilter === "ALL" ? undefined : categoryFilter,
        destination: destinationFilter || undefined,
        publishToWebsite: activeTab === "PUBLISHED" ? true : undefined,
        createdFrom: createdFrom || undefined,
        createdTo: createdTo || undefined,
        sortBy,
        sortOrder,
      });
      const rows = result.items;
      setItems(rows);
      setPagination(result.pagination);
      setSummary(result.summary);
      if (!rows.length) {
        setSelectedId("");
      } else if (selectedId && !rows.some((item) => item.id === selectedId)) {
        setSelectedId(rows[0]?.id || "");
      } else if (!selectedId) {
        setSelectedId(rows[0]?.id || "");
      }
    } catch (err) {
      reportApiError(err, "Failed to load packages.", setError);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [
    activeTab,
    categoryFilter,
    createdFrom,
    createdTo,
    debouncedSearch,
    destinationFilter,
    packagesService,
    page,
    pageSize,
    rootTab,
    selectedId,
    statusFilter,
    sortBy,
    sortOrder,
  ]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 350);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (rootTab !== "CRM") {
      return;
    }
    setPage(1);
  }, [
    activeTab,
    categoryFilter,
    createdFrom,
    createdTo,
    debouncedSearch,
    destinationFilter,
    pageSize,
    rootTab,
    sortBy,
    sortOrder,
    statusFilter,
  ]);

  useEffect(() => {
    void loadPackages();
  }, [loadPackages]);

  useEffect(() => {
    if (pagination.totalPages > 0 && page > pagination.totalPages) {
      setPage(pagination.totalPages);
    }
  }, [page, pagination.totalPages]);

  useEffect(() => {
    if (!selectedPackage) {
      setForm(emptyForm);
      setStartingPriceManual(false);
      return;
    }
    const durationParts = parseDurationParts(selectedPackage.duration || "");
    const baseCost = String(selectedPackage.baseCost ?? "");
    const markupPercent = String(selectedPackage.markupPercent ?? "");
    const startingPrice = String(selectedPackage.startingPrice ?? "");
    const parsedItineraryItems = parseItineraryItems(selectedPackage.itinerary);
    const derivedDayCount =
      Math.max(
        parseDayCount(durationParts.days),
        parsedItineraryItems.length,
      ) || 0;
    setStartingPriceManual(
      hasManualStartingPrice(baseCost, markupPercent, startingPrice),
    );
    setForm({
      name: selectedPackage.name || "",
      destination: selectedPackage.destination || "",
      durationNights: durationParts.nights,
      durationDays:
        derivedDayCount > 0 ? String(derivedDayCount) : durationParts.days,
      baseCost,
      markupPercent,
      startingPrice,
      packageKind: selectedPackage.packageKind ?? "READY",
      packageCategory: selectedPackage.packageCategory ?? "",
      status: selectedPackage.status ?? "DRAFT",
      validFrom: selectedPackage.validFrom?.slice(0, 10) || "",
      validTo: selectedPackage.validTo?.slice(0, 10) || "",
      inclusions: selectedPackage.inclusions || "",
      exclusions: selectedPackage.exclusions || "",
      hotelDetails: selectedPackage.hotelDetails || "",
      itineraryItems: buildItineraryRows(derivedDayCount, parsedItineraryItems),
      cancellationPolicy: selectedPackage.cancellationPolicy || "",
      visaDetails: selectedPackage.visaDetails || "",
      paymentTerms: selectedPackage.paymentTerms || "",
      customServices: (selectedPackage.customServices || []).map((s, i) => ({
        id: s.id || `cs-${i}`,
        name: s.name || "",
        description: s.description || "",
        cost: String(s.cost ?? ""),
        markupPercent: s.markupPercent != null ? String(s.markupPercent) : "",
        sellValue: s.sellValue != null ? String(s.sellValue) : "",
      })),
      isSoldOut: selectedPackage.isSoldOut,
      // CMS-like fields
      country: selectedPackage.country || "",
      image: selectedPackage.image || "",
      rating: selectedPackage.rating != null ? String(selectedPackage.rating) : "",
      location: selectedPackage.location || "",
      transport: selectedPackage.transport || "",
      snapshot: selectedPackage.snapshot || "",
      highlights: selectedPackage.highlights || [],
      features: selectedPackage.features || [],
      metaTitle: selectedPackage.metaTitle || "",
      metaDescription: selectedPackage.metaDescription || "",
      keywords: selectedPackage.keywords || "",
      displayOrder: selectedPackage.displayOrder != null ? String(selectedPackage.displayOrder) : "",
      isFeatured: selectedPackage.isFeatured || false,
    });
  }, [selectedPackage]);

  useEffect(() => {
    if (startingPriceManual) return;
    setForm((prev) => {
      const nextStartingPrice = calculateStartingPrice(
        prev.baseCost,
        prev.markupPercent,
      );
      return prev.startingPrice === nextStartingPrice ?
          prev
        : { ...prev, startingPrice: nextStartingPrice };
    });
  }, [form.baseCost, form.markupPercent, startingPriceManual]);

  useEffect(() => {
    const dayCount = parseDayCount(form.durationDays);
    setForm((prev) => {
      const nextItems = buildItineraryRows(dayCount, prev.itineraryItems);
      return prev.itineraryItems.length === nextItems.length ?
          prev
        : { ...prev, itineraryItems: nextItems };
    });
  }, [form.durationDays]);

  const handleNew = () => {
    setSelectedId("");
    setViewMode("EDIT");
    setForm(emptyForm);
    setStartingPriceManual(false);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.destination.trim()) {
      setError("Package name and destination are required.");
      return;
    }
    if (pricingValidationMessage) {
      setError(
        `${pricingValidationMessage} Increase markup or enter a higher starting price.`,
      );
      return;
    }
    setSaving(true);
    setError("");
    const itinerary =
      form.itineraryItems.length > 0 ?
        form.itineraryItems.map((item, index) => ({
          day: getDayLabel(index),
          title: item.title.trim() || getDayLabel(index),
          description: item.description.trim(),
        }))
      : null;

    const customLines =
      form.packageKind === "CUSTOMIZED" ?
        form.customServices
          .filter(
            (row) => row.name.trim() && toNumberOrUndefined(row.cost) != null,
          )
          .map((row) => {
            const cost = toNumberOrUndefined(row.cost) ?? 0;
            const markupPercent = toNumberOrUndefined(row.markupPercent);
            const sellValue = toNumberOrUndefined(row.sellValue);
            return {
              id: row.id.startsWith("new-") ? undefined : row.id,
              name: row.name.trim(),
              description: row.description.trim() || undefined,
              cost,
              ...(markupPercent != null ? { markupPercent } : {}),
              ...(sellValue != null ? { sellValue } : {}),
            };
          })
      : [];

    const payload = {
      name: form.name.trim(),
      destination: form.destination.trim(),
      duration:
        buildDurationValue(form.durationNights, form.durationDays) || undefined,
      baseCost: toNumberOrUndefined(form.baseCost),
      markupPercent: toNumberOrUndefined(form.markupPercent),
      startingPrice: toNumberOrUndefined(form.startingPrice),
      packageKind: form.packageKind,
      packageCategory: form.packageCategory || undefined,
      status: form.status,
      validFrom: form.validFrom || undefined,
      validTo: form.validTo || undefined,
      inclusions: form.inclusions.trim() || undefined,
      exclusions: form.exclusions.trim() || undefined,
      hotelDetails: form.hotelDetails.trim() || undefined,
      itinerary,
      cancellationPolicy: form.cancellationPolicy.trim() || undefined,
      visaDetails: form.visaDetails.trim() || undefined,
      paymentTerms: form.paymentTerms.trim() || undefined,
      customServices: form.packageKind === "CUSTOMIZED" ? customLines : [],
      publishToWebsite: false,
      isSoldOut: form.isSoldOut,
      // CMS-like fields
      country: form.country.trim() || undefined,
      image: form.image.trim() || undefined,
      rating: toNumberOrUndefined(form.rating),
      location: form.location.trim() || undefined,
      transport: form.transport.trim() || undefined,
      snapshot: form.snapshot.trim() || undefined,
      highlights: form.highlights.filter(h => h.trim()).length > 0 ? form.highlights.filter(h => h.trim()) : undefined,
      features: form.features.filter(f => f.iconName.trim() || f.description.trim()).length > 0 
        ? form.features.filter(f => f.iconName.trim() || f.description.trim())
        : undefined,
      metaTitle: form.metaTitle.trim() || undefined,
      metaDescription: form.metaDescription.trim() || undefined,
      keywords: form.keywords.trim() || undefined,
      displayOrder: toNumberOrUndefined(form.displayOrder),
      isFeatured: form.isFeatured,
    };

    try {
      if (selectedId) {
        await packagesService.update(selectedId, payload);
      } else {
        const created = await packagesService.create(payload);
        if (created?.id) {
          setSelectedId(created.id);
        }
      }
      await loadPackages();
      setViewMode("VIEW");
    } catch (err) {
      reportApiError(err, "Could not save package.", setError);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <SurfaceCard>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Packages
            </h1>
            <p className="text-sm text-gray-500">
              Main/sub categories + CRM quotation packages.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="inline-flex rounded-xl border border-gray-200 p-1 dark:border-gray-700">
              <button
                onClick={() => setRootTab("CATEGORIES")}
                className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                  rootTab === "CATEGORIES"
                    ? "bg-blue-600 text-white"
                    : "text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800"
                }`}
              >
                Main/Sub categories
              </button>
              {/* <button
                onClick={() => setRootTab("CRM")}
                className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                  rootTab === "CRM"
                    ? "bg-blue-600 text-white"
                    : "text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800"
                }`}
              >
                CRM packages
              </button> */}
            </div>
            {rootTab === "CRM" ? (
              <div className="inline-flex rounded-xl border border-gray-200 p-1 dark:border-gray-700">
                <button
                  onClick={() => setActiveTab("ALL")}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                    activeTab === "ALL"
                      ? "bg-blue-600 text-white"
                      : "text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800"
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setActiveTab("PUBLISHED")}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                    activeTab === "PUBLISHED"
                      ? "bg-blue-600 text-white"
                      : "text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800"
                  }`}
                >
                  Published
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </SurfaceCard>

      {rootTab === "CATEGORIES" ? (
        <PackageCategoriesPanel />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {summaryCards.map((card) => (
              <SurfaceCard key={card.label} className="p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                  {card.label}
                </p>
                <p className="mt-3 text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {card.value}
                </p>
                <p className="mt-2 text-sm text-gray-500">{card.hint}</p>
              </SurfaceCard>
            ))}
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Package Management
              </h1>
              <p className="text-sm text-gray-500 md:max-w-[80%]">
                Create Ready (static) or Customized packages per Holidays SOP — full
                inclusions, itinerary, hotel, visa, and payment terms for quotation
                prefill. Publish to website from here.
              </p>
            </div>
            <button
              onClick={handleNew}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-blue-700 md:whitespace-nowrap"
            >
              <FaPlus />
              New Package
            </button>
          </div>

          <SurfaceCard>
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-4 xl:grid-cols-5">
              <input
                className="field-input"
                placeholder="Search by name/destination"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <input
                className="field-input"
                placeholder="Destination filter"
                value={destinationFilter}
                onChange={(event) => setDestinationFilter(event.target.value)}
              />
              <SearchableDropdown
                value={statusFilter}
                options={statusFilterOptions}
                onChange={(value) =>
                  setStatusFilter(value as PackageStatus | "ALL")
                }
                searchPlaceholder="Search status..."
              />
              <SearchableDropdown
                value={categoryFilter}
                options={categoryFilterOptions}
                onChange={(value) =>
                  setCategoryFilter(value as PackageCategory | "ALL")
                }
                searchPlaceholder="Search category..."
              />
              <SearchableDropdown
                value={sortBy}
                options={sortByOptions}
                onChange={(value) =>
                  setSortBy(
                    value as
                      | "createdAt"
                      | "updatedAt"
                      | "name"
                      | "destination"
                      | "status"
                      | "startingPrice",
                  )
                }
                searchPlaceholder="Sort field..."
              />
            </div>
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              <input
                type="date"
                className="field-input"
                value={createdFrom}
                onChange={(event) => setCreatedFrom(event.target.value)}
              />
              <input
                type="date"
                className="field-input"
                value={createdTo}
                onChange={(event) => setCreatedTo(event.target.value)}
              />
              <SearchableDropdown
                value={sortOrder}
                options={sortOrderOptions}
                onChange={(value) => setSortOrder(value as "asc" | "desc")}
                searchPlaceholder="Sort order..."
              />
              <SearchableDropdown
                value={String(pageSize)}
                options={PAGE_SIZE_OPTIONS}
                onChange={(value) => setPageSize(Number(value))}
                searchPlaceholder="Rows per page..."
              />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                onClick={resetFilters}
                className="rounded-xl border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
              >
                Reset Filters
              </button>
              <span className="text-xs text-gray-500">
                Server-side pagination and filters
              </span>
            </div>
          </SurfaceCard>

      {error ?
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-200">
          {error}
        </div>
      : null}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_1fr]">
        <SurfaceCard>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Packages
            </h2>
	            <span className="text-xs text-gray-500">
	              {pagination.totalItems} items
	            </span>
          </div>
	          {loading ?
	            <div className="space-y-3">
	              {Array.from({ length: 6 }).map((_, index) => (
	                <div
	                  key={index}
	                  className="h-20 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800"
	                />
	              ))}
	            </div>
	          : visibleItems.length === 0 ?
	            <EmptyState
	              title="No packages found"
	              description="Change filters or create package."
	              action={
	                <button
	                  onClick={resetFilters}
	                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
	                >
	                  Reset Filters
	                </button>
	              }
	            />
	          : <div className="space-y-3">
	              {visibleItems.map((item) => (
                <div
                  key={item.id}
                  className={`rounded-xl border p-3 ${
                    selectedId === item.id ?
                      "border-blue-500 bg-blue-50/60 dark:bg-blue-900/10"
                    : "border-gray-200 dark:border-gray-700"
                  }`}
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <button
                      onClick={() => {
                        setSelectedId(item.id);
                        setViewMode("VIEW");
                      }}
                      className="text-left"
                    >
                      <p className="font-semibold text-gray-900 dark:text-gray-100">
                        {item.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {item.destination}
                      </p>
                    </button>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={item.status} />
                      <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-medium uppercase text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                        {item.packageKind === "CUSTOMIZED" ? "Custom" : "Ready"}
                      </span>
                      <button
                        title="Toggle website publish"
                        disabled={publishingId === item.id}
                        onClick={async () => {
                          setPublishingId(item.id);
                          setError("");
                          try {
                            await packagesService.publish(item.id, {
                              publishToWebsite: !item.publishToWebsite,
                            });
                            await loadPackages();
                          } catch (err) {
                            reportApiError(err, "Could not update publish status.", setError);
                          } finally {
                            setPublishingId("");
                          }
                        }}
                        className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold ${
                          item.publishToWebsite
                            ? "bg-emerald-600 text-white hover:bg-emerald-700"
                            : "border border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                        } disabled:opacity-60`}
                      >
                        <FaGlobe className="text-[10px]" />
                        {item.publishToWebsite ? "Published" : "Publish"}
                      </button>
                      <button
                        title="Delete package"
                        disabled={deletingId === item.id}
                        onClick={async () => {
                          setDeletingId(item.id);
                          setError("");
                          try {
                            await packagesService.delete(item.id);
                            await loadPackages();
                            if (selectedId === item.id) {
                              setSelectedId("");
                              setViewMode("VIEW");
                            }
                          } catch (err) {
                            reportApiError(err, "Could not delete package.", setError);
                          } finally {
                            setDeletingId("");
                          }
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2 py-1 text-[11px] font-semibold text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-900/20 disabled:opacity-60"
                      >
                        <FaTrash className="text-[10px]" />
                        {deletingId === item.id ? "Deleting" : "Delete"}
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-gray-600 dark:text-gray-300">
                    Price {item.startingPrice.toLocaleString()} • Markup{" "}
                    {item.markupPercent}%
                  </div>
	                </div>
	              ))}
	            </div>
	          }
	          <div className="mt-4 flex flex-col gap-3 border-t border-gray-200 pt-4 text-sm text-gray-500 dark:border-gray-700 md:flex-row md:items-center md:justify-between">
	            <p>
	              {pagination.totalItems === 0 ?
	                "No rows"
	              : `${Math.min(pagination.totalItems, (pagination.page - 1) * pagination.limit + 1)}-${Math.min(pagination.totalItems, pagination.page * pagination.limit)} of ${pagination.totalItems}`}
	            </p>
	            <div className="flex items-center gap-2">
	              <button
	                type="button"
	                onClick={() => setPage((current) => Math.max(1, current - 1))}
	                disabled={pagination.page <= 1 || loading}
	                className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
	              >
	                Previous
	              </button>
	              <span className="min-w-[72px] text-center text-sm font-medium text-gray-700 dark:text-gray-200">
	                Page {pagination.page} / {pagination.totalPages}
	              </span>
	              <button
	                type="button"
	                onClick={() =>
	                  setPage((current) => Math.min(pagination.totalPages, current + 1))
	                }
	                disabled={pagination.page >= pagination.totalPages || loading}
	                className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
	              >
	                Next
	              </button>
	            </div>
	          </div>
	        </SurfaceCard>

        <SurfaceCard>
          {!selectedId && viewMode === "VIEW" ?
            <div className="flex flex-col items-center justify-center py-12">
              <EmptyState
                title="No package selected"
                description="Select a package from the list or create a new one."
                action={
                  <button
                    onClick={handleNew}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    <FaPlus />
                    New Package
                  </button>
                }
              />
            </div>
          : selectedPackage && viewMode === "VIEW" ?
            <PackageOverviewView
              pkg={selectedPackage}
              onEdit={() => setViewMode("EDIT")}
              publishing={publishingId === selectedPackage.id}
              onTogglePublish={async () => {
                setPublishingId(selectedPackage.id);
                setError("");
                try {
                  await packagesService.publish(selectedPackage.id, {
                    publishToWebsite: !selectedPackage.publishToWebsite,
                  });
                  await loadPackages();
                } catch (err) {
                  reportApiError(err, "Could not update publish status.", setError);
                } finally {
                  setPublishingId("");
                }
              }}
            />
          : <>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {selectedId ? "Edit Package" : "Create Package"}
              </h2>
              <div className="mt-4 grid grid-cols-1 gap-3">
                <div>
                  <label className="field-label">Package name</label>
                  <input
                    className="field-input"
                    placeholder="Package name"
                    value={form.name}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, name: event.target.value }))
                    }
                  />
                </div>
                
                {/* CMS Fields Section */}
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div>
                    <label className="field-label">Country</label>
                    <SearchableDropdown
                      value={form.country}
                      options={countryOptions}
                      onChange={(value) =>
                        setForm((prev) => ({ ...prev, country: value }))
                      }
                      searchPlaceholder="Search country..."
                    />
                  </div>
                  <div>
                    <label className="field-label">Image URL</label>
                    <input
                      className="field-input"
                      placeholder="https://example.com/image.jpg"
                      value={form.image}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, image: event.target.value }))
                      }
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div>
                    <label className="field-label">Rating</label>
                    <input
                      type="number"
                      min="0"
                      max="5"
                      step="0.1"
                      className="field-input"
                      placeholder="4.5"
                      value={form.rating}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, rating: event.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <label className="field-label">Location</label>
                    <input
                      className="field-input"
                      placeholder="Dubai, UAE"
                      value={form.location}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, location: event.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <label className="field-label">Transport</label>
                    <input
                      className="field-input"
                      placeholder="Private AC Vehicle"
                      value={form.transport}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, transport: event.target.value }))
                      }
                    />
                  </div>
                </div>
                <div>
                  <label className="field-label">Destination</label>
                  <input
                    className="field-input"
                    placeholder="Destination"
                    value={form.destination}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        destination: event.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <label className="field-label">Duration</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      min="0"
                      className="field-input"
                      placeholder="Nights"
                      value={form.durationNights}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          durationNights: event.target.value,
                        }))
                      }
                    />
                    <input
                      type="number"
                      min="1"
                      className="field-input"
                      placeholder="Days"
                      value={form.durationDays}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          durationDays: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Saved to backend in the same format, for example `4N/5D`.
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="field-label">Base cost</label>
                    <input
                      className="field-input"
                      placeholder="Base cost"
                      value={form.baseCost}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          baseCost: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="field-label">Markup %</label>
                    <input
                      className="field-input"
                      placeholder="Markup %"
                      value={form.markupPercent}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          markupPercent: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="field-label">Starting price</label>
                    <input
                      className="field-input"
                      placeholder="Starting price"
                      value={form.startingPrice}
                      onChange={(event) => {
                        const nextValue = event.target.value;
                        setForm((prev) => ({
                          ...prev,
                          startingPrice: nextValue,
                        }));
                        setStartingPriceManual(
                          hasManualStartingPrice(
                            form.baseCost,
                            form.markupPercent,
                            nextValue,
                          ),
                        );
                      }}
                    />
                    <p
                      className={`mt-1 text-xs ${
                        pricingValidationMessage ?
                          "text-red-600 dark:text-red-400"
                        : "text-gray-500 dark:text-gray-400"
                      }`}
                    >
                      {pricingValidationMessage || ""}
                    </p>
                  </div>
                </div>
                <div>
                  <label className="field-label">Package type</label>
                  <SearchableDropdown
                    value={form.packageKind}
                    options={formKindOptions}
                    onChange={(value) =>
                      setForm((prev) => ({
                        ...prev,
                        packageKind: value as PackageKind,
                        customServices:
                          (
                            value === "CUSTOMIZED" &&
                            prev.customServices.length === 0
                          ) ?
                            [emptyCustomRow()]
                          : value === "READY" ? []
                          : prev.customServices,
                      }))
                    }
                    searchPlaceholder="Package type..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="field-label">Category</label>
                    <SearchableDropdown
                      value={form.packageCategory}
                      options={formCategoryOptions}
                      onChange={(value) =>
                        setForm((prev) => ({
                          ...prev,
                          packageCategory: value as PackageCategory | "",
                        }))
                      }
                      searchPlaceholder="Search category..."
                    />
                  </div>
                  <div>
                    <label className="field-label">Status</label>
                    <SearchableDropdown
                      value={form.status}
                      options={formStatusOptions}
                      onChange={(value) =>
                        setForm((prev) => ({
                          ...prev,
                          status: value as PackageStatus,
                        }))
                      }
                      searchPlaceholder="Search status..."
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="field-label">Validity from</label>
                    <input
                      type="date"
                      className="field-input"
                      value={form.validFrom}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          validFrom: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="field-label">Validity to</label>
                    <input
                      type="date"
                      className="field-input"
                      value={form.validTo}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          validTo: event.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  <div>
                    <label className="field-label">Inclusions</label>
                    <textarea
                      className="field-input"
                      rows={4}
                      value={form.inclusions}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          inclusions: e.target.value,
                        }))
                      }
                      placeholder="Hotels, transfers, sightseeing, meals…"
                    />
                  </div>
                  <div>
                    <label className="field-label">Exclusions</label>
                    <textarea
                      className="field-input"
                      rows={4}
                      value={form.exclusions}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          exclusions: e.target.value,
                        }))
                      }
                      placeholder="Flights, tips, visa fees, personal expenses…"
                    />
                  </div>
                </div>
                <div>
                  <label className="field-label">Hotel details</label>
                  <textarea
                    className="field-input"
                    rows={3}
                    value={form.hotelDetails}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        hotelDetails: e.target.value,
                      }))
                    }
                    placeholder="Property names, star category, room type, meal plan…"
                  />
                </div>
                
                {/* Snapshot Field */}
                <div>
                  <label className="field-label">Snapshot</label>
                  <textarea
                    className="field-input"
                    rows={2}
                    value={form.snapshot}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, snapshot: e.target.value }))
                    }
                    placeholder="Quick package summary..."
                  />
                </div>
                
                {/* Highlights (list-text) */}
                <div className="rounded-xl border border-green-100 bg-green-50/40 p-3 dark:border-green-900/40 dark:bg-green-900/10">
                  <div className="mb-2 flex items-center justify-between">
                    <label className="field-label mb-0">Highlights</label>
                    <button
                      type="button"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          highlights: [...prev.highlights, ""],
                        }))
                      }
                      className="text-xs font-semibold text-green-800 hover:underline dark:text-green-200"
                    >
                      + Add Highlight
                    </button>
                  </div>
                  <div className="space-y-2">
                    {form.highlights.length === 0 ? (
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Add package highlights (e.g., "Free WiFi", "Airport Transfer")
                      </p>
                    ) : (
                      form.highlights.map((highlight, idx) => (
                        <div key={idx} className="flex gap-2">
                          <input
                            className="field-input flex-1"
                            placeholder="Highlight text"
                            value={highlight}
                            onChange={(e) => {
                              const newHighlights = [...form.highlights];
                              newHighlights[idx] = e.target.value;
                              setForm((prev) => ({ ...prev, highlights: newHighlights }));
                            }}
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setForm((prev) => ({
                                ...prev,
                                highlights: prev.highlights.filter((_, i) => i !== idx),
                              }))
                            }
                            className="flex h-10 items-center justify-center rounded-lg border border-red-200 px-3 text-red-600 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-900/20"
                          >
                            <FaTrash className="text-xs" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
                
                {/* Features (list-object) */}
                <div className="rounded-xl border border-purple-100 bg-purple-50/40 p-3 dark:border-purple-900/40 dark:bg-purple-900/10">
                  <div className="mb-2 flex items-center justify-between">
                    <label className="field-label mb-0">Features</label>
                    <button
                      type="button"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          features: [...prev.features, { iconName: "", description: "" }],
                        }))
                      }
                      className="text-xs font-semibold text-purple-800 hover:underline dark:text-purple-200"
                    >
                      + Add Feature
                    </button>
                  </div>
                  <div className="space-y-3">
                    {form.features.length === 0 ? (
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Add features with icon names (e.g., "wifi", "pool", "spa")
                      </p>
                    ) : (
                      form.features.map((feature, idx) => (
                        <div key={idx} className="grid grid-cols-1 gap-2 rounded-lg border border-purple-100 bg-white p-2 dark:border-purple-900/40 dark:bg-gray-900/40 md:grid-cols-12">
                          <input
                            className="field-input md:col-span-3"
                            placeholder="Icon name (wifi, pool)"
                            value={feature.iconName}
                            onChange={(e) => {
                              const newFeatures = [...form.features];
                              newFeatures[idx].iconName = e.target.value;
                              setForm((prev) => ({ ...prev, features: newFeatures }));
                            }}
                          />
                          <input
                            className="field-input md:col-span-8"
                            placeholder="Feature description"
                            value={feature.description}
                            onChange={(e) => {
                              const newFeatures = [...form.features];
                              newFeatures[idx].description = e.target.value;
                              setForm((prev) => ({ ...prev, features: newFeatures }));
                            }}
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setForm((prev) => ({
                                ...prev,
                                features: prev.features.filter((_, i) => i !== idx),
                              }))
                            }
                            className="flex h-10 items-center justify-center rounded-lg border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-900/20 md:col-span-1"
                          >
                            <FaTrash className="text-xs" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
                <div>
                  <div className="flex flex-col gap-3 rounded-xl border border-blue-100 bg-blue-50/40 p-3 dark:border-blue-900/40 dark:bg-blue-900/10">
                    <div>
                      <label className="field-label mb-0">
                        Itinerary (day-wise)
                      </label>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Day fields are created automatically from the `Days`
                        duration value.
                      </p>
                    </div>
                    {parseDayCount(form.durationDays) <= 0 ?
                      <p className="rounded-lg border border-dashed border-blue-200 bg-white/80 px-3 py-4 text-sm text-gray-500 dark:border-blue-900/40 dark:bg-gray-950/20 dark:text-gray-400">
                        Enter the total `Days` in duration to generate itinerary
                        fields.
                      </p>
                    : form.itineraryItems.length === 0 ?
                      <p className="rounded-lg border border-dashed border-blue-200 bg-white/80 px-3 py-4 text-sm text-gray-500 dark:border-blue-900/40 dark:bg-gray-950/20 dark:text-gray-400">
                        Itinerary day fields will appear here automatically.
                      </p>
                    : <div className="space-y-3">
                        {form.itineraryItems.map((item, index) => (
                          <div
                            key={item.id}
                            className="rounded-xl border border-blue-100 bg-white p-3 dark:border-blue-900/40 dark:bg-gray-950/20"
                          >
                            <div className="mb-3 flex items-center gap-2">
                              <span className="rounded-md bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-200">
                                {getDayLabel(index)}
                              </span>
                              <input
                                className="field-input"
                                placeholder="Title (Arrival, Sightseeing, Leisure...)"
                                value={item.title}
                                onChange={(event) => {
                                  const nextValue = event.target.value;
                                  setForm((prev) => ({
                                    ...prev,
                                    itineraryItems: prev.itineraryItems.map(
                                      (row, rowIndex) =>
                                        rowIndex === index ?
                                          { ...row, title: nextValue }
                                        : row,
                                    ),
                                  }));
                                }}
                              />
                            </div>
                            <textarea
                              className="field-input"
                              rows={4}
                              placeholder="Add the plan for this day..."
                              value={item.description}
                              onChange={(event) => {
                                const nextValue = event.target.value;
                                setForm((prev) => ({
                                  ...prev,
                                  itineraryItems: prev.itineraryItems.map(
                                    (row, rowIndex) =>
                                      rowIndex === index ?
                                        { ...row, description: nextValue }
                                      : row,
                                  ),
                                }));
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    }
                  </div>
                  {/*
                    placeholder={`Day 1 — Arrival\nAirport meet & transfer to hotel.\n\nDay 2 — City tour\nMorning sightseeing…`}
                  />
                  <p className='mt-1 text-[11px] text-gray-500'>
                    Write in normal language; one day per block is easiest (blank
                    line between days).
                  </p> */}
                </div>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  <div>
                    <label className="field-label">Cancellation policy</label>
                    <textarea
                      className="field-input"
                      rows={3}
                      value={form.cancellationPolicy}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          cancellationPolicy: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="field-label">Visa details</label>
                    <textarea
                      className="field-input"
                      rows={3}
                      value={form.visaDetails}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          visaDetails: e.target.value,
                        }))
                      }
                      placeholder="Visa type, fees, timeline, documents…"
                    />
                  </div>
                </div>
                <div>
                  <label className="field-label">Payment terms</label>
                  <textarea
                    className="field-input"
                    rows={3}
                    value={form.paymentTerms}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        paymentTerms: e.target.value,
                      }))
                    }
                    placeholder="Advance %, balance due, modes, non-refundable…"
                  />
                </div>
                {form.packageKind === "CUSTOMIZED" ?
                  <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-3 dark:border-amber-900 dark:bg-amber-900/10">
                    <div className="mb-2 flex items-center justify-between">
                      <label className="field-label mb-0">
                        Service lines (cost & sell)
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          setForm((prev) => ({
                            ...prev,
                            customServices: [
                              ...prev.customServices,
                              emptyCustomRow(),
                            ],
                          }))
                        }
                        className="text-xs font-semibold text-amber-800 hover:underline dark:text-amber-200"
                      >
                        + Add line
                      </button>
                    </div>
                    <div className="space-y-3">
                      {form.customServices.length === 0 ?
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          Add one or more services with cost; optional markup %
                          and sell value.
                        </p>
                      : null}
                      {form.customServices.map((row, idx) => (
                        <div
                          key={row.id}
                          className="grid grid-cols-1 gap-2 rounded-lg border border-amber-100 bg-white p-2 dark:border-amber-900/40 dark:bg-gray-900/40 md:grid-cols-12"
                        >
                          <input
                            className="field-input md:col-span-3"
                            placeholder="Service name"
                            value={row.name}
                            onChange={(e) => {
                              const v = e.target.value;
                              setForm((prev) => ({
                                ...prev,
                                customServices: prev.customServices.map(
                                  (r, i) => (i === idx ? { ...r, name: v } : r),
                                ),
                              }));
                            }}
                          />
                          <input
                            className="field-input md:col-span-3"
                            placeholder="Description"
                            value={row.description}
                            onChange={(e) => {
                              const v = e.target.value;
                              setForm((prev) => ({
                                ...prev,
                                customServices: prev.customServices.map(
                                  (r, i) =>
                                    i === idx ? { ...r, description: v } : r,
                                ),
                              }));
                            }}
                          />
                          <input
                            className="field-input md:col-span-2"
                            placeholder="Cost"
                            value={row.cost}
                            onChange={(e) => {
                              const v = e.target.value;
                              setForm((prev) => ({
                                ...prev,
                                customServices: prev.customServices.map(
                                  (r, i) => (i === idx ? { ...r, cost: v } : r),
                                ),
                              }));
                            }}
                          />
                          <input
                            className="field-input md:col-span-1"
                            placeholder="%"
                            value={row.markupPercent}
                            onChange={(e) => {
                              const v = e.target.value;
                              setForm((prev) => ({
                                ...prev,
                                customServices: prev.customServices.map(
                                  (r, i) =>
                                    i === idx ? { ...r, markupPercent: v } : r,
                                ),
                              }));
                            }}
                          />
                          <input
                            className="field-input md:col-span-2"
                            placeholder="Sell"
                            value={row.sellValue}
                            onChange={(e) => {
                              const v = e.target.value;
                              setForm((prev) => ({
                                ...prev,
                                customServices: prev.customServices.map(
                                  (r, i) =>
                                    i === idx ? { ...r, sellValue: v } : r,
                                ),
                              }));
                            }}
                          />
                          <button
                            type="button"
                            title="Remove line"
                            onClick={() =>
                              setForm((prev) => ({
                                ...prev,
                                customServices: prev.customServices.filter(
                                  (_, i) => i !== idx,
                                ),
                              }))
                            }
                            className="flex h-10 items-center justify-center rounded-lg border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-900/20 md:col-span-1"
                          >
                            <FaTrash className="text-xs" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                : null}
                
                {/* SEO Fields */}
                <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-3 dark:border-indigo-900/40 dark:bg-indigo-900/10">
                  <h3 className="mb-3 text-sm font-semibold text-indigo-900 dark:text-indigo-200">SEO & Metadata</h3>
                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <label className="field-label">Meta Title</label>
                      <input
                        className="field-input"
                        placeholder="SEO title for search engines"
                        value={form.metaTitle}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, metaTitle: e.target.value }))
                        }
                      />
                    </div>
                    <div>
                      <label className="field-label">Meta Description</label>
                      <textarea
                        className="field-input"
                        rows={2}
                        placeholder="SEO description for search engines"
                        value={form.metaDescription}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, metaDescription: e.target.value }))
                        }
                      />
                    </div>
                    <div>
                      <label className="field-label">Keywords</label>
                      <input
                        className="field-input"
                        placeholder="dubai, tour, package, holiday"
                        value={form.keywords}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, keywords: e.target.value }))
                        }
                      />
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Comma separated keywords for SEO
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Display Order & Featured */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="field-label">Display Order</label>
                    <input
                      type="number"
                      min="0"
                      className="field-input"
                      placeholder="1"
                      value={form.displayOrder}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, displayOrder: e.target.value }))
                      }
                    />
                  </div>
                  <div className="flex items-end">
                    <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <input
                        type="checkbox"
                        checked={form.isFeatured}
                        onChange={(event) =>
                          setForm((prev) => ({
                            ...prev,
                            isFeatured: event.target.checked,
                          }))
                        }
                      />
                      Mark as Featured
                    </label>
                  </div>
                </div>
                
                <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={form.isSoldOut}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        isSoldOut: event.target.checked,
                      }))
                    }
                  />
                  Mark sold out
                </label>
                <div className="flex gap-2">
                  <button
                    disabled={saving}
                    onClick={() => void handleSave()}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
                  >
                    {saving ? "Saving..." : "Save Package"}
                    <FaSave />
                  </button>
                  {selectedId && (
                    <button
                      onClick={() => setViewMode("VIEW")}
                      className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </>
          }
        </SurfaceCard>
      </div>

      
        </>
      )}
    </div>
  );
};

export default PackagesPage;
