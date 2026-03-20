import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
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
  FaFilter,
  FaXmark,
  FaCircleCheck,
  FaCircleExclamation,
  FaClock
  // FaUser,
  // FaGlobe,
  // FaDollarSign,
  // FaFilePdf
} from 'react-icons/fa6'
import SurfaceCard from '../../components/ui/SurfaceCard'
import EmptyState from '../../components/ui/EmptyState'
import { validateBookingTransition } from '../../utils/workflowValidation'
import { useBookingsService } from '../../hooks/useBookingsService'
import { quotationsApi } from '../../api/quotations'
import { leadsApi } from '../../api/leads'
import { getApiErrorMessage } from '../../api/apiClient'

type BookingStatus = 'confirmed' | 'pending' | 'cancelled'
type PaymentStatus = 'partial' | 'unpaid' | 'paid' | 'refunded'

interface Booking {
  id: string
  bookingId: string
  customer: string
  destination: string
  dates: string
  startDate?: string
  endDate?: string
  status: BookingStatus
  payment: PaymentStatus
  paid: number
  total: number
  documentsReady: number
  documentsTotal: number
}

interface NewBookingData {
  quotationId: string
  customer: string
  email: string
  phone: string
  destination: string
  travelStart: string
  travelEnd: string
  totalAmount: number
  costAmount: number
  advanceRequired: number
  notes?: string
}

type QuoteOption = {
  id: string
  label: string
  value: string
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

type BookingLookups = {
  quotationById: Record<string, any>
  leadById: Record<string, any>
  destinationById: Record<string, string>
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

const getDefaultInvoiceDueDate = () => {
  const dueDate = new Date()
  dueDate.setDate(dueDate.getDate() + 7)
  return dueDate.toISOString().split('T')[0]
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
  const isUuid = (value?: string) =>
    Boolean(
      value &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          value
        )
    )
  const [quotationOptions, setQuotationOptions] = useState<QuoteOption[]>([])
  const [quotationLoading, setQuotationLoading] = useState(false)
  const [quotationAutofillLoading, setQuotationAutofillLoading] =
    useState(false)
  const [quotationError, setQuotationError] = useState('')
  const [selectedQuotationId, setSelectedQuotationId] = useState('')
  const [formData, setFormData] = useState<NewBookingData>({
    quotationId: '',
    customer: '',
    email: '',
    phone: '',
    destination: '',
    travelStart: '',
    travelEnd: '',
    totalAmount: 0,
    costAmount: 0,
    advanceRequired: 0,
    notes: ''
  })
  const [errors, setErrors] = useState<
    Partial<Record<keyof NewBookingData, string>>
  >({})

  const toInputDate = (value?: string) => {
    if (!value) return ''
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return ''
    return parsed.toISOString().split('T')[0]
  }

  const loadQuotations = async () => {
    setQuotationLoading(true)
    setQuotationError('')
    try {
      const res = await quotationsApi.list({ page: 1, limit: 50 })
      const raw =
        (res as any)?.data?.data ??
        (res as any)?.data?.items ??
        (res as any)?.data ??
        res ??
        []
      const options: QuoteOption[] = (Array.isArray(raw) ? raw : [])
        .map((q: any) => {
          const id = String(
            q.id ?? q.quotationId ?? q.quotation_id ?? q.code ?? ''
          )
          if (!id) return null
          const quoteNumber =
            q.quoteNumber ?? q.quotationNumber ?? q.code ?? `Quote ${id}`
          const customer =
            q.customerName ??
            q.customer ??
            q.clientName ??
            q.lead?.name ??
            ''
          const label = customer
            ? `${quoteNumber} - ${customer}`
            : quoteNumber
          return { id, value: id, label }
        })
        .filter(Boolean) as QuoteOption[]
      setQuotationOptions(options)
    } catch (error) {
      console.error('Failed to load quotations:', error)
      setQuotationError(getApiErrorMessage(error, 'Failed to load quotations'))
      setQuotationOptions([])
    } finally {
      setQuotationLoading(false)
    }
  }

  const applyQuotationToForm = (quote: any) => {
    if (!quote) return
    const lead =
      quote.lead ??
      quote.leadSnapshot ??
      quote.templateSnapshot?.lead ??
      quote.customerSnapshot ??
      quote.client ??
      quote.customer ??
      {}
    const customer =
      lead?.name ??
      lead?.fullName ??
      quote.customer?.name ??
      quote.customerSnapshot?.name ??
      quote.customerName ??
      quote.clientName ??
      quote.customer ??
      formData.customer
    const email =
      lead?.email ??
      lead?.primaryEmail ??
      quote.customer?.email ??
      quote.customerSnapshot?.email ??
      quote.email ??
      quote.customerEmail ??
      quote.clientEmail ??
      formData.email
    const phone =
      lead?.phone ??
      lead?.mobile ??
      lead?.whatsapp ??
      quote.customer?.phone ??
      quote.customerSnapshot?.phone ??
      quote.phone ??
      quote.customerPhone ??
      quote.clientPhone ??
      formData.phone
    const destination =
      quote.destination?.name ??
      quote.destinationName ??
      quote.destination ??
      quote.tripDestination ??
      quote.templateSnapshot?.destination ??
      lead?.destination ??
      formData.destination
    const travelStart =
      quote.travelStartDate ??
      quote.travelStart ??
      quote.tripStartDate ??
      quote.startDate ??
      quote.templateSnapshot?.travelStartDate
    const travelEnd =
      quote.travelEndDate ??
      quote.travelEnd ??
      quote.tripEndDate ??
      quote.endDate ??
      quote.templateSnapshot?.travelEndDate
    const totalAmountRaw =
      quote.finalPrice ??
      quote.totalSaleValue ??
      quote.totalCost ??
      quote.totalAmount ??
      quote.pricing?.total ??
      quote.pricing?.finalPrice
    const totalAmount =
      totalAmountRaw !== undefined
        ? Number(totalAmountRaw) || 0
        : formData.totalAmount
    const costAmountRaw =
      quote.totalCost ??
      quote.costAmount ??
      quote.supplierCost ??
      quote.cost ??
      quote.totalAmount ??
      quote.pricing?.cost ??
      quote.pricing?.supplierCost
    const costAmount =
      costAmountRaw !== undefined
        ? Number(costAmountRaw) || 0
        : formData.costAmount
    const advanceRequiredRaw =
      quote.advanceRequired ?? quote.advance_required ?? quote.advanceAmount
    const advanceRequired =
      advanceRequiredRaw !== undefined
        ? Number(advanceRequiredRaw) || 0
        : formData.advanceRequired

    setFormData(prev => ({
      ...prev,
      customer: customer ?? prev.customer,
      email: email ?? prev.email,
      phone: phone ?? prev.phone,
      destination: destination ?? prev.destination,
      travelStart: toInputDate(travelStart) || prev.travelStart,
      travelEnd: toInputDate(travelEnd) || prev.travelEnd,
      totalAmount,
      costAmount,
      advanceRequired
    }))
  }

  useEffect(() => {
    if (!isOpen) return
    void loadQuotations()
  }, [isOpen])

  const handleQuotationChange = async (quotationId: string) => {
    setSelectedQuotationId(quotationId)
    setFormData(prev => ({ ...prev, quotationId }))
    if (!quotationId) return
    setQuotationAutofillLoading(true)
    try {
      const res = await quotationsApi.getById(quotationId)
      const quote =
        (res as any)?.data?.data ?? (res as any)?.data ?? res ?? null
      const resolvedId = String(
        quote?.id ??
          quote?.quotationId ??
          quote?.quotation_id ??
          quotationId ??
          ''
      )
      if (isUuid(resolvedId)) {
        setFormData(prev => ({ ...prev, quotationId: resolvedId }))
        setQuotationError('')
      } else {
        setQuotationError('Selected quotation has no valid UUID')
      }
      applyQuotationToForm(quote)

      const leadId =
        quote?.leadId ??
        quote?.lead_id ??
        quote?.lead?.id ??
        quote?.leadSnapshot?.id ??
        quote?.leadSnapshot?.leadId ??
        null

      if (leadId) {
        try {
          const leadRes = await leadsApi.getById(String(leadId))
          const lead =
            (leadRes as any)?.data?.data ??
            (leadRes as any)?.data ??
            leadRes ??
            null
          const isBlank = (value?: string) =>
            !value || value === 'N/A' || value === 'NA'
          if (lead) {
            setFormData(prev => ({
              ...prev,
              customer:
                isBlank(prev.customer)
                  ? lead.name ?? lead.fullName ?? prev.customer
                  : prev.customer,
              email:
                isBlank(prev.email)
                  ? lead.email ?? lead.primaryEmail ?? prev.email
                  : prev.email,
              phone:
                isBlank(prev.phone)
                  ? lead.phone ?? lead.mobile ?? lead.whatsapp ?? prev.phone
                  : prev.phone,
              destination:
                isBlank(prev.destination)
                  ? lead.destination ?? prev.destination
                  : prev.destination
            }))
          }
        } catch (leadError) {
          console.error('Failed to load lead for quotation:', leadError)
        }
      }
    } catch (error) {
      console.error('Failed to load quotation:', error)
      setQuotationError(
        getApiErrorMessage(error, 'Failed to load quotation details')
      )
    } finally {
      setQuotationAutofillLoading(false)
    }
  }

  if (!isOpen) return null

  const validate = () => {
    const newErrors: Partial<Record<keyof NewBookingData, string>> = {}
    if (!formData.quotationId)
      newErrors.quotationId = 'Quotation is required'
    if (formData.quotationId && !isUuid(formData.quotationId)) {
      newErrors.quotationId = 'Please select a valid quotation'
    }
    if (!formData.customer) newErrors.customer = 'Customer name is required'
    if (!formData.destination) newErrors.destination = 'Destination is required'
    if (!formData.travelStart)
      newErrors.travelStart = 'Travel start date is required'
    if (!formData.travelEnd) newErrors.travelEnd = 'Travel end date is required'
    if (formData.totalAmount <= 0)
      newErrors.totalAmount = 'Total amount must be greater than 0'
    if (formData.costAmount < 0)
      newErrors.costAmount = 'Cost amount must be 0 or greater'
    if (formData.costAmount > formData.totalAmount) {
      newErrors.costAmount = 'Cost amount cannot exceed total amount'
    }

    if (formData.travelStart && formData.travelEnd) {
      if (formData.travelEnd < formData.travelStart) {
        newErrors.travelEnd = 'Travel end must be after travel start'
      }
    }

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
        quotationId: '',
        customer: '',
        email: '',
        phone: '',
        destination: '',
        travelStart: '',
        travelEnd: '',
        totalAmount: 0,
        costAmount: 0,
        advanceRequired: 0,
        notes: ''
      })
      setSelectedQuotationId('')
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
          {/* Quotation Selector */}
          <div>
            <label className='field-label'>Quotation ID</label>
            <select
              value={selectedQuotationId}
              onChange={e => handleQuotationChange(e.target.value)}
              className={`field-input ${
                errors.quotationId ? 'border-red-500' : ''
              }`}
              disabled={quotationLoading}
            >
              <option value=''>
                {quotationLoading ? 'Loading quotations...' : 'Select quotation'}
              </option>
              {quotationOptions.map(option => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
            {quotationError && (
              <p className='text-xs text-red-500 mt-1'>{quotationError}</p>
            )}
            {errors.quotationId && (
              <p className='text-xs text-red-500 mt-1'>{errors.quotationId}</p>
            )}
            {quotationAutofillLoading && (
              <p className='text-xs text-gray-500 mt-1'>Autofilling details...</p>
            )}
          </div>

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
              <label className='field-label'>Cost Amount ($) *</label>
              <input
                type='number'
                value={formData.costAmount || ''}
                onChange={e =>
                  setFormData({
                    ...formData,
                    costAmount: parseFloat(e.target.value) || 0
                  })
                }
                className={`field-input ${
                  errors.costAmount ? 'border-red-500' : ''
                }`}
                placeholder='0.00'
                min='0'
                step='0.01'
              />
              {errors.costAmount && (
                <p className='text-xs text-red-500 mt-1'>
                  {errors.costAmount}
                </p>
              )}
            </div>
          </div>

          <div className='grid grid-cols-2 gap-4'>
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
    dueDate: getDefaultInvoiceDueDate(),
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
  const bookingsService = useBookingsService()
  const navigate = useNavigate()
  const location = useLocation()
  const [statusFilter, setStatusFilter] = useState<'all' | BookingStatus>('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [error, setError] = useState('')
  const [showMobileFilters, setShowMobileFilters] = useState(false)
  const [loading, setLoading] = useState(false)
  const [bookingItems, setBookingItems] = useState<Booking[]>([])
  const [stats, setStats] = useState({
    totalBookings: 0,
    activeBookings: 0,
    pendingBookings: 0,
    completedBookings: 0,
    cancelledBookings: 0,
    totalRevenue: 0,
    pendingPaymentsAmount: 0,
    pendingPaymentsCount: 0
  })
  const [statsLoading, setStatsLoading] = useState(false)
  const [statsError, setStatsError] = useState('')
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

  const normalizeStatus = (value?: string): BookingStatus => {
    switch ((value ?? '').toUpperCase()) {
      case 'CONFIRMED':
        return 'confirmed'
      case 'CANCELLED':
      case 'CANCELED':
        return 'cancelled'
      case 'PENDING':
      default:
        return 'pending'
    }
  }

  const normalizePayment = (value?: string): PaymentStatus => {
    switch ((value ?? '').toUpperCase()) {
      case 'PAID':
        return 'paid'
      case 'PARTIAL':
        return 'partial'
      case 'REFUNDED':
        return 'refunded'
      case 'UNPAID':
      default:
        return 'unpaid'
    }
  }

  const formatDateRange = (start?: string, end?: string, fallback?: string) => {
    if (!start && !end) return fallback ?? '—'
    const startLabel = start ? new Date(start).toLocaleDateString() : '—'
    const endLabel = end ? new Date(end).toLocaleDateString() : '—'
    return `${startLabel} - ${endLabel}`
  }


  const mapBooking = (
    b: any,
    idx: number,
    lookups?: BookingLookups
  ): Booking => {
    const quotationId = String(
      b.quotationId ?? b.quotation_id ?? b.quoteId ?? b.quote_id ?? ''
    )
    const quotation = quotationId ? lookups?.quotationById?.[quotationId] : null
    const leadId = String(
      b.leadId ??
        b.lead_id ??
        quotation?.leadId ??
        quotation?.lead_id ??
        quotation?.lead?.id ??
        ''
    )
    const lead = leadId ? lookups?.leadById?.[leadId] : null
    const destinationId = String(
      lead?.destinationId ?? lead?.destination_id ?? ''
    )
    const destinationName = destinationId
      ? lookups?.destinationById?.[destinationId]
      : undefined

    return {
      id: String(b.id ?? idx),
      bookingId: b.bookingId ?? b.bookingNumber ?? b.code ?? `BK-${idx + 1}`,
      customer:
        b.customer ??
        b.customerName ??
        b.clientName ??
        lead?.fullName ??
        lead?.name ??
        'Unknown',
      destination:
        b.destination ??
        b.tripDestination ??
        destinationName ??
        lead?.destination ??
        'N/A',
      dates: formatDateRange(
        b.travelStartDate ?? b.travelStart,
        b.travelEndDate ?? b.travelEnd,
        b.dates
      ),
      startDate: b.travelStartDate ?? b.travelStart,
      endDate: b.travelEndDate ?? b.travelEnd,
      status: normalizeStatus(b.status),
      payment: normalizePayment(b.paymentStatus ?? b.payment_status),
      paid: Number(b.paid ?? b.paidAmount ?? b.advanceReceived ?? 0),
      total: Number(b.total ?? b.totalAmount ?? 0),
      documentsReady: Number(b.documentsReady ?? b.documents?.ready ?? 0),
      documentsTotal: Number(b.documentsTotal ?? b.documents?.total ?? 0)
    }
  }

  const calculateStats = (items: Booking[]) => {
    const totalBookings = items.length
    const activeBookings = items.filter(item => item.status === 'confirmed').length
    const pendingBookings = items.filter(item => item.status === 'pending').length
    const cancelledBookings = items.filter(item => item.status === 'cancelled').length
    const nonCancelled = items.filter(item => item.status !== 'cancelled')
    const pendingPayments = nonCancelled.filter(item => item.paid < item.total)
    const pendingPaymentsAmount = pendingPayments.reduce(
      (sum, item) => sum + Math.max(item.total - item.paid, 0),
      0
    )

    return {
      totalBookings,
      activeBookings,
      pendingBookings,
      completedBookings: 0,
      cancelledBookings,
      totalRevenue: nonCancelled.reduce((sum, item) => sum + item.total, 0),
      pendingPaymentsAmount,
      pendingPaymentsCount: pendingPayments.length
    }
  }

  useEffect(() => {
    const updatedBooking = (location.state as any)?.updatedBooking
    if (!updatedBooking) return
    const mapped = mapBooking(updatedBooking, 0)
    setBookingItems(prev => {
      const index = prev.findIndex(
        item => item.id === mapped.id || item.bookingId === mapped.bookingId
      )
      if (index == -1) {
        return [mapped, ...prev]
      }
      const next = [...prev]
      next[index] = { ...next[index], ...mapped }
      return next
    })
    navigate('/bookings', { replace: true })
  }, [location.state, navigate])

  const fetchBookings = useCallback(async () => {
    setLoading(true)
    setStatsLoading(true)
    setError('')
    setStatsError('')
    try {
      const unwrapList = (response: any) => {
        const payload =
          response?.data?.data ??
          response?.data?.items ??
          response?.data ??
          response ??
          []
        return Array.isArray(payload) ? payload : []
      }

      const params: Record<string, string | number | boolean> = {
        page: 1,
        limit: 20
      }
      if (statusFilter !== 'all') {
        params.status = statusFilter.toUpperCase()
      }
      const res = await bookingsService.list(params)
      const raw =
        (res as any)?.data?.data ??
        (res as any)?.data?.items ??
        (res as any)?.data ??
        res ??
        []
      const bookingRows = Array.isArray(raw) ? raw : []
      const lookups: BookingLookups = {
        quotationById: {},
        leadById: {},
        destinationById: {},
      }

      const quotationIds = Array.from(
        new Set(
          bookingRows
            .map((row: any) =>
              String(
                row?.quotationId ??
                  row?.quotation_id ??
                  row?.quoteId ??
                  row?.quote_id ??
                  ''
              )
            )
            .filter(Boolean)
        )
      )

      if (quotationIds.length) {
        try {
          const quotationsRes = await quotationsApi.list({ page: 1, limit: 500 })
          const quotationRows = unwrapList(quotationsRes)
          quotationRows.forEach((quote: any) => {
            const quoteId = String(
              quote?.id ?? quote?.quotationId ?? quote?.quotation_id ?? ''
            )
            if (quoteId) {
              lookups.quotationById[quoteId] = quote
            }
          })
        } catch (_error) {
          lookups.quotationById = {}
        }
      }

      const leadIds = Array.from(
        new Set(
          bookingRows
            .map((row: any) =>
              String(row?.leadId ?? row?.lead_id ?? '')
            )
            .concat(
              Object.values(lookups.quotationById).map((quote: any) =>
                String(
                  quote?.leadId ??
                    quote?.lead_id ??
                    quote?.lead?.id ??
                    quote?.leadSnapshot?.id ??
                    ''
                )
              )
            )
            .filter(Boolean)
        )
      )

      if (leadIds.length) {
        try {
          const leadsRes = await leadsApi.list({ page: 1, limit: 500 })
          const leadRows = unwrapList(leadsRes)
          leadRows.forEach((lead: any) => {
            const leadId = String(lead?.id ?? lead?.leadId ?? lead?.lead_id ?? '')
            if (leadId) {
              lookups.leadById[leadId] = lead
            }
          })
        } catch (_error) {
          lookups.leadById = {}
        }
      }

      try {
        const destinationsRes = await leadsApi.getDestinations()
        const destinationRows = unwrapList(destinationsRes)
        destinationRows.forEach((destination: any) => {
          const destinationId = String(destination?.id ?? '')
          const destinationName = String(
            destination?.name ?? destination?.label ?? ''
          )
          if (destinationId && destinationName) {
            lookups.destinationById[destinationId] = destinationName
          }
        })
      } catch (_error) {
        lookups.destinationById = {}
      }

      const mapped: Booking[] = bookingRows.map((b: any, idx: number) =>
        mapBooking(b, idx, lookups)
      )
      setBookingItems(mapped)
      setStats(calculateStats(mapped))
    } catch (err) {
      console.error('Failed to load bookings:', err)
      setError(getApiErrorMessage(err, 'Failed to load bookings'))
      setStatsError(getApiErrorMessage(err, 'Failed to load booking stats'))
      setBookingItems([])
    } finally {
      setLoading(false)
      setStatsLoading(false)
    }
  }, [bookingsService, statusFilter])

  useEffect(() => {
    void fetchBookings()
  }, [fetchBookings])

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToast({ show: true, message, type })
    setTimeout(
      () => setToast({ show: false, message: '', type: 'success' }),
      3000
    )
  }

  const handleSendConfirmation = async (bookingId: string) => {
    setLoading(true)
    try {
      await bookingsService.sendConfirmation(bookingId)
      await fetchBookings()
      showToast('Booking confirmed successfully', 'success')
    } catch (error) {
      console.error('Failed to send confirmation:', error)
      showToast(
        getApiErrorMessage(error, 'Failed to confirm booking'),
        'error'
      )
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
      await bookingsService.recordPayment(bookingId, paymentData)
      await fetchBookings()
      showToast('Payment recorded successfully', 'success')
    } catch (error) {
      console.error('Failed to record payment:', error)
      showToast(getApiErrorMessage(error, 'Failed to record payment'), 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleInvoiceSubmit = async (bookingId: string) => {
    setLoading(true)
    try {
      await bookingsService.generateInvoice(bookingId)
      showToast('Invoice generated successfully', 'success')
    } catch (error) {
      console.error('Failed to generate invoice:', error)
      showToast(
        getApiErrorMessage(error, 'Failed to generate invoice'),
        'error'
      )
    } finally {
      setLoading(false)
    }
  }

  const handleCreateBooking = async (data: NewBookingData) => {
    setLoading(true)
    try {
      const res = await bookingsService.create({
        quotationId: data.quotationId,
        travelStartDate: data.travelStart,
        travelEndDate: data.travelEnd,
        totalAmount: data.totalAmount,
        costAmount: data.costAmount,
        advanceRequired: data.advanceRequired
      })
      showToast('Booking created successfully', 'success')
      setShowCreateModal(false)
      const payload =
        (res as any)?.data?.data ?? (res as any)?.data ?? res ?? null
      if (payload) {
        const merged = {
          ...payload,
          customer: payload.customer ?? data.customer,
          email: payload.email ?? data.email,
          phone: payload.phone ?? data.phone,
          destination: payload.destination ?? data.destination,
          travelStartDate: payload.travelStartDate ?? data.travelStart,
          travelEndDate: payload.travelEndDate ?? data.travelEnd,
          totalAmount: payload.totalAmount ?? data.totalAmount,
          costAmount: payload.costAmount ?? data.costAmount,
          advanceRequired: payload.advanceRequired ?? data.advanceRequired
        }
        const mapped = mapBooking(merged, 0)
        setBookingItems(prev => [mapped, ...prev])
      } else {
        await fetchBookings()
      }
    } catch (error) {
      console.error('Failed to create booking:', error)
      showToast(getApiErrorMessage(error, 'Failed to create booking'), 'error')
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
      await bookingsService.cancel(bookingId, reason)
      setBookingItems(prev => {
        const next = prev.map(booking =>
          booking.id === bookingId || booking.bookingId === bookingId
            ? { ...booking, status: 'cancelled' }
            : booking
        )
        setStats(calculateStats(next))
        return next
      })
      showToast('Booking cancelled successfully', 'success')
    } catch (error) {
      console.error('Failed to cancel booking:', error)
      showToast(getApiErrorMessage(error, 'Failed to cancel booking'), 'error')
    } finally {
      setLoading(false)
    }
  }

  const filtered = useMemo(() => {
    return bookingItems.filter(booking => {
      const statusMatch =
        statusFilter === 'all' || booking.status === statusFilter
      const searchMatch =
        booking.bookingId.toLowerCase().includes(search.toLowerCase()) ||
        booking.customer.toLowerCase().includes(search.toLowerCase()) ||
        booking.destination.toLowerCase().includes(search.toLowerCase())
      return statusMatch && searchMatch
    })
  }, [search, statusFilter, bookingItems])

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
                {statsLoading ? (
                  <span className='inline-block h-6 w-16 rounded bg-gray-200 animate-pulse' />
                ) : (
                  stats.activeBookings
                )}
              </p>
              <p className='mt-1 text-xs text-green-600 flex items-center'>
                <FaArrowTrendUp className='mr-1 text-xs' /> From bookings
              </p>
              {statsError && (
                <p className='mt-1 text-xs text-red-500'>{statsError}</p>
              )}
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
                {statsLoading ? (
                  <span className='inline-block h-6 w-16 rounded bg-gray-200 animate-pulse' />
                ) : (
                  stats.pendingBookings
                )}
              </p>
              <p className='mt-1 text-xs text-amber-600 truncate'>
                Pending confirmation
              </p>
              {statsError && (
                <p className='mt-1 text-xs text-red-500'>{statsError}</p>
              )}
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
                {statsLoading ? (
                  <span className='inline-block h-6 w-20 rounded bg-gray-200 animate-pulse' />
                ) : (
                  `$${stats.pendingPaymentsAmount.toLocaleString()}`
                )}
              </p>
              <p className='mt-1 text-xs text-gray-500'>
                {statsLoading ? 'Loading...' : `${stats.pendingPaymentsCount} bookings`}
              </p>
              {statsError && (
                <p className='mt-1 text-xs text-red-500'>{statsError}</p>
              )}
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
                  <option value='all'>All Status</option>
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
        {loading ? (
          <div className='p-8 text-center text-sm text-gray-500 dark:text-gray-400'>
            Loading bookings...
          </div>
        ) : rows.length === 0 ? (
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
