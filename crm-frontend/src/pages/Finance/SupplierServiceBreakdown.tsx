import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { FaBuilding, FaDownload, FaSearch } from 'react-icons/fa'
import { FaRotate } from 'react-icons/fa6'
import SurfaceCard from '../../components/ui/SurfaceCard'
import EmptyState from '../../components/ui/EmptyState'
import SearchableDropdown from '../../components/ui/SearchableDropdown'
import { reportsApi } from '../../api/reports'
import { getApiErrorMessage } from '../../api/apiClient'

type SupplierServiceBreakdownProps = {
  refreshKey?: number
}

type SupplierServiceRow = {
  id: string
  quotationId: string
  bookingId: string
  bookingNumber: string
  bookingStatus: string
  paymentStatus: string
  advanceReceived: number
  leadName: string
  quoteNumber: string
  serviceLabel: string
  supplierId: string
  supplierName: string
  basePrice: number
  currency: string
  quotationStatus: string
  createdAt: string
}

type Pagination = {
  page: number
  limit: number
  totalItems: number
  totalPages: number
}

const unwrapData = (response: unknown): any =>
  (response as { data?: unknown })?.data ?? response

const toNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const formatLabel = (value: string) =>
  value
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, char => char.toUpperCase())

const formatCurrency = (amount: number, currency = 'INR') => {
  try {
    return new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)
  } catch (_error) {
    return `${toNumber(amount, 0).toFixed(2)} ${currency}`
  }
}

const formatDateTime = (value: string) => {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return '-'
  return parsed.toLocaleString()
}

const SupplierServiceBreakdown: React.FC<SupplierServiceBreakdownProps> = ({
  refreshKey = 0
}) => {
  const [rows, setRows] = useState<SupplierServiceRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [supplierFilter, setSupplierFilter] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    totalItems: 0,
    totalPages: 1
  })

  const fetchRows = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params: Record<string, string | number | boolean> = {
        page: pagination.page,
        limit: pagination.limit
      }
      if (supplierFilter) params.supplierId = supplierFilter
      if (fromDate) params.from = fromDate
      if (toDate) params.to = toDate

      const response = await reportsApi.financeSupplierServices(params)
      const data = unwrapData(response)
      const rawRows = Array.isArray(data?.rows) ? data.rows : []

      const mappedRows: SupplierServiceRow[] = rawRows.map((row: any, index: number) => ({
        id: String(row?.id ?? `supplier-service-${index}`),
        quotationId: String(row?.quotationId ?? ''),
        bookingId: String(row?.bookingId ?? ''),
        bookingNumber: String(row?.bookingNumber ?? '-'),
        bookingStatus: String(row?.bookingStatus ?? '').toUpperCase(),
        paymentStatus: String(row?.paymentStatus ?? '').toUpperCase(),
        advanceReceived: toNumber(row?.advanceReceived, 0),
        leadName: String(row?.leadName ?? 'Unknown lead'),
        quoteNumber: String(row?.quoteNumber ?? '-'),
        serviceLabel: String(row?.serviceLabel ?? 'OTHER'),
        supplierId: String(row?.supplierId ?? ''),
        supplierName: String(row?.supplierName ?? 'Not selected'),
        basePrice: toNumber(row?.basePrice, 0),
        currency: String(row?.currency ?? 'INR').toUpperCase(),
        quotationStatus: String(row?.quotationStatus ?? '').toUpperCase(),
        createdAt: String(row?.createdAt ?? '')
      }))

      setRows(mappedRows)
      setPagination({
        page: toNumber(data?.pagination?.page, pagination.page),
        limit: toNumber(data?.pagination?.limit, pagination.limit),
        totalItems: toNumber(data?.pagination?.totalItems, 0),
        totalPages: Math.max(1, toNumber(data?.pagination?.totalPages, 1))
      })
    } catch (err) {
      setRows([])
      setError(
        getApiErrorMessage(
          err,
          'Failed to load supplier-service data from backend report'
        )
      )
    } finally {
      setLoading(false)
    }
  }, [fromDate, pagination.limit, pagination.page, supplierFilter, toDate])

  useEffect(() => {
    void fetchRows()
  }, [fetchRows, refreshKey])

  useEffect(() => {
    setPagination(prev => ({ ...prev, page: 1 }))
  }, [supplierFilter, fromDate, toDate])

  const supplierOptions = useMemo(
    () => [
      { value: '', label: 'All Suppliers' },
      ...Array.from(
        new Map(
          rows
            .filter(row => row.supplierId && row.supplierId !== 'UNASSIGNED')
            .map(row => [
              row.supplierId,
              { value: row.supplierId, label: row.supplierName }
            ])
        ).values()
      )
    ],
    [rows]
  )

  const searchedRows = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return rows
    return rows.filter(row => {
      const haystack = [
        row.leadName,
        row.quoteNumber,
        row.bookingNumber,
        row.serviceLabel,
        row.supplierName,
        row.quotationStatus,
        row.bookingStatus,
        row.paymentStatus
      ]
        .join(' ')
        .toLowerCase()
      return haystack.includes(query)
    })
  }, [rows, search])

  const exportCsv = () => {
    if (!searchedRows.length) return
    const headers = [
      'Lead Name',
      'Booking #',
      'Quote #',
      'Service',
      'Selected Supplier',
      'Supplier Base Price',
      'Currency',
      'Booking Status',
      'Payment Status',
      'Advance Received',
      'Quotation Status',
      'Date'
    ]
    const csvRows = searchedRows.map(row => [
      row.leadName,
      row.bookingNumber,
      row.quoteNumber,
      row.serviceLabel,
      row.supplierName,
      row.basePrice,
      row.currency,
      row.bookingStatus,
      row.paymentStatus,
      row.advanceReceived,
      row.quotationStatus,
      formatDateTime(row.createdAt)
    ])
    const csv = [headers, ...csvRows]
      .map(row =>
        row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(',')
      )
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `supplier-service-confirmed-paid-${new Date().toISOString().slice(0, 10)}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className='space-y-4'>
      <SurfaceCard className='border border-blue-200 bg-blue-50/70 p-4 dark:border-blue-900 dark:bg-blue-900/20'>
        <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
          <div className='flex items-start gap-3'>
            <div className='rounded-full bg-blue-100 p-2 dark:bg-blue-900/60'>
              <FaBuilding className='text-blue-600 dark:text-blue-300' />
            </div>
            <div>
              <h3 className='text-sm font-semibold text-blue-900 dark:text-blue-100'>
                Backend Filtered Supplier Services
              </h3>
              <p className='text-sm text-blue-800 dark:text-blue-200'>
                Data comes from backend only: bookings confirmed or payment received.
              </p>
            </div>
          </div>
          <div className='flex items-center gap-2'>
            <button
              onClick={() => void fetchRows()}
              disabled={loading}
              className='inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800'
            >
              <FaRotate className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
            <button
              onClick={exportCsv}
              disabled={!searchedRows.length}
              className='inline-flex items-center gap-2 rounded-lg border border-green-500 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50 dark:text-gray-100 dark:hover:bg-gray-800'
            >
              <FaDownload />
              Export
            </button>
          </div>
        </div>
      </SurfaceCard>

      {error ? (
        <div className='rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300'>
          {error}
        </div>
      ) : null}

      <SurfaceCard className='border border-gray-200 p-4 dark:border-gray-800'>
        <div className='grid grid-cols-1 gap-3 lg:grid-cols-4'>
          <div className='relative lg:col-span-2'>
            <FaSearch className='pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400' />
            <input
              type='text'
              value={search}
              onChange={event => setSearch(event.target.value)}
              className='field-input !pl-9'
              placeholder='Search lead, booking, quote, service, supplier...'
            />
          </div>
          <div>
            <SearchableDropdown
              value={supplierFilter}
              onChange={setSupplierFilter}
              options={supplierOptions}
              placeholder='All Suppliers'
              className='w-full'
            />
          </div>
          <div className='grid grid-cols-2 gap-2'>
            <input
              type='date'
              value={fromDate}
              onChange={event => setFromDate(event.target.value)}
              className='field-input'
              title='From date'
            />
            <input
              type='date'
              value={toDate}
              onChange={event => setToDate(event.target.value)}
              className='field-input'
              title='To date'
            />
          </div>
        </div>
      </SurfaceCard>

      <SurfaceCard className='overflow-hidden border border-gray-200 dark:border-gray-800'>
        {!searchedRows.length ? (
          <div className='p-6'>
            <EmptyState
              title={loading ? 'Loading supplier-service rows...' : 'No rows found'}
              description='No confirmed/paid bookings with supplier services in this filter.'
              icon={<FaBuilding className='text-4xl' />}
            />
          </div>
        ) : (
          <>
            <div className='overflow-x-auto'>
              <table className='w-full'>
                <thead className='bg-gray-50 dark:bg-gray-800/60'>
                  <tr>
                    <th className='px-4 py-3 text-left text-xs font-semibold text-gray-500'>
                      Lead Name
                    </th>
                    <th className='px-4 py-3 text-left text-xs font-semibold text-gray-500'>
                      Booking #
                    </th>
                    <th className='px-4 py-3 text-left text-xs font-semibold text-gray-500'>
                      Service
                    </th>
                    <th className='px-4 py-3 text-left text-xs font-semibold text-gray-500'>
                      Selected Supplier
                    </th>
                    <th className='px-4 py-3 text-right text-xs font-semibold text-gray-500'>
                      Base Price
                    </th>
                    <th className='px-4 py-3 text-left text-xs font-semibold text-gray-500'>
                      Booking / Payment
                    </th>
                    <th className='px-4 py-3 text-left text-xs font-semibold text-gray-500'>
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-gray-100 dark:divide-gray-800'>
                  {searchedRows.map(row => (
                    <tr key={row.id} className='hover:bg-gray-50 dark:hover:bg-gray-800/40'>
                      <td className='px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100'>
                        {row.leadName}
                      </td>
                      <td className='px-4 py-3 text-sm text-blue-600'>
                        {row.bookingNumber}
                      </td>
                      <td className='px-4 py-3 text-sm text-gray-700 dark:text-gray-300'>
                        {row.serviceLabel}
                      </td>
                      <td className='px-4 py-3 text-sm text-gray-700 dark:text-gray-300'>
                        {row.supplierName}
                      </td>
                      <td className='px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-gray-100'>
                        {formatCurrency(row.basePrice, row.currency)}
                      </td>
                      <td className='px-4 py-3 text-sm text-gray-700 dark:text-gray-300'>
                        <p>{formatLabel(row.bookingStatus || 'PENDING')}</p>
                        <p className='text-xs text-gray-500'>
                          {formatLabel(row.paymentStatus || 'PENDING')} • Adv:{' '}
                          {formatCurrency(row.advanceReceived, row.currency)}
                        </p>
                      </td>
                      <td className='px-4 py-3 text-sm text-gray-700 dark:text-gray-300'>
                        {formatDateTime(row.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className='flex flex-col items-start justify-between gap-3 border-t border-gray-200 px-4 py-3 dark:border-gray-800 sm:flex-row sm:items-center'>
              <p className='text-xs text-gray-500'>
                Page {pagination.page} of {pagination.totalPages} • Total{' '}
                {pagination.totalItems}
              </p>
              <div className='flex items-center gap-2'>
                <button
                  onClick={() =>
                    setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))
                  }
                  disabled={pagination.page <= 1 || loading}
                  className='rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-700 disabled:opacity-40 dark:border-gray-700 dark:text-gray-300'
                >
                  Previous
                </button>
                <button
                  onClick={() =>
                    setPagination(prev => ({
                      ...prev,
                      page: Math.min(prev.totalPages, prev.page + 1)
                    }))
                  }
                  disabled={pagination.page >= pagination.totalPages || loading}
                  className='rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-700 disabled:opacity-40 dark:border-gray-700 dark:text-gray-300'
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </SurfaceCard>
    </div>
  )
}

export default SupplierServiceBreakdown
