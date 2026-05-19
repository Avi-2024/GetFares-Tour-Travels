import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  FaArrowTrendUp,
  FaCalendarDays,
  FaChevronLeft,
  FaChevronRight,
  FaCreditCard,
  FaDownload,
  FaEye,
  FaMagnifyingGlass,
  FaPaperPlane,
  FaPlus,
  FaTriangleExclamation,
  FaFilter,
  FaXmark,
  FaCircleCheck,
  FaCircleExclamation,
  FaClock,
  // FaUser,
  // FaGlobe,
  // FaDollarSign,
  // FaFilePdf
} from "react-icons/fa6";
import SurfaceCard from "../../components/ui/SurfaceCard";
import EmptyState from "../../components/ui/EmptyState";
import SearchableDropdown from "../../components/ui/SearchableDropdown";
import { validateBookingTransition } from "../../utils/workflowValidation";
import { useBookingsService } from "../../hooks/useBookingsService";
import { useLeadsService } from "../../hooks/useLeadsService";
import { quotationsApi } from "../../api/quotations";
import { suppliersApi } from "../../api/suppliers";
import { reportApiError } from "../../lib/notify";
import { getCurrencyOptions } from "../../utils/currency";
import {
  normalizeCurrencyCode,
  pickFirstValidCurrencyCode,
  pickLeadDisplayCurrencyCode,
  pickQuotationDisplayCurrencyCode,
} from "../../utils/quotationDisplayCurrency";
import {
  clearBookingsCreateDraft,
  getBookingsPageCache,
  getCachedQuotationOptions,
  getCachedSupplierOptions,
  invalidateBookingsFormDropdownCaches,
  invalidateBookingsPageCache,
  isBookingsPageCacheFresh,
  normalizeBookingApiStats,
  patchBookingsPageCache,
  readBookingsCreateDraft,
  readBookingsCreateModalOpen,
  setCachedQuotationOptions,
  setCachedSupplierOptions,
  writeBookingsCreateDraft,
  writeBookingsCreateModalOpen,
  type BookingsPageStats,
} from "../../lib/bookingsPageCache";

type BookingStatus = 'confirmed' | 'pending' | 'cancelled'
type PaymentStatus = 'partial' | 'unpaid' | 'paid' | 'refunded'
type DeadlineRiskLevel = 'SAFE' | 'D2_DUE' | 'DEADLINE_DUE' | 'OVERDUE'

const quickFilters = [
  { key: 'ALL', label: 'All' },
  { key: 'ACTIVE', label: 'Active' },
  { key: 'PENDING', label: 'Pending' },
  { key: 'CANCELLED', label: 'Cancelled' },
  { key: 'PAYMENT_DUE', label: 'Payment Due' },
  { key: 'OVERDUE', label: 'Overdue' }
] as const
type QuickFilter = (typeof quickFilters)[number]['key']

type BookingFilterState = {
  bookingId: string
  customer: string
  email: string
  phone: string
  consultant: string
  destination: string
  status: 'ALL' | BookingStatus
  payment: 'ALL' | PaymentStatus
  risk: 'ALL' | DeadlineRiskLevel
  fromDate: string
  toDate: string
  sortBy:
    | 'NEWEST_FIRST'
    | 'OLDEST_FIRST'
    | 'AMOUNT_HIGH_TO_LOW'
    | 'AMOUNT_LOW_TO_HIGH'
    | 'CUSTOMER_A_Z'
}

const defaultFilters: BookingFilterState = {
  bookingId: '',
  customer: '',
  email: '',
  phone: '',
  consultant: '',
  destination: '',
  status: 'ALL',
  payment: 'ALL',
  risk: 'ALL',
  fromDate: '',
  toDate: '',
  sortBy: 'NEWEST_FIRST'
}

interface Booking {
  id: string
  bookingId: string
  customer: string
  email?: string
  phone?: string
  consultant?: string
  destination: string
  dates: string
  startDate?: string
  endDate?: string
  createdAt?: string | null
  leadCreatedAt?: string | null
  status: BookingStatus
  payment: PaymentStatus
  paid: number
  total: number
  currency?: string
  documentsReady: number
  documentsTotal: number
  deadlineRiskLevel?: DeadlineRiskLevel
  blockingDeadlineAt?: string | null
  balanceDueBy?: string | null
  supplierPaymentDeadlineAt?: string | null
  cancellationDeadlineAt?: string | null
}

interface NewBookingData {
  quotationId: string;
  customer: string;
  email: string;
  phone: string;
  destination: string;
  travelStart: string;
  travelEnd: string;
  totalAmount: number;
  costAmount: number;
  advanceRequired: number;
  supplierId: string;
  supplierName: string;
  blockingDeadlineAt: string;
  supplierPaymentDeadlineAt: string;
  cancellationDeadlineAt: string;
  currency?: string;
  notes?: string;
}

type QuoteOption = {
  id: string;
  label: string;
  value: string;
  selectedLabel?: string;
  searchText?: string;
  leftLabel?: string;
  rightLabel?: string;
};

type SupplierOption = {
  id: string;
  name: string;
  label: string;
};

interface PaymentData {
  amount: number;
  method: "cash" | "card" | "bank" | "cheque";
  reference?: string;
  notes?: string;
  date: string;
}

interface InvoiceData {
  bookingId: string;
  amount: number;
  dueDate: string;
  items?: Array<{ description: string; amount: number }>;
}

type BookingLookups = {
  quotationById: Record<string, any>;
  leadById: Record<string, any>;
  destinationById: Record<string, string>;
};

const statusClasses: Record<BookingStatus, string> = {
  confirmed:
    "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-900",
  pending:
    "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-900",
  cancelled:
    "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-900",
};

const paymentClasses: Record<PaymentStatus, string> = {
  partial:
    "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-900",
  unpaid:
    "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-900",
  paid: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-900",
  refunded:
    'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'
}

const toIsoDate = (value?: string | null) => {
  if (!value) return ''
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return ''
  return parsed.toISOString().split('T')[0]
}

const toAmountNumber = (value: unknown, fallback = 0) => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : fallback;
  }
  if (typeof value === "string") {
    const cleaned = value.replace(/,/g, "").trim();
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
};

const formatMoney = (amount: number, currency?: string | null) => {
  const code = normalizeCurrencyCode(currency);
  const value = Number.isFinite(amount) ? amount : 0;
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: code,
      currencyDisplay: "code",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${code} ${value.toLocaleString("en-IN")}`;
  }
};

const formatPaidVsTotal = (
  paidAmount: number,
  totalAmount: number,
  currency?: string | null,
) => `${formatMoney(paidAmount, currency)} / ${formatMoney(totalAmount, currency)}`;

const getPaymentProgress = (paidAmount: number, totalAmount: number) => {
  if (!Number.isFinite(paidAmount) || !Number.isFinite(totalAmount) || totalAmount <= 0) {
    return 0;
  }
  return Math.max(0, Math.min((paidAmount / totalAmount) * 100, 100));
};

const matchesQuickFilter = (quickFilter: QuickFilter, booking: Booking) => {
  switch (quickFilter) {
    case 'ALL':
      return true
    case 'ACTIVE':
      return booking.status === 'confirmed'
    case 'PENDING':
      return booking.status === 'pending'
    case 'CANCELLED':
      return booking.status === 'cancelled'
    case 'PAYMENT_DUE':
      return booking.payment === 'partial' || booking.payment === 'unpaid'
    case 'OVERDUE':
      return booking.deadlineRiskLevel === 'OVERDUE'
    default:
      return true
  }
}

const getDefaultInvoiceDueDate = () => {
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 7);
  return dueDate.toISOString().split("T")[0];
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
        <FaCircleExclamation className="text-red-600 dark:text-red-400" />
      : <FaClock className="text-blue-600 dark:text-blue-400" />}
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

// Create Booking Modal
const CreateBookingModal = ({
  isOpen,
  onClose,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: NewBookingData) => Promise<boolean>;
}) => {
  const bookingsService = useBookingsService();
  const leadsService = useLeadsService();
  const isUuid = (value?: string) =>
    Boolean(
      value &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        value,
      ),
    );
  const [quotationOptions, setQuotationOptions] = useState<QuoteOption[]>([]);
  const [quotationLoading, setQuotationLoading] = useState(false);
  const [quotationAutofillLoading, setQuotationAutofillLoading] =
    useState(false);
  const [supplierOptions, setSupplierOptions] = useState<SupplierOption[]>([]);
  const [supplierLoading, setSupplierLoading] = useState(false);
  const [supplierError, setSupplierError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [quotationError, setQuotationError] = useState("");
  const savedDraft = readBookingsCreateDraft();
  const [selectedQuotationId, setSelectedQuotationId] = useState(
    () => savedDraft?.selectedQuotationId ?? "",
  );
  const [formData, setFormData] = useState<NewBookingData>(() => {
    const draft = savedDraft?.formData as Partial<NewBookingData> | undefined;
    return {
      quotationId: draft?.quotationId ?? "",
      customer: draft?.customer ?? "",
      email: draft?.email ?? "",
      phone: draft?.phone ?? "",
      destination: draft?.destination ?? "",
      travelStart: draft?.travelStart ?? "",
      travelEnd: draft?.travelEnd ?? "",
      totalAmount: Number(draft?.totalAmount) || 0,
      costAmount: Number(draft?.costAmount) || 0,
      advanceRequired: Number(draft?.advanceRequired) || 0,
      supplierId: draft?.supplierId ?? "",
      supplierName: draft?.supplierName ?? "",
      blockingDeadlineAt: draft?.blockingDeadlineAt ?? "",
      supplierPaymentDeadlineAt: draft?.supplierPaymentDeadlineAt ?? "",
      cancellationDeadlineAt: draft?.cancellationDeadlineAt ?? "",
      currency: draft?.currency ?? "INR",
      notes: draft?.notes ?? "",
    };
  });
  const [errors, setErrors] = useState<
    Partial<Record<keyof NewBookingData, string>>
  >({});

  const toInputDate = (value?: string) => {
    if (!value) return "";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "";
    return parsed.toISOString().split("T")[0];
  };

  const normalizePhoneNumber = (value: unknown) =>
    String(value ?? "")
      .replace(/\D/g, "")
      .slice(0, 10);

  const resolveLeadDestination = (record: any) => {
    if (!record) return "";
    if (typeof record.destination === "string") return record.destination;
    if (record.destination && typeof record.destination === "object") {
      return record.destination.name ?? record.destination.country ?? "";
    }
    return record.destinationName ?? "";
  };

  const loadQuotations = async () => {
    const cachedQuotations = getCachedQuotationOptions();
    if (cachedQuotations?.length) {
      setQuotationOptions(cachedQuotations);
      return;
    }

    setQuotationLoading(true);
    setQuotationError("");
    try {
      const [quotationsRes, leadsRows, bookingsRes] = await Promise.all([
        quotationsApi.list({ page: 1, limit: 50 }),
        leadsService.listLeadsRaw({ page: 1, limit: 500 }).catch(() => []),
        bookingsService
          .list({ page: 1, limit: 1000 })
          .catch(() => ({ data: { data: [] } })),
      ]);

      const raw =
        (quotationsRes as any)?.data?.data ??
        (quotationsRes as any)?.data?.items ??
        (quotationsRes as any)?.data ??
        quotationsRes ??
        [];

      const leadById: Record<string, any> = {};
      (Array.isArray(leadsRows) ? leadsRows : []).forEach((lead: any) => {
        const leadId = String(lead?.id ?? lead?.leadId ?? lead?.lead_id ?? "");
        if (leadId) {
          leadById[leadId] = lead;
        }
      });

      const bookedRows =
        (bookingsRes as any)?.data?.data ??
        (bookingsRes as any)?.data?.items ??
        (bookingsRes as any)?.data ??
        bookingsRes ??
        [];

      const bookedQuotationIds = new Set(
        (Array.isArray(bookedRows) ? bookedRows : [])
          .map((row: any) =>
            String(
              row?.quotationId ??
                row?.quotation_id ??
                row?.quoteId ??
                row?.quote_id ??
                "",
            ),
          )
          .filter(Boolean),
      );

      const options: QuoteOption[] = (Array.isArray(raw) ? raw : [])
        .map((q: any) => {
          const id = String(
            q.id ?? q.quotationId ?? q.quotation_id ?? q.code ?? "",
          );
          if (!id) return null;
          if (bookedQuotationIds.has(id)) return null;

          const leadId = String(
            q?.leadId ?? q?.lead_id ?? q?.lead?.id ?? q?.leadSnapshot?.id ?? "",
          );
          const lead = leadId ? leadById[leadId] : null;

          const quoteNumber =
            q.quoteNumber ?? q.quotationNumber ?? q.code ?? id;

          const customer =
            q.customerName ?? q.customer ?? q.clientName ?? q.lead?.name ?? "";

          const resolvedCustomer =
            customer ||
            q.lead?.fullName ||
            q.leadSnapshot?.name ||
            lead?.fullName ||
            lead?.name ||
            "Unknown Customer";

          const displayLabel = `${resolvedCustomer} - ${quoteNumber}`;
          return {
            id,
            value: id,
            label: displayLabel,
            selectedLabel: displayLabel,
            searchText: `${resolvedCustomer} ${quoteNumber}`,
            leftLabel: resolvedCustomer,
            rightLabel: quoteNumber,
          };
        })
        .filter(Boolean) as QuoteOption[];
      setQuotationOptions(options);
      setCachedQuotationOptions(options);
    } catch (error) {
      console.error("Failed to load quotations:", error);
      reportApiError(error, "Failed to load quotations", setQuotationError);
      setQuotationOptions([]);
    } finally {
      setQuotationLoading(false);
    }
  };

  const loadSuppliers = async () => {
    const cachedSuppliers = getCachedSupplierOptions();
    if (cachedSuppliers?.length) {
      setSupplierOptions(cachedSuppliers);
      return;
    }

    setSupplierLoading(true);
    setSupplierError("");
    try {
      const res = await suppliersApi.list({
        page: 1,
        limit: 200,
        isActive: true,
      });
      const raw =
        (res as any)?.data?.data ??
        (res as any)?.data?.items ??
        (res as any)?.data ??
        res ??
        [];
      const options: SupplierOption[] = (Array.isArray(raw) ? raw : [])
        .map((item: any) => {
          const id = String(item?.id ?? "");
          const name = String(item?.name ?? item?.supplierName ?? "").trim();
          if (!id || !name) return null;
          const country = String(item?.country ?? "").trim();
          const currency = String(
            item?.supplierCurrency ?? item?.supplier_currency ?? "",
          ).trim();
          const location = country ? ` | ${country}` : "";
          const currencyLabel = currency ? ` | ${currency}` : "";
          return {
            id,
            name,
            label: `${name}${location}${currencyLabel}`,
          };
        })
        .filter(Boolean) as SupplierOption[];

      options.sort((left, right) => left.name.localeCompare(right.name));
      setSupplierOptions(options);
      setCachedSupplierOptions(options);
    } catch (error) {
      console.error("Failed to load suppliers:", error);
      reportApiError(error, "Failed to load suppliers", setSupplierError);
      setSupplierOptions([]);
    } finally {
      setSupplierLoading(false);
    }
  };

  const applyQuotationToForm = (quote: any) => {
    if (!quote) return;
    const lead =
      quote.lead ??
      quote.leadSnapshot ??
      quote.templateSnapshot?.lead ??
      quote.customerSnapshot ??
      quote.client ??
      quote.customer ??
      {};
    const customer =
      lead?.name ??
      lead?.fullName ??
      quote.customer?.name ??
      quote.customerSnapshot?.name ??
      quote.customerName ??
      quote.clientName ??
      quote.customer ??
      formData.customer;
    const email =
      lead?.email ??
      lead?.primaryEmail ??
      quote.customer?.email ??
      quote.customerSnapshot?.email ??
      quote.email ??
      quote.customerEmail ??
      quote.clientEmail ??
      formData.email;
    const phone =
      lead?.phone ??
      lead?.mobile ??
      lead?.whatsapp ??
      quote.customer?.phone ??
      quote.customerSnapshot?.phone ??
      quote.phone ??
      quote.customerPhone ??
      quote.clientPhone ??
      formData.phone;
    const destination =
      quote.destination?.name ??
      quote.destinationName ??
      quote.destination ??
      quote.tripDestination ??
      quote.templateSnapshot?.destination ??
      lead?.destination ??
      formData.destination;
    const travelStart =
      quote.travelStartDate ??
      quote.travelStart ??
      quote.tripStartDate ??
      quote.startDate ??
      quote.templateSnapshot?.travelStartDate;
    const travelEnd =
      quote.travelEndDate ??
      quote.travelEnd ??
      quote.tripEndDate ??
      quote.endDate ??
      quote.templateSnapshot?.travelEndDate;
    const totalAmountRaw =
      quote.finalPrice ??
      quote.totalSaleValue ??
      quote.totalCost ??
      quote.totalAmount ??
      quote.pricing?.total ??
      quote.pricing?.finalPrice;
    const totalAmount =
      totalAmountRaw !== undefined ?
        Number(totalAmountRaw) || 0
      : formData.totalAmount;
    const costAmountRaw =
      quote.totalCost ??
      quote.costAmount ??
      quote.supplierCost ??
      quote.cost ??
      quote.totalAmount ??
      quote.pricing?.cost ??
      quote.pricing?.supplierCost;
    const costAmount =
      costAmountRaw !== undefined ?
        Number(costAmountRaw) || 0
      : formData.costAmount;
    const advanceRequiredRaw =
      quote.advanceRequired ?? quote.advance_required ?? quote.advanceAmount;
    const advanceRequired =
      advanceRequiredRaw !== undefined ?
        Number(advanceRequiredRaw) || 0
      : formData.advanceRequired;
    const supplierDetails =
      quote.supplierDetails ??
      quote.supplier_details ??
      quote.supplier ??
      quote.templateSnapshot?.supplierDetails ??
      quote.templateSnapshot?.supplier ??
      {};
    const supplierId = String(
      supplierDetails?.supplierId ??
        supplierDetails?.supplier_id ??
        quote.supplierId ??
        quote.supplier_id ??
        quote.templateSnapshot?.supplierId ??
        quote.templateSnapshot?.supplier_id ??
        "",
    ).trim();
    const supplierName =
      String(
        supplierDetails?.supplierName ??
          supplierDetails?.supplier_name ??
          quote.supplierName ??
          quote.supplier_name ??
          quote.templateSnapshot?.supplierName ??
          quote.templateSnapshot?.supplier_name ??
          supplierOptions.find((item) => item.id === supplierId)?.name ??
          "",
      ).trim() || "";
    setFormData((prev) => ({
      ...prev,
      customer: customer ?? prev.customer,
      email: email ?? prev.email,
      phone: normalizePhoneNumber(phone ?? prev.phone),
      destination: destination ?? prev.destination,
      travelStart: toInputDate(travelStart) || prev.travelStart,
      travelEnd: toInputDate(travelEnd) || prev.travelEnd,
      totalAmount,
      costAmount,
      advanceRequired,
      supplierId,
      supplierName,
    }));
  };

  useEffect(() => {
    if (!isOpen) return;
    void loadQuotations();
    void loadSuppliers();
  }, [isOpen]);

  const quotationDropdownOptions = useMemo(
    () => [
      {
        value: "",
        label: quotationLoading ? "Loading quotations..." : "Select quotation",
      },
      ...quotationOptions.map((option) => ({
        value: option.id,
        label: option.label,
        selectedLabel: option.selectedLabel,
        searchText: option.searchText,
        leftLabel: option.leftLabel,
        rightLabel: option.rightLabel,
      })),
    ],
    [quotationLoading, quotationOptions],
  );

  const supplierDropdownOptions = useMemo(
    () => [
      {
        value: "",
        label: supplierLoading ? "Loading suppliers..." : "Select supplier",
      },
      ...supplierOptions.map((option) => ({
        value: option.id,
        label: option.label,
      })),
    ],
    [supplierLoading, supplierOptions],
  );

  const currencyOptions = useMemo(() => getCurrencyOptions(false), []);

  const handleSupplierChange = (supplierId: string) => {
    const selectedSupplier = supplierOptions.find(
      (item) => item.id === supplierId,
    );
    setFormData((prev) => ({
      ...prev,
      supplierId,
      supplierName:
        selectedSupplier?.name ?? (supplierId ? prev.supplierName : ""),
    }));
  };

  const handleQuotationChange = async (quotationId: string) => {
    setSelectedQuotationId(quotationId);
    setFormData((prev) => ({ ...prev, quotationId }));
    if (!quotationId) return;
    setQuotationAutofillLoading(true);
    try {
      const res = await quotationsApi.getById(quotationId);
      const quote =
        (res as any)?.data?.data ?? (res as any)?.data ?? res ?? null;
      const resolvedId = String(
        quote?.id ??
          quote?.quotationId ??
          quote?.quotation_id ??
          quotationId ??
          "",
      );
      if (isUuid(resolvedId)) {
        setFormData((prev) => ({ ...prev, quotationId: resolvedId }));
        setQuotationError("");
      } else {
        setQuotationError("Selected quotation has no valid UUID");
      }
      
      // Extract currency from quotation
      const quoteCurrency = String(
        quote?.clientCurrency ??
          quote?.client_currency ??
          quote?.costCurrency ??
          quote?.cost_currency ??
          quote?.currency ??
          ""
      ).trim().toUpperCase();
      
      applyQuotationToForm(quote);
      
      // Set currency if valid
      if (/^[A-Z]{3}$/.test(quoteCurrency)) {
        setFormData((prev) => ({ ...prev, currency: quoteCurrency }));
      }

      const leadId =
        quote?.leadId ??
        quote?.lead_id ??
        quote?.lead?.id ??
        quote?.leadSnapshot?.id ??
        quote?.leadSnapshot?.leadId ??
        null;

      if (leadId) {
        try {
          const leadRes = await leadsService.getLeadById(String(leadId));
          const lead =
            (leadRes as any)?.data?.data ??
            (leadRes as any)?.data ??
            leadRes ??
            null;
          const isBlank = (value?: string) =>
            !value || value === "N/A" || value === "NA";
          if (lead) {
            setFormData((prev) => ({
              ...prev,
              customer:
                isBlank(prev.customer) ?
                  (lead.name ?? lead.fullName ?? prev.customer)
                : prev.customer,
              email:
                isBlank(prev.email) ?
                  (lead.email ?? lead.primaryEmail ?? prev.email)
                : prev.email,
              phone:
                isBlank(prev.phone) ?
                  normalizePhoneNumber(
                    lead.phone ?? lead.mobile ?? lead.whatsapp ?? prev.phone,
                  )
                : prev.phone,
              destination:
                isBlank(prev.destination) ?
                  resolveLeadDestination(lead) || prev.destination
                : prev.destination,
            }));
          }
        } catch (leadError) {
          console.error("Failed to load lead for quotation:", leadError);
        }
      }
    } catch (error) {
      console.error("Failed to load quotation:", error);
      reportApiError(
        error,
        "Failed to load quotation details",
        setQuotationError,
      );
    } finally {
      setQuotationAutofillLoading(false);
    }
  };

  if (!isOpen) return null;

  const validate = () => {
    const newErrors: Partial<Record<keyof NewBookingData, string>> = {};
    if (!formData.quotationId) newErrors.quotationId = "Quotation is required";
    if (formData.quotationId && !isUuid(formData.quotationId)) {
      newErrors.quotationId = "Please select a valid quotation";
    }
    if (!formData.customer) newErrors.customer = "Customer name is required";
    if (!formData.phone) {
      newErrors.phone = "Phone number is required";
    } else if (!/^\d{10}$/.test(formData.phone)) {
      newErrors.phone = "Phone number must be exactly 10 digits";
    }
    if (!formData.destination)
      newErrors.destination = "Destination is required";
    if (!formData.travelStart)
      newErrors.travelStart = "Travel start date is required";
    if (!formData.travelEnd)
      newErrors.travelEnd = "Travel end date is required";
    if (formData.totalAmount <= 0)
      newErrors.totalAmount = "Total amount must be greater than 0";
    if (formData.costAmount < 0)
      newErrors.costAmount = "Cost amount must be 0 or greater";
    if (formData.costAmount > formData.totalAmount) {
      newErrors.costAmount = "Cost amount cannot exceed total amount";
    }

    if (formData.travelStart && formData.travelEnd) {
      if (formData.travelEnd < formData.travelStart) {
        newErrors.travelEnd = "Travel end must be after travel start";
      }
    }

    if (
      formData.blockingDeadlineAt &&
      formData.supplierPaymentDeadlineAt &&
      new Date(formData.blockingDeadlineAt).getTime() >
        new Date(formData.supplierPaymentDeadlineAt).getTime()
    ) {
      newErrors.blockingDeadlineAt =
        "Blocking deadline cannot be later than supplier payment deadline";
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const resetForm = () => {
    setFormData({
      quotationId: "",
      customer: "",
      email: "",
      phone: "",
      destination: "",
      travelStart: "",
      travelEnd: "",
      totalAmount: 0,
      costAmount: 0,
      advanceRequired: 0,
      supplierId: "",
      supplierName: "",
      blockingDeadlineAt: "",
      supplierPaymentDeadlineAt: "",
      cancellationDeadlineAt: "",
      currency: "INR",
      notes: "",
    });
    setErrors({});
    setQuotationError("");
    setSelectedQuotationId("");
    clearBookingsCreateDraft();
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setSubmitting(true);
    try {
      const saved = await onSave(formData);
      if (!saved) return;

      resetForm();
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 p-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Create New Booking
          </h3>
          <button
            onClick={() => {
              clearBookingsCreateDraft();
              onClose();
            }}
            disabled={submitting}
            className="text-gray-400 hover:text-gray-600"
          >
            <FaXmark className="text-xl" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Quotation Selector */}
          <div>
            <label className="field-label">Quotation ID</label>
            <SearchableDropdown
              value={selectedQuotationId}
              onChange={(value) => handleQuotationChange(value)}
              options={quotationDropdownOptions}
              hasError={Boolean(errors.quotationId)}
              searchPlaceholder="Search quotation..."
              disabled={quotationLoading}
            />
            {quotationError && (
              <p className="text-xs text-red-500 mt-1">{quotationError}</p>
            )}
            {errors.quotationId && (
              <p className="text-xs text-red-500 mt-1">{errors.quotationId}</p>
            )}
            {quotationAutofillLoading && (
              <p className="text-xs text-gray-500 mt-1">
                Autofilling details...
              </p>
            )}
          </div>

          {/* Customer Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="field-label">Customer Name *</label>
              <input
                type="text"
                value={formData.customer}
                onChange={(e) =>{
                  const value = e.target.value;
                  const OnlyLetters = /^[A-Za-z\s]+$/;
                  if (OnlyLetters.test(value) || value === "") {
                    setFormData({ ...formData, customer: value });
                  }
                }}
                className={`field-input ${
                  errors.customer ? "border-red-500" : ""
                }`}
                placeholder="Your Name"
              />
              {errors.customer && (
                <p className="text-xs text-red-500 mt-1">{errors.customer}</p>
              )}
            </div>
            <div>
              <label className="field-label">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className={`field-input ${
                  errors.email ? "border-red-500" : ""
                }`}
                placeholder="name@example.com"
              />
              {errors.email && (
                <p className="text-xs text-red-500 mt-1">{errors.email}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="field-label">Phone *</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => {
                  const normalizedPhone = normalizePhoneNumber(e.target.value);
                  setFormData({ ...formData, phone: normalizedPhone });
                }}
                className={`field-input ${
                  errors.phone ? "border-red-500" : ""
                }`}
                placeholder="Your Contact Number"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={10}
              />
              {errors.phone && (
                <p className="text-xs text-red-500 mt-1">{errors.phone}</p>
              )}
            </div>
            <div>
              <label className="field-label">Destination *</label>
              <input
                type="text"
                value={formData.destination}
                onChange={(e) =>
                  setFormData({ ...formData, destination: e.target.value })
                }
                className={`field-input ${
                  errors.destination ? "border-red-500" : ""
                }`}
                placeholder="Maldives"
              />
              {errors.destination && (
                <p className="text-xs text-red-500 mt-1">
                  {errors.destination}
                </p>
              )}
            </div>
          </div>

          {/* Travel Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="field-label">Travel Start *</label>
              <input
                type="date"
                value={formData.travelStart}
                onChange={(e) =>
                  setFormData({ ...formData, travelStart: e.target.value })
                }
                className={`field-input ${
                  errors.travelStart ? "border-red-500" : ""
                }`}
              />
              {errors.travelStart && (
                <p className="text-xs text-red-500 mt-1">
                  {errors.travelStart}
                </p>
              )}
            </div>
            <div>
              <label className="field-label">Travel End *</label>
              <input
                type="date"
                value={formData.travelEnd}
                onChange={(e) =>
                  setFormData({ ...formData, travelEnd: e.target.value })
                }
                className={`field-input ${
                  errors.travelEnd ? "border-red-500" : ""
                }`}
              />
              {errors.travelEnd && (
                <p className="text-xs text-red-500 mt-1">{errors.travelEnd}</p>
              )}
            </div>
          </div>

          {/* Deadlines */}
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Booking Deadlines
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="field-label">Blocking Deadline</label>
                <input
                  type="datetime-local"
                  value={formData.blockingDeadlineAt}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      blockingDeadlineAt: e.target.value,
                    })
                  }
                  className={`field-input ${
                    errors.blockingDeadlineAt ? "border-red-500" : ""
                  }`}
                />
                {errors.blockingDeadlineAt && (
                  <p className="text-xs text-red-500 mt-1">
                    {errors.blockingDeadlineAt}
                  </p>
                )}
              </div>
              <div>
                <label className="field-label">Supplier Payment Deadline</label>
                <input
                  type="datetime-local"
                  value={formData.supplierPaymentDeadlineAt}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      supplierPaymentDeadlineAt: e.target.value,
                    })
                  }
                  className="field-input"
                />
              </div>
              <div>
                <label className="field-label">Cancellation Deadline</label>
                <input
                  type="datetime-local"
                  value={formData.cancellationDeadlineAt}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      cancellationDeadlineAt: e.target.value,
                    })
                  }
                  className="field-input"
                />
              </div>
            </div>
          </div>

          {/* Structured Service Blocks */}
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Structured Service Details
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="field-label">Supplier (Directory)</label>
                <SearchableDropdown
                  value={formData.supplierId}
                  onChange={(value) => handleSupplierChange(value)}
                  options={supplierDropdownOptions}
                  searchPlaceholder="Search supplier..."
                  disabled={supplierLoading}
                />
                {supplierError && (
                  <p className="text-xs text-red-500 mt-1">{supplierError}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Select from supplier master, or keep manual name below.
                </p>
              </div>
              <div>
                <label className="field-label">Supplier Name</label>
                <input
                  type="text"
                  value={formData.supplierName}
                  onChange={(e) =>
                    setFormData({ ...formData, supplierName: e.target.value })
                  }
                  className="field-input"
                  placeholder="Supplier/DMC Name"
                />
              </div>
            </div>
          </div>

          {/* Currency and Amounts */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="field-label">Currency *</label>
              <SearchableDropdown
                value={formData.currency || "INR"}
                onChange={(value) =>
                  setFormData({ ...formData, currency: value })
                }
                options={currencyOptions}
                searchPlaceholder="Search currency..."
              />
            </div>
            <div>
              <label className="field-label">Total Amount *</label>
              <input
                type="number"
                value={formData.totalAmount || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    totalAmount: parseFloat(e.target.value) || 0,
                  })
                }
                className={`field-input no-spinner ${
                  errors.totalAmount ? "border-red-500" : ""
                }`}
                placeholder="0.00"
                min="0"
                step="0.01"
              />
              {errors.totalAmount && (
                <p className="text-xs text-red-500 mt-1">
                  {errors.totalAmount}
                </p>
              )}
            </div>
            <div>
              <label className="field-label">Cost Amount *</label>
              <input
                type="number"
                value={formData.costAmount || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    costAmount: parseFloat(e.target.value) || 0,
                  })
                }
                className={`field-input no-spinner ${
                  errors.costAmount ? "border-red-500" : ""
                }`}
                placeholder="0.00"
                min="0"
                step="0.01"
              />
              {errors.costAmount && (
                <p className="text-xs text-red-500 mt-1">{errors.costAmount}</p>
              )}
            </div>
          </div>

          <div>
            <label className="field-label">Advance Required</label>
            <input
              type="number"
              value={formData.advanceRequired || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  advanceRequired: parseFloat(e.target.value) || 0,
                })
              }
              className="field-input no-spinner"
              placeholder="0.00"
              min="0"
              step="0.01"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Leave as 0 to let the system auto-calculate the minimum advance.
            </p>
          </div>



          {/* Notes */}
          <div>
            <label className="field-label">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              rows={3}
              className="field-input"
              placeholder="Any special requests or notes..."
            />
          </div>
        </div>

        <div className="sticky bottom-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 p-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            {submitting ? "Creating..." : "Create Booking"}
          </button>
        </div>
      </div>
    </div>
  );
};

// Record Payment Modal
const RecordPaymentModal = ({
  isOpen,
  booking,
  onClose,
  onSave,
}: {
  isOpen: boolean;
  booking: Booking | null;
  onClose: () => void;
  onSave: (bookingId: string, data: PaymentData) => void;
}) => {
  const [formData, setFormData] = useState<PaymentData>({
    amount: 0,
    method: "cash",
    reference: "",
    notes: "",
    date: new Date().toISOString().split("T")[0],
  });
  const [errors, setErrors] = useState<{ amount?: string }>({});

  const paymentMethodOptions = useMemo(
    () => [
      { value: "cash", label: "Cash" },
      { value: "card", label: "Card" },
      { value: "bank", label: "Bank Transfer" },
      { value: "cheque", label: "Cheque" },
    ],
    [],
  );

  if (!isOpen || !booking) return null;

  const validate = () => {
    const newErrors: { amount?: string } = {};
    if (formData.amount <= 0)
      newErrors.amount = "Amount must be greater than 0";
    if (formData.amount > booking.total - booking.paid) {
      newErrors.amount = `Amount cannot exceed remaining balance ${formatMoney(
        booking.total - booking.paid,
        booking.currency,
      )}`;
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validate()) {
      onSave(booking.id, formData);
      onClose();
    }
  };

  const remainingAmount = booking.total - booking.paid;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-md w-full">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Record Payment
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <FaXmark className="text-xl" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Booking Info */}
          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg space-y-1">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {booking.customer}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Booking #{booking.bookingId}
            </p>
            <div className="flex justify-between text-xs mt-2">
              <span className="text-gray-500">
                Total: {formatMoney(booking.total, booking.currency)}
              </span>
              <span className="text-gray-500">
                Paid: {formatMoney(booking.paid, booking.currency)}
              </span>
              <span className="text-green-600 font-medium">
                Due: {formatMoney(remainingAmount, booking.currency)}
              </span>
            </div>
          </div>

          <div>
            <label className="field-label">
              Amount ({normalizeCurrencyCode(booking?.currency)}) *
            </label>
            <input
              type="number"
              value={formData.amount || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  amount: parseFloat(e.target.value) || 0,
                })
              }
              className={`field-input ${errors.amount ? "border-red-500" : ""}`}
              placeholder="0.00"
              min="0"
              step="0.01"
              max={remainingAmount}
            />
            {errors.amount && (
              <p className="text-xs text-red-500 mt-1">{errors.amount}</p>
            )}
          </div>

          <div>
            <label className="field-label">Payment Method</label>
            <SearchableDropdown
              value={formData.method}
              options={paymentMethodOptions}
              searchPlaceholder="Search payment method..."
              onChange={(value) =>
                setFormData({
                  ...formData,
                  method: value as PaymentData["method"],
                })
              }
            />
          </div>

          <div>
            <label className="field-label">Reference (Optional)</label>
            <input
              type="text"
              value={formData.reference}
              onChange={(e) =>
                setFormData({ ...formData, reference: e.target.value })
              }
              className="field-input"
              placeholder="e.g., Transaction ID, Cheque No."
            />
          </div>

          <div>
            <label className="field-label">Payment Date</label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) =>
                setFormData({ ...formData, date: e.target.value })
              }
              className="field-input"
            />
          </div>

          <div>
            <label className="field-label">Notes (Optional)</label>
            <textarea
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              rows={2}
              className="field-input"
              placeholder="Any additional notes..."
            />
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-gray-800 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700"
          >
            Record Payment
          </button>
        </div>
      </div>
    </div>
  );
};

// Generate Invoice Modal
const GenerateInvoiceModal = ({
  isOpen,
  booking,
  onClose,
  onSave,
}: {
  isOpen: boolean;
  booking: Booking | null;
  onClose: () => void;
  onSave: (bookingId: string, data: InvoiceData) => void;
}) => {
  const [formData, setFormData] = useState<InvoiceData>({
    bookingId: booking?.id || "",
    amount: booking?.total || 0,
    dueDate: getDefaultInvoiceDueDate(),
    items: [],
  });
  const [errors, setErrors] = useState<{ amount?: string }>({});

  if (!isOpen || !booking) return null;

  const validate = () => {
    const newErrors: { amount?: string } = {};
    if (formData.amount <= 0)
      newErrors.amount = "Amount must be greater than 0";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validate()) {
      onSave(booking.id, formData);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-md w-full">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Generate Invoice
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <FaXmark className="text-xl" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {booking.customer}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Booking #{booking.bookingId}
            </p>
          </div>

          <div>
            <label className="field-label">Invoice Amount *</label>
            <input
              type="number"
              value={formData.amount || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  amount: parseFloat(e.target.value) || 0,
                })
              }
              className={`field-input ${errors.amount ? "border-red-500" : ""}`}
              placeholder="0.00"
              min="0"
              step="0.01"
            />
            {errors.amount && (
              <p className="text-xs text-red-500 mt-1">{errors.amount}</p>
            )}
          </div>

          <div>
            <label className="field-label">Due Date</label>
            <input
              type="date"
              value={formData.dueDate}
              onChange={(e) =>
                setFormData({ ...formData, dueDate: e.target.value })
              }
              className="field-input"
            />
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400">
            Invoice will be generated with booking details and sent to customer.
          </p>
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-gray-800 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            Generate Invoice
          </button>
        </div>
      </div>
    </div>
  );
};

// Cancel Booking Modal
const CancelBookingModal = ({
  isOpen,
  booking,
  onClose,
  onConfirm,
}: {
  isOpen: boolean;
  booking: Booking | null;
  onClose: () => void;
  onConfirm: (bookingId: string, reason: string) => void;
}) => {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  if (!isOpen || !booking) return null;

  const handleSubmit = () => {
    if (!reason.trim()) {
      setError("Cancellation reason is required");
      return;
    }
    onConfirm(booking.id, reason);
    onClose();
    setReason("");
    setError("");
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-md w-full">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Cancel Booking
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <FaXmark className="text-xl" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {booking.customer}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Booking #{booking.bookingId}
            </p>
          </div>

          <p className="text-sm text-gray-600 dark:text-gray-400">
            Are you sure you want to cancel this booking? This action cannot be
            undone.
          </p>

          <div>
            <label className="field-label">Cancellation Reason *</label>
            <textarea
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setError("");
              }}
              rows={3}
              className={`field-input ${error ? "border-red-500" : ""}`}
              placeholder="Please provide a reason for cancellation..."
            />
            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-gray-800 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Go Back
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
          >
            Confirm Cancellation
          </button>
        </div>
      </div>
    </div>
  );
};

const BookingsPage: React.FC = () => {
  const bookingsService = useBookingsService()
  const leadsService = useLeadsService()
  const navigate = useNavigate()
  const location = useLocation()
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('ALL')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [error, setError] = useState('')
  const initialPageCache = getBookingsPageCache()
  const emptyStats: BookingsPageStats = {
    totalBookings: 0,
    activeBookings: 0,
    pendingBookings: 0,
    completedBookings: 0,
    cancelledBookings: 0,
    totalRevenue: 0,
    pendingPaymentsAmount: 0,
    pendingPaymentsCount: 0,
  }

  const [filterError, setFilterError] = useState('')
  const [showMobileFilters, setShowMobileFilters] = useState(false)
  const [loading, setLoading] = useState(!initialPageCache)
  const [bookingItems, setBookingItems] = useState<Booking[]>(
    () => (initialPageCache?.items as Booking[]) ?? [],
  )
  const [draftFilters, setDraftFilters] =
    useState<BookingFilterState>(defaultFilters)
  const [appliedFilters, setAppliedFilters] =
    useState<BookingFilterState>(defaultFilters)
  const [stats, setStats] = useState<BookingsPageStats>(
    () => initialPageCache?.stats ?? emptyStats,
  );
  const [statsLoading, setStatsLoading] = useState(!initialPageCache?.stats);
  const [statsError, setStatsError] = useState("");
  const [toast, setToast] = useState<{
    show: boolean;
    message: string;
    type: "success" | "error" | "info";
  }>({
    show: false,
    message: "",
    type: "success",
  });

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(() =>
    readBookingsCreateModalOpen(),
  );

  useEffect(() => {
    writeBookingsCreateModalOpen(showCreateModal);
  }, [showCreateModal]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  const pageSize = 15

  const normalizeStatus = (value?: string): BookingStatus => {
    switch ((value ?? "").toUpperCase()) {
      case "CONFIRMED":
        return "confirmed";
      case "CANCELLED":
      case "CANCELED":
        return "cancelled";
      case "PENDING":
      default:
        return "pending";
    }
  };

  const normalizePayment = (value?: string): PaymentStatus => {
    switch ((value ?? "").toUpperCase()) {
      case "PAID":
      case "FULL":
      case "FULLY_PAID":
      case "COMPLETE":
        return "paid";
      case "PARTIAL":
        return "partial";
      case "REFUNDED":
        return "refunded";
      case "UNPAID":
      default:
        return "unpaid";
    }
  };

  const normalizeDateTime = (value: unknown): string | null => {
    if (value === null || value === undefined || value === "") return null;

    const raw =
      typeof value === "string" ? value.trim()
      : typeof value === "number" ? String(value)
      : String(value);
    if (!raw) return null;

    const direct = new Date(raw);
    if (!Number.isNaN(direct.getTime())) return direct.toISOString();

    if (/^\d+$/.test(raw)) {
      const asNumber = Number(raw);
      if (Number.isFinite(asNumber)) {
        const tsDate = new Date(asNumber);
        if (!Number.isNaN(tsDate.getTime())) return tsDate.toISOString();
      }
    }

    return null;
  };

  const pickFirstDate = (...values: unknown[]): string | null => {
    for (const value of values) {
      const normalized = normalizeDateTime(value);
      if (normalized) return normalized;
    }
    return null;
  };

  const formatDateRange = (start?: string, end?: string, fallback?: string) => {
    if (!start && !end) return fallback ?? "—";
    const startLabel = start ? new Date(start).toLocaleDateString() : "—";
    const endLabel = end ? new Date(end).toLocaleDateString() : "—";
    return `${startLabel} - ${endLabel}`;
  };

  const mapBooking = (
    b: any,
    idx: number,
    lookups?: BookingLookups,
  ): Booking => {
    const deadlineInfo =
      b?.deadlineTracking ??
      b?.deadline_tracking ??
      b?.deadlineInsights ??
      b?.deadline_insights ??
      b?.deadlines ??
      {};

    const blockingDeadlineAt = pickFirstDate(
      b?.blockingDeadlineAt,
      b?.blocking_deadline_at,
      b?.blockingDeadline,
      b?.blocking_deadline,
      deadlineInfo?.blockingDeadlineAt,
      deadlineInfo?.blocking_deadline_at,
      deadlineInfo?.blockingDeadline,
      deadlineInfo?.blocking_deadline,
    );

    const supplierPaymentDeadlineAt = pickFirstDate(
      b?.supplierPaymentDeadlineAt,
      b?.supplier_payment_deadline_at,
      b?.supplierDeadlineAt,
      b?.supplier_deadline_at,
      b?.supplierDeadline,
      b?.supplier_deadline,
      deadlineInfo?.supplierPaymentDeadlineAt,
      deadlineInfo?.supplier_payment_deadline_at,
      deadlineInfo?.supplierDeadlineAt,
      deadlineInfo?.supplier_deadline_at,
      deadlineInfo?.supplierDeadline,
      deadlineInfo?.supplier_deadline,
    );

    const cancellationDeadlineAt = pickFirstDate(
      b?.cancellationDeadlineAt,
      b?.cancellation_deadline_at,
      b?.cancelDeadlineAt,
      b?.cancel_deadline_at,
      b?.cancellationDeadline,
      b?.cancellation_deadline,
      deadlineInfo?.cancellationDeadlineAt,
      deadlineInfo?.cancellation_deadline_at,
      deadlineInfo?.cancelDeadlineAt,
      deadlineInfo?.cancel_deadline_at,
      deadlineInfo?.cancellationDeadline,
      deadlineInfo?.cancellation_deadline,
    );

    const balanceDueBy = pickFirstDate(
      b?.balanceDueBy,
      b?.balance_due_by,
      b?.balanceDueAt,
      b?.balance_due_at,
      b?.dueBy,
      b?.due_by,
      deadlineInfo?.balanceDueBy,
      deadlineInfo?.balance_due_by,
      deadlineInfo?.balanceDueAt,
      deadlineInfo?.balance_due_at,
      deadlineInfo?.dueBy,
      deadlineInfo?.due_by,
    );

    const quotationId = String(
      b.quotationId ?? b.quotation_id ?? b.quoteId ?? b.quote_id ?? "",
    );
    const quotation =
      quotationId ? lookups?.quotationById?.[quotationId] : null;
    const leadId = String(
      b.leadId ??
        b.lead_id ??
        quotation?.leadId ??
        quotation?.lead_id ??
        quotation?.lead?.id ??
        "",
    );
    const lead = leadId ? lookups?.leadById?.[leadId] : null;
    const leadDestination =
      typeof lead?.destination === "string" ?
        lead.destination
      : (lead?.destination?.name ?? lead?.destinationName);
    const destinationId = String(
      lead?.destinationId ?? lead?.destination_id ?? "",
    );
    const destinationName =
      destinationId ? lookups?.destinationById?.[destinationId] : undefined;

    const leadEmail =
      lead?.email ?? lead?.primaryEmail ?? lead?.contactEmail ?? "";
    const leadPhone = lead?.phone ?? lead?.mobile ?? lead?.whatsapp ?? "";
    const consultantName =
      lead?.assignedUser?.fullName ??
      lead?.consultantName ??
      lead?.consultant ??
      "";
    const leadCreatedAt = pickFirstDate(
      lead?.createdAt,
      lead?.created_at,
      lead?.createdDate,
      lead?.created_date
    );

    const quotationCurrency = pickQuotationDisplayCurrencyCode(quotation);
    const leadCurrency = pickLeadDisplayCurrencyCode(lead);
    const storedBookingCurrency = pickFirstValidCurrencyCode(
      b.clientCurrency,
      b.client_currency,
      b.currency,
      b.supplierCurrency,
      b.supplier_currency,
    );

    return {
      id: String(b.id ?? idx),
      bookingId: b.bookingId ?? b.bookingNumber ?? b.code ?? `BK-${idx + 1}`,
      customer:
        b.customer ??
        b.customerName ??
        b.clientName ??
        b.leadName ??
        lead?.fullName ??
        lead?.name ??
        "Unknown",
      email: b.email ?? b.customerEmail ?? b.clientEmail ?? leadEmail ?? "",
      phone: b.phone ?? b.customerPhone ?? b.clientPhone ?? leadPhone ?? "",
      consultant: consultantName,
      destination:
        b.destination ??
        b.tripDestination ??
        destinationName ??
        leadDestination ??
        "N/A",
      dates: formatDateRange(
        b.travelStartDate ??
          b.travel_start_date ??
          b.travelStart ??
          b.travel_start,
        b.travelEndDate ?? b.travel_end_date ?? b.travelEnd ?? b.travel_end,
        b.dates,
      ),
      startDate:
        b.travelStartDate ??
        b.travel_start_date ??
        b.travelStart ??
        b.travel_start,
      endDate:
        b.travelEndDate ?? b.travel_end_date ?? b.travelEnd ?? b.travel_end,
      createdAt: b.createdAt ?? b.created_at ?? null,
      leadCreatedAt,
      status: normalizeStatus(b.status),
      payment: normalizePayment(b.paymentStatus ?? b.payment_status),
      paid: toAmountNumber(
        b.paid ??
          b.paidAmount ??
          b.paid_amount ??
          b.advanceReceived ??
          b.advance_received ??
          b.amountPaid ??
          b.amount_paid,
        0,
      ),
      total: toAmountNumber(
        b.total ?? b.totalAmount ?? b.total_amount ?? b.amount ?? b.amount_total,
        0,
      ),
      currency: normalizeCurrencyCode(
        quotationCurrency ?? leadCurrency ?? storedBookingCurrency,
      ),
      documentsReady: Number(b.documentsReady ?? b.documents?.ready ?? 0),
      documentsTotal: Number(b.documentsTotal ?? b.documents?.total ?? 0),
      // deadlineRiskLevel: normalizeDeadlineRisk(
      //   b.deadlineRiskLevel ?? b.deadline_risk_level ?? "SAFE",
      // ),
      blockingDeadlineAt,
      balanceDueBy,
      supplierPaymentDeadlineAt,
      cancellationDeadlineAt,
    };
  };

  // const normalizeDeadlineRisk = (value?: string): DeadlineRiskLevel => {
  //   const normalized = String(value ?? "").toUpperCase();
  //   if (
  //     normalized === "D2_DUE" ||
  //     normalized === "DEADLINE_DUE" ||
  //     normalized === "OVERDUE"
  //   ) {
  //     return normalized;
  //   }
  //   return "SAFE";
  // };

  // const formatRiskLabel = (value?: DeadlineRiskLevel) => {
  //   const risk = normalizeDeadlineRisk(value);
  //   if (risk === "SAFE") return "Safe";
  //   if (risk === "D2_DUE") return "D-2 Due";
  //   if (risk === "DEADLINE_DUE") return "Deadline Due";
  //   return "Overdue";
  // };

  useEffect(() => {
    const updatedBooking = (location.state as any)?.updatedBooking;
    if (!updatedBooking) return;
    const mapped = mapBooking(updatedBooking, 0);
    setBookingItems((prev) => {
      const index = prev.findIndex(
        (item) => item.id === mapped.id || item.bookingId === mapped.bookingId,
      );
      if (index == -1) {
        return [mapped, ...prev];
      }
      const next = [...prev];
      next[index] = { ...next[index], ...mapped };
      return next;
    });
    navigate("/bookings", { replace: true });
  }, [location.state, navigate]);

  const fetchBookingStats = useCallback(
    async (options?: { silent?: boolean }) => {
      const cached = getBookingsPageCache();
      const silent = options?.silent ?? Boolean(cached?.stats);
      if (!silent) {
        setStatsLoading(true);
      }
      try {
        const res = await bookingsService.stats();
        const nextStats = normalizeBookingApiStats(res);
        setStats(nextStats);
        setStatsError("");
        patchBookingsPageCache({ stats: nextStats });
      } catch (err) {
        console.error("Failed to load booking stats:", err);
        if (!silent) {
          reportApiError(err, "Failed to load booking stats", setStatsError);
        }
      } finally {
        setStatsLoading(false);
      }
    },
    [bookingsService],
  );

  const fetchBookings = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? isBookingsPageCacheFresh();
    if (!silent) {
      setLoading(true);
    }
    setError("");
    try {
      const unwrapList = (response: any) => {
        const payload =
          response?.data?.data ??
          response?.data?.items ??
          response?.data ??
          response ??
          [];
        return Array.isArray(payload) ? payload : [];
      };

      const params: Record<string, string | number | boolean> = {
        page: 1,
        limit: 500
      }
      const res = await bookingsService.list(params)
      const raw =
        (res as any)?.data?.data ??
        (res as any)?.data?.items ??
        (res as any)?.data ??
        res ??
        [];
      const bookingRows = Array.isArray(raw) ? raw : [];
      const lookups: BookingLookups = {
        quotationById: {},
        leadById: {},
        destinationById: {},
      };

      const quotationIds = Array.from(
        new Set(
          bookingRows
            .map((row: any) =>
              String(
                row?.quotationId ??
                  row?.quotation_id ??
                  row?.quoteId ??
                  row?.quote_id ??
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
          quotationRows.forEach((quote: any) => {
            const quoteId = String(
              quote?.id ?? quote?.quotationId ?? quote?.quotation_id ?? "",
            );
            if (quoteId) {
              lookups.quotationById[quoteId] = quote;
            }
          });
        } catch (_error) {
          lookups.quotationById = {};
        }
      }

      const leadIds = Array.from(
        new Set(
          bookingRows
            .map((row: any) => String(row?.leadId ?? row?.lead_id ?? ""))
            .concat(
              Object.values(lookups.quotationById).map((quote: any) =>
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
          const leadRows = await leadsService.listLeadsRaw({
            page: 1,
            limit: 500,
          });
          leadRows.forEach((lead: any) => {
            const leadId = String(
              lead?.id ?? lead?.leadId ?? lead?.lead_id ?? "",
            );
            if (leadId) {
              lookups.leadById[leadId] = lead;
            }
          });
        } catch (_error) {
          lookups.leadById = {};
        }
      }

      try {
        const destinationRows = await leadsService.getDestinations();
        destinationRows.forEach((destination: any) => {
          const destinationId = String(destination?.id ?? "");
          const destinationName = String(
            destination?.name ?? destination?.label ?? "",
          );
          if (destinationId && destinationName) {
            lookups.destinationById[destinationId] = destinationName;
          }
        });
      } catch (_error) {
        lookups.destinationById = {};
      }

      const mapped: Booking[] = bookingRows.map((b: any, idx: number) =>
        mapBooking(b, idx, lookups),
      );
      setBookingItems(mapped);
      patchBookingsPageCache({ items: mapped });
    } catch (err) {
      console.error("Failed to load bookings:", err);
      const message = reportApiError(err, "Failed to load bookings", setError);
      if (!silent) {
        setBookingItems([]);
        invalidateBookingsPageCache();
      }
    } finally {
      setLoading(false);
    }
  }, [bookingsService, leadsService])

  useEffect(() => {
    const fresh = isBookingsPageCacheFresh();
    void fetchBookingStats({ silent: fresh });
    void fetchBookings({ silent: fresh });
  }, [fetchBookingStats, fetchBookings]);

  const showToast = (message: string, type: "success" | "error" | "info") => {
    setToast({ show: true, message, type });
    setTimeout(
      () => setToast({ show: false, message: "", type: "success" }),
      3000,
    );
  };

  const handleSendConfirmation = async (bookingId: string) => {
    setLoading(true);
    try {
      await bookingsService.sendConfirmation(bookingId);
      invalidateBookingsPageCache();
      await Promise.all([
        fetchBookingStats({ silent: true }),
        fetchBookings({ silent: true }),
      ]);
      showToast("Booking confirmed successfully", "success");
    } catch (error) {
      console.error("Failed to send confirmation:", error);
      reportApiError(error, "Failed to confirm booking");
    } finally {
      setLoading(false);
    }
  };

  const handleApproveBooking = async (booking: Booking) => {
    if (booking.status === "confirmed") {
      showToast("Booking is already approved", "info");
      return;
    }

    setLoading(true);
    try {
      await bookingsService.approve(booking.id);
      invalidateBookingsPageCache();
      await Promise.all([
        fetchBookingStats({ silent: true }),
        fetchBookings({ silent: true }),
      ]);
      showToast("Booking approved successfully", "success");
    } catch (error) {
      console.error("Failed to approve booking:", error);
      reportApiError(error, "Failed to approve booking");
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSubmit = async (
    bookingId: string,
    paymentData: PaymentData,
  ) => {
    setLoading(true);
    try {
      await bookingsService.recordPayment(bookingId, paymentData);
      invalidateBookingsPageCache();
      await Promise.all([
        fetchBookingStats({ silent: true }),
        fetchBookings({ silent: true }),
      ]);
      showToast("Payment recorded successfully", "success");
    } catch (error) {
      console.error("Failed to record payment:", error);
      reportApiError(error, "Failed to record payment");
    } finally {
      setLoading(false);
    }
  };

  const handleInvoiceSubmit = async (bookingId: string) => {
    setLoading(true);
    try {
      await bookingsService.generateInvoice(bookingId);
      showToast("Invoice generated successfully", "success");
    } catch (error) {
      console.error("Failed to generate invoice:", error);
      reportApiError(error, "Failed to generate invoice");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBooking = async (data: NewBookingData) => {
    setLoading(true);
    try {
      const toIsoDateTime = (value?: string) => {
        if (!value) return undefined;
        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) return undefined;
        return parsed.toISOString();
      };

      const payload: Record<string, unknown> = {
        quotationId: data.quotationId,
        travelStartDate: data.travelStart,
        travelEndDate: data.travelEnd,
        totalAmount: data.totalAmount,
        costAmount: data.costAmount,
        blockingDeadlineAt: toIsoDateTime(data.blockingDeadlineAt),
        supplierPaymentDeadlineAt: toIsoDateTime(
          data.supplierPaymentDeadlineAt,
        ),
        cancellationDeadlineAt: toIsoDateTime(data.cancellationDeadlineAt),
        clientCurrency: normalizeCurrencyCode(data.currency),
        supplierDetails:
          data.supplierId || data.supplierName ?
            {
              supplierId: data.supplierId || undefined,
              supplierName: data.supplierName || undefined,
            }
          : undefined,
      };

      if (data.advanceRequired > 0) {
        payload.advanceRequired = data.advanceRequired;
      }

      await bookingsService.create(payload);
      showToast("Booking created successfully", "success");
      invalidateBookingsPageCache();
      invalidateBookingsFormDropdownCaches();
      await Promise.all([
        fetchBookingStats({ silent: true }),
        fetchBookings({ silent: true }),
      ]);
      return true;
    } catch (error) {
      console.error("Failed to create booking:", error);
      reportApiError(error, "Failed to create booking");
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = (booking: Booking) => {
    setSelectedBooking(booking);
    setShowCancelModal(true);
  };

  const handleCancelConfirm = async (bookingId: string, reason: string) => {
    setLoading(true);
    try {
      const validationError = validateBookingTransition("CANCELLED", reason);
      if (validationError) {
        showToast(validationError, "error");
        return;
      }
      await bookingsService.cancel(bookingId, reason);
      setBookingItems((prev) => {
        const next = prev.map((booking) =>
          booking.id === bookingId || booking.bookingId === bookingId ?
            { ...booking, status: "cancelled" as BookingStatus }
          : booking,
        );
        patchBookingsPageCache({ items: next });
        return next;
      });
      void fetchBookingStats({ silent: true });
      showToast("Booking cancelled successfully", "success");
    } catch (error) {
      console.error("Failed to cancel booking:", error);
      reportApiError(error, "Failed to cancel booking");
    } finally {
      setLoading(false);
    }
  }

  const destinationOptions = useMemo(
    () => [
      { value: '', label: 'All Destinations' },
      ...Array.from(
        new Set(
          bookingItems
            .map(item => String(item.destination ?? '').trim())
            .filter(Boolean)
        )
      )
        .sort((a, b) => a.localeCompare(b))
        .map(name => ({ value: name, label: name }))
    ],
    [bookingItems]
  )

  const statusOptions = useMemo(
    () => [
      { value: 'ALL', label: 'All Statuses' },
      { value: 'confirmed', label: 'Confirmed' },
      { value: 'pending', label: 'Pending' },
      { value: 'cancelled', label: 'Cancelled' }
    ],
    []
  )

  const paymentOptions = useMemo(
    () => [
      { value: 'ALL', label: 'All Payments' },
      { value: 'paid', label: 'Paid' },
      { value: 'partial', label: 'Partial' },
      { value: 'unpaid', label: 'Unpaid' },
      { value: 'refunded', label: 'Refunded' }
    ],
    []
  )

  const riskOptions = useMemo(
    () => [
      { value: 'ALL', label: 'All Risk Levels' },
      { value: 'SAFE', label: 'Safe' },
      { value: 'D2_DUE', label: 'D-2 Due' },
      { value: 'DEADLINE_DUE', label: 'Deadline Due' },
      { value: 'OVERDUE', label: 'Overdue' }
    ],
    []
  )

  const sortOptions = useMemo(
    () => [
      { value: 'NEWEST_FIRST', label: 'Newest First' },
      { value: 'OLDEST_FIRST', label: 'Oldest First' },
      { value: 'AMOUNT_HIGH_TO_LOW', label: 'Amount High-Low' },
      { value: 'AMOUNT_LOW_TO_HIGH', label: 'Amount Low-High' },
      { value: 'CUSTOMER_A_Z', label: 'Customer A-Z' }
    ],
    []
  )

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (appliedFilters.bookingId) count += 1
    if (appliedFilters.customer) count += 1
    if (appliedFilters.email) count += 1
    if (appliedFilters.phone) count += 1
    if (appliedFilters.consultant) count += 1
    if (appliedFilters.destination) count += 1
    if (appliedFilters.status !== 'ALL') count += 1
    if (appliedFilters.payment !== 'ALL') count += 1
    if (appliedFilters.risk !== 'ALL') count += 1
    if (appliedFilters.fromDate) count += 1
    if (appliedFilters.toDate) count += 1
    if (appliedFilters.sortBy !== 'NEWEST_FIRST') count += 1
    return count
  }, [appliedFilters])

  const updateDraftFilter = <K extends keyof BookingFilterState>(
    key: K,
    value: BookingFilterState[K]
  ) => {
    setDraftFilters(previous => ({
      ...previous,
      [key]: value
    }))
  }

  useEffect(() => {
    if (
      draftFilters.fromDate &&
      draftFilters.toDate &&
      draftFilters.fromDate > draftFilters.toDate
    ) {
      setFilterError('From Date cannot be later than To Date.')
      return
    }

    setFilterError('')
    const timer = window.setTimeout(() => {
      setAppliedFilters({
        ...draftFilters,
        bookingId: draftFilters.bookingId.trim(),
        customer: draftFilters.customer.trim(),
        email: draftFilters.email.trim(),
        phone: draftFilters.phone.trim(),
        consultant: draftFilters.consultant.trim()
      })
      setPage(1)
    }, 250)

    return () => window.clearTimeout(timer)
  }, [draftFilters])

  const filtered = useMemo(() => {
    return bookingItems.filter(booking => {
      if (!matchesQuickFilter(quickFilter, booking)) return false

      if (appliedFilters.status !== 'ALL' && booking.status !== appliedFilters.status)
        return false
      if (
        appliedFilters.payment !== 'ALL' &&
        booking.payment !== appliedFilters.payment
      ) {
        return false
      }
      if (
        appliedFilters.risk !== 'ALL' &&
        (booking.deadlineRiskLevel ?? 'SAFE') !== appliedFilters.risk
      ) {
        return false
      }
      if (
        appliedFilters.destination &&
        booking.destination !== appliedFilters.destination
      ) {
        return false
      }

      const createdAtIso = toIsoDate(booking.createdAt)
      if (appliedFilters.fromDate && (!createdAtIso || createdAtIso < appliedFilters.fromDate))
        return false
      if (appliedFilters.toDate && (!createdAtIso || createdAtIso > appliedFilters.toDate))
        return false

      if (
        appliedFilters.bookingId &&
        !String(booking.bookingId ?? '')
          .toLowerCase()
          .includes(appliedFilters.bookingId.toLowerCase())
      ) {
        return false
      }
      if (
        appliedFilters.customer &&
        !String(booking.customer ?? '')
          .toLowerCase()
          .includes(appliedFilters.customer.toLowerCase())
      ) {
        return false
      }
      if (
        appliedFilters.email &&
        !String(booking.email ?? '')
          .toLowerCase()
          .includes(appliedFilters.email.toLowerCase())
      ) {
        return false
      }
      if (
        appliedFilters.phone &&
        !String(booking.phone ?? '')
          .toLowerCase()
          .includes(appliedFilters.phone.toLowerCase())
      ) {
        return false
      }
      if (
        appliedFilters.consultant &&
        !String(booking.consultant ?? '')
          .toLowerCase()
          .includes(appliedFilters.consultant.toLowerCase())
      ) {
        return false
      }

      const query = search.toLowerCase().trim()
      if (!query) return true
      const createdAtText = booking.createdAt
        ? new Date(booking.createdAt).toLocaleDateString()
        : ''
      const haystack = [
        booking.bookingId,
        booking.customer,
        booking.email ?? "",
        booking.phone ?? "",
        booking.consultant ?? "",
        booking.destination,
        booking.status,
        booking.payment,
        createdAtText,
        createdAtIso,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(query)
    })
  }, [search, bookingItems, quickFilter, appliedFilters])

  const toTimestamp = (value?: string | null) => {
    if (!value) return 0;
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const ordered = useMemo(
    () =>
      [...filtered].sort((a, b) => {
        if (appliedFilters.sortBy === 'AMOUNT_HIGH_TO_LOW') {
          return Number(b.total || 0) - Number(a.total || 0)
        }
        if (appliedFilters.sortBy === 'AMOUNT_LOW_TO_HIGH') {
          return Number(a.total || 0) - Number(b.total || 0)
        }
        if (appliedFilters.sortBy === 'CUSTOMER_A_Z') {
          return String(a.customer || '').localeCompare(String(b.customer || ''))
        }
        if (appliedFilters.sortBy === 'OLDEST_FIRST') {
          const left = toTimestamp(a.createdAt)
          const right = toTimestamp(b.createdAt)
          return left - right
        }
        const left = toTimestamp(a.createdAt)
        const right = toTimestamp(b.createdAt)
        return right - left
      }),
    [filtered, appliedFilters.sortBy]
  )

  const totalPages = Math.max(1, Math.ceil(ordered.length / pageSize))
  const rows = ordered.slice((page - 1) * pageSize, page * pageSize)

  const handleResetFilters = () => {
    setFilterError('')
    setDraftFilters(defaultFilters)
    setAppliedFilters(defaultFilters)
    setQuickFilter('ALL')
    setSearch('')
    setShowMobileFilters(false)
    setPage(1)
  }

  const exportCurrentTable = () => {
    if (!rows.length) return;

    const headers = [
      "Booking ID",
      "Customer",
      "Destination",
      "Dates",
      "Status",
      "Payment",
      "Paid",
      "Total",
      "Enquiry Date",
      "Booking Date",
    ];

    const escapeCsv = (value: string) => `"${value.replace(/\"/g, '\"\"')}"`;

    const formatDate = (dateValue?: string | null) => {
      if (!dateValue) return "";
      try {
        return new Date(dateValue).toLocaleDateString();
      } catch {
        return "";
      }
    };

    const dataRows = rows.map((booking) => [
      booking.bookingId ?? "",
      booking.customer ?? "",
      booking.destination ?? "",
      booking.dates ?? "",
      booking.status ?? "",
      booking.payment ?? "",
      booking.paid ?? 0,
      booking.total ?? 0,
      formatDate(booking.leadCreatedAt),
      formatDate(booking.createdAt),
    ]);

    const csv = [headers, ...dataRows]
      .map((row) => row.map((cell) => escapeCsv(String(cell))).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `bookings-page-${page}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
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
      <CreateBookingModal
        isOpen={showCreateModal}
        onClose={() => {
          clearBookingsCreateDraft();
          setShowCreateModal(false);
        }}
        onSave={handleCreateBooking}
      />

      <RecordPaymentModal
        isOpen={showPaymentModal}
        booking={selectedBooking}
        onClose={() => {
          setShowPaymentModal(false);
          setSelectedBooking(null);
        }}
        onSave={handlePaymentSubmit}
      />

      <GenerateInvoiceModal
        isOpen={showInvoiceModal}
        booking={selectedBooking}
        onClose={() => {
          setShowInvoiceModal(false);
          setSelectedBooking(null);
        }}
        onSave={handleInvoiceSubmit}
      />

      <CancelBookingModal
        isOpen={showCancelModal}
        booking={selectedBooking}
        onClose={() => {
          setShowCancelModal(false);
          setSelectedBooking(null);
        }}
        onConfirm={handleCancelConfirm}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
            Bookings
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            Monitor confirmations, payments, and documents from one place.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-blue-700 w-full sm:w-auto"
          >
            <FaPlus className="mr-2" /> New Booking
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <SurfaceCard hoverable className="p-3 sm:p-5">
          <div className="flex items-start justify-between">
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs uppercase tracking-wide text-gray-500 truncate">
                Upcoming Trips
              </p>
              <p className="text-lg sm:text-2xl font-semibold text-gray-900 dark:text-gray-100 mt-1">
                {statsLoading ?
                  <span className="inline-block h-6 w-16 rounded bg-gray-200 animate-pulse" />
                : stats.activeBookings}
              </p>
              <p className="mt-1 text-xs text-green-600 flex items-center">
                <FaArrowTrendUp className="mr-1 text-xs" /> From bookings
              </p>
              {statsError && (
                <p className="mt-1 text-xs text-red-500">{statsError}</p>
              )}
            </div>
            <FaCalendarDays className="text-blue-600 text-lg sm:text-xl flex-shrink-0" />
          </div>
        </SurfaceCard>
        <SurfaceCard hoverable className="p-3 sm:p-5">
          <div className="flex items-start justify-between">
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs uppercase tracking-wide text-gray-500 truncate">
                Unconfirmed
              </p>
              <p className="text-lg sm:text-2xl font-semibold text-gray-900 dark:text-gray-100 mt-1">
                {statsLoading ?
                  <span className="inline-block h-6 w-16 rounded bg-gray-200 animate-pulse" />
                : stats.pendingBookings}
              </p>
              <p className="mt-1 text-xs text-amber-600 truncate">
                Pending confirmation
              </p>
              {statsError && (
                <p className="mt-1 text-xs text-red-500">{statsError}</p>
              )}
            </div>
            <FaTriangleExclamation className="text-amber-500 text-lg sm:text-xl flex-shrink-0" />
          </div>
        </SurfaceCard>
        <SurfaceCard hoverable className="p-3 sm:p-5">
          <div className="flex items-start justify-between">
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs uppercase tracking-wide text-gray-500 truncate">
                Pending Payments
              </p>
	            <p className="text-lg sm:text-2xl font-semibold text-gray-900 dark:text-gray-100 mt-1">
	              {statsLoading ?
	                <span className="inline-block h-6 w-20 rounded bg-gray-200 animate-pulse" />
	                : stats.pendingPaymentsAmount.toLocaleString("en-IN")}
	            </p>
              <p className="mt-1 text-xs text-gray-500">
                {statsLoading ?
                  "Loading..."
                : `${stats.pendingPaymentsCount} bookings`}
              </p>
              {statsError && (
                <p className="mt-1 text-xs text-red-500">{statsError}</p>
              )}
            </div>
            <FaCreditCard className="text-red-500 text-lg sm:text-xl flex-shrink-0" />
          </div>
        </SurfaceCard>
      </div>

      {/* Main Card */}
      <SurfaceCard className="p-0 overflow-hidden border border-gray-200 dark:border-gray-800">
        {error && (
          <div className="border-b border-gray-100 dark:border-gray-800 px-4 py-2">
            <p className="text-xs sm:text-sm text-red-500">{error}</p>
          </div>
        )}

        {/* Filters Section */}
        <div className='border-b border-gray-100 dark:border-gray-800 p-3 sm:p-4 space-y-3'>
          {filterError ? (
            <div className='rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-200'>
              {filterError}
            </div>
          ) : null}

          <div className='w-full overflow-x-auto pb-1 scrollbar-hide'>
            <div className='inline-flex rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-1 min-w-max'>
              {quickFilters.map(item => (
                <button
                  key={item.key}
                  onClick={() => {
                    setQuickFilter(item.key)
                    setPage(1)
                  }}
                  className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg whitespace-nowrap transition-all ${
                    quickFilter === item.key
                      ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className='grid grid-cols-1 gap-3 lg:grid-cols-[1fr_auto] lg:items-end'>
            <div className='relative w-full'>
              <FaMagnifyingGlass className='absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400' />
              <input
                className='w-full pl-9 pr-4 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                placeholder='Search booking, customer, destination...'
                value={search}
                onChange={event => {
                  setSearch(event.target.value)
                  setPage(1)
                }}
              />
            </div>
            <div className='flex items-center justify-between gap-2 lg:block'>
              <div className='text-xs text-gray-500 dark:text-gray-400'>
                {activeFilterCount > 0
                  ? `${activeFilterCount} filter(s) applied`
                  : 'No filter applied'}
              </div>
              <button
                type='button'
                onClick={() => setShowMobileFilters(previous => !previous)}
                className='lg:hidden inline-flex items-center rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800'
              >
                <FaFilter className='mr-2' />
                {showMobileFilters ? 'Hide Filters' : 'Advanced Filters'}
              </button>
            </div>
          </div>

          <div
            className={`${
              showMobileFilters ? 'block' : 'hidden'
            } lg:block space-y-3 rounded-xl border border-gray-200 bg-gray-50/60 p-3 dark:border-gray-700 dark:bg-gray-900/30`}
          >
            <div className='grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5'>
              <div>
                <label className='mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300'>
                  Booking ID
                </label>
                <input
                  type='text'
                  value={draftFilters.bookingId}
                  onChange={event =>
                    updateDraftFilter('bookingId', event.target.value)
                  }
                  placeholder='Booking number'
                  className='w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:border-gray-700 dark:bg-gray-900'
                />
              </div>
              <div>
                <label className='mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300'>
                  Customer
                </label>
                <input
                  type='text'
                  value={draftFilters.customer}
                  onChange={event =>
                    updateDraftFilter('customer', event.target.value)
                  }
                  placeholder='Customer name'
                  className='w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:border-gray-700 dark:bg-gray-900'
                />
              </div>
              <div>
                <label className='mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300'>
                  Email
                </label>
                <input
                  type='text'
                  value={draftFilters.email}
                  onChange={event => updateDraftFilter('email', event.target.value)}
                  placeholder='Partial email'
                  className='w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:border-gray-700 dark:bg-gray-900'
                />
              </div>
              <div>
                <label className='mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300'>
                  Phone
                </label>
                <input
                  type='text'
                  value={draftFilters.phone}
                  onChange={event => updateDraftFilter('phone', event.target.value)}
                  placeholder='Partial phone'
                  className='w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:border-gray-700 dark:bg-gray-900'
                />
              </div>
              <div>
                <label className='mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300'>
                  Consultant
                </label>
                <input
                  type='text'
                  value={draftFilters.consultant}
                  onChange={event =>
                    updateDraftFilter('consultant', event.target.value)
                  }
                  placeholder='Consultant name'
                  className='w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:border-gray-700 dark:bg-gray-900'
                />
              </div>
            </div>

            <div className='grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6'>
              <div>
                <label className='mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300'>
                  From Date
                </label>
                <input
                  type='date'
                  value={draftFilters.fromDate}
                  onChange={event =>
                    updateDraftFilter('fromDate', event.target.value)
                  }
                  className='w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:border-gray-700 dark:bg-gray-900'
                />
              </div>
              <div>
                <label className='mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300'>
                  To Date
                </label>
                <input
                  type='date'
                  value={draftFilters.toDate}
                  onChange={event => updateDraftFilter('toDate', event.target.value)}
                  className='w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:border-gray-700 dark:bg-gray-900'
                />
              </div>
              <div>
                <label className='mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300'>
                  Destination
                </label>
                <SearchableDropdown
                  className='w-full'
                  value={draftFilters.destination}
                  options={destinationOptions}
                  placeholder='All Destinations'
                  searchPlaceholder='Search destination...'
                  onChange={value => updateDraftFilter('destination', value)}
                />
              </div>
              <div>
                <label className='mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300'>
                  Status
                </label>
                <SearchableDropdown
                  className='w-full'
                  value={draftFilters.status}
                  options={statusOptions}
                  placeholder='All Statuses'
                  searchPlaceholder='Search status...'
                  onChange={value =>
                    updateDraftFilter('status', value as BookingFilterState['status'])
                  }
                />
              </div>
              <div>
                <label className='mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300'>
                  Payment
                </label>
                <SearchableDropdown
                  className='w-full'
                  value={draftFilters.payment}
                  options={paymentOptions}
                  placeholder='All Payments'
                  searchPlaceholder='Search payment status...'
                  onChange={value =>
                    updateDraftFilter('payment', value as BookingFilterState['payment'])
                  }
                />
              </div>
              <div>
                <label className='mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300'>
                  Risk Level
                </label>
                <SearchableDropdown
                  className='w-full'
                  value={draftFilters.risk}
                  options={riskOptions}
                  placeholder='All Risk Levels'
                  searchPlaceholder='Search risk...'
                  onChange={value =>
                    updateDraftFilter('risk', value as BookingFilterState['risk'])
                  }
                />
              </div>
            </div>

            <div className='grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[1fr_auto]'>
              <div className='xl:max-w-xs'>
                <label className='mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300'>
                  Sort By
                </label>
                <SearchableDropdown
                  className='w-full'
                  value={draftFilters.sortBy}
                  options={sortOptions}
                  placeholder='Newest First'
                  searchPlaceholder='Search sort option...'
                  onChange={value =>
                    updateDraftFilter('sortBy', value as BookingFilterState['sortBy'])
                  }
                />
              </div>
              <div className='flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:self-end'>
                {showMobileFilters ? (
                  <button
                    type='button'
                    onClick={() => setShowMobileFilters(false)}
                    className='lg:hidden rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700'
                  >
                    <span className='inline-flex items-center gap-2'>
                      <FaXmark />
                      Hide Panel
                    </span>
                  </button>
                ) : null}
                <button
                  type='button'
                  onClick={exportCurrentTable}
                  disabled={!rows.length}
                  className='inline-flex items-center justify-center rounded-xl border border-green-500 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-green-400 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700'
                >
                  <FaDownload className='mr-2' /> Export
                </button>
                <button
                  type='button'
                  onClick={handleResetFilters}
                  className='rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700'
                >
                  Reset Filters
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bookings List */}
        {loading ?
          <div className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">
            Loading bookings...
          </div>
        : rows.length === 0 ?
          <div className="p-8">
            <EmptyState
              title="No bookings found"
              description="Try changing search or filters."
              icon={<FaCalendarDays className="text-4xl" />}
            />
          </div>
        : <>
            {/* Mobile View - Cards */}
            <div className="block lg:hidden divide-y divide-gray-100 dark:divide-gray-800">
              {rows.map((booking, index) => {
                const isApproved = booking.status === "confirmed";
                return (
                <div
                  key={booking.id}
                  className={`p-4 space-y-3 hover:bg-blue-50/40 dark:hover:bg-gray-800/50 transition-colors ${
                    index !== rows.length - 1 ?
                      "border-b border-gray-100 dark:border-gray-800"
                    : ""
                  }`}
                >
                  {/* Header with Booking ID and Status */}
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                        #{booking.bookingId}
                      </p>
                      <p className="text-xs text-gray-500">
                        {booking.customer}
                      </p>
                    </div>
                    <span
                      className={`inline-flex w-28 items-center justify-center whitespace-nowrap rounded-full border px-2 py-0.5 text-center text-xs font-medium capitalize ${
                        statusClasses[booking.status]
                      }`}
                    >
                      {booking.status}
                    </span>
                  </div>

                  {/* Destination and Dates */}
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {booking.destination}
                    </p>
                    <p className="text-xs text-gray-500">{booking.dates}</p>
                    <div className="flex flex-wrap gap-2">
                      {booking.balanceDueBy && (
                        <span className="rounded-full border border-gray-200 px-2 py-0.5 text-[11px] text-gray-600 dark:border-gray-700 dark:text-gray-300">
                          Balance by{" "}
                          {new Date(booking.balanceDueBy).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Payment Info */}
                  <div className="flex items-center justify-between">
                    <div>
                      <span
                        className={`${
                          (
                            booking.payment === "partial" ||
                            booking.payment === "unpaid"
                          ) ?
                            "rounded-md"
                          : "rounded-full"
                        } border px-2 py-0.5 text-xs font-medium capitalize ${
                          paymentClasses[booking.payment]
                        }`}
                      >
                        {booking.payment}
                      </span>
	                      <p className="text-xs text-gray-500 mt-1">
	                        {formatPaidVsTotal(
	                          booking.paid,
	                          booking.total,
	                          booking.currency,
	                        )}
	                      </p>
	                    </div>
	                  </div>

                  {/* Actions */}
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      className="p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      onClick={() =>
                        navigate(`/bookings/${booking.id}`, {
                          state: {
                            customerName: booking.customer,
                            blockingDeadlineAt: booking.blockingDeadlineAt,
                            supplierPaymentDeadlineAt:
                              booking.supplierPaymentDeadlineAt,
                            cancellationDeadlineAt:
                              booking.cancellationDeadlineAt,
                            balanceDueBy: booking.balanceDueBy,
                          },
                        })
                      }
                      title="View"
                    >
                      <FaEye className="text-sm" />
                    </button>
                    <button
                      className={`p-2.5 rounded-lg border transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                        isApproved ?
                          "border-green-200 bg-green-50 text-green-500 dark:border-green-800 dark:bg-green-900/20 dark:text-green-300"
                        : "border-gray-200 text-emerald-600 hover:bg-emerald-50 dark:border-gray-700 dark:text-emerald-400 dark:hover:bg-emerald-900/20"
                      }`}
                      onClick={() => handleApproveBooking(booking)}
                      disabled={loading || isApproved}
                      title={isApproved ? "Already Approved" : "Approve Booking"}
                    >
                      <FaCircleCheck className="text-sm" />
                    </button>
                    <button
                      onClick={() => handleSendConfirmation(booking.id)}
                      className="p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                      title="Send Confirmation"
                    >
                      <FaPaperPlane className="text-sm" />
                    </button>
                    <button
                      onClick={() => handleCancelBooking(booking)}
                      className="p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      title="Cancel Booking"
                    >
                      <FaXmark className="text-sm" />
                    </button>
                  </div>
                </div>
                );
              })}
            </div>

            {/* Desktop View - Table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="min-w-[980px] w-full divide-y divide-gray-200 dark:divide-gray-800">
                <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-800/95">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Booking ID
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Customer
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Dates
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Status
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Payment
                    </th>
                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {rows.map((booking) => {
                    const isApproved = booking.status === "confirmed";
                    return (
                    <tr
                      key={booking.id}
                      className="group transition-all duration-200 hover:bg-blue-50/30 dark:hover:bg-gray-800/40"
                    >
                      <td className="px-5 py-4 text-sm font-medium text-blue-600 dark:text-blue-300">
                        #{booking.bookingId}
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {booking.customer}
                        </p>
                        <p className="text-xs text-gray-500">
                          {booking.destination}
                        </p>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-700 dark:text-gray-200">
                        {booking.dates}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-col gap-1">
                          <span
                            className={`inline-flex w-28 items-center justify-center whitespace-nowrap rounded-full border px-2.5 py-1 text-center text-xs font-semibold capitalize ${
                              statusClasses[booking.status]
                            }`}
                          >
                            {booking.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`${
                              (
                                booking.payment === "partial" ||
                                booking.payment === "unpaid"
                              ) ?
                                "rounded-md"
                              : "rounded-full"
                            } border px-2.5 py-1 text-xs font-semibold capitalize ${
                              paymentClasses[booking.payment]
                            }`}
                          >
                            {booking.payment}
                          </span>
                          {/* {(booking.payment === "partial" ||
                            booking.payment === "unpaid") && (
                            <button 
                              onClick={() => handleRecordPayment(booking)}
                              disabled={loading}
                              className="inline-flex items-center rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300 dark:hover:bg-blue-900/30"
                              title="Record Payment"
                            >
                              Pay
                            </button>
                          )} */}
                        </div>
	                        <p className="mt-1 text-xs text-gray-500">
	                          {formatPaidVsTotal(
	                            booking.paid,
	                            booking.total,
	                            booking.currency,
	                          )}
	                        </p>
	                        <div className="mt-1 w-full bg-gray-200 rounded-full h-1.5">
	                          <div
	                            className="bg-green-600 h-1.5 rounded-full"
	                            style={{
	                              width: `${getPaymentProgress(
	                                booking.paid,
	                                booking.total,
	                              )}%`,
	                            }}
	                          />
	                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-1 transition-all duration-200">
                          <button
                            className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                            onClick={() =>
                              navigate(`/bookings/${booking.id}`, {
                                state: {
                                  customerName: booking.customer,
                                  blockingDeadlineAt:
                                    booking.blockingDeadlineAt,
                                  supplierPaymentDeadlineAt:
                                    booking.supplierPaymentDeadlineAt,
                                  cancellationDeadlineAt:
                                    booking.cancellationDeadlineAt,
                                  balanceDueBy: booking.balanceDueBy,
                                },
                              })
                            }
                            title="View Details"
                          >
                            <FaEye />
                          </button>
                          <button
                            onClick={() => handleApproveBooking(booking)}
                            disabled={loading || isApproved}
                            className={`rounded-lg border p-2 transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                              isApproved ?
                                "border-green-200 bg-green-50 text-green-500 dark:border-green-800 dark:bg-green-900/20 dark:text-green-300"
                              : "border-gray-200 text-emerald-600 hover:bg-emerald-50 dark:border-gray-700 dark:hover:bg-emerald-900/20"
                            }`}
                            title={isApproved ? "Already Approved" : "Approve Booking"}
                          >
                            <FaCircleCheck />
                          </button>
                          <button
                            onClick={() => handleSendConfirmation(booking.id)}
                            disabled={loading}
                            className="rounded-lg border border-gray-200 p-2 text-green-600 hover:bg-green-50 dark:border-gray-700 dark:hover:bg-green-900/20 disabled:opacity-50"
                            title="Send Confirmation"
                          >
                            <FaPaperPlane />
                          </button>
                          <button
                            onClick={() => handleCancelBooking(booking)}
                            className="rounded-lg border border-gray-200 p-2 text-red-600 hover:bg-red-50 dark:border-gray-700 dark:hover:bg-red-900/20"
                            title="Cancel Booking"
                          >
                            <FaXmark />
                          </button>
                        </div>
                      </td>
                    </tr>
                    );
                  })}
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
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
        .no-spinner::-webkit-outer-spin-button,
        .no-spinner::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        .no-spinner[type='number'] {
          -moz-appearance: textfield;
          appearance: textfield;
        }
      `}</style>
    </div>
  );
};

export default BookingsPage;
