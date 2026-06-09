import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaBuildingColumns,
  FaChevronLeft,
  FaChevronRight,
  FaCircleCheck,
  FaClockRotateLeft,
  FaCreditCard,
  FaDownload,
  FaListUl,
  FaMagnifyingGlass,
  FaMoneyBill,
  FaPlus,
  FaRotateLeft,
  FaRotateRight,
  FaWallet,
  FaXmark,
  FaFilter,
  FaEye,
  FaReceipt,
} from "react-icons/fa6";
import { FaEdit } from "react-icons/fa";
import SurfaceCard from "../ui/SurfaceCard";
import EmptyState from "../ui/EmptyState";
import SearchableDropdown from "../ui/SearchableDropdown";
import { paymentsApi } from "../../api/payments";
import { bookingsApi } from "../../api/bookings";

import { usersApi } from "../../api/users";
import { getApiErrorMessage } from "../../api/apiClient";
import { getCurrencyOptions,  formatCurrency } from "../../utils/currency";
import { LoadingButton } from "../ui/ButtonSpinner";

type TxStatus = "completed" | "pending" | "failed" | "refunded";
type PaymentMode = "bank" | "card" | "cash" | "cheque" | "online";

const quickFilters = [
  { key: "ALL", label: "All" },
  { key: "ACTIVE", label: "Active" },
  { key: "COMPLETED", label: "Completed" },
  { key: "PENDING", label: "Pending" },
  { key: "FAILED", label: "Failed" },
  { key: "REFUNDED", label: "Refunded" }
] as const;
type QuickFilter = (typeof quickFilters)[number]["key"];

type PaymentFilterState = {
  referenceId: string;
  customer: string;
  email: string;
  phone: string;
  bookingId: string;
  mode: "ALL" | PaymentMode;
  status: "ALL" | TxStatus;
  fromDate: string;
  toDate: string;
  minAmount: string;
  maxAmount: string;
  sortBy:
    | "NEWEST_FIRST"
    | "OLDEST_FIRST"
    | "AMOUNT_HIGH_TO_LOW"
    | "AMOUNT_LOW_TO_HIGH"
    | "CUSTOMER_A_Z";
};

const defaultFilters: PaymentFilterState = {
  referenceId: "",
  customer: "",
  email: "",
  phone: "",
  bookingId: "",
  mode: "ALL",
  status: "ALL",
  fromDate: "",
  toDate: "",
  minAmount: "",
  maxAmount: "",
  sortBy: "NEWEST_FIRST",
};

interface Transaction {
  id: string;
  referenceId: string;
  date: string;
  customer: string;
  customerEmail?: string;
  customerPhone?: string;
  customerId?: string;
  leadId?: string;
  bookingId: string;
  bookingLabel?: string;
  amount: number;
  currency?: string;
  leadCountry?: string | null;
  mode: PaymentMode;
  status: TxStatus;
  paidAt?: string;
  verifiedAt?: string;
  verifiedBy?: string;
  verifiedByName?: string;
  invoiceUrl?: string;
  paymentReference?: string;
  gatewayOrderId?: string;
  gatewayPaymentId?: string;
  gatewaySignature?: string;
  proofUrl?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface PaymentVerificationData {
  paidAt: string;
  status: "completed" | "failed";
  proofUrl?: string;
  paymentReference?: string;
  gatewayPaymentId?: string;
  notes?: string;
}

const statusClasses: Record<TxStatus, string> = {
  completed:
    "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-900",
  pending:
    "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-900",
  failed:
    "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-900",
  refunded:
    "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700",
};

const initialTransactions: Transaction[] = [];
type PaymentMarket = "ALL" | "INDIA" | "UAE";

const paymentMarketOptions: { key: PaymentMarket; label: string }[] = [
  { key: "ALL", label: "All Markets" },
  { key: "INDIA", label: "India" },
  { key: "UAE", label: "UAE" },
];

const getPaymentMarketCurrency = (market: PaymentMarket) => {
  if (market === "INDIA") return "INR";
  if (market === "UAE") return "AED";
  return "USD";
};

const paymentCountryMatchesMarket = (
  leadCountry: string | null | undefined,
  market: PaymentMarket,
) => {
  if (market === "ALL") return true;
  const normalized = String(leadCountry || "").trim().toLowerCase();
  if (market === "INDIA") return ["india", "in", "ind"].includes(normalized);
  return [
    "uae",
    "u.a.e",
    "ae",
    "dubai",
    "united arab emirates",
    "emirates",
  ].includes(normalized);
};

const MAX_INVOICE_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const formatFileSize = (bytes: number) => {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const power = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const value = bytes / Math.pow(1024, power);
  return `${value % 1 === 0 ? value : value.toFixed(1)} ${units[power]}`;
};

const fileToBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        const commaIndex = result.indexOf(",");
        resolve(commaIndex >= 0 ? result.slice(commaIndex + 1) : result);
      } else {
        reject(new Error("Unable to read file"));
      }
    };
    reader.onerror = () =>
      reject(reader.error ?? new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });

function unwrapData<T>(response: unknown): T | null {
  if (!response) return null;
  if (typeof response === "object" && response && "data" in response) {
    return (response as { data: T }).data ?? null;
  }
  return response as T;
}

const unwrapList = (response: unknown) => {
  const data = unwrapData<any>(response);
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  return [];
};

const generatePaymentReferenceId = () => {
  const suffix = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0");
  return `PAY-${Date.now()}-${suffix}`;
};

const pickCustomerName = (...sources: any[]) => {
  for (const source of sources) {
    if (!source) continue;
    const nestedCustomer = source.customer;
    const candidate =
      source.customerName ??
      source.customer_name ??
      source.lead?.fullName ??
      source.lead?.full_name ??
      source.lead?.name ??
      (typeof nestedCustomer === "string" ? nestedCustomer : undefined) ??
      nestedCustomer?.fullName ??
      nestedCustomer?.full_name ??
      nestedCustomer?.name ??
      source.fullName ??
      source.full_name ??
      source.name;

    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  return "";
};

const pickCustomerEmail = (...sources: any[]) => {
  for (const source of sources) {
    if (!source) continue;
    const candidate =
      source.customerEmail ??
      source.customer_email ??
      source.lead?.email ??
      source.email ??
      source.customer?.email;

    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  return "";
};

const pickCustomerPhone = (...sources: any[]) => {
  for (const source of sources) {
    if (!source) continue;
    const candidate =
      source.customerPhone ??
      source.customer_phone ??
      source.lead?.phone ??
      source.lead?.mobile ??
      source.phone ??
      source.mobile ??
      source.customer?.phone ??
      source.customer?.mobile;

    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  return "";
};





const toNumber = (value: unknown, fallback = 0) => {
  if (value === null || value === undefined) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toIsoDate = (value: unknown) => {
  if (!value) return null;
  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
};

const toDisplayDate = (value?: string) => {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
};

const toIsoDateOnly = (value?: string | null) => {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().split("T")[0];
};

const matchesQuickFilter = (quickFilter: QuickFilter, tx: Transaction) => {
  switch (quickFilter) {
    case "ALL":
      return true;
    case "ACTIVE":
      return tx.status === "pending";
    case "COMPLETED":
      return tx.status === "completed";
    case "PENDING":
      return tx.status === "pending";
    case "FAILED":
      return tx.status === "failed";
    case "REFUNDED":
      return tx.status === "refunded";
    default:
      return true;
  }
};

const mapApiStatusToTx = (value?: string): TxStatus => {
  switch ((value ?? "").toUpperCase()) {
    case "FULL":
      return "completed";
    case "REFUNDED":
      return "refunded";
    case "PARTIAL":
    case "PENDING":
    default:
      return "pending";
  }
};

const mapTxStatusToApi = (value?: TxStatus) => {
  switch (value) {
    case "completed":
      return "FULL";
    case "refunded":
      return "REFUNDED";
    case "failed":
      return "PENDING";
    case "pending":
    default:
      return "PENDING";
  }
};

const mapApiModeToTx = (value?: string): PaymentMode => {
  switch ((value ?? "").toUpperCase()) {
    case "CASH":
      return "cash";
    case "CARD":
      return "card";
    case "PAYMENT_GATEWAY":
    case "UPI":
    case "GATEWAY":
      return "online";
    case "BANK_TRANSFER":
    case "BANK":
    default:
      return "bank";
  }
};

const formatDetailDate = (value?: string) => {
  if (!value) return "N/A";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value.trim(),
  );

const readUserLabel = (user: any): string => {
  const name = String(user?.fullName ?? user?.full_name ?? user?.name ?? "").trim();
  if (name) return name;
  return String(user?.email ?? "").trim();
};

const getPaymentModeLabel = (mode: PaymentMode) => {
  switch (mode) {
    case "cash":
      return "Cash";
    case "card":
      return "Card";
    case "online":
      return "Online / Gateway";
    case "cheque":
      return "Cheque";
    case "bank":
    default:
      return "Bank Transfer";
  }
};

const resolveVerifierDisplayName = async (
  verifiedBy?: string,
  verifiedByName?: string,
) => {
  const label = String(verifiedByName ?? "").trim();
  if (label && !isUuid(label)) return label;

  const userId = String(verifiedBy ?? "").trim();
  if (!userId || !isUuid(userId)) {
    return label || userId || undefined;
  }

  try {
    const res = await usersApi.getById(userId);
    const payload = unwrapData<any>(res);
    const user = payload?.data ?? payload;
    return readUserLabel(user) || label || undefined;
  } catch {
    return label || undefined;
  }
};

const mapTxModeToApi = (value?: PaymentMode) => {
  switch (value) {
    case "cash":
      return "CASH";
    case "card":
      return "CARD";
    case "online":
      return "PAYMENT_GATEWAY";
    case "cheque":
      return "BANK_TRANSFER";
    case "bank":
    default:
      return "BANK_TRANSFER";
  }
};

const mapPaymentToTransaction = (row: any): Transaction => {
  const bookingId = String(row?.bookingId ?? row?.booking_id ?? "N/A");
  const bookingNumber = String(
    row?.bookingNumber ?? row?.booking_number ?? "",
  ).trim();
  const paidAt =
    row?.paidAt ?? row?.paid_at ?? row?.createdAt ?? row?.created_at ?? null;
  const customerId =
    row?.customerId ??
    row?.customer_id ??
    row?.customer?.id ??
    row?.customer?.customerId ??
    row?.customer?.customer_id ??
    null;
  const leadId =
    row?.leadId ??
    row?.lead_id ??
    row?.lead?.id ??
    row?.lead?.leadId ??
    row?.lead?.lead_id ??
    null;
  const leadSnapshot = row?.lead ?? null;
  const leadCountry =
    row?.leadCountry ??
    row?.lead_country ??
    leadSnapshot?.leadCountry ??
    leadSnapshot?.lead_country ??
    null;
  const customerName =
    row?.customerName ??
    row?.customer_name ??
    pickCustomerName(row, row?.customer, leadSnapshot);
  return {
    id: String(row?.id ?? ""),
    referenceId:
      row?.paymentReference ??
      row?.payment_reference ??
      row?.gatewayPaymentId ??
      row?.gateway_payment_id ??
      row?.gatewayOrderId ??
      row?.gateway_order_id ??
      "",
    date: toDisplayDate(paidAt ?? row?.createdAt ?? row?.created_at),
    customer: customerName || row?.customer || "Unknown",
    customerEmail:
      (row?.customerEmail ??
        row?.customer_email ??
        pickCustomerEmail(row, row?.customer, leadSnapshot)) ||
      undefined,
    customerPhone:
      (row?.customerPhone ??
        row?.customer_phone ??
        pickCustomerPhone(row, row?.customer, leadSnapshot)) ||
      undefined,
    customerId: customerId ? String(customerId) : undefined,
    leadId: leadId ? String(leadId) : undefined,
    bookingId,
    bookingLabel: bookingNumber || bookingId,
    amount: toNumber(row?.amount, 0),
    currency: row?.currency || 'INR',
    leadCountry,
    mode: mapApiModeToTx(row?.paymentMode ?? row?.payment_mode),
    status: mapApiStatusToTx(row?.status),
    paidAt: paidAt ?? undefined,
    verifiedAt: row?.verifiedAt ?? row?.verified_at ?? undefined,
    verifiedBy: row?.verifiedBy ?? row?.verified_by ?? undefined,
    verifiedByName:
      readUserLabel(row?.verifiedByUser ?? row?.verified_by_user) ||
      String(row?.verifiedByName ?? row?.verified_by_name ?? "").trim() ||
      undefined,
    paymentReference: row?.paymentReference ?? row?.payment_reference,
    gatewayOrderId: row?.gatewayOrderId ?? row?.gateway_order_id,
    gatewayPaymentId: row?.gatewayPaymentId ?? row?.gateway_payment_id,
    gatewaySignature: row?.gatewaySignature ?? row?.gateway_signature,
    proofUrl: row?.proofUrl ?? row?.proof_url,
    invoiceUrl:
      row?.invoiceUrl ??
      row?.invoice_url ??
      row?.invoiceDocument ??
      row?.invoice_document ??
      row?.invoiceAttachment?.data ??
      row?.invoiceAttachment?.content ??
      row?.invoiceAttachment?.base64 ??
      row?.invoice_attachment?.data ??
      row?.invoice_attachment?.content ??
      row?.invoice_attachment?.base64 ??
      row?.proofUrl ??
      row?.proof_url,
    notes: row?.notes,
    createdAt: row?.createdAt ?? row?.created_at,
    updatedAt: row?.updatedAt ?? row?.updated_at,
  };
};

const hasResolvedBookingLabel = (
  tx: Pick<Transaction, "bookingId" | "bookingLabel">,
) => {
  const label = String(tx.bookingLabel ?? "").trim();
  const bookingId = String(tx.bookingId ?? "").trim();
  if (!label || !bookingId) return false;
  if (label === bookingId) return false;
  return true;
};

type PaymentBookingOption = {
  id: string;
  bookingNumber: string; 
  customer?: string;
  currency?: string;
  totalAmount?: number;
};

const mapApiBookingToPaymentOption = (booking: any): PaymentBookingOption | null => {
  const id = String(booking?.id ?? "").trim();
  if (!id) return null;
  const totalRaw =
    booking?.totalAmount ??
    booking?.total_amount ??
    booking?.total ??
    booking?.amount ??
    0;
  return {
    id,
    bookingNumber: String(
      booking?.bookingNumber ?? booking?.booking_number ?? id,
    ).trim(),
    customer: pickCustomerName(booking) || undefined,
    currency: String(
      booking?.clientCurrency ??
        booking?.client_currency ??
        booking?.currency ??
        "INR",
    ).toUpperCase(),
    totalAmount: Number(totalRaw) || 0,
  };
};

const BOOKING_SEARCH_PAGE_SIZE = 50;
const BOOKING_OPTIONS_CACHE_TTL_MS = 5 * 60 * 1000;

let paymentBookingOptionsCache: {
  items: PaymentBookingOption[];
  fetchedAt: number;
} | null = null;
let paymentBookingOptionsInflight: Promise<PaymentBookingOption[]> | null = null;

const rowsToPaymentBookingOptions = (rows: unknown[]) =>
  rows
    .map((row) => mapApiBookingToPaymentOption(row))
    .filter(
      (item: PaymentBookingOption | null): item is PaymentBookingOption =>
        item !== null,
    );

async function fetchPaymentBookingOptions(
  search?: string,
): Promise<PaymentBookingOption[]> {
  const term = search?.trim() ?? "";
  if (
    !term &&
    paymentBookingOptionsCache &&
    Date.now() - paymentBookingOptionsCache.fetchedAt <
      BOOKING_OPTIONS_CACHE_TTL_MS
  ) {
    return paymentBookingOptionsCache.items;
  }

  if (!term && paymentBookingOptionsInflight) {
    return paymentBookingOptionsInflight;
  }

  const request = (async () => {
    const response = await bookingsApi.paymentOptions({
      limit: BOOKING_SEARCH_PAGE_SIZE,
      ...(term.length >= 2 ? { search: term } : {}),
    });
    return rowsToPaymentBookingOptions(unwrapList(response));
  })();

  if (!term) {
    paymentBookingOptionsInflight = request;
  }

  try {
    const items = await request;
    if (!term) {
      paymentBookingOptionsCache = { items, fetchedAt: Date.now() };
    }
    return items;
  } finally {
    if (!term) {
      paymentBookingOptionsInflight = null;
    }
  }
}

// Toast Component
const Toast = ({
  message,
  type,
}: {
  message: string;
  type: "success" | "error" | "info";
  onClose: () => void;
}) => (
  <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 animate-fadeIn">
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border ${
        type === "success" ?
          "bg-green-50 border-green-200 dark:bg-green-900/30 dark:border-green-800"
        : type === "error" ?
          "bg-red-50 border-red-200 dark:bg-red-900/30 dark:border-red-800"
        : "bg-blue-50 border-blue-200 dark:bg-blue-900/30 dark:border-blue-800"
      }`}
    >
      {type === "success" ?
        <FaCircleCheck className="text-green-600 dark:text-green-400" />
      : type === "error" ?
        <FaXmark className="text-red-600 dark:text-red-400" />
      : <FaEye className="text-blue-600 dark:text-blue-400" />}
      <p
        className={`text-sm font-medium ${
          type === "success" ? "text-green-800 dark:text-green-300"
          : type === "error" ? "text-red-800 dark:text-red-300"
          : "text-blue-800 dark:text-blue-300"
        }`}
      >
        {message}
      </p>
    </div>
  </div>
);

// Verify Modal - Complete as per document specs
const VerifyModal = ({
  isOpen,
  transaction,
  onConfirm,
  onCancel,
}: {
  isOpen: boolean;
  transaction: Transaction | null;
  onConfirm: (data: PaymentVerificationData) => void | Promise<void>;
  onCancel: () => void;
}) => {
  const [paidAt, setPaidAt] = useState(
    new Date().toISOString().split("T")[0] +
      "T" +
      new Date().toTimeString().slice(0, 5),
  );
  const [status, setStatus] = useState<"completed" | "failed">("completed");
  const [proofUrl, setProofUrl] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [gatewayPaymentId, setGatewayPaymentId] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const verificationStatusOptions = useMemo(
    () => [
      { value: "completed", label: "Completed" },
      { value: "failed", label: "Failed" },
    ],
    [],
  );

  if (!isOpen || !transaction) return null;

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!paidAt) newErrors.paidAt = "Paid at is required";
    if (status === "completed" && !paymentReference) {
      newErrors.paymentReference =
        "Payment reference is required for completed payments";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      await Promise.resolve(
        onConfirm({
          paidAt,
          status,
          proofUrl: proofUrl || undefined,
          paymentReference: paymentReference || undefined,
          gatewayPaymentId: gatewayPaymentId || undefined,
          notes: notes || undefined,
        }),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
              <FaCircleCheck className="text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Verify Payment - {transaction.referenceId}
            </h3>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600"
          >
            <FaXmark className="text-xl" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Transaction Info */}
          <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Customer</span>
              <span className="text-sm font-medium text-gray-900">
                {transaction.customer}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Booking</span>
              <span className="text-sm font-medium text-gray-900">
                {transaction.bookingLabel || transaction.bookingId}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Amount</span>
              <span className="text-sm font-bold text-gray-900">
                {formatCurrency(Math.abs(transaction.amount), transaction.currency || 'INR')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Mode</span>
              <span className="text-sm font-medium text-gray-900 capitalize">
                {transaction.mode}
              </span>
            </div>
          </div>

          {/* Verification Form - As per document specs */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Verification Details
            </h4>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="field-label">Paid At *</label>
                <input
                  type="datetime-local"
                  value={paidAt}
                  onChange={(e) => setPaidAt(e.target.value)}
                  className={`field-input ${
                    errors.paidAt ? "border-red-500" : ""
                  }`}
                />
                {errors.paidAt && (
                  <p className="text-xs text-red-500 mt-1">{errors.paidAt}</p>
                )}
              </div>
              <div>
                <label className="field-label">Status *</label>
                <SearchableDropdown
                  value={status}
                  options={verificationStatusOptions}
                  onChange={(value) =>
                    setStatus(value as "completed" | "failed")
                  }
                  searchPlaceholder="Search verification status..."
                />
              </div>
            </div>

            <div>
              <label className="field-label">
                Payment Reference {status === "completed" && "*"}
              </label>
              <input
                type="text"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                className={`field-input ${
                  errors.paymentReference ? "border-red-500" : ""
                }`}
                placeholder="e.g., NEFT-12345, CARD-8902"
              />
              {errors.paymentReference && (
                <p className="text-xs text-red-500 mt-1">
                  {errors.paymentReference}
                </p>
              )}
            </div>

            <div>
              <label className="field-label">Gateway Payment ID</label>
              <input
                type="text"
                value={gatewayPaymentId}
                onChange={(e) => setGatewayPaymentId(e.target.value)}
                className="field-input"
                placeholder="e.g., PAY-789012"
              />
            </div>

            <div>
              <label className="field-label">Proof URL</label>
              <input
                type="url"
                value={proofUrl}
                onChange={(e) => setProofUrl(e.target.value)}
                className="field-input"
                placeholder="https://example.com/proof.pdf"
              />
              <p className="text-xs text-gray-500 mt-1">
                Link to payment receipt, screenshot, or document
              </p>
            </div>

            <div>
              <label className="field-label">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="field-input"
                placeholder="Any additional notes about this payment..."
              />
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 p-4 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <LoadingButton
            onClick={() => {
              void handleSubmit();
            }}
            loading={submitting}
            loadingLabel="Verifying..."
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            Verify Payment
          </LoadingButton>
        </div>
      </div>
    </div>
  );
};

// Add/Edit Payment Modal - Complete as per document specs
const PaymentFormModal = ({
  isOpen,
  transaction,
  onSave,
  onCancel,
}: {
  isOpen: boolean;
  transaction: Transaction | null;
  onSave: (data: any) => void | Promise<void>;
  onCancel: () => void;
}) => {
  const buildFormData = (tx: Transaction | null) => ({
    customer: tx?.customer || "",
    bookingId: tx?.bookingId || "",
    amount: tx?.amount ? Math.abs(tx.amount).toString() : "",
    mode: tx?.mode || "bank",
    referenceId: tx?.paymentReference || tx?.referenceId || "",
    paymentReference: tx?.paymentReference || "",
    gatewayOrderId: tx?.gatewayOrderId || "",
    gatewayPaymentId: tx?.gatewayPaymentId || "",
    gatewaySignature: tx?.gatewaySignature || "",
    proofUrl: tx?.proofUrl || "",
    status: tx?.status || "pending",
    notes: tx?.notes || "",
    date:
      tx?.date ||
      new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
      }),
  });

  const [formData, setFormData] = useState(() => buildFormData(transaction));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [currency, setCurrency] = useState(transaction?.currency || 'INR');
  const [bookings, setBookings] = useState<PaymentBookingOption[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [bookingSearchError, setBookingSearchError] = useState("");
  const [selectedBookingMeta, setSelectedBookingMeta] =
    useState<PaymentBookingOption | null>(null);
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [invoiceUploadError, setInvoiceUploadError] = useState("");
  const invoiceInputRef = useRef<HTMLInputElement | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofUploadError, setProofUploadError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const proofInputRef = useRef<HTMLInputElement | null>(null);
  const currencyOptions = useMemo(() => getCurrencyOptions(false), []);
  const mergeBookingOptions = useCallback((incoming: PaymentBookingOption[]) => {
    if (!incoming.length) return;
    setBookings((prev) => {
      const byId = new Map(prev.map((item) => [item.id, item]));
      incoming.forEach((item) => {
        if (item.id) byId.set(item.id, item);
      });
      return Array.from(byId.values());
    });
  }, []);
  const loadRecentBookings = useCallback(async () => {
    setLoadingBookings(true);
    setBookingSearchError("");
    try {
      const next = await fetchPaymentBookingOptions();
      mergeBookingOptions(next);
    } catch (err) {
      console.error("Failed to load recent bookings:", err);
      setBookingSearchError("Failed to load bookings. Try searching again.");
    } finally {
      setLoadingBookings(false);
    }
  }, [mergeBookingOptions]);
  const searchBookings = useCallback(
    async (query: string) => {
      const term = query.trim();
      if (term.length < 2) return;
      setLoadingBookings(true);
      setBookingSearchError("");
      try {
        const next = await fetchPaymentBookingOptions(term);
        mergeBookingOptions(next);
      } catch (err) {
        console.error("Failed to search bookings:", err);
        setBookingSearchError("Booking search failed. Please retry.");
      } finally {
        setLoadingBookings(false);
      }
    },
    [mergeBookingOptions],
  );
  const hydrateSelectedBooking = useCallback(
    async (bookingId: string) => {
      const normalizedId = bookingId.trim();
      if (!normalizedId) {
        setSelectedBookingMeta(null);
        return;
      }
      try {
        const response = await bookingsApi.getById(normalizedId);
        const mapped = mapApiBookingToPaymentOption(unwrapData(response));
        if (!mapped) return;
        setSelectedBookingMeta(mapped);
        mergeBookingOptions([mapped]);
        if (mapped.currency) {
          setCurrency(String(mapped.currency).toUpperCase());
        }
      } catch (err) {
        console.error("Failed to load booking details:", err);
      }
    },
    [mergeBookingOptions],
  );
  const bookingDropdownOptions = useMemo(() => {
    const selectedId = formData.bookingId?.trim();
    const rows = [...bookings];
    if (
      selectedBookingMeta &&
      selectedId &&
      !rows.some((booking) => booking.id === selectedId)
    ) {
      rows.unshift(selectedBookingMeta);
    }
    const bookingOptions = rows.map((booking) => {
      const customerName = booking.customer || "Unknown Customer";
      const bookingLabel = booking.bookingNumber || booking.id;
      return {
        value: booking.id,
        label: `${customerName} · ${bookingLabel}`,
        leftLabel: customerName,
        rightLabel: bookingLabel,
        selectedLabel: `${customerName} · ${bookingLabel}`,
        searchText: `${customerName} ${bookingLabel} ${booking.id}`.trim(),
      };
    });
    return [
      {
        value: "",
        label:
          loadingBookings ? "Loading bookings..." : "Select booking...",
      },
      ...bookingOptions,
    ];
  }, [bookings, formData.bookingId, loadingBookings, selectedBookingMeta]);
  const selectedBooking = useMemo(() => {
    const selectedId = formData.bookingId?.trim();
    if (!selectedId) return null;
    if (selectedBookingMeta?.id === selectedId) return selectedBookingMeta;
    return bookings.find((booking) => booking.id === selectedId) ?? null;
  }, [bookings, formData.bookingId, selectedBookingMeta]);
  const selectedBookingTotal = useMemo(() => {
    if (!selectedBooking) return null;
    const total = Number(selectedBooking.totalAmount ?? 0);
    return Number.isFinite(total) && total > 0 ? total : null;
  }, [selectedBooking]);
  const paymentModeOptions = useMemo(
    () => [
      { value: "bank", label: "Bank Transfer" },
      { value: "card", label: "Card" },
      { value: "cash", label: "Cash" },
      { value: "cheque", label: "Cheque" },
      { value: "online", label: "Online" },
    ],
    [],
  );
  const paymentStatusOptions = useMemo(
    () => [
      { value: "pending", label: "Pending" },
      { value: "completed", label: "Completed" },
      { value: "failed", label: "Failed" },
    ],
    [],
  );

  const clearInvoiceSelection = useCallback(() => {
    setInvoiceFile(null);
    setInvoiceUploadError("");
    if (invoiceInputRef.current) {
      invoiceInputRef.current.value = "";
    }
  }, []);

  const clearProofSelection = useCallback(() => {
    setProofFile(null);
    setProofUploadError("");
    if (proofInputRef.current) {
      proofInputRef.current.value = "";
    }
  }, []);

  useEffect(() => {
    if (!isOpen) {
      clearInvoiceSelection();
      clearProofSelection();
    }
  }, [isOpen, clearInvoiceSelection, clearProofSelection]);

  useEffect(() => {
    if (!isOpen) return;
    clearInvoiceSelection();
    clearProofSelection();
    setErrors({});
    setSelectedBookingMeta(null);

    if (transaction) {
      setFormData(buildFormData(transaction));
      setCurrency(transaction.currency || "INR");
      const bookingId = String(transaction.bookingId || "").trim();
      if (bookingId) {
        void hydrateSelectedBooking(bookingId);
      }
    } else {
      const referenceId = generatePaymentReferenceId();
      setFormData({
        ...buildFormData(null),
        referenceId,
        paymentReference: referenceId,
      });
      setCurrency("INR");
    }

    if (!transaction && bookings.length === 0) {
      void loadRecentBookings();
    }
  }, [
    isOpen,
    transaction,
    bookings.length,
    clearInvoiceSelection,
    clearProofSelection,
    loadRecentBookings,
    hydrateSelectedBooking,
  ]);

  const currencyLocked = Boolean(formData.bookingId.trim());

  const handleInvoiceFileChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf" && !file.type.startsWith("image/")) {
      setInvoiceUploadError("Upload a PDF or image for invoice");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_INVOICE_FILE_SIZE) {
      setInvoiceUploadError("Invoice must be 5 MB or smaller");
      event.target.value = "";
      return;
    }

    setInvoiceUploadError("");
    setInvoiceFile(file);
  };

  const handleProofFileChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf" && !file.type.startsWith("image/")) {
      setProofUploadError("Upload a PDF or image as proof");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_INVOICE_FILE_SIZE) {
      setProofUploadError("Proof must be 5 MB or smaller");
      event.target.value = "";
      return;
    }

    setProofUploadError("");
    setProofFile(file);
  };

  if (!isOpen) return null;

  const currentInvoiceLink = transaction?.invoiceUrl;
  const currentProofLink = transaction?.proofUrl;

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.bookingId) newErrors.bookingId = "Booking is required";
    if (!formData.amount) newErrors.amount = "Amount is required";
    const parsedAmount = Number(formData.amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0)
      newErrors.amount = "Amount must be positive";
    if (
      Number.isFinite(parsedAmount) &&
      parsedAmount > 0 &&
      selectedBookingTotal !== null &&
      parsedAmount > selectedBookingTotal
    ) {
      newErrors.amount = `Amount cannot exceed ${selectedBookingTotal.toFixed(
        2,
      )}`;
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    let invoiceAttachment:
      | {
          name: string;
          type: string;
          size: number;
          data: string;
        }
      | undefined;
    let proofAttachment:
      | {
          name: string;
          type: string;
          size: number;
          data: string;
        }
      | undefined;

    if (invoiceFile) {
      try {
        const base64 = await fileToBase64(invoiceFile);
        invoiceAttachment = {
          name: invoiceFile.name,
          type: invoiceFile.type,
          size: invoiceFile.size,
          data: base64,
        };
      } catch (error) {
        console.error("Failed to process invoice PDF", error);
        setInvoiceUploadError(
          "Unable to read the invoice PDF. Please try again.",
        );
        return;
      }
    }

    if (proofFile) {
      try {
        const base64 = await fileToBase64(proofFile);
        proofAttachment = {
          name: proofFile.name,
          type: proofFile.type,
          size: proofFile.size,
          data: base64,
        };
      } catch (error) {
        console.error("Failed to process payment proof", error);
        setProofUploadError("Unable to read the proof file. Please try again.");
        return;
      }
    }

    const now = new Date().toISOString();
    const resolvedPaymentReference =
      String(formData.paymentReference || formData.referenceId || "").trim();

    setSubmitting(true);
    try {
      await Promise.resolve(
        onSave({
          ...formData,
          currency,
          paymentReference: resolvedPaymentReference || undefined,
          referenceId: resolvedPaymentReference,
          amount:
            parseFloat(formData.amount) *
            (transaction?.amount && transaction.amount < 0 ? -1 : 1),
          id: transaction?.id || `tx-${Date.now()}`,
          createdAt: transaction?.createdAt || now,
          updatedAt: now,
          invoiceFile,
          proofFile,
          invoiceAttachment,
          proofAttachment,
        }),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 p-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {transaction ? "Edit Payment" : "Add New Payment"}
          </h3>
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-60"
          >
            <FaXmark className="text-xl" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Basic Info */}
          <div className={transaction ? "grid grid-cols-2 gap-4" : ""}>
            {transaction ?
              <div>
                <label className="field-label">Customer</label>
                <input
                  type="text"
                  value={transaction.customer || formData.customer}
                  readOnly
                  className="field-input bg-gray-50 cursor-not-allowed"
                  placeholder="Customer"
                />
              </div>
            : null}
            <div className={transaction ? "" : "w-full"}>
              <label className="field-label">Booking *</label>
              {transaction ?
                <input
                  type="text"
                  value={
                    transaction.bookingLabel ||
                    transaction.bookingId ||
                    formData.bookingId
                  }
                  readOnly
                  className={`field-input ${
                    errors.bookingId ? "border-red-500" : ""
                  } bg-gray-50 cursor-not-allowed`}
                  placeholder="BK-XXXX"
                />
              : <SearchableDropdown
                  value={formData.bookingId}
                  onChange={(value) => {
                    setFormData({ ...formData, bookingId: value });
                    if (!value) {
                      setSelectedBookingMeta(null);
                      setCurrency("INR");
                      return;
                    }
                    const nextBooking =
                      bookings.find((booking) => booking.id === value) || null;
                    if (nextBooking) {
                      setSelectedBookingMeta(nextBooking);
                      if (nextBooking.currency) {
                        setCurrency(String(nextBooking.currency).toUpperCase());
                      }
                    } else {
                      void hydrateSelectedBooking(value);
                    }
                  }}
                  options={bookingDropdownOptions}
                  hasError={Boolean(errors.bookingId)}
                  searchPlaceholder="Booking number or ID (min 2 chars)..."
                  disabled={loadingBookings}
                  onSearch={searchBookings}
                  onMenuOpen={() => {
                    if (bookings.length === 0 && !loadingBookings) {
                      void loadRecentBookings();
                    }
                  }}
                />
              }
              {errors.bookingId && (
                <p className="text-xs text-red-500 mt-1">{errors.bookingId}</p>
              )}
              {bookingSearchError ?
                <p className="text-xs text-red-500 mt-1">{bookingSearchError}</p>
              : null}
              {!transaction && !bookingSearchError ?
                <p className="text-xs text-gray-500 mt-1">
                  Open the list for recent bookings, or type 2+ characters to
                  search large booking catalogs.
                </p>
              : null}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
          
            <div>
              <label className="field-label">Amount *</label>
              <input
                type="number"
                value={formData.amount}
                onChange={(e) =>
                  setFormData({ ...formData, amount: e.target.value })
                }
                className={`field-input ${
                  errors.amount ? "border-red-500" : ""
                }`}
                placeholder="0.00"
                min="0"
                max={selectedBookingTotal ?? undefined}
                step="0.01"
              />
              {errors.amount && (
                <p className="text-xs text-red-500 mt-1">{errors.amount}</p>
              )}
              {selectedBookingTotal !== null && (
                <p className="text-xs text-gray-500 mt-1">
                  Max payable amount: {selectedBookingTotal.toLocaleString()}
                </p>
              )}
            </div>
            <div>
              <label className="field-label">Currency</label>
              <SearchableDropdown
                value={currency}
                options={currencyOptions}
                onChange={(value) => setCurrency(value)}
                searchPlaceholder="Search currency..."
                disabled={currencyLocked}
              />
              {currencyLocked ?
                <p className="text-xs text-gray-500 mt-1">
                  Currency comes from the booking and cannot be changed.
                </p>
              : null}
            </div>
            <div>
              <label className="field-label">Payment Mode</label>
              <SearchableDropdown
                value={formData.mode}
                options={paymentModeOptions}
                onChange={(value) =>
                  setFormData({
                    ...formData,
                    mode: value as PaymentMode,
                  })
                }
                searchPlaceholder="Search payment mode..."
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="field-label">Reference ID</label>
              <input
                type="text"
                value={formData.referenceId}
                onChange={(e) =>
                  setFormData({ ...formData, referenceId: e.target.value })
                }
                readOnly={!transaction}
                className={`field-input ${
                  !transaction ? "bg-gray-50 cursor-not-allowed" : ""
                }`}
                placeholder="PAY-XXXX"
              />
              {!transaction ?
                <p className="text-xs text-gray-500 mt-1">
                  Auto-generated reference for this payment.
                </p>
              : null}
            </div>
            <div>
              <label className="field-label">Status</label>
              <SearchableDropdown
                value={formData.status}
                options={paymentStatusOptions}
                onChange={(value) =>
                  setFormData({
                    ...formData,
                    status: value as TxStatus,
                  })
                }
                searchPlaceholder="Search payment status..."
              />
            </div>
          </div>

          <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Attachments
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                <p className="text-sm font-semibold text-gray-800 mb-2">
                  Invoice Attachment
                </p>
                <div className="space-y-3">
                  {invoiceFile ?
                    <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                      <div>
                        <p className="text-sm font-medium text-gray-800">
                          {invoiceFile.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatFileSize(invoiceFile.size)}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="text-xs font-semibold text-red-600 hover:underline"
                        onClick={clearInvoiceSelection}
                      >
                        Remove
                      </button>
                    </div>
                  : <p className="text-sm text-gray-500">
                      Upload the finalized invoice file (PDF or image, max 5 MB).
                    </p>
                  }

                  {currentInvoiceLink && !invoiceFile && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                      <p className="font-medium">
                        Invoice file already uploaded.
                      </p>
                      <p className="text-xs text-amber-700">
                        Replace it with a new PDF?
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-3">
                        <a
                          href={currentInvoiceLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-semibold text-blue-600 hover:underline"
                        >
                          View current invoice
                        </a>
                        <button
                          type="button"
                          className="text-xs font-semibold text-amber-900 hover:underline"
                          onClick={() => invoiceInputRef.current?.click()}
                        >
                          Upload new file
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-3">
                    <label
                      htmlFor="invoice-upload"
                      className="inline-flex cursor-pointer items-center rounded-lg border border-dashed border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-blue-500 hover:text-blue-600"
                    >
                      Upload File
                    </label>
                    <input
                      id="invoice-upload"
                      ref={invoiceInputRef}
                      type="file"
                      accept="application/pdf,image/*"
                      className="hidden"
                      onChange={handleInvoiceFileChange}
                    />
                  </div>

                  {invoiceUploadError && (
                    <p className="text-xs text-red-500">{invoiceUploadError}</p>
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                <p className="text-sm font-semibold text-gray-800 mb-2">
                  Payment Proof
                </p>
                <div className="space-y-3">
                  {proofFile ?
                    <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                      <div>
                        <p className="text-sm font-medium text-gray-800">
                          {proofFile.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatFileSize(proofFile.size)}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="text-xs font-semibold text-red-600 hover:underline"
                        onClick={clearProofSelection}
                      >
                        Remove
                      </button>
                    </div>
                  : <p className="text-sm text-gray-500">
                      Upload payment proof (PDF or image, max 5 MB).
                    </p>
                  }

                  {currentProofLink && !proofFile && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                      <p className="font-medium">Proof already uploaded.</p>
                      <p className="text-xs text-amber-700">
                        Replace it with a new file?
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-3">
                        <a
                          href={currentProofLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-semibold text-blue-600 hover:underline"
                        >
                          View current proof
                        </a>
                        <button
                          type="button"
                          className="text-xs font-semibold text-amber-900 hover:underline"
                          onClick={() => proofInputRef.current?.click()}
                        >
                          Upload new file
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-3">
                    <label
                      htmlFor="proof-upload"
                      className="inline-flex cursor-pointer items-center rounded-lg border border-dashed border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-blue-500 hover:text-blue-600"
                    >
                      Upload Proof
                    </label>
                    <input
                      id="proof-upload"
                      ref={proofInputRef}
                      type="file"
                      accept="application/pdf,image/*"
                      className="hidden"
                      onChange={handleProofFileChange}
                    />
                  </div>

                  {proofUploadError && (
                    <p className="text-xs text-red-500">{proofUploadError}</p>
                  )}
                </div>
              </div>
            </div>

            {formData.notes !== undefined && (
              <div className="mt-4">
                <label className="field-label">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  rows={3}
                  className="field-input"
                  placeholder="Additional notes..."
                />
              </div>
            )}
          </div>
        </div>

        <div className="sticky bottom-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 p-4 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-60"
          >
            Cancel
          </button>
          <LoadingButton
            onClick={() => {
              void handleSubmit();
            }}
            loading={submitting}
            loadingLabel={transaction ? "Updating..." : "Saving..."}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            {transaction ? "Update Payment" : "Add Payment"}
          </LoadingButton>
        </div>
      </div>
    </div>
  );
};

// Details Modal
const DetailsModal = ({
  isOpen,
  transaction,
  onClose,
  onVerify,
  onEdit,
}: {
  isOpen: boolean;
  transaction: Transaction | null;
  onClose: () => void;
  onVerify: () => void;
  onEdit: () => void;
}) => {
  const [showInvoicePreview, setShowInvoicePreview] = useState(false);
  const [verifiedByDisplay, setVerifiedByDisplay] = useState("");

  const invoiceLink = transaction?.invoiceUrl ?? transaction?.proofUrl;
  const invoicePreviewSrc = useMemo(() => {
    if (!invoiceLink) return null;
    if (
      invoiceLink.startsWith("http://") ||
      invoiceLink.startsWith("https://") ||
      invoiceLink.startsWith("data:") ||
      invoiceLink.startsWith("blob:")
    ) {
      return invoiceLink;
    }
    return `data:application/pdf;base64,${invoiceLink}`;
  }, [invoiceLink]);

  useEffect(() => {
    let cancelled = false;
    const timeoutId = window.setTimeout(() => {
      if (!isOpen || !transaction) {
        setVerifiedByDisplay("");
        return;
      }

      const preset = String(transaction.verifiedByName ?? "").trim();
      if (preset && !isUuid(preset)) {
        setVerifiedByDisplay(preset);
        return;
      }

      void resolveVerifierDisplayName(
        transaction.verifiedBy,
        transaction.verifiedByName,
      ).then((label) => {
        if (!cancelled) {
          setVerifiedByDisplay(label || "");
        }
      });
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [isOpen, transaction?.id, transaction?.verifiedBy, transaction?.verifiedByName]);

  if (!isOpen || !transaction) return null;

  const showPaymentRef = Boolean(
    transaction.paymentReference &&
      transaction.paymentReference !== transaction.id &&
      !isUuid(transaction.paymentReference),
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 p-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Payment Details 
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <FaXmark className="text-xl" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Status */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Status</span>
            <span
              className={`rounded-full border px-3 py-1 text-xs font-semibold capitalize ${
                statusClasses[transaction.status]
              }`}
            >
              {transaction.status}
            </span>
          </div>

          {/* Amount */}
          <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <p className="text-xs text-gray-500 mb-1">Amount</p>
            <p
              className={`text-lg font-bold ${
                transaction.amount < 0 ?
                  "text-red-600"
                : "text-gray-900 dark:text-gray-100"
              }`}
            >
              {transaction.amount < 0 ? "-" : ""}
              {formatCurrency(
                Math.abs(transaction.amount),
                transaction.currency || "INR",
              )}
            </p>
          </div>
          {/* Transaction Details */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Transaction Details
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                <span className="text-sm text-gray-500">Customer</span>
                <span className="text-sm font-medium text-gray-900">
                  {transaction.customer}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                <span className="text-sm text-gray-500">Booking</span>
                <span className="text-sm font-medium text-gray-900">
                  {transaction.bookingLabel || transaction.bookingId}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                <span className="text-sm text-gray-500">Payment date</span>
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {formatDetailDate(transaction.paidAt || transaction.date)}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                <span className="text-sm text-gray-500">Payment Mode</span>
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {getPaymentModeLabel(transaction.mode)}
                </span>
              </div>
              {showPaymentRef && (
                <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                  <span className="text-sm text-gray-500">Payment Ref</span>
                  <span className="text-sm font-medium text-gray-900">
                    {transaction.paymentReference}
                  </span>
                </div>
              )}
              {transaction.gatewayOrderId && (
                <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                  <span className="text-sm text-gray-500">Gateway Order</span>
                  <span className="text-sm font-medium text-gray-900">
                    {transaction.gatewayOrderId}
                  </span>
                </div>
              )}
              {transaction.gatewayPaymentId && (
                <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                  <span className="text-sm text-gray-500">Gateway Payment</span>
                  <span className="text-sm font-medium text-gray-900">
                    {transaction.gatewayPaymentId}
                  </span>
                </div>
              )}
              {transaction.gatewaySignature && (
                <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                  <span className="text-sm text-gray-500">Signature</span>
                  <span className="text-sm font-medium text-gray-900 truncate max-w-[200px]">
                    {transaction.gatewaySignature}
                  </span>
                </div>
              )}
              {transaction.proofUrl && (
                <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                  <span className="text-sm text-gray-500">Proof</span>
                  <a
                    href={transaction.proofUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                  >
                    <FaReceipt /> View Receipt
                  </a>
                </div>
              )}
              {invoiceLink && (
                <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                  <span className="text-sm text-gray-500">Invoice PDF</span>
                  <button
                    type="button"
                    onClick={() => setShowInvoicePreview(true)}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    View Invoice
                  </button>
                </div>
              )}
              {transaction.notes && (
                <div className="py-2">
                  <span className="text-sm text-gray-500 block mb-1">
                    Notes
                  </span>
                  <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/50 p-2 rounded">
                    {transaction.notes}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Contact Details */}
          {(transaction.customerEmail || transaction.customerPhone) && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Contact Details
              </h4>
              <div className="space-y-2">
                {transaction.customerEmail && (
                  <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                    <span className="text-sm text-gray-500">Email</span>
                    <a
                      href={`mailto:${transaction.customerEmail}`}
                      className="text-sm font-medium text-blue-600 hover:underline"
                    >
                      {transaction.customerEmail}
                    </a>
                  </div>
                )}
                {transaction.customerPhone && (
                  <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                    <span className="text-sm text-gray-500">Phone</span>
                    <a
                      href={`tel:${transaction.customerPhone}`}
                      className="text-sm font-medium text-gray-900"
                    >
                      {transaction.customerPhone}
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Verification Info */}
          {transaction.verifiedAt && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Verification Details
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                  <span className="text-sm text-gray-500">Verified At</span>
                  <span className="text-sm font-medium text-gray-900">
                    {formatDetailDate(transaction.verifiedAt)}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                  <span className="text-sm text-gray-500">Verified By</span>
                  <span className="text-sm font-medium text-gray-900">
                    {verifiedByDisplay || "N/A"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {(transaction.createdAt || transaction.updatedAt) && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {transaction.createdAt ?
                `Created: ${formatDetailDate(transaction.createdAt)}` : ""}
              {transaction.createdAt && transaction.updatedAt ? " · " : ""}
              {transaction.updatedAt ?
                `Updated: ${formatDetailDate(transaction.updatedAt)}` : ""}
            </p>
          )}
        </div>

        <div className="sticky bottom-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 p-4 flex justify-end gap-3">
          {transaction.status === "pending" && (
            <button
              onClick={onVerify}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 flex items-center gap-2"
            >
              <FaCircleCheck /> Verify Payment
            </button>
          )}
          <button
            onClick={onEdit}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <FaEdit /> Edit
          </button>
        </div>
      </div>
      {invoicePreviewSrc && showInvoicePreview && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4">
          <div className="relative w-full max-w-3xl overflow-hidden rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
              <h4 className="text-sm font-semibold text-gray-900">
                Invoice Preview
              </h4>
              <button
                type="button"
                onClick={() => setShowInvoicePreview(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <FaXmark />
              </button>
            </div>
            <div className="h-[70vh] w-full">
              <iframe
                title="Invoice PDF"
                src={invoicePreviewSrc}
                className="h-full w-full"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Payments: React.FC = () => {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState(initialTransactions);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [transactionsError, setTransactionsError] = useState("");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("ALL");
  const [search, setSearch] = useState("");
  const [filterError, setFilterError] = useState("");
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [openingAddPanel, setOpeningAddPanel] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [draftFilters, setDraftFilters] =
    useState<PaymentFilterState>(defaultFilters);
  const [appliedFilters, setAppliedFilters] =
    useState<PaymentFilterState>(defaultFilters);
  const [toast, setToast] = useState<{
    show: boolean;
    message: string;
    type: "success" | "error" | "info";
  }>({
    show: false,
    message: "",
    type: "success",
  });
  const [stats, setStats] = useState({
    currency: "USD",
    baseCurrency: "USD",
    collectedAmount: 0,
    collectedCount: 0,
    outstandingAmount: 0,
    outstandingCount: 0,
    overdueAmount: 0,
    overdueCount: 0,
    refundsAmount: 0,
    refundsCount: 0,
  });
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState("");
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);
  const detailsLoadSeqRef = useRef(0);
  const [showDetails, setShowDetails] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [paymentMarket, setPaymentMarket] = useState<PaymentMarket>("ALL");
  const selectedCurrency = getPaymentMarketCurrency(paymentMarket);

  const pageSize = 15;

  const formatAmount = (value: number) =>
    `${selectedCurrency} ${Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const modeOptions = useMemo(
    () => [
      { value: "ALL", label: "All Modes" },
      { value: "bank", label: "Bank" },
      { value: "card", label: "Card" },
      { value: "cash", label: "Cash" },
      { value: "cheque", label: "Cheque" },
      { value: "online", label: "Online" },
    ],
    [],
  );

  const statusOptions = useMemo(
    () => [
      { value: "ALL", label: "All Statuses" },
      { value: "completed", label: "Completed" },
      { value: "pending", label: "Pending" },
      { value: "failed", label: "Failed" },
    ],
    [],
  );

  const sortOptions = useMemo(
    () => [
      { value: "NEWEST_FIRST", label: "Newest First" },
      { value: "OLDEST_FIRST", label: "Oldest First" },
      { value: "AMOUNT_HIGH_TO_LOW", label: "Amount High-Low" },
      { value: "AMOUNT_LOW_TO_HIGH", label: "Amount Low-High" },
      { value: "CUSTOMER_A_Z", label: "Customer A-Z" },
    ],
    [],
  );

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (appliedFilters.referenceId) count += 1;
    if (appliedFilters.customer) count += 1;
    if (appliedFilters.email) count += 1;
    if (appliedFilters.phone) count += 1;
    if (appliedFilters.bookingId) count += 1;
    if (appliedFilters.mode !== "ALL") count += 1;
    if (appliedFilters.status !== "ALL") count += 1;
    if (appliedFilters.fromDate) count += 1;
    if (appliedFilters.toDate) count += 1;
    if (appliedFilters.minAmount) count += 1;
    if (appliedFilters.maxAmount) count += 1;
    if (appliedFilters.sortBy !== "NEWEST_FIRST") count += 1;
    return count;
  }, [appliedFilters]);

  const updateDraftFilter = <K extends keyof PaymentFilterState>(
    key: K,
    value: PaymentFilterState[K],
  ) => {
    setDraftFilters((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  useEffect(() => {
    if (
      draftFilters.fromDate &&
      draftFilters.toDate &&
      draftFilters.fromDate > draftFilters.toDate
    ) {
      setFilterError("From Date cannot be later than To Date.");
      return;
    }

    const minAmount = Number(draftFilters.minAmount || 0);
    const maxAmount = Number(draftFilters.maxAmount || 0);
    if (
      draftFilters.minAmount &&
      draftFilters.maxAmount &&
      minAmount > maxAmount
    ) {
      setFilterError("Min Amount cannot be greater than Max Amount.");
      return;
    }

    setFilterError("");
    const timer = window.setTimeout(() => {
      setAppliedFilters({
        ...draftFilters,
        referenceId: draftFilters.referenceId.trim(),
        customer: draftFilters.customer.trim(),
        email: draftFilters.email.trim(),
        phone: draftFilters.phone.trim(),
        bookingId: draftFilters.bookingId.trim(),
        minAmount: draftFilters.minAmount.trim(),
        maxAmount: draftFilters.maxAmount.trim(),
      });
      setPage(1);
    }, 250);

    return () => window.clearTimeout(timer);
  }, [draftFilters]);

  const filtered = useMemo(() => {
    return transactions.filter((tx) => {
      if (!paymentCountryMatchesMarket(tx.leadCountry, paymentMarket)) {
        return false;
      }
      if (!matchesQuickFilter(quickFilter, tx)) return false;
      if (
        appliedFilters.status !== "ALL" &&
        tx.status !== appliedFilters.status
      )
        return false;
      if (appliedFilters.mode !== "ALL" && tx.mode !== appliedFilters.mode)
        return false;

      const createdAtIso = toIsoDateOnly(tx.createdAt ?? tx.paidAt ?? null);
      if (
        appliedFilters.fromDate &&
        (!createdAtIso || createdAtIso < appliedFilters.fromDate)
      )
        return false;
      if (
        appliedFilters.toDate &&
        (!createdAtIso || createdAtIso > appliedFilters.toDate)
      )
        return false;

      if (
        appliedFilters.referenceId &&
        !`${tx.referenceId} ${tx.id}`
          .toLowerCase()
          .includes(appliedFilters.referenceId.toLowerCase())
      ) {
        return false;
      }
      if (
        appliedFilters.customer &&
        !String(tx.customer ?? "")
          .toLowerCase()
          .includes(appliedFilters.customer.toLowerCase())
      ) {
        return false;
      }
      if (
        appliedFilters.email &&
        !String(tx.customerEmail ?? "")
          .toLowerCase()
          .includes(appliedFilters.email.toLowerCase())
      ) {
        return false;
      }
      if (
        appliedFilters.phone &&
        !String(tx.customerPhone ?? "")
          .toLowerCase()
          .includes(appliedFilters.phone.toLowerCase())
      ) {
        return false;
      }
      if (
        appliedFilters.bookingId &&
        !`${tx.bookingId} ${tx.bookingLabel ?? ""}`
          .toLowerCase()
          .includes(appliedFilters.bookingId.toLowerCase())
      ) {
        return false;
      }

      const amount = Math.abs(Number(tx.amount || 0));
      if (appliedFilters.minAmount && amount < Number(appliedFilters.minAmount))
        return false;
      if (appliedFilters.maxAmount && amount > Number(appliedFilters.maxAmount))
        return false;

      const query = search.toLowerCase().trim();
      if (!query) return true;
      const createdAtText =
        (tx.createdAt ?? tx.paidAt) ?
          new Date(tx.createdAt ?? tx.paidAt ?? "").toLocaleDateString()
        : "";
      const haystack = [
        tx.referenceId,
        tx.id,
        tx.customer,
        tx.customerEmail ?? "",
        tx.customerPhone ?? "",
        tx.bookingId,
        tx.bookingLabel ?? "",
        tx.status,
        tx.mode,
        createdAtText,
        createdAtIso,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [transactions, search, quickFilter, appliedFilters, paymentMarket]);

  const toTimestamp = (value?: string | null) => {
    if (!value) return 0;
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const ordered = useMemo(
    () =>
      [...filtered].sort((a, b) => {
        if (appliedFilters.sortBy === "AMOUNT_HIGH_TO_LOW") {
          return (
            Math.abs(Number(b.amount || 0)) - Math.abs(Number(a.amount || 0))
          );
        }
        if (appliedFilters.sortBy === "AMOUNT_LOW_TO_HIGH") {
          return (
            Math.abs(Number(a.amount || 0)) - Math.abs(Number(b.amount || 0))
          );
        }
        if (appliedFilters.sortBy === "CUSTOMER_A_Z") {
          return String(a.customer || "").localeCompare(
            String(b.customer || ""),
          );
        }
        if (appliedFilters.sortBy === "OLDEST_FIRST") {
          const left = toTimestamp(a.createdAt ?? a.paidAt);
          const right = toTimestamp(b.createdAt ?? b.paidAt);
          return left - right;
        }
        const left = toTimestamp(a.createdAt ?? a.paidAt);
        const right = toTimestamp(b.createdAt ?? b.paidAt);
        return right - left;
      }),
    [filtered, appliedFilters.sortBy],
  );

  const totalPages = Math.max(1, Math.ceil(ordered.length / pageSize));
  const rows = ordered.slice((page - 1) * pageSize, page * pageSize);

  const handleResetFilters = () => {
    setFilterError("");
    setDraftFilters(defaultFilters);
    setAppliedFilters(defaultFilters);
    setQuickFilter("ALL");
    setSearch("");
    setShowMobileFilters(false);
    setPage(1);
  };

  const exportCurrentTable = () => {
    if (!rows.length) return;

    const headers = [
      "Reference ID",
      "Customer",
      "Email",
      "Phone",
      "Booking ID",
      "Booking",
      "Amount",
      "Mode",
      "Status",
      "Paid At",
      "Created At",
    ];

    const escapeCsv = (value: string) => `"${value.replace(/\"/g, '\"\"')}"`;

    const dataRows = rows.map((tx) => [
      tx.referenceId ?? "",
      tx.customer ?? "",
      tx.customerEmail ?? "",
      tx.customerPhone ?? "",
      tx.bookingId ?? "",
      tx.bookingLabel ?? "",
      tx.amount ?? 0,
      tx.mode ?? "",
      tx.status ?? "",
      tx.paidAt ?? "",
      tx.createdAt ?? "",
    ]);

    const csv = [headers, ...dataRows]
      .map((row) => row.map((cell) => escapeCsv(String(cell))).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `payments-page-${page}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const modeIcon = (mode: Transaction["mode"]) => {
    if (mode === "bank") return <FaBuildingColumns className="text-gray-500" />;
    if (mode === "card") return <FaCreditCard className="text-blue-600" />;
    return <FaMoneyBill className="text-green-600" />;
  };

  const showToast = (message: string, type: "success" | "error" | "info") => {
    setToast({ show: true, message, type });
    setTimeout(
      () => setToast({ show: false, message: "", type: "success" }),
      3000,
    );
  };

  const fetchTransactions = useCallback(async () => {
    setTransactionsLoading(true);
    setTransactionsError("");
    try {
      const res = await paymentsApi.list(
        paymentMarket !== "ALL" ? { market: paymentMarket } : undefined,
      );
      const data = unwrapData<any[]>(res) ?? [];
      const paymentRows = Array.isArray(data) ? data : [];
      setTransactions(paymentRows.map((row) => mapPaymentToTransaction(row)));
    } catch (err) {
      console.error("Failed to load payments:", err);
      setTransactionsError(getApiErrorMessage(err, "Failed to load payments"));
      setTransactions([]);
    } finally {
      setTransactionsLoading(false);
    }
  }, [paymentMarket]);

  const fetchStats = useCallback(async (currencyCode: string) => {
    setStatsLoading(true);
    setStatsError("");
    try {
      const res = await paymentsApi.stats({
        currency: currencyCode,
        ...(paymentMarket !== "ALL" ? { market: paymentMarket } : {}),
      });
      const data = unwrapData<any>(res) ?? {};
      setStats({
        currency: String(data?.currency || currencyCode || "USD").toUpperCase(),
        baseCurrency: String(data?.baseCurrency || currencyCode || "USD").toUpperCase(),
        collectedAmount: Number(data?.collectedAmount ?? 0),
        collectedCount: Number(data?.collectedCount ?? 0),
        outstandingAmount: Number(data?.outstandingAmount ?? 0),
        outstandingCount: Number(data?.outstandingCount ?? 0),
        overdueAmount: Number(data?.overdueAmount ?? 0),
        overdueCount: Number(data?.overdueCount ?? 0),
        refundsAmount: Number(data?.refundsAmount ?? 0),
        refundsCount: Number(data?.refundsCount ?? 0),
      });
    } catch (err) {
      console.error("Failed to load payment stats:", err);
      setStatsError(getApiErrorMessage(err, "Failed to load payment stats"));
    } finally {
      setStatsLoading(false);
    }
  }, [paymentMarket]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const statsPromise = fetchStats(selectedCurrency);
      const transactionsPromise = fetchTransactions();
      await Promise.allSettled([statsPromise, transactionsPromise]);
      if (cancelled) return;
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [fetchTransactions, fetchStats, selectedCurrency]);

  const handleViewDetails = async (tx: Transaction) => {
    const loadSeq = ++detailsLoadSeqRef.current;
    setSelectedTransaction(tx);
    setShowDetails(true);

    const seedHasBooking = hasResolvedBookingLabel(tx);
    const seedHasCustomer =
      Boolean(tx.customer) && tx.customer !== "Unknown";

    try {
      const res = await paymentsApi.getById(tx.id);
      if (loadSeq !== detailsLoadSeqRef.current) return;

      const data = unwrapData<any>(res);
      if (!data) return;

      const fullTx = mapPaymentToTransaction(data);
      const merged: Transaction = { ...tx, ...fullTx };

      if (fullTx.customer === "Unknown" && tx.customer) {
        merged.customer = tx.customer;
      }
      if (!fullTx.customerEmail && tx.customerEmail) {
        merged.customerEmail = tx.customerEmail;
      }
      if (!fullTx.customerPhone && tx.customerPhone) {
        merged.customerPhone = tx.customerPhone;
      }
      if (seedHasBooking && hasResolvedBookingLabel(tx)) {
        merged.bookingLabel = tx.bookingLabel;
      }

      const needsBookingLookup = !seedHasBooking && !hasResolvedBookingLabel(merged);
      const needsCustomerLookup =
        !seedHasCustomer &&
        (merged.customer === "Unknown" || !merged.customer);

      if (needsBookingLookup || needsCustomerLookup) {
        const bookingId = String(
          data?.bookingId ?? data?.booking_id ?? merged.bookingId ?? "",
        ).trim();

        if (bookingId && bookingId !== "N/A") {
          try {
            const bookingRes = await bookingsApi.getById(bookingId);
            if (loadSeq !== detailsLoadSeqRef.current) return;

            const bookingPayload = unwrapData<any>(bookingRes);
            const booking = bookingPayload?.data ?? bookingPayload;
            const bookingNumber = String(
              booking?.bookingNumber ??
                booking?.booking_number ??
                booking?.bookingCode ??
                booking?.booking_code ??
                "",
            ).trim();
            const bookingCustomerName = pickCustomerName(booking, booking?.lead);

            if (needsBookingLookup && bookingNumber) {
              merged.bookingLabel = bookingNumber;
            }
            if (
              needsCustomerLookup &&
              bookingCustomerName &&
              (merged.customer === "Unknown" || !merged.customer)
            ) {
              merged.customer = bookingCustomerName;
            }
          } catch {
            // keep list-row labels when booking lookup fails
          }
        }
      }

      const verifierLabel = await resolveVerifierDisplayName(
        merged.verifiedBy,
        merged.verifiedByName,
      );
      if (loadSeq !== detailsLoadSeqRef.current) return;
      if (verifierLabel) {
        merged.verifiedByName = verifierLabel;
      }

      setSelectedTransaction(merged);
    } catch (err) {
      if (loadSeq !== detailsLoadSeqRef.current) return;
      console.error("Failed to load payment details:", err);
    }
  };

  const handleVerify = () => {
    setShowDetails(false);
    setShowVerifyModal(true);
  };

  const handleVerifyConfirm = async (data: PaymentVerificationData) => {
    if (!selectedTransaction) return;
    try {
      if (data.status === "failed") {
        await paymentsApi.update(selectedTransaction.id, {
          status: "PENDING",
          isVerified: false,
          paidAt: data.paidAt || undefined,
          proofUrl: data.proofUrl || undefined,
          paymentReference: data.paymentReference || undefined,
          gatewayPaymentId: data.gatewayPaymentId || undefined,
        });
        showToast("Payment marked as failed", "info");
      } else {
        await paymentsApi.verify(selectedTransaction.id, {
          status: "FULL",
          paidAt: data.paidAt || undefined,
          proofUrl: data.proofUrl || undefined,
          paymentReference: data.paymentReference || undefined,
          gatewayPaymentId: data.gatewayPaymentId || undefined,
        });
        showToast("Payment verified successfully", "success");
      }
      setShowVerifyModal(false);
      setSelectedTransaction(null);
      await fetchTransactions();
      await fetchStats(selectedCurrency);
    } catch (err) {
      console.error("Failed to verify payment:", err);
      showToast(getApiErrorMessage(err, "Failed to verify payment"), "error");
    }
  };

  const handleEdit = (tx: Transaction) => {
    setSelectedTransaction(tx);
    setShowEditModal(true);
  };

  const handleSaveEdit = async (data: any) => {
    if (!data?.id) return;
    try {
      const hasAttachment = Boolean(data.invoiceFile || data.proofFile);
      if (hasAttachment) {
        const formData = new FormData();
        formData.append("amount", String(toNumber(data.amount, 0)));
	        formData.append("currency", String(data.currency || "INR"));
	        formData.append("paymentMode", mapTxModeToApi(data.mode));
	        formData.append("status", mapTxStatusToApi(data.status));
	        formData.append("isVerified", String(data.status === "completed"));
        if (data.paymentReference) {
          formData.append("paymentReference", data.paymentReference);
        }
        if (data.gatewayOrderId) {
          formData.append("gatewayOrderId", data.gatewayOrderId);
        }
        if (data.gatewayPaymentId) {
          formData.append("gatewayPaymentId", data.gatewayPaymentId);
        }
        if (data.gatewaySignature) {
          formData.append("gatewaySignature", data.gatewaySignature);
        }
        if (data.proofUrl) {
          formData.append("proofUrl", data.proofUrl);
        }
        if (data.invoiceUrl) {
          formData.append("invoiceUrl", data.invoiceUrl);
        }
        if (data.notes) {
          formData.append("notes", data.notes);
        }
        const paidAt = toIsoDate(data.paidAt ?? data.date);
        if (paidAt) {
          formData.append("paidAt", paidAt);
        }
        if (data.proofFile) {
          formData.append("proofFile", data.proofFile, data.proofFile.name);
        }
        if (data.invoiceFile) {
          formData.append("invoiceFile", data.invoiceFile, data.invoiceFile.name);
        }
        await paymentsApi.update(data.id, formData);
      } else {
        await paymentsApi.update(data.id, {
          amount: toNumber(data.amount, 0),
          currency: String(data.currency || "INR"),
          paymentMode: mapTxModeToApi(data.mode),
          paymentReference: data.paymentReference || undefined,
          gatewayOrderId: data.gatewayOrderId || undefined,
          gatewayPaymentId: data.gatewayPaymentId || undefined,
          gatewaySignature: data.gatewaySignature || undefined,
          proofUrl: data.proofUrl || undefined,
	          invoiceUrl: data.invoiceUrl || undefined,
	          status: mapTxStatusToApi(data.status),
	          paidAt: toIsoDate(data.paidAt ?? data.date) || undefined,
	          isVerified: data.status === "completed",
	          notes: data.notes || undefined,
	        });
      }
      let refreshedTx: Transaction | null = null;
      try {
        const res = await paymentsApi.getById(data.id);
        const payload = unwrapData<any>(res);
        if (payload) {
          refreshedTx = mapPaymentToTransaction(payload);
        }
      } catch (err) {
        console.error("Failed to refresh payment after update:", err);
      }
      setTransactions((prev) =>
        prev.map((tx) =>
          tx.id === data.id ?
            {
              ...tx,
              customer: data.customer,
              bookingId: data.bookingId,
              bookingLabel: data.bookingId,
              amount:
                toNumber(data.amount, 0) *
                (selectedTransaction?.amount && selectedTransaction.amount < 0 ?
                  -1
                : 1),
              currency: data.currency || tx.currency || "INR",
              mode: data.mode as PaymentMode,
              referenceId: data.referenceId || tx.referenceId,
              paymentReference: data.paymentReference || tx.paymentReference,
              gatewayOrderId: data.gatewayOrderId || tx.gatewayOrderId,
              gatewayPaymentId: data.gatewayPaymentId || tx.gatewayPaymentId,
              gatewaySignature: data.gatewaySignature || tx.gatewaySignature,
              proofUrl:
                data.proofUrl ||
                data?.proofAttachment?.data ||
                data?.proofAttachment?.content ||
                data?.proofAttachment?.base64 ||
                tx.proofUrl,
              invoiceUrl:
                refreshedTx?.invoiceUrl ||
                data?.invoiceAttachment?.data ||
                data?.invoiceAttachment?.content ||
                data?.invoiceAttachment?.base64 ||
                tx.invoiceUrl,
              status: data.status as TxStatus,
              notes: data.notes || tx.notes,
              updatedAt: data.updatedAt,
            }
          : tx,
        ),
      );
      if (refreshedTx) {
        setSelectedTransaction((current) =>
          current && current.id === data.id ?
            { ...current, ...refreshedTx }
          : current,
        );
      }
      setShowEditModal(false);
      setSelectedTransaction(null);
      showToast("Payment updated successfully", "success");
      await fetchTransactions();
      await fetchStats(selectedCurrency);
    } catch (err) {
      console.error("Failed to update payment:", err);
      showToast(getApiErrorMessage(err, "Failed to update payment"), "error");
    }
  };

  const handleAddPayment = async (data: any) => {
    try {
      const hasAttachment = Boolean(data.invoiceFile || data.proofFile);
      if (hasAttachment) {
        const formData = new FormData();
        formData.append("bookingId", data.bookingId);
        formData.append("amount", String(toNumber(data.amount, 0)));
        formData.append("currency", String(data.currency || "INR"));
        formData.append("paymentMode", mapTxModeToApi(data.mode));
        formData.append("status", mapTxStatusToApi(data.status));
        formData.append("isVerified", String(data.status === "completed"));
        if (data.paymentReference) {
          formData.append("paymentReference", data.paymentReference);
        }
        if (data.gatewayOrderId) {
          formData.append("gatewayOrderId", data.gatewayOrderId);
        }
        if (data.gatewayPaymentId) {
          formData.append("gatewayPaymentId", data.gatewayPaymentId);
        }
        if (data.gatewaySignature) {
          formData.append("gatewaySignature", data.gatewaySignature);
        }
        if (data.proofUrl) {
          formData.append("proofUrl", data.proofUrl);
        }
        if (data.invoiceUrl) {
          formData.append("invoiceUrl", data.invoiceUrl);
        }
        if (data.notes) {
          formData.append("notes", data.notes);
        }
        const paidAt = toIsoDate(data.date);
        if (paidAt) {
          formData.append("paidAt", paidAt);
        }
        if (data.proofFile) {
          formData.append("proofFile", data.proofFile, data.proofFile.name);
        }
        if (data.invoiceFile) {
          formData.append("invoiceFile", data.invoiceFile, data.invoiceFile.name);
        }
        await paymentsApi.create(formData);
      } else {
        await paymentsApi.create({
          bookingId: data.bookingId,
          amount: toNumber(data.amount, 0),
          currency: String(data.currency || "INR"),
          paymentMode: mapTxModeToApi(data.mode),
          paymentReference: data.paymentReference || undefined,
          gatewayOrderId: data.gatewayOrderId || undefined,
          gatewayPaymentId: data.gatewayPaymentId || undefined,
          gatewaySignature: data.gatewaySignature || undefined,
          proofUrl: data.proofUrl || undefined,
          invoiceUrl: data.invoiceUrl || undefined,
          status: mapTxStatusToApi(data.status),
          paidAt: toIsoDate(data.date) || undefined,
          isVerified: data.status === "completed",
          notes: data.notes || undefined,
        });
      }
      setShowAddPanel(false);
      showToast("Payment added successfully", "success");
      await fetchTransactions();
      await fetchStats(selectedCurrency);
    } catch (err) {
      console.error("Failed to add payment:", err);
      showToast(getApiErrorMessage(err, "Failed to add payment"), "error");
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 px-0 sm:px-0 max-w-9xl mx-auto">
      {/* Toast */}
      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() =>
            setToast({ show: false, message: "", type: "success" })
          }
        />
      )}
      {/* Modals */}
      <VerifyModal
        isOpen={showVerifyModal}
        transaction={selectedTransaction}
        onConfirm={handleVerifyConfirm}
        onCancel={() => {
          setShowVerifyModal(false);
          setSelectedTransaction(null);
        }}
      />

      <PaymentFormModal
        key={`edit-${selectedTransaction?.id ?? "none"}-${
          showEditModal ? "open" : "closed"
        }`}
        isOpen={showEditModal}
        transaction={showEditModal ? selectedTransaction : null}
        onSave={handleSaveEdit}
        onCancel={() => {
          setShowEditModal(false);
          setSelectedTransaction(null);
        }}
      />

      <PaymentFormModal
        isOpen={showAddPanel}
        transaction={null}
        onSave={handleAddPayment}
        onCancel={() => setShowAddPanel(false)}
      />

      <DetailsModal
        isOpen={showDetails}
        transaction={selectedTransaction}
        onClose={() => {
          detailsLoadSeqRef.current += 1;
          setShowDetails(false);
          setSelectedTransaction(null);
        }}
        onVerify={handleVerify}
        onEdit={() => {
          setShowDetails(false);
          setShowEditModal(true);
        }}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
            Payments
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            Track transactions, statuses, and receipts in real time.
          </p>
        </div>
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
          <div className="inline-flex rounded-xl border border-gray-200 bg-white p-1 shadow-sm dark:border-gray-700 dark:bg-gray-900">
            {paymentMarketOptions.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => {
                  setPaymentMarket(option.key);
                  setPage(1);
                }}
                className={`h-8 rounded-lg px-3 text-xs font-semibold transition ${
                  paymentMarket === option.key
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Base: {selectedCurrency}
          </span>
          <button
            onClick={() => navigate("/refunds")}
            className="inline-flex h-10 min-w-[140px] items-center justify-center rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            Create Refund
          </button>
          <LoadingButton
            onClick={() => {
              void (async () => {
                setOpeningAddPanel(true);
                try {
                  await fetchPaymentBookingOptions();
                  setShowAddPanel(true);
                } finally {
                  setOpeningAddPanel(false);
                }
              })();
            }}
            loading={openingAddPanel}
            loadingLabel="Loading..."
            className="inline-flex h-10 min-w-[140px] items-center justify-center rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white transition-all duration-200 hover:bg-blue-700"
          >
            <FaPlus className="mr-2" /> Add Payment
          </LoadingButton>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title="Collected"
          value={statsLoading ? "Loading..." : formatAmount(stats.collectedAmount)}
          subtitle={
            statsLoading ? "Loading..." : `${stats.collectedCount} payments`
          }
          icon={<FaWallet className="text-blue-600" />}
        />
        <StatCard
          title="Outstanding"
          value={statsLoading ? "Loading..." : formatAmount(stats.outstandingAmount)}
          subtitle={
            statsLoading ? "Loading..." : `${stats.outstandingCount} pending payments`
          }
          icon={<FaClockRotateLeft className="text-amber-500" />}
        />
        <StatCard
          title="Overdue"
          value={statsLoading ? "Loading..." : formatAmount(stats.overdueAmount)}
          subtitle={
            statsLoading ? "Loading..." : `${stats.overdueCount} overdue payments`
          }
          icon={<FaRotateRight className="text-red-500" />}
        />
        <StatCard
          title="Refunds"
          value={statsLoading ? "Loading..." : formatAmount(stats.refundsAmount)}
          subtitle={
            statsLoading ? "Loading..." : `${stats.refundsCount} processed`
          }
          icon={<FaRotateLeft className="text-gray-500" />}
        />
      </div>
      {statsError && <p className="mt-2 text-xs text-red-500">{statsError}</p>}

      {/* Main Card */}
      <SurfaceCard className="p-0 overflow-hidden border border-gray-200 dark:border-gray-800">
        {/* Filters Section */}
        <div className="border-b border-gray-100 dark:border-gray-800 p-3 sm:p-4 space-y-3">
          {filterError ?
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-200">
              {filterError}
            </div>
          : null}

          <div className="w-full overflow-x-auto pb-1 scrollbar-hide">
            <div className="inline-flex rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-1 min-w-max">
              {quickFilters.map((item) => (
                <button
                  key={item.key}
                  onClick={() => {
                    setQuickFilter(item.key);
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg whitespace-nowrap transition-all ${
                    quickFilter === item.key ?
                      "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
            <div className="relative w-full">
              <FaMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400" />
              <input
                className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Search by transaction, customer, booking..."
              />
            </div>
            <div className="flex items-center justify-between gap-2 lg:block">
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {activeFilterCount > 0 ?
                  `${activeFilterCount} filter(s) applied`
                : "No filter applied"}
              </div>
              <button
                type="button"
                onClick={() => setShowMobileFilters((previous) => !previous)}
                className="lg:hidden inline-flex items-center rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                <FaFilter className="mr-2" />
                {showMobileFilters ? "Hide Filters" : "Advanced Filters"}
              </button>
            </div>
          </div>

          <div
            className={`${
              showMobileFilters ? "block" : "hidden"
            } lg:block space-y-3 rounded-xl border border-gray-200 bg-gray-50/60 p-3 dark:border-gray-700 dark:bg-gray-900/30`}
          >
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
                  Reference
                </label>
                <input
                  type="text"
                  value={draftFilters.referenceId}
                  onChange={(event) =>
                    updateDraftFilter("referenceId", event.target.value)
                  }
                  placeholder="Reference or payment ID"
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:border-gray-700 dark:bg-gray-900"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
                  Customer
                </label>
                <input
                  type="text"
                  value={draftFilters.customer}
                  onChange={(event) =>
                    updateDraftFilter("customer", event.target.value)
                  }
                  placeholder="Customer name"
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:border-gray-700 dark:bg-gray-900"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
                  Email
                </label>
                <input
                  type="text"
                  value={draftFilters.email}
                  onChange={(event) =>
                    updateDraftFilter("email", event.target.value)
                  }
                  placeholder="Customer email"
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:border-gray-700 dark:bg-gray-900"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
                  Phone
                </label>
                <input
                  type="text"
                  value={draftFilters.phone}
                  onChange={(event) =>
                    updateDraftFilter("phone", event.target.value)
                  }
                  placeholder="Customer phone"
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:border-gray-700 dark:bg-gray-900"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
                  Booking
                </label>
                <input
                  type="text"
                  value={draftFilters.bookingId}
                  onChange={(event) =>
                    updateDraftFilter("bookingId", event.target.value)
                  }
                  placeholder="Booking ID/label"
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:border-gray-700 dark:bg-gray-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
                  From Date
                </label>
                <input
                  type="date"
                  value={draftFilters.fromDate}
                  onChange={(event) =>
                    updateDraftFilter("fromDate", event.target.value)
                  }
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:border-gray-700 dark:bg-gray-900"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
                  To Date
                </label>
                <input
                  type="date"
                  value={draftFilters.toDate}
                  onChange={(event) =>
                    updateDraftFilter("toDate", event.target.value)
                  }
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:border-gray-700 dark:bg-gray-900"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
                  Min Amount
                </label>
                <input
                  type="number"
                  min="0"
                  value={draftFilters.minAmount}
                  onChange={(event) =>
                    updateDraftFilter("minAmount", event.target.value)
                  }
                  placeholder="0"
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:border-gray-700 dark:bg-gray-900"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
                  Max Amount
                </label>
                <input
                  type="number"
                  min="0"
                  value={draftFilters.maxAmount}
                  onChange={(event) =>
                    updateDraftFilter("maxAmount", event.target.value)
                  }
                  placeholder="Any"
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:border-gray-700 dark:bg-gray-900"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
                  Mode
                </label>
                <SearchableDropdown
                  className="w-full"
                  value={draftFilters.mode}
                  options={modeOptions}
                  placeholder="All Modes"
                  searchPlaceholder="Search mode..."
                  onChange={(value) =>
                    updateDraftFilter(
                      "mode",
                      value as PaymentFilterState["mode"],
                    )
                  }
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
                  Status
                </label>
                <SearchableDropdown
                  className="w-full"
                  value={draftFilters.status}
                  options={statusOptions}
                  placeholder="All Statuses"
                  searchPlaceholder="Search status..."
                  onChange={(value) =>
                    updateDraftFilter(
                      "status",
                      value as PaymentFilterState["status"],
                    )
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[1fr_auto]">
              <div className="xl:max-w-xs">
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
                  Sort By
                </label>
                <SearchableDropdown
                  className="w-full"
                  value={draftFilters.sortBy}
                  options={sortOptions}
                  placeholder="Newest First"
                  searchPlaceholder="Search sort option..."
                  onChange={(value) =>
                    updateDraftFilter(
                      "sortBy",
                      value as PaymentFilterState["sortBy"],
                    )
                  }
                />
              </div>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:self-end">
                {showMobileFilters ?
                  <button
                    type="button"
                    onClick={() => setShowMobileFilters(false)}
                    className="lg:hidden rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                  >
                    <span className="inline-flex items-center gap-2">
                      <FaXmark />
                      Hide Panel
                    </span>
                  </button>
                : null}
                <button
                  type="button"
                  onClick={exportCurrentTable}
                  disabled={!rows.length}
                  className="inline-flex items-center justify-center rounded-xl border border-green-500 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-green-400 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                  <FaDownload className="mr-2" /> Export
                </button>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                  Reset Filters
                </button>
              </div>
            </div>
          </div>
        </div>

        {transactionsError && (
          <p className="px-4 pb-2 text-xs text-red-500">{transactionsError}</p>
        )}

        {/* Transactions List */}
        {transactionsLoading ?
          <div className="p-8 text-sm text-gray-500">Loading payments...</div>
        : rows.length === 0 ?
          <div className="p-8">
            <EmptyState
              title="No transactions"
              description="Try a different filter or add a new payment."
              icon={<FaListUl className="text-4xl" />}
            />
          </div>
        : <>
            {/* Mobile View - Cards */}
            <div className="block lg:hidden divide-y divide-gray-100 dark:divide-gray-800">
              {rows.map((tx) => (
                <div
                  key={tx.id}
                  className="p-4 space-y-3 hover:bg-blue-50/40 dark:hover:bg-gray-800/50 transition-colors"
                >
                  {/* Header with Reference and Status */}
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                        {tx.referenceId}
                      </p>
                      <p className="text-xs text-gray-500">{tx.date}</p>
                    </div>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${
                        statusClasses[tx.status]
                      }`}
                    >
                      {tx.status}
                    </span>
                  </div>

                  {/* Customer and Booking */}
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {tx.customer}
                    </p>
                    <p className="text-xs text-gray-500">
                      Booking {tx.bookingLabel || tx.bookingId}
                    </p>
                  </div>

                  {/* Amount and Mode */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 text-sm text-gray-600 dark:text-gray-300">
                        {modeIcon(tx.mode)} {tx.mode}
                      </span>
                    </div>
                    <p
                      className={`text-sm font-semibold ${
                        tx.amount < 0 ?
                          "text-red-600"
                        : "text-gray-900 dark:text-gray-100"
                      }`}
                    >
                      {tx.amount < 0 ? "-" : ""}
                      {formatCurrency(Math.abs(tx.amount), tx.currency || 'INR')}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {tx.invoiceUrl ? (
                      <a
                        href={tx.invoiceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                      >
                        <FaReceipt className="text-[10px]" />
                        Invoice
                      </a>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
                        <FaReceipt className="text-[10px]" />
                        No Invoice
                      </span>
                    )}
                    {tx.proofUrl ? (
                      <a
                        href={tx.proofUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700 hover:bg-green-100 dark:border-green-800 dark:bg-green-900/30 dark:text-green-300"
                      >
                        <FaEye className="text-[10px]" />
                        Proof
                      </a>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
                        <FaEye className="text-[10px]" />
                        No Proof
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      onClick={() => handleViewDetails(tx)}
                      className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                      title="View Details"
                    >
                      <FaEye />
                    </button>
                    <button
                      onClick={() => handleEdit(tx)}
                      className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg"
                      title="Edit"
                    >
                      <FaEdit />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop View - Table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="min-w-[980px] w-full divide-y divide-gray-200 dark:divide-gray-800">
                <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-800/95">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Reference
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Customer
                    </th>
                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Amount
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Mode
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Status
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Date
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Docs
                    </th>
                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {rows.map((tx) => (
                    <tr
                      key={tx.id}
                      className="hover:bg-blue-50/30 dark:hover:bg-gray-800/40 transition-colors"
                    >
                      <td className="px-5 py-4 text-sm font-medium text-blue-600 dark:text-blue-300">
                        {tx.referenceId}
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {tx.customer}
                        </p>
                        <p className="text-xs text-gray-500">
                          {tx.bookingLabel || tx.bookingId}
                        </p>
                      </td>
                      <td
                        className={`px-5 py-4 text-right text-sm font-semibold ${
                          tx.amount < 0 ?
                            "text-red-600"
                          : "text-gray-900 dark:text-gray-100"
                        }`}
                      >
                        {tx.amount < 0 ? "-" : ""}
                        {formatCurrency(Math.abs(tx.amount), tx.currency || 'INR')}
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                          {modeIcon(tx.mode)} {tx.mode}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${
                            statusClasses[tx.status]
                          }`}
                        >
                          {tx.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">
                        {tx.date}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-2">
                          {tx.invoiceUrl ? (
                            <a
                              href={tx.invoiceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                            >
                              <FaReceipt className="text-[10px]" />
                              Invoice
                            </a>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
                              <FaReceipt className="text-[10px]" />
                              No Invoice
                            </span>
                          )}
                          {tx.proofUrl ? (
                            <a
                              href={tx.proofUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700 hover:bg-green-100 dark:border-green-800 dark:bg-green-900/30 dark:text-green-300"
                            >
                              <FaEye className="text-[10px]" />
                              Proof
                            </a>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
                              <FaEye className="text-[10px]" />
                              No Proof
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleViewDetails(tx)}
                            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                            title="View Details"
                          >
                            <FaEye />
                          </button>
                          <button
                            onClick={() => handleEdit(tx)}
                            className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg"
                            title="Edit"
                          >
                            <FaEdit />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-4 border-t border-gray-200 dark:border-gray-800">
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 order-2 sm:order-1">
                Showing {Math.min(filtered.length, (page - 1) * pageSize + 1)}-
                {Math.min(filtered.length, page * pageSize)} of{" "}
                {filtered.length}
              </p>
              <div className="flex items-center gap-2 order-1 sm:order-2">
                <button
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  disabled={page === 1}
                  className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <FaChevronLeft className="text-sm" />
                </button>
                <span className="px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-sm font-medium min-w-[40px] text-center">
                  {page}
                </span>
                <button
                  onClick={() =>
                    setPage((prev) => Math.min(totalPages, prev + 1))
                  }
                  disabled={page === totalPages}
                  className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <FaChevronRight className="text-sm" />
                </button>
              </div>
            </div>
          </>
        }
      </SurfaceCard>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translate(-50%, -20px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

// Stat Card Component
const StatCard = ({
  title,
  value,
  subtitle,
  icon,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
}) => (
  <SurfaceCard hoverable className="p-3 sm:p-5">
    <div className="flex items-start justify-between">
      <div className="min-w-0">
        <p className="text-[10px] sm:text-xs uppercase tracking-wide text-gray-500 truncate">
          {title}
        </p>
        <p className="text-base sm:text-2xl font-semibold text-gray-900 dark:text-gray-100 mt-0.5 sm:mt-1">
          {value}
        </p>
        <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5 sm:mt-1 truncate">
          {subtitle}
        </p>
      </div>
      <div className="text-lg sm:text-xl flex-shrink-0">{icon}</div>
    </div>
  </SurfaceCard>
);

export default Payments;
