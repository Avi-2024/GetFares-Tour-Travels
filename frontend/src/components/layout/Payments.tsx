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
  FaTrash,
  FaReceipt,
} from "react-icons/fa6";
import { FaEdit } from "react-icons/fa";
import SurfaceCard from "../ui/SurfaceCard";
import EmptyState from "../ui/EmptyState";
import SearchableDropdown from "../ui/SearchableDropdown";
import { paymentsApi } from "../../api/payments";
import { bookingsApi } from "../../api/bookings";
import { quotationsApi } from "../../api/quotations";
import { leadsApi } from "../../api/leads";
import { customersApi } from "../../api/customers";
import { getApiErrorMessage } from "../../api/apiClient";
import { useLeadsService } from "../../hooks/useLeadsService";

type TxStatus = "completed" | "pending" | "failed" | "refunded";
type PaymentMode = "bank" | "card" | "cash" | "cheque" | "online";

const quickFilters = [
  { key: "ALL", label: "All" },
  { key: "ACTIVE", label: "Active" },
  { key: "COMPLETED", label: "Completed" },
  { key: "PENDING", label: "Pending" },
  { key: "FAILED", label: "Failed" },
  { key: "REFUNDED", label: "Refunded" },
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

const pickCustomerName = (...sources: any[]) => {
  for (const source of sources) {
    const candidate =
      source?.customerName ??
      source?.customer_name ??
      source?.customer?.fullName ??
      source?.customer?.full_name ??
      source?.customer?.name ??
      source?.customerSnapshot?.fullName ??
      source?.customerSnapshot?.full_name ??
      source?.customerSnapshot?.name ??
      source?.clientName ??
      source?.lead?.fullName ??
      source?.lead?.full_name ??
      source?.lead?.name ??
      source?.leadSnapshot?.fullName ??
      source?.leadSnapshot?.full_name ??
      source?.leadSnapshot?.name ??
      source?.fullName ??
      source?.full_name ??
      source?.name;

    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  return "";
};

const pickCustomerEmail = (...sources: any[]) => {
  for (const source of sources) {
    const candidate =
      source?.customerEmail ??
      source?.customer_email ??
      source?.email ??
      source?.primaryEmail ??
      source?.contactEmail ??
      source?.customer?.email ??
      source?.customerSnapshot?.email ??
      source?.lead?.email ??
      source?.leadSnapshot?.email;

    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  return "";
};

const pickCustomerPhone = (...sources: any[]) => {
  for (const source of sources) {
    const candidate =
      source?.customerPhone ??
      source?.customer_phone ??
      source?.phone ??
      source?.mobile ??
      source?.contactNumber ??
      source?.contact_number ??
      source?.customer?.phone ??
      source?.customer?.mobile ??
      source?.customerSnapshot?.phone ??
      source?.lead?.phone ??
      source?.lead?.mobile ??
      source?.leadSnapshot?.phone ??
      source?.leadSnapshot?.mobile;

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
  return {
    id: String(row?.id ?? ""),
    referenceId:
      row?.paymentReference ??
      row?.payment_reference ??
      row?.gatewayPaymentId ??
      row?.gateway_payment_id ??
      row?.gatewayOrderId ??
      row?.gateway_order_id ??
      row?.id ??
      "",
    date: toDisplayDate(paidAt ?? row?.createdAt ?? row?.created_at),
    customer:
      pickCustomerName(row, row?.customer, row?.lead) ||
      row?.customer ||
      "Unknown",
    customerEmail:
      pickCustomerEmail(row, row?.customer, row?.lead) || undefined,
    customerPhone:
      pickCustomerPhone(row, row?.customer, row?.lead) || undefined,
    customerId: customerId ? String(customerId) : undefined,
    leadId: leadId ? String(leadId) : undefined,
    bookingId,
    bookingLabel: bookingId,
    amount: toNumber(row?.amount, 0),
    mode: mapApiModeToTx(row?.paymentMode ?? row?.payment_mode),
    status: mapApiStatusToTx(row?.status),
    paidAt: paidAt ?? undefined,
    verifiedAt: row?.verifiedAt ?? row?.verified_at ?? undefined,
    verifiedBy: row?.verifiedBy ?? row?.verified_by ?? undefined,
    verifiedByName:
      pickCustomerName(
        row?.verifiedByUser,
        row?.verified_by_user,
        row?.verifiedByCustomer,
        row?.verified_by_customer,
      ) ||
      row?.verifiedByName ||
      row?.verified_by_name ||
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

// Confirm Modal
const ConfirmModal = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
}: {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-md w-full p-6 animate-fadeIn">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center">
            <FaEye className="text-amber-600 dark:text-amber-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {title}
          </h3>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          {message}
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

// Verify Modal - Complete as per document specs
const VerifyModal = ({
  isOpen,
  transaction,
  onConfirm,
  onCancel,
}: {
  isOpen: boolean;
  transaction: Transaction | null;
  onConfirm: (data: PaymentVerificationData) => void;
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

  const handleSubmit = () => {
    if (!validate()) return;
    onConfirm({
      paidAt,
      status,
      proofUrl: proofUrl || undefined,
      paymentReference: paymentReference || undefined,
      gatewayPaymentId: gatewayPaymentId || undefined,
      notes: notes || undefined,
    });
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
              <span className="text-sm text-gray-500">Booking ID</span>
              <span className="text-sm font-medium text-gray-900">
                {transaction.bookingLabel || transaction.bookingId}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Amount</span>
              <span className="text-sm font-bold text-gray-900">
                ${Math.abs(transaction.amount).toLocaleString()}
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
          <button
            onClick={handleSubmit}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            Verify Payment
          </button>
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
  onSave: (data: any) => void;
  onCancel: () => void;
}) => {
  const leadsService = useLeadsService();
  const buildFormData = (tx: Transaction | null) => ({
    customer: tx?.customer || "",
    bookingId: tx?.bookingId || "",
    amount: tx?.amount ? Math.abs(tx.amount).toString() : "",
    mode: tx?.mode || "bank",
    referenceId: tx?.referenceId || "",
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
  const [customers, setCustomers] = useState<
    Array<{ id: string; name: string; email?: string }>
  >([]);
  const [bookings, setBookings] = useState<
    Array<{
      id: string;
      bookingNumber: string;
      customer?: string;
      customerId?: string;
      totalAmount?: number;
    }>
  >([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [invoiceUploadError, setInvoiceUploadError] = useState("");
  const invoiceInputRef = useRef<HTMLInputElement | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofUploadError, setProofUploadError] = useState("");
  const proofInputRef = useRef<HTMLInputElement | null>(null);
  const customerDropdownOptions = useMemo(
    () => [
      {
        value: "",
        label: loadingCustomers ? "Loading customers..." : "Select customer...",
      },
      ...customers.map((customer) => ({
        value: customer.id,
        label: `${customer.name}${customer.email ? ` (${customer.email})` : ""}`,
        searchText:
          `${customer.name} ${customer.email ?? ""} ${customer.id}`.trim(),
      })),
    ],
    [customers, loadingCustomers],
  );
  const bookingDropdownOptions = useMemo(() => {
    const selectedCustomerId = formData.customer?.trim();
    const filtered =
      selectedCustomerId ?
        bookings.filter((booking) => booking.customerId === selectedCustomerId)
      : [];
    return [
      {
        value: "",
        label:
          loadingBookings ? "Loading bookings..."
          : !selectedCustomerId ? "Select customer first"
          : filtered.length === 0 ? "No bookings for this customer"
          : "Select booking...",
      },
      ...filtered.map((booking) => ({
        value: booking.id,
        label: `${booking.bookingNumber}${
          booking.customer ? ` - ${booking.customer}` : ""
        }`,
        searchText:
          `${booking.bookingNumber} ${booking.customer ?? ""} ${booking.id}`.trim(),
      })),
    ];
  }, [bookings, loadingBookings, formData.customer]);
  const selectedBooking = useMemo(
    () => bookings.find((booking) => booking.id === formData.bookingId),
    [bookings, formData.bookingId],
  );
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
      { value: "refunded", label: "Refunded" },
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
    clearInvoiceSelection();
    clearProofSelection();
  }, [transaction, clearInvoiceSelection, clearProofSelection]);

  const handleInvoiceFileChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      setInvoiceUploadError("Only PDF invoices are supported");
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

  // Load customers and bookings when modal opens
  useEffect(() => {
    if (!isOpen) return;

    const loadData = async () => {
      // Load customers from leads and customers
      setLoadingCustomers(true);
      try {
        const [leadsRes, customersRes] = await Promise.allSettled([
          leadsService.listLeadsRaw({ limit: 100 }),
          customersApi.list({ limit: 100 }),
        ]);

        const customersList: Array<{
          id: string;
          name: string;
          email?: string;
        }> = [];

        // Add leads
        if (leadsRes.status === "fulfilled") {
          const leads = Array.isArray(leadsRes.value) ? leadsRes.value : [];
          leads.forEach((lead: any) => {
            customersList.push({
              id: `lead-${lead.id}`,
              name: lead.fullName || lead.full_name || lead.name || "Unknown",
              email: lead.email,
            });
          });
        }

        // Add customers
        if (customersRes.status === "fulfilled") {
          const customersPayload = customersRes.value as any;
          const customersData =
            customersPayload?.data?.data ||
            customersPayload?.data ||
            customersPayload ||
            [];
          const customerRecords =
            Array.isArray(customersData) ? customersData : [];
          customerRecords.forEach((customer: any) => {
            customersList.push({
              id: `customer-${customer.id}`,
              name:
                customer.fullName ||
                customer.full_name ||
                customer.name ||
                "Unknown",
              email: customer.email,
            });
          });
        }

        setCustomers(customersList);
      } catch (err) {
        console.error("Failed to load customers:", err);
      } finally {
        setLoadingCustomers(false);
      }

      // Load bookings
      setLoadingBookings(true);
      try {
        const bookingsRes = await bookingsApi.list({ limit: 100 });
        const bookingsPayload = bookingsRes as any;
        const bookingsData =
          bookingsPayload?.data?.data ||
          bookingsPayload?.data ||
          bookingsPayload ||
          [];
        const bookingsList = Array.isArray(bookingsData) ? bookingsData : [];

        setBookings(
          bookingsList.map((booking: any) => ({
            id: booking.id,
            bookingNumber:
              booking.bookingNumber ||
              booking.booking_number ||
              booking.code ||
              `BK-${booking.id}`,
            customer:
              booking.customerName ||
              booking.customer_name ||
              booking.customer ||
              "",
            customerId:
              (
                booking.customerId ||
                booking.customer_id ||
                booking.customer?.id
              ) ?
                `customer-${booking.customerId || booking.customer_id || booking.customer?.id}`
              : booking.leadId || booking.lead_id || booking.lead?.id ?
                `lead-${booking.leadId || booking.lead_id || booking.lead?.id}`
              : "",
            totalAmount: Number(
              booking.totalAmount ??
                booking.total_amount ??
                booking.finalPrice ??
                booking.final_price ??
                0,
            ),
          })),
        );
      } catch (err) {
        console.error("Failed to load bookings:", err);
      } finally {
        setLoadingBookings(false);
      }
    };

    void loadData();
  }, [isOpen, leadsService]);

  if (!isOpen) return null;

  const currentInvoiceLink = transaction?.invoiceUrl;
  const currentProofLink = transaction?.proofUrl;

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.customer) newErrors.customer = "Customer is required";
    if (!formData.bookingId) newErrors.bookingId = "Booking ID is required";
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
    onSave({
      ...formData,
      amount:
        parseFloat(formData.amount) *
        (transaction?.amount && transaction.amount < 0 ? -1 : 1),
      id: transaction?.id || `tx-${Date.now()}`,
      createdAt: transaction?.createdAt || now,
      updatedAt: now,
      invoiceAttachment,
      proofAttachment,
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 p-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {transaction ? "Edit Payment" : "Add New Payment"}
          </h3>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600"
          >
            <FaXmark className="text-xl" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="field-label">Customer *</label>
              {transaction ?
                <input
                  type="text"
                  value={formData.customer}
                  onChange={(e) =>
                    setFormData({ ...formData, customer: e.target.value })
                  }
                  className={`field-input ${
                    errors.customer ? "border-red-500" : ""
                  }`}
                  placeholder="Customer name"
                />
              : <SearchableDropdown
                  value={formData.customer}
                  onChange={(value) =>
                    setFormData({ ...formData, customer: value, bookingId: "" })
                  }
                  options={customerDropdownOptions}
                  hasError={Boolean(errors.customer)}
                  searchPlaceholder="Search customer..."
                  disabled={loadingCustomers}
                />
              }
              {errors.customer && (
                <p className="text-xs text-red-500 mt-1">{errors.customer}</p>
              )}
            </div>
            <div>
              <label className="field-label">Booking ID *</label>
              {transaction ?
                <input
                  type="text"
                  value={formData.bookingId}
                  onChange={(e) =>
                    setFormData({ ...formData, bookingId: e.target.value })
                  }
                  className={`field-input ${
                    errors.bookingId ? "border-red-500" : ""
                  }`}
                  placeholder="BK-XXXX"
                />
              : <SearchableDropdown
                  value={formData.bookingId}
                  onChange={(value) =>
                    setFormData({ ...formData, bookingId: value })
                  }
                  options={bookingDropdownOptions}
                  hasError={Boolean(errors.bookingId)}
                  searchPlaceholder="Search booking..."
                  disabled={loadingBookings}
                />
              }
              {errors.bookingId && (
                <p className="text-xs text-red-500 mt-1">{errors.bookingId}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
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
              {!errors.amount && selectedBookingTotal !== null && (
                <p className="text-xs text-gray-500 mt-1">
                  Max payable amount: {selectedBookingTotal.toLocaleString()}
                </p>
              )}
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
                className="field-input"
                placeholder="TRX-XXXX"
              />
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
                          PDF · {formatFileSize(invoiceFile.size)}
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
                      Upload the finalized invoice PDF (max 5 MB).
                    </p>
                  }

                  {currentInvoiceLink && !invoiceFile && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                      <p className="font-medium">
                        Invoice PDF already uploaded.
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
                          Upload new PDF
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-3">
                    <label
                      htmlFor="invoice-upload"
                      className="inline-flex cursor-pointer items-center rounded-lg border border-dashed border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-blue-500 hover:text-blue-600"
                    >
                      Upload PDF
                    </label>
                    <input
                      id="invoice-upload"
                      ref={invoiceInputRef}
                      type="file"
                      accept="application/pdf"
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
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              void handleSubmit();
            }}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            {transaction ? "Update Payment" : "Add Payment"}
          </button>
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
  if (!isOpen || !transaction) return null;

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };
  const [showInvoicePreview, setShowInvoicePreview] = useState(false);
  const invoiceLink = transaction.invoiceUrl ?? transaction.proofUrl;
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

          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Reference ID</p>
              <p className="text-lg font-bold text-blue-600">
                #{transaction.referenceId}
              </p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Amount</p>
              <p
                className={`text-lg font-bold ${
                  transaction.amount < 0 ? "text-red-600" : "text-gray-900"
                }`}
              >
                {transaction.amount < 0 ? "-" : ""}$
                {Math.abs(transaction.amount).toLocaleString()}
              </p>
            </div>
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
                <span className="text-sm text-gray-500">Booking ID</span>
                <span className="text-sm font-medium text-gray-900">
                  {transaction.bookingLabel || transaction.bookingId}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                <span className="text-sm text-gray-500">Date</span>
                <span className="text-sm font-medium text-gray-900">
                  {transaction.date}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                <span className="text-sm text-gray-500">Payment Mode</span>
                <span className="text-sm font-medium text-gray-900 capitalize">
                  {transaction.mode}
                </span>
              </div>
              {transaction.paidAt && (
                <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                  <span className="text-sm text-gray-500">Paid At</span>
                  <span className="text-sm font-medium text-gray-900">
                    {formatDateTime(transaction.paidAt)}
                  </span>
                </div>
              )}
              {transaction.paymentReference && (
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
                    {formatDateTime(transaction.verifiedAt)}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                  <span className="text-sm text-gray-500">Verified By</span>
                  <span className="text-sm font-medium text-gray-900">
                    {transaction.verifiedByName ||
                      transaction.customer ||
                      transaction.verifiedBy ||
                      "N/A"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Metadata
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                <span className="text-sm text-gray-500">Created At</span>
                <span className="text-sm font-medium text-gray-900">
                  {formatDateTime(transaction.createdAt)}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                <span className="text-sm text-gray-500">Updated At</span>
                <span className="text-sm font-medium text-gray-900">
                  {formatDateTime(transaction.updatedAt)}
                </span>
              </div>
            </div>
          </div>
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
  const [showDetails, setShowDetails] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const pageSize = 15;

  const formatAmount = (value: number) =>
    `$${Number(value || 0).toLocaleString()}`;

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
      { value: "refunded", label: "Refunded" },
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
  }, [transactions, search, quickFilter, appliedFilters]);

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
      const res = await paymentsApi.list();
      const data = unwrapData<any[]>(res) ?? [];
      const paymentRows = Array.isArray(data) ? data : [];

      const bookingIds = Array.from(
        new Set(
          paymentRows
            .map((row) => String(row?.bookingId ?? row?.booking_id ?? ""))
            .filter(Boolean),
        ),
      );

      let bookingById: Record<string, any> = {};
      let quotationById: Record<string, any> = {};
      let leadById: Record<string, any> = {};
      if (bookingIds.length) {
        try {
          const bookingsRes = await bookingsApi.list({ page: 1, limit: 500 });
          const bookingsData = unwrapList(bookingsRes);
          bookingById = bookingsData.reduce(
            (acc: Record<string, any>, booking: any) => {
              const key = String(
                booking?.id ?? booking?.bookingId ?? booking?.booking_id ?? "",
              );
              if (key) acc[key] = booking;
              return acc;
            },
            {} as Record<string, any>,
          );
        } catch (_error) {
          bookingById = {};
        }
      }

      const quotationIds = Array.from(
        new Set(
          Object.values(bookingById)
            .map((booking: any) =>
              String(
                booking?.quotationId ??
                  booking?.quotation_id ??
                  booking?.quoteId ??
                  booking?.quote_id ??
                  "",
              ),
            )
            .filter(Boolean),
        ),
      );

      if (quotationIds.length) {
        try {
          const quotationsRes = await quotationsApi.list({
            page: 1,
            limit: 500,
          });
          const quotationRows = unwrapList(quotationsRes);
          quotationById = quotationRows.reduce(
            (acc: Record<string, any>, quote: any) => {
              const key = String(
                quote?.id ?? quote?.quotationId ?? quote?.quotation_id ?? "",
              );
              if (key) acc[key] = quote;
              return acc;
            },
            {} as Record<string, any>,
          );
        } catch (_error) {
          quotationById = {};
        }
      }

      const leadIds = Array.from(
        new Set(
          Object.values(bookingById)
            .map((booking: any) =>
              String(booking?.leadId ?? booking?.lead_id ?? ""),
            )
            .concat(
              Object.values(quotationById).map((quote: any) =>
                String(
                  quote?.leadId ??
                    quote?.lead_id ??
                    quote?.lead?.id ??
                    quote?.leadSnapshot?.id ??
                    "",
                ),
              ),
            )
            .filter(Boolean),
        ),
      );

      if (leadIds.length) {
        try {
          const leadsRes = await leadsApi.list({ page: 1, limit: 500 });
          const leadRows = unwrapList(leadsRes);
          leadById = leadRows.reduce(
            (acc: Record<string, any>, lead: any) => {
              const key = String(
                lead?.id ?? lead?.leadId ?? lead?.lead_id ?? "",
              );
              if (key) acc[key] = lead;
              return acc;
            },
            {} as Record<string, any>,
          );
        } catch (_error) {
          leadById = {};
        }
      }

      const customerIds = Array.from(
        new Set(
          paymentRows
            .map((row) => String(row?.customerId ?? row?.customer_id ?? ""))
            .concat(
              Object.values(bookingById).map((booking: any) =>
                String(
                  booking?.customerId ??
                    booking?.customer_id ??
                    booking?.customer?.id ??
                    "",
                ),
              ),
            )
            .concat(
              Object.values(quotationById).map((quote: any) =>
                String(
                  quote?.customerId ??
                    quote?.customer_id ??
                    quote?.customer?.id ??
                    "",
                ),
              ),
            )
            .filter(Boolean),
        ),
      );

      let customerById: Record<string, any> = {};
      if (customerIds.length) {
        try {
          const customersRes = await customersApi.list({ page: 1, limit: 500 });
          const customersData = unwrapList(customersRes);
          customerById = customersData.reduce(
            (acc: Record<string, any>, customer: any) => {
              const key = String(
                customer?.id ??
                  customer?.customerId ??
                  customer?.customer_id ??
                  "",
              );
              if (key) acc[key] = customer;
              return acc;
            },
            {} as Record<string, any>,
          );
        } catch (_error) {
          customerById = {};
        }
      }

      const rows = paymentRows.map((row) => {
        const tx = mapPaymentToTransaction(row);
        const bookingKey = String(row?.bookingId ?? row?.booking_id ?? "");
        const booking = bookingById[bookingKey];
        if (!booking) return tx;

        const quotationKey = String(
          booking?.quotationId ??
            booking?.quotation_id ??
            booking?.quoteId ??
            booking?.quote_id ??
            "",
        );
        const quotation = quotationById[quotationKey];
        const leadKey = String(
          booking?.leadId ??
            booking?.lead_id ??
            quotation?.leadId ??
            quotation?.lead_id ??
            quotation?.lead?.id ??
            quotation?.leadSnapshot?.id ??
            "",
        );
        const lead = leadById[leadKey];
        const customerKey = String(
          tx.customerId ??
            row?.customerId ??
            row?.customer_id ??
            booking?.customerId ??
            booking?.customer_id ??
            quotation?.customerId ??
            quotation?.customer_id ??
            "",
        );
        const customerRecord =
          customerKey ? customerById[customerKey] : undefined;

        const bookingNumber =
          booking?.bookingNumber ??
          booking?.bookingId ??
          booking?.code ??
          tx.bookingId;
        const bookingCustomer =
          pickCustomerName(booking, quotation, lead) || tx.customer;
        const customerEmail =
          tx.customerEmail ||
          pickCustomerEmail(
            row,
            row?.customer,
            booking,
            booking?.customer,
            quotation,
            quotation?.customer,
            lead,
            customerRecord,
          );
        const customerPhone =
          tx.customerPhone ||
          pickCustomerPhone(
            row,
            row?.customer,
            booking,
            booking?.customer,
            quotation,
            quotation?.customer,
            lead,
            customerRecord,
          );
        const derivedVerifiedByName =
          tx.verifiedByName ||
          (tx.verifiedBy &&
            pickCustomerName(
              customerById[tx.verifiedBy],
              leadById[tx.verifiedBy],
            )) ||
          (tx.verifiedBy && tx.customerId && tx.verifiedBy === tx.customerId ?
            bookingCustomer
          : undefined);
        const normalizedCustomerId = customerKey || tx.customerId;

        return {
          ...tx,
          bookingLabel: String(bookingNumber || tx.bookingId),
          customer:
            tx.customer === "Unknown" ?
              String(bookingCustomer || tx.customer)
            : tx.customer,
          customerId: normalizedCustomerId,
          customerEmail: customerEmail || undefined,
          customerPhone: customerPhone || undefined,
          verifiedByName: derivedVerifiedByName || undefined,
        };
      });
      setTransactions(rows);
    } catch (err) {
      console.error("Failed to load payments:", err);
      setTransactionsError(getApiErrorMessage(err, "Failed to load payments"));
      setTransactions([]);
    } finally {
      setTransactionsLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    setStatsError("");
    try {
      const res = await paymentsApi.stats();
      const data = unwrapData<any>(res) ?? {};
      setStats({
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
  }, []);

  useEffect(() => {
    void fetchTransactions();
    void fetchStats();
  }, [fetchStats, fetchTransactions]);

  const handleViewDetails = async (tx: Transaction) => {
    setSelectedTransaction(tx);
    setShowDetails(true);
    try {
      const res = await paymentsApi.getById(tx.id);
      const data = unwrapData<any>(res);
      if (data) {
        const fullTx = mapPaymentToTransaction(data);
        setSelectedTransaction((current) =>
          current && current.id === tx.id ? { ...current, ...fullTx } : current,
        );
      }
    } catch (err) {
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
      await fetchStats();
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
      await paymentsApi.update(data.id, {
        amount: toNumber(data.amount, 0),
        paymentMode: mapTxModeToApi(data.mode),
        paymentReference: data.paymentReference || undefined,
        gatewayOrderId: data.gatewayOrderId || undefined,
        gatewayPaymentId: data.gatewayPaymentId || undefined,
        gatewaySignature: data.gatewaySignature || undefined,
        proofUrl: data.proofUrl || undefined,
        invoiceAttachment: data.invoiceAttachment || undefined,
        status: mapTxStatusToApi(data.status),
        paidAt: toIsoDate(data.paidAt ?? data.date) || undefined,
      });
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
      await fetchStats();
    } catch (err) {
      console.error("Failed to update payment:", err);
      showToast(getApiErrorMessage(err, "Failed to update payment"), "error");
    }
  };

  const handleAddPayment = async (data: any) => {
    try {
      await paymentsApi.create({
        bookingId: data.bookingId,
        amount: toNumber(data.amount, 0),
        paymentMode: mapTxModeToApi(data.mode),
        paymentReference: data.paymentReference || undefined,
        gatewayOrderId: data.gatewayOrderId || undefined,
        gatewayPaymentId: data.gatewayPaymentId || undefined,
        gatewaySignature: data.gatewaySignature || undefined,
        proofUrl:
          data.proofUrl ||
          data?.proofAttachment?.data ||
          data?.proofAttachment?.content ||
          data?.proofAttachment?.base64 ||
          undefined,
        invoiceAttachment: data.invoiceAttachment || undefined,
        status: mapTxStatusToApi(data.status),
        paidAt: toIsoDate(data.date) || undefined,
        isVerified: data.status === "completed",
      });
      setShowAddPanel(false);
      showToast("Payment added successfully", "success");
      await fetchTransactions();
      await fetchStats();
    } catch (err) {
      console.error("Failed to add payment:", err);
      showToast(getApiErrorMessage(err, "Failed to add payment"), "error");
    }
  };

  const handleDelete = (id: string) => {
    setSelectedTransaction(transactions.find((tx) => tx.id === id) || null);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    setShowDeleteConfirm(false);
    setSelectedTransaction(null);
    showToast("Delete is not available for payments yet", "info");
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
      <ConfirmModal
        isOpen={showDeleteConfirm}
        title="Delete Payment"
        message="Are you sure you want to delete this payment? This action cannot be undone."
        onConfirm={confirmDelete}
        onCancel={() => {
          setShowDeleteConfirm(false);
          setSelectedTransaction(null);
        }}
      />

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
        transaction={selectedTransaction}
        onSave={handleSaveEdit}
        onCancel={() => {
          setShowEditModal(false);
          setSelectedTransaction(null);
        }}
      />

      <PaymentFormModal
        key={`add-${showAddPanel ? "open" : "closed"}`}
        isOpen={showAddPanel}
        transaction={null}
        onSave={handleAddPayment}
        onCancel={() => setShowAddPanel(false)}
      />

      <DetailsModal
        isOpen={showDetails}
        transaction={selectedTransaction}
        onClose={() => {
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
          <button
            onClick={() => navigate("/refunds")}
            className="inline-flex h-10 min-w-[140px] items-center justify-center rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            Create Refund
          </button>
          <button
            onClick={() => setShowAddPanel(true)}
            className="inline-flex h-10 min-w-[140px] items-center justify-center rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white transition-all duration-200 hover:bg-blue-700"
          >
            <FaPlus className="mr-2" /> Add Payment
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title="Collected"
          value={
            statsLoading ? "Loading..." : formatAmount(stats.collectedAmount)
          }
          subtitle={
            statsLoading ? "Loading..." : `${stats.collectedCount} payments`
          }
          icon={<FaWallet className="text-blue-600" />}
        />
        <StatCard
          title="Outstanding"
          value={
            statsLoading ? "Loading..." : formatAmount(stats.outstandingAmount)
          }
          subtitle={
            statsLoading ? "Loading..." : `${stats.outstandingCount} pending`
          }
          icon={<FaClockRotateLeft className="text-amber-500" />}
        />
        <StatCard
          title="Overdue"
          value={
            statsLoading ? "Loading..." : formatAmount(stats.overdueAmount)
          }
          subtitle={
            statsLoading ? "Loading..." : `${stats.overdueCount} invoices`
          }
          icon={<FaRotateRight className="text-red-500" />}
        />
        <StatCard
          title="Refunds"
          value={
            statsLoading ? "Loading..." : formatAmount(stats.refundsAmount)
          }
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
                        #{tx.referenceId}
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
                      Booking #{tx.bookingLabel || tx.bookingId}
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
                      {tx.amount < 0 ? "-" : ""}$
                      {Math.abs(tx.amount).toLocaleString()}
                    </p>
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
                    <button
                      onClick={() => handleDelete(tx.id)}
                      className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
                      title="Delete"
                    >
                      <FaTrash />
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
                        #{tx.referenceId}
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {tx.customer}
                        </p>
                        <p className="text-xs text-gray-500">
                          #{tx.bookingLabel || tx.bookingId}
                        </p>
                      </td>
                      <td
                        className={`px-5 py-4 text-right text-sm font-semibold ${
                          tx.amount < 0 ?
                            "text-red-600"
                          : "text-gray-900 dark:text-gray-100"
                        }`}
                      >
                        {tx.amount < 0 ? "-" : ""}$
                        {Math.abs(tx.amount).toFixed(2)}
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
                          <button
                            onClick={() => handleDelete(tx.id)}
                            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
                            title="Delete"
                          >
                            <FaTrash />
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
