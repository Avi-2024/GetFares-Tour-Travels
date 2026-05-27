import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  FaBuilding,
  FaUser,
  FaCreditCard,
  FaPlus,
  FaTrash,
  FaSearch,
  FaChevronLeft,
  FaChevronRight,
  FaBars,
  FaDownload
} from 'react-icons/fa'
import { FaXmark, FaPenToSquare, FaPercent, FaRotate } from 'react-icons/fa6'
import SurfaceCard from '../../components/ui/SurfaceCard'
import EmptyState from '../../components/ui/EmptyState'
import SearchableDropdown from '../../components/ui/SearchableDropdown'
import SupplierServiceBreakdown from './SupplierServiceBreakdown'
import { customersApi } from '../../api/customers'
import { suppliersApi } from '../../api/suppliers'
import { paymentsApi } from '../../api/payments'
import { bookingsApi } from '../../api/bookings'
import { reportsApi } from '../../api/reports'
import { reportApiError } from '../../lib/notify'

// Types
interface Client {
  id: string
  pan: string
  address: string
  email: string
  phone: string
  name?: string
  currency: string
  leadId?: string
  leadCode?: string
  nationality?: string
  country?: string
  travelDate?: string
  destination?: string
  adultsCount?: number
  childrenCount?: number
  budget?: number
  travelPurpose?: string
  source?: string
}

interface Supplier {
  id: string
  pan: string
  gst?: string
  address: string
  email: string
  phone: string
  name?: string
  contactPerson?: string
  country?: string
  invoiceBeneficiaryName?: string
  invoiceBankName?: string
  invoiceAccountNumber?: string
  invoiceIfscSwift?: string
  invoiceUpiId?: string
  invoiceDetails: string
  currency: string
  isActive?: boolean
}

const isSupplierBankingReady = (s: Supplier): boolean => {
  const upi = s.invoiceUpiId?.trim()
  if (upi) return true
  return Boolean(
    s.invoiceBeneficiaryName?.trim() &&
      s.invoiceBankName?.trim() &&
      s.invoiceAccountNumber?.trim()
  )
}

const getSupplierMissingFields = (s: Supplier): string[] => {
  const missing: string[] = []
  if (!s.address?.trim()) missing.push('Address')
  if (!s.pan?.trim()) missing.push('PAN')
  if (!s.gst?.trim()) missing.push('GST')
  if (!isSupplierBankingReady(s)) missing.push('Banking / UPI')
  return missing
}

interface CostBreakup {
  supplierCost: number
  supplierTax: number
  markup: number
  serviceFee: number
  gst: number
  tcs: number
  totalValue: number
  currency: string
  totalQuotes?: number
}

interface Payment {
  id: string
  bookingId: string
  mode: 'CASH' | 'BANK_TRANSFER' | 'PAYMENT_GATEWAY'
  amount: number
  date: string
  reference?: string
  status: 'pending' | 'completed' | 'failed'
  currency: string
}

type BookingLookup = {
  id: string
  bookingNumber: string
  customer?: string
  currency?: string
  totalAmount?: number
  paidAmount?: number
}

type CostBreakupRow = {
  id: string
  quoteNumber: string
  leadName: string
  status: string
  supplierCost: number
  supplierTaxAmount: number
  markupAmount: number
  serviceFeeAmount: number
  gstAmount: number
  tcsAmount: number
  totalSaleValue: number
  effectiveCurrency: string
  createdAt: string
}

type CurrencyBreakupRow = {
  currency: string
  totalQuotes: number
  supplierCost: number
  supplierTaxAmount: number
  markupAmount: number
  serviceFeeAmount: number
  gstAmount: number
  tcsAmount: number
  totalSaleValue: number
}

type CostPagination = {
  page: number
  limit: number
  totalItems: number
  totalPages: number
}

const emptyCostBreakup: CostBreakup = {
  supplierCost: 0,
  supplierTax: 0,
  markup: 0,
  serviceFee: 0,
  gst: 0,
  tcs: 0,
  totalValue: 0,
  currency: 'INR',
  totalQuotes: 0
}

const emptyCostPagination: CostPagination = {
  page: 1,
  limit: 10,
  totalItems: 0,
  totalPages: 1
}

const unwrapData = (response: unknown): any =>
  (response as { data?: unknown })?.data ?? response

const unwrapList = (response: unknown): any[] => {
  const payload = unwrapData(response)
  if (Array.isArray(payload)) return payload
  if (Array.isArray((payload as { data?: unknown[] })?.data)) {
    return (payload as { data: unknown[] }).data
  }
  if (Array.isArray((payload as { items?: unknown[] })?.items)) {
    return (payload as { items: unknown[] }).items
  }
  return []
}

const toNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const toIsoDateOnly = (value: string) => {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toISOString()
}

const paymentModeLabel = (mode: Payment['mode']) => {
  if (mode === 'CASH') return 'Cash'
  if (mode === 'PAYMENT_GATEWAY') return 'Payment Gateway'
  return 'Bank Transfer'
}

const createClientFormData = (client?: Client | null) => ({
  name: client?.name || '',
  pan: client?.pan || '',
  email: client?.email || '',
  phone: client?.phone || '',
  address: client?.address || '',
  currency: client?.currency || 'USD'
})

const createSupplierFormData = (supplier?: Supplier | null) => ({
  name: supplier?.name || '',
  contactPerson: supplier?.contactPerson || '',
  country: supplier?.country || '',
  pan: supplier?.pan || '',
  gst: supplier?.gst || '',
  email: supplier?.email || '',
  phone: supplier?.phone || '',
  address: supplier?.address || '',
  invoiceBeneficiaryName: supplier?.invoiceBeneficiaryName || '',
  invoiceBankName: supplier?.invoiceBankName || '',
  invoiceAccountNumber: supplier?.invoiceAccountNumber || '',
  invoiceIfscSwift: supplier?.invoiceIfscSwift || '',
  invoiceUpiId: supplier?.invoiceUpiId || '',
  currency: supplier?.currency || 'USD'
})

const createPaymentFormData = () => ({
  bookingId: '',
  mode: 'BANK_TRANSFER' as Payment['mode'],
  amount: '',
  date: new Date().toISOString().split('T')[0],
  reference: '',
  currency: 'INR'
})

// Modal Components
const ClientModal = ({
  isOpen,
  onClose,
  onSave,
  client
}: {
  isOpen: boolean
  onClose: () => void
  onSave: (data: any) => void
  client?: Client | null
}) => {
  const [formData, setFormData] = useState(() => createClientFormData(client))

  const currencies = ['USD', 'EUR', 'GBP', 'INR', 'AED', 'CAD', 'AUD']

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'>
      <div className='bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto'>
        <div className='sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 p-4 flex items-center justify-between'>
          <h3 className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
            {client ? 'Edit Client' : 'Add New Client'}
          </h3>
          <button
            onClick={onClose}
            className='text-gray-400 hover:text-gray-600'
          >
            <FaXmark className='text-xl' />
          </button>
        </div>

        <form onSubmit={handleSubmit} className='p-6 space-y-4'>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <div>
              <label className='field-label'>Full Name</label>
              <input
                type='text'
                value={formData.name}
                onChange={e =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className='field-input'
                placeholder='John Doe'
              />
            </div>
            <div>
              <label className='field-label'>PAN</label>
              <input
                type='text'
                value={formData.pan}
                onChange={e =>
                  setFormData({
                    ...formData,
                    pan: e.target.value.toUpperCase()
                  })
                }
                className='field-input'
                placeholder='ABCDE1234F'
                maxLength={10}
              />
            </div>
            <div>
              <label className='field-label'>Email *</label>
              <input
                type='email'
                required
                value={formData.email}
                onChange={e =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className='field-input'
                placeholder='john@example.com'
              />
            </div>
            <div>
              <label className='field-label'>Contact Number *</label>
              <input
                type='tel'
                required
                value={formData.phone}
                onChange={e =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                className='field-input'
                placeholder='+1 555 0101'
              />
            </div>
            <div className='md:col-span-2'>
              <label className='field-label'>Address *</label>
              <textarea
                required
                value={formData.address}
                onChange={e =>
                  setFormData({ ...formData, address: e.target.value })
                }
                rows={3}
                className='field-input'
                placeholder='Enter complete address'
              />
            </div>
            <div>
              <label className='field-label'>Currency</label>
              <SearchableDropdown
                value={formData.currency}
                onChange={value =>
                  setFormData({ ...formData, currency: value })
                }
                options={currencies.map(c => ({ value: c, label: c }))}
                placeholder='Select currency'
                className='w-full'
              />
            </div>
          </div>

          <div className='flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-800'>
            <button
              type='button'
              onClick={onClose}
              className='px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700'
            >
              Cancel
            </button>
            <button
              type='submit'
              className='px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700'
            >
              {client ? 'Update Client' : 'Add Client'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const SupplierModal = ({
  isOpen,
  onClose,
  onSave,
  supplier
}: {
  isOpen: boolean
  onClose: () => void
  onSave: (data: any) => void
  supplier?: Supplier | null
}) => {
  const [formData, setFormData] = useState(() =>
    createSupplierFormData(supplier)
  )

  const currencies = ['USD', 'EUR', 'GBP', 'INR', 'AED', 'CAD', 'AUD']

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'>
      <div className='bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto'>
        <div className='sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 p-4 flex items-center justify-between'>
          <h3 className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
            {supplier ? 'Edit Supplier' : 'Add New Supplier'}
          </h3>
          <button
            onClick={onClose}
            className='text-gray-400 hover:text-gray-600'
          >
            <FaXmark className='text-xl' />
          </button>
        </div>

        <form onSubmit={handleSubmit} className='p-6 space-y-4'>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <div>
              <label className='field-label'>Supplier Name *</label>
              <input
                type='text'
                required
                value={formData.name}
                onChange={e =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className='field-input'
                placeholder='Maldives Resorts'
              />
            </div>
            <div>
              <label className='field-label'>Contact Person</label>
              <input
                type='text'
                value={formData.contactPerson}
                onChange={e =>
                  setFormData({ ...formData, contactPerson: e.target.value })
                }
                className='field-input'
                placeholder='Primary contact name'
              />
            </div>
            <div>
              <label className='field-label'>Country</label>
              <input
                type='text'
                value={formData.country}
                onChange={e =>
                  setFormData({ ...formData, country: e.target.value })
                }
                className='field-input'
                placeholder='United Kingdom'
              />
            </div>
            <div>
              <label className='field-label'>PAN</label>
              <input
                type='text'
                value={formData.pan}
                onChange={e =>
                  setFormData({
                    ...formData,
                    pan: e.target.value.toUpperCase()
                  })
                }
                className='field-input'
                placeholder='ABCDE1234F'
                maxLength={10}
              />
            </div>
            <div>
              <label className='field-label'>GST (if applicable)</label>
              <input
                type='text'
                value={formData.gst}
                onChange={e =>
                  setFormData({ ...formData, gst: e.target.value })
                }
                className='field-input'
                placeholder='GST123456'
              />
            </div>
            <div>
              <label className='field-label'>Email *</label>
              <input
                type='email'
                required
                value={formData.email}
                onChange={e =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className='field-input'
                placeholder='supplier@example.com'
              />
            </div>
            <div>
              <label className='field-label'>Contact Number *</label>
              <input
                type='tel'
                required
                value={formData.phone}
                onChange={e =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                className='field-input'
                placeholder='+1 555 0201'
              />
            </div>
            <div className='md:col-span-2 rounded-lg border border-gray-200 p-3 dark:border-gray-700'>
              <p className='mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500'>
                Invoice Details (Payment Processing)
              </p>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
                <div>
                  <label className='field-label'>Beneficiary Name</label>
                  <input
                    type='text'
                    value={formData.invoiceBeneficiaryName}
                    onChange={e =>
                      setFormData({
                        ...formData,
                        invoiceBeneficiaryName: e.target.value
                      })
                    }
                    className='field-input'
                    placeholder='Zephyr SGB Global Pvt Ltd'
                  />
                </div>
                <div>
                  <label className='field-label'>Bank Name</label>
                  <input
                    type='text'
                    value={formData.invoiceBankName}
                    onChange={e =>
                      setFormData({
                        ...formData,
                        invoiceBankName: e.target.value
                      })
                    }
                    className='field-input'
                    placeholder='HDFC / ICICI / SBI'
                  />
                </div>
                <div>
                  <label className='field-label'>Account Number</label>
                  <input
                    type='text'
                    value={formData.invoiceAccountNumber}
                    onChange={e =>
                      setFormData({
                        ...formData,
                        invoiceAccountNumber: e.target.value
                      })
                    }
                    className='field-input'
                    placeholder='Bank account number'
                  />
                </div>
                <div>
                  <label className='field-label'>IFSC / SWIFT</label>
                  <input
                    type='text'
                    value={formData.invoiceIfscSwift}
                    onChange={e =>
                      setFormData({
                        ...formData,
                        invoiceIfscSwift: e.target.value
                      })
                    }
                    className='field-input'
                    placeholder='IFSC or SWIFT code'
                  />
                </div>
                <div className='md:col-span-2'>
                  <label className='field-label'>UPI ID (Optional)</label>
                  <input
                    type='text'
                    value={formData.invoiceUpiId}
                    onChange={e =>
                      setFormData({ ...formData, invoiceUpiId: e.target.value })
                    }
                    className='field-input'
                    placeholder='name@bank'
                  />
                </div>
              </div>
            </div>
            <div className='md:col-span-2'>
              <label className='field-label'>Address *</label>
              <textarea
                required
                value={formData.address}
                onChange={e =>
                  setFormData({ ...formData, address: e.target.value })
                }
                rows={3}
                className='field-input'
                placeholder='Enter complete address'
              />
            </div>
            <div>
              <label className='field-label'>Currency</label>
              <SearchableDropdown
                value={formData.currency}
                onChange={value =>
                  setFormData({ ...formData, currency: value })
                }
                options={currencies.map(c => ({ value: c, label: c }))}
                placeholder='Select currency'
                className='w-full'
              />
            </div>
          </div>

          <div className='flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-800'>
            <button
              type='button'
              onClick={onClose}
              className='px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700'
            >
              Cancel
            </button>
            <button
              type='submit'
              className='px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700'
            >
              {supplier ? 'Update Supplier' : 'Add Supplier'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const PaymentModal = ({
  isOpen,
  onClose,
  onSave,
  bookings = []
}: {
  isOpen: boolean
  onClose: () => void
  onSave: (data: any) => void
  bookings?: BookingLookup[]
}) => {
  const [formData, setFormData] = useState(createPaymentFormData)
  const [bookingError, setBookingError] = useState('')

  const bookingOptions = useMemo(
    () => [
      {
        value: '',
        label: bookings.length ? 'Select booking' : 'No bookings found'
      },
      ...bookings.map(booking => ({
        value: booking.id,
        label: booking.customer
          ? `${booking.bookingNumber} - ${booking.customer}`
          : booking.bookingNumber,
        searchText: `${booking.bookingNumber} ${booking.customer || ''} ${
          booking.id
        }`
      }))
    ],
    [bookings]
  )

  const selectedBooking = useMemo(
    () => bookings.find(booking => booking.id === formData.bookingId) || null,
    [bookings, formData.bookingId]
  )

  const currencyOptions = useMemo(() => {
    const defaults = ['USD', 'EUR', 'GBP', 'INR', 'AED']
    const bookingCurrency = String(selectedBooking?.currency || '')
      .trim()
      .toUpperCase()
    const merged = bookingCurrency ? [bookingCurrency, ...defaults] : defaults
    return Array.from(new Set(merged)).map(currency => ({
      value: currency,
      label: currency
    }))
  }, [selectedBooking?.currency])

  const formatMoney = useCallback((amount: number, currency: string) => {
    const normalizedCurrency = String(currency || 'INR').toUpperCase()
    try {
      return new Intl.NumberFormat(
        normalizedCurrency === 'INR' ? 'en-IN' : 'en-US',
        {
          style: 'currency',
          currency: normalizedCurrency,
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }
      ).format(amount)
    } catch (_error) {
      return `${toNumber(amount, 0).toFixed(2)} ${normalizedCurrency}`
    }
  }, [])

  const outstandingAmount = selectedBooking
    ? Math.max(
        toNumber(selectedBooking.totalAmount, 0) -
          toNumber(selectedBooking.paidAmount, 0),
        0
      )
    : null

  useEffect(() => {
    if (!isOpen) return
    const timeoutId = window.setTimeout(() => {
      setBookingError('')
      setFormData(createPaymentFormData())
    }, 0)
    return () => window.clearTimeout(timeoutId)
  }, [isOpen])

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.bookingId.trim()) {
      setBookingError('Please select a booking')
      return
    }
    onSave({
      ...formData,
      amount: toNumber(formData.amount, 0),
      paidAt: toIsoDateOnly(formData.date),
      status: 'pending'
    })
  }

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

        <form onSubmit={handleSubmit} className='p-6 space-y-4'>
          <div>
            <label className='field-label'>Booking *</label>
            <SearchableDropdown
              value={formData.bookingId}
              onChange={value => {
                const matchedBooking =
                  bookings.find(booking => booking.id === value) || null
                setFormData(prev => ({
                  ...prev,
                  bookingId: value,
                  currency:
                    matchedBooking?.currency?.toUpperCase() || prev.currency
                }))
                setBookingError('')
              }}
              options={bookingOptions}
              hasError={Boolean(bookingError)}
              searchPlaceholder='Search booking number or customer...'
              placeholder='Select booking'
              className='w-full'
            />
            {bookingError ? (
              <p className='mt-1 text-xs text-red-500'>{bookingError}</p>
            ) : null}
            {selectedBooking ? (
              <p className='mt-1 text-xs text-gray-500'>
                Outstanding:{' '}
                {formatMoney(
                  outstandingAmount ?? 0,
                  formData.currency || selectedBooking.currency || 'INR'
                )}
              </p>
            ) : null}
            <input
              type='text'
              required
              readOnly
              tabIndex={-1}
              aria-hidden='true'
              value={formData.bookingId}
              onChange={() => {}}
              className='sr-only'
            />
          </div>

          <div>
            <label className='field-label'>Payment Mode *</label>
            <SearchableDropdown
              value={formData.mode}
              onChange={value =>
                setFormData({
                  ...formData,
                  mode: value as Payment['mode']
                })
              }
              options={[
                { value: 'CASH', label: 'Cash' },
                { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
                { value: 'PAYMENT_GATEWAY', label: 'Payment Gateway' }
              ]}
              placeholder='Select payment mode'
              className='w-full'
            />
          </div>

          <div>
            <label className='field-label'>Amount *</label>
            <input
              type='number'
              required
              value={formData.amount}
              onChange={e =>
                setFormData({ ...formData, amount: e.target.value })
              }
              className='field-input'
              placeholder='0.00'
              min='0'
              step='0.01'
            />
          </div>

          <div>
            <label className='field-label'>Date *</label>
            <input
              type='date'
              required
              value={formData.date}
              onChange={e => setFormData({ ...formData, date: e.target.value })}
              className='field-input'
            />
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
              placeholder='Transaction ID / Reference'
            />
          </div>

          <div>
            <label className='field-label'>Currency</label>
            <SearchableDropdown
              value={formData.currency}
              onChange={value => setFormData({ ...formData, currency: value })}
              options={currencyOptions}
              placeholder='Select currency'
              className='w-full'
            />
          </div>

          <div className='flex justify-end gap-3 pt-4'>
            <button
              type='button'
              onClick={onClose}
              className='px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50'
            >
              Cancel
            </button>
            <button
              type='submit'
              className='px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700'
            >
              Record Payment
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const FinanceSystem: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    'clients' | 'suppliers' | 'cost' | 'payments' | 'supplier-services'
  >('clients')
  const [clients, setClients] = useState<Client[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [costBreakup, setCostBreakup] = useState<CostBreakup>(emptyCostBreakup)
  const [costRows, setCostRows] = useState<CostBreakupRow[]>([])
  const [currencyBreakup, setCurrencyBreakup] = useState<CurrencyBreakupRow[]>(
    []
  )
  const [costPagination, setCostPagination] =
    useState<CostPagination>(emptyCostPagination)
  const [payments, setPayments] = useState<Payment[]>([])
  const [bookingLookups, setBookingLookups] = useState<BookingLookup[]>([])
  const [search, setSearch] = useState('')
  const [showClientModal, setShowClientModal] = useState(false)
  const [showSupplierModal, setShowSupplierModal] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
  const [tabMenuOpen, setTabMenuOpen] = useState(false)
  const [costFilters, setCostFilters] = useState({
    from: '',
    to: '',
    currency: '',
    limit: 10,
    page: 1
  })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [page, setPage] = useState(1)
  const [supplierServicesRefreshKey, setSupplierServicesRefreshKey] = useState(0)
  const pageSize = 5
  const menuRef = useRef<HTMLDivElement | null>(null)

  const tabItems: Array<{
    id: 'clients' | 'suppliers' | 'cost' | 'payments' | 'supplier-services'
    label: string
    icon: React.ComponentType<{ className?: string }>
  }> = [
    { id: 'clients', label: 'Client Onboarding', icon: FaUser },
    { id: 'suppliers', label: 'Supplier Onboarding', icon: FaBuilding },
    { id: 'supplier-services', label: 'Supplier Services', icon: FaBuilding },
    { id: 'cost', label: 'Cost Break-up', icon: FaPercent },
    { id: 'payments', label: 'Payments', icon: FaCreditCard }
  ]

  const handleTabSelection = (
    tabId: 'clients' | 'suppliers' | 'cost' | 'payments' | 'supplier-services'
  ) => {
    setActiveTab(tabId)
    setPage(1)
    setTabMenuOpen(false)
  }

  const bookingLookupById = useMemo(
    () => new Map(bookingLookups.map(booking => [booking.id, booking])),
    [bookingLookups]
  )

  const mapClient = (raw: any): Client => ({
    id: String(raw?.id ?? ''),
    pan: raw?.panNumber ?? raw?.pan_number ?? '',
    address: raw?.addressLine ?? raw?.address_line ?? '',
    email: raw?.email ?? '',
    phone: raw?.phone ?? '',
    name: raw?.fullName ?? raw?.full_name ?? '',
    currency: raw?.clientCurrency ?? raw?.client_currency ?? 'INR',
    leadId: raw?.leadId ?? raw?.lead_id ?? '',
    leadCode: raw?.leadCode ?? raw?.lead_code ?? '',
    nationality: raw?.nationality ?? '',
    country: raw?.leadCountry ?? raw?.country ?? '',
    travelDate: raw?.travelDate ?? raw?.travel_date ?? '',
    destination: raw?.destinationName ?? raw?.destination ?? '',
    adultsCount: raw?.adultsCount ?? raw?.adults_count ?? 0,
    childrenCount: raw?.childrenCount ?? raw?.children_count ?? 0,
    budget: raw?.budget ?? 0,
    travelPurpose: raw?.travelPurpose ?? raw?.travel_purpose ?? '',
    source: raw?.source ?? raw?.leadSource ?? ''
  })

  const mapSupplier = (raw: any): Supplier => {
    const invoiceBeneficiaryName =
      raw?.invoiceBeneficiaryName ?? raw?.invoice_beneficiary_name ?? ''
    const invoiceBankName = raw?.invoiceBankName ?? raw?.invoice_bank_name ?? ''
    const invoiceAccountNumber =
      raw?.invoiceAccountNumber ?? raw?.invoice_account_number ?? ''
    const invoiceIfscSwift =
      raw?.invoiceIfscSwift ?? raw?.invoice_ifsc_swift ?? ''
    const invoiceUpiId = raw?.invoiceUpiId ?? raw?.invoice_upi_id ?? ''
    const invoiceParts = [
      invoiceBeneficiaryName,
      invoiceBankName,
      invoiceAccountNumber,
      invoiceIfscSwift,
      invoiceUpiId
    ].filter(Boolean)

    return {
      id: String(raw?.id ?? ''),
      pan: raw?.panNumber ?? raw?.pan_number ?? '',
      gst: raw?.gstNumber ?? raw?.gst_number ?? '',
      address: raw?.addressLine ?? raw?.address_line ?? raw?.address ?? '',
      email: raw?.email ?? '',
      phone: raw?.phone ?? '',
      name: raw?.name ?? '',
      contactPerson:
        raw?.contactPerson ?? raw?.contact_person ?? raw?.contactName ?? '',
      country: raw?.country ?? raw?.countryName ?? '',
      invoiceBeneficiaryName,
      invoiceBankName,
      invoiceAccountNumber,
      invoiceIfscSwift,
      invoiceUpiId,
      invoiceDetails: invoiceParts.join(' | ') || '-',
      currency: raw?.supplierCurrency ?? raw?.supplier_currency ?? 'INR',
      isActive: raw?.isActive ?? raw?.is_active ?? true
    }
  }

  const mapPayment = (raw: any): Payment => {
    const mode = String(
      raw?.paymentMode ?? raw?.payment_mode ?? ''
    ).toUpperCase()
    const normalizedMode: Payment['mode'] =
      mode === 'CASH'
        ? 'CASH'
        : mode === 'PAYMENT_GATEWAY' ||
          mode === 'GATEWAY' ||
          mode === 'UPI' ||
          mode === 'CARD'
        ? 'PAYMENT_GATEWAY'
        : 'BANK_TRANSFER'
    return {
      id: String(raw?.id ?? ''),
      bookingId: String(raw?.bookingId ?? raw?.booking_id ?? ''),
      mode: normalizedMode,
      amount: toNumber(raw?.amount, 0),
      date:
        raw?.paidAt ??
        raw?.paid_at ??
        raw?.createdAt ??
        raw?.created_at ??
        new Date().toISOString(),
      reference:
        raw?.paymentReference ??
        raw?.payment_reference ??
        raw?.gatewayPaymentId ??
        raw?.gateway_payment_id ??
        '',
      status:
        raw?.isVerified || raw?.is_verified
          ? 'completed'
          : String(raw?.status ?? '').toUpperCase() === 'REFUNDED'
          ? 'failed'
          : 'pending',
      currency: raw?.currency ?? 'INR'
    }
  }

  const mapCurrencyBreakupRow = (raw: any): CurrencyBreakupRow => ({
    currency: String(raw?.currency || 'INR'),
    totalQuotes: toNumber(raw?.totalQuotes, 0),
    supplierCost: toNumber(raw?.supplierCost, 0),
    supplierTaxAmount: toNumber(raw?.supplierTaxAmount, 0),
    markupAmount: toNumber(raw?.markupAmount, 0),
    serviceFeeAmount: toNumber(raw?.serviceFeeAmount, 0),
    gstAmount: toNumber(raw?.gstAmount, 0),
    tcsAmount: toNumber(raw?.tcsAmount, 0),
    totalSaleValue: toNumber(raw?.totalSaleValue, 0)
  })

  const mapCostBreakupRow = (raw: any): CostBreakupRow => ({
    id: String(raw?.id ?? ''),
    quoteNumber: String(raw?.quoteNumber ?? ''),
    leadName: String(raw?.leadName ?? ''),
    status: String(raw?.status ?? 'DRAFT'),
    supplierCost: toNumber(raw?.supplierCost, 0),
    supplierTaxAmount: toNumber(raw?.supplierTaxAmount, 0),
    markupAmount: toNumber(raw?.markupAmount, 0),
    serviceFeeAmount: toNumber(raw?.serviceFeeAmount, 0),
    gstAmount: toNumber(raw?.gstAmount, 0),
    tcsAmount: toNumber(raw?.tcsAmount, 0),
    totalSaleValue: toNumber(raw?.totalSaleValue, 0),
    effectiveCurrency: String(raw?.effectiveCurrency ?? 'INR'),
    createdAt: String(raw?.createdAt ?? '')
  })

  const fetchClients = useCallback(async () => {
    setLoading(true)
    try {
      const response = await customersApi.list({ page: 1, limit: 300 })
      setClients(unwrapList(response).map(mapClient))
    } catch (err) {
      reportApiError(err, 'Failed to load clients', setError)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchSuppliers = useCallback(async () => {
    setLoading(true)
    try {
      const response = await suppliersApi.list({ page: 1, limit: 300 })
      setSuppliers(unwrapList(response).map(mapSupplier))
    } catch (err) {
      reportApiError(err, 'Failed to load suppliers', setError)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchPayments = useCallback(async () => {
    setLoading(true)
    try {
      const pageSize = 300
      const firstResponse = await paymentsApi.list({ page: 1, limit: pageSize })
      const firstPayload = unwrapData(firstResponse)
      const firstRows = Array.isArray(firstPayload?.rows)
        ? firstPayload.rows
        : unwrapList(firstResponse)
      const totalPages = Math.max(1, toNumber(firstPayload?.pagination?.totalPages, 1))

      if (totalPages <= 1) {
        setPayments(firstRows.map(mapPayment))
        return
      }

      const remainingResponses = await Promise.all(
        Array.from({ length: totalPages - 1 }, (_item, idx) =>
          paymentsApi.list({ page: idx + 2, limit: pageSize })
        )
      )
      const remainingRows = remainingResponses.flatMap(response => {
        const payload = unwrapData(response)
        if (Array.isArray(payload?.rows)) return payload.rows
        return unwrapList(response)
      })
      setPayments([...firstRows, ...remainingRows].map(mapPayment))
    } catch (err) {
      reportApiError(err, 'Failed to load payments', setError)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchBookingLookups = useCallback(async () => {
    try {
      const response = await bookingsApi.list({ page: 1, limit: 300 })
      const list = unwrapList(response)
      setBookingLookups(
        list.map((booking: any) => ({
          id: String(booking?.id ?? ''),
          bookingNumber:
            booking?.bookingNumber ??
            booking?.booking_number ??
            booking?.code ??
            'N/A',
          customer:
            booking?.customerName ??
            booking?.customer_name ??
            booking?.leadName ??
            booking?.lead_name ??
            '',
          currency: String(
            booking?.clientCurrency ??
              booking?.client_currency ??
              booking?.currency ??
              'INR'
          ).toUpperCase(),
          totalAmount: toNumber(
            booking?.totalAmount ??
              booking?.total_amount ??
              booking?.amount ??
              booking?.amount_total,
            0
          ),
          paidAmount: toNumber(
            booking?.paidAmount ??
              booking?.paid_amount ??
              booking?.paid ??
              booking?.amountPaid ??
              booking?.advanceReceived ??
              booking?.advance_received,
            0
          )
        }))
      )
    } catch (lookupError) {
      console.error('Failed to load booking lookups:', lookupError)
      setBookingLookups([])
    }
  }, [])

  const fetchCostBreakup = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, string | number | boolean> = {
        page: costFilters.page,
        limit: costFilters.limit
      }
      if (costFilters.from) params.from = costFilters.from
      if (costFilters.to) params.to = costFilters.to
      if (costFilters.currency) params.currency = costFilters.currency

      const response = await reportsApi.financeCostBreakup(params)
      const data = unwrapData(response)

      setCostBreakup({
        supplierCost: toNumber(data?.summary?.supplierCost, 0),
        supplierTax: toNumber(data?.summary?.supplierTaxAmount, 0),
        markup: toNumber(data?.summary?.markupAmount, 0),
        serviceFee: toNumber(data?.summary?.serviceFeeAmount, 0),
        gst: toNumber(data?.summary?.gstAmount, 0),
        tcs: toNumber(data?.summary?.tcsAmount, 0),
        totalValue: toNumber(data?.summary?.totalSaleValue, 0),
        totalQuotes: toNumber(data?.summary?.totalQuotes, 0),
        currency:
          costFilters.currency ||
          (Array.isArray(data?.currencyBreakdown) &&
          data.currencyBreakdown.length === 1
            ? String(data.currencyBreakdown[0]?.currency || 'INR')
            : 'INR')
      })

      setCurrencyBreakup(
        Array.isArray(data?.currencyBreakdown)
          ? data.currencyBreakdown.map(mapCurrencyBreakupRow)
          : []
      )
      setCostRows(
        Array.isArray(data?.rows) ? data.rows.map(mapCostBreakupRow) : []
      )
      setCostPagination({
        page: toNumber(data?.pagination?.page, 1),
        limit: toNumber(data?.pagination?.limit, costFilters.limit),
        totalItems: toNumber(data?.pagination?.totalItems, 0),
        totalPages: Math.max(1, toNumber(data?.pagination?.totalPages, 1))
      })
    } catch (err) {
      reportApiError(err, 'Failed to load cost break-up report', setError)
      setCostBreakup(emptyCostBreakup)
      setCurrencyBreakup([])
      setCostRows([])
      setCostPagination(emptyCostPagination)
    } finally {
      setLoading(false)
    }
  }, [costFilters])

  useEffect(() => {
    void fetchClients()
    void fetchSuppliers()
    void fetchPayments()
    void fetchBookingLookups()
  }, [fetchClients, fetchSuppliers, fetchPayments, fetchBookingLookups])

  useEffect(() => {
    if (activeTab !== 'cost') return
    void fetchCostBreakup()
  }, [activeTab, fetchCostBreakup])

  useEffect(() => {
    if (!tabMenuOpen) return
    const handleClickOutside = (event: MouseEvent) => {
      if (!menuRef.current) return
      if (!menuRef.current.contains(event.target as Node)) {
        setTabMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [tabMenuOpen])

  const toDateTokens = (value?: string | null) => {
    if (!value) return [] as string[]
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return [value]
    return [parsed.toLocaleDateString(), parsed.toISOString().split('T')[0], value]
  }

  const filteredClients = clients.filter(c => {
    const searchValue = search.trim().toLowerCase()
    if (!searchValue) return true
    const haystack = [
      c.id,
      c.name,
      c.email,
      c.phone,
      c.pan,
      c.address,
      c.currency
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return haystack.includes(searchValue)
  })

  const filteredSuppliers = suppliers.filter(s => {
    const searchValue = search.trim().toLowerCase()
    if (!searchValue) return true
    const haystack = [
      s.id,
      s.name,
      s.contactPerson,
      s.country,
      s.email,
      s.phone,
      s.pan,
      s.gst,
      s.address,
      s.invoiceDetails,
      s.currency,
      s.isActive ? 'active' : 'inactive'
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return haystack.includes(searchValue)
  })

  const getBookingDisplay = (bookingId: string) => {
    const normalized = String(bookingId || '').trim()
    if (!normalized) return '-'
    const booking = bookingLookupById.get(normalized)
    if (!booking)
      return normalized.length > 10
        ? `${normalized.slice(0, 8)}...`
        : normalized
    return booking.customer
      ? `${booking.bookingNumber} - ${booking.customer}`
      : booking.bookingNumber
  }

  const filteredPayments = payments.filter(p => {
    const searchValue = search.trim().toLowerCase()
    if (!searchValue) return true
    const bookingDisplay = getBookingDisplay(p.bookingId)
    const bookingLookup = bookingLookupById.get(String(p.bookingId || ''))
    const dateTokens = toDateTokens(p.date)
    const haystack = [
      p.id,
      p.bookingId,
      bookingDisplay,
      bookingLookup?.bookingNumber,
      bookingLookup?.customer,
      p.reference,
      p.mode,
      paymentModeLabel(p.mode),
      p.status,
      p.amount?.toString(),
      p.currency,
      ...dateTokens
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return haystack.includes(searchValue)
  })

  // Pagination
  const totalPages = Math.max(
    1,
    Math.ceil(
      (activeTab === 'clients'
        ? filteredClients.length
        : activeTab === 'suppliers'
        ? filteredSuppliers.length
        : filteredPayments.length) / pageSize
    )
  )

  const paginatedClients = filteredClients.slice(
    (page - 1) * pageSize,
    page * pageSize
  )
  const completeClientKycCount = filteredClients.filter(
    client =>
      Boolean(client.name?.trim()) &&
      Boolean(client.email?.trim()) &&
      Boolean(client.phone?.trim()) &&
      Boolean(client.pan?.trim()) &&
      Boolean(client.address?.trim())
  ).length
  const incompleteClientKycCount = Math.max(
    filteredClients.length - completeClientKycCount,
    0
  )
  const supplierBankingReadyCount = filteredSuppliers.filter(s =>
    isSupplierBankingReady(s)
  ).length
  const supplierBankingIncompleteCount = Math.max(
    filteredSuppliers.length - supplierBankingReadyCount,
    0
  )
  const paginatedSuppliers = filteredSuppliers.slice(
    (page - 1) * pageSize,
    page * pageSize
  )
  const paginatedPayments = filteredPayments.slice(
    (page - 1) * pageSize,
    page * pageSize
  )

  const exportCurrentTable = () => {
    const escapeCsv = (value: string) => `"${value.replace(/"/g, '""')}"`

    let headers: string[] = []
    let dataRows: Array<Array<string | number>> = []

    if (activeTab === 'clients') {
      headers = ['Name', 'Email', 'Phone', 'PAN', 'Address', 'Currency']
      dataRows = paginatedClients.map(client => [
        client.name ?? '',
        client.email ?? '',
        client.phone ?? '',
        client.pan ?? '',
        client.address ?? '',
        client.currency ?? ''
      ])
    } else if (activeTab === 'suppliers') {
      headers = [
        'Name',
        'Contact Person',
        'Country',
        'Email',
        'Phone',
        'PAN',
        'GST',
        'Address',
        'Invoice Details',
        'Currency',
        'Banking Ready',
        'Status'
      ]
      dataRows = paginatedSuppliers.map(supplier => [
        supplier.name ?? '',
        supplier.contactPerson ?? '',
        supplier.country ?? '',
        supplier.email ?? '',
        supplier.phone ?? '',
        supplier.pan ?? '',
        supplier.gst ?? '',
        supplier.address ?? '',
        supplier.invoiceDetails ?? '',
        supplier.currency ?? '',
        isSupplierBankingReady(supplier) ? 'Yes' : 'No',
        supplier.isActive ? 'Active' : 'Inactive'
      ])
    } else if (activeTab === 'payments') {
      headers = [
        'Booking ID',
        'Amount',
        'Status',
        'Mode',
        'Date',
        'Reference',
        'Currency'
      ]
      dataRows = paginatedPayments.map(payment => [
        payment.bookingId ?? '',
        payment.amount ?? 0,
        payment.status ?? '',
        payment.mode ?? '',
        payment.date ?? '',
        payment.reference ?? '',
        payment.currency ?? ''
      ])
    } else if (activeTab === 'cost') {
      headers = [
        'Quote #',
        'Lead Name',
        'Status',
        'Supplier Cost',
        'Supplier Tax',
        'Markup',
        'Service Fee',
        'GST',
        'TCS',
        'Total Sale Value',
        'Currency',
        'Created At'
      ]
      dataRows = costRows.map(row => [
        row.quoteNumber ?? '',
        row.leadName ?? '',
        row.status ?? '',
        row.supplierCost ?? 0,
        row.supplierTaxAmount ?? 0,
        row.markupAmount ?? 0,
        row.serviceFeeAmount ?? 0,
        row.gstAmount ?? 0,
        row.tcsAmount ?? 0,
        row.totalSaleValue ?? 0,
        row.effectiveCurrency ?? '',
        row.createdAt ?? ''
      ])
    }

    if (!dataRows.length) return

    const csv = [headers, ...dataRows]
      .map(row => row.map(cell => escapeCsv(String(cell))).join(','))
      .join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `finance-${activeTab}-${new Date().toISOString().slice(0, 10)}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const handleAddClient = async (data: any) => {
    setSaving(true)
    setError('')
    setNotice('')
    try {
      await customersApi.create({
        fullName: data.name,
        ...(data.pan ? { panNumber: data.pan } : {}),
        email: data.email,
        phone: data.phone,
        addressLine: data.address,
        clientCurrency: data.currency
      })
      setShowClientModal(false)
      setNotice('Client created successfully')
      await fetchClients()
    } catch (err) {
      reportApiError(err, 'Failed to create client', setError)
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateClient = async (data: any) => {
    if (!editingClient) return
    setSaving(true)
    setError('')
    setNotice('')
    try {
      await customersApi.update(editingClient.id, {
        fullName: data.name,
        ...(data.pan ? { panNumber: data.pan } : {}),
        email: data.email,
        phone: data.phone,
        addressLine: data.address,
        clientCurrency: data.currency
      })
      setShowClientModal(false)
      setEditingClient(null)
      setNotice('Client updated successfully')
      await fetchClients()
    } catch (err) {
      reportApiError(err, 'Failed to update client', setError)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteClient = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this client?')) {
      setSaving(true)
      setError('')
      setNotice('')
      try {
        await customersApi.delete(id)
        setNotice('Client deleted')
        await fetchClients()
      } catch (err) {
        reportApiError(err, 'Failed to delete client', setError)
      } finally {
        setSaving(false)
      }
    }
  }

  const handleAddSupplier = async (data: any) => {
    setSaving(true)
    setError('')
    setNotice('')
    try {
      await suppliersApi.create({
        name: data.name,
        ...(data.contactPerson?.trim()
          ? { contactPerson: data.contactPerson.trim() }
          : {}),
        ...(data.country?.trim() ? { country: data.country.trim() } : {}),
        ...(data.pan ? { panNumber: data.pan } : {}),
        gstNumber: data.gst || undefined,
        email: data.email,
        phone: data.phone,
        addressLine: data.address,
        supplierCurrency: data.currency,
        invoiceBeneficiaryName: data.invoiceBeneficiaryName || undefined,
        invoiceBankName: data.invoiceBankName || undefined,
        invoiceAccountNumber: data.invoiceAccountNumber || undefined,
        invoiceIfscSwift: data.invoiceIfscSwift || undefined,
        invoiceUpiId: data.invoiceUpiId || undefined
      })
      setShowSupplierModal(false)
      setNotice('Supplier created successfully')
      await fetchSuppliers()
    } catch (err) {
      reportApiError(err, 'Failed to create supplier', setError)
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateSupplier = async (data: any) => {
    if (!editingSupplier) return
    setSaving(true)
    setError('')
    setNotice('')
    try {
      await suppliersApi.update(editingSupplier.id, {
        name: data.name,
        ...(data.contactPerson?.trim()
          ? { contactPerson: data.contactPerson.trim() }
          : {}),
        ...(data.country?.trim() ? { country: data.country.trim() } : {}),
        ...(data.pan ? { panNumber: data.pan } : {}),
        gstNumber: data.gst || undefined,
        email: data.email,
        phone: data.phone,
        addressLine: data.address,
        supplierCurrency: data.currency,
        invoiceBeneficiaryName: data.invoiceBeneficiaryName || undefined,
        invoiceBankName: data.invoiceBankName || undefined,
        invoiceAccountNumber: data.invoiceAccountNumber || undefined,
        invoiceIfscSwift: data.invoiceIfscSwift || undefined,
        invoiceUpiId: data.invoiceUpiId || undefined
      })
      setShowSupplierModal(false)
      setEditingSupplier(null)
      setNotice('Supplier updated successfully')
      await fetchSuppliers()
    } catch (err) {
      reportApiError(err, 'Failed to update supplier', setError)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteSupplier = async (id: string) => {
    if (window.confirm('Deactivate this supplier?')) {
      setSaving(true)
      setError('')
      setNotice('')
      try {
        await suppliersApi.update(id, { isActive: false })
        setNotice('Supplier deactivated')
        await fetchSuppliers()
      } catch (err) {
        reportApiError(err, 'Failed to deactivate supplier', setError)
      } finally {
        setSaving(false)
      }
    }
  }

  const handleAddPayment = async (data: any) => {
    setSaving(true)
    setError('')
    setNotice('')
    try {
      await paymentsApi.create({
        bookingId: data.bookingId,
        amount: toNumber(data.amount, 0),
        currency: data.currency,
        paymentMode: data.mode,
        paymentReference: data.reference || undefined,
        paidAt: data.paidAt || undefined
      })
      setShowPaymentModal(false)
      setNotice('Payment recorded successfully')
      await fetchPayments()
    } catch (err) {
      reportApiError(err, 'Failed to record payment', setError)
    } finally {
      setSaving(false)
    }
  }

  const handleVerifyPayment = async (id: string) => {
    setSaving(true)
    setError('')
    setNotice('')
    try {
      await paymentsApi.verify(id, {})
      setNotice('Payment verified')
      await fetchPayments()
    } catch (err) {
      reportApiError(err, 'Failed to verify payment', setError)
    } finally {
      setSaving(false)
    }
  }

  const formatCurrency = (amount: number, currency: string = 'INR') => {
    const normalizedCurrency = String(currency || 'INR').toUpperCase()
    try {
      return new Intl.NumberFormat(
        normalizedCurrency === 'INR' ? 'en-IN' : 'en-US',
        {
          style: 'currency',
          currency: normalizedCurrency,
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }
      ).format(amount)
    } catch (_error) {
      return `${toNumber(amount, 0).toFixed(2)} ${normalizedCurrency}`
    }
  }

  const hasMixedCostCurrencies =
    !costFilters.currency && currencyBreakup.length > 1

  const formatDateTime = (value: string) => {
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return value
    return parsed.toLocaleString()
  }

  const getClientMissingFields = (client: Client) => {
    const missing: string[] = []
    if (!client.pan?.trim()) missing.push('PAN')
    if (!client.address?.trim()) missing.push('Address')
    if (!client.email?.trim()) missing.push('Email')
    if (!client.phone?.trim()) missing.push('Phone')
    return missing
  }

  return (
    <main className='flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-950'>
      <div className='mx-auto w-full max-w-full px-4 py-4 sm:px-4 sm:py-6 lg:px-6 lg:py-8'>
        {/* Header */}
        <div className='mb-4 -mt-2 sm:-mt-8'>
          <div className='flex flex-wrap items-start justify-between gap-3'>
            <div className='min-w-0 flex-1'>
              <h1 className='text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100'>
                Finance System
              </h1>
              <p className='text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1'>
                Manage clients, suppliers, cost breakdowns, and payments
              </p>
            </div>
            <div className='flex items-center gap-2'>
              <button
                onClick={exportCurrentTable}
                disabled={
                  activeTab === 'supplier-services' ||
                  (activeTab === 'clients' && paginatedClients.length === 0) ||
                  (activeTab === 'suppliers' && paginatedSuppliers.length === 0) ||
                  (activeTab === 'payments' && paginatedPayments.length === 0) ||
                  (activeTab === 'cost' && costRows.length === 0)
                }
                className='inline-flex items-center justify-center rounded-lg border border-green-500 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-green-400 dark:text-gray-200 dark:hover:bg-gray-800'
              >
                <FaDownload className='mr-2' /> Export
              </button>
              <button
                onClick={() => {
                  setError('')
                  setNotice('')
                  if (activeTab === 'clients') {
                    void fetchClients()
                    return
                  }
                  if (activeTab === 'suppliers') {
                    void fetchSuppliers()
                    return
                  }
                  if (activeTab === 'payments') {
                    void fetchPayments()
                    return
                  }
                  if (activeTab === 'supplier-services') {
                    setSupplierServicesRefreshKey(prev => prev + 1)
                    return
                  }
                  void fetchCostBreakup()
                }}
                disabled={loading || saving}
                aria-label='Refresh data'
                className='inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800 sm:h-auto sm:w-auto sm:px-3 sm:py-2 sm:text-sm sm:font-medium'
              >
                <FaRotate className='text-base' />
                <span className='hidden sm:inline sm:ml-2'>Refresh Data</span>
              </button>
              <div className='relative sm:hidden' ref={menuRef}>
                <button
                  onClick={() => setTabMenuOpen(prev => !prev)}
                  className='inline-flex items-center justify-center rounded-lg border border-gray-300 p-2 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800'
                  aria-label='Toggle finance tabs'
                >
                  <FaBars />
                </button>
                {tabMenuOpen ? (
                  <div className='absolute right-0 z-20 mt-2 w-56 rounded-lg border border-gray-200 bg-white p-2 shadow-xl dark:border-gray-700 dark:bg-gray-900'>
                    {tabItems.map(tab => {
                      const Icon = tab.icon
                      return (
                        <button
                          key={tab.id}
                          onClick={() => handleTabSelection(tab.id)}
                          className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-left ${
                            activeTab === tab.id
                              ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200'
                              : 'text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800'
                          }`}
                        >
                          <Icon className='text-base' />
                          {tab.label}
                        </button>
                      )
                    })}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        {notice ? (
          <div className='mb-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700 dark:border-green-800 dark:bg-green-900/30 dark:text-green-200'>
            {notice}
          </div>
        ) : null}
        {error ? (
          <div className='mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-200'>
            {error}
          </div>
        ) : null}
        {loading || saving ? (
          <p className='mb-4 text-xs text-gray-500 dark:text-gray-400'>
            {saving ? 'Saving changes...' : 'Loading latest data...'}
          </p>
        ) : null}

        {/* Tabs */}
        <div className='mb-6 hidden sm:block'>
          <div className='flex w-full flex-wrap gap-2 border-b border-gray-200 pb-2 dark:border-gray-800'>
            {tabItems.map(tab => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabSelection(tab.id)}
                  className={`flex items-center gap-2 whitespace-nowrap rounded-t-lg px-4 py-2 text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <Icon className='text-base' />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Search and Actions */}
        {activeTab !== 'cost' && activeTab !== 'supplier-services' && (
          <div className='px-0 sm:px-0 lg:px-0 mb-6'>
            <div className='flex flex-col sm:flex-row gap-3'>
              <div className='flex-1 relative'>
                <FaSearch className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm' />
                <input
                  type='text'
                  placeholder={
                    activeTab === 'clients'
                      ? 'Search clients by name, PAN, email, phone, or address...'
                      : activeTab === 'suppliers'
                      ? 'Search suppliers by name, contact person, country, email, phone, tax IDs...'
                      : 'Search payments by booking/payment/reference...'
                  }
                  value={search}
                  onChange={e => {
                    setSearch(e.target.value)
                    setPage(1)
                  }}
                  className='w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-800'
                />
              </div>

              {activeTab === 'clients' && (
                <button
                  onClick={() => {
                    setEditingClient(null)
                    setShowClientModal(true)
                  }}
                  disabled={saving}
                  className='inline-flex w-full items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium sm:w-auto'
                >
                  <FaPlus /> Add Client
                </button>
              )}

              {activeTab === 'suppliers' && (
                <button
                  onClick={() => {
                    setEditingSupplier(null)
                    setShowSupplierModal(true)
                  }}
                  disabled={saving}
                  className='inline-flex w-full items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium sm:w-auto'
                >
                  <FaPlus /> Add Supplier
                </button>
              )}

              {activeTab === 'payments' && (
                <button
                  onClick={() => setShowPaymentModal(true)}
                  disabled={saving}
                  className='inline-flex w-full items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium sm:w-auto'
                >
                  <FaPlus /> Record Payment
                </button>
              )}
            </div>
          </div>
        )}

        {/* Content Area */}
        <div className='px-0 sm:px-0 lg:px-0'>
          {/* Clients Tab */}
          {activeTab === 'clients' && (
            <>
              <SurfaceCard className='mb-4 border border-blue-200 bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-5 dark:border-blue-800 dark:from-blue-950/40 dark:via-gray-900 dark:to-indigo-950/30'>
                <div className='flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between'>
                  <div className='flex items-start gap-3'>
                    <div className='flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-blue-100 dark:bg-blue-900/50'>
                      <FaUser className='text-blue-600 dark:text-blue-400' />
                    </div>
                    <div className='flex-1'>
                      <h3 className='text-base font-semibold text-blue-950 dark:text-blue-100'>
                        Client Onboarding Essentials
                      </h3>
                      <p className='mt-1 max-w-2xl text-sm leading-6 text-blue-900/80 dark:text-blue-100/80'>
                        Finance-first onboarding view. Only billing-ready details are shown:
                        client name, PAN, email, phone, address, and billing currency.
                      </p>
                    </div>
                  </div>

                  <div className='grid grid-cols-2 gap-3 sm:grid-cols-4 xl:min-w-[420px]'>
                    <div className='rounded-2xl border border-blue-200/70 bg-white/85 px-4 py-3 shadow-sm dark:border-blue-800 dark:bg-gray-900/70'>
                      <p className='text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400'>
                        Total
                      </p>
                      <p className='mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100'>
                        {clients.length}
                      </p>
                    </div>
                    <div className='rounded-2xl border border-blue-200/70 bg-white/85 px-4 py-3 shadow-sm dark:border-blue-800 dark:bg-gray-900/70'>
                      <p className='text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400'>
                        Showing
                      </p>
                      <p className='mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100'>
                        {filteredClients.length}
                      </p>
                    </div>
                    <div className='rounded-2xl border border-green-200 bg-green-50/90 px-4 py-3 shadow-sm dark:border-green-800 dark:bg-green-950/30'>
                      <p className='text-[11px] font-semibold uppercase tracking-[0.18em] text-green-700 dark:text-green-300'>
                        KYC Ready
                      </p>
                      <p className='mt-1 text-2xl font-semibold text-green-700 dark:text-green-300'>
                        {completeClientKycCount}
                      </p>
                    </div>
                    <div className='rounded-2xl border border-amber-200 bg-amber-50/90 px-4 py-3 shadow-sm dark:border-amber-800 dark:bg-amber-950/30'>
                      <p className='text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700 dark:text-amber-300'>
                        Needs Review
                      </p>
                      <p className='mt-1 text-2xl font-semibold text-amber-700 dark:text-amber-300'>
                        {incompleteClientKycCount}
                      </p>
                    </div>
                  </div>
                </div>
              </SurfaceCard>
              <SurfaceCard className='overflow-hidden border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900'>
                {paginatedClients.length === 0 ? (
                  <div className='p-8'>
                    <EmptyState
                      title='No clients found'
                      description='Add your first client to get started'
                      icon={<FaUser className='text-4xl' />}
                    />
                  </div>
                ) : (
                  <div className='overflow-x-auto'>
                    <table className='w-full min-w-[920px] text-left text-sm'>
                      <thead className='border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/60'>
                        <tr>
                          <th className='whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400'>
                            Client
                          </th>
                          <th className='whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400'>
                            KYC
                          </th>
                          <th className='whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400'>
                            PAN
                          </th>
                          <th className='whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400'>
                            Contact
                          </th>
                          <th className='min-w-[180px] px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400'>
                            Address
                          </th>
                          <th className='whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400'>
                            Currency
                          </th>
                          <th className='whitespace-nowrap px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400'>
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className='divide-y divide-gray-100 dark:divide-gray-800'>
                        {paginatedClients.map(client => {
                          const missing = getClientMissingFields(client)
                          const kycOk = missing.length === 0
                          return (
                            <tr
                              key={client.id}
                              className='transition-colors hover:bg-gray-50/90 dark:hover:bg-gray-800/50'
                            >
                              <td className='max-w-[200px] px-4 py-3 align-top'>
                                <p className='truncate font-medium text-gray-900 dark:text-gray-100'>
                                  {client.name || 'Unnamed Client'}
                                </p>
                              </td>
                              <td className='whitespace-nowrap px-4 py-3 align-top'>
                                <span
                                  className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                                    kycOk
                                      ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
                                      : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                                  }`}
                                  title={
                                    kycOk
                                      ? 'All onboarding fields present'
                                      : `Missing: ${missing.join(', ')}`
                                  }
                                >
                                  {kycOk ? 'Ready' : 'Incomplete'}
                                </span>
                                {!kycOk ? (
                                  <p className='mt-1 max-w-[140px] text-[11px] leading-snug text-amber-700 dark:text-amber-300'>
                                    {missing.join(', ')}
                                  </p>
                                ) : null}
                              </td>
                              <td className='max-w-[120px] px-4 py-3 align-top text-gray-800 dark:text-gray-200'>
                                <span className='font-mono text-xs'>
                                  {client.pan || '—'}
                                </span>
                              </td>
                              <td className='max-w-[220px] px-4 py-3 align-top'>
                                <p className='break-all text-gray-800 dark:text-gray-200'>
                                  {client.email || '—'}
                                </p>
                                <p className='mt-0.5 text-xs text-gray-500 dark:text-gray-400'>
                                  {client.phone || '—'}
                                </p>
                              </td>
                              <td className='px-4 py-3 align-top text-gray-800 dark:text-gray-200'>
                                <span className='line-clamp-2 text-sm'>
                                  {client.address || '—'}
                                </span>
                              </td>
                              <td className='whitespace-nowrap px-4 py-3 align-top'>
                                <span className='inline-flex rounded-md border border-gray-200 bg-white px-2 py-0.5 text-xs font-medium text-gray-800 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200'>
                                  {client.currency || 'INR'}
                                </span>
                              </td>
                              <td className='whitespace-nowrap px-4 py-3 text-right align-top'>
                                <div className='inline-flex justify-end gap-1'>
                                  <button
                                    type='button'
                                    onClick={() => {
                                      setEditingClient(client)
                                      setShowClientModal(true)
                                    }}
                                    className='rounded-lg p-2 text-gray-500 transition-colors hover:bg-green-50 hover:text-green-600 dark:hover:bg-green-900/20'
                                    title='Edit client'
                                  >
                                    <FaPenToSquare />
                                  </button>
                                  <button
                                    type='button'
                                    onClick={() =>
                                      handleDeleteClient(client.id)
                                    }
                                    className='rounded-lg p-2 text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20'
                                    title='Delete client'
                                  >
                                    <FaTrash />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </SurfaceCard>
            </>
          )}

          {/* Suppliers Tab */}
          {activeTab === 'suppliers' && (
            <>
              <SurfaceCard className='mb-4 border border-blue-200 bg-gradient-to-br from-slate-50 via-white to-blue-50 p-5 dark:border-blue-800 dark:from-slate-950/40 dark:via-gray-900 dark:to-blue-950/25'>
                <div className='flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between'>
                  <div className='flex items-start gap-3'>
                    <div className='flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-blue-100 dark:bg-blue-900/50'>
                      <FaBuilding className='text-blue-600 dark:text-blue-400' />
                    </div>
                    <div className='flex-1'>
                      <h3 className='text-base font-semibold text-blue-950 dark:text-blue-100'>
                        Supplier Onboarding
                      </h3>
                      <p className='mt-1 max-w-2xl text-sm leading-6 text-blue-900/80 dark:text-blue-100/80'>
                        Data matches API: name, contact person, country, tax IDs, address, billing currency (GBP/INR/…), and bank/UPI for payouts.
                      </p>
                    </div>
                  </div>

                  <div className='grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5 xl:min-w-[560px]'>
                    <div className='rounded-2xl border border-blue-200/70 bg-white/85 px-4 py-3 shadow-sm dark:border-blue-800 dark:bg-gray-900/70'>
                      <p className='text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400'>
                        Total
                      </p>
                      <p className='mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100'>
                        {suppliers.length}
                      </p>
                    </div>
                    <div className='rounded-2xl border border-blue-200/70 bg-white/85 px-4 py-3 shadow-sm dark:border-blue-800 dark:bg-gray-900/70'>
                      <p className='text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400'>
                        Showing
                      </p>
                      <p className='mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100'>
                        {filteredSuppliers.length}
                      </p>
                    </div>
                    <div className='rounded-2xl border border-green-200 bg-green-50/90 px-4 py-3 shadow-sm dark:border-green-800 dark:bg-green-950/30'>
                      <p className='text-[11px] font-semibold uppercase tracking-[0.18em] text-green-700 dark:text-green-300'>
                        Active
                      </p>
                      <p className='mt-1 text-2xl font-semibold text-green-700 dark:text-green-300'>
                        {
                          filteredSuppliers.filter(s => s.isActive !== false)
                            .length
                        }
                      </p>
                    </div>
                    <div className='rounded-2xl border border-emerald-200 bg-emerald-50/90 px-4 py-3 shadow-sm dark:border-emerald-800 dark:bg-emerald-950/30'>
                      <p className='text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300'>
                        Banking OK
                      </p>
                      <p className='mt-1 text-2xl font-semibold text-emerald-700 dark:text-emerald-300'>
                        {supplierBankingReadyCount}
                      </p>
                    </div>
                    <div className='rounded-2xl border border-amber-200 bg-amber-50/90 px-4 py-3 shadow-sm dark:border-amber-800 dark:bg-amber-950/30 sm:col-span-2 xl:col-span-1'>
                      <p className='text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700 dark:text-amber-300'>
                        Banking Pending
                      </p>
                      <p className='mt-1 text-2xl font-semibold text-amber-700 dark:text-amber-300'>
                        {supplierBankingIncompleteCount}
                      </p>
                    </div>
                  </div>
                </div>
              </SurfaceCard>
              <SurfaceCard className='overflow-hidden border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900'>
                {paginatedSuppliers.length === 0 ? (
                  <div className='p-8'>
                    <EmptyState
                      title='No suppliers found'
                      description='Add your first supplier to get started'
                      icon={<FaBuilding className='text-4xl' />}
                    />
                  </div>
                ) : (
                  <div className='overflow-x-auto'>
                    <table className='w-full min-w-[1100px] text-left text-sm'>
                      <thead className='border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/60'>
                        <tr>
                          <th className='whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400'>
                            Supplier
                          </th>
                          <th className='whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400'>
                            Country
                          </th>
                          <th className='whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400'>
                            Contact
                          </th>
                          <th className='whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400'>
                            PAN
                          </th>
                          <th className='whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400'>
                            GST
                          </th>
                          <th className='min-w-[160px] px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400'>
                            Address
                          </th>
                          <th className='whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400'>
                            Currency
                          </th>
                          <th className='whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400'>
                            Banking
                          </th>
                          <th className='whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400'>
                            Profile
                          </th>
                          <th className='whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400'>
                            Status
                          </th>
                          <th className='whitespace-nowrap px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400'>
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className='divide-y divide-gray-100 dark:divide-gray-800'>
                        {paginatedSuppliers.map(supplier => {
                          const bankingOk = isSupplierBankingReady(supplier)
                          const missing = getSupplierMissingFields(supplier)
                          const profileOk = missing.length === 0
                          return (
                            <tr
                              key={supplier.id}
                              className='transition-colors hover:bg-gray-50/90 dark:hover:bg-gray-800/50'
                            >
                              <td className='max-w-[200px] px-4 py-3 align-top'>
                                <p className='truncate font-medium text-gray-900 dark:text-gray-100'>
                                  {supplier.name || '—'}
                                </p>
                                {supplier.contactPerson?.trim() ? (
                                  <p className='mt-0.5 text-xs text-gray-500 dark:text-gray-400'>
                                    {supplier.contactPerson.trim()}
                                  </p>
                                ) : (
                                  <p className='mt-0.5 text-xs italic text-gray-400'>
                                    No contact person
                                  </p>
                                )}
                              </td>
                              <td className='max-w-[120px] px-4 py-3 align-top text-gray-800 dark:text-gray-200'>
                                {supplier.country?.trim() || '—'}
                              </td>
                              <td className='max-w-[220px] px-4 py-3 align-top'>
                                <p className='break-all text-gray-800 dark:text-gray-200'>
                                  {supplier.email || '—'}
                                </p>
                                <p className='mt-0.5 text-xs text-gray-500 dark:text-gray-400'>
                                  {supplier.phone || '—'}
                                </p>
                              </td>
                              <td className='px-4 py-3 align-top'>
                                <span className='font-mono text-xs text-gray-800 dark:text-gray-200'>
                                  {supplier.pan?.trim() || '—'}
                                </span>
                              </td>
                              <td className='px-4 py-3 align-top text-gray-800 dark:text-gray-200'>
                                {supplier.gst?.trim() || '—'}
                              </td>
                              <td className='max-w-[200px] px-4 py-3 align-top text-gray-800 dark:text-gray-200'>
                                <span className='line-clamp-2 text-sm'>
                                  {supplier.address?.trim() || '—'}
                                </span>
                              </td>
                              <td className='whitespace-nowrap px-4 py-3 align-top'>
                                <span className='inline-flex rounded-md border border-gray-200 bg-white px-2 py-0.5 text-xs font-medium text-gray-800 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200'>
                                  {supplier.currency || 'INR'}
                                </span>
                              </td>
                              <td className='max-w-[140px] px-4 py-3 align-top'>
                                <span
                                  className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                                    bankingOk
                                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                                      : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                                  }`}
                                  title={
                                    bankingOk
                                      ? 'Bank account or UPI on file'
                                      : 'Add beneficiary + bank + account, or UPI'
                                  }
                                >
                                  {bankingOk ? 'Ready' : 'Incomplete'}
                                </span>
                                {!bankingOk ? (
                                  <p className='mt-1 text-[11px] leading-snug text-amber-700 dark:text-amber-300'>
                                    Bank or UPI required
                                  </p>
                                ) : null}
                              </td>
                              <td className='max-w-[140px] px-4 py-3 align-top'>
                                <span
                                  className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                                    profileOk
                                      ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
                                      : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                                  }`}
                                  title={
                                    profileOk
                                      ? 'PAN, GST, address, banking'
                                      : `Missing: ${missing.join(', ')}`
                                  }
                                >
                                  {profileOk ? 'Complete' : 'Incomplete'}
                                </span>
                                {!profileOk ? (
                                  <p className='mt-1 text-[11px] leading-snug text-amber-700 dark:text-amber-300'>
                                    {missing.join(', ')}
                                  </p>
                                ) : null}
                              </td>
                              <td className='whitespace-nowrap px-4 py-3 align-top'>
                                <span
                                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                                    supplier.isActive !== false
                                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                                      : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
                                  }`}
                                >
                                  {supplier.isActive !== false
                                    ? 'Active'
                                    : 'Inactive'}
                                </span>
                              </td>
                              <td className='whitespace-nowrap px-4 py-3 text-right align-top'>
                                <div className='inline-flex justify-end gap-1'>
                                  <button
                                    type='button'
                                    onClick={() => {
                                      setEditingSupplier(supplier)
                                      setShowSupplierModal(true)
                                    }}
                                    className='rounded-lg p-2 text-gray-500 transition-colors hover:bg-green-50 hover:text-green-600 dark:hover:bg-green-900/20'
                                    title='Edit supplier'
                                  >
                                    <FaPenToSquare />
                                  </button>
                                  <button
                                    type='button'
                                    onClick={() =>
                                      handleDeleteSupplier(supplier.id)
                                    }
                                    disabled={supplier.isActive === false}
                                    className='rounded-lg border border-gray-300 px-2 py-1.5 text-xs text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-40 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800'
                                    title='Deactivate supplier'
                                  >
                                    Deactivate
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </SurfaceCard>
            </>
          )}

          {/* Cost Break-up Tab */}
          {activeTab === 'cost' && (
            <div className='space-y-4'>
              <SurfaceCard className='p-4 border border-blue-200 bg-blue-50/60 dark:border-blue-800 dark:bg-blue-900/20'>
                <div className='flex items-start gap-3'>
                  <div className='flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center'>
                    <FaPercent className='text-blue-600 dark:text-blue-400' />
                  </div>
                  <div className='flex-1'>
                    <h3 className='text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1'>Financial Analysis Dashboard</h3>
                    <p className='text-sm text-blue-800 dark:text-blue-200'>
                      Auto-calculated from quotation finance fields: supplier cost/tax, markup, service fee, GST, TCS, and total sale value. This view is read-only.
                    </p>
                    <div className='mt-2 flex flex-wrap gap-2'>
                      <span className='inline-flex items-center px-2 py-1 rounded-md bg-blue-100 dark:bg-blue-900/50 text-xs font-medium text-blue-700 dark:text-blue-300'>
                        {costBreakup.totalQuotes || 0} Quotations
                      </span>
                      <span className='inline-flex items-center px-2 py-1 rounded-md bg-purple-100 dark:bg-purple-900/50 text-xs font-medium text-purple-700 dark:text-purple-300'>
                        {currencyBreakup.length} {currencyBreakup.length === 1 ? 'Currency' : 'Currencies'}
                      </span>
                    </div>
                  </div>
                </div>
              </SurfaceCard>

              {hasMixedCostCurrencies ? (
                <SurfaceCard className='p-4 border border-amber-200 bg-amber-50/70 dark:border-amber-800 dark:bg-amber-900/20'>
                  <p className='text-sm text-amber-800 dark:text-amber-200'>
                    Multiple currencies detected. For exact monetary totals,
                    apply a single currency filter.
                  </p>
                </SurfaceCard>
              ) : null}

              <SurfaceCard className='border border-gray-200 p-4 dark:border-gray-800'>
                <div className='flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between'>
                  <div>
                    <p className='text-sm font-semibold text-gray-900 dark:text-gray-100'>
                      Cost filters
                    </p>
                    <p className='text-xs text-gray-500 dark:text-gray-400'>
                      Filter quotation finance data by date window, currency,
                      and row count.
                    </p>
                  </div>
                  <button
                    onClick={() => void fetchCostBreakup()}
                    className='w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 sm:w-auto'
                  >
                    Refresh Cost Break-up
                  </button>
                </div>
                <div className='mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4'>
                  <div className='min-w-0'>
                    <label className='field-label'>From</label>
                    <input
                      type='date'
                      className='field-input'
                      value={costFilters.from}
                      onChange={e =>
                        setCostFilters({
                          ...costFilters,
                          from: e.target.value,
                          page: 1
                        })
                      }
                    />
                  </div>
                  <div className='min-w-0'>
                    <label className='field-label'>To</label>
                    <input
                      type='date'
                      className='field-input'
                      value={costFilters.to}
                      onChange={e =>
                        setCostFilters({
                          ...costFilters,
                          to: e.target.value,
                          page: 1
                        })
                      }
                    />
                  </div>
                  <div className='min-w-0'>
                    <label className='field-label'>Currency</label>
                    <SearchableDropdown
                      value={costFilters.currency}
                      onChange={value =>
                        setCostFilters({
                          ...costFilters,
                          currency: value,
                          page: 1
                        })
                      }
                      options={[
                        { value: '', label: 'All' },
                        { value: 'USD', label: 'USD' },
                        { value: 'EUR', label: 'EUR' },
                        { value: 'GBP', label: 'GBP' },
                        { value: 'INR', label: 'INR' },
                        { value: 'AED', label: 'AED' }
                      ]}
                      placeholder='Select currency'
                      className='w-full'
                    />
                  </div>
                  <div className='min-w-0'>
                    <label className='field-label'>Rows</label>
                    <SearchableDropdown
                      value={String(costFilters.limit)}
                      onChange={value =>
                        setCostFilters({
                          ...costFilters,
                          limit: toNumber(value, 10),
                          page: 1
                        })
                      }
                      options={[
                        { value: '10', label: '10' },
                        { value: '20', label: '20' },
                        { value: '50', label: '50' }
                      ]}
                      placeholder='Select rows'
                      className='w-full'
                    />
                  </div>
                  <div className='md:col-span-2 xl:col-span-4'>
                    <div className='flex flex-col gap-2 sm:flex-row sm:justify-end'>
                      <button
                        onClick={() => void fetchCostBreakup()}
                        className='w-full rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 sm:w-auto dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800'
                      >
                        Apply Filters
                      </button>
                    </div>
                  </div>
                </div>
              </SurfaceCard>

              <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4'>
                {[
                  {
                    label: 'Total Quotations',
                    value: (costBreakup.totalQuotes ?? 0).toLocaleString()
                  },
                  {
                    label: 'Supplier Cost',
                    value: formatCurrency(
                      costBreakup.supplierCost,
                      costBreakup.currency
                    )
                  },
                  {
                    label: 'Supplier Tax',
                    value: formatCurrency(
                      costBreakup.supplierTax,
                      costBreakup.currency
                    )
                  },
                  {
                    label: 'Markup',
                    value: formatCurrency(
                      costBreakup.markup,
                      costBreakup.currency
                    )
                  },
                  {
                    label: 'Service Fee',
                    value: formatCurrency(
                      costBreakup.serviceFee,
                      costBreakup.currency
                    )
                  },
                  {
                    label: 'GST',
                    value: formatCurrency(costBreakup.gst, costBreakup.currency)
                  },
                  {
                    label: 'TCS',
                    value: formatCurrency(costBreakup.tcs, costBreakup.currency)
                  },
                  {
                    label: 'Total Sale Value',
                    value: formatCurrency(
                      costBreakup.totalValue,
                      costBreakup.currency
                    )
                  }
                ].map(card => (
                  <SurfaceCard
                    key={card.label}
                    className='min-w-0 border border-gray-200 p-4 dark:border-gray-800'
                  >
                    <p className='text-xs uppercase tracking-wide text-gray-500'>
                      {card.label}
                    </p>
                    <p className='mt-2 break-words text-xl font-semibold text-gray-900 dark:text-gray-100'>
                      {card.value}
                    </p>
                  </SurfaceCard>
                ))}
              </div>

              <SurfaceCard className='overflow-hidden border border-gray-200 dark:border-gray-800'>
                <div className='px-4 py-3 border-b border-gray-200 dark:border-gray-800'>
                  <h3 className='text-sm font-semibold text-gray-900 dark:text-gray-100'>
                    Currency Breakdown
                  </h3>
                  <p className='mt-1 text-xs text-gray-500 dark:text-gray-400'>
                    Totals grouped by quotation currency so finance team can
                    review margin and tax mix clearly.
                  </p>
                </div>
                {currencyBreakup.length === 0 ? (
                  <div className='p-4 text-sm text-gray-500'>
                    No currency data found.
                  </div>
                ) : (
                  <>
                    <div className='divide-y divide-gray-100 dark:divide-gray-800 xl:hidden'>
                      {currencyBreakup.map(row => (
                        <div key={row.currency} className='space-y-3 p-4'>
                          <div className='flex flex-wrap items-start justify-between gap-2'>
                            <div>
                              <p className='text-sm font-semibold text-gray-900 dark:text-gray-100'>
                                {row.currency}
                              </p>
                              <p className='text-xs text-gray-500 dark:text-gray-400'>
                                {row.totalQuotes.toLocaleString()} quotations
                              </p>
                            </div>
                            <span className='rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'>
                              {formatCurrency(row.totalSaleValue, row.currency)}
                            </span>
                          </div>
                          <div className='grid grid-cols-1 gap-3 min-[420px]:grid-cols-2'>
                            {[
                              [
                                'Supplier Cost',
                                formatCurrency(row.supplierCost, row.currency)
                              ],
                              [
                                'Supplier Tax',
                                formatCurrency(
                                  row.supplierTaxAmount,
                                  row.currency
                                )
                              ],
                              [
                                'Markup',
                                formatCurrency(row.markupAmount, row.currency)
                              ],
                              [
                                'Service Fee',
                                formatCurrency(
                                  row.serviceFeeAmount,
                                  row.currency
                                )
                              ],
                              [
                                'GST',
                                formatCurrency(row.gstAmount, row.currency)
                              ],
                              [
                                'TCS',
                                formatCurrency(row.tcsAmount, row.currency)
                              ]
                            ].map(([label, value]) => (
                              <div
                                key={`${row.currency}-${label}`}
                                className='rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/40'
                              >
                                <p className='text-[11px] uppercase tracking-wide text-gray-500'>
                                  {label}
                                </p>
                                <p className='mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100'>
                                  {value}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className='hidden overflow-x-auto xl:block'>
                      <table className='w-full min-w-[960px]'>
                        <thead className='bg-gray-50 dark:bg-gray-800/50'>
                          <tr>
                            <th className='px-4 py-3 text-left text-xs font-semibold text-gray-500'>
                              Currency
                            </th>
                            <th className='px-4 py-3 text-right text-xs font-semibold text-gray-500'>
                              Quotes
                            </th>
                            <th className='px-4 py-3 text-right text-xs font-semibold text-gray-500'>
                              Supplier Cost
                            </th>
                            <th className='px-4 py-3 text-right text-xs font-semibold text-gray-500'>
                              Supplier Tax
                            </th>
                            <th className='px-4 py-3 text-right text-xs font-semibold text-gray-500'>
                              Markup
                            </th>
                            <th className='px-4 py-3 text-right text-xs font-semibold text-gray-500'>
                              Service Fee
                            </th>
                            <th className='px-4 py-3 text-right text-xs font-semibold text-gray-500'>
                              GST
                            </th>
                            <th className='px-4 py-3 text-right text-xs font-semibold text-gray-500'>
                              TCS
                            </th>
                            <th className='px-4 py-3 text-right text-xs font-semibold text-gray-500'>
                              Total Sale
                            </th>
                          </tr>
                        </thead>
                        <tbody className='divide-y divide-gray-100 dark:divide-gray-800'>
                          {currencyBreakup.map(row => (
                            <tr key={row.currency}>
                              <td className='px-4 py-3 text-sm font-medium'>
                                {row.currency}
                              </td>
                              <td className='px-4 py-3 text-sm text-right'>
                                {row.totalQuotes.toLocaleString()}
                              </td>
                              <td className='px-4 py-3 text-sm text-right'>
                                {formatCurrency(row.supplierCost, row.currency)}
                              </td>
                              <td className='px-4 py-3 text-sm text-right'>
                                {formatCurrency(
                                  row.supplierTaxAmount,
                                  row.currency
                                )}
                              </td>
                              <td className='px-4 py-3 text-sm text-right'>
                                {formatCurrency(row.markupAmount, row.currency)}
                              </td>
                              <td className='px-4 py-3 text-sm text-right'>
                                {formatCurrency(
                                  row.serviceFeeAmount,
                                  row.currency
                                )}
                              </td>
                              <td className='px-4 py-3 text-sm text-right'>
                                {formatCurrency(row.gstAmount, row.currency)}
                              </td>
                              <td className='px-4 py-3 text-sm text-right'>
                                {formatCurrency(row.tcsAmount, row.currency)}
                              </td>
                              <td className='px-4 py-3 text-sm text-right font-semibold'>
                                {formatCurrency(
                                  row.totalSaleValue,
                                  row.currency
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </SurfaceCard>

              <SurfaceCard className='overflow-hidden border border-gray-200 dark:border-gray-800'>
                <div className='px-4 py-3 border-b border-gray-200 dark:border-gray-800'>
                  <h3 className='text-sm font-semibold text-gray-900 dark:text-gray-100'>
                    Quotation Cost Rows
                  </h3>
                  <p className='mt-1 text-xs text-gray-500 dark:text-gray-400'>
                    Row-level quotation finance snapshot from backend
                    calculations.
                  </p>
                </div>
                {costRows.length === 0 ? (
                  <div className='p-4 text-sm text-gray-500'>
                    No quotation-level cost rows found.
                  </div>
                ) : (
                  <>
                    <div className='divide-y divide-gray-100 dark:divide-gray-800 xl:hidden'>
                      {costRows.map(row => (
                        <div key={row.id} className='space-y-3 p-4'>
                          <div className='flex items-start justify-between gap-3'>
                            <div>
                              <p className='text-sm font-semibold text-gray-900 dark:text-gray-100'>
                                {row.quoteNumber || 'Draft quotation'}
                              </p>
                              <p className='text-xs text-gray-500 dark:text-gray-400'>
                                {row.leadName || 'Lead not linked'}
                              </p>
                            </div>
                            <span className='rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-300'>
                              {String(row.status || 'UNKNOWN').replace(
                                /_/g,
                                ' '
                              )}
                            </span>
                          </div>
                          <div className='grid grid-cols-1 gap-3 min-[420px]:grid-cols-2'>
                            {[
                              [
                                'Supplier Cost',
                                formatCurrency(
                                  row.supplierCost,
                                  row.effectiveCurrency
                                )
                              ],
                              [
                                'Supplier Tax',
                                formatCurrency(
                                  row.supplierTaxAmount,
                                  row.effectiveCurrency
                                )
                              ],
                              [
                                'Markup',
                                formatCurrency(
                                  row.markupAmount,
                                  row.effectiveCurrency
                                )
                              ],
                              [
                                'Service Fee',
                                formatCurrency(
                                  row.serviceFeeAmount,
                                  row.effectiveCurrency
                                )
                              ],
                              [
                                'GST',
                                formatCurrency(
                                  row.gstAmount,
                                  row.effectiveCurrency
                                )
                              ],
                              [
                                'TCS',
                                formatCurrency(
                                  row.tcsAmount,
                                  row.effectiveCurrency
                                )
                              ],
                              [
                                'Total Sale',
                                formatCurrency(
                                  row.totalSaleValue,
                                  row.effectiveCurrency
                                )
                              ],
                              ['Currency', row.effectiveCurrency]
                            ].map(([label, value]) => (
                              <div
                                key={`${row.id}-${label}`}
                                className='rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/40'
                              >
                                <p className='text-[11px] uppercase tracking-wide text-gray-500'>
                                  {label}
                                </p>
                                <p className='mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100'>
                                  {value}
                                </p>
                              </div>
                            ))}
                          </div>
                          <p className='text-xs text-gray-500 dark:text-gray-400'>
                            Created:{' '}
                            {row.createdAt
                              ? new Date(row.createdAt).toLocaleString()
                              : '-'}
                          </p>
                        </div>
                      ))}
                    </div>
                    <div className='hidden overflow-x-auto xl:block'>
                      <table className='w-full min-w-[1040px]'>
                        <thead className='bg-gray-50 dark:bg-gray-800/50'>
                          <tr>
                            <th className='px-4 py-3 text-left text-xs font-semibold text-gray-500'>
                              Quote
                            </th>
                            <th className='px-4 py-3 text-left text-xs font-semibold text-gray-500'>
                              Lead
                            </th>
                            <th className='px-4 py-3 text-left text-xs font-semibold text-gray-500'>
                              Status
                            </th>
                            <th className='px-4 py-3 text-right text-xs font-semibold text-gray-500'>
                              Supplier Cost
                            </th>
                            <th className='px-4 py-3 text-right text-xs font-semibold text-gray-500'>
                              Supplier Tax
                            </th>
                            <th className='px-4 py-3 text-right text-xs font-semibold text-gray-500'>
                              Markup
                            </th>
                            <th className='px-4 py-3 text-right text-xs font-semibold text-gray-500'>
                              Service Fee
                            </th>
                            <th className='px-4 py-3 text-right text-xs font-semibold text-gray-500'>
                              GST
                            </th>
                            <th className='px-4 py-3 text-right text-xs font-semibold text-gray-500'>
                              TCS
                            </th>
                            <th className='px-4 py-3 text-right text-xs font-semibold text-gray-500'>
                              Total Sale
                            </th>
                            <th className='px-4 py-3 text-left text-xs font-semibold text-gray-500'>
                              Currency
                            </th>
                            <th className='px-4 py-3 text-left text-xs font-semibold text-gray-500'>
                              Created
                            </th>
                          </tr>
                        </thead>
                        <tbody className='divide-y divide-gray-100 dark:divide-gray-800'>
                          {costRows.map(row => (
                            <tr key={row.id}>
                              <td className='px-4 py-3 text-sm font-medium'>
                                {row.quoteNumber || 'Draft'}
                              </td>
                              <td className='px-4 py-3 text-sm'>
                                {row.leadName || '-'}
                              </td>
                              <td className='px-4 py-3 text-sm'>
                                {row.status || '-'}
                              </td>
                              <td className='px-4 py-3 text-sm text-right'>
                                {formatCurrency(
                                  row.supplierCost,
                                  row.effectiveCurrency
                                )}
                              </td>
                              <td className='px-4 py-3 text-sm text-right'>
                                {formatCurrency(
                                  row.supplierTaxAmount,
                                  row.effectiveCurrency
                                )}
                              </td>
                              <td className='px-4 py-3 text-sm text-right'>
                                {formatCurrency(
                                  row.markupAmount,
                                  row.effectiveCurrency
                                )}
                              </td>
                              <td className='px-4 py-3 text-sm text-right'>
                                {formatCurrency(
                                  row.serviceFeeAmount,
                                  row.effectiveCurrency
                                )}
                              </td>
                              <td className='px-4 py-3 text-sm text-right'>
                                {formatCurrency(
                                  row.gstAmount,
                                  row.effectiveCurrency
                                )}
                              </td>
                              <td className='px-4 py-3 text-sm text-right'>
                                {formatCurrency(
                                  row.tcsAmount,
                                  row.effectiveCurrency
                                )}
                              </td>
                              <td className='px-4 py-3 text-sm text-right font-semibold'>
                                {formatCurrency(
                                  row.totalSaleValue,
                                  row.effectiveCurrency
                                )}
                              </td>
                              <td className='px-4 py-3 text-sm'>
                                {row.effectiveCurrency}
                              </td>
                              <td className='px-4 py-3 text-sm'>
                                {row.createdAt
                                  ? new Date(row.createdAt).toLocaleString()
                                  : '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
                <div className='flex flex-col items-start justify-between gap-3 border-t border-gray-200 px-4 py-3 dark:border-gray-800 sm:flex-row sm:items-center'>
                  <p className='text-xs text-gray-500'>
                    Page {costPagination.page} of {costPagination.totalPages}
                  </p>
                  <div className='flex items-center gap-2'>
                    <button
                      onClick={() =>
                        setCostFilters({
                          ...costFilters,
                          page: Math.max(1, costFilters.page - 1)
                        })
                      }
                      disabled={costPagination.page <= 1}
                      className='p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 disabled:opacity-40'
                    >
                      <FaChevronLeft className='text-sm' />
                    </button>
                    <button
                      onClick={() =>
                        setCostFilters({
                          ...costFilters,
                          page: Math.min(
                            costPagination.totalPages,
                            costFilters.page + 1
                          )
                        })
                      }
                      disabled={
                        costPagination.page >= costPagination.totalPages
                      }
                      className='p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 disabled:opacity-40'
                    >
                      <FaChevronRight className='text-sm' />
                    </button>
                  </div>
                </div>
              </SurfaceCard>
            </div>
          )}

          {/* Payments Tab */}
          {activeTab === 'payments' && (
            <SurfaceCard className='overflow-hidden border border-gray-200 dark:border-gray-800'>
              {paginatedPayments.length === 0 ? (
                <div className='p-8'>
                  <EmptyState
                    title='No payments found'
                    description='Record your first payment to get started'
                    icon={<FaCreditCard className='text-4xl' />}
                  />
                </div>
              ) : (
                <>
                  {/* Desktop Table */}
                  <div className='hidden md:block overflow-x-auto'>
                    <table className='w-full min-w-[980px]'>
                      <thead className='bg-gray-50 dark:bg-gray-800/50'>
                        <tr>
                          <th className='px-6 py-3 text-left text-xs font-semibold text-gray-500'>
                            Booking / Payment ID
                          </th>
                          <th className='px-6 py-3 text-left text-xs font-semibold text-gray-500'>
                            Mode
                          </th>
                          <th className='px-6 py-3 text-right text-xs font-semibold text-gray-500'>
                            Amount
                          </th>
                          <th className='px-6 py-3 text-left text-xs font-semibold text-gray-500'>
                            Date
                          </th>
                          <th className='px-6 py-3 text-left text-xs font-semibold text-gray-500'>
                            Reference
                          </th>
                          <th className='px-6 py-3 text-left text-xs font-semibold text-gray-500'>
                            Status
                          </th>
                          <th className='px-6 py-3 text-right text-xs font-semibold text-gray-500'>
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className='divide-y divide-gray-100 dark:divide-gray-800'>
                        {paginatedPayments.map(payment => (
                          <tr
                            key={payment.id}
                            className='hover:bg-gray-50 dark:hover:bg-gray-800/50'
                          >
                            <td className='px-6 py-4 text-sm font-medium text-blue-600'>
                              <p>{getBookingDisplay(payment.bookingId)}</p>
                              <p className='text-xs text-gray-500'>
                                {payment.id}
                              </p>
                            </td>
                            <td className='px-6 py-4 text-sm text-gray-700'>
                              {paymentModeLabel(payment.mode)}
                            </td>
                            <td className='px-6 py-4 text-right text-sm font-medium text-gray-900'>
                              {formatCurrency(payment.amount, payment.currency)}
                            </td>
                            <td className='px-6 py-4 text-sm text-gray-700'>
                              {formatDateTime(payment.date)}
                            </td>
                            <td className='px-6 py-4 text-sm text-gray-700'>
                              {payment.reference || '-'}
                            </td>
                            <td className='px-6 py-4'>
                              <span
                                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                  payment.status === 'completed'
                                    ? 'bg-green-100 text-green-800'
                                    : payment.status === 'pending'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-red-100 text-red-800'
                                }`}
                              >
                                {payment.status}
                              </span>
                            </td>
                            <td className='px-6 py-4 text-right'>
                              {payment.status !== 'completed' ? (
                                <button
                                  onClick={() =>
                                    handleVerifyPayment(payment.id)
                                  }
                                  disabled={saving}
                                  className='px-2 py-1 text-xs rounded-lg border border-green-300 text-green-700 hover:bg-green-50 disabled:opacity-40'
                                >
                                  Verify
                                </button>
                              ) : (
                                <span className='text-xs text-gray-400'>
                                  Verified
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Cards */}
                  <div className='md:hidden divide-y divide-gray-100 dark:divide-gray-800'>
                    {paginatedPayments.map(payment => (
                      <div key={payment.id} className='p-4 space-y-2'>
                        <div className='flex items-start justify-between'>
                          <div>
                            <p className='text-sm font-medium text-blue-600'>
                              {getBookingDisplay(payment.bookingId)}
                            </p>
                            <p className='text-[11px] text-gray-500'>
                              {payment.id}
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
                        <div className='flex flex-wrap items-center justify-between gap-2'>
                          <span className='text-sm'>
                            {paymentModeLabel(payment.mode)}
                          </span>
                          <span className='text-sm font-bold text-gray-900'>
                            {formatCurrency(payment.amount, payment.currency)}
                          </span>
                        </div>
                        <p className='text-xs text-gray-600'>
                          Date: {formatDateTime(payment.date)}
                        </p>
                        {payment.reference && (
                          <p className='text-xs text-gray-600'>
                            Ref: {payment.reference}
                          </p>
                        )}
                        {payment.status !== 'completed' ? (
                          <button
                            onClick={() => handleVerifyPayment(payment.id)}
                            disabled={saving}
                            className='mt-1 px-2 py-1 text-[11px] rounded border border-green-300 text-green-700 disabled:opacity-40'
                          >
                            Verify Payment
                          </button>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </SurfaceCard>
          )}

          {/* Supplier Services Tab */}
          {activeTab === 'supplier-services' && (
            <SupplierServiceBreakdown refreshKey={supplierServicesRefreshKey} />
          )}
          {/* Pagination */}
          {(activeTab === 'clients' && filteredClients.length > pageSize) ||
          (activeTab === 'suppliers' && filteredSuppliers.length > pageSize) ||
          (activeTab === 'payments' && filteredPayments.length > pageSize) ? (
            <div className='flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-4 border-t border-gray-200 dark:border-gray-800'>
              <p className='text-xs sm:text-sm text-gray-500 order-2 sm:order-1'>
                Showing{' '}
                {Math.min(
                  activeTab === 'clients'
                    ? filteredClients.length
                    : activeTab === 'suppliers'
                    ? filteredSuppliers.length
                    : filteredPayments.length,
                  (page - 1) * pageSize + 1
                )}
                -
                {Math.min(
                  activeTab === 'clients'
                    ? filteredClients.length
                    : activeTab === 'suppliers'
                    ? filteredSuppliers.length
                    : filteredPayments.length,
                  page * pageSize
                )}{' '}
                of{' '}
                {activeTab === 'clients'
                  ? filteredClients.length
                  : activeTab === 'suppliers'
                  ? filteredSuppliers.length
                  : filteredPayments.length}
              </p>
              <div className='flex items-center gap-2 order-1 sm:order-2'>
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className='p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 disabled:opacity-40'
                >
                  <FaChevronLeft className='text-sm' />
                </button>
                <span className='px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 text-sm font-medium'>
                  {page}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className='p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 disabled:opacity-40'
                >
                  <FaChevronRight className='text-sm' />
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Modals */}
      <ClientModal
        key={`client-${
          showClientModal ? editingClient?.id ?? 'new' : 'closed'
        }`}
        isOpen={showClientModal}
        onClose={() => {
          setShowClientModal(false)
          setEditingClient(null)
        }}
        onSave={editingClient ? handleUpdateClient : handleAddClient}
        client={editingClient}
      />

      <SupplierModal
        key={`supplier-${
          showSupplierModal ? editingSupplier?.id ?? 'new' : 'closed'
        }`}
        isOpen={showSupplierModal}
        onClose={() => {
          setShowSupplierModal(false)
          setEditingSupplier(null)
        }}
        onSave={editingSupplier ? handleUpdateSupplier : handleAddSupplier}
        supplier={editingSupplier}
      />

      <PaymentModal
        key={`payment-${showPaymentModal ? 'open' : 'closed'}`}
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onSave={handleAddPayment}
        bookings={bookingLookups}
      />

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

export default FinanceSystem
