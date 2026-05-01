import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from 'react'
import {
  FaCheck,
  FaCircleXmark,
  FaMoneyBillTransfer,
  FaPlus,
  FaEye,
  FaPen,
  FaChevronLeft,
  FaChevronRight,
  FaXmark,
  FaDownload,
  FaFilter
} from 'react-icons/fa6'
import { FaSearch } from 'react-icons/fa'
import { CurrencyInput } from '../../components/form'
import PermissionGate from '../../components/ui/PermissionGate'
import StatusBadge from '../../components/ui/StatusBadge'
import SurfaceCard from '../../components/ui/SurfaceCard'
import EmptyState from '../../components/ui/EmptyState'
import SearchableDropdown from '../../components/ui/SearchableDropdown'
import { refundsApi } from '../../api/refunds'
import { bookingsApi } from '../../api/bookings'
import { paymentsApi } from '../../api/payments'
import { reportApiError } from '../../lib/notify'
import { useAuth } from '../../context/AuthContext'
import { getCurrencyOptions, formatCurrency } from '../../utils/currency'
import EditRefundModal from './EditRefundModal'

type RefundStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'PROCESSED'

const quickFilters = [
  { key: 'ALL', label: 'All' },
  { key: 'ACTION_REQUIRED', label: 'Action Required' },
  { key: 'PENDING', label: 'Pending' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'REJECTED', label: 'Rejected' },
  { key: 'PROCESSED', label: 'Processed' }
] as const
type QuickFilter = (typeof quickFilters)[number]['key']

type RefundFilterState = {
  refundId: string
  bookingId: string
  paymentId: string
  customer: string
  status: 'ALL' | RefundStatus
  fromDate: string
  toDate: string
  minAmount: string
  maxAmount: string
  sortBy:
    | 'NEWEST_FIRST'
    | 'OLDEST_FIRST'
    | 'AMOUNT_HIGH_TO_LOW'
    | 'AMOUNT_LOW_TO_HIGH'
    | 'NET_HIGH_TO_LOW'
}

const defaultFilters: RefundFilterState = {
  refundId: '',
  bookingId: '',
  paymentId: '',
  customer: '',
  status: 'ALL',
  fromDate: '',
  toDate: '',
  minAmount: '',
  maxAmount: '',
  sortBy: 'NEWEST_FIRST'
}

type RefundRow = {
  id: string
  bookingId: string
  paymentId?: string
  assignedTo?: string
  assignedToName?: string
  raisedByName?: string
  refundAmount: number
  currency?: string
  supplierPenalty: number
  serviceCharge: number
  netAmount: number
  status: RefundStatus
  createdAt: string
  createdBy: string
  approvedAt?: string
  approvedBy?: string
  rejectedAt?: string
  rejectedBy?: string
  rejectedReason?: string
  processedAt?: string
  processedBy?: string
  gatewayRefundId?: string
  proofUrl?: string
  notes?: string
}

type BookingLookup = {
  id: string
  bookingNumber: string
  customer?: string
  customerEmail?: string
  customerPhone?: string
}

type PaymentLookup = {
  id: string
  referenceId: string
  amount: number
  bookingId?: string
  paidAt?: string
  createdAt?: string
  date?: string
}

type FinanceUser = {
  id: string
  fullName: string
  email?: string
}

const MAX_REFUND_PROOF_SIZE = 5 * 1024 * 1024

const formatFileSize = (bytes: number) => {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const power = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1
  )
  const value = bytes / Math.pow(1024, power)
  return `${value % 1 === 0 ? value : value.toFixed(1)} ${units[power]}`
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
        <FaCheck className='text-green-600 dark:text-green-400' />
      ) : type === 'error' ? (
        <FaCircleXmark className='text-red-600 dark:text-red-400' />
      ) : (
        <FaMoneyBillTransfer className='text-blue-600 dark:text-blue-400' />
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

// Confirmation Modal
const ConfirmModal = ({
  isOpen,
  title,
  message,
  type = 'info',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  children
}: {
  isOpen: boolean
  title: string
  message: string
  type?: 'info' | 'warning' | 'danger'
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  onCancel: () => void
  children?: React.ReactNode
}) => {
  if (!isOpen) return null

  const colors = {
    info: {
      bg: 'bg-blue-100 dark:bg-blue-900/20',
      icon: (
        <FaMoneyBillTransfer className='text-blue-600 dark:text-blue-400' />
      ),
      confirm: 'bg-blue-600 hover:bg-blue-700'
    },
    warning: {
      bg: 'bg-yellow-100 dark:bg-yellow-900/20',
      icon: <FaCircleXmark className='text-yellow-600 dark:text-yellow-400' />,
      confirm: 'bg-yellow-600 hover:bg-yellow-700'
    },
    danger: {
      bg: 'bg-red-100 dark:bg-red-900/20',
      icon: <FaCircleXmark className='text-red-600 dark:text-red-400' />,
      confirm: 'bg-red-600 hover:bg-red-700'
    }
  }

  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'>
      <div className='bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-md w-full p-6 animate-fadeIn'>
        <div className='flex items-center gap-3 mb-4'>
          <div
            className={`w-10 h-10 rounded-full ${colors[type].bg} flex items-center justify-center`}
          >
            {colors[type].icon}
          </div>
          <h3 className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
            {title}
          </h3>
        </div>
        <p className='text-sm text-gray-600 dark:text-gray-400 mb-6'>
          {message}
        </p>
        {children}
        <div className='flex justify-end gap-3'>
          <button
            onClick={onCancel}
            className='px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700'
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg ${colors[type].confirm} transition-colors`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

// Rejection Modal
const RejectModal = ({
  isOpen,
  onConfirm,
  onCancel
}: {
  isOpen: boolean
  onConfirm: (reason: string) => void
  onCancel: () => void
}) => {
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleConfirm = () => {
    if (!reason.trim()) {
      setError('Rejection reason is required')
      return
    }
    onConfirm(reason)
    setReason('')
    setError('')
  }

  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'>
      <div className='bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-md w-full p-6 animate-fadeIn'>
        <div className='flex items-center gap-3 mb-4'>
          <div className='w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center'>
            <FaCircleXmark className='text-red-600 dark:text-red-400' />
          </div>
          <h3 className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
            Reject Refund
          </h3>
        </div>

        <p className='text-sm text-gray-600 dark:text-gray-400 mb-4'>
          Please provide a reason for rejecting this refund request.
        </p>

        <textarea
          value={reason}
          onChange={e => {
            setReason(e.target.value)
            setError('')
          }}
          rows={4}
          className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-red-500 dark:bg-gray-800 dark:text-gray-100 ${
            error ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'
          }`}
          placeholder='Enter rejection reason...'
        />

        {error && (
          <p className='mt-2 text-sm text-red-600 flex items-center gap-1'>
            <FaCircleXmark /> {error}
          </p>
        )}

        <div className='flex justify-end gap-3 mt-6'>
          <button
            onClick={onCancel}
            className='px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700'
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className='px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700'
          >
            Confirm Rejection
          </button>
        </div>
      </div>
    </div>
  )
}

// Process Modal
const ProcessModal = ({
  isOpen,
  onConfirm,
  onCancel
}: {
  isOpen: boolean
  onConfirm: (gatewayRefundId: string) => void
  onCancel: () => void
}) => {
  const [gatewayRefundId, setGatewayRefundId] = useState('')
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleConfirm = () => {
    if (!gatewayRefundId.trim()) {
      setError('Gateway Refund ID is required')
      return
    }
    onConfirm(gatewayRefundId)
    setGatewayRefundId('')
    setError('')
  }

  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'>
      <div className='bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-md w-full p-6 animate-fadeIn'>
        <div className='flex items-center gap-3 mb-4'>
          <div className='w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center'>
            <FaMoneyBillTransfer className='text-blue-600 dark:text-blue-400' />
          </div>
          <h3 className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
            Process Refund
          </h3>
        </div>

        <p className='text-sm text-gray-600 dark:text-gray-400 mb-4'>
          Enter the Gateway Refund ID to process this refund.
        </p>

        <input
          type='text'
          value={gatewayRefundId}
          onChange={e => {
            setGatewayRefundId(e.target.value)
            setError('')
          }}
          className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100 ${
            error ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'
          }`}
          placeholder='e.g., GWR-123456'
        />

        {error && (
          <p className='mt-2 text-sm text-red-600 flex items-center gap-1'>
            <FaCircleXmark /> {error}
          </p>
        )}

        <div className='flex justify-end gap-3 mt-6'>
          <button
            onClick={onCancel}
            className='px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700'
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className='px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700'
          >
            Process Refund
          </button>
        </div>
      </div>
    </div>
  )
}

// View Details Modal
const DetailsModal = ({
  isOpen,
  refund,
  bookingDisplay,
  paymentDisplay,
  onClose
}: {
  isOpen: boolean
  refund: RefundRow | null
  bookingDisplay: string
  paymentDisplay: string
  onClose: () => void
}) => {
  if (!isOpen || !refund) return null

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A'
    return new Date(dateStr).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      // hour: '2-digit',
      // minute: '2-digit'
    })
  }

  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'>
      <div className='bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto'>
        <div className='sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 p-4 flex items-center justify-between'>
          <h3 className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
            Refund Details
          </h3>
          <button
            onClick={onClose}
            className='text-gray-400 hover:text-gray-600'
          >
            <FaXmark className='text-xl' />
          </button>
        </div>

        <div className='p-6 space-y-6'>
          {/* Status */}
          <div className='flex items-center justify-between'>
            <span className='text-sm text-gray-500'>Current Status</span>
            <StatusBadge status={refund.status} />
          </div>

          {/* Reference */}
	          <div className='rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/40'>
	            <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
              <div>
                <p className='text-xs text-gray-500'>Booking</p>
                <p className='text-sm font-semibold text-gray-900 dark:text-gray-100'>
                  {bookingDisplay}
                </p>
              </div>
	              <div>
	                <p className='text-xs text-gray-500'>Payment</p>
	                <p className='text-sm font-semibold text-gray-900 dark:text-gray-100'>
	                  {paymentDisplay}
	                </p>
	              </div>
	              <div>
	                <p className='text-xs text-gray-500'>Assigned Finance</p>
	                <p className='text-sm font-semibold text-gray-900 dark:text-gray-100'>
	                  {refund.assignedToName || 'Unassigned'}
	                </p>
	              </div>
	              <div>
	                <p className='text-xs text-gray-500'>Raised By</p>
	                <p className='text-sm font-semibold text-gray-900 dark:text-gray-100'>
	                  {refund.raisedByName || 'N/A'}
	                </p>
	              </div>
	            </div>
	          </div>

          {/* Amounts */}
          <div className='grid grid-cols-2 gap-4'>
            <div className='p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg'>
              <p className='text-xs text-gray-500 mb-1'>Refund Amount</p>
              <p className='text-xl font-bold text-gray-900 dark:text-gray-100'>
                {formatCurrency(refund.refundAmount, refund.currency || 'INR')}
              </p>
            </div>
            <div className='p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg'>
              <p className='text-xs text-gray-500 mb-1'>Net Amount</p>
              <p className='text-xl font-bold text-green-600'>
                {formatCurrency(refund.netAmount, refund.currency || 'INR')}
              </p>
            </div>
          </div>

          {/* Charges */}
          <div className='space-y-2'>
            <h4 className='text-sm font-medium text-gray-700 dark:text-gray-300'>
              Charges Breakdown
            </h4>
            <div className='flex justify-between py-2 border-b border-gray-100 dark:border-gray-800'>
              <span className='text-sm text-gray-600'>Supplier Penalty</span>
              <span className='text-sm font-medium text-gray-900'>
                {formatCurrency(refund.supplierPenalty, refund.currency || 'INR')}
              </span>
            </div>
            <div className='flex justify-between py-2 border-b border-gray-100 dark:border-gray-800'>
              <span className='text-sm text-gray-600'>Service Charge</span>
              <span className='text-sm font-medium text-gray-900'>
                {formatCurrency(refund.serviceCharge, refund.currency || 'INR')}
              </span>
            </div>
            <div className='flex justify-between py-2'>
              <span className='text-sm font-medium text-gray-700'>
                Total Charges
              </span>
              <span className='text-sm font-medium text-red-600'>
                {formatCurrency(refund.supplierPenalty + refund.serviceCharge, refund.currency || 'INR')}
              </span>
            </div>
          </div>

          {(refund.notes || refund.proofUrl) && (
            <div className='space-y-3'>
              <h4 className='text-sm font-medium text-gray-700 dark:text-gray-300'>
                Proof And Notes
              </h4>
              {refund.notes && (
                <div className='rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/40'>
                  <p className='text-xs text-gray-500 mb-1'>Notes</p>
                  <p className='whitespace-pre-wrap text-sm text-gray-900 dark:text-gray-100'>
                    {refund.notes}
                  </p>
                </div>
              )}
              {refund.proofUrl && (
                <button
                  type='button'
                  onClick={() =>
                    window.open(refund.proofUrl, '_blank', 'noopener,noreferrer')
                  }
                  className='inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800'
                >
                  <FaEye /> View Refund Proof
                </button>
              )}
            </div>
          )}

          {/* Timeline */}
          <div className='space-y-3'>
            <h4 className='text-sm font-medium text-gray-700 dark:text-gray-300'>
              Timeline
            </h4>
            <div className='space-y-2'>
              <div className='flex items-start gap-2'>
                <div className='w-1 h-1 mt-2 rounded-full bg-gray-400'></div>
                <div>
                  <p className='text-xs text-gray-500'>Created</p>
                  <p className='text-sm text-gray-900'>
                    {formatDate(refund.createdAt)} by {refund.createdBy}
                  </p>
                </div>
              </div>
              {refund.approvedAt && (
                <div className='flex items-start gap-2'>
                  <div className='w-1 h-1 mt-2 rounded-full bg-green-400'></div>
                  <div>
                    <p className='text-xs text-green-600'>Approved</p>
                    <p className='text-sm text-gray-900'>
                      {formatDate(refund.approvedAt)} by {refund.approvedBy}
                    </p>
                  </div>
                </div>
              )}
              {refund.rejectedAt && (
                <div className='flex items-start gap-2'>
                  <div className='w-1 h-1 mt-2 rounded-full bg-red-400'></div>
                  <div>
                    <p className='text-xs text-red-600'>Rejected</p>
                    <p className='text-sm text-gray-900'>
                      {formatDate(refund.rejectedAt)} by {refund.rejectedBy}
                    </p>
                    <p className='text-xs text-gray-500 mt-1'>
                      Reason: {refund.rejectedReason}
                    </p>
                  </div>
                </div>
              )}
              {refund.processedAt && (
                <div className='flex items-start gap-2'>
                  <div className='w-1 h-1 mt-2 rounded-full bg-blue-400'></div>
                  <div>
                    <p className='text-xs text-blue-600'>Processed</p>
                    <p className='text-sm text-gray-900'>
                      {formatDate(refund.processedAt)} by {refund.processedBy}
                    </p>
                    {refund.gatewayRefundId && (
                      <p className='text-xs text-gray-500'>
                        Gateway ID: {refund.gatewayRefundId}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const mapApiStatusToUi = (status?: string): RefundStatus => {
  switch (String(status || '').toUpperCase()) {
    case 'APPROVED':
      return 'APPROVED'
    case 'REJECTED':
      return 'REJECTED'
    case 'PROCESSED':
      return 'PROCESSED'
    case 'INITIATED':
    default:
      return 'PENDING'
  }
}

const unwrapBookingResponse = (res: unknown): any => {
  const r = res as { data?: unknown }
  const outer = (r?.data ?? res) as { data?: unknown }
  const inner =
    outer && typeof outer === 'object' && 'data' in outer ?
      (outer as { data: unknown }).data
    : outer
  return inner && typeof inner === 'object' ? inner : outer
}

const mapBookingApiToLookup = (booking: any): BookingLookup | null => {
  if (!booking || typeof booking !== 'object') return null
  const id = String(booking.id || '').trim()
  if (!id) return null
  const derivedCustomerName =
    booking.customerName ||
    booking.customer_name ||
    booking.customer?.name ||
    booking.customer?.fullName ||
    booking.leadName ||
    booking.lead_name ||
    booking.lead?.name ||
    booking.lead?.fullName ||
    booking.primaryContactName ||
    booking.contactName ||
    booking.travellerName ||
    booking.customer ||
    ''
  return {
    id,
    bookingNumber:
      booking.bookingNumber ||
      booking.booking_number ||
      booking.bookingCode ||
      booking.booking_code ||
      booking.code ||
      '',
    customer: derivedCustomerName || 'Unknown traveller',
    customerEmail:
      booking.customerEmail ||
      booking.customer_email ||
      booking.customer?.email ||
      '',
    customerPhone:
      booking.customerPhone ||
      booking.customer_phone ||
      booking.customer?.phone ||
      ''
  }
}

const bkLabelFromBookingUuid = (bookingUuid: string) => {
  const hex = String(bookingUuid || '')
    .replace(/-/g, '')
    .slice(0, 8)
    .toUpperCase()
  return `BK-${hex || 'UNKNOWN'}`
}

/** Same style as Bookings list: full human booking number, e.g. #BK-1777143943586-8316 */
const formatBkBookingLabel = (
  lookup: BookingLookup | undefined,
  bookingUuid: string
) => {
  const raw = (lookup?.bookingNumber || '').trim()
  if (raw) {
    const core = raw.replace(/^#+\s*/, '').trim()
    return core.startsWith('#') ? core : `#${core}`
  }
  return `#${bkLabelFromBookingUuid(bookingUuid)}`
}

const mapApiRefund = (refund: any): RefundRow => {
  const refundAmount = Number(
    refund?.refundAmount ?? refund?.refund_amount ?? 0
  )
  const supplierPenalty = Number(
    refund?.supplierPenalty ?? refund?.supplier_penalty ?? 0
  )
  const serviceCharge = Number(
    refund?.serviceCharge ?? refund?.service_charge ?? 0
  )
  const netAmount = refundAmount - supplierPenalty - serviceCharge

  return {
    id: refund?.id || '',
    bookingId: refund?.bookingId ?? refund?.booking_id ?? '',
    paymentId: refund?.paymentId ?? refund?.payment_id ?? undefined,
    assignedTo: refund?.assignedTo ?? refund?.assigned_to ?? undefined,
    assignedToName:
      refund?.assignedToName ?? refund?.assigned_to_name ?? undefined,
    raisedByName: refund?.raisedByName ?? refund?.raised_by_name ?? undefined,
    refundAmount,
    currency: refund?.currency || 'INR',
    supplierPenalty,
    serviceCharge,
    netAmount,
    status: mapApiStatusToUi(refund?.status),
    createdAt:
      refund?.createdAt ?? refund?.created_at ?? new Date().toISOString(),
    createdBy: refund?.createdBy ?? refund?.created_by ?? 'System',
    approvedAt: refund?.approvedAt ?? refund?.approved_at,
    approvedBy: refund?.approvedBy ?? refund?.approved_by,
    rejectedAt: refund?.rejectedAt ?? refund?.rejected_at,
    rejectedBy: refund?.rejectedBy ?? refund?.rejected_by,
    rejectedReason: refund?.rejectedReason ?? refund?.rejected_reason,
    processedAt: refund?.processedAt ?? refund?.processed_at,
    processedBy: refund?.processedBy ?? refund?.processed_by,
    gatewayRefundId: refund?.gatewayRefundId ?? refund?.gateway_refund_id,
    proofUrl: refund?.proofUrl ?? refund?.proof_url,
    notes: refund?.notes
  }
}

const toIsoDate = (value?: string | null) => {
  if (!value) return ''
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return ''
  return parsed.toISOString().split('T')[0]
}

const matchesQuickFilter = (quickFilter: QuickFilter, row: RefundRow) => {
  switch (quickFilter) {
    case 'ALL':
      return true
    case 'ACTION_REQUIRED':
      return row.status === 'PENDING' || row.status === 'APPROVED'
    case 'PENDING':
      return row.status === 'PENDING'
    case 'APPROVED':
      return row.status === 'APPROVED'
    case 'REJECTED':
      return row.status === 'REJECTED'
    case 'PROCESSED':
      return row.status === 'PROCESSED'
    default:
      return true
  }
}

const RefundsPage = () => {
  const { token, user } = useAuth()
  const viewerRaisedByName = useMemo(
    () =>
      (user?.name?.trim() || user?.email?.split('@')[0] || '').trim(),
    [user?.name, user?.email]
  )
  const [rows, setRows] = useState<RefundRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingRefundId, setEditingRefundId] = useState<string | null>(null)
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('ALL')
  const [search, setSearch] = useState('')
  const [filterError, setFilterError] = useState('')
  const [showMobileFilters, setShowMobileFilters] = useState(false)
  const [page, setPage] = useState(1)
  const [draftFilters, setDraftFilters] =
    useState<RefundFilterState>(defaultFilters)
  const [appliedFilters, setAppliedFilters] =
    useState<RefundFilterState>(defaultFilters)
  const [toast, setToast] = useState<{
    show: boolean
    message: string
    type: 'success' | 'error' | 'info'
  }>({
    show: false,
    message: '',
    type: 'success'
  })
  const [selectedRefund, setSelectedRefund] = useState<RefundRow | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [showProcessModal, setShowProcessModal] = useState(false)
  const [showApproveConfirm, setShowApproveConfirm] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [actionRefundId, setActionRefundId] = useState<string | null>(null)

  const pageSize = 15

  const [form, setForm] = useState({
    bookingId: '',
    paymentId: '',
    assignedTo: '',
    raisedByName: '',
    refundAmount: '' as number | '',
    currency: 'INR',
    supplierPenalty: '' as number | '',
    serviceCharge: '' as number | '',
    notes: ''
  })
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [proofUploadError, setProofUploadError] = useState('')
  const proofInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (!viewerRaisedByName) return
    setForm(prev => ({ ...prev, raisedByName: viewerRaisedByName }))
  }, [viewerRaisedByName])

  const [bookings, setBookings] = useState<BookingLookup[]>([])
  /** Populated via getById for refund rows — not only dropdown search results */
  const [bookingLookupCache, setBookingLookupCache] = useState<
    Map<string, BookingLookup>
  >(() => new Map())
  const [payments, setPayments] = useState<PaymentLookup[]>([])
  const [financeUsers, setFinanceUsers] = useState<FinanceUser[]>([])
  const [loadingFinanceUsers, setLoadingFinanceUsers] = useState(false)
  const [loadingBookings, setLoadingBookings] = useState(false)
  const [loadingPayments, setLoadingPayments] = useState(false)
  const currencyOptions = useMemo(() => getCurrencyOptions(false), [])

  const bookingById = useMemo(() => {
    const m = new Map<string, BookingLookup>()
    bookingLookupCache.forEach((booking, cacheKey) => {
      const cid = String(booking?.id || cacheKey || '').trim()
      if (!cid) return
      m.set(cid, { ...booking, id: cid })
    })
    for (const booking of bookings) {
      if (booking?.id) m.set(booking.id, booking)
    }
    return m
  }, [bookingLookupCache, bookings])

  const bookingsNeedHydrationKey = useMemo(() => {
    const uniq = [
      ...new Set(
        rows
          .map(r => String(r.bookingId || '').trim())
          .filter(Boolean)
      )
    ]
    const missing = uniq.filter(id => !bookingLookupCache.has(id))
    missing.sort()
    return missing.join('|')
  }, [rows, bookingLookupCache])

  useEffect(() => {
    if (!token || !bookingsNeedHydrationKey) return

    let cancelled = false
    const ids = bookingsNeedHydrationKey.split('|').filter(Boolean)

    ;(async () => {
      const settled = await Promise.all(
        ids.map(async bookingId => {
          try {
            const res = await bookingsApi.getById(bookingId)
            const raw = unwrapBookingResponse(res)
            const mapped =
              mapBookingApiToLookup({ ...raw, id: raw?.id ?? bookingId }) || {
                id: bookingId,
                bookingNumber: '',
                customer: '',
                customerEmail: '',
                customerPhone: ''
              }
            return mapped
          } catch {
            return {
              id: bookingId,
              bookingNumber: '',
              customer: '',
              customerEmail: '',
              customerPhone: ''
            } as BookingLookup
          }
        })
      )

      if (cancelled) return

      setBookingLookupCache(prev => {
        const next = new Map(prev)
        let changed = false
        settled.forEach(lookup => {
          if (!lookup?.id) return
          if (!next.has(lookup.id)) {
            next.set(lookup.id, lookup)
            changed = true
          }
        })
        return changed ? next : prev
      })
    })()

    return () => {
      cancelled = true
    }
  }, [token, bookingsNeedHydrationKey])
  const paymentById = useMemo(
    () => new Map(payments.map(payment => [payment.id, payment])),
    [payments]
  )
  const financeUsersForDropdown = useMemo(() => {
    const assignId = String(form.assignedTo || '').trim()
    const byId = new Map(financeUsers.map(u => [u.id, u]))
    if (assignId && !byId.has(assignId)) {
      const row =
        editingRefundId ?
          rows.find(r => r.id === editingRefundId)
        : undefined
      const fallbackName =
        row?.assignedToName?.trim() || 'Finance assignee'
      return [{ id: assignId, fullName: fallbackName, email: undefined }, ...financeUsers]
    }
    return financeUsers
  }, [financeUsers, form.assignedTo, editingRefundId, rows])

  const financeUserOptions = useMemo(
    () => [
      {
        value: '',
        label: loadingFinanceUsers
          ? 'Loading finance users...'
          : financeUsers.length === 0 && financeUsersForDropdown.length <= 1
          ? 'No accounts users found'
          : 'Select finance person...'
      },
      ...financeUsersForDropdown.map(user => ({
        value: user.id,
        label: `${user.fullName}${user.email ? ` - ${user.email}` : ''}`
      }))
    ],
    [financeUsers, financeUsersForDropdown, loadingFinanceUsers]
  )

  const shortId = (value?: string) => {
    const normalized = String(value || '').trim()
    if (!normalized) return 'N/A'
    if (normalized.length <= 12) return normalized
    return `${normalized.slice(0, 8)}...`
  }

  const getBookingDisplay = useCallback(
    (bookingId?: string) => {
      const normalized = String(bookingId || '').trim()
      if (!normalized) return 'N/A'
      const booking = bookingById.get(normalized)
      const name = booking?.customer?.trim() || 'Unknown traveller'
      const refLabel = formatBkBookingLabel(booking, normalized)
      return `${name} · ${refLabel}`
    },
    [bookingById]
  )

  const renderRefundBookingCell = useCallback(
    (
      row: RefundRow,
      options?: { showFinanceAssignee?: boolean }
    ): ReactNode => {
      const id = String(row.bookingId || '').trim()
      const booking = bookingById.get(id)
      const name =
        booking?.customer?.trim() || 'Unknown traveller'
      const refLabel = formatBkBookingLabel(booking, id || row.bookingId)
      const pendingHydrate =
        Boolean(id && token && !bookingLookupCache.has(id))
      const showFinanceAssignee =
        options?.showFinanceAssignee !== false

      return (
        <>
          <p className='text-sm font-semibold text-gray-900 dark:text-gray-100'>
            {name}
          </p>
          <p
            className='text-xs font-mono text-blue-700 dark:text-blue-300'
            title={id ? `Booking UUID: ${id}` : undefined}
          >
            {refLabel}
          </p>
          {pendingHydrate ? (
            <p className='text-[10px] text-gray-400'>Loading booking…</p>
          ) : null}
          {showFinanceAssignee ? (
            <p className='text-xs text-gray-500 dark:text-gray-400'>
              Finance: {row.assignedToName || 'Unassigned'}
            </p>
          ) : null}
        </>
      )
    },
    [bookingById, bookingLookupCache, token]
  )

  const getPaymentDisplay = useCallback(
    (paymentId?: string) => {
      const normalized = String(paymentId || '').trim()
      if (!normalized) return 'No payment linked'
      const payment = paymentById.get(normalized)
      if (!payment) return `Payment ${shortId(normalized)}`
      return `${payment.referenceId} - $${payment.amount.toFixed(2)}`
    },
    [paymentById]
  )

  const bookingOptions = useMemo(
    () =>
      bookings.map(booking => {
        const customerName = booking.customer || 'Unknown Customer'
        const bookingLabel = booking.bookingNumber || shortId(booking.id)
        return {
          value: booking.id,
          label: `${customerName} ${bookingLabel}`,
          leftLabel: customerName,
          rightLabel: bookingLabel,
          selectedLabel: `${customerName} · ${bookingLabel}`,
          searchText: `${customerName} ${bookingLabel} ${booking.id}`
        }
      }),
    [bookings]
  )

  const paymentOptions = useMemo(
    () =>
      payments.map(payment => {
        const booking = payment.bookingId
          ? bookingById.get(payment.bookingId)
          : undefined
        const customerName = booking?.customer || 'Unknown Customer'
        const refLabel = payment.referenceId
        const amountLabel = `$${payment.amount.toFixed(2)}`
        return {
          value: payment.id,
          label: `${customerName} ${refLabel} ${amountLabel}`,
          leftLabel: customerName,
          rightLabel: refLabel,
          rightSubLabel: amountLabel,
          rightSubEmphasis: true,
          selectedLabel: `${customerName} · ${refLabel} · ${amountLabel}`,
          searchText: `${customerName} ${refLabel} ${amountLabel} ${payment.bookingId || ''}`
        }
      }),
    [payments, bookingById]
  )

  const toPaymentTimestamp = (payment: PaymentLookup) => {
    const raw =
      payment.paidAt || payment.createdAt || payment.date || ''
    const parsed = Date.parse(raw)
    return Number.isFinite(parsed) ? parsed : 0
  }

  const bookingDropdownOptions = useMemo(
    () => [
      {
        value: '',
        label: loadingBookings ? 'Loading bookings...' : 'Select booking...'
      },
      ...bookingOptions
    ],
    [bookingOptions, loadingBookings]
  )

  const paymentDropdownOptions = useMemo(() => {
    const selectedBookingId = String(form.bookingId || '').trim()
    return [
      {
        value: '',
        label: loadingPayments
          ? 'Loading payments...'
          : !selectedBookingId
          ? 'Select booking first'
          : paymentOptions.length === 0
          ? 'No payments for selected booking'
          : 'Select payment...'
      },
      ...paymentOptions
    ]
  }, [form.bookingId, loadingPayments, paymentOptions])

  const statusOptions = useMemo(
    () => [
      { value: 'ALL', label: 'All Statuses' },
      { value: 'PENDING', label: 'Pending' },
      { value: 'APPROVED', label: 'Approved' },
      { value: 'REJECTED', label: 'Rejected' },
      { value: 'PROCESSED', label: 'Processed' }
    ],
    []
  )

  const sortOptions = useMemo(
    () => [
      { value: 'NEWEST_FIRST', label: 'Newest First' },
      { value: 'OLDEST_FIRST', label: 'Oldest First' },
      { value: 'AMOUNT_HIGH_TO_LOW', label: 'Amount High-Low' },
      { value: 'AMOUNT_LOW_TO_HIGH', label: 'Amount Low-High' },
      { value: 'NET_HIGH_TO_LOW', label: 'Net Amount High-Low' }
    ],
    []
  )

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (appliedFilters.refundId) count += 1
    if (appliedFilters.bookingId) count += 1
    if (appliedFilters.paymentId) count += 1
    if (appliedFilters.customer) count += 1
    if (appliedFilters.status !== 'ALL') count += 1
    if (appliedFilters.fromDate) count += 1
    if (appliedFilters.toDate) count += 1
    if (appliedFilters.minAmount) count += 1
    if (appliedFilters.maxAmount) count += 1
    if (appliedFilters.sortBy !== 'NEWEST_FIRST') count += 1
    return count
  }, [appliedFilters])

  const updateDraftFilter = <K extends keyof RefundFilterState>(
    key: K,
    value: RefundFilterState[K]
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

    const minAmount = Number(draftFilters.minAmount || 0)
    const maxAmount = Number(draftFilters.maxAmount || 0)
    if (
      draftFilters.minAmount &&
      draftFilters.maxAmount &&
      minAmount > maxAmount
    ) {
      setFilterError('Min Amount cannot be greater than Max Amount.')
      return
    }

    setFilterError('')
    const timer = window.setTimeout(() => {
      setAppliedFilters({
        ...draftFilters,
        refundId: draftFilters.refundId.trim(),
        bookingId: draftFilters.bookingId.trim(),
        paymentId: draftFilters.paymentId.trim(),
        customer: draftFilters.customer.trim(),
        minAmount: draftFilters.minAmount.trim(),
        maxAmount: draftFilters.maxAmount.trim()
      })
      setPage(1)
    }, 250)

    return () => window.clearTimeout(timer)
  }, [draftFilters])

  // Filter and pagination
  const filteredRows = useMemo(() => {
    return rows.filter(row => {
      if (!matchesQuickFilter(quickFilter, row)) return false
      if (appliedFilters.status !== 'ALL' && row.status !== appliedFilters.status)
        return false

      const createdAtIso = toIsoDate(row.createdAt)
      if (appliedFilters.fromDate && (!createdAtIso || createdAtIso < appliedFilters.fromDate))
        return false
      if (appliedFilters.toDate && (!createdAtIso || createdAtIso > appliedFilters.toDate))
        return false

      const bookingDisplay = getBookingDisplay(row.bookingId)
      const paymentDisplay = getPaymentDisplay(row.paymentId)
      const bookingMeta = bookingById.get(String(row.bookingId || ''))

      if (
        appliedFilters.refundId &&
        !String(row.id ?? '')
          .toLowerCase()
          .includes(appliedFilters.refundId.toLowerCase())
      ) {
        return false
      }
      if (
        appliedFilters.bookingId &&
        !`${row.bookingId} ${bookingDisplay}`
          .toLowerCase()
          .includes(appliedFilters.bookingId.toLowerCase())
      ) {
        return false
      }
      if (
        appliedFilters.paymentId &&
        !`${row.paymentId ?? ''} ${paymentDisplay}`
          .toLowerCase()
          .includes(appliedFilters.paymentId.toLowerCase())
      ) {
        return false
      }
      if (
        appliedFilters.customer &&
        !`${bookingMeta?.customer ?? ''} ${bookingMeta?.customerEmail ?? ''} ${
          bookingMeta?.customerPhone ?? ''
        }`
          .toLowerCase()
          .includes(appliedFilters.customer.toLowerCase())
      ) {
        return false
      }

      const refundAmount = Number(row.refundAmount || 0)
      if (
        appliedFilters.minAmount &&
        refundAmount < Number(appliedFilters.minAmount)
      ) {
        return false
      }
      if (
        appliedFilters.maxAmount &&
        refundAmount > Number(appliedFilters.maxAmount)
      ) {
        return false
      }

      const query = search.toLowerCase().trim()
      if (!query) return true

      const createdAtText = row.createdAt
        ? new Date(row.createdAt).toLocaleDateString()
        : ''
      const haystack = [
        row.id,
        row.bookingId,
        row.paymentId ?? '',
        bookingDisplay,
        paymentDisplay,
        bookingMeta?.customer ?? '',
        bookingMeta?.customerEmail ?? '',
        bookingMeta?.customerPhone ?? '',
        row.status,
        createdAtText,
        createdAtIso
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(query)
    })
  }, [
    rows,
    search,
    quickFilter,
    appliedFilters,
    getBookingDisplay,
    getPaymentDisplay,
    bookingById
  ])

  const toTimestamp = (value?: string | null) => {
    if (!value) return 0
    const parsed = Date.parse(value)
    return Number.isFinite(parsed) ? parsed : 0
  }

  const ordered = useMemo(
    () =>
      [...filteredRows].sort((a, b) => {
        if (appliedFilters.sortBy === 'AMOUNT_HIGH_TO_LOW') {
          return Number(b.refundAmount || 0) - Number(a.refundAmount || 0)
        }
        if (appliedFilters.sortBy === 'AMOUNT_LOW_TO_HIGH') {
          return Number(a.refundAmount || 0) - Number(b.refundAmount || 0)
        }
        if (appliedFilters.sortBy === 'NET_HIGH_TO_LOW') {
          return Number(b.netAmount || 0) - Number(a.netAmount || 0)
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
    [filteredRows, appliedFilters.sortBy]
  )

  const totalPages = Math.ceil(ordered.length / pageSize)
  const paginatedRows = ordered.slice((page - 1) * pageSize, page * pageSize)

  const exportCurrentTable = () => {
    if (!paginatedRows.length) return

    const headers = [
      'Refund ID',
      'Booking ID',
      'Payment ID',
      'Refund Amount',
      'Supplier Penalty',
      'Service Charge',
      'Net Amount',
      'Status',
      'Created At',
      'Created By'
    ]

    const escapeCsv = (value: string) => `"${value.replace(/\"/g, '\"\"')}"`

    const dataRows = paginatedRows.map(row => [
      row.id ?? '',
      row.bookingId ?? '',
      row.paymentId ?? '',
      row.refundAmount ?? 0,
      row.supplierPenalty ?? 0,
      row.serviceCharge ?? 0,
      row.netAmount ?? 0,
      row.status ?? '',
      row.createdAt ?? '',
      row.createdBy ?? ''
    ])

    const csv = [headers, ...dataRows]
      .map(row => row.map(cell => escapeCsv(String(cell))).join(','))
      .join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `refunds-page-${page}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const handleResetFilters = () => {
    setFilterError('')
    setDraftFilters(defaultFilters)
    setAppliedFilters(defaultFilters)
    setQuickFilter('ALL')
    setSearch('')
    setShowMobileFilters(false)
    setPage(1)
  }

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToast({ show: true, message, type })
    setTimeout(
      () => setToast({ show: false, message: '', type: 'success' }),
      3000
    )
  }

  useEffect(() => {
    const loadRefunds = async () => {
      if (!token) {
        setRows([])
        setError('Please login to view refunds.')
        return
      }

      setLoading(true)
      setError('')
      try {
        const response = await refundsApi.list()
        const payload = (response as any)?.data ?? response
        const data =
          (payload as any)?.data || (payload as any)?.items || payload
        if (Array.isArray(data)) {
          setRows(data.map(mapApiRefund))
        } else {
          setRows([])
          setError('Invalid refund data from API.')
        }
      } catch (err) {
        console.error('Failed to load refunds:', err)
        setRows([])
        reportApiError(err, 'Failed to load refunds.', setError)
      } finally {
        setLoading(false)
      }
    }

    void loadRefunds()
  }, [token])

  useEffect(() => {
    if ((!showForm && !showEditModal) || !token) return

    let cancelled = false
    const loadFinanceUsers = async () => {
      setLoadingFinanceUsers(true)
      try {
        const response = await refundsApi.listAssignableUsers()
        const payload = (response as any)?.data ?? response
        const data =
          (payload as any)?.data || (payload as any)?.items || payload || []
        if (cancelled) return
        setFinanceUsers(
          (Array.isArray(data) ? data : []).map((item: any) => ({
            id: String(item?.id || ''),
            fullName: String(item?.fullName ?? item?.full_name ?? ''),
            email: item?.email ? String(item.email) : undefined
          }))
        )
      } catch (err) {
        if (cancelled) return
        setFinanceUsers([])
        reportApiError(err, 'Failed to load finance users', setFormError)
      } finally {
        if (!cancelled) {
          setLoadingFinanceUsers(false)
        }
      }
    }

    void loadFinanceUsers()
    return () => {
      cancelled = true
    }
  }, [showForm, showEditModal, token])

  const searchBookings = useCallback(async (query: string) => {
    if (!token || !query.trim()) {
      setBookings([])
      return
    }

    setLoadingBookings(true)
    try {
      const bookingsRes = await bookingsApi.list({ 
        page: 1, 
        limit: 50,
        search: query.trim()
      })

      const bookingsPayload = bookingsRes as any
      const bookingsData =
        bookingsPayload?.data?.data ||
        bookingsPayload?.data ||
        bookingsPayload ||
        []
      const bookingsList = Array.isArray(bookingsData) ? bookingsData : []

      setBookings(
        bookingsList
          .map((booking: any) => mapBookingApiToLookup(booking))
          .filter((b): b is BookingLookup => Boolean(b))
          .map(b => ({
            ...b,
            bookingNumber:
              (b.bookingNumber || '').trim() ?
                b.bookingNumber
              : `BK-${shortId(b.id)}`
          }))
      )
    } catch (err) {
      console.error('Failed to search bookings:', err)
      setBookings([])
    } finally {
      setLoadingBookings(false)
    }
  }, [token])

  const loadPaymentsForBooking = useCallback(
    async (bookingId: string) => {
      const normalizedBookingId = String(bookingId || '').trim()
      if (!token || !normalizedBookingId) {
        setPayments([])
        setLoadingPayments(false)
        return
      }

      setLoadingPayments(true)
      try {
        const paymentsRes = await paymentsApi.list({ bookingId: normalizedBookingId })
        const paymentsPayload = paymentsRes as any
        const paymentsData =
          paymentsPayload?.data?.data ||
          paymentsPayload?.data ||
          paymentsPayload ||
          []
        const paymentsList = Array.isArray(paymentsData) ? paymentsData : []

        const mappedPayments = paymentsList.map((payment: any) => ({
          id: String(payment.id || ''),
          bookingId: String(
            payment.bookingId ||
              payment.booking_id ||
              payment.booking?.id ||
              payment.booking?.bookingId ||
              ''
          ),
          referenceId:
            payment.paymentReference ||
            payment.payment_reference ||
            payment.gatewayPaymentId ||
            payment.gateway_payment_id ||
            payment.id,
          amount: Number(payment.amount || 0),
          paidAt: payment.paidAt || payment.paid_at,
          createdAt: payment.createdAt || payment.created_at,
          date: payment.date
        }))

        setPayments(mappedPayments)
        setForm(current => {
          if (current.bookingId !== normalizedBookingId) return current
          const latestPayment = mappedPayments
            .slice()
            .sort((a, b) => toPaymentTimestamp(b) - toPaymentTimestamp(a))[0]
          const hasSelectedPayment = mappedPayments.some(
            payment => payment.id === current.paymentId
          )
          return {
            ...current,
            paymentId:
              current.paymentId && hasSelectedPayment
                ? current.paymentId
                : latestPayment?.id || ''
          }
        })
      } catch (err) {
        console.error('Failed to load payments for booking:', err)
        setPayments([])
      } finally {
        setLoadingPayments(false)
      }
    },
    [token]
  )

  useEffect(() => {
    if (!showForm) {
      setBookings([])
      setPayments([])
    }
  }, [showForm])

  useEffect(() => {
    if (!showForm) return
    const selectedBookingId = String(form.bookingId || '').trim()
    if (!selectedBookingId) {
      setPayments([])
      setLoadingPayments(false)
      return
    }
    void loadPaymentsForBooking(selectedBookingId)
  }, [showForm, form.bookingId, loadPaymentsForBooking])

  const clearProofSelection = () => {
    setProofFile(null)
    setProofUploadError('')
    if (proofInputRef.current) {
      proofInputRef.current.value = ''
    }
  }

  const resetRefundForm = () => {
    setForm({
      bookingId: '',
      paymentId: '',
      assignedTo: '',
      raisedByName: viewerRaisedByName,
      refundAmount: '',
      currency: 'INR',
      supplierPenalty: '',
      serviceCharge: '',
      notes: ''
    })
    setEditingRefundId(null)
    setFormError('')
    clearProofSelection()
    setShowEditModal(false)
  }

  const handleProofFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.type !== 'application/pdf' && !file.type.startsWith('image/')) {
      setProofUploadError('Upload a PDF or image as refund proof')
      event.target.value = ''
      return
    }

    if (file.size > MAX_REFUND_PROOF_SIZE) {
      setProofUploadError('Refund proof must be 5 MB or smaller')
      event.target.value = ''
      return
    }

    setProofUploadError('')
    setProofFile(file)
  }

  const saveRefund = async () => {
    if (!form.bookingId || form.refundAmount === '') return
    if (!form.assignedTo.trim()) {
      setFormError('Select finance person.')
      return
    }
    if (!viewerRaisedByName) {
      setFormError('Your name could not be loaded. Refresh the page or sign in again.')
      return
    }

    setLoading(true)
    setFormError('')
    try {
      const basePayload = {
        assignedTo: form.assignedTo,
        raisedByName: viewerRaisedByName,
        refundAmount: Number(form.refundAmount),
        supplierPenalty: Number(form.supplierPenalty || 0),
        serviceCharge: Number(form.serviceCharge || 0),
        ...(form.notes.trim() ? { notes: form.notes.trim() } : {})
      }
      const payload = editingRefundId
        ? basePayload
        : {
            bookingId: form.bookingId,
            ...(form.paymentId ? { paymentId: form.paymentId } : {}),
            ...basePayload
          }
      const requestBody = proofFile
        ? (() => {
            const formData = new FormData()
            Object.entries(payload).forEach(([key, value]) => {
              formData.append(key, String(value))
            })
            formData.append('proofFile', proofFile, proofFile.name)
            return formData
          })()
        : payload
      const response = editingRefundId
        ? await refundsApi.update(editingRefundId, requestBody)
        : await refundsApi.create(requestBody)
      const data =
        (response as any)?.data?.data ?? (response as any)?.data ?? response
      const savedRefund = mapApiRefund(data)

      setRows(current =>
        editingRefundId
          ? current.map(item => (item.id === editingRefundId ? savedRefund : item))
          : [savedRefund, ...current]
      )
      if (selectedRefund?.id === savedRefund.id) {
        setSelectedRefund(savedRefund)
      }
      resetRefundForm()
      setShowForm(false)
    } catch (err) {
      console.error('Failed to save refund:', err)
      reportApiError(
        err,
        editingRefundId ? 'Failed to update refund' : 'Failed to create refund',
        setFormError
      )
    } finally {
      setLoading(false)
    }
  }

  const handleEditRefund = (row: RefundRow) => {
    setShowForm(false)
    setForm({
      bookingId: row.bookingId,
      paymentId: row.paymentId || '',
      assignedTo: row.assignedTo || '',
      raisedByName: viewerRaisedByName,
      refundAmount: row.refundAmount,
      currency: row.currency || 'INR',
      supplierPenalty: row.supplierPenalty,
      serviceCharge: row.serviceCharge,
      notes: row.notes || ''
    })
    setEditingRefundId(row.id)
    setFormError('')
    clearProofSelection()
    setShowEditModal(true)
  }

  const handleApprove = (id: string) => {
    setActionRefundId(id)
    setShowApproveConfirm(true)
  }

  const confirmApprove = () => {
    if (!actionRefundId) return

    setLoading(true)
    refundsApi
      .approve(actionRefundId)
      .then(response => {
        const data =
          (response as any)?.data?.data ?? (response as any)?.data ?? response
        const updated = mapApiRefund(data)
        const approvedAt = updated.approvedAt || new Date().toISOString()
        setRows(current =>
          current.map(item =>
            item.id === actionRefundId ? { ...updated, approvedAt } : item
          )
        )
        showToast('Refund approved successfully', 'success')
      })
      .catch(err => {
        console.error('Failed to approve refund:', err)
        reportApiError(err, 'Failed to approve refund')
      })
      .finally(() => {
        setShowApproveConfirm(false)
        setActionRefundId(null)
        setLoading(false)
      })
  }

  const handleReject = (id: string) => {
    setActionRefundId(id)
    setShowRejectModal(true)
  }

  const confirmReject = (reason: string) => {
    if (!actionRefundId) return

    setLoading(true)
    refundsApi
      .reject(actionRefundId, { reason })
      .then(response => {
        const data =
          (response as any)?.data?.data ?? (response as any)?.data ?? response
        const updated = mapApiRefund(data)
        const rejectedAt = updated.rejectedAt || new Date().toISOString()
        setRows(current =>
          current.map(item =>
            item.id === actionRefundId
              ? { ...updated, rejectedAt, rejectedReason: reason }
              : item
          )
        )
        showToast('Refund rejected', 'info')
      })
      .catch(err => {
        console.error('Failed to reject refund:', err)
        reportApiError(err, 'Failed to reject refund')
      })
      .finally(() => {
        setShowRejectModal(false)
        setActionRefundId(null)
        setLoading(false)
      })
  }

  const handleProcess = (id: string) => {
    setActionRefundId(id)
    setShowProcessModal(true)
  }

  const confirmProcess = (gatewayRefundId: string) => {
    if (!actionRefundId) return

    setLoading(true)
    refundsApi
      .process(actionRefundId, { gatewayRefundId })
      .then(response => {
        const data =
          (response as any)?.data?.data ?? (response as any)?.data ?? response
        const updated = mapApiRefund(data)
        const processedAt = updated.processedAt || new Date().toISOString()
        setRows(current =>
          current.map(item =>
            item.id === actionRefundId
              ? { ...updated, processedAt, gatewayRefundId }
              : item
          )
        )
        showToast('Refund processed successfully', 'success')
      })
      .catch(err => {
        console.error('Failed to process refund:', err)
        reportApiError(err, 'Failed to process refund')
      })
      .finally(() => {
        setShowProcessModal(false)
        setActionRefundId(null)
        setLoading(false)
      })
  }

  const handleViewDetails = (refund: RefundRow) => {
    setSelectedRefund(refund)
    setShowDetails(true)
  }

  return (
    <div className='space-y-4 sm:space-y-6 px-0 sm:px-0 max-w-9xl mx-auto'>
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
      <EditRefundModal
        isOpen={showEditModal}
        refundId={editingRefundId}
        form={form}
        setForm={setForm}
        formError={formError}
        loading={loading}
        financeUserOptions={financeUserOptions}
        currencyOptions={currencyOptions}
        proofFile={proofFile}
        proofUploadError={proofUploadError}
        proofInputRef={proofInputRef}
        handleProofFileChange={handleProofFileChange}
        clearProofSelection={clearProofSelection}
        onSave={saveRefund}
        onCancel={resetRefundForm}
      />

      <ConfirmModal
        isOpen={showApproveConfirm}
        title='Approve Refund'
        message='Are you sure you want to approve this refund request?'
        type='info'
        confirmText='Approve'
        onConfirm={confirmApprove}
        onCancel={() => {
          setShowApproveConfirm(false)
          setActionRefundId(null)
        }}
      />

      <RejectModal
        isOpen={showRejectModal}
        onConfirm={confirmReject}
        onCancel={() => {
          setShowRejectModal(false)
          setActionRefundId(null)
        }}
      />

      <ProcessModal
        isOpen={showProcessModal}
        onConfirm={confirmProcess}
        onCancel={() => {
          setShowProcessModal(false)
          setActionRefundId(null)
        }}
      />

      <DetailsModal
        isOpen={showDetails}
        refund={selectedRefund}
        bookingDisplay={getBookingDisplay(selectedRefund?.bookingId)}
        paymentDisplay={getPaymentDisplay(selectedRefund?.paymentId)}
        onClose={() => {
          setShowDetails(false)
          setSelectedRefund(null)
        }}
      />

      {/* Header */}
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
        <div>
          <h1 className='text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100'>
            Refunds
          </h1>
          <p className='text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1'>
            Manage refund lifecycle and processing actions
          </p>
          {error ? (
            <p className='mt-2 text-xs sm:text-sm text-red-500'>{error}</p>
          ) : null}
        </div>
        <div className='flex flex-col sm:flex-row gap-2 w-full sm:w-auto'>
          <PermissionGate permission='refunds:update'>
            <button
              onClick={() => {
                if (showForm) {
                  setShowForm(false)
                  resetRefundForm()
                  return
                }
                resetRefundForm()
                setShowForm(true)
              }}
              className='inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors w-full sm:w-auto'
            >
              {showForm ? <FaXmark className='text-lg' /> : <FaPlus />}{' '}
              {showForm ? 'Close' : 'Create Refund'}
            </button>
          </PermissionGate>
        </div>
      </div>

      {/* Create form (edit uses EditRefundModal) */}
      {showForm && (
        <SurfaceCard className='p-5 border border-gray-200 dark:border-gray-800'>
          <div className='mb-4 flex items-center justify-between gap-3'>
            <h2 className='text-base font-semibold text-gray-900 dark:text-gray-100'>
              New Refund Request
            </h2>
          </div>
          {formError ? (
            <div className='mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-200'>
              {formError}
            </div>
          ) : null}
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <div>
              <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                Booking * (Search by booking number or ID)
              </label>
              <SearchableDropdown
                value={form.bookingId}
                onChange={value => {
                  setForm(current => ({
                    ...current,
                    bookingId: value,
                    paymentId: ''
                  }))
                }}
                onSearch={searchBookings}
                options={bookingDropdownOptions}
                searchPlaceholder='Type booking number (e.g., BK-1776424194713-8883)'
                disabled={loadingBookings}
              />
            </div>
            <div>
              <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                Payment Reference
              </label>
              <SearchableDropdown
                value={form.paymentId}
                onChange={value =>
                  setForm(current => ({ ...current, paymentId: value }))
                }
                options={paymentDropdownOptions}
                searchPlaceholder='Search payment...'
                disabled={loadingPayments || !form.bookingId}
              />
            </div>
            <div>
              <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                Assign Finance Person *
              </label>
              <SearchableDropdown
                value={form.assignedTo}
                onChange={value =>
                  setForm(current => ({ ...current, assignedTo: value }))
                }
                options={financeUserOptions}
                searchPlaceholder='Search accounts user...'
                disabled={loadingFinanceUsers}
              />
            </div>
            <CurrencyInput
              label='Refund Amount'
              value={form.refundAmount}
              onChange={value =>
                setForm(current => ({ ...current, refundAmount: value }))
              }
              required
            />
            <div>
              <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                Currency
              </label>
              <SearchableDropdown
                value={form.currency}
                onChange={value =>
                  setForm(current => ({ ...current, currency: value }))
                }
                options={currencyOptions}
                searchPlaceholder='Search currency...'
              />
            </div>
            <CurrencyInput
              label='Supplier Penalty'
              value={form.supplierPenalty}
              onChange={value =>
                setForm(current => ({ ...current, supplierPenalty: value }))
              }
            />
            <CurrencyInput
              label='Service Charge'
              value={form.serviceCharge}
              onChange={value =>
                setForm(current => ({ ...current, serviceCharge: value }))
              }
            />
          </div>
          <div className='mt-4'>
            <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
              Raised By *
            </label>
            <input
              type='text'
              readOnly
              value={viewerRaisedByName}
              title='Taken from logged-in account'
              className='w-full cursor-not-allowed rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-800/80 dark:text-gray-200'
            />
            <p className='mt-1 text-xs text-gray-500 dark:text-gray-400'>
              Logged-in user (cannot be changed)
            </p>
          </div>
          <div className='mt-4'>
            <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
              Notes
            </label>
            <textarea
              value={form.notes}
              onChange={event =>
                setForm(current => ({ ...current, notes: event.target.value }))
              }
              rows={3}
              placeholder='Refund reason, proof notes, or approval context'
              className='w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:border-gray-700 dark:bg-gray-900'
            />
          </div>
          <div className='mt-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900'>
            <p className='text-sm font-semibold text-gray-800 dark:text-gray-100 mb-2'>
              Refund Proof
            </p>
            {proofFile ? (
              <div className='flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-800'>
                <div>
                  <p className='text-sm font-medium text-gray-800 dark:text-gray-100'>
                    {proofFile.name}
                  </p>
                  <p className='text-xs text-gray-500'>
                    {formatFileSize(proofFile.size)}
                  </p>
                </div>
                <button
                  type='button'
                  className='text-xs font-semibold text-red-600 hover:underline'
                  onClick={clearProofSelection}
                >
                  Remove
                </button>
              </div>
            ) : (
              <p className='text-sm text-gray-500'>
                Upload refund proof image or PDF, max 5 MB.
              </p>
            )}
            <div className='mt-3'>
              <label
                htmlFor='refund-proof-upload'
                className='inline-flex cursor-pointer items-center rounded-lg border border-dashed border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-blue-500 hover:text-blue-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200'
              >
                Upload Proof
              </label>
              <input
                id='refund-proof-upload'
                ref={proofInputRef}
                type='file'
                accept='application/pdf,image/*'
                className='hidden'
                onChange={handleProofFileChange}
              />
            </div>
            {proofUploadError && (
              <p className='mt-2 text-xs text-red-500'>{proofUploadError}</p>
            )}
          </div>
          <div className='flex justify-end gap-3 mt-4'>
            <button
              onClick={() => {
                setShowForm(false)
                resetRefundForm()
              }}
              className='px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50'
            >
              Cancel
            </button>
            <button
              onClick={saveRefund}
              className='px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700'
            >
              Create Refund
            </button>
          </div>
        </SurfaceCard>
      )}

      {/* Filters */}
      <SurfaceCard className='p-3 sm:p-4 border border-gray-200 dark:border-gray-800 space-y-3'>
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
            <FaSearch className='absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400' />
            <input
              type='text'
              value={search}
              onChange={event => {
                setSearch(event.target.value)
                setPage(1)
              }}
              placeholder='Search by refund ID, booking, payment, customer...'
              className='w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-800'
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
              className='sm:hidden inline-flex items-center rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800'
            >
              <FaFilter className='mr-2' />
              {showMobileFilters ? 'Hide Filters' : 'Advanced Filters'}
            </button>
          </div>
        </div>

        <div
          className={`${
            showMobileFilters ? 'block' : 'hidden'
          } sm:block space-y-3 rounded-xl border border-gray-200 bg-gray-50/60 p-3 dark:border-gray-700 dark:bg-gray-900/30`}
        >
          <div className='grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5'>
            <div>
              <label className='mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300'>
                Refund ID
              </label>
              <input
                type='text'
                value={draftFilters.refundId}
                onChange={event =>
                  updateDraftFilter('refundId', event.target.value)
                }
                placeholder='Refund ID'
                className='w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:border-gray-700 dark:bg-gray-900'
              />
            </div>
            <div>
              <label className='mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300'>
                Booking
              </label>
              <input
                type='text'
                value={draftFilters.bookingId}
                onChange={event =>
                  updateDraftFilter('bookingId', event.target.value)
                }
                placeholder='Booking number or ID'
                className='w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:border-gray-700 dark:bg-gray-900'
              />
            </div>
            <div>
              <label className='mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300'>
                Payment
              </label>
              <input
                type='text'
                value={draftFilters.paymentId}
                onChange={event =>
                  updateDraftFilter('paymentId', event.target.value)
                }
                placeholder='Payment reference or ID'
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
                placeholder='Customer name/email/phone'
                className='w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:border-gray-700 dark:bg-gray-900'
              />
            </div>
            <div>
              <label className='mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300'>
                Status
              </label>
              <SearchableDropdown
                value={draftFilters.status}
                onChange={value =>
                  updateDraftFilter('status', value as RefundFilterState['status'])
                }
                options={statusOptions}
                searchPlaceholder='Search status...'
              />
            </div>
          </div>

          <div className='grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5'>
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
                Min Amount
              </label>
              <input
                type='number'
                min='0'
                value={draftFilters.minAmount}
                onChange={event =>
                  updateDraftFilter('minAmount', event.target.value)
                }
                placeholder='0'
                className='w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:border-gray-700 dark:bg-gray-900'
              />
            </div>
            <div>
              <label className='mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300'>
                Max Amount
              </label>
              <input
                type='number'
                min='0'
                value={draftFilters.maxAmount}
                onChange={event =>
                  updateDraftFilter('maxAmount', event.target.value)
                }
                placeholder='Any'
                className='w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:border-gray-700 dark:bg-gray-900'
              />
            </div>
            <div>
              <label className='mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300'>
                Sort By
              </label>
              <SearchableDropdown
                value={draftFilters.sortBy}
                onChange={value =>
                  updateDraftFilter('sortBy', value as RefundFilterState['sortBy'])
                }
                options={sortOptions}
                searchPlaceholder='Search sort option...'
              />
            </div>
          </div>

          <div className='flex flex-col-reverse gap-2 sm:flex-row sm:justify-end'>
            {showMobileFilters ? (
              <button
                type='button'
                onClick={() => setShowMobileFilters(false)}
                className='sm:hidden rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700'
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
              disabled={!paginatedRows.length}
              className='inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-green-500 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:cursor-not-allowed disabled:opacity-50 dark:border-green-400 dark:text-gray-200 dark:hover:bg-gray-800'
            >
              <FaDownload /> Export
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
      </SurfaceCard>

      {/* Table */}
      <SurfaceCard className='overflow-hidden border border-gray-200 dark:border-gray-800'>
        {loading ? (
          <div className='p-8 flex justify-center'>
            <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600'></div>
          </div>
        ) : paginatedRows.length === 0 ? (
          <div className='p-8'>
            <EmptyState
              title='No refunds found'
              description='Create a new refund request to get started'
              icon={<FaMoneyBillTransfer className='text-4xl' />}
            />
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className='hidden sm:block overflow-x-auto'>
              <table className='w-full'>
                <thead className='bg-gray-50 dark:bg-gray-800/50'>
                  <tr>
                    <th className='px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400'>
                      Refund ID
                    </th>
                    <th className='px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400'>
                      Booking
                    </th>
                    <th className='px-5 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400'>
                      Refund
                    </th>
                    <th className='px-5 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400'>
                      Net Amount
                    </th>
                    <th className='px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400'>
                      Status
                    </th>
                    <th className='px-5 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400'>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-gray-100 dark:divide-gray-800'>
                  {paginatedRows.map(row => (
                    <tr
                      key={row.id}
                      className='hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors'
                    >
                      <td className='px-5 py-4'>
                        <p className='text-sm font-medium text-blue-600 dark:text-blue-400'>
                          {row.id}
                        </p>
                        <p className='text-xs text-gray-500'>
                          {getPaymentDisplay(row.paymentId)}
                        </p>
                      </td>
                      <td className='px-5 py-4'>
                        {renderRefundBookingCell(row)}
                      </td>
                      <td className='px-5 py-4 text-right'>
                        <p className='text-sm font-medium text-gray-900 dark:text-gray-100'>
                          {formatCurrency(row.refundAmount, row.currency || 'INR')}
                        </p>
                        <p className='text-xs text-gray-500'>
                          Charges: {formatCurrency(row.supplierPenalty + row.serviceCharge, row.currency || 'INR')}
                        </p>
                      </td>
                      <td className='px-5 py-4 text-right'>
                        <p className='text-sm font-semibold text-green-600'>
                          {formatCurrency(row.netAmount, row.currency || 'INR')}
                        </p>
                      </td>
                      <td className='px-5 py-4'>
                        <StatusBadge status={row.status} />
                      </td>
                      <td className='px-5 py-4 text-right'>
                        <PermissionGate permission='refunds:update'>
                          <div className='flex justify-end gap-2'>
                            <button
                              onClick={() => handleViewDetails(row)}
                              className='p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors'
                              title='View Details'
                            >
                              <FaEye />
                            </button>
                            {row.status === 'PENDING' && (
                              <>
                                <button
                                  onClick={() => handleEditRefund(row)}
                                  className='p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors'
                                  title='Edit'
                                >
                                  <FaPen />
                                </button>
                                <button
                                  onClick={() => handleApprove(row.id)}
                                  className='p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors'
                                  title='Approve'
                                >
                                  <FaCheck />
                                </button>
                                <button
                                  onClick={() => handleReject(row.id)}
                                  className='p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors'
                                  title='Reject'
                                >
                                  <FaCircleXmark />
                                </button>
                              </>
                            )}
                            {row.status === 'APPROVED' && (
                              <button
                                onClick={() => handleProcess(row.id)}
                                className='p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors'
                                title='Process'
                              >
                                <FaMoneyBillTransfer />
                              </button>
                            )}
                          </div>
                        </PermissionGate>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className='sm:hidden divide-y divide-gray-100 dark:divide-gray-800'>
              {paginatedRows.map(row => (
                <div key={row.id} className='p-4 space-y-3'>
                  <div className='flex items-start justify-between'>
                    <div>
                      <p className='text-sm font-medium text-blue-600 dark:text-blue-400'>
                        {row.id}
                      </p>
                      <div className='mt-2 space-y-0.5 text-xs'>
                        <p className='text-[11px] font-semibold uppercase tracking-wide text-gray-500'>
                          Booking
                        </p>
                        {renderRefundBookingCell(row, {
                          showFinanceAssignee: false
                        })}
                      </div>
                      <p className='text-xs text-gray-500'>
                        Payment: {getPaymentDisplay(row.paymentId)}
                      </p>
                      <p className='text-xs text-gray-500'>
                        Finance: {row.assignedToName || 'Unassigned'}
                      </p>
                      <p className='text-xs text-gray-500'>
                        Raised By: {row.raisedByName || 'N/A'}
                      </p>
                    </div>
                    <StatusBadge status={row.status} />
                  </div>

                  <div className='grid grid-cols-2 gap-2'>
                    <div>
                      <p className='text-xs text-gray-500'>Refund Amount</p>
                      <p className='text-sm font-semibold text-gray-900'>
                        {formatCurrency(row.refundAmount, row.currency || 'INR')}
                      </p>
                    </div>
                    <div>
                      <p className='text-xs text-gray-500'>Net Amount</p>
                      <p className='text-sm font-semibold text-green-600'>
                        {formatCurrency(row.netAmount, row.currency || 'INR')}
                      </p>
                    </div>
                  </div>

                  <div className='flex justify-end gap-2'>
                    <button
                      onClick={() => handleViewDetails(row)}
                      className='p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg'
                    >
                      <FaEye />
                    </button>
                    {row.status === 'PENDING' && (
                      <>
                        <button
                          onClick={() => handleEditRefund(row)}
                          className='p-2 text-amber-600 hover:bg-amber-50 rounded-lg'
                        >
                          <FaPen />
                        </button>
                        <button
                          onClick={() => handleApprove(row.id)}
                          className='p-2 text-green-600 hover:bg-green-50 rounded-lg'
                        >
                          <FaCheck />
                        </button>
                        <button
                          onClick={() => handleReject(row.id)}
                          className='p-2 text-red-600 hover:bg-red-50 rounded-lg'
                        >
                          <FaCircleXmark />
                        </button>
                      </>
                    )}
                    {row.status === 'APPROVED' && (
                      <button
                        onClick={() => handleProcess(row.id)}
                        className='p-2 text-blue-600 hover:bg-blue-50 rounded-lg'
                      >
                        <FaMoneyBillTransfer />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className='flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-4 border-t border-gray-200 dark:border-gray-800'>
              <p className='text-xs sm:text-sm text-gray-500 order-2 sm:order-1'>
                Showing{' '}
                {Math.min(filteredRows.length, (page - 1) * pageSize + 1)}-
                {Math.min(filteredRows.length, page * pageSize)} of{' '}
                {filteredRows.length}
              </p>
              <div className='flex items-center gap-2 order-1 sm:order-2'>
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className='p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 disabled:opacity-40'
                >
                  <FaChevronLeft />
                </button>
                <span className='px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 text-sm font-medium'>
                  {page}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className='p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 disabled:opacity-40'
                >
                  <FaChevronRight />
                </button>
              </div>
            </div>
          </>
        )}
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
  )
}

export default RefundsPage
