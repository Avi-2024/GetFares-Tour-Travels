import React, { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { FaArrowLeft, FaRotate, FaWallet, FaUsers, FaMoneyBill, FaCircleCheck, FaCircleXmark, FaTrash, FaPlus } from 'react-icons/fa6'
import SurfaceCard from '../../components/ui/SurfaceCard'
import { suppliersApi } from '../../api/suppliers'
import { reportApiError } from '../../lib/notify'
import { formatCurrency } from '../../utils/currency'
import { currencyService } from '../../services/currencyService'

interface Supplier {
  id: string
  name: string
  contactPerson?: string
  phone?: string
  email?: string
  country?: string
  supplierCurrency?: string
  contractUrl?: string
  rateValidUntil?: string
  paymentDeadlineDate?: string
  productionCommitment?: string
  isActive?: boolean
  panNumber?: string
  gstNumber?: string
  addressLine?: string
  invoiceBeneficiaryName?: string
  invoiceBankName?: string
  invoiceAccountNumber?: string
  invoiceIfscSwift?: string
  invoiceUpiId?: string
}

interface SupplierPayable {
  id: string
  bookingId: string
  payableAmount: number
  paidAmount: number
  dueDate?: string
  dueInDays?: number | null
  status: 'PENDING' | 'PARTIAL' | 'PAID'
  paymentReference?: string
}

interface SupplierBooking {
  id: string
  bookingId: string
  customer: string
  destination: string
  serviceName: string
  supplierBasePrice: number
  supplierSellValue: number
  matchedServices: Array<{
    name: string
    basePrice: number
    sellValue: number
  }>
  totalAmount: number
  currency: string
  status: string
  travelStartDate?: string
}

const unwrapObject = (payload: unknown): any => (payload as { data?: unknown })?.data ?? payload
const unwrapList = (payload: unknown): any[] => {
  const data = (payload as { data?: unknown })?.data ?? payload
  if (Array.isArray((data as { data?: unknown[] })?.data)) return (data as { data: unknown[] }).data
  if (Array.isArray((data as { items?: unknown[] })?.items)) return (data as { items: unknown[] }).items
  if (Array.isArray(data)) return data
  return []
}

const toNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const SERVICE_LABEL_BY_KEY: Record<string, string> = {
  hotel: 'Accommodation',
  flights: 'Flights',
  tours: 'Tours & Activities',
  visa: 'Visa Services',
  insurance: 'Insurance',
  insurance2: 'Land Arrangement'
}

const SERVICE_LABEL_BY_TYPE: Record<string, string> = {
  HOTEL: 'Accommodation',
  FLIGHT: 'Flights',
  TRANSFER: 'Land Arrangement',
  VISA: 'Visa Services',
  INSURANCE: 'Insurance',
  OTHER: 'Other'
}

const normalizeServiceName = (value?: unknown) => {
  const raw = String(value ?? '').trim()
  if (!raw) return 'Other'
  const mappedByKey = SERVICE_LABEL_BY_KEY[raw.toLowerCase()]
  if (mappedByKey) return mappedByKey
  const mappedByType = SERVICE_LABEL_BY_TYPE[raw.toUpperCase()]
  if (mappedByType) return mappedByType
  return raw
}

const formatDate = (value?: string | null) => {
  if (!value) return 'Not set'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Not set'
  return date.toLocaleDateString()
}

const mapSupplier = (raw: any): Supplier => ({
  id: String(raw?.id ?? ''),
  name: String(raw?.name ?? 'Unknown Supplier'),
  contactPerson: raw?.contactPerson ?? raw?.contact_person ?? '',
  phone: raw?.phone ?? '',
  email: raw?.email ?? '',
  country: raw?.country ?? '',
  supplierCurrency: raw?.supplierCurrency ?? raw?.supplier_currency ?? 'INR',
  contractUrl: raw?.contractUrl ?? raw?.contract_url ?? '',
  rateValidUntil: raw?.rateValidUntil ?? raw?.rate_valid_until ?? '',
  paymentDeadlineDate: raw?.paymentDeadlineDate ?? raw?.payment_deadline_date ?? '',
  productionCommitment: raw?.productionCommitment ?? raw?.production_commitment ?? '',
  isActive: raw?.isActive ?? raw?.is_active ?? true,
  panNumber: raw?.panNumber ?? raw?.pan_number ?? '',
  gstNumber: raw?.gstNumber ?? raw?.gst_number ?? '',
  addressLine: raw?.addressLine ?? raw?.address_line ?? raw?.address ?? '',
  invoiceBeneficiaryName: raw?.invoiceBeneficiaryName ?? raw?.invoice_beneficiary_name ?? '',
  invoiceBankName: raw?.invoiceBankName ?? raw?.invoice_bank_name ?? '',
  invoiceAccountNumber: raw?.invoiceAccountNumber ?? raw?.invoice_account_number ?? '',
  invoiceIfscSwift: raw?.invoiceIfscSwift ?? raw?.invoice_ifsc_swift ?? '',
  invoiceUpiId: raw?.invoiceUpiId ?? raw?.invoice_upi_id ?? ''
})

const mapPayable = (raw: any): SupplierPayable => ({
  id: String(raw?.id ?? ''),
  bookingId: String(raw?.bookingId ?? raw?.booking_id ?? ''),
  payableAmount: toNumber(raw?.payableAmount ?? raw?.payable_amount, 0),
  paidAmount: toNumber(raw?.paidAmount ?? raw?.paid_amount, 0),
  dueDate: raw?.dueDate ?? raw?.due_date ?? '',
  dueInDays: raw?.dueInDays === null || raw?.dueInDays === undefined ? null : toNumber(raw?.dueInDays, 0),
  status: String(raw?.status ?? 'PENDING').toUpperCase() as SupplierPayable['status'],
  paymentReference: raw?.paymentReference ?? raw?.payment_reference ?? ''
})

const SupplierDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [loadingPayables, setLoadingPayables] = useState(false)
  const [loadingBookings, setLoadingBookings] = useState(false)
  const [error, setError] = useState('')
  const [supplier, setSupplier] = useState<Supplier | null>(null)
  const [payables, setPayables] = useState<SupplierPayable[]>([])
  const [bookings, setBookings] = useState<SupplierBooking[]>([])
  const [deleting, setDeleting] = useState(false)

  const [payableBookingUuid, setPayableBookingUuid] = useState('')
  const [rateSource, setRateSource] = useState<'api' | 'custom'>('api')
  const [customUnitRate, setCustomUnitRate] = useState('')
  const [payableLedgerAmount, setPayableLedgerAmount] = useState('')
  const [fxLoading, setFxLoading] = useState(false)
  const [fxError, setFxError] = useState('')
  const [creatingPayable, setCreatingPayable] = useState(false)
  const [ratesMeta, setRatesMeta] = useState<{ base: string; source: string } | null>(null)

  const ledgerCurrency = (supplier?.supplierCurrency || 'INR').toUpperCase()

  const selectedPayableBooking = useMemo(
    () => bookings.find(b => b.id === payableBookingUuid) ?? null,
    [bookings, payableBookingUuid]
  )

  const supplierBaseTotalsByCurrency = useMemo(
    () =>
      Object.entries(
        bookings.reduce<Record<string, number>>((acc, b) => {
          const code = String(b.currency || 'INR').toUpperCase()
          acc[code] = (acc[code] || 0) + b.supplierBasePrice
          return acc
        }, {})
      )
        .map(([currency, amount]) => ({ currency, amount }))
        .sort((a, b) => b.amount - a.amount),
    [bookings]
  )

  const loadSupplier = async () => {
    if (!id) return
    setLoading(true)
    setError('')
    try {
      const response = await suppliersApi.getById(id)
      setSupplier(mapSupplier(unwrapObject(response)))
    } catch (err) {
      reportApiError(err, 'Failed to load supplier', setError)
    } finally {
      setLoading(false)
    }
  }

  const loadPayables = async () => {
    if (!id) return
    setLoadingPayables(true)
    try {
      const response = await suppliersApi.listPayables(id, { page: 1, limit: 200 })
      setPayables(unwrapList(response).map(mapPayable))
    } catch (err) {
      reportApiError(err, 'Failed to load payables', setError)
    } finally {
      setLoadingPayables(false)
    }
  }

  const loadBookings = async () => {
    if (!id) return
    setLoadingBookings(true)
    try {
      const response = await suppliersApi.listBookings(id, { limit: 500 })
      const bookings = unwrapList(response)
      
      const mapped = bookings.map((b: any) => {
        const rawMatchedServices = b?.matchedServices ?? b?.matched_services
        return {
          id: String(b?.id ?? ''),
          bookingId: String(b?.bookingNumber ?? b?.bookingId ?? b?.id ?? ''),
          customer: String(b?.customer ?? 'Unknown Customer'),
          destination: String(b?.destination ?? 'N/A'),
          serviceName: String(
            b?.serviceName ??
              b?.service_name ??
              b?.serviceNames ??
              b?.service_names ??
              b?.serviceType ??
              b?.itemType ??
              'Other'
          )
            .split(',')
            .map((item: string) => normalizeServiceName(item))
            .filter((item: string) => Boolean(item))
            .join(', '),
          supplierBasePrice: toNumber(b?.supplierBasePrice ?? b?.supplier_base_price ?? 0),
          supplierSellValue: toNumber(b?.supplierSellValue ?? b?.supplier_sell_value ?? 0),
          matchedServices: Array.isArray(rawMatchedServices)
            ? rawMatchedServices.map((item: any) => ({
                name: String(item?.name ?? 'Other'),
                basePrice: toNumber(item?.basePrice ?? item?.base_price ?? 0),
                sellValue: toNumber(item?.sellValue ?? item?.sell_value ?? 0)
              }))
            : [],
          totalAmount: toNumber(b?.totalAmount ?? 0),
          currency: String(b?.currency ?? 'INR'),
          status: String(b?.status ?? 'pending'),
          travelStartDate: b?.travelStartDate
        }
      })
      
      setBookings(mapped)
    } catch (err) {
      reportApiError(err, 'Failed to load bookings', setError)
    } finally {
      setLoadingBookings(false)
    }
  }

  useEffect(() => {
    void loadSupplier()
    void loadPayables()
    void loadBookings()
  }, [id])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const r = await currencyService.getRates()
        if (!cancelled) {
          setRatesMeta({ base: r.baseCurrency, source: r.source })
        }
      } catch {
        if (!cancelled) setRatesMeta(null)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!selectedPayableBooking || !supplier) {
      setPayableLedgerAmount('')
      setFxError('')
      setFxLoading(false)
      return
    }
    const from = String(selectedPayableBooking.currency || 'INR').toUpperCase()
    const to = ledgerCurrency
    const base = selectedPayableBooking.supplierBasePrice

    if (from === to) {
      setPayableLedgerAmount(String(Number(base.toFixed(2))))
      setFxError('')
      setFxLoading(false)
      return
    }

    if (rateSource === 'custom') {
      const r = parseFloat(String(customUnitRate).replace(/,/g, ''))
      if (!Number.isFinite(r) || r <= 0) {
        setPayableLedgerAmount('')
        setFxError('Enter rate: 1 ' + from + ' = ? ' + to)
        setFxLoading(false)
        return
      }
      setFxError('')
      setPayableLedgerAmount(String(Number((base * r).toFixed(2))))
      setFxLoading(false)
      return
    }

    let cancelled = false
    setFxLoading(true)
    setFxError('')
    void (async () => {
      try {
        const converted = await currencyService.convert(base, from, to)
        if (!cancelled) {
          setPayableLedgerAmount(String(Number(converted.toFixed(2))))
        }
      } catch {
        if (!cancelled) {
          setFxError('API rate failed. Pick Custom rate.')
          setPayableLedgerAmount('')
        }
      } finally {
        if (!cancelled) setFxLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [
    selectedPayableBooking,
    supplier,
    rateSource,
    customUnitRate,
    ledgerCurrency
  ])

  const handleDelete = async () => {
    if (!id || !window.confirm('Are you sure you want to delete this supplier?')) return
    setDeleting(true)
    setError('')
    try {
      await suppliersApi.delete(id)
      navigate('/suppliers')
    } catch (err) {
      reportApiError(err, 'Failed to delete supplier', setError)
    } finally {
      setDeleting(false)
    }
  }

  const handleCreatePayable = async () => {
    if (!id || !payableBookingUuid) return
    const amt = parseFloat(String(payableLedgerAmount).replace(/,/g, ''))
    if (!Number.isFinite(amt) || amt <= 0) {
      setError('Enter a valid payable amount in supplier currency.')
      return
    }
    setCreatingPayable(true)
    setError('')
    try {
      await suppliersApi.createPayable(id, {
        bookingId: payableBookingUuid,
        payableAmount: amt,
        paidAmount: 0
      })
      setPayableBookingUuid('')
      setPayableLedgerAmount('')
      setRateSource('api')
      setCustomUnitRate('')
      await loadPayables()
    } catch (err) {
      reportApiError(err, 'Failed to create payable', setError)
    } finally {
      setCreatingPayable(false)
    }
  }

  const payableStats = {
    totalPayable: payables.reduce((sum, p) => sum + p.payableAmount, 0),
    totalPaid: payables.reduce((sum, p) => sum + p.paidAmount, 0),
    pending: payables.filter(p => p.status !== 'PAID').length
  }

  const bookingStats = {
    totalBookings: bookings.length,
    uniqueCustomers: new Set(bookings.map(b => b.customer)).size,
    totalValue: bookings.reduce((sum, b) => sum + b.totalAmount, 0),
    currency: bookings[0]?.currency ?? supplier?.supplierCurrency ?? 'INR'
  }

  const bookingTotalsByCurrency = Object.entries(
    bookings.reduce<Record<string, number>>((acc, b) => {
      const code = String(b.currency || 'INR').toUpperCase()
      acc[code] = (acc[code] || 0) + b.totalAmount
      return acc
    }, {})
  )
    .map(([currency, amount]) => ({ currency, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 3)

  if (loading) {
    return (
      <div className='flex h-screen items-center justify-center'>
        <div className='text-center'>
          <FaRotate className='mx-auto mb-4 h-8 w-8 animate-spin text-blue-600' />
          <p className='text-sm text-gray-600 dark:text-gray-400'>Loading supplier details...</p>
        </div>
      </div>
    )
  }

  if (!supplier) {
    return (
      <div className='flex h-screen items-center justify-center'>
        <div className='text-center'>
          <p className='text-sm text-red-600'>Supplier not found</p>
          <button onClick={() => navigate('/suppliers')} className='mt-4 text-sm text-blue-600 hover:underline'>
            Back to Suppliers
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className='space-y-5'>
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-3'>
          <button onClick={() => navigate('/suppliers')} className='rounded-lg border border-gray-200 p-2 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800'>
            <FaArrowLeft className='text-gray-600 dark:text-gray-400' />
          </button>
          <div>
            <h1 className='text-2xl font-bold text-gray-900 dark:text-gray-100'>{supplier.name}</h1>
            <p className='text-sm text-gray-500 dark:text-gray-400'>Supplier Details</p>
          </div>
        </div>
        <div className='flex gap-2'>
          <button onClick={() => { void loadSupplier(); void loadPayables(); void loadBookings() }} className='inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800'>
            <FaRotate /> Refresh
          </button>
          <button onClick={handleDelete} disabled={deleting} className='inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 hover:bg-red-100 disabled:opacity-50 dark:border-red-900 dark:bg-red-900/30 dark:text-red-300'>
            <FaTrash /> Delete
          </button>
        </div>
      </div>

      {error && (
        <div className='rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-900/30 dark:text-red-300'>
          {error}
        </div>
      )}

      <div className='grid grid-cols-1 gap-5 lg:grid-cols-2'>
        <SurfaceCard className='p-5'>
          <div className='mb-4 flex items-center justify-between'>
            <h2 className='text-sm font-semibold text-gray-900 dark:text-gray-100'>Basic Information</h2>
            {supplier.isActive ? (
              <span className='inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-300'>
                <FaCircleCheck /> Active
              </span>
            ) : (
              <span className='inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-300'>
                <FaCircleXmark /> Inactive
              </span>
            )}
          </div>
          <div className='space-y-3'>
            <InfoRow label='Contact Person' value={supplier.contactPerson || 'N/A'} />
            <InfoRow label='Phone' value={supplier.phone || 'N/A'} />
            <InfoRow label='Email' value={supplier.email || 'N/A'} />
            <InfoRow label='Country' value={supplier.country || 'N/A'} />
            <InfoRow label='Currency' value={supplier.supplierCurrency || 'INR'} />
            <InfoRow label='PAN Number' value={supplier.panNumber || 'N/A'} />
            <InfoRow label='GST Number' value={supplier.gstNumber || 'N/A'} />
            <InfoRow label='Address' value={supplier.addressLine || 'N/A'} />
          </div>
        </SurfaceCard>

        <SurfaceCard className='p-5'>
          <h2 className='mb-4 text-sm font-semibold text-gray-900 dark:text-gray-100'>Contract & Banking</h2>
          <div className='space-y-3'>
            <InfoRow label='Rate Valid Until' value={formatDate(supplier.rateValidUntil)} />
            <InfoRow label='Payment Deadline' value={formatDate(supplier.paymentDeadlineDate)} />
            <InfoRow label='Contract URL' value={supplier.contractUrl ? <a href={supplier.contractUrl} target='_blank' rel='noopener noreferrer' className='text-blue-600 hover:underline'>View Contract</a> : 'N/A'} />
            <InfoRow label='Beneficiary Name' value={supplier.invoiceBeneficiaryName || 'N/A'} />
            <InfoRow label='Bank Name' value={supplier.invoiceBankName || 'N/A'} />
            <InfoRow label='Account Number' value={supplier.invoiceAccountNumber || 'N/A'} />
            <InfoRow label='IFSC/SWIFT' value={supplier.invoiceIfscSwift || 'N/A'} />
            <InfoRow label='UPI ID' value={supplier.invoiceUpiId || 'N/A'} />
          </div>
        </SurfaceCard>
      </div>

      <div className='grid grid-cols-1 gap-4 sm:grid-cols-3'>
        <StatCard icon={<FaMoneyBill />} label='Total Bookings' value={bookingStats.totalBookings} color='blue' />
        <StatCard icon={<FaUsers />} label='Unique Customers' value={bookingStats.uniqueCustomers} color='green' />
        <StatCard
          icon={<FaWallet />}
          label='Top 3 Values (by Currency)'
          value={
            bookingTotalsByCurrency.length > 0
              ? bookingTotalsByCurrency.map(item => (
                  <div key={item.currency} className='text-xs leading-tight'>
                    {formatCurrency(item.amount, item.currency)} ({item.currency})
                  </div>
                ))
              : 'No bookings'
          }
          color='purple'
        />
      </div>

      <SurfaceCard className='p-5'>
        <div className='mb-4 flex items-center justify-between'>
          <h2 className='text-sm font-semibold text-gray-900 dark:text-gray-100'>Bookings ({bookings.length})</h2>
          <button onClick={() => void loadBookings()} disabled={loadingBookings} className='inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:hover:bg-gray-800'>
            <FaRotate className={loadingBookings ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
        {loadingBookings ? (
          <div className='py-8 text-center text-sm text-gray-500'>Loading bookings...</div>
        ) : bookings.length ? (
          <div className='overflow-x-auto'>
            <table className='w-full'>
              <thead className='border-b border-gray-200 dark:border-gray-700'>
                <tr>
                  <th className='px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600 dark:text-gray-400'>Customer</th>
                  <th className='px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600 dark:text-gray-400'>Booking ID</th>
                  <th className='px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600 dark:text-gray-400'>Destination</th>
                  <th className='px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600 dark:text-gray-400'>Service</th>
                  <th className='px-4 py-3 text-right text-xs font-semibold uppercase text-gray-600 dark:text-gray-400'>Base Price</th>
                  <th className='px-4 py-3 text-right text-xs font-semibold uppercase text-gray-600 dark:text-gray-400'>Amount</th>
                  <th className='px-4 py-3 text-center text-xs font-semibold uppercase text-gray-600 dark:text-gray-400'>Status</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-gray-100 dark:divide-gray-800'>
                {bookings.map(booking => (
                  <tr key={booking.id} className='hover:bg-gray-50 dark:hover:bg-gray-800/50'>
                    <td className='px-4 py-3 text-sm text-gray-900 dark:text-gray-100'>{booking.customer}</td>
                    <td className='px-4 py-3 text-sm font-mono text-gray-600 dark:text-gray-400'>{booking.bookingId}</td>
                    <td className='px-4 py-3 text-sm text-gray-700 dark:text-gray-300'>{booking.destination}</td>
                    <td className='px-4 py-3 text-sm text-gray-700 dark:text-gray-300'>
                      <div>{booking.serviceName || 'Other'}</div>
                      {booking.matchedServices.length > 0 ? (
                        <div className='mt-1 text-xs text-gray-500 dark:text-gray-400'>
                          {booking.matchedServices
                            .map(service => `${service.name}: ${formatCurrency(service.basePrice, booking.currency)}`)
                            .join(' | ')}
                        </div>
                      ) : null}
                    </td>
                    <td className='px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-gray-100'>
                      {formatCurrency(booking.supplierBasePrice, booking.currency)}
                    </td>
                    <td className='px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-gray-100'>{formatCurrency(booking.totalAmount, booking.currency)}</td>
                    <td className='px-4 py-3 text-center'>
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize ${
                        booking.status.toLowerCase() === 'confirmed' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                        booking.status.toLowerCase() === 'pending' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' :
                        booking.status.toLowerCase() === 'cancelled' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
                        'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                      }`}>
                        {booking.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className='py-12 text-center'>
            <FaMoneyBill className='mx-auto mb-3 h-12 w-12 text-gray-400' />
            <p className='text-sm text-gray-500'>No bookings found</p>
          </div>
        )}
      </SurfaceCard>

      <SurfaceCard className='p-5'>
        <div className='mb-4 flex items-center justify-between'>
          <h2 className='text-sm font-semibold text-gray-900 dark:text-gray-100'>Payables ({payables.length})</h2>
          <button onClick={() => void loadPayables()} disabled={loadingPayables} className='inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:hover:bg-gray-800'>
            <FaRotate className={loadingPayables ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>

        <div className='mb-4 rounded-xl border border-blue-100 bg-blue-50/60 p-3 dark:border-blue-900/40 dark:bg-blue-950/20'>
          <p className='text-xs font-medium text-blue-900 dark:text-blue-200'>Supplier base (from bookings, by currency)</p>
          <p className='mt-1 text-xs text-blue-800/80 dark:text-blue-300/80'>
            Sum of supplier base cost per booking currency — same idea as Bookings totals, but uses supplier base not sale amount.
          </p>
          <div className='mt-2 flex flex-wrap gap-2'>
            {supplierBaseTotalsByCurrency.length ? (
              supplierBaseTotalsByCurrency.map(row => (
                <span
                  key={row.currency}
                  className='inline-flex items-center rounded-lg border border-blue-200 bg-white px-2.5 py-1 text-xs font-medium text-blue-900 dark:border-blue-800 dark:bg-gray-900 dark:text-blue-100'
                >
                  {row.currency}: {formatCurrency(row.amount, row.currency)}
                </span>
              ))
            ) : (
              <span className='text-xs text-blue-800/70'>No booking data</span>
            )}
          </div>
        </div>

        <div className='mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3'>
          <div className='rounded-lg border border-gray-200 p-3 dark:border-gray-700'>
            <p className='text-xs uppercase text-gray-500 dark:text-gray-400'>Total Payable (ledger)</p>
            <p className='mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100'>{formatCurrency(payableStats.totalPayable, supplier.supplierCurrency ?? 'INR')}</p>
          </div>
          <div className='rounded-lg border border-gray-200 p-3 dark:border-gray-700'>
            <p className='text-xs uppercase text-gray-500 dark:text-gray-400'>Total Paid</p>
            <p className='mt-1 text-lg font-semibold text-green-600 dark:text-green-400'>{formatCurrency(payableStats.totalPaid, supplier.supplierCurrency ?? 'INR')}</p>
          </div>
          <div className='rounded-lg border border-gray-200 p-3 dark:border-gray-700'>
            <p className='text-xs uppercase text-gray-500 dark:text-gray-400'>Pending</p>
            <p className='mt-1 text-lg font-semibold text-red-600 dark:text-red-400'>{formatCurrency(payableStats.totalPayable - payableStats.totalPaid, supplier.supplierCurrency ?? 'INR')}</p>
          </div>
        </div>

        <div className='mb-4 rounded-xl border border-gray-200 bg-gray-50/80 p-4 dark:border-gray-700 dark:bg-gray-900/40'>
          <p className='text-xs font-semibold text-gray-800 dark:text-gray-200'>Create payable</p>
          <p className='mt-1 text-xs text-gray-500 dark:text-gray-400'>
            Backend stores one row per booking in <span className='font-mono'>supplier_payables</span>:{' '}
            <span className='font-mono'>payable_amount</span> is a single number in supplier ledger currency ({ledgerCurrency}). FX is only for this form — convert booking-currency base into {ledgerCurrency}, then save.
            {ratesMeta ? (
              <span className='ml-1'>
                Live rates: source {ratesMeta.source}, base {ratesMeta.base}.
              </span>
            ) : null}
          </p>
          <div className='mt-3 grid grid-cols-1 gap-3 md:grid-cols-2'>
            <label className='block text-xs font-medium text-gray-600 dark:text-gray-300'>
              Booking
              <select
                value={payableBookingUuid}
                onChange={e => setPayableBookingUuid(e.target.value)}
                className='mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900'
              >
                <option value=''>Select booking…</option>
                {bookings.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.bookingId} · {b.customer} · {formatCurrency(b.supplierBasePrice, b.currency)} base
                  </option>
                ))}
              </select>
            </label>
            <label className='block text-xs font-medium text-gray-600 dark:text-gray-300'>
              Rate source
              <select
                value={rateSource}
                onChange={e => {
                  const v = e.target.value as 'api' | 'custom'
                  setRateSource(v)
                  const bk = bookings.find(x => x.id === payableBookingUuid)
                  if (v === 'custom' && bk && supplier) {
                    const from = String(bk.currency || 'INR').toUpperCase()
                    const to = (supplier.supplierCurrency || 'INR').toUpperCase()
                    if (from === to) setCustomUnitRate('1')
                    else {
                      void currencyService
                        .convert(1, from, to)
                        .then(r => setCustomUnitRate(String(Number(r.toFixed(6)))))
                        .catch(() => setCustomUnitRate(''))
                    }
                  }
                }}
                className='mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900'
              >
                <option value='api'>API rate (/api/currency)</option>
                <option value='custom'>Custom rate (manual)</option>
              </select>
            </label>
          </div>
          {rateSource === 'custom' ? (
            <label className='mt-3 block text-xs font-medium text-gray-600 dark:text-gray-300'>
              1 {selectedPayableBooking ? String(selectedPayableBooking.currency).toUpperCase() : '?'} = ? {ledgerCurrency}
              <input
                type='text'
                inputMode='decimal'
                value={customUnitRate}
                onChange={e => setCustomUnitRate(e.target.value)}
                placeholder='e.g. 22.5'
                className='mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900'
              />
            </label>
          ) : null}
          <label className='mt-3 block text-xs font-medium text-gray-600 dark:text-gray-300'>
            Payable amount ({ledgerCurrency}) — edit if needed
            <input
              type='text'
              inputMode='decimal'
              value={payableLedgerAmount}
              onChange={e => setPayableLedgerAmount(e.target.value)}
              className='mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900'
            />
          </label>
          <div className='mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500'>
            {fxLoading ? <span>Converting…</span> : null}
            {fxError ? <span className='text-amber-700 dark:text-amber-300'>{fxError}</span> : null}
            {selectedPayableBooking && !fxLoading && !fxError && payableLedgerAmount ? (
              <span>
                Saves {formatCurrency(parseFloat(payableLedgerAmount) || 0, ledgerCurrency)} payable for booking{' '}
                <span className='font-mono'>{selectedPayableBooking.bookingId}</span>.
              </span>
            ) : null}
          </div>
          <button
            type='button'
            onClick={() => void handleCreatePayable()}
            disabled={creatingPayable || !payableBookingUuid || !payableLedgerAmount}
            className='mt-3 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50'
          >
            {creatingPayable ? <FaRotate className='animate-spin' /> : <FaPlus />}
            Add payable
          </button>
        </div>

        <p className='mb-4 text-xs text-gray-500 dark:text-gray-400'>
          Ledger totals use supplier currency only (DB has no per-row currency). Pending = Total Payable − Total Paid. If a payable already exists for the same booking, backend updates that row instead of duplicating.
        </p>
        {loadingPayables ? (
          <div className='py-8 text-center text-sm text-gray-500'>Loading payables...</div>
        ) : payables.length ? (
          <div className='space-y-2'>
            {payables.map(payable => (
              <div key={payable.id} className='rounded-lg border border-gray-200 p-3 dark:border-gray-700'>
                <div className='flex items-start justify-between'>
                  <div>
                    <p className='text-sm font-semibold text-gray-900 dark:text-gray-100'>Booking {payable.bookingId}</p>
                    <p className='text-xs text-gray-500 dark:text-gray-400'>Due: {formatDate(payable.dueDate)} | Ref: {payable.paymentReference || 'N/A'}</p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    payable.status === 'PAID' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                    payable.status === 'PARTIAL' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' :
                    'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                  }`}>
                    {payable.status}
                  </span>
                </div>
                <div className='mt-2 flex items-center justify-between text-xs text-gray-600 dark:text-gray-300'>
                  <span>Payable: {formatCurrency(payable.payableAmount, supplier.supplierCurrency ?? 'INR')}</span>
                  <span>Paid: {formatCurrency(payable.paidAmount, supplier.supplierCurrency ?? 'INR')}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className='py-12 text-center'>
            <FaWallet className='mx-auto mb-3 h-12 w-12 text-gray-400' />
            <p className='text-sm text-gray-500'>No payables found</p>
          </div>
        )}
      </SurfaceCard>
    </div>
  )
}

const InfoRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className='flex justify-between border-b border-gray-100 pb-2 dark:border-gray-800'>
    <span className='text-xs font-medium text-gray-500 dark:text-gray-400'>{label}</span>
    <span className='text-xs text-gray-900 dark:text-gray-100'>{value}</span>
  </div>
)

const StatCard = ({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: React.ReactNode; color: 'blue' | 'green' | 'purple' }) => {
  const colorClasses = {
    blue: 'border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:border-blue-900/50 dark:from-blue-900/20 dark:to-blue-900/10',
    green: 'border-green-200 bg-gradient-to-br from-green-50 to-green-100/50 dark:border-green-900/50 dark:from-green-900/20 dark:to-green-900/10',
    purple: 'border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100/50 dark:border-purple-900/50 dark:from-purple-900/20 dark:to-purple-900/10'
  }
  const iconColorClasses = {
    blue: 'bg-blue-600 dark:bg-blue-500',
    green: 'bg-green-600 dark:bg-green-500',
    purple: 'bg-purple-600 dark:bg-purple-500'
  }
  const textColorClasses = {
    blue: 'text-blue-700 dark:text-blue-300',
    green: 'text-green-700 dark:text-green-300',
    purple: 'text-purple-700 dark:text-purple-300'
  }
  const valueColorClasses = {
    blue: 'text-blue-900 dark:text-blue-100',
    green: 'text-green-900 dark:text-green-100',
    purple: 'text-purple-900 dark:text-purple-100'
  }

  return (
    <div className={`rounded-xl border p-4 ${colorClasses[color]}`}>
      <div className='flex items-center gap-2 mb-2'>
        <div className={`rounded-lg p-2 ${iconColorClasses[color]}`}>
          <div className='text-white text-sm'>{icon}</div>
        </div>
        <p className={`text-xs font-medium uppercase tracking-wide ${textColorClasses[color]}`}>{label}</p>
      </div>
      <p className={`text-3xl font-bold ${valueColorClasses[color]}`}>{value}</p>
    </div>
  )
}

export default SupplierDetailPage
