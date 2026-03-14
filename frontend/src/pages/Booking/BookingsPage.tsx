import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FaArrowTrendUp,
  FaCalendarDays,
  FaChevronLeft,
  FaChevronRight,
  FaCreditCard,
  FaDownload,
  FaEye,
  FaFileInvoiceDollar,
  FaMagnifyingGlass,
  FaPaperPlane,
  FaPlus,
  FaTriangleExclamation,
  FaMoneyBillWave,
  FaEnvelope,
  FaFilter,
  FaXmark,
  FaCircleCheck,
  FaCircleExclamation,
  FaClock,
  FaUser,
  FaGlobe,
  FaDollarSign,
  FaFilePdf
} from 'react-icons/fa6'
import SurfaceCard from '../../components/ui/SurfaceCard'
import EmptyState from '../../components/ui/EmptyState'
import { validateBookingTransition } from '../../utils/workflowValidation'
import { bookingsApi } from '../../api/bookings'

type BookingStatus = 'confirmed' | 'pending' | 'cancelled'
type PaymentStatus = 'partial' | 'unpaid' | 'paid' | 'refunded'

interface Booking {
  id: string
  bookingId: string
  customer: string
  destination: string
  dates: string
  status: BookingStatus
  payment: PaymentStatus
  paid: number
  total: number
  documentsReady: number
  documentsTotal: number
}

interface NewBookingData {
  customer: string
  email: string
  phone: string
  destination: string
  travelStart: string
  travelEnd: string
  totalAmount: number
  advanceRequired: number
  notes?: string
}

interface PaymentData {
  amount: number
  method: 'cash' | 'card' | 'bank' | 'cheque'
  reference?: string
  notes?: string
  date: string
}

interface InvoiceData {
  bookingId: string
  amount: number
  dueDate: string
  items?: Array<{ description: string; amount: number }>
}

const statusClasses: Record<BookingStatus, string> = {
  confirmed:
    'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-900',
  pending:
    'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-900',
  cancelled:
    'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-900'
}

const paymentClasses: Record<PaymentStatus, string> = {
  partial:
    'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-900',
  unpaid:
    'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-900',
  paid: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-900',
  refunded:
    'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'
}

const bookings: Booking[] = [
  {
    id: '1',
    bookingId: 'BK-2034',
    customer: 'Sarah Jenkins',
    destination: 'Maldives Retreat',
    dates: 'Dec 15 - Dec 20',
    status: 'confirmed',
    payment: 'partial',
    paid: 1200,
    total: 4250,
    documentsReady: 2,
    documentsTotal: 4
  },
  {
    id: '2',
    bookingId: 'BK-2033',
    customer: 'Michael Ross',
    destination: 'Dubai Luxury',
    dates: 'Jan 10 - Jan 15',
    status: 'pending',
    payment: 'unpaid',
    paid: 0,
    total: 2800,
    documentsReady: 0,
    documentsTotal: 3
  },
  {
    id: '3',
    bookingId: 'BK-2030',
    customer: 'Emma Wilson',
    destination: 'Paris & London',
    dates: 'Nov 05 - Nov 12',
    status: 'confirmed',
    payment: 'paid',
    paid: 5400,
    total: 5400,
    documentsReady: 5,
    documentsTotal: 5
  },
  {
    id: '4',
    bookingId: 'BK-2028',
    customer: 'James Lee',
    destination: 'Tokyo Adventure',
    dates: 'Dec 01 - Dec 10',
    status: 'cancelled',
    payment: 'refunded',
    paid: 0,
    total: 8200,
    documentsReady: 1,
    documentsTotal: 3
  }
]

// Toast Component
const Toast = ({
  message,
  type,
  onClose
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

// Create Booking Modal
const CreateBookingModal = ({
  isOpen,
  onClose,
  onSave
}: {
  isOpen: boolean
  onClose: () => void
  onSave: (data: NewBookingData) => void
}) => {
  const [formData, setFormData] = useState<NewBookingData>({
    customer: '',
    email: '',
    phone: '',
    destination: '',
    travelStart: '',
    travelEnd: '',
    totalAmount: 0,
    advanceRequired: 0,
    notes: ''
  })
  const [errors, setErrors] = useState<
    Partial<Record<keyof NewBookingData, string>>
  >({})

  if (!isOpen) return null

  const validate = () => {
    const newErrors: Partial<Record<keyof NewBookingData, string>> = {}
    if (!formData.customer) newErrors.customer = 'Customer name is required'
    if (!formData.destination) newErrors.destination = 'Destination is required'
    if (!formData.travelStart)
      newErrors.travelStart = 'Travel start date is required'
    if (!formData.travelEnd) newErrors.travelEnd = 'Travel end date is required'
    if (formData.totalAmount <= 0)
      newErrors.totalAmount = 'Total amount must be greater than 0'

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = () => {
    if (validate()) {
      onSave(formData)
      onClose()
      setFormData({
        customer: '',
        email: '',
        phone: '',
        destination: '',
        travelStart: '',
        travelEnd: '',
        totalAmount: 0,
        advanceRequired: 0,
        notes: ''
      })
    }
  }

  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'>
      <div className='bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto'>
        <div className='sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 p-4 flex items-center justify-between'>
          <h3 className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
            Create New Booking
          </h3>
          <button
            onClick={onClose}
            className='text-gray-400 hover:text-gray-600'
          >
            <FaXmark className='text-xl' />
          </button>
        </div>

        <div className='p-6 space-y-4'>
          {/* Customer Info */}
          <div className='grid grid-cols-2 gap-4'>
            <div>
              <label className='field-label'>Customer Name *</label>
              <input
                type='text'
                value={formData.customer}
                onChange={e =>
                  setFormData({ ...formData, customer: e.target.value })
                }
                className={`field-input ${
                  errors.customer ? 'border-red-500' : ''
                }`}
                placeholder='John Doe'
              />
              {errors.customer && (
                <p className='text-xs text-red-500 mt-1'>{errors.customer}</p>
              )}
            </div>
            <div>
              <label className='field-label'>Email</label>
              <input
                type='email'
                value={formData.email}
                onChange={e =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className={`field-input ${
                  errors.email ? 'border-red-500' : ''
                }`}
                placeholder='john@example.com'
              />
              {errors.email && (
                <p className='text-xs text-red-500 mt-1'>{errors.email}</p>
              )}
            </div>
          </div>

          <div className='grid grid-cols-2 gap-4'>
            <div>
              <label className='field-label'>Phone</label>
              <input
                type='tel'
                value={formData.phone}
                onChange={e =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                className='field-input'
                placeholder='+1 234 567 8900'
              />
            </div>
            <div>
              <label className='field-label'>Destination *</label>
              <input
                type='text'
                value={formData.destination}
                onChange={e =>
                  setFormData({ ...formData, destination: e.target.value })
                }
                className={`field-input ${
                  errors.destination ? 'border-red-500' : ''
                }`}
                placeholder='Maldives'
              />
              {errors.destination && (
                <p className='text-xs text-red-500 mt-1'>
                  {errors.destination}
                </p>
              )}
            </div>
          </div>

          {/* Travel Dates */}
          <div className='grid grid-cols-2 gap-4'>
            <div>
              <label className='field-label'>Travel Start *</label>
              <input
                type='date'
                value={formData.travelStart}
                onChange={e =>
                  setFormData({ ...formData, travelStart: e.target.value })
                }
                className={`field-input ${
                  errors.travelStart ? 'border-red-500' : ''
                }`}
              />
              {errors.travelStart && (
                <p className='text-xs text-red-500 mt-1'>
                  {errors.travelStart}
                </p>
              )}
            </div>
            <div>
              <label className='field-label'>Travel End *</label>
              <input
                type='date'
                value={formData.travelEnd}
                onChange={e =>
                  setFormData({ ...formData, travelEnd: e.target.value })
                }
                className={`field-input ${
                  errors.travelEnd ? 'border-red-500' : ''
                }`}
              />
              {errors.travelEnd && (
                <p className='text-xs text-red-500 mt-1'>{errors.travelEnd}</p>
              )}
            </div>
          </div>

          {/* Amounts */}
          <div className='grid grid-cols-2 gap-4'>
            <div>
              <label className='field-label'>Total Amount ($) *</label>
              <input
                type='number'
                value={formData.totalAmount || ''}
                onChange={e =>
                  setFormData({
                    ...formData,
                    totalAmount: parseFloat(e.target.value) || 0
                  })
                }
                className={`field-input ${
                  errors.totalAmount ? 'border-red-500' : ''
                }`}
                placeholder='0.00'
                min='0'
                step='0.01'
              />
              {errors.totalAmount && (
                <p className='text-xs text-red-500 mt-1'>
                  {errors.totalAmount}
                </p>
              )}
            </div>
            <div>
              <label className='field-label'>Advance Required ($)</label>
              <input
                type='number'
                value={formData.advanceRequired || ''}
                onChange={e =>
                  setFormData({
                    ...formData,
                    advanceRequired: parseFloat(e.target.value) || 0
                  })
                }
                className='field-input'
                placeholder='0.00'
                min='0'
                step='0.01'
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className='field-label'>Notes</label>
            <textarea
              value={formData.notes}
              onChange={e =>
                setFormData({ ...formData, notes: e.target.value })
              }
              rows={3}
              className='field-input'
              placeholder='Any special requests or notes...'
            />
          </div>
        </div>

        <div className='sticky bottom-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 p-4 flex justify-end gap-3'>
          <button
            onClick={onClose}
            className='px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700'
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className='px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700'
          >
            Create Booking
          </button>
        </div>
      </div>
    </div>
  )
}

// Record Payment Modal
const RecordPaymentModal = ({
  isOpen,
  booking,
  onClose,
  onSave
}: {
  isOpen: boolean
  booking: Booking | null
  onClose: () => void
  onSave: (bookingId: string, data: PaymentData) => void
}) => {
  const [formData, setFormData] = useState<PaymentData>({
    amount: 0,
    method: 'cash',
    reference: '',
    notes: '',
    date: new Date().toISOString().split('T')[0]
  })
  const [errors, setErrors] = useState<{ amount?: string }>({})

  if (!isOpen || !booking) return null

  const validate = () => {
    const newErrors: { amount?: string } = {}
    if (formData.amount <= 0) newErrors.amount = 'Amount must be greater than 0'
    if (formData.amount > booking.total - booking.paid) {
      newErrors.amount = `Amount cannot exceed remaining balance $${(
        booking.total - booking.paid
      ).toLocaleString()}`
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = () => {
    if (validate()) {
      onSave(booking.id, formData)
      onClose()
    }
  }

  const remainingAmount = booking.total - booking.paid

  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'>
      <div className='bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-md w-full'>
        <div className='p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between'>
          <h3 className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
            Record Payment
          </h3>
          <button
            onClick={onClose}
            className='text-gray-400 hover:text-gray-600'
          >
            <FaXmark className='text-xl' />
          </button>
        </div>

        <div className='p-6 space-y-4'>
          {/* Booking Info */}
          <div className='bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg space-y-1'>
            <p className='text-sm font-medium text-gray-900 dark:text-gray-100'>
              {booking.customer}
            </p>
            <p className='text-xs text-gray-600 dark:text-gray-400'>
              Booking #{booking.bookingId}
            </p>
            <div className='flex justify-between text-xs mt-2'>
              <span className='text-gray-500'>
                Total: ${booking.total.toLocaleString()}
              </span>
              <span className='text-gray-500'>
                Paid: ${booking.paid.toLocaleString()}
              </span>
              <span className='text-green-600 font-medium'>
                Due: ${remainingAmount.toLocaleString()}
              </span>
            </div>
          </div>

          <div>
            <label className='field-label'>Amount ($) *</label>
            <input
              type='number'
              value={formData.amount || ''}
              onChange={e =>
                setFormData({
                  ...formData,
                  amount: parseFloat(e.target.value) || 0
                })
              }
              className={`field-input ${errors.amount ? 'border-red-500' : ''}`}
              placeholder='0.00'
              min='0'
              step='0.01'
              max={remainingAmount}
            />
            {errors.amount && (
              <p className='text-xs text-red-500 mt-1'>{errors.amount}</p>
            )}
          </div>

          <div>
            <label className='field-label'>Payment Method</label>
            <select
              value={formData.method}
              onChange={e =>
                setFormData({
                  ...formData,
                  method: e.target.value as PaymentData['method']
                })
              }
              className='field-input'
            >
              <option value='cash'>Cash</option>
              <option value='card'>Card</option>
              <option value='bank'>Bank Transfer</option>
              <option value='cheque'>Cheque</option>
            </select>
          </div>

          <div>
            <label className='field-label'>Reference (Optional)</label>
            <input
              type='text'
              value={formData.reference}
              onChange={e =>
                setFormData({ ...formData, reference: e.target.value })
              }
              className='field-input'
              placeholder='e.g., Transaction ID, Cheque No.'
            />
          </div>

          <div>
            <label className='field-label'>Payment Date</label>
            <input
              type='date'
              value={formData.date}
              onChange={e => setFormData({ ...formData, date: e.target.value })}
              className='field-input'
            />
          </div>

          <div>
            <label className='field-label'>Notes (Optional)</label>
            <textarea
              value={formData.notes}
              onChange={e =>
                setFormData({ ...formData, notes: e.target.value })
              }
              rows={2}
              className='field-input'
              placeholder='Any additional notes...'
            />
          </div>
        </div>

        <div className='p-4 border-t border-gray-200 dark:border-gray-800 flex justify-end gap-3'>
          <button
            onClick={onClose}
            className='px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50'
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className='px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700'
          >
            Record Payment
          </button>
        </div>
      </div>
    </div>
  )
}

// Generate Invoice Modal
const GenerateInvoiceModal = ({
  isOpen,
  booking,
  onClose,
  onSave
}: {
  isOpen: boolean
  booking: Booking | null
  onClose: () => void
  onSave: (bookingId: string, data: InvoiceData) => void
}) => {
  const [formData, setFormData] = useState<InvoiceData>({
    bookingId: booking?.id || '',
    amount: booking?.total || 0,
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0],
    items: []
  })
  const [errors, setErrors] = useState<{ amount?: string }>({})

  if (!isOpen || !booking) return null

  const validate = () => {
    const newErrors: { amount?: string } = {}
    if (formData.amount <= 0) newErrors.amount = 'Amount must be greater than 0'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = () => {
    if (validate()) {
      onSave(booking.id, formData)
      onClose()
    }
  }

  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'>
      <div className='bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-md w-full'>
        <div className='p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between'>
          <h3 className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
            Generate Invoice
          </h3>
          <button
            onClick={onClose}
            className='text-gray-400 hover:text-gray-600'
          >
            <FaXmark className='text-xl' />
          </button>
        </div>

        <div className='p-6 space-y-4'>
          <div className='bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg'>
            <p className='text-sm font-medium text-gray-900 dark:text-gray-100'>
              {booking.customer}
            </p>
            <p className='text-xs text-gray-600 dark:text-gray-400'>
              Booking #{booking.bookingId}
            </p>
          </div>

          <div>
            <label className='field-label'>Invoice Amount ($) *</label>
            <input
              type='number'
              value={formData.amount || ''}
              onChange={e =>
                setFormData({
                  ...formData,
                  amount: parseFloat(e.target.value) || 0
                })
              }
              className={`field-input ${errors.amount ? 'border-red-500' : ''}`}
              placeholder='0.00'
              min='0'
              step='0.01'
            />
            {errors.amount && (
              <p className='text-xs text-red-500 mt-1'>{errors.amount}</p>
            )}
          </div>

          <div>
            <label className='field-label'>Due Date</label>
            <input
              type='date'
              value={formData.dueDate}
              onChange={e =>
                setFormData({ ...formData, dueDate: e.target.value })
              }
              className='field-input'
            />
          </div>

          <p className='text-xs text-gray-500 dark:text-gray-400'>
            Invoice will be generated with booking details and sent to customer.
          </p>
        </div>

        <div className='p-4 border-t border-gray-200 dark:border-gray-800 flex justify-end gap-3'>
          <button
            onClick={onClose}
            className='px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50'
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className='px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700'
          >
            Generate Invoice
          </button>
        </div>
      </div>
    </div>
  )
}

// Cancel Booking Modal
const CancelBookingModal = ({
  isOpen,
  booking,
  onClose,
  onConfirm
}: {
  isOpen: boolean
  booking: Booking | null
  onClose: () => void
  onConfirm: (bookingId: string, reason: string) => void
}) => {
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')

  if (!isOpen || !booking) return null

  const handleSubmit = () => {
    if (!reason.trim()) {
      setError('Cancellation reason is required')
      return
    }
    onConfirm(booking.id, reason)
    onClose()
    setReason('')
    setError('')
  }

  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'>
      <div className='bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-md w-full'>
        <div className='p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between'>
          <h3 className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
            Cancel Booking
          </h3>
          <button
            onClick={onClose}
            className='text-gray-400 hover:text-gray-600'
          >
            <FaXmark className='text-xl' />
          </button>
        </div>

        <div className='p-6 space-y-4'>
          <div className='bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg'>
            <p className='text-sm font-medium text-gray-900 dark:text-gray-100'>
              {booking.customer}
            </p>
            <p className='text-xs text-gray-600 dark:text-gray-400'>
              Booking #{booking.bookingId}
            </p>
          </div>

          <p className='text-sm text-gray-600 dark:text-gray-400'>
            Are you sure you want to cancel this booking? This action cannot be
            undone.
          </p>

          <div>
            <label className='field-label'>Cancellation Reason *</label>
            <textarea
              value={reason}
              onChange={e => {
                setReason(e.target.value)
                setError('')
              }}
              rows={3}
              className={`field-input ${error ? 'border-red-500' : ''}`}
              placeholder='Please provide a reason for cancellation...'
            />
            {error && <p className='text-xs text-red-500 mt-1'>{error}</p>}
          </div>
        </div>

        <div className='p-4 border-t border-gray-200 dark:border-gray-800 flex justify-end gap-3'>
          <button
            onClick={onClose}
            className='px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50'
          >
            Go Back
          </button>
          <button
            onClick={handleSubmit}
            className='px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700'
          >
            Confirm Cancellation
          </button>
        </div>
      </div>
    </div>
  )
}

const BookingsPage: React.FC = () => {
  const navigate = useNavigate()
  const [statusFilter, setStatusFilter] = useState<'all' | BookingStatus>('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [error, setError] = useState('')
  const [showMobileFilters, setShowMobileFilters] = useState(false)
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{
    show: boolean
    message: string
    type: 'success' | 'error' | 'info'
  }>({
    show: false,
    message: '',
    type: 'success'
  })

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showInvoiceModal, setShowInvoiceModal] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)

  const pageSize = 4

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToast({ show: true, message, type })
    setTimeout(
      () => setToast({ show: false, message: '', type: 'success' }),
      3000
    )
  }

  const handleGenerateInvoice = async (bookingId: string) => {
    setLoading(true)
    try {
      await bookingsApi.generateInvoice(bookingId)
      showToast('Invoice generated successfully', 'success')
    } catch (error) {
      console.error('Failed to generate invoice:', error)
      showToast('Failed to generate invoice', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleSendConfirmation = async (bookingId: string) => {
    setLoading(true)
    try {
      await bookingsApi.sendConfirmation(bookingId)
      showToast('Confirmation sent successfully', 'success')
    } catch (error) {
      console.error('Failed to send confirmation:', error)
      showToast('Failed to send confirmation', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleRecordPayment = (booking: Booking) => {
    setSelectedBooking(booking)
    setShowPaymentModal(true)
  }

  const handlePaymentSubmit = async (
    bookingId: string,
    paymentData: PaymentData
  ) => {
    setLoading(true)
    try {
      await bookingsApi.recordPayment(bookingId, paymentData)
      showToast('Payment recorded successfully', 'success')
      // Update local state would go here
    } catch (error) {
      console.error('Failed to record payment:', error)
      showToast('Failed to record payment', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleInvoiceSubmit = async (
    bookingId: string,
    invoiceData: InvoiceData
  ) => {
    setLoading(true)
    try {
      await bookingsApi.generateInvoice(bookingId)
      showToast('Invoice generated successfully', 'success')
    } catch (error) {
      console.error('Failed to generate invoice:', error)
      showToast('Failed to generate invoice', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateBooking = async (data: NewBookingData) => {
    setLoading(true)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      console.log('Creating booking:', data)
      showToast('Booking created successfully', 'success')
      // Navigate to new booking detail
      navigate('/bookings/new-id')
    } catch (error) {
      console.error('Failed to create booking:', error)
      showToast('Failed to create booking', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleCancelBooking = (booking: Booking) => {
    setSelectedBooking(booking)
    setShowCancelModal(true)
  }

  const handleCancelConfirm = async (bookingId: string, reason: string) => {
    setLoading(true)
    try {
      const validationError = validateBookingTransition('CANCELLED', reason)
      if (validationError) {
        showToast(validationError, 'error')
        return
      }
      await bookingsApi.cancelBooking(bookingId, reason)
      showToast('Booking cancelled successfully', 'success')
      // Update local state would go here
    } catch (error) {
      console.error('Failed to cancel booking:', error)
      showToast('Failed to cancel booking', 'error')
    } finally {
      setLoading(false)
    }
  }

  const filtered = useMemo(() => {
    return bookings.filter(booking => {
      const statusMatch =
        statusFilter === 'all' || booking.status === statusFilter
      const searchMatch =
        booking.bookingId.toLowerCase().includes(search.toLowerCase()) ||
        booking.customer.toLowerCase().includes(search.toLowerCase()) ||
        booking.destination.toLowerCase().includes(search.toLowerCase())
      return statusMatch && searchMatch
    })
  }, [search, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const rows = filtered.slice((page - 1) * pageSize, page * pageSize)

  return (
    <div className='space-y-4 sm:space-y-6'>
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
      <CreateBookingModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSave={handleCreateBooking}
      />

      <RecordPaymentModal
        isOpen={showPaymentModal}
        booking={selectedBooking}
        onClose={() => {
          setShowPaymentModal(false)
          setSelectedBooking(null)
        }}
        onSave={handlePaymentSubmit}
      />

      <GenerateInvoiceModal
        isOpen={showInvoiceModal}
        booking={selectedBooking}
        onClose={() => {
          setShowInvoiceModal(false)
          setSelectedBooking(null)
        }}
        onSave={handleInvoiceSubmit}
      />

      <CancelBookingModal
        isOpen={showCancelModal}
        booking={selectedBooking}
        onClose={() => {
          setShowCancelModal(false)
          setSelectedBooking(null)
        }}
        onConfirm={handleCancelConfirm}
      />

      {/* Header */}
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
        <div>
          <h1 className='text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100'>
            Bookings
          </h1>
          <p className='text-xs sm:text-sm text-gray-500 dark:text-gray-400'>
            Monitor confirmations, payments, and documents from one place.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className='inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-blue-700 w-full sm:w-auto'
        >
          <FaPlus className='mr-2' /> New Booking
        </button>
      </div>

      {/* KPI Cards */}
      <div className='grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4'>
        <SurfaceCard hoverable className='p-3 sm:p-5'>
          <div className='flex items-start justify-between'>
            <div className='min-w-0'>
              <p className='text-[10px] sm:text-xs uppercase tracking-wide text-gray-500 truncate'>
                Upcoming Trips
              </p>
              <p className='text-lg sm:text-2xl font-semibold text-gray-900 dark:text-gray-100 mt-1'>
                24
              </p>
              <p className='mt-1 text-xs text-green-600 flex items-center'>
                <FaArrowTrendUp className='mr-1 text-xs' /> 12% this week
              </p>
            </div>
            <FaCalendarDays className='text-blue-600 text-lg sm:text-xl flex-shrink-0' />
          </div>
        </SurfaceCard>
        <SurfaceCard hoverable className='p-3 sm:p-5'>
          <div className='flex items-start justify-between'>
            <div className='min-w-0'>
              <p className='text-[10px] sm:text-xs uppercase tracking-wide text-gray-500 truncate'>
                Unconfirmed
              </p>
              <p className='text-lg sm:text-2xl font-semibold text-gray-900 dark:text-gray-100 mt-1'>
                8
              </p>
              <p className='mt-1 text-xs text-amber-600 truncate'>
                Needs attention
              </p>
            </div>
            <FaTriangleExclamation className='text-amber-500 text-lg sm:text-xl flex-shrink-0' />
          </div>
        </SurfaceCard>
        <SurfaceCard hoverable className='p-3 sm:p-5'>
          <div className='flex items-start justify-between'>
            <div className='min-w-0'>
              <p className='text-[10px] sm:text-xs uppercase tracking-wide text-gray-500 truncate'>
                Pending Payments
              </p>
              <p className='text-lg sm:text-2xl font-semibold text-gray-900 dark:text-gray-100 mt-1'>
                $12.5k
              </p>
              <p className='mt-1 text-xs text-gray-500'>5 invoices</p>
            </div>
            <FaCreditCard className='text-red-500 text-lg sm:text-xl flex-shrink-0' />
          </div>
        </SurfaceCard>
      </div>

      {/* Main Card */}
      <SurfaceCard className='p-0 overflow-hidden border border-gray-200 dark:border-gray-800'>
        {error && (
          <div className='border-b border-gray-100 dark:border-gray-800 px-4 py-2'>
            <p className='text-xs sm:text-sm text-red-500'>{error}</p>
          </div>
        )}

        {/* Filters Section */}
        <div className='border-b border-gray-100 dark:border-gray-800 p-3 sm:p-4'>
          {/* Mobile: Search + Filter Button */}
          <div className='flex items-center gap-2 lg:hidden'>
            <div className='flex-1 relative'>
              <FaMagnifyingGlass className='absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400' />
              <input
                className='w-full pl-9 pr-4 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500'
                placeholder='Search bookings...'
                value={search}
                onChange={e => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
              />
            </div>
            <button
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              className={`p-2.5 rounded-xl border transition-colors ${
                showMobileFilters
                  ? 'bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-900/20 dark:border-blue-800'
                  : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
              }`}
            >
              <FaFilter />
            </button>
          </div>

          {/* Filters (Desktop always visible, Mobile toggleable) */}
          <div
            className={`${
              showMobileFilters ? 'block' : 'hidden'
            } lg:block mt-3 lg:mt-0`}
          >
            <div className='flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3'>
              {/* Status Filter and Search (Desktop) */}
              <div className='hidden lg:flex flex-col sm:flex-row gap-2'>
                <div className='relative w-full sm:w-80'>
                  <FaMagnifyingGlass className='pointer-events-none absolute left-3 top-3 text-xs text-gray-400' />
                  <input
                    className='field-input pl-9'
                    placeholder='Search booking, customer, destination'
                    value={search}
                    onChange={e => {
                      setSearch(e.target.value)
                      setPage(1)
                    }}
                  />
                </div>
                <select
                  className='field-input w-full sm:w-44'
                  value={statusFilter}
                  onChange={e => {
                    setStatusFilter(e.target.value as 'all' | BookingStatus)
                    setPage(1)
                  }}
                >
                  <option value='all'>All Statuses</option>
                  <option value='confirmed'>Confirmed</option>
                  <option value='pending'>Pending</option>
                  <option value='cancelled'>Cancelled</option>
                </select>
              </div>

              {/* Mobile Status Filter */}
              <div className='lg:hidden w-full'>
                <select
                  className='w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500'
                  value={statusFilter}
                  onChange={e => {
                    setStatusFilter(e.target.value as 'all' | BookingStatus)
                    setPage(1)
                    setShowMobileFilters(false)
                  }}
                >
                  <option value='all'>All Statuses</option>
                  <option value='confirmed'>Confirmed</option>
                  <option value='pending'>Pending</option>
                  <option value='cancelled'>Cancelled</option>
                </select>
              </div>

              {/* Export Button */}
              <button className='inline-flex items-center rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors'>
                <FaDownload className='mr-2' /> Export
              </button>

              {/* Close filter button on mobile */}
              {showMobileFilters && (
                <button
                  onClick={() => setShowMobileFilters(false)}
                  className='lg:hidden p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400'
                >
                  <FaXmark />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Bookings List */}
        {rows.length === 0 ? (
          <div className='p-8'>
            <EmptyState
              title='No bookings found'
              description='Try changing search or filters.'
              icon={<FaCalendarDays className='text-4xl' />}
            />
          </div>
        ) : (
          <>
            {/* Mobile View - Cards */}
            <div className='block lg:hidden divide-y divide-gray-100 dark:divide-gray-800'>
              {rows.map((booking, index) => (
                <div
                  key={booking.id}
                  className={`p-4 space-y-3 hover:bg-blue-50/40 dark:hover:bg-gray-800/50 transition-colors ${
                    index !== rows.length - 1
                      ? 'border-b border-gray-100 dark:border-gray-800'
                      : ''
                  }`}
                >
                  {/* Header with Booking ID and Status */}
                  <div className='flex items-start justify-between'>
                    <div className='space-y-1'>
                      <p className='text-sm font-medium text-blue-600 dark:text-blue-400'>
                        #{booking.bookingId}
                      </p>
                      <p className='text-xs text-gray-500'>
                        {booking.customer}
                      </p>
                    </div>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${
                        statusClasses[booking.status]
                      }`}
                    >
                      {booking.status}
                    </span>
                  </div>

                  {/* Destination and Dates */}
                  <div className='space-y-1'>
                    <p className='text-sm font-medium text-gray-900 dark:text-gray-100'>
                      {booking.destination}
                    </p>
                    <p className='text-xs text-gray-500'>{booking.dates}</p>
                  </div>

                  {/* Payment Info */}
                  <div className='flex items-center justify-between'>
                    <div>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${
                          paymentClasses[booking.payment]
                        }`}
                      >
                        {booking.payment}
                      </span>
                      <p className='text-xs text-gray-500 mt-1'>
                        ${booking.paid.toLocaleString()} / $
                        {booking.total.toLocaleString()}
                      </p>
                    </div>
                    <p className='text-xs text-gray-600 dark:text-gray-300'>
                      {booking.documentsReady}/{booking.documentsTotal} docs
                    </p>
                  </div>

                  {/* Actions */}
                  <div className='flex justify-end gap-2 pt-2'>
                    <button
                      className='p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors'
                      onClick={() => navigate(`/bookings/${booking.id}`)}
                      title='View'
                    >
                      <FaEye className='text-sm' />
                    </button>
                    <button
                      className='p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors'
                      onClick={() => {
                        setSelectedBooking(booking)
                        setShowInvoiceModal(true)
                      }}
                      title='Generate Invoice'
                    >
                      <FaFileInvoiceDollar className='text-sm' />
                    </button>
                    <button
                      onClick={() => handleSendConfirmation(booking.id)}
                      className='p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors'
                      title='Send Confirmation'
                    >
                      <FaPaperPlane className='text-sm' />
                    </button>
                    <button
                      onClick={() => handleCancelBooking(booking)}
                      className='p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors'
                      title='Cancel Booking'
                    >
                      <FaXmark className='text-sm' />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop View - Table */}
            <div className='hidden lg:block overflow-x-auto'>
              <table className='min-w-[980px] w-full divide-y divide-gray-200 dark:divide-gray-800'>
                <thead className='sticky top-0 z-10 bg-gray-50 dark:bg-gray-800/95'>
                  <tr>
                    <th className='px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500'>
                      Booking ID
                    </th>
                    <th className='px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500'>
                      Customer
                    </th>
                    <th className='px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500'>
                      Dates
                    </th>
                    <th className='px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500'>
                      Status
                    </th>
                    <th className='px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500'>
                      Payment
                    </th>
                    <th className='px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500'>
                      Docs
                    </th>
                    <th className='px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500'>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-gray-100 dark:divide-gray-800'>
                  {rows.map(booking => (
                    <tr
                      key={booking.id}
                      className='group transition-all duration-200 hover:bg-blue-50/30 dark:hover:bg-gray-800/40'
                    >
                      <td className='px-5 py-4 text-sm font-medium text-blue-600 dark:text-blue-300'>
                        #{booking.bookingId}
                      </td>
                      <td className='px-5 py-4'>
                        <p className='text-sm font-medium text-gray-900 dark:text-gray-100'>
                          {booking.customer}
                        </p>
                        <p className='text-xs text-gray-500'>
                          {booking.destination}
                        </p>
                      </td>
                      <td className='px-5 py-4 text-sm text-gray-700 dark:text-gray-200'>
                        {booking.dates}
                      </td>
                      <td className='px-5 py-4'>
                        <span
                          className={`rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${
                            statusClasses[booking.status]
                          }`}
                        >
                          {booking.status}
                        </span>
                      </td>
                      <td className='px-5 py-4'>
                        <div className='flex items-center gap-2'>
                          <span
                            className={`rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${
                              paymentClasses[booking.payment]
                            }`}
                          >
                            {booking.payment}
                          </span>
                          {(booking.payment === 'partial' ||
                            booking.payment === 'unpaid') && (
                            <button
                              onClick={() => handleRecordPayment(booking)}
                              className='text-xs text-blue-600 hover:text-blue-800 underline'
                              title='Record Payment'
                            >
                              +Pay
                            </button>
                          )}
                        </div>
                        <p className='mt-1 text-xs text-gray-500'>
                          ${booking.paid.toLocaleString()} / $
                          {booking.total.toLocaleString()}
                        </p>
                        <div className='mt-1 w-full bg-gray-200 rounded-full h-1.5'>
                          <div
                            className='bg-green-600 h-1.5 rounded-full'
                            style={{
                              width: `${(booking.paid / booking.total) * 100}%`
                            }}
                          />
                        </div>
                      </td>
                      <td className='px-5 py-4'>
                        <div className='flex items-center gap-2'>
                          <span
                            className={`text-xs ${
                              booking.documentsReady === booking.documentsTotal
                                ? 'text-green-600'
                                : 'text-amber-600'
                            }`}
                          >
                            {booking.documentsReady}/{booking.documentsTotal}{' '}
                            ready
                          </span>
                          <button
                            onClick={() =>
                              navigate(`/bookings/${booking.id}/documents`)
                            }
                            className='text-xs text-blue-600 hover:text-blue-800 underline'
                            title='View Documents'
                          >
                            View
                          </button>
                        </div>
                        {booking.documentsReady < booking.documentsTotal && (
                          <p className='text-xs text-red-500 mt-1'>
                            Missing{' '}
                            {booking.documentsTotal - booking.documentsReady}{' '}
                            docs
                          </p>
                        )}
                      </td>
                      <td className='px-5 py-4'>
                        <div className='flex justify-end gap-1 transition-all duration-200'>
                          <button
                            className='rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800'
                            onClick={() => navigate(`/bookings/${booking.id}`)}
                            title='View Details'
                          >
                            <FaEye />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedBooking(booking)
                              setShowInvoiceModal(true)
                            }}
                            disabled={loading}
                            className='rounded-lg border border-gray-200 p-2 text-blue-600 hover:bg-blue-50 dark:border-gray-700 dark:hover:bg-blue-900/20 disabled:opacity-50'
                            title='Generate Invoice'
                          >
                            <FaFileInvoiceDollar />
                          </button>
                          <button
                            onClick={() => handleSendConfirmation(booking.id)}
                            disabled={loading}
                            className='rounded-lg border border-gray-200 p-2 text-green-600 hover:bg-green-50 dark:border-gray-700 dark:hover:bg-green-900/20 disabled:opacity-50'
                            title='Send Confirmation'
                          >
                            <FaPaperPlane />
                          </button>
                          <button
                            onClick={() => handleCancelBooking(booking)}
                            className='rounded-lg border border-gray-200 p-2 text-red-600 hover:bg-red-50 dark:border-gray-700 dark:hover:bg-red-900/20'
                            title='Cancel Booking'
                          >
                            <FaXmark />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className='flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-4 border-t border-gray-200 dark:border-gray-800'>
              <p className='text-xs sm:text-sm text-gray-500 dark:text-gray-400 order-2 sm:order-1'>
                Showing {Math.min(filtered.length, (page - 1) * pageSize + 1)}-
                {Math.min(filtered.length, page * pageSize)} of{' '}
                {filtered.length}
              </p>
              <div className='flex items-center gap-2 order-1 sm:order-2'>
                <button
                  onClick={() => setPage(prev => Math.max(1, prev - 1))}
                  disabled={page === 1}
                  className='p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors'
                >
                  <FaChevronLeft className='text-sm' />
                </button>
                <span className='px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-sm font-medium min-w-[40px] text-center'>
                  {page}
                </span>
                <button
                  onClick={() =>
                    setPage(prev => Math.min(totalPages, prev + 1))
                  }
                  disabled={page === totalPages}
                  className='p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors'
                >
                  <FaChevronRight className='text-sm' />
                </button>
              </div>
            </div>
          </>
        )}
      </SurfaceCard>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
      `}</style>
    </div>
  )
}

export default BookingsPage
