import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import {
  FaFileInvoice,
  FaCreditCard,
  FaBan,
  FaClock,
  FaClockRotateLeft,
  FaDownload,
  FaEye,
  FaPlus,
  FaXmark,
  FaCircleCheck,
  FaCircleExclamation,
  FaArrowLeft
} from 'react-icons/fa6'
import { bookingsApi } from '../../api/bookings'
import { paymentsApi } from '../../api/payments'
import { quotationsApi } from '../../api/quotations'
import { getApiErrorMessage } from '../../api/apiClient'

// Types
type DeadlineRiskLevel = 'SAFE' | 'D2_DUE' | 'DEADLINE_DUE' | 'OVERDUE'

interface Booking {
  id: string
  bookingNumber: string
  customerName?: string
  quotationId: string
  quotationNumber?: string
  travelStart: string
  travelEnd: string
  totalAmount: number
  costAmount: number
  profit: number
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED'
  paymentStatus: 'PENDING' | 'PARTIAL' | 'COMPLETED' | 'REFUNDED'
  advanceRequired: number
  advanceReceived: number
  clientCurrency: string
  supplierCurrency: string
  cancellationReason?: string
  cancelledAt?: string
  cancelledBy?: string
  blockingDeadlineAt?: string
  supplierPaymentDeadlineAt?: string
  cancellationDeadlineAt?: string
  balanceDueBy?: string
  deadlineRiskLevel?: DeadlineRiskLevel
  supplierDetails?: Record<string, unknown>
  dmcDetails?: Record<string, unknown>
  hotelSegments?: Array<Record<string, unknown>>
  flightSegments?: Array<Record<string, unknown>>
  insuranceDetails?: Record<string, unknown>
  otherServices?: Array<Record<string, unknown>>
}

interface Invoice {
  id: string
  invoiceNumber: string
  amount: number
  status: 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED'
  dueDate: string
  createdAt: string
  generatedAt?: string
  paidAt?: string
  paidAmount?: number
  pdfUrl?: string
  notes?: string
}

interface StatusHistory {
  id: string
  status: string
  changedBy: string
  changedAt: string
  reason?: string
  type:
    | 'status_change'
    | 'invoice_generated'
    | 'payment_received'
    | 'cancellation'
}

interface Payment {
  id: string
  amount: number
  date: string
  mode: 'cash' | 'card' | 'bank' | 'gateway'
  reference?: string
  status: 'pending' | 'completed' | 'failed'
}

function unwrapData<T> (response: unknown): T | null {
  if (!response) return null
  if (typeof response === 'object' && response && 'data' in response) {
    return (response as { data: T }).data ?? null
  }
  return response as T
}

const toNumber = (value: unknown, fallback = 0) => {
  if (value === null || value === undefined) return fallback
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const toIso = (value: unknown): string | null => {
  if (!value) return null
  const date = new Date(String(value))
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString()
}

const normalizeDateTime = (value: unknown): string | undefined => {
  if (value === null || value === undefined || value === '') return undefined

  const raw =
    typeof value === 'string'
      ? value.trim()
      : typeof value === 'number'
      ? String(value)
      : String(value)
  if (!raw) return undefined

  const direct = new Date(raw)
  if (!Number.isNaN(direct.getTime())) return direct.toISOString()

  if (/^\d+$/.test(raw)) {
    const asNumber = Number(raw)
    if (Number.isFinite(asNumber)) {
      const tsDate = new Date(asNumber)
      if (!Number.isNaN(tsDate.getTime())) return tsDate.toISOString()
    }
  }

  return undefined
}

const pickFirstDate = (...values: unknown[]): string | undefined => {
  for (const value of values) {
    const normalized = normalizeDateTime(value)
    if (normalized) return normalized
  }
  return undefined
}

const normalizeStatus = (value?: string): Booking['status'] => {
  switch ((value ?? '').toUpperCase()) {
    case 'CONFIRMED':
      return 'CONFIRMED'
    case 'CANCELLED':
    case 'CANCELED':
      return 'CANCELLED'
    case 'PENDING':
    default:
      return 'PENDING'
  }
}

const normalizePaymentStatus = (value?: string): Booking['paymentStatus'] => {
  switch ((value ?? '').toUpperCase()) {
    case 'FULL':
    case 'COMPLETED':
    case 'PAID':
      return 'COMPLETED'
    case 'PARTIAL':
      return 'PARTIAL'
    case 'REFUNDED':
      return 'REFUNDED'
    case 'PENDING':
    default:
      return 'PENDING'
  }
}

const normalizeDeadlineRisk = (value?: string): DeadlineRiskLevel => {
  const normalized = String(value ?? '').toUpperCase()
  if (
    normalized === 'D2_DUE' ||
    normalized === 'DEADLINE_DUE' ||
    normalized === 'OVERDUE'
  ) {
    return normalized
  }
  return 'SAFE'
}

const normalizePaymentMode = (value?: string): Payment['mode'] => {
  switch ((value ?? '').toUpperCase()) {
    case 'CASH':
      return 'cash'
    case 'CARD':
      return 'card'
    case 'PAYMENT_GATEWAY':
    case 'GATEWAY':
    case 'UPI':
      return 'gateway'
    case 'BANK_TRANSFER':
    case 'BANK':
    default:
      return 'bank'
  }
}

const mapBookingFromApi = (raw: any): Booking => {
  const totalAmount = toNumber(raw?.totalAmount ?? raw?.total_amount, 0)
  const costAmount = toNumber(raw?.costAmount ?? raw?.cost_amount, 0)
  const profit = Number((totalAmount - costAmount).toFixed(2))
  const advanceRequired = Math.max(
    toNumber(raw?.advanceRequired ?? raw?.advance_required, 0),
    0
  )
  const rawAdvanceReceived = Math.max(
    toNumber(raw?.advanceReceived ?? raw?.advance_received, 0),
    0
  )
  const advanceReceived = Math.min(rawAdvanceReceived, advanceRequired)
  const deadlineInfo =
    raw?.deadlineTracking ??
    raw?.deadline_tracking ??
    raw?.deadlineInsights ??
    raw?.deadline_insights ??
    raw?.deadlines ??
    {}

  const blockingDeadlineAt = pickFirstDate(
    raw?.blockingDeadlineAt,
    raw?.blocking_deadline_at,
    raw?.blockingDeadline,
    raw?.blocking_deadline,
    deadlineInfo?.blockingDeadlineAt,
    deadlineInfo?.blocking_deadline_at,
    deadlineInfo?.blockingDeadline,
    deadlineInfo?.blocking_deadline
  )

  const supplierPaymentDeadlineAt = pickFirstDate(
    raw?.supplierPaymentDeadlineAt,
    raw?.supplier_payment_deadline_at,
    raw?.supplierDeadlineAt,
    raw?.supplier_deadline_at,
    raw?.supplierDeadline,
    raw?.supplier_deadline,
    deadlineInfo?.supplierPaymentDeadlineAt,
    deadlineInfo?.supplier_payment_deadline_at,
    deadlineInfo?.supplierDeadlineAt,
    deadlineInfo?.supplier_deadline_at,
    deadlineInfo?.supplierDeadline,
    deadlineInfo?.supplier_deadline
  )

  const cancellationDeadlineAt = pickFirstDate(
    raw?.cancellationDeadlineAt,
    raw?.cancellation_deadline_at,
    raw?.cancelDeadlineAt,
    raw?.cancel_deadline_at,
    raw?.cancellationDeadline,
    raw?.cancellation_deadline,
    deadlineInfo?.cancellationDeadlineAt,
    deadlineInfo?.cancellation_deadline_at,
    deadlineInfo?.cancelDeadlineAt,
    deadlineInfo?.cancel_deadline_at,
    deadlineInfo?.cancellationDeadline,
    deadlineInfo?.cancellation_deadline
  )

  const balanceDueBy = pickFirstDate(
    raw?.balanceDueBy,
    raw?.balance_due_by,
    raw?.balanceDueAt,
    raw?.balance_due_at,
    raw?.dueBy,
    raw?.due_by,
    deadlineInfo?.balanceDueBy,
    deadlineInfo?.balance_due_by,
    deadlineInfo?.balanceDueAt,
    deadlineInfo?.balance_due_at,
    deadlineInfo?.dueBy,
    deadlineInfo?.due_by
  )

  return {
    id: String(raw?.id ?? ''),
    bookingNumber:
      raw?.bookingNumber ??
      raw?.booking_number ??
      raw?.code ??
      raw?.bookingId ??
      'N/A',
    customerName:
      raw?.customerName ??
      raw?.customer_name ??
      raw?.customer ??
      raw?.clientName ??
      raw?.client_name ??
      raw?.lead?.fullName ??
      raw?.lead?.name ??
      raw?.relations?.lead?.fullName ??
      raw?.relations?.lead?.name ??
      raw?.quotation?.lead?.fullName ??
      raw?.quotation?.lead?.name ??
      raw?.relations?.quotation?.lead?.fullName ??
      raw?.relations?.quotation?.lead?.name ??
      undefined,
    quotationId: raw?.quotationId ?? raw?.quotation_id ?? '',
    quotationNumber:
      raw?.quotationNumber ??
      raw?.quotation_number ??
      raw?.quotation?.quoteNumber ??
      raw?.relations?.quotation?.quoteNumber ??
      undefined,
    travelStart:
      raw?.travelStartDate ?? raw?.travel_start_date ?? raw?.travelStart ?? '',
    travelEnd:
      raw?.travelEndDate ?? raw?.travel_end_date ?? raw?.travelEnd ?? '',
    totalAmount,
    costAmount,
    profit,
    status: normalizeStatus(raw?.status),
    paymentStatus: normalizePaymentStatus(
      raw?.paymentStatus ?? raw?.payment_status
    ),
    advanceRequired,
    advanceReceived,
    clientCurrency: raw?.clientCurrency ?? raw?.client_currency ?? 'INR',
    supplierCurrency: raw?.supplierCurrency ?? raw?.supplier_currency ?? 'INR',
    cancellationReason:
      raw?.cancellationReason ?? raw?.cancellation_reason ?? undefined,
    cancelledAt: raw?.cancelledAt ?? raw?.cancelled_at ?? undefined,
    cancelledBy: raw?.cancelledBy ?? raw?.cancelled_by ?? undefined,
    blockingDeadlineAt,
    supplierPaymentDeadlineAt,
    cancellationDeadlineAt,
    balanceDueBy,
    deadlineRiskLevel: normalizeDeadlineRisk(
      raw?.deadlineRiskLevel ?? raw?.deadline_risk_level ?? 'SAFE'
    ),
    supplierDetails: raw?.supplierDetails ?? raw?.supplier_details ?? {},
    dmcDetails: raw?.dmcDetails ?? raw?.dmc_details ?? {},
    hotelSegments: raw?.hotelSegments ?? raw?.hotel_segments ?? [],
    flightSegments: raw?.flightSegments ?? raw?.flight_segments ?? [],
    insuranceDetails: raw?.insuranceDetails ?? raw?.insurance_details ?? {},
    otherServices: raw?.otherServices ?? raw?.other_services ?? []
  }
}

const addDays = (dateIso: string, days: number) => {
  const date = new Date(dateIso)
  if (Number.isNaN(date.getTime())) return dateIso
  date.setDate(date.getDate() + days)
  return date.toISOString().split('T')[0]
}

const mapInvoiceFromApi = (raw: any, booking: Booking): Invoice => {
  const generatedAt =
    toIso(raw?.generatedAt ?? raw?.generated_at ?? raw?.createdAt) ??
    new Date().toISOString()
  const createdAt = generatedAt
  const dueDate = raw?.dueDate ?? raw?.due_date ?? addDays(createdAt, 7)
  const amount = toNumber(
    raw?.amount ??
      raw?.totalAmount ??
      raw?.total_amount ??
      Math.max(booking.totalAmount - booking.advanceReceived, 0),
    0
  )
  const statusRaw = String(raw?.status ?? '').toUpperCase()
  const status: Invoice['status'] = [
    'DRAFT',
    'SENT',
    'PAID',
    'OVERDUE',
    'CANCELLED'
  ].includes(statusRaw)
    ? (statusRaw as Invoice['status'])
    : raw?.pdfUrl
    ? 'SENT'
    : 'DRAFT'
  return {
    id: String(raw?.id ?? ''),
    invoiceNumber:
      raw?.invoiceNumber ?? raw?.invoice_number ?? raw?.code ?? 'INV',
    amount,
    status,
    dueDate,
    createdAt,
    generatedAt,
    pdfUrl: raw?.pdfUrl ?? raw?.pdf_url ?? undefined
  }
}

const mapPaymentFromApi = (raw: any): Payment => {
  const statusRaw = String(raw?.status ?? '').toUpperCase()
  const isVerified = raw?.isVerified === true || raw?.is_verified === true
  const status: Payment['status'] =
    isVerified || statusRaw === 'FULL'
      ? 'completed'
      : statusRaw === 'REFUNDED'
      ? 'failed'
      : 'pending'
  return {
    id: String(raw?.id ?? ''),
    amount: toNumber(raw?.amount, 0),
    date:
      toIso(raw?.paidAt ?? raw?.paid_at ?? raw?.createdAt ?? raw?.created_at) ??
      new Date().toISOString(),
    mode: normalizePaymentMode(raw?.paymentMode ?? raw?.payment_mode),
    reference:
      raw?.paymentReference ??
      raw?.payment_reference ??
      raw?.gatewayPaymentId ??
      raw?.gateway_payment_id ??
      undefined,
    status
  }
}

const buildHistory = (
  rows: any[],
  invoices: Invoice[],
  payments: Payment[]
): StatusHistory[] => {
  const statusEntries = (Array.isArray(rows) ? rows : []).map(row => {
    const oldStatus = row?.oldStatus ?? row?.old_status ?? null
    const newStatus = row?.newStatus ?? row?.new_status ?? row?.status ?? ''
    return {
      id: String(row?.id ?? `status-${newStatus}-${row?.changedAt ?? ''}`),
      status: String(newStatus || 'UPDATED'),
      changedBy: row?.changedBy ?? row?.changed_by ?? 'System',
      changedAt:
        toIso(row?.changedAt ?? row?.changed_at) ?? new Date().toISOString(),
      reason:
        oldStatus && newStatus
          ? `Status changed from ${oldStatus} to ${newStatus}`
          : undefined,
      type: 'status_change' as const
    }
  })

  const invoiceEntries = invoices.map(invoice => ({
    id: `invoice-${invoice.id}`,
    status: 'INVOICE_GENERATED',
    changedBy: 'System',
    changedAt: invoice.generatedAt ?? invoice.createdAt,
    reason: invoice.invoiceNumber
      ? `Invoice ${invoice.invoiceNumber} generated`
      : 'Invoice generated',
    type: 'invoice_generated' as const
  }))

  const paymentEntries = payments.map(payment => ({
    id: `payment-${payment.id}`,
    status: 'PAYMENT_RECEIVED',
    changedBy: 'System',
    changedAt: payment.date,
    reason: `Payment of ${payment.amount} received`,
    type: 'payment_received' as const
  }))

  return [...statusEntries, ...invoiceEntries, ...paymentEntries].sort(
    (a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime()
  )
}

// Toast Component
const Toast = ({
  message,
  type
}: {
  message: string
  type: 'success' | 'error' | 'info'
  onClose: () => void
}) => (
  <div className='fixed top-4 left-1/2 transform -translate-x-1/2 z-50 animate-fadeIn'>
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border ${
        type === 'success'
          ? 'bg-green-50 border-green-200 dark:bg-green-900/30 dark:border-green-800'
          : type === 'error'
          ? 'bg-red-50 border-red-200 dark:bg-red-900/30 dark:border-red-800'
          : 'bg-blue-50 border-blue-200 dark:bg-blue-900/30 dark:border-blue-800'
      }`}
    >
      {type === 'success' ? (
        <FaCircleCheck className='text-green-600 dark:text-green-400' />
      ) : type === 'error' ? (
        <FaCircleExclamation className='text-red-600 dark:text-red-400' />
      ) : (
        <FaClock className='text-blue-600 dark:text-blue-400' />
      )}
      <p
        className={`text-sm font-medium ${
          type === 'success'
            ? 'text-green-800 dark:text-green-300'
            : type === 'error'
            ? 'text-red-800 dark:text-red-300'
            : 'text-blue-800 dark:text-blue-300'
        }`}
      >
        {message}
      </p>
    </div>
  </div>
)

// Invoice Details Modal
const InvoiceDetailsModal = ({
  isOpen,
  invoice,
  booking,
  contentRef,
  onClose,
  onDownload,
  onMarkAsPaid,
  currency
}: {
  isOpen: boolean
  invoice: Invoice | null
  booking?: Booking | null
  contentRef?: React.RefObject<HTMLDivElement | null>
  onClose: () => void
  onDownload: () => void
  onMarkAsPaid: () => void
  currency?: string
}) => {
  if (!isOpen || !invoice) return null

  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'>
      <div
        ref={contentRef}
        className='bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto'
      >
        <div className='sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 p-4 flex items-center justify-between'>
          <h3 className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
            Invoice Details
          </h3>
          <button
            onClick={onClose}
            className='text-gray-400 hover:text-gray-600'
          >
            <FaXmark className='text-xl' />
          </button>
        </div>

        <div className='p-6 space-y-6'>
          <div className='flex items-center justify-between'>
            <div>
              <p className='text-sm text-gray-500'>Invoice Number</p>
              <p className='text-xl font-bold text-gray-900'>
                {invoice.invoiceNumber}
              </p>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                invoice.status === 'PAID'
                  ? 'bg-green-100 text-green-800 border-green-200'
                  : invoice.status === 'SENT'
                  ? 'bg-blue-100 text-blue-800 border-blue-200'
                  : invoice.status === 'OVERDUE'
                  ? 'bg-red-100 text-red-800 border-red-200'
                  : 'bg-gray-100 text-gray-800 border-gray-200'
              }`}
            >
              {invoice.status}
            </span>
          </div>

          {booking && (
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <div className='p-4 bg-blue-50 rounded-lg border border-blue-100'>
                <p className='text-xs text-blue-600 font-semibold uppercase tracking-wide'>
                  Booking Context
                </p>
                <div className='mt-2 space-y-1.5 text-sm text-gray-800'>
                  <p>
                    <span className='text-gray-500'>Customer:</span>{' '}
                    <span className='font-medium'>
                      {booking.customerName || 'Unknown'}
                    </span>
                  </p>
                  <p>
                    <span className='text-gray-500'>Booking:</span>{' '}
                    <span className='font-medium'>
                      #{booking.bookingNumber}
                    </span>
                  </p>
                  <p>
                    <span className='text-gray-500'>Quotation:</span>{' '}
                    <span className='font-medium'>
                      {booking.quotationNumber ||
                        `#${String(booking.quotationId || '').slice(0, 8)}`}
                    </span>
                  </p>
                  <p>
                    <span className='text-gray-500'>Travel:</span>{' '}
                    <span className='font-medium'>
                      {new Date(booking.travelStart).toLocaleDateString()} -{' '}
                      {new Date(booking.travelEnd).toLocaleDateString()}
                    </span>
                  </p>
                </div>
              </div>

              <div className='p-4 bg-emerald-50 rounded-lg border border-emerald-100'>
                <p className='text-xs text-emerald-600 font-semibold uppercase tracking-wide'>
                  Payment Snapshot
                </p>
                <div className='mt-2 space-y-1.5 text-sm text-gray-800'>
                  <p>
                    <span className='text-gray-500'>Advance Required:</span>{' '}
                    <span className='font-medium'>
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: currency || booking.clientCurrency || 'USD'
                      }).format(booking.advanceRequired)}
                    </span>
                  </p>
                  <p>
                    <span className='text-gray-500'>Advance Received:</span>{' '}
                    <span className='font-medium'>
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: currency || booking.clientCurrency || 'USD'
                      }).format(booking.advanceReceived)}
                    </span>
                  </p>
                  <p>
                    <span className='text-gray-500'>Remaining:</span>{' '}
                    <span className='font-medium'>
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: currency || booking.clientCurrency || 'USD'
                      }).format(
                        Math.max(
                          booking.advanceRequired - booking.advanceReceived,
                          0
                        )
                      )}
                    </span>
                  </p>
                  <p>
                    <span className='text-gray-500'>Payment Status:</span>{' '}
                    <span className='font-medium'>{booking.paymentStatus}</span>
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className='grid grid-cols-2 gap-4'>
            <div className='p-4 bg-gray-50 rounded-lg'>
              <p className='text-xs text-gray-500'>Amount</p>
              <p className='text-xl font-bold text-gray-900'>
                {new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: currency || 'USD'
                }).format(invoice.amount)}
              </p>
            </div>
            <div className='p-4 bg-gray-50 rounded-lg'>
              <p className='text-xs text-gray-500'>Due Date</p>
              <p className='text-lg font-semibold text-gray-900'>
                {new Date(invoice.dueDate).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div className='space-y-3'>
            <h4 className='text-sm font-medium text-gray-700'>Details</h4>
            <div className='space-y-2'>
              {booking && (
                <>
                  <div className='flex justify-between py-2 border-b border-gray-100'>
                    <span className='text-sm text-gray-500'>
                      Blocking Deadline
                    </span>
                    <span className='text-sm font-medium text-gray-900'>
                      {booking.blockingDeadlineAt
                        ? new Date(booking.blockingDeadlineAt).toLocaleString()
                        : '-'}
                    </span>
                  </div>
                  <div className='flex justify-between py-2 border-b border-gray-100'>
                    <span className='text-sm text-gray-500'>
                      Supplier Deadline
                    </span>
                    <span className='text-sm font-medium text-gray-900'>
                      {booking.supplierPaymentDeadlineAt
                        ? new Date(
                            booking.supplierPaymentDeadlineAt
                          ).toLocaleString()
                        : '-'}
                    </span>
                  </div>
                  <div className='flex justify-between py-2 border-b border-gray-100'>
                    <span className='text-sm text-gray-500'>
                      Cancellation Deadline
                    </span>
                    <span className='text-sm font-medium text-gray-900'>
                      {booking.cancellationDeadlineAt
                        ? new Date(
                            booking.cancellationDeadlineAt
                          ).toLocaleString()
                        : '-'}
                    </span>
                  </div>
                  <div className='flex justify-between py-2 border-b border-gray-100'>
                    <span className='text-sm text-gray-500'>
                      Balance Due By
                    </span>
                    <span className='text-sm font-medium text-gray-900'>
                      {booking.balanceDueBy
                        ? new Date(booking.balanceDueBy).toLocaleString()
                        : '-'}
                    </span>
                  </div>
                </>
              )}
              <div className='flex justify-between py-2 border-b border-gray-100'>
                <span className='text-sm text-gray-500'>Created At</span>
                <span className='text-sm font-medium text-gray-900'>
                  {new Date(invoice.createdAt).toLocaleString()}
                </span>
              </div>
              {invoice.paidAt && (
                <div className='flex justify-between py-2 border-b border-gray-100'>
                  <span className='text-sm text-gray-500'>Paid At</span>
                  <span className='text-sm font-medium text-gray-900'>
                    {new Date(invoice.paidAt).toLocaleString()}
                  </span>
                </div>
              )}
              {invoice.notes && (
                <div className='py-2'>
                  <span className='text-sm text-gray-500 block mb-1'>
                    Notes
                  </span>
                  <p className='text-sm text-gray-700 bg-gray-50 p-2 rounded'>
                    {invoice.notes}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className='sticky bottom-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 p-4 flex justify-end gap-3 invoice-pdf-hidden'>
          <button
            onClick={onDownload}
            className='px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2'
          >
            <FaDownload /> Download PDF
          </button>
          {invoice.status !== 'PAID' && (
            <button
              onClick={onMarkAsPaid}
              className='px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 flex items-center gap-2'
            >
              <FaCircleCheck /> Mark as Paid
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// Payment Details Modal
const PaymentDetailsModal = ({
  isOpen,
  payments,
  onClose,
  onAddPayment
}: {
  isOpen: boolean
  payments: Payment[]
  onClose: () => void
  onAddPayment: () => void
}) => {
  if (!isOpen) return null

  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'>
      <div className='bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto'>
        <div className='sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 p-4 flex items-center justify-between'>
          <h3 className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
            Payment History
          </h3>
          <button
            onClick={onClose}
            className='text-gray-400 hover:text-gray-600'
          >
            <FaXmark className='text-xl' />
          </button>
        </div>

        <div className='p-6'>
          {payments.length === 0 ? (
            <div className='text-center py-8'>
              <p className='text-gray-500'>No payments recorded yet</p>
            </div>
          ) : (
            <div className='space-y-4'>
              {payments.map(payment => (
                <div
                  key={payment.id}
                  className='flex items-center justify-between p-4 bg-gray-50 rounded-lg'
                >
                  <div>
                    <p className='text-sm font-medium text-gray-900'>
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: 'USD'
                      }).format(payment.amount)}
                    </p>
                    <p className='text-xs text-gray-500'>
                      {new Date(payment.date).toLocaleString()} • {payment.mode}{' '}
                      • Ref: {payment.reference}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      payment.status === 'completed'
                        ? 'bg-green-100 text-green-800'
                        : payment.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {payment.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className='sticky bottom-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 p-4 flex justify-end'>
          <button
            onClick={onAddPayment}
            className='px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 flex items-center gap-2'
          >
            <FaPlus /> Add Payment
          </button>
        </div>
      </div>
    </div>
  )
}

const BookingDetailPage: React.FC = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const locationState =
    (location.state as {
      customerName?: string
      blockingDeadlineAt?: string | null
      supplierPaymentDeadlineAt?: string | null
      cancellationDeadlineAt?: string | null
      balanceDueBy?: string | null
    } | null) ?? null
  const customerNameFromList = locationState?.customerName?.trim() || ''
  const [activeTab, setActiveTab] = useState('overview')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancellationReason, setCancellationReason] = useState('')
  const [cancelError, setCancelError] = useState('')
  const [toast, setToast] = useState<{
    show: boolean
    message: string
    type: 'success' | 'error' | 'info'
  }>({
    show: false,
    message: '',
    type: 'success'
  })
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [showInvoiceModal, setShowInvoiceModal] = useState(false)
  const [showPaymentsModal, setShowPaymentsModal] = useState(false)

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToast({ show: true, message, type })
    setTimeout(
      () => setToast({ show: false, message: '', type: 'success' }),
      3000
    )
  }

  const [booking, setBooking] = useState<Booking | null>(null)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [history, setHistory] = useState<StatusHistory[]>([])
  const [quotationDetails, setQuotationDetails] = useState<
    Record<string, unknown> | null
  >(null)
  const [quotationComponents, setQuotationComponents] = useState<
    Array<Record<string, unknown>>
  >([])
  const invoiceModalContentRef = useRef<HTMLDivElement | null>(null)

  const downloadInvoicePdf = (url?: string, invoiceNumber?: string) => {
    if (!url) return false

    const filenameBase = String(invoiceNumber || 'invoice')
      .trim()
      .replace(/[^a-zA-Z0-9._-]+/g, '-')

    const link = document.createElement('a')
    link.href = url
    link.download = `${filenameBase || 'invoice'}.pdf`
    link.rel = 'noopener noreferrer'
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    return true
  }

  const downloadInvoiceModalAsPdf = async (invoiceNumber?: string) => {
    const exportRoot = invoiceModalContentRef.current
    if (!exportRoot) {
      showToast('Invoice details popup is not ready yet', 'info')
      return
    }

    const exportStyle = document.createElement('style')
    exportStyle.setAttribute('data-invoice-modal-pdf-style', 'true')
    exportStyle.textContent = `
      .invoice-modal-pdf-export {
        color: #111827 !important;
        background: #ffffff !important;
      }
      .invoice-modal-pdf-export * {
        color: inherit;
      }
      .invoice-modal-pdf-export .dark\\:bg-gray-900,
      .invoice-modal-pdf-export .dark\\:bg-gray-800,
      .invoice-modal-pdf-export .dark\\:bg-gray-800\\/50,
      .invoice-modal-pdf-export .dark\\:bg-blue-900\\/20,
      .invoice-modal-pdf-export .dark\\:bg-green-900\\/20 {
        background: #ffffff !important;
      }
      .invoice-modal-pdf-export .dark\\:text-gray-100,
      .invoice-modal-pdf-export .dark\\:text-gray-200,
      .invoice-modal-pdf-export .dark\\:text-gray-300,
      .invoice-modal-pdf-export .dark\\:text-gray-400,
      .invoice-modal-pdf-export .dark\\:text-blue-300,
      .invoice-modal-pdf-export .dark\\:text-blue-400,
      .invoice-modal-pdf-export .dark\\:text-green-300,
      .invoice-modal-pdf-export .dark\\:text-green-400 {
        color: #111827 !important;
      }
      .invoice-modal-pdf-export .dark\\:border-gray-700,
      .invoice-modal-pdf-export .dark\\:border-gray-800,
      .invoice-modal-pdf-export .dark\\:border-blue-800,
      .invoice-modal-pdf-export .dark\\:border-green-800 {
        border-color: #e5e7eb !important;
      }
      .invoice-modal-pdf-export .sticky {
        position: static !important;
      }
      .invoice-modal-pdf-export .invoice-pdf-hidden {
        display: none !important;
      }
    `

    document.head.appendChild(exportStyle)

    try {
      exportRoot.classList.add('invoice-modal-pdf-export')
      await new Promise<void>(resolve => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      })

      const html2canvasModule = (await import(
        /* @vite-ignore */ 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/+esm'
      )) as any
      const html2canvas = html2canvasModule.default || html2canvasModule

      const jsPdfModule = (await import(
        /* @vite-ignore */ 'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/+esm'
      )) as any
      const JsPDF = jsPdfModule.default || jsPdfModule

      const canvas = await html2canvas(exportRoot, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        scrollX: 0,
        scrollY: -window.scrollY
      })

      const imgData = canvas.toDataURL('image/png')
      const pdf = new JsPDF('p', 'mm', 'a4')
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const imgHeight = (canvas.height * pageWidth) / canvas.width

      let heightLeft = imgHeight
      let position = 0

      pdf.addImage(
        imgData,
        'PNG',
        0,
        position,
        pageWidth,
        imgHeight,
        '',
        'FAST'
      )
      heightLeft -= pageHeight

      while (heightLeft > 0) {
        position = heightLeft - imgHeight
        pdf.addPage()
        pdf.addImage(
          imgData,
          'PNG',
          0,
          position,
          pageWidth,
          imgHeight,
          '',
          'FAST'
        )
        heightLeft -= pageHeight
      }

      const ref = String(invoiceNumber || 'invoice-details')
        .trim()
        .replace(/[^a-zA-Z0-9._-]+/g, '-')
      pdf.save(`${ref || 'invoice-details'}-popup.pdf`)
    } catch (error) {
      console.error('Failed to export invoice popup as PDF', error)
      showToast('Failed to download invoice details PDF', 'error')
    } finally {
      exportRoot.classList.remove('invoice-modal-pdf-export')
      exportStyle.remove()
    }
  }

  const openInvoiceAndDownload = (invoice: Invoice) => {
    setSelectedInvoice(invoice)
    setShowInvoiceModal(true)
    setTimeout(() => {
      void downloadInvoiceModalAsPdf(invoice.invoiceNumber)
    }, 80)
  }

  const fetchBookingData = async () => {
    if (!id) return
    setLoading(true)
    setError('')
    try {
      const [bookingRes, invoiceRes, historyRes, paymentRes] =
        await Promise.allSettled([
          bookingsApi.getById(id),
          bookingsApi.listInvoices(id),
          bookingsApi.statusHistory(id),
          paymentsApi.list({ bookingId: id })
        ])

      if (bookingRes.status !== 'fulfilled') {
        throw bookingRes.reason
      }

      const bookingData = unwrapData<any>(bookingRes.value)
      if (!bookingData) {
        throw new Error('Booking not found')
      }
      const mappedBooking = mapBookingFromApi(bookingData)
      const resolvedBooking: Booking = {
        ...mappedBooking,
        customerName:
          mappedBooking.customerName?.trim() ||
          customerNameFromList ||
          'Unknown',
        blockingDeadlineAt:
          pickFirstDate(
            mappedBooking.blockingDeadlineAt,
            locationState?.blockingDeadlineAt
          ) ?? undefined,
        supplierPaymentDeadlineAt:
          pickFirstDate(
            mappedBooking.supplierPaymentDeadlineAt,
            locationState?.supplierPaymentDeadlineAt
          ) ?? undefined,
        cancellationDeadlineAt:
          pickFirstDate(
            mappedBooking.cancellationDeadlineAt,
            locationState?.cancellationDeadlineAt
          ) ?? undefined,
        balanceDueBy:
          pickFirstDate(
            mappedBooking.balanceDueBy,
            locationState?.balanceDueBy
          ) ?? undefined
      }
      const invoiceData =
        invoiceRes.status === 'fulfilled'
          ? unwrapData<any[]>(invoiceRes.value) ?? []
          : []
      const paymentData =
        paymentRes.status === 'fulfilled'
          ? unwrapData<any[]>(paymentRes.value) ?? []
          : []
      const statusData =
        historyRes.status === 'fulfilled'
          ? unwrapData<any[]>(historyRes.value) ?? []
          : []

      const mappedInvoices = (
        Array.isArray(invoiceData) ? invoiceData : []
      ).map(row => mapInvoiceFromApi(row, resolvedBooking))
      const mappedPayments = (
        Array.isArray(paymentData) ? paymentData : []
      ).map(row => mapPaymentFromApi(row))
      const mappedHistory = buildHistory(
        Array.isArray(statusData) ? statusData : [],
        mappedInvoices,
        mappedPayments
      )

	      setBooking(resolvedBooking)
	      setInvoices(mappedInvoices)
	      setPayments(mappedPayments)
	      setHistory(mappedHistory)
	      setQuotationDetails(null)
	      setQuotationComponents([])

	      if (resolvedBooking.quotationId) {
	        try {
	          const quotRes = await quotationsApi.getById(resolvedBooking.quotationId)
	          const quotData = unwrapData<any>(quotRes)
	          const quoteRecord =
	            quotData && typeof quotData === 'object' && !Array.isArray(quotData)
	              ? (quotData as Record<string, unknown>)
	              : null
	          const components =
	            quoteRecord?.components ?? quoteRecord?.items ?? []
	          setQuotationDetails(
	            quoteRecord && Object.keys(quoteRecord).length > 0
	              ? quoteRecord
	              : null
	          )
	          setQuotationComponents(toRecordArray(components))
	        } catch {
	          setQuotationDetails(null)
	          setQuotationComponents([])
	        }
	      }
    } catch (err) {
      console.error('Failed to load booking details:', err)
      const message = getApiErrorMessage(err, 'Failed to load booking details')
      setError(message)
      showToast(message, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!id) {
      setError('Booking ID is missing')
      setLoading(false)
      return
    }
    void fetchBookingData()
  }, [id])

  const handleStatusChange = async (
    newStatus: 'PENDING' | 'CONFIRMED' | 'CANCELLED'
  ) => {
    if (newStatus === 'CANCELLED') {
      setShowCancelModal(true)
      return
    }

    try {
      setLoading(true)
      if (!id) throw new Error('Missing booking id')
      await bookingsApi.changeStatus(id, { status: newStatus })
      await fetchBookingData()
      showToast(`Booking status updated to ${newStatus}`, 'success')
    } catch (err) {
      showToast(
        getApiErrorMessage(err, 'Failed to update booking status'),
        'error'
      )
    } finally {
      setLoading(false)
    }
  }

  const handleCancelConfirm = async () => {
    if (!cancellationReason.trim()) {
      setCancelError('Cancellation reason is required')
      return
    }

    try {
      setLoading(true)
      if (!id) throw new Error('Missing booking id')
      await bookingsApi.cancel(id, cancellationReason)
      await fetchBookingData()
      setShowCancelModal(false)
      setCancellationReason('')
      setCancelError('')
      showToast('Booking cancelled successfully', 'success')
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Failed to cancel booking'), 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateInvoice = async () => {
    try {
      setLoading(true)
      if (!id) throw new Error('Missing booking id')
      const res = await bookingsApi.generateInvoice(id)
      const invoiceData = unwrapData<any>(res)
      let initiatedDownload = false
      if (booking && invoiceData) {
        const mapped = mapInvoiceFromApi(invoiceData, booking)
        setSelectedInvoice(mapped)
        setShowInvoiceModal(true)

        initiatedDownload = downloadInvoicePdf(
          mapped.pdfUrl,
          mapped.invoiceNumber
        )
      }
      await fetchBookingData()
      showToast(
        initiatedDownload
          ? 'Invoice generated and PDF download started'
          : 'Invoice generated successfully',
        'success'
      )
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Failed to generate invoice'), 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleMarkInvoiceAsPaid = async (invoiceId: string) => {
    if (!booking || !id) return
    const invoice = invoices.find(item => item.id === invoiceId)
    if (!invoice) return
    const remainingAdvance = Math.max(
      booking.advanceRequired - booking.advanceReceived,
      0
    )
    if (remainingAdvance <= 0) {
      showToast('Advance already meets the required amount', 'info')
      return
    }

    const payableAmount = Math.min(invoice.amount, remainingAdvance)
    try {
      setLoading(true)
      await paymentsApi.create({
        bookingId: id,
        amount: payableAmount,
        paymentMode: 'CASH',
        status: payableAmount >= remainingAdvance ? 'FULL' : 'PARTIAL',
        isVerified: true,
        paidAt: new Date().toISOString()
      })
      await fetchBookingData()
      setShowInvoiceModal(false)
      showToast(
        payableAmount < invoice.amount
          ? 'Payment capped to remaining advance required'
          : 'Invoice marked as paid',
        'success'
      )
    } catch (err) {
      showToast(
        getApiErrorMessage(err, 'Failed to mark invoice as paid'),
        'error'
      )
    } finally {
      setLoading(false)
    }
  }

  const handleAddPayment = async () => {
    if (!booking || !id) return
    const remainingAdvance = Math.max(
      booking.advanceRequired - booking.advanceReceived,
      0
    )
    if (remainingAdvance <= 0) {
      showToast('Advance already meets the required amount', 'info')
      return
    }

    const paymentAmount = Math.min(500, remainingAdvance)
    try {
      setLoading(true)
      await paymentsApi.create({
        bookingId: id,
        amount: paymentAmount,
        paymentMode: 'CASH',
        status: paymentAmount >= remainingAdvance ? 'FULL' : 'PARTIAL',
        isVerified: true,
        paidAt: new Date().toISOString()
      })
      await fetchBookingData()
      showToast('Payment added successfully', 'success')
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Failed to add payment'), 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateBooking = () => {
    if (!booking) return
    showToast('Updated successfully', 'success')
    setTimeout(() => {
      navigate('/bookings', { state: { updatedBooking: booking } })
    }, 1200)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-900'
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-900'
      case 'CANCELLED':
        return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-900'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'
    }
  }

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-900'
      case 'PARTIAL':
        return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-900'
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-900'
      case 'REFUNDED':
        return 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-900'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'
    }
  }

  const getDeadlineRiskColor = (risk?: DeadlineRiskLevel) => {
    switch (risk) {
      case 'OVERDUE':
        return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-900'
      case 'DEADLINE_DUE':
        return 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-900'
      case 'D2_DUE':
        return 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-900'
      case 'SAFE':
      default:
        return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-900'
    }
  }

  const getDeadlineRiskLabel = (risk?: DeadlineRiskLevel) => {
    if (risk === 'D2_DUE') return 'D-2 Due'
    if (risk === 'DEADLINE_DUE') return 'Deadline Due'
    if (risk === 'OVERDUE') return 'Overdue'
    return 'Safe'
  }

  const getInvoiceStatusColor = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-900'
      case 'SENT':
        return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-900'
      case 'DRAFT':
        return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'
      case 'OVERDUE':
        return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-900'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'
    }
  }

  const getHistoryIcon = (type: string) => {
    switch (type) {
      case 'status_change':
        return <FaClockRotateLeft className='text-blue-600' />
      case 'invoice_generated':
        return <FaFileInvoice className='text-green-600' />
      case 'payment_received':
        return <FaCreditCard className='text-purple-600' />
      case 'cancellation':
        return <FaBan className='text-red-600' />
      default:
        return <FaClock className='text-gray-600' />
    }
  }

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency
    }).format(amount)
  }

  const formatDate = (date?: string) => {
    if (!date) return '-'
    const parsed = new Date(date)
    if (Number.isNaN(parsed.getTime())) return '-'
    return parsed.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatDateTime = (dateTime?: string) => {
    if (!dateTime) return '-'
    const parsed = new Date(dateTime)
    if (Number.isNaN(parsed.getTime())) return '-'
    return parsed.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const toRecord = (value: unknown): Record<string, unknown> => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {}
    }
    return value as Record<string, unknown>
  }

  const toRecordArray = (value: unknown): Array<Record<string, unknown>> => {
    if (!Array.isArray(value)) return []
    return value.filter(
      (item): item is Record<string, unknown> =>
        Boolean(item) && typeof item === 'object' && !Array.isArray(item)
    )
  }

  const toLabel = (key: string) =>
    key
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/_/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/^./, char => char.toUpperCase())

  const formatStructuredValue = (value: unknown): string => {
    if (value === null || value === undefined || value === '') return '-'
    if (typeof value === 'boolean') return value ? 'Yes' : 'No'
    if (typeof value === 'number') return String(value)
    if (typeof value === 'string') return value
    if (Array.isArray(value)) {
      return value
        .map(item => formatStructuredValue(item))
        .filter(item => item !== '-')
        .join(', ')
    }
    try {
      return JSON.stringify(value)
    } catch {
      return String(value)
    }
  }

  const toTrimmedText = (value: unknown): string => {
    if (typeof value === 'string') return value.trim()
    if (typeof value === 'number') return String(value)
    return ''
  }

  const hasVisibleEntries = (value: Record<string, unknown>) =>
    Object.values(value).some(
      entry => entry !== null && entry !== undefined && entry !== ''
    )

  const renderKeyValueBlock = (value: unknown) => {
    const record = toRecord(value)
    const entries = Object.entries(record).filter(
      ([, fieldValue]) =>
        fieldValue !== null && fieldValue !== undefined && fieldValue !== ''
    )

    if (!entries.length) {
      return <p className='text-xs text-gray-500 dark:text-gray-400'>Not set</p>
    }

    return (
      <dl className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
        {entries.map(([key, fieldValue]) => (
          <div
            key={key}
            className='rounded-md bg-gray-50 px-3 py-2 dark:bg-gray-800/50'
          >
            <dt className='text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400'>
              {toLabel(key)}
            </dt>
            <dd className='mt-1 text-sm text-gray-900 dark:text-gray-100 break-words'>
              {formatStructuredValue(fieldValue)}
            </dd>
          </div>
        ))}
      </dl>
    )
  }

  const renderSegmentsTable = (value: unknown, emptyLabel: string) => {
    const rows = toRecordArray(value)
    if (!rows.length) {
      return (
        <p className='text-xs text-gray-500 dark:text-gray-400'>{emptyLabel}</p>
      )
    }

    const columns = Array.from(
      rows.reduce((set, row) => {
        Object.keys(row).forEach(key => set.add(key))
        return set
      }, new Set<string>())
    )

    if (!columns.length) {
      return (
        <p className='text-xs text-gray-500 dark:text-gray-400'>{emptyLabel}</p>
      )
    }

    return (
      <div className='overflow-x-auto'>
        <table className='min-w-full divide-y divide-gray-200 dark:divide-gray-700'>
          <thead className='bg-gray-50 dark:bg-gray-800/60'>
            <tr>
              {columns.map(column => (
                <th
                  key={column}
                  className='px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300'
                >
                  {toLabel(column)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className='divide-y divide-gray-100 dark:divide-gray-800'>
            {rows.map((row, rowIndex) => (
              <tr key={`row-${rowIndex}`}>
                {columns.map(column => (
                  <td
                    key={`${rowIndex}-${column}`}
                    className='px-3 py-2 text-sm text-gray-700 dark:text-gray-200 align-top'
                  >
                    {formatStructuredValue(row[column])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  const renderTextBlock = (
    value: unknown,
    emptyLabel = 'Not set',
    tone: 'default' | 'success' | 'danger' = 'default'
  ) => {
    const text = toTrimmedText(value)
    if (!text) {
      return <p className='text-xs text-gray-500 dark:text-gray-400'>{emptyLabel}</p>
    }

    const toneClass =
      tone === 'success'
        ? 'border-green-200 bg-green-50 text-green-800'
        : tone === 'danger'
        ? 'border-red-200 bg-red-50 text-red-800'
        : 'border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-200'

    return (
      <div className={`rounded-lg border p-3 ${toneClass}`}>
        <p className='text-sm whitespace-pre-wrap break-words'>{text}</p>
      </div>
    )
  }

  const renderTagList = (value: unknown, emptyLabel: string) => {
    const items = Array.isArray(value)
      ? value.map(item => toTrimmedText(item)).filter(Boolean)
      : []

    if (!items.length) {
      return <p className='text-xs text-gray-500 dark:text-gray-400'>{emptyLabel}</p>
    }

    return (
      <div className='flex flex-wrap gap-2'>
        {items.map(item => (
          <span
            key={item}
            className='inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 dark:border-blue-700 dark:bg-blue-900/30 dark:text-blue-200'
          >
            {item}
          </span>
        ))}
      </div>
    )
  }

  const renderItineraryItems = (value: unknown) => {
    const rows = toRecordArray(value)
    if (!rows.length) {
      return (
        <p className='text-xs text-gray-500 dark:text-gray-400'>
          No itinerary saved in quotation
        </p>
      )
    }

    return (
      <div className='space-y-3'>
        {rows.map((row, index) => {
          const day = toTrimmedText(row.day ?? row.dayLabel) || `Day ${index + 1}`
          const title = toTrimmedText(row.title ?? row.heading) || 'Activity'
          const description = toTrimmedText(
            row.description ?? row.details ?? row.notes
          )

          return (
            <div
              key={`itinerary-${index}`}
              className='rounded-lg border border-gray-200 p-3 dark:border-gray-700'
            >
              <p className='text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400'>
                {day}
              </p>
              <p className='mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100'>
                {title}
              </p>
              {description ? (
                <p className='mt-1 text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap'>
                  {description}
                </p>
              ) : null}
            </div>
          )
        })}
      </div>
    )
  }

  const quotationSnapshot = toRecord(
    quotationDetails?.templateSnapshot ?? quotationDetails?.template_snapshot
  )
  const quotationBuilderSnapshot = toRecord(quotationSnapshot.builderSnapshot)
  const quotationSupplierDetails = toRecord(
    quotationSnapshot.supplierDetails ?? quotationSnapshot.supplier
  )
  const quotationPackageDetails = toRecord(quotationSnapshot.package)
  const quotationPricing = toRecord(
    quotationSnapshot.pricing ?? quotationBuilderSnapshot.pricing
  )
  const quotationSnapshotCurrency =
    toTrimmedText(quotationSnapshot.currency) ||
    toTrimmedText(quotationDetails?.supplierCurrency)
  const quotationCurrency = quotationSnapshotCurrency || booking?.clientCurrency || 'INR'
  const quotationItinerary = toRecordArray(
    quotationSnapshot.itineraryItems ?? quotationBuilderSnapshot.itineraryItems
  )
  const quotationServiceRows = toRecordArray(
    quotationSnapshot.serviceRows ?? quotationBuilderSnapshot.serviceRows
  )
  const quotationAddOnServices = toRecordArray(
    quotationSnapshot.addOnServices ?? quotationBuilderSnapshot.addOnServices
  )
  const quotationOverview = {
    customerName: toTrimmedText(quotationSnapshot.customerName) || undefined,
    customerEmail: toTrimmedText(quotationSnapshot.customerEmail) || undefined,
    destination: toTrimmedText(quotationSnapshot.destination) || undefined,
    travelStartDate: quotationSnapshot.travelStartDate
      ? formatDate(String(quotationSnapshot.travelStartDate))
      : undefined,
    travelEndDate: quotationSnapshot.travelEndDate
      ? formatDate(String(quotationSnapshot.travelEndDate))
      : undefined,
    nights:
      quotationSnapshot.nights !== null &&
      quotationSnapshot.nights !== undefined &&
      quotationSnapshot.nights !== ''
        ? String(quotationSnapshot.nights)
        : undefined,
    adults:
      quotationSnapshot.adults !== null &&
      quotationSnapshot.adults !== undefined &&
      quotationSnapshot.adults !== ''
        ? String(quotationSnapshot.adults)
        : undefined,
    validUntil: quotationSnapshot.validUntil
      ? formatDate(String(quotationSnapshot.validUntil))
      : undefined,
    packageType: toTrimmedText(quotationSnapshot.packageType) || undefined,
    currency: quotationSnapshotCurrency || undefined
  }
  const quotationPricingSummary = {
    supplierCost:
      quotationPricing.supplierCost !== undefined
        ? formatCurrency(toNumber(quotationPricing.supplierCost, 0), quotationCurrency)
        : undefined,
    markupAmount:
      quotationPricing.markupAmount !== undefined
        ? formatCurrency(toNumber(quotationPricing.markupAmount, 0), quotationCurrency)
        : undefined,
    addOnMarkup:
      quotationPricing.addOnMarkup !== undefined
        ? formatCurrency(toNumber(quotationPricing.addOnMarkup, 0), quotationCurrency)
        : undefined,
    serviceFee:
      quotationPricing.serviceFee !== undefined
        ? formatCurrency(toNumber(quotationPricing.serviceFee, 0), quotationCurrency)
        : undefined,
    taxAmount:
      quotationPricing.taxAmount !== undefined
        ? formatCurrency(toNumber(quotationPricing.taxAmount, 0), quotationCurrency)
        : undefined,
    discount:
      quotationPricing.discount !== undefined
        ? formatCurrency(toNumber(quotationPricing.discount, 0), quotationCurrency)
        : undefined,
    finalAmount:
      quotationPricing.finalAmount !== undefined
        ? formatCurrency(toNumber(quotationPricing.finalAmount, 0), quotationCurrency)
        : undefined
  }
  const quotationEnabledServices =
    Array.isArray(quotationSnapshot.enabledServices) &&
    quotationSnapshot.enabledServices.length > 0
      ? quotationSnapshot.enabledServices
      : quotationBuilderSnapshot.enabledServices
  const quotationImportantNotes =
    toTrimmedText(
      quotationDetails?.importantNotes ?? quotationDetails?.important_notes
    ) || ''
  const quotationNoteSections = quotationImportantNotes
    ? quotationImportantNotes
        .split(/\n{2,}/)
        .map(block => block.trim())
        .filter(Boolean)
        .map((block, index) => {
          const lines = block.split('\n')
          const first = lines[0]?.trim() || ''
          if (first.endsWith(':')) {
            return {
              id: `quotation-note-${index}`,
              title: first.slice(0, -1),
              content: lines.slice(1).join('\n').trim() || '-'
            }
          }
          return {
            id: `quotation-note-${index}`,
            title: `Note ${index + 1}`,
            content: block
          }
        })
    : []
  const normalizeSectionTitle = (value: string) =>
    value.trim().toLowerCase().replace(/\s+/g, ' ')
  const coveredQuotationNoteTitles = new Set(
    [
      hasVisibleEntries(quotationOverview) ? 'Trip Summary' : '',
      toTrimmedText(quotationSnapshot.headerBranding) ? 'Header Branding' : '',
      toTrimmedText(quotationSnapshot.inclusions) ? 'Inclusions' : '',
      toTrimmedText(quotationSnapshot.exclusions) ? 'Exclusions' : '',
      toTrimmedText(quotationSnapshot.hotelDetails) ? 'Hotel Details' : '',
      toTrimmedText(quotationSnapshot.visaDetails) ? 'Visa Details' : '',
      toTrimmedText(quotationSnapshot.paymentTerms) ? 'Payment Terms' : '',
      toTrimmedText(quotationSnapshot.cancellationPolicy)
        ? 'Cancellation Policy'
        : '',
      toTrimmedText(quotationSnapshot.footerDisclaimer)
        ? 'Footer Disclaimer'
        : '',
      Array.isArray(quotationEnabledServices) && quotationEnabledServices.length > 0
        ? 'Enabled Services'
        : '',
      quotationItinerary.length > 0 ? 'Itinerary' : ''
    ]
      .filter(Boolean)
      .map(title => normalizeSectionTitle(title))
  )
  const visibleQuotationNoteSections = quotationNoteSections.filter(
    section => !coveredQuotationNoteTitles.has(normalizeSectionTitle(section.title))
  )
  const hasSavedQuotationDetails =
    Boolean(quotationDetails) &&
    (hasVisibleEntries(quotationOverview) ||
      Object.keys(quotationSupplierDetails).length > 0 ||
      Object.keys(quotationPackageDetails).length > 0 ||
      hasVisibleEntries(quotationPricingSummary) ||
      quotationItinerary.length > 0 ||
      quotationServiceRows.length > 0 ||
      quotationAddOnServices.length > 0 ||
      (Array.isArray(quotationEnabledServices) &&
        quotationEnabledServices.length > 0) ||
      Boolean(
        toTrimmedText(quotationSnapshot.hotelDetails) ||
          toTrimmedText(quotationSnapshot.visaDetails) ||
          toTrimmedText(quotationSnapshot.headerBranding) ||
          toTrimmedText(quotationSnapshot.paymentTerms) ||
          toTrimmedText(quotationSnapshot.cancellationPolicy) ||
          toTrimmedText(quotationSnapshot.footerDisclaimer) ||
          toTrimmedText(quotationSnapshot.inclusions) ||
          toTrimmedText(quotationSnapshot.exclusions) ||
          visibleQuotationNoteSections.length > 0
      ))

  if (loading && !booking) {
    return (
      <main className='flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-950'>
        <div className='max-w-9xl mx-auto px-0 sm:px-0 lg:px-0 py-4 sm:py-6 lg:py-8'>
          <div className='animate-pulse space-y-6'>
            <div className='h-8 bg-gray-200 dark:bg-gray-800 rounded w-1/4'></div>
            <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
              <div className='lg:col-span-2 space-y-4'>
                <div className='h-64 bg-gray-200 dark:bg-gray-800 rounded-xl'></div>
                <div className='h-48 bg-gray-200 dark:bg-gray-800 rounded-xl'></div>
              </div>
              <div className='space-y-4'>
                <div className='h-40 bg-gray-200 dark:bg-gray-800 rounded-xl'></div>
                <div className='h-32 bg-gray-200 dark:bg-gray-800 rounded-xl'></div>
              </div>
            </div>
          </div>
        </div>
      </main>
    )
  }

  if (!booking) {
    return (
      <main className='flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-950'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
          <div className='bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6'>
            <h2 className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
              Unable to load booking
            </h2>
            <p className='text-sm text-gray-600 dark:text-gray-400 mt-2'>
              {error || 'Please try again later.'}
            </p>
            <div className='mt-4 flex gap-2'>
              <button
                onClick={() => void fetchBookingData()}
                className='px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700'
              >
                Retry
              </button>
              <button
                onClick={() => navigate('/bookings')}
                className='px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50'
              >
                Back to Bookings
              </button>
            </div>
          </div>
        </div>
      </main>
    )
  }

  const paymentProgress =
    booking.advanceRequired > 0
      ? Math.min((booking.advanceReceived / booking.advanceRequired) * 100, 100)
      : 0
  const remainingAdvance = Math.max(
    booking.advanceRequired - booking.advanceReceived,
    0
  )

  return (
    <main className='flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-950'>
      {/* Toast */}
      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() =>
            setToast({ show: false, message: '', type: 'success' })
          }
        />
      )}

      {/* Modals */}
      <InvoiceDetailsModal
        isOpen={showInvoiceModal}
        invoice={selectedInvoice}
        booking={booking}
        contentRef={invoiceModalContentRef}
        onClose={() => {
          setShowInvoiceModal(false)
          setSelectedInvoice(null)
        }}
        onDownload={() => {
          void downloadInvoiceModalAsPdf(selectedInvoice?.invoiceNumber)
        }}
        onMarkAsPaid={() => {
          if (selectedInvoice) {
            handleMarkInvoiceAsPaid(selectedInvoice.id)
          }
        }}
        currency={booking.clientCurrency}
      />

      <PaymentDetailsModal
        isOpen={showPaymentsModal}
        payments={payments}
        onClose={() => setShowPaymentsModal(false)}
        onAddPayment={handleAddPayment}
      />

      <div className='max-w-7xl mx-auto px-0 sm:px-0 lg:px-0 py-4 sm:py-6 lg:py-8'>
        {/* Header */}
        <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6'>
          <div className='flex items-start gap-3'>
            <button
              onClick={() => navigate('/bookings')}
              className='inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800'
              aria-label='Back to bookings'
              title='Back to Bookings'
            >
              <FaArrowLeft className='text-sm' />
            </button>
            <div>
              <div className='flex items-center gap-3 flex-wrap'>
                <h1 className='text-2xl font-bold text-gray-900 dark:text-gray-100'>
                  {(booking.customerName?.trim() || 'Unknown') +
                    ` (#${booking.bookingNumber})`}
                </h1>
                <span
                  className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full border ${getStatusColor(
                    booking.status
                  )}`}
                >
                  {booking.status}
                </span>
                <span
                  className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full border ${getDeadlineRiskColor(
                    booking.deadlineRiskLevel
                  )}`}
                >
                  {getDeadlineRiskLabel(booking.deadlineRiskLevel)}
                </span>
              </div>
              <div className='flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mt-1.5'>
                <span className='flex items-center gap-1.5'>
                  <FaFileInvoice className='w-4' />
                  Quote:{' '}
                  {booking.quotationNumber ||
                    `#${String(booking.quotationId || '').slice(0, 8)}`}
                </span>
                <span className='flex items-center gap-1.5'>
                  <FaClock className='w-4' />
                  {formatDate(booking.travelStart)} -{' '}
                  {formatDate(booking.travelEnd)}
                </span>
              </div>
            </div>
          </div>

          <div className='flex flex-wrap items-center gap-2'>
            <button
              onClick={handleGenerateInvoice}
              className='px-4 py-2 rounded-lg text-sm font-medium bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2'
            >
              <FaFileInvoice /> Generate Invoice
            </button>
            <button
              onClick={handleUpdateBooking}
              className='px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors flex items-center gap-2'
            >
              <FaCreditCard /> Update Booking
            </button>
          </div>
        </div>

        {/* Main Grid */}
        <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
          {/* Left Column */}
          <div className='lg:col-span-2 space-y-6'>
            {/* Tabs */}
            <div className='bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden'>
              <div className='border-b border-gray-200 dark:border-gray-800'>
                <div className='flex overflow-x-auto'>
                  {[
                    { id: 'overview', label: 'Overview', icon: FaFileInvoice },
                    {
                      id: 'invoices',
                      label: 'Invoices',
                      icon: FaFileInvoice,
                      badge: invoices.length
                    },
                    {
                      id: 'history',
                      label: 'History',
                      icon: FaClockRotateLeft
                    },
                    { id: 'payments', label: 'Payments', icon: FaCreditCard }
                  ].map(tab => {
                    const Icon = tab.icon
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex-1 py-4 px-4 text-center border-b-2 font-medium text-sm flex items-center justify-center gap-2 whitespace-nowrap transition-colors ${
                          activeTab === tab.id
                            ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                            : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
                        }`}
                      >
                        <Icon className='text-sm' />
                        <span>{tab.label}</span>
                        {tab.badge && (
                          <span className='bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 py-0.5 px-2 rounded-full text-xs'>
                            {tab.badge}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className='p-6'>
                {/* Overview Tab */}
                {activeTab === 'overview' && (
                  <div className='space-y-6'>
                    <div>
                      <h3 className='text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2'>
                        <FaFileInvoice className='text-blue-500' />
                        Booking Information
                      </h3>
                      <div className='grid grid-cols-2 md:grid-cols-3 gap-4'>
                        <div className='bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg'>
                          <p className='text-xs text-gray-500 dark:text-gray-400 mb-1'>
                            Total Amount
                          </p>
                          <p className='text-lg font-bold text-gray-900 dark:text-gray-100'>
                            {formatCurrency(
                              booking.totalAmount,
                              booking.clientCurrency
                            )}
                          </p>
                        </div>
                        <div className='bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg'>
                          <p className='text-xs text-gray-500 dark:text-gray-400 mb-1'>
                            Cost Amount
                          </p>
                          <p className='text-lg font-bold text-gray-900 dark:text-gray-100'>
                            {formatCurrency(
                              booking.costAmount,
                              booking.supplierCurrency
                            )}
                          </p>
                        </div>
                        <div className='bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg'>
                          <p className='text-xs text-gray-500 dark:text-gray-400 mb-1'>
                            Profit
                          </p>
                          <p className='text-lg font-bold text-green-600 dark:text-green-400'>
                            {formatCurrency(
                              booking.profit,
                              booking.clientCurrency
                            )}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className='text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2'>
                        <FaClock className='text-blue-500' />
                        Deadline Tracking
                      </h3>
                      <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
                        <div className='bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg'>
                          <p className='text-xs text-gray-500 dark:text-gray-400 mb-1'>
                            Blocking Deadline
                          </p>
                          <p className='text-sm font-semibold text-gray-900 dark:text-gray-100'>
                            {formatDateTime(booking.blockingDeadlineAt)}
                          </p>
                        </div>
                        <div className='bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg'>
                          <p className='text-xs text-gray-500 dark:text-gray-400 mb-1'>
                            Supplier Deadline
                          </p>
                          <p className='text-sm font-semibold text-gray-900 dark:text-gray-100'>
                            {formatDateTime(booking.supplierPaymentDeadlineAt)}
                          </p>
                        </div>
                        <div className='bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg'>
                          <p className='text-xs text-gray-500 dark:text-gray-400 mb-1'>
                            Cancellation Deadline
                          </p>
                          <p className='text-sm font-semibold text-gray-900 dark:text-gray-100'>
                            {formatDateTime(booking.cancellationDeadlineAt)}
                          </p>
                        </div>
                        <div className='bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg'>
                          <p className='text-xs text-gray-500 dark:text-gray-400 mb-1'>
                            Balance Due By
                          </p>
                          <p className='text-sm font-semibold text-gray-900 dark:text-gray-100'>
                            {formatDateTime(booking.balanceDueBy)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className='text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2'>
                        <FaFileInvoice className='text-blue-500' />
                        Structured Service Blocks
                      </h3>
                      <div className='space-y-3'>
                        <div className='rounded-lg border border-gray-200 p-3 dark:border-gray-700'>
                          <p className='text-xs text-gray-500 dark:text-gray-400 mb-1'>
                            Supplier Details
                          </p>
                          {(() => {
                            const sd = booking.supplierDetails as Record<string, unknown> | undefined
                            const supplierId = sd?.supplierId ?? sd?.supplier_id
                            const supplierName = sd?.supplierName ?? sd?.supplier_name
                            if (!supplierId && !supplierName) {
                              return <p className='text-xs text-gray-500 dark:text-gray-400'>Not set</p>
                            }
                            return (
                              <dl className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
                                {supplierId ? (
                                  <div className='rounded-md bg-gray-50 px-3 py-2 dark:bg-gray-800/50'>
                                    <dt className='text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400'>Supplier ID</dt>
                                    <dd className='mt-1 text-sm text-gray-900 dark:text-gray-100 break-all'>{String(supplierId)}</dd>
                                  </div>
                                ) : null}
                                {supplierName ? (
                                  <div className='rounded-md bg-gray-50 px-3 py-2 dark:bg-gray-800/50'>
                                    <dt className='text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400'>Supplier Name</dt>
                                    <dd className='mt-1 text-sm text-gray-900 dark:text-gray-100'>{String(supplierName)}</dd>
                                  </div>
                                ) : null}
                              </dl>
	                            )
	                          })()}
	                        </div>
	                        {quotationComponents.length > 0 ? (
	                          <div className='rounded-lg border border-blue-200 bg-blue-50/30 p-3 dark:border-blue-800 dark:bg-blue-900/10'>
	                            <p className='text-xs font-semibold text-blue-700 dark:text-blue-300 mb-2'>
                              Quotation Service Components
                            </p>
                            <div className='overflow-x-auto'>
                              <table className='w-full text-xs'>
                                <thead>
                                  <tr className='border-b border-blue-200 dark:border-blue-800 text-left text-gray-500'>
                                    <th className='py-1.5 pr-3'>Service</th>
                                    <th className='py-1.5 pr-3'>Description</th>
                                    <th className='py-1.5 text-right'>Cost</th>
                                    <th className='py-1.5 text-right'>Sell Value</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {quotationComponents.map((comp: any, idx: number) => (
                                    <tr key={comp.id ?? idx} className='border-b border-blue-100 dark:border-blue-900'>
                                      <td className='py-1.5 pr-3 font-medium text-gray-800 dark:text-gray-200'>
                                        {comp.itemType ?? comp.item_type ?? '—'}
                                      </td>
                                      <td className='py-1.5 pr-3 text-gray-600 dark:text-gray-400'>
                                        {comp.description ?? '—'}
                                      </td>
                                      <td className='py-1.5 text-right text-gray-800 dark:text-gray-200'>
                                        {comp.cost != null ? Number(comp.cost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
                                      </td>
                                      <td className='py-1.5 text-right font-semibold text-gray-900 dark:text-gray-100'>
                                        {comp.sellValue != null ? Number(comp.sellValue ?? comp.sell_value ?? comp.cost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
	                        ) : null}
	                      </div>
	                    </div>

	                    {hasSavedQuotationDetails ? (
	                      <div>
	                        <h3 className='text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2'>
	                          <FaFileInvoice className='text-blue-500' />
	                          Saved Quotation Details
	                        </h3>
	                        <div className='space-y-3'>
	                          {hasVisibleEntries(quotationOverview) ? (
	                            <div className='rounded-lg border border-gray-200 p-3 dark:border-gray-700'>
	                              <p className='text-xs text-gray-500 dark:text-gray-400 mb-2'>
	                                Quotation Overview
	                              </p>
	                              {renderKeyValueBlock(quotationOverview)}
	                            </div>
	                          ) : null}
	                          {Object.keys(quotationSupplierDetails).length > 0 ? (
	                            <div className='rounded-lg border border-gray-200 p-3 dark:border-gray-700'>
	                              <p className='text-xs text-gray-500 dark:text-gray-400 mb-2'>
	                                Quotation Supplier
	                              </p>
	                              {renderKeyValueBlock(quotationSupplierDetails)}
	                            </div>
	                          ) : null}
	                          {Object.keys(quotationPackageDetails).length > 0 ? (
	                            <div className='rounded-lg border border-gray-200 p-3 dark:border-gray-700'>
	                              <p className='text-xs text-gray-500 dark:text-gray-400 mb-2'>
	                                Package Details
	                              </p>
	                              {renderKeyValueBlock(quotationPackageDetails)}
	                            </div>
	                          ) : null}
	                          {hasVisibleEntries(quotationPricingSummary) ? (
	                            <div className='rounded-lg border border-gray-200 p-3 dark:border-gray-700'>
	                              <p className='text-xs text-gray-500 dark:text-gray-400 mb-2'>
	                                Saved Pricing Snapshot
	                              </p>
	                              {renderKeyValueBlock(quotationPricingSummary)}
	                            </div>
	                          ) : null}
	                          <div className='grid grid-cols-1 gap-3 lg:grid-cols-2'>
	                            {toTrimmedText(quotationSnapshot.hotelDetails) ? (
	                              <div className='rounded-lg border border-gray-200 p-3 dark:border-gray-700'>
	                                <p className='text-xs text-gray-500 dark:text-gray-400 mb-2'>
	                                  Hotel Details
	                                </p>
	                                {renderTextBlock(quotationSnapshot.hotelDetails)}
	                              </div>
	                            ) : null}
	                            {toTrimmedText(quotationSnapshot.visaDetails) ? (
	                              <div className='rounded-lg border border-gray-200 p-3 dark:border-gray-700'>
	                                <p className='text-xs text-gray-500 dark:text-gray-400 mb-2'>
	                                  Visa Details
	                                </p>
	                                {renderTextBlock(quotationSnapshot.visaDetails)}
	                              </div>
	                            ) : null}
	                            {toTrimmedText(quotationSnapshot.headerBranding) ? (
	                              <div className='rounded-lg border border-gray-200 p-3 dark:border-gray-700'>
	                                <p className='text-xs text-gray-500 dark:text-gray-400 mb-2'>
	                                  Header Branding
	                                </p>
	                                {renderTextBlock(quotationSnapshot.headerBranding)}
	                              </div>
	                            ) : null}
	                            {toTrimmedText(quotationSnapshot.paymentTerms) ? (
	                              <div className='rounded-lg border border-gray-200 p-3 dark:border-gray-700'>
	                                <p className='text-xs text-gray-500 dark:text-gray-400 mb-2'>
	                                  Payment Terms
	                                </p>
	                                {renderTextBlock(quotationSnapshot.paymentTerms)}
	                              </div>
	                            ) : null}
	                            {toTrimmedText(quotationSnapshot.cancellationPolicy) ? (
	                              <div className='rounded-lg border border-gray-200 p-3 dark:border-gray-700'>
	                                <p className='text-xs text-gray-500 dark:text-gray-400 mb-2'>
	                                  Cancellation Policy
	                                </p>
	                                {renderTextBlock(quotationSnapshot.cancellationPolicy)}
	                              </div>
	                            ) : null}
	                            {toTrimmedText(quotationSnapshot.footerDisclaimer) ? (
	                              <div className='rounded-lg border border-gray-200 p-3 dark:border-gray-700'>
	                                <p className='text-xs text-gray-500 dark:text-gray-400 mb-2'>
	                                  Footer Disclaimer
	                                </p>
	                                {renderTextBlock(quotationSnapshot.footerDisclaimer)}
	                              </div>
	                            ) : null}
	                            {toTrimmedText(quotationSnapshot.inclusions) ? (
	                              <div className='rounded-lg border border-green-200 p-3 dark:border-green-800'>
	                                <p className='text-xs text-green-700 dark:text-green-300 mb-2'>
	                                  Inclusions
	                                </p>
	                                {renderTextBlock(
	                                  quotationSnapshot.inclusions,
	                                  'Not set',
	                                  'success'
	                                )}
	                              </div>
	                            ) : null}
	                            {toTrimmedText(quotationSnapshot.exclusions) ? (
	                              <div className='rounded-lg border border-red-200 p-3 dark:border-red-800'>
	                                <p className='text-xs text-red-700 dark:text-red-300 mb-2'>
	                                  Exclusions
	                                </p>
	                                {renderTextBlock(
	                                  quotationSnapshot.exclusions,
	                                  'Not set',
	                                  'danger'
	                                )}
	                              </div>
	                            ) : null}
	                          </div>
	                          {Array.isArray(quotationEnabledServices) &&
	                          quotationEnabledServices.length > 0 ? (
	                            <div className='rounded-lg border border-gray-200 p-3 dark:border-gray-700'>
	                              <p className='text-xs text-gray-500 dark:text-gray-400 mb-2'>
	                                Enabled Services
	                              </p>
	                              {renderTagList(
	                                quotationEnabledServices,
	                                'No enabled services saved'
	                              )}
	                            </div>
	                          ) : null}
	                          {quotationServiceRows.length > 0 ? (
	                            <div className='rounded-lg border border-gray-200 p-3 dark:border-gray-700'>
	                              <p className='text-xs text-gray-500 dark:text-gray-400 mb-2'>
	                                Service Rows
	                              </p>
	                              {renderSegmentsTable(
	                                quotationServiceRows,
	                                'No service rows saved'
	                              )}
	                            </div>
	                          ) : null}
	                          {quotationAddOnServices.length > 0 ? (
	                            <div className='rounded-lg border border-gray-200 p-3 dark:border-gray-700'>
	                              <p className='text-xs text-gray-500 dark:text-gray-400 mb-2'>
	                                Add-on Services
	                              </p>
	                              {renderSegmentsTable(
	                                quotationAddOnServices,
	                                'No add-on services saved'
	                              )}
	                            </div>
	                          ) : null}
	                          {quotationItinerary.length > 0 ? (
	                            <div className='rounded-lg border border-gray-200 p-3 dark:border-gray-700'>
	                              <p className='text-xs text-gray-500 dark:text-gray-400 mb-2'>
	                                Itinerary
	                              </p>
	                              {renderItineraryItems(quotationItinerary)}
	                            </div>
	                          ) : null}
	                          {visibleQuotationNoteSections.length > 0 ? (
	                            <div className='space-y-3'>
	                              {visibleQuotationNoteSections.map(section => (
	                                <div
	                                  key={section.id}
	                                  className='rounded-lg border border-gray-200 p-3 dark:border-gray-700'
	                                >
	                                  <p className='text-xs text-gray-500 dark:text-gray-400 mb-2'>
	                                    {section.title}
	                                  </p>
	                                  {renderTextBlock(section.content)}
	                                </div>
	                              ))}
	                            </div>
	                          ) : null}
	                        </div>
	                      </div>
	                    ) : null}

	                    {/* Recent Invoices */}
	                    <div>
                      <div className='flex justify-between items-center mb-4'>
                        <h3 className='text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2'>
                          <FaFileInvoice className='text-blue-500' />
                          Recent Invoices
                        </h3>
                        <button
                          onClick={handleGenerateInvoice}
                          className='text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium flex items-center gap-1'
                        >
                          <FaPlus /> Generate New
                        </button>
                      </div>
                      <div className='space-y-2'>
                        {invoices.slice(0, 2).map(invoice => (
                          <div
                            key={invoice.id}
                            onClick={() => {
                              setSelectedInvoice(invoice)
                              setShowInvoiceModal(true)
                            }}
                            className='flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer'
                          >
                            <div className='flex items-center gap-3'>
                              <div className='w-8 h-8 rounded bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-500'>
                                <FaFileInvoice />
                              </div>
                              <div>
                                <p className='text-sm font-medium text-gray-900 dark:text-gray-100'>
                                  {invoice.invoiceNumber}
                                </p>
                                <p className='text-xs text-gray-500 dark:text-gray-400'>
                                  {formatCurrency(
                                    invoice.amount,
                                    booking.clientCurrency
                                  )}{' '}
                                  • Due {formatDate(invoice.dueDate)}
                                </p>
                              </div>
                            </div>
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium border ${getInvoiceStatusColor(
                                invoice.status
                              )}`}
                            >
                              {invoice.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Recent History */}
                    <div>
                      <h3 className='text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2'>
                        <FaClockRotateLeft className='text-blue-500' />
                        Recent History
                      </h3>
                      <div className='space-y-4'>
                        {history.slice(0, 3).map(item => (
                          <div key={item.id} className='flex gap-3'>
                            <div className='w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0'>
                              {getHistoryIcon(item.type)}
                            </div>
                            <div>
                              <p className='text-sm font-medium text-gray-900 dark:text-gray-100'>
                                {item.status}
                                {item.reason && (
                                  <span className='text-gray-500 dark:text-gray-400'>
                                    {' '}
                                    - {item.reason}
                                  </span>
                                )}
                              </p>
                              <p className='text-xs text-gray-500 dark:text-gray-400'>
                                {item.changedBy} •{' '}
                                {formatDateTime(item.changedAt)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Invoices Tab */}
                {activeTab === 'invoices' && (
                  <div className='space-y-4'>
                    <div className='flex justify-between items-center'>
                      <h3 className='text-sm font-semibold text-gray-900 dark:text-gray-100'>
                        All Invoices
                      </h3>
                      <button
                        onClick={handleGenerateInvoice}
                        className='text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium flex items-center gap-1'
                      >
                        <FaPlus /> Generate New
                      </button>
                    </div>
                    <div className='space-y-2'>
                      {invoices.map(invoice => (
                        <div
                          key={invoice.id}
                          onClick={() => {
                            setSelectedInvoice(invoice)
                            setShowInvoiceModal(true)
                          }}
                          className='flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer'
                        >
                          <div className='flex items-center gap-3 flex-1'>
                            <div className='w-10 h-10 rounded bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-500'>
                              <FaFileInvoice className='text-lg' />
                            </div>
                            <div className='flex-1'>
                              <div className='flex items-center gap-2'>
                                <p className='text-sm font-medium text-gray-900 dark:text-gray-100'>
                                  {invoice.invoiceNumber}
                                </p>
                                <span
                                  className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getInvoiceStatusColor(
                                    invoice.status
                                  )}`}
                                >
                                  {invoice.status}
                                </span>
                              </div>
                              <p className='text-xs text-gray-500 dark:text-gray-400'>
                                {formatCurrency(
                                  invoice.amount,
                                  booking.clientCurrency
                                )}{' '}
                                • Created {formatDate(invoice.createdAt)} • Due{' '}
                                {formatDate(invoice.dueDate)}
                              </p>
                            </div>
                          </div>
                          <div className='flex items-center gap-2'>
                            <button
                              onClick={event => {
                                event.stopPropagation()
                                openInvoiceAndDownload(invoice)
                              }}
                              className='p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-800'
                            >
                              <FaDownload />
                            </button>
                            <button
                              onClick={event => {
                                event.stopPropagation()
                                if (invoice.pdfUrl) {
                                  window.open(
                                    invoice.pdfUrl,
                                    '_blank',
                                    'noopener,noreferrer'
                                  )
                                } else {
                                  setSelectedInvoice(invoice)
                                  setShowInvoiceModal(true)
                                }
                              }}
                              className='p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-800'
                            >
                              <FaEye />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* History Tab */}
                {activeTab === 'history' && (
                  <div className='space-y-4'>
                    <h3 className='text-sm font-semibold text-gray-900 dark:text-gray-100'>
                      Status History
                    </h3>
                    <div className='space-y-4'>
                      {history.map(item => (
                        <div key={item.id} className='flex gap-3'>
                          <div className='w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0'>
                            {getHistoryIcon(item.type)}
                          </div>
                          <div>
                            <p className='text-sm font-medium text-gray-900 dark:text-gray-100'>
                              {item.status}
                            </p>
                            {item.reason && (
                              <p className='text-xs text-gray-600 dark:text-gray-400 mt-1'>
                                {item.reason}
                              </p>
                            )}
                            <p className='text-xs text-gray-500 dark:text-gray-400 mt-1'>
                              {item.changedBy} •{' '}
                              {formatDateTime(item.changedAt)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Payments Tab */}
                {activeTab === 'payments' && (
                  <div className='space-y-4'>
                    <div className='flex justify-between items-center'>
                      <h3 className='text-sm font-semibold text-gray-900 dark:text-gray-100'>
                        Payment Details
                      </h3>
                      <button
                        onClick={() => setShowPaymentsModal(true)}
                        className='text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium flex items-center gap-1'
                      >
                        <FaEye /> View All
                      </button>
                    </div>

                    <div className='grid grid-cols-2 gap-4 mb-4'>
                      <div className='bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg'>
                        <p className='text-xs text-gray-500 dark:text-gray-400 mb-1'>
                          Advance Required
                        </p>
                        <p className='text-xl font-bold text-gray-900 dark:text-gray-100'>
                          {formatCurrency(
                            booking.advanceRequired,
                            booking.clientCurrency
                          )}
                        </p>
                      </div>
                      <div className='bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg'>
                        <p className='text-xs text-gray-500 dark:text-gray-400 mb-1'>
                          Advance Received
                        </p>
                        <p className='text-xl font-bold text-green-600 dark:text-green-400'>
                          {formatCurrency(
                            booking.advanceReceived,
                            booking.clientCurrency
                          )}
                        </p>
                      </div>
                    </div>

                    <div className='bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800'>
                      <div className='flex justify-between items-center'>
                        <div>
                          <p className='text-sm font-medium text-blue-900 dark:text-blue-300'>
                            Payment Status
                          </p>
                          <p className='text-xs text-blue-700 dark:text-blue-400'>
                            Remaining:{' '}
                            {formatCurrency(
                              remainingAdvance,
                              booking.clientCurrency
                            )}
                          </p>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium border ${getPaymentStatusColor(
                            booking.paymentStatus
                          )}`}
                        >
                          {booking.paymentStatus}
                        </span>
                      </div>
                      <div className='mt-3 w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2'>
                        <div
                          className='bg-blue-600 dark:bg-blue-400 h-2 rounded-full transition-all'
                          style={{
                            width: `${paymentProgress}%`
                          }}
                        />
                      </div>
                    </div>

                    {/* Recent Payments */}
                    <div className='space-y-2'>
                      {payments.slice(0, 2).map(payment => (
                        <div
                          key={payment.id}
                          className='flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg'
                        >
                          <div>
                            <p className='text-sm font-medium text-gray-900 dark:text-gray-100'>
                              {formatCurrency(
                                payment.amount,
                                booking.clientCurrency
                              )}
                            </p>
                            <p className='text-xs text-gray-500 dark:text-gray-400'>
                              {formatDateTime(payment.date)} • {payment.mode}
                            </p>
                          </div>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              payment.status === 'completed'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                            }`}
                          >
                            {payment.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className='space-y-6'>
            {/* Status Controls */}
            <div className='bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden'>
              <div className='px-5 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50'>
                <h3 className='text-xs font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wide flex items-center gap-2'>
                  <FaClock className='text-blue-500' />
                  Status Controls
                </h3>
              </div>
              <div className='p-5 space-y-3'>
                <button
                  onClick={() => handleStatusChange('PENDING')}
                  disabled={booking.status === 'PENDING'}
                  className={`w-full py-2.5 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                    booking.status === 'PENDING'
                      ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-900 cursor-default'
                      : 'bg-white dark:bg-gray-800 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-700 hover:border-yellow-300'
                  }`}
                >
                  <FaClock /> Pending
                </button>
                <button
                  onClick={() => handleStatusChange('CONFIRMED')}
                  disabled={booking.status === 'CONFIRMED'}
                  className={`w-full py-2.5 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                    booking.status === 'CONFIRMED'
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border border-green-200 dark:border-green-900 cursor-default'
                      : 'bg-white dark:bg-gray-800 hover:bg-green-50 dark:hover:bg-green-900/20 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-700 hover:border-green-300'
                  }`}
                >
                  <FaCircleCheck /> Confirmed
                </button>
                <button
                  onClick={() => handleStatusChange('CANCELLED')}
                  disabled={booking.status === 'CANCELLED'}
                  className={`w-full py-2.5 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                    booking.status === 'CANCELLED'
                      ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 border border-red-200 dark:border-red-900 cursor-default'
                      : 'bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-700 hover:border-red-300'
                  }`}
                >
                  <FaBan /> Cancelled
                </button>
                <p className='text-xs text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-1'>
                  <FaClock /> Cancellation requires a reason
                </p>
              </div>
            </div>

            {/* Payment Snapshot */}
            <div className='bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden'>
              <div className='px-5 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50'>
                <h3 className='text-xs font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wide flex items-center gap-2'>
                  <FaCreditCard className='text-blue-500' />
                  Payment Snapshot
                </h3>
              </div>
              <div className='p-5 space-y-4'>
                <div className='flex justify-between items-center'>
                  <span className='text-sm text-gray-600 dark:text-gray-400'>
                    Advance Required
                  </span>
                  <span className='text-sm font-semibold text-gray-900 dark:text-gray-100'>
                    {formatCurrency(
                      booking.advanceRequired,
                      booking.clientCurrency
                    )}
                  </span>
                </div>
                <div className='flex justify-between items-center'>
                  <span className='text-sm text-gray-600 dark:text-gray-400'>
                    Advance Received
                  </span>
                  <span className='text-sm font-semibold text-green-600 dark:text-green-400'>
                    {formatCurrency(
                      booking.advanceReceived,
                      booking.clientCurrency
                    )}
                  </span>
                </div>
                <div className='flex justify-between items-center pt-3 border-t border-gray-100 dark:border-gray-800'>
                  <span className='text-sm text-gray-600 dark:text-gray-400'>
                    Total
                  </span>
                  <span className='text-sm font-bold text-gray-900 dark:text-gray-100'>
                    {formatCurrency(booking.totalAmount, booking.clientCurrency)}
                  </span>
                </div>
                <div className='flex justify-between items-center'>
                  <span className='text-sm text-gray-600 dark:text-gray-400'>
                    Paid
                  </span>
                  <span className='text-sm font-semibold text-green-600 dark:text-green-400'>
                    {formatCurrency(
                      booking.advanceReceived,
                      booking.clientCurrency
                    )}
                  </span>
                </div>
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${getPaymentStatusColor(
                    booking.paymentStatus
                  )}`}
                >
                  <FaCreditCard /> {booking.paymentStatus}
                </span>
              </div>
            </div>

            {/* Quick Links */}
            <div className='bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden'>
              <div className='px-5 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50'>
                <h3 className='text-xs font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wide flex items-center gap-2'>
                  <FaFileInvoice className='text-blue-500' />
                  Quick Links
                </h3>
              </div>
              <div className='p-5 space-y-2'>
                <button
                  onClick={() => navigate(`/quotations/${booking.quotationId}`)}
                  className='w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors flex items-center gap-2'
                >
                  <FaFileInvoice className='text-gray-400' />
                  View Quotation{' '}
                  {booking.quotationNumber ||
                    `#${String(booking.quotationId || '').slice(0, 8)}`}
                </button>
                <button
                  onClick={() => setShowPaymentsModal(true)}
                  className='w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors flex items-center gap-2'
                >
                  <FaCreditCard className='text-gray-400' />
                  View All Payments
                </button>
                <button
                  onClick={() => setActiveTab('invoices')}
                  className='w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors flex items-center gap-2'
                >
                  <FaFileInvoice className='text-gray-400' />
                  View All Invoices
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cancellation Modal */}
      {showCancelModal && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'>
          <div className='bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-md w-full p-6 animate-fadeIn'>
            <div className='flex items-center justify-between mb-4'>
              <h3 className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
                Cancel Booking
              </h3>
              <button
                onClick={() => setShowCancelModal(false)}
                className='text-gray-400 hover:text-gray-600'
              >
                <FaXmark className='text-xl' />
              </button>
            </div>
            <p className='text-sm text-gray-600 dark:text-gray-400 mb-4'>
              Please provide a reason for cancelling this booking. This is
              required.
            </p>
            <textarea
              value={cancellationReason}
              onChange={e => {
                setCancellationReason(e.target.value)
                setCancelError('')
              }}
              rows={4}
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-red-500 dark:bg-gray-800 dark:text-gray-100 ${
                cancelError
                  ? 'border-red-500'
                  : 'border-gray-300 dark:border-gray-700'
              }`}
              placeholder='Enter cancellation reason...'
            />
            {cancelError && (
              <p className='mt-2 text-sm text-red-600 dark:text-red-400 flex items-center gap-1'>
                <FaBan /> {cancelError}
              </p>
            )}
            <div className='flex justify-end gap-3 mt-6'>
              <button
                onClick={() => setShowCancelModal(false)}
                className='px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700'
              >
                Cancel
              </button>
              <button
                onClick={handleCancelConfirm}
                disabled={loading}
                className='px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2'
              >
                {loading ? (
                  <>
                    <FaClock className='animate-spin' />
                    Processing...
                  </>
                ) : (
                  'Confirm Cancellation'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
      `}</style>
    </main>
  )
}

export default BookingDetailPage
