import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { FaArrowLeft, FaBuilding, FaDownload, FaRotate, FaXmark } from 'react-icons/fa6'
import { FaSearch } from 'react-icons/fa'
import SurfaceCard from '../../components/ui/SurfaceCard'
import EmptyState from '../../components/ui/EmptyState'
import SearchableDropdown from '../../components/ui/SearchableDropdown'
import { reportsApi } from '../../api/reports'
import { suppliersApi } from '../../api/suppliers'
import { reportApiError } from '../../lib/notify'
import { currencyService } from '../../services/currencyService'

type SupplierServiceBreakdownProps = { refreshKey?: number }

type Row = {
  id: string
  bookingId: string
  bookingNumber: string
  bookingStatus: string
  paymentStatus: string
  leadName: string
  customerName: string
  destination: string
  bookingTotalAmount: number
  bookingCurrency: string
  quoteNumber: string
  serviceLabel: string
  supplierId: string
  supplierName: string
  basePrice: number
  currency: string
  createdAt: string
}

type Payable = {
  id: string
  bookingId: string
  supplierId: string
  payableAmount: number
  paidAmount: number
  pendingAmount: number
  status: string
}

type Settlement = {
  id: string
  bookingNumber: string
  settlementAmount: number
  paymentMode: string
  settlementDate: string
  reference: string
}

type Group = {
  supplierId: string
  supplierName: string
  currency: string
  serviceCount: number
  bookingCount: number
  serviceMix: string[]
  baseTotal: number
  payableTotal: number
  paidTotal: number
  pendingTotal: number
  rows: Row[]
}

type Pagination = { page: number; limit: number; totalItems: number; totalPages: number }

type CreateState = {
  row: Row
  payableAmount: string
  ledgerCurrency: string
  rateSource: 'api' | 'custom'
  customRate: string
  fxLoading: boolean
  fxError: string
  dueDate: string
  paymentReference: string
  error: string
}

type SettleState = {
  row: Row
  payable: Payable
  amount: string
  paymentMode: string
  settlementDate: string
  reference: string
  notes: string
  error: string
}

const unwrapData = (response: unknown): any => (response as { data?: unknown })?.data ?? response
const toNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}
const toUpper = (value: unknown, fallback = '') => String(value ?? fallback).trim().toUpperCase()
const formatLabel = (value: string) =>
  value
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, char => char.toUpperCase())
const formatDateTime = (value: string) => {
  if (!value) return '-'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return '-'
  return parsed.toLocaleString()
}
const formatCurrency = (amount: number, currency = 'INR') => {
  try {
    return new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)
  } catch (_err) {
    return `${toNumber(amount, 0).toFixed(2)} ${currency}`
  }
}

const mapPayable = (item: any): Payable => {
  const payableAmount = toNumber(item?.payableAmount ?? item?.payable_amount, 0)
  const paidAmount = toNumber(item?.paidAmount ?? item?.paid_amount, 0)
  return {
    id: String(item?.id ?? ''),
    bookingId: String(item?.bookingId ?? item?.booking_id ?? ''),
    supplierId: String(item?.supplierId ?? item?.supplier_id ?? ''),
    payableAmount,
    paidAmount,
    pendingAmount: toNumber(item?.pendingAmount ?? item?.pending_amount, Math.max(0, payableAmount - paidAmount)),
    status: toUpper(item?.status, 'PENDING')
  }
}

const mapSettlement = (item: any): Settlement => ({
  id: String(item?.id ?? ''),
  bookingNumber: String(item?.bookingNumber ?? item?.booking_number ?? '-'),
  settlementAmount: toNumber(item?.settlementAmount ?? item?.settlement_amount, 0),
  paymentMode: toUpper(item?.paymentMode ?? item?.payment_mode, 'BANK_TRANSFER'),
  settlementDate: String(item?.settlementDate ?? item?.settlement_date ?? ''),
  reference: String(item?.reference ?? '')
})

const SupplierServiceBreakdown: React.FC<SupplierServiceBreakdownProps> = ({ refreshKey = 0 }) => {
  const [rows, setRows] = useState<Row[]>([])
  const [payablesBySupplier, setPayablesBySupplier] = useState<Record<string, Payable[]>>({})
  const [supplierCurrencyById, setSupplierCurrencyById] = useState<Record<string, string>>({})
  const [ledgerRows, setLedgerRows] = useState<Settlement[]>([])
  const [selectedSupplierId, setSelectedSupplierId] = useState('')
  const [loading, setLoading] = useState(false)
  const [payablesLoading, setPayablesLoading] = useState(false)
  const [ledgerLoading, setLedgerLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [supplierFilter, setSupplierFilter] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, totalItems: 0, totalPages: 1 })
  const [createModal, setCreateModal] = useState<CreateState | null>(null)
  const [settleModal, setSettleModal] = useState<SettleState | null>(null)

  const paymentModes = useMemo(
    () => ['BANK_TRANSFER', 'UPI', 'CASH', 'CARD', 'CHEQUE', 'OTHER'],
    []
  )

  const fetchRows = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params: Record<string, string | number | boolean> = { page: pagination.page, limit: pagination.limit }
      if (supplierFilter) params.supplierId = supplierFilter
      if (fromDate) params.from = fromDate
      if (toDate) params.to = toDate
      const response = await reportsApi.financeSupplierServices(params)
      const data = unwrapData(response)
      const list = Array.isArray(data?.rows) ? data.rows : []
      setRows(
        list.map((item: any, index: number) => ({
          id: String(item?.id ?? `row-${index}`),
          bookingId: String(item?.bookingId ?? ''),
          bookingNumber: String(item?.bookingNumber ?? '-'),
          bookingStatus: toUpper(item?.bookingStatus, ''),
          paymentStatus: toUpper(item?.paymentStatus, ''),
          leadName: String(item?.leadName ?? 'Unknown lead'),
          customerName: String(item?.customerName ?? item?.customer_name ?? item?.leadName ?? 'Unknown lead'),
          destination: String(item?.destination ?? 'N/A'),
          bookingTotalAmount: toNumber(item?.bookingTotalAmount ?? item?.booking_total_amount, 0),
          bookingCurrency: toUpper(item?.bookingCurrency ?? item?.booking_client_currency, 'INR'),
          quoteNumber: String(item?.quoteNumber ?? '-'),
          serviceLabel: String(item?.serviceLabel ?? 'OTHER'),
          supplierId: String(item?.supplierId ?? ''),
          supplierName: String(item?.supplierName ?? 'Not selected'),
          basePrice: toNumber(item?.basePrice, 0),
          currency: toUpper(item?.currency, 'INR'),
          createdAt: String(item?.createdAt ?? '')
        }))
      )
      setPagination({
        page: toNumber(data?.pagination?.page, pagination.page),
        limit: toNumber(data?.pagination?.limit, pagination.limit),
        totalItems: toNumber(data?.pagination?.totalItems, 0),
        totalPages: Math.max(1, toNumber(data?.pagination?.totalPages, 1))
      })
    } catch (err) {
      setRows([])
      reportApiError(err, 'Failed to load supplier-service rows', setError)
    } finally {
      setLoading(false)
    }
  }, [fromDate, pagination.limit, pagination.page, supplierFilter, toDate])

  const fetchSupplierCurrencies = useCallback(async () => {
    try {
      const response = await suppliersApi.list({ page: 1, limit: 400 })
      const data = unwrapData(response)
      const list = Array.isArray(data?.rows)
        ? data.rows
        : Array.isArray(data)
          ? data
          : []
      const mapped = Object.fromEntries(
        list.map((item: any) => [
          String(item?.id ?? ''),
          toUpper(item?.supplierCurrency ?? item?.supplier_currency, 'INR')
        ])
      )
      setSupplierCurrencyById(mapped)
    } catch (_err) {
      setSupplierCurrencyById({})
    }
  }, [])

  const fetchPayables = useCallback(async (targetRows: Row[]) => {
    const supplierIds = Array.from(
      new Set(targetRows.map(row => row.supplierId).filter(id => Boolean(id) && id !== 'UNASSIGNED'))
    )
    if (!supplierIds.length) {
      setPayablesBySupplier({})
      return
    }
    setPayablesLoading(true)
    try {
      const pairs = await Promise.all(
        supplierIds.map(async supplierId => {
          const response = await suppliersApi.listPayables(supplierId, { page: 1, limit: 500 })
          const data = unwrapData(response)
          const list = Array.isArray(data) ? data : []
          return [supplierId, list.map(mapPayable)] as const
        })
      )
      setPayablesBySupplier(Object.fromEntries(pairs))
    } catch (err) {
      setPayablesBySupplier({})
      reportApiError(err, 'Failed to load supplier payables', setError)
    } finally {
      setPayablesLoading(false)
    }
  }, [])

  const fetchLedger = useCallback(
    async (supplierId: string) => {
      if (!supplierId) {
        setLedgerRows([])
        return
      }
      setLedgerLoading(true)
      try {
        const response = await suppliersApi.listSupplierSettlements(supplierId, { page: 1, limit: 120 })
        const data = unwrapData(response)
        const list = Array.isArray(data?.rows) ? data.rows : Array.isArray(data) ? data : []
        setLedgerRows(list.map(mapSettlement))
      } catch (err) {
        const payables = payablesBySupplier[supplierId] || []
        if (!payables.length) {
          setLedgerRows([])
          reportApiError(err, 'Failed to load settlement history', setError)
        } else {
          const settled = await Promise.allSettled(
            payables.map(payable => suppliersApi.listPayableSettlements(payable.id, { page: 1, limit: 50 }))
          )
          const fallbackRows = settled.flatMap(result => {
            if (result.status !== 'fulfilled') return []
            const payload = unwrapData(result.value)
            const list = Array.isArray(payload?.rows) ? payload.rows : Array.isArray(payload) ? payload : []
            return list
          })
          setLedgerRows(fallbackRows.map(mapSettlement))
        }
      } finally {
        setLedgerLoading(false)
      }
    },
    [payablesBySupplier]
  )

  useEffect(() => {
    void fetchRows()
  }, [fetchRows, refreshKey])
  useEffect(() => {
    void fetchSupplierCurrencies()
  }, [fetchSupplierCurrencies])
  useEffect(() => {
    void fetchPayables(rows)
  }, [fetchPayables, rows])
  useEffect(() => {
    setPagination(prev => ({ ...prev, page: 1 }))
  }, [supplierFilter, fromDate, toDate])
  useEffect(() => {
    void fetchLedger(selectedSupplierId)
  }, [fetchLedger, selectedSupplierId])

  const getPayable = useCallback(
    (row: Row) => (payablesBySupplier[row.supplierId] || []).find(item => item.bookingId === row.bookingId) || null,
    [payablesBySupplier]
  )

  const supplierOptions = useMemo(
    () => [
      { value: '', label: 'All Suppliers' },
      ...Array.from(
        new Map(rows.filter(row => row.supplierId && row.supplierId !== 'UNASSIGNED').map(row => [row.supplierId, { value: row.supplierId, label: row.supplierName }])).values()
      )
    ],
    [rows]
  )

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return rows
    return rows.filter(row =>
      [row.leadName, row.customerName, row.destination, row.bookingNumber, row.quoteNumber, row.serviceLabel, row.supplierName]
        .join(' ')
        .toLowerCase()
        .includes(query)
    )
  }, [rows, search])

  const groups = useMemo(() => {
    const map = new Map<string, Group>()
    filteredRows.forEach(row => {
      if (!row.supplierId || row.supplierId === 'UNASSIGNED') return
      if (!map.has(row.supplierId)) {
        map.set(row.supplierId, {
          supplierId: row.supplierId,
          supplierName: row.supplierName || 'Unknown Supplier',
          currency: row.currency || 'INR',
          serviceCount: 0,
          bookingCount: 0,
          serviceMix: [],
          baseTotal: 0,
          payableTotal: 0,
          paidTotal: 0,
          pendingTotal: 0,
          rows: []
        })
      }
      const group = map.get(row.supplierId)!
      group.rows.push(row)
      group.serviceCount += 1
      group.baseTotal += row.basePrice
      if (!group.serviceMix.includes(row.serviceLabel)) group.serviceMix.push(row.serviceLabel)
      const payable = getPayable(row)
      if (payable) {
        group.payableTotal += payable.payableAmount
        group.paidTotal += payable.paidAmount
        group.pendingTotal += payable.pendingAmount
      }
    })
    map.forEach(group => {
      group.bookingCount = new Set(group.rows.map(item => item.bookingId)).size
      group.rows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      group.serviceMix.sort((a, b) => a.localeCompare(b))
    })
    return Array.from(map.values()).sort((a, b) => a.supplierName.localeCompare(b.supplierName))
  }, [filteredRows, getPayable])

  const selectedGroup = useMemo(
    () => groups.find(group => group.supplierId === selectedSupplierId) || null,
    [groups, selectedSupplierId]
  )

  const bookingSummaryRows = useMemo(() => {
    if (!selectedGroup) return []
    const byBooking = new Map<string, Row[]>()
    for (const row of selectedGroup.rows) {
      if (!row.bookingId) continue
      const list = byBooking.get(row.bookingId) || []
      list.push(row)
      byBooking.set(row.bookingId, list)
    }
    return Array.from(byBooking.entries())
      .map(([bookingId, lineRows]) => {
        const sorted = lineRows.slice().sort((a, b) => a.serviceLabel.localeCompare(b.serviceLabel))
        const first = sorted[0]
        const serviceTitle = [...new Set(sorted.map(r => r.serviceLabel).filter(Boolean))].join(', ')
        const serviceDetail = sorted.map(r => `${r.serviceLabel}: ${formatCurrency(r.basePrice, r.currency)}`).join(' | ')
        const baseTotal = sorted.reduce((sum, r) => sum + r.basePrice, 0)
        const baseCurrency = first.currency || 'INR'
        const created = Math.max(...sorted.map(r => new Date(r.createdAt || 0).getTime()))
        return {
          bookingId,
          customer: first.customerName || first.leadName || 'Unknown',
          bookingNumber: first.bookingNumber,
          destination: first.destination || 'N/A',
          serviceTitle: serviceTitle || 'Other',
          serviceDetail,
          baseTotal,
          baseCurrency,
          amount: first.bookingTotalAmount,
          amountCurrency: first.bookingCurrency || baseCurrency,
          status: first.bookingStatus || 'PENDING',
          sortTs: created
        }
      })
      .sort((a, b) => b.sortTs - a.sortTs)
  }, [selectedGroup])

  const openCreateModal = (row: Row) => {
    const bookingCurrency = toUpper(row.currency, 'INR')
    const ledgerCurrency = toUpper(supplierCurrencyById[row.supplierId] || row.currency, 'INR')
    const sameCurrency = bookingCurrency === ledgerCurrency
    setCreateModal({
      row,
      payableAmount: String(row.basePrice || ''),
      ledgerCurrency,
      rateSource: sameCurrency ? 'custom' : 'api',
      customRate: sameCurrency ? '1' : '',
      fxLoading: false,
      fxError: '',
      dueDate: '',
      paymentReference: '',
      error: ''
    })
  }

  useEffect(() => {
    if (!createModal) return
    const from = toUpper(createModal.row.currency, 'INR')
    const to = toUpper(createModal.ledgerCurrency, 'INR')
    const baseAmount = toNumber(createModal.row.basePrice, 0)
    if (from === to) {
      setCreateModal(prev =>
        prev
          ? {
              ...prev,
              payableAmount: String(baseAmount),
              customRate: prev.customRate || '1',
              fxLoading: false,
              fxError: ''
            }
          : prev
      )
      return
    }
    if (createModal.rateSource === 'custom') {
      const unitRate = toNumber(createModal.customRate, NaN)
      if (!Number.isFinite(unitRate) || unitRate <= 0) {
        setCreateModal(prev =>
          prev
            ? { ...prev, payableAmount: '', fxLoading: false, fxError: 'Enter valid custom rate.' }
            : prev
        )
        return
      }
      setCreateModal(prev =>
        prev
          ? {
              ...prev,
              payableAmount: String(Number((baseAmount * unitRate).toFixed(2))),
              fxLoading: false,
              fxError: ''
            }
          : prev
      )
      return
    }
    let cancelled = false
    setCreateModal(prev => (prev ? { ...prev, fxLoading: true, fxError: '' } : prev))
    void currencyService
      .convert(baseAmount, from, to)
      .then(converted => {
        if (cancelled) return
        setCreateModal(prev =>
          prev
            ? {
                ...prev,
                payableAmount: String(Number(converted.toFixed(2))),
                fxLoading: false,
                fxError: ''
              }
            : prev
        )
      })
      .catch(() => {
        if (cancelled) return
        setCreateModal(prev =>
          prev
            ? {
                ...prev,
                fxLoading: false,
                fxError: `API conversion failed (${from} -> ${to}). Use custom rate.`
              }
            : prev
        )
      })
    return () => {
      cancelled = true
    }
  }, [
    createModal?.customRate,
    createModal?.ledgerCurrency,
    createModal?.rateSource,
    createModal?.row.basePrice,
    createModal?.row.currency
  ])

  const openSettleModal = (row: Row, payable: Payable) => {
    setSettleModal({
      row,
      payable,
      amount: String(payable.pendingAmount || ''),
      paymentMode: 'BANK_TRANSFER',
      settlementDate: new Date().toISOString().slice(0, 16),
      reference: '',
      notes: '',
      error: ''
    })
  }

  const saveCreate = async () => {
    if (!createModal) return
    const amount = Number(createModal.payableAmount)
    if (!Number.isFinite(amount) || amount <= 0) {
      setCreateModal(prev =>
        prev ? { ...prev, error: 'Payable amount must be greater than 0.' } : prev
      )
      return
    }
    if (!createModal.row.supplierId || createModal.row.supplierId === 'UNASSIGNED' || !createModal.row.bookingId) {
      setCreateModal(prev =>
        prev ? { ...prev, error: 'Valid supplier and booking are required.' } : prev
      )
      return
    }

    setActionLoading(true)
    try {
      await suppliersApi.createPayable(createModal.row.supplierId, {
        bookingId: createModal.row.bookingId,
        payableAmount: amount,
        dueDate: createModal.dueDate || undefined,
        paymentReference: createModal.paymentReference || undefined
      })
      setCreateModal(null)
      await fetchPayables(rows)
      if (selectedSupplierId) {
        await fetchLedger(selectedSupplierId)
      }
    } catch (err) {
      const msg = reportApiError(err, 'Failed to create payable')
      setCreateModal(prev => (prev ? { ...prev, error: msg } : prev))
    } finally {
      setActionLoading(false)
    }
  }

  const saveSettle = async () => {
    if (!settleModal) return
    const amount = Number(settleModal.amount)
    if (!Number.isFinite(amount) || amount <= 0 || amount > settleModal.payable.pendingAmount) {
      setSettleModal(prev =>
        prev
          ? { ...prev, error: 'Settlement amount must be > 0 and <= pending.' }
          : prev
      )
      return
    }

    setActionLoading(true)
    try {
      await suppliersApi.settlePayable(settleModal.payable.id, {
        amount,
        paymentMode: settleModal.paymentMode,
        settlementDate: settleModal.settlementDate
          ? new Date(settleModal.settlementDate).toISOString()
          : undefined,
        reference: settleModal.reference || undefined,
        notes: settleModal.notes || undefined
      })
      setSettleModal(null)
      await fetchPayables(rows)
      await fetchLedger(settleModal.row.supplierId || selectedSupplierId)
    } catch (err) {
      const msg = reportApiError(err, 'Failed to settle payable')
      setSettleModal(prev => (prev ? { ...prev, error: msg } : prev))
    } finally {
      setActionLoading(false)
    }
  }

  const exportCsv = () => {
    if (!groups.length) return
    const header = ['Supplier', 'Currency', 'Services', 'Bookings', 'Service Mix', 'Base Total', 'Payable', 'Settled', 'Pending']
    const lines = groups.map(group => [group.supplierName, group.currency, group.serviceCount, group.bookingCount, group.serviceMix.join(' | '), group.baseTotal, group.payableTotal, group.paidTotal, group.pendingTotal])
    const csv = [header, ...lines].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `supplier-accounting-grouped-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className='space-y-4'>
      <SurfaceCard className='border border-blue-200 bg-blue-50/70 p-4 dark:border-blue-900 dark:bg-blue-900/20'>
        <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
          <div>
            <h3 className='text-sm font-semibold text-blue-900 dark:text-blue-100'>Supplier Services - Grouped Accountant View</h3>
            <p className='text-sm text-blue-800 dark:text-blue-200'>Supplier-wise grouping. Click a supplier row to open full service pricing + settlement ledger page.</p>
          </div>
          <div className='flex items-center gap-2'>
            <button onClick={() => void fetchRows()} disabled={loading} className='inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50'><FaRotate className={loading ? 'animate-spin' : ''} />Refresh</button>
            <button onClick={exportCsv} disabled={!groups.length} className='inline-flex items-center gap-2 rounded-lg border border-green-500 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50'><FaDownload />Export</button>
          </div>
        </div>
      </SurfaceCard>

      {error ? <div className='rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700'>{error}</div> : null}

      {!selectedGroup ? (
        <>
          <SurfaceCard className='border border-gray-200 p-4 dark:border-gray-800'>
            <div className='grid grid-cols-1 gap-3 lg:grid-cols-4'>
              <div className='relative lg:col-span-2'>
                <FaSearch className='pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400' />
                <input type='text' value={search} onChange={e => setSearch(e.target.value)} className='field-input !pl-9' placeholder='Search supplier, lead, booking, service...' />
              </div>
              <SearchableDropdown value={supplierFilter} onChange={setSupplierFilter} options={supplierOptions} placeholder='All Suppliers' className='w-full' />
              <div className='grid grid-cols-2 gap-2'>
                <input type='date' value={fromDate} onChange={e => setFromDate(e.target.value)} className='field-input' />
                <input type='date' value={toDate} onChange={e => setToDate(e.target.value)} className='field-input' />
              </div>
            </div>
          </SurfaceCard>

          <SurfaceCard className='overflow-hidden border border-gray-200 dark:border-gray-800'>
            {!groups.length ? (
              <div className='p-6'><EmptyState title={loading ? 'Loading...' : 'No suppliers found'} description='No grouped supplier service data found for this filter.' icon={<FaBuilding className='text-4xl' />} /></div>
            ) : (
              <div className='w-full max-w-full overflow-x-auto'>
                <table className='w-full min-w-[980px]'>
                  <thead className='bg-gray-50 dark:bg-gray-800/60'><tr><th className='px-4 py-3 text-left text-xs font-semibold text-gray-500'>Supplier</th><th className='px-4 py-3 text-left text-xs font-semibold text-gray-500'>Services / Mix</th><th className='px-4 py-3 text-right text-xs font-semibold text-gray-500'>Bookings</th><th className='px-4 py-3 text-right text-xs font-semibold text-gray-500'>Base</th><th className='px-4 py-3 text-right text-xs font-semibold text-gray-500'>Payable</th><th className='px-4 py-3 text-right text-xs font-semibold text-gray-500'>Settled</th><th className='px-4 py-3 text-right text-xs font-semibold text-gray-500'>Pending</th><th className='px-4 py-3 text-left text-xs font-semibold text-gray-500'>Open</th></tr></thead>
                  <tbody className='divide-y divide-gray-100 dark:divide-gray-800'>
                    {groups.map(group => (
                      <tr key={group.supplierId} className='cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/40' onClick={() => setSelectedSupplierId(group.supplierId)}>
                        <td className='px-4 py-3 text-sm'><p className='font-semibold'>{group.supplierName}</p><p className='text-xs text-gray-500'>{group.currency}</p></td>
                        <td className='px-4 py-3 text-sm'><p>{group.serviceCount} services</p><p className='line-clamp-2 text-xs text-gray-500'>{group.serviceMix.join(', ')}</p></td>
                        <td className='px-4 py-3 text-right text-sm'>{group.bookingCount}</td>
                        <td className='px-4 py-3 text-right text-sm font-semibold'>{formatCurrency(group.baseTotal, group.currency)}</td>
                        <td className='px-4 py-3 text-right text-sm'>{formatCurrency(group.payableTotal, group.currency)}</td>
                        <td className='px-4 py-3 text-right text-sm text-green-700'>{formatCurrency(group.paidTotal, group.currency)}</td>
                        <td className='px-4 py-3 text-right text-sm font-semibold text-rose-700'>{formatCurrency(group.pendingTotal, group.currency)}</td>
                        <td className='px-4 py-3 text-sm'><button className='rounded-lg border border-blue-500 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-50' onClick={e => { e.stopPropagation(); setSelectedSupplierId(group.supplierId) }}>Open Accountant Page</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className='flex items-center justify-between border-t border-gray-200 px-4 py-3 text-xs text-gray-500 dark:border-gray-800'>
              <p>Page {pagination.page} of {pagination.totalPages} | Total {pagination.totalItems}{payablesLoading ? ' | Loading payables...' : ''}</p>
              <div className='flex items-center gap-2'>
                <button onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))} disabled={pagination.page <= 1 || loading} className='rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-700 disabled:opacity-40'>Previous</button>
                <button onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.totalPages, prev.page + 1) }))} disabled={pagination.page >= pagination.totalPages || loading} className='rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-700 disabled:opacity-40'>Next</button>
              </div>
            </div>
          </SurfaceCard>
        </>
      ) : (
        <>
          <SurfaceCard className='border border-gray-200 p-4 dark:border-gray-800'>
            <button onClick={() => setSelectedSupplierId('')} className='inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100'><FaArrowLeft />Back To Groups</button>
            <div className='mt-3'>
              <h3 className='text-base font-semibold text-gray-900 dark:text-gray-100'>{selectedGroup.supplierName}</h3>
              <p className='text-xs text-gray-500'>Currency: {selectedGroup.currency} | Services: {selectedGroup.serviceCount}</p>
            </div>
          </SurfaceCard>

          <SurfaceCard className='overflow-hidden border border-gray-200 p-0 dark:border-gray-800'>
            <div className='border-b border-gray-200 px-4 py-3 text-sm font-semibold dark:border-gray-800'>
              Bookings ({bookingSummaryRows.length}) — same layout as supplier page
            </div>
            {bookingSummaryRows.length ? (
              <div className='w-full max-w-full overflow-x-auto'>
                <table className='w-full min-w-[960px]'>
                  <thead className='border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/60'>
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
                    {bookingSummaryRows.map(b => (
                      <tr key={b.bookingId} className='hover:bg-gray-50 dark:hover:bg-gray-800/50'>
                        <td className='px-4 py-3 text-sm text-gray-900 dark:text-gray-100'>{b.customer}</td>
                        <td className='px-4 py-3 text-sm font-mono text-gray-600 dark:text-gray-400'>{b.bookingNumber}</td>
                        <td className='px-4 py-3 text-sm text-gray-700 dark:text-gray-300'>{b.destination}</td>
                        <td className='px-4 py-3 text-sm text-gray-700 dark:text-gray-300'>
                          <div>{b.serviceTitle}</div>
                          {b.serviceDetail ? (
                            <div className='mt-1 text-xs text-gray-500 dark:text-gray-400'>{b.serviceDetail}</div>
                          ) : null}
                        </td>
                        <td className='px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-gray-100'>
                          {formatCurrency(b.baseTotal, b.baseCurrency)}
                        </td>
                        <td className='px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-gray-100'>
                          {formatCurrency(b.amount, b.amountCurrency)}
                        </td>
                        <td className='px-4 py-3 text-center'>
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize ${
                              b.status.toLowerCase() === 'confirmed'
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                                : b.status.toLowerCase() === 'pending'
                                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                                  : b.status.toLowerCase() === 'cancelled'
                                    ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                                    : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                            }`}
                          >
                            {formatLabel(b.status || 'pending')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className='px-4 py-6 text-sm text-gray-500'>No booking rows for this supplier in the current report page.</div>
            )}
          </SurfaceCard>

          <SurfaceCard className='overflow-hidden border border-gray-200 dark:border-gray-800'>
            <div className='border-b border-gray-200 px-4 py-3 text-sm font-semibold dark:border-gray-800'>Service & Price Details</div>
            <div className='w-full max-w-full overflow-x-auto'>
              <table className='w-full min-w-[960px]'>
                <thead className='bg-gray-50 dark:bg-gray-800/60'><tr><th className='px-4 py-3 text-left text-xs font-semibold text-gray-500'>Lead</th><th className='px-4 py-3 text-left text-xs font-semibold text-gray-500'>Booking</th><th className='px-4 py-3 text-left text-xs font-semibold text-gray-500'>Service</th><th className='px-4 py-3 text-right text-xs font-semibold text-gray-500'>Base Price</th><th className='px-4 py-3 text-right text-xs font-semibold text-gray-500'>Payable</th><th className='px-4 py-3 text-right text-xs font-semibold text-gray-500'>Paid</th><th className='px-4 py-3 text-right text-xs font-semibold text-gray-500'>Pending</th><th className='px-4 py-3 text-left text-xs font-semibold text-gray-500'>Status</th><th className='px-4 py-3 text-left text-xs font-semibold text-gray-500'>Action</th></tr></thead>
                <tbody className='divide-y divide-gray-100 dark:divide-gray-800'>
                  {selectedGroup.rows.map(row => {
                    const payable = getPayable(row)
                    return (
                      <tr key={row.id}>
                        <td className='px-4 py-3 text-sm'><p className='font-medium'>{row.leadName}</p><p className='text-xs text-gray-500'>{row.quoteNumber}</p></td>
                        <td className='px-4 py-3 text-sm'><p>{row.bookingNumber}</p><p className='text-xs text-gray-500'>{formatLabel(row.bookingStatus || 'PENDING')} | {formatLabel(row.paymentStatus || 'PENDING')}</p></td>
                        <td className='px-4 py-3 text-sm'>{row.serviceLabel}</td>
                        <td className='px-4 py-3 text-right text-sm font-semibold'>{formatCurrency(row.basePrice, row.currency)}</td>
                        <td className='px-4 py-3 text-right text-sm'>{payable ? formatCurrency(payable.payableAmount, row.currency) : '-'}</td>
                        <td className='px-4 py-3 text-right text-sm text-green-700'>{payable ? formatCurrency(payable.paidAmount, row.currency) : '-'}</td>
                        <td className='px-4 py-3 text-right text-sm font-semibold text-rose-700'>{payable ? formatCurrency(payable.pendingAmount, row.currency) : '-'}</td>
                        <td className='px-4 py-3 text-sm'>{payable ? formatLabel(payable.status) : 'Not Created'}</td>
                        <td className='px-4 py-3 text-sm'>
                          {!payable ? (
                            <button
                              onClick={() => openCreateModal(row)}
                              disabled={actionLoading}
                              className='rounded-lg border border-blue-500 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-40'
                            >
                              Create Payable
                            </button>
                          ) : payable.pendingAmount > 0 ? (
                            <button
                              onClick={() => openSettleModal(row, payable)}
                              disabled={actionLoading}
                              className='rounded-lg border border-green-500 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-50 disabled:opacity-40'
                            >
                              Settle Payment
                            </button>
                          ) : (
                            <span className='rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-700'>
                              Settled
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </SurfaceCard>

          <SurfaceCard className='overflow-hidden border border-gray-200 dark:border-gray-800'>
            <div className='border-b border-gray-200 px-4 py-3 text-sm font-semibold dark:border-gray-800'>Settlement Ledger</div>
            {ledgerLoading ? (
              <div className='p-4 text-sm text-gray-500'>Loading settlement history...</div>
            ) : !ledgerRows.length ? (
              <div className='p-4 text-sm text-gray-500'>No settlement history.</div>
            ) : (
              <div className='max-h-[380px] overflow-auto'>
                <table className='w-full min-w-[700px]'>
                  <thead className='sticky top-0 bg-gray-50 dark:bg-gray-800/60'><tr><th className='px-4 py-3 text-left text-xs font-semibold text-gray-500'>Date</th><th className='px-4 py-3 text-left text-xs font-semibold text-gray-500'>Booking</th><th className='px-4 py-3 text-right text-xs font-semibold text-gray-500'>Amount</th><th className='px-4 py-3 text-left text-xs font-semibold text-gray-500'>Mode</th><th className='px-4 py-3 text-left text-xs font-semibold text-gray-500'>Reference</th></tr></thead>
                  <tbody className='divide-y divide-gray-100 dark:divide-gray-800'>
                    {ledgerRows.map(item => (
                      <tr key={item.id}>
                        <td className='px-4 py-3 text-sm'>{formatDateTime(item.settlementDate)}</td>
                        <td className='px-4 py-3 text-sm'>{item.bookingNumber}</td>
                        <td className='px-4 py-3 text-right text-sm font-semibold text-green-700'>{formatCurrency(item.settlementAmount, selectedGroup.currency)}</td>
                        <td className='px-4 py-3 text-sm'>{formatLabel(item.paymentMode)}</td>
                        <td className='px-4 py-3 text-sm'>{item.reference || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SurfaceCard>
        </>
      )}

      {createModal ? (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4'>
          <div className='w-full max-w-lg rounded-xl bg-white shadow-2xl dark:bg-gray-900'>
            <div className='flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-800'>
              <div>
                <h3 className='text-base font-semibold'>Create Supplier Payable</h3>
                <p className='text-xs text-gray-500'>
                  {createModal.row.supplierName} | {createModal.row.bookingNumber}
                </p>
              </div>
              <button
                onClick={() => setCreateModal(null)}
                className='text-gray-500 hover:text-gray-700'
              >
                <FaXmark />
              </button>
            </div>
            <div className='space-y-3 px-5 py-4'>
              <div className='rounded-lg border border-blue-100 bg-blue-50/70 px-3 py-2 text-xs text-blue-900 dark:border-blue-900/40 dark:bg-blue-900/20 dark:text-blue-200'>
                Booking currency: {toUpper(createModal.row.currency, 'INR')} | Ledger currency: {createModal.ledgerCurrency}
              </div>
              <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
                <div>
                  <label className='field-label'>Rate Source</label>
                  <SearchableDropdown
                    value={createModal.rateSource}
                    onChange={value =>
                      setCreateModal(prev =>
                        prev
                          ? {
                              ...prev,
                              rateSource: value === 'custom' ? 'custom' : 'api',
                              fxError: ''
                            }
                          : prev
                      )
                    }
                    options={[
                      { value: 'api', label: 'API rate' },
                      { value: 'custom', label: 'Custom rate' }
                    ]}
                    placeholder='Rate source'
                    className='w-full'
                  />
                </div>
                <div>
                  <label className='field-label'>
                    1 {toUpper(createModal.row.currency, 'INR')} = ? {createModal.ledgerCurrency}
                  </label>
                  <input
                    type='number'
                    min='0'
                    step='0.000001'
                    disabled={createModal.rateSource !== 'custom'}
                    value={createModal.customRate}
                    onChange={event =>
                      setCreateModal(prev =>
                        prev ? { ...prev, customRate: event.target.value, fxError: '' } : prev
                      )
                    }
                    className='field-input'
                    placeholder='Custom rate'
                  />
                </div>
              </div>
              <div>
                <label className='field-label'>Payable Amount *</label>
                <input
                  type='number'
                  min='0'
                  step='0.01'
                  value={createModal.payableAmount}
                  onChange={event =>
                    setCreateModal(prev =>
                      prev
                        ? { ...prev, payableAmount: event.target.value, error: '' }
                        : prev
                    )
                  }
                  className='field-input'
                />
                {createModal.fxLoading ? (
                  <p className='mt-1 text-xs text-blue-700'>Converting using API rate...</p>
                ) : null}
                {createModal.fxError ? (
                  <p className='mt-1 text-xs text-amber-700'>{createModal.fxError}</p>
                ) : null}
              </div>
              <div>
                <label className='field-label'>Due Date</label>
                <input
                  type='date'
                  value={createModal.dueDate}
                  onChange={event =>
                    setCreateModal(prev =>
                      prev ? { ...prev, dueDate: event.target.value } : prev
                    )
                  }
                  className='field-input'
                />
              </div>
              <div>
                <label className='field-label'>Payment Reference</label>
                <input
                  type='text'
                  value={createModal.paymentReference}
                  onChange={event =>
                    setCreateModal(prev =>
                      prev
                        ? { ...prev, paymentReference: event.target.value, error: '' }
                        : prev
                    )
                  }
                  className='field-input'
                />
              </div>
              {createModal.error ? (
                <p className='rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700'>
                  {createModal.error}
                </p>
              ) : null}
            </div>
            <div className='flex items-center justify-end gap-2 border-t border-gray-200 px-5 py-4 dark:border-gray-800'>
              <button
                onClick={() => setCreateModal(null)}
                className='rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100'
              >
                Cancel
              </button>
              <button
                onClick={() => void saveCreate()}
                disabled={actionLoading}
                className='rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50'
              >
                {actionLoading ? 'Saving...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {settleModal ? (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4'>
          <div className='w-full max-w-xl rounded-xl bg-white shadow-2xl dark:bg-gray-900'>
            <div className='flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-800'>
              <div>
                <h3 className='text-base font-semibold'>Settle Supplier Payment</h3>
                <p className='text-xs text-gray-500'>
                  Pending:{' '}
                  {formatCurrency(settleModal.payable.pendingAmount, settleModal.row.currency)}
                </p>
              </div>
              <button
                onClick={() => setSettleModal(null)}
                className='text-gray-500 hover:text-gray-700'
              >
                <FaXmark />
              </button>
            </div>
            <div className='space-y-3 px-5 py-4'>
              <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
                <div>
                  <label className='field-label'>Settlement Amount *</label>
                  <input
                    type='number'
                    min='0'
                    step='0.01'
                    value={settleModal.amount}
                    onChange={event =>
                      setSettleModal(prev =>
                        prev ? { ...prev, amount: event.target.value, error: '' } : prev
                      )
                    }
                    className='field-input'
                  />
                </div>
                <div>
                  <label className='field-label'>Payment Mode *</label>
                  <SearchableDropdown
                    value={settleModal.paymentMode}
                    onChange={value =>
                      setSettleModal(prev =>
                        prev ? { ...prev, paymentMode: value } : prev
                      )
                    }
                    options={paymentModes.map(mode => ({
                      value: mode,
                      label: formatLabel(mode)
                    }))}
                    placeholder='Select mode'
                    className='w-full'
                  />
                </div>
                <div>
                  <label className='field-label'>Settlement Date</label>
                  <input
                    type='datetime-local'
                    value={settleModal.settlementDate}
                    onChange={event =>
                      setSettleModal(prev =>
                        prev ? { ...prev, settlementDate: event.target.value } : prev
                      )
                    }
                    className='field-input'
                  />
                </div>
                <div>
                  <label className='field-label'>Reference</label>
                  <input
                    type='text'
                    value={settleModal.reference}
                    onChange={event =>
                      setSettleModal(prev =>
                        prev ? { ...prev, reference: event.target.value } : prev
                      )
                    }
                    className='field-input'
                  />
                </div>
              </div>
              <div>
                <label className='field-label'>Notes</label>
                <textarea
                  rows={3}
                  value={settleModal.notes}
                  onChange={event =>
                    setSettleModal(prev =>
                      prev ? { ...prev, notes: event.target.value } : prev
                    )
                  }
                  className='field-input'
                />
              </div>
              {settleModal.error ? (
                <p className='rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700'>
                  {settleModal.error}
                </p>
              ) : null}
            </div>
            <div className='flex items-center justify-end gap-2 border-t border-gray-200 px-5 py-4 dark:border-gray-800'>
              <button
                onClick={() => setSettleModal(null)}
                className='rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100'
              >
                Cancel
              </button>
              <button
                onClick={() => void saveSettle()}
                disabled={actionLoading}
                className='rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50'
              >
                {actionLoading ? 'Settling...' : 'Settle'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default SupplierServiceBreakdown
