import React, { useEffect, useMemo, useState } from 'react'
import {
  FaBell,
  FaCircleCheck,
  FaPenToSquare,
  FaPlus,
  FaRotate,
  FaWallet
} from 'react-icons/fa6'
import SurfaceCard from '../../components/ui/SurfaceCard'
import SearchableDropdown from '../../components/ui/SearchableDropdown'
import { suppliersApi } from '../../api/suppliers'
import { getApiErrorMessage } from '../../api/apiClient'

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
}

interface SupplierPayable {
  id: string
  supplierId: string
  bookingId: string
  payableAmount: number
  paidAmount: number
  dueDate?: string
  dueInDays?: number | null
  status: 'PENDING' | 'PARTIAL' | 'PAID'
  paymentReference?: string
}

type SupplierForm = {
  name: string
  contactPerson: string
  phone: string
  email: string
  country: string
  supplierCurrency: string
  contractUrl: string
  rateValidUntil: string
  paymentDeadlineDate: string
  productionCommitment: string
  isActive: boolean
}

type PayableForm = {
  bookingId: string
  payableAmount: string
  paidAmount: string
  dueDate: string
  status: 'PENDING' | 'PARTIAL' | 'PAID'
  paymentReference: string
}

const emptySupplierForm: SupplierForm = {
  name: '',
  contactPerson: '',
  phone: '',
  email: '',
  country: '',
  supplierCurrency: 'INR',
  contractUrl: '',
  rateValidUntil: '',
  paymentDeadlineDate: '',
  productionCommitment: '',
  isActive: true
}

const emptyPayableForm: PayableForm = {
  bookingId: '',
  payableAmount: '',
  paidAmount: '0',
  dueDate: '',
  status: 'PENDING',
  paymentReference: ''
}

const normalizeDate = (value?: string | null) => {
  if (!value) return ''
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return ''
  return parsed.toISOString().slice(0, 10)
}

const formatDate = (value?: string | null) => {
  const date = normalizeDate(value)
  if (!date) return 'Not set'
  return new Date(`${date}T00:00:00`).toLocaleDateString()
}

const toNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const unwrapList = (payload: unknown): any[] => {
  const data = (payload as { data?: unknown })?.data ?? payload
  if (Array.isArray((data as { data?: unknown[] })?.data)) {
    return (data as { data: unknown[] }).data
  }
  if (Array.isArray((data as { items?: unknown[] })?.items)) {
    return (data as { items: unknown[] }).items
  }
  if (Array.isArray(data)) return data
  return []
}

const unwrapObject = (payload: unknown): any =>
  (payload as { data?: unknown })?.data ?? payload

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
  paymentDeadlineDate:
    raw?.paymentDeadlineDate ?? raw?.payment_deadline_date ?? '',
  productionCommitment:
    raw?.productionCommitment ?? raw?.production_commitment ?? '',
  isActive: raw?.isActive ?? raw?.is_active ?? true
})

const mapPayable = (raw: any): SupplierPayable => ({
  id: String(raw?.id ?? ''),
  supplierId: String(raw?.supplierId ?? raw?.supplier_id ?? ''),
  bookingId: String(raw?.bookingId ?? raw?.booking_id ?? ''),
  payableAmount: toNumber(raw?.payableAmount ?? raw?.payable_amount, 0),
  paidAmount: toNumber(raw?.paidAmount ?? raw?.paid_amount, 0),
  dueDate: raw?.dueDate ?? raw?.due_date ?? '',
  dueInDays:
    raw?.dueInDays === null || raw?.dueInDays === undefined
      ? null
      : toNumber(raw?.dueInDays, 0),
  status: String(
    raw?.status ?? 'PENDING'
  ).toUpperCase() as SupplierPayable['status'],
  paymentReference: raw?.paymentReference ?? raw?.payment_reference ?? ''
})

const dueBadgeClass = (payable: SupplierPayable) => {
  if (payable.status === 'PAID') {
    return 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-900'
  }
  if (typeof payable.dueInDays === 'number' && payable.dueInDays < 0) {
    return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-900'
  }
  if (typeof payable.dueInDays === 'number' && payable.dueInDays <= 2) {
    return 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-900'
  }
  return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-900'
}

const dueLabel = (payable: SupplierPayable) => {
  if (payable.status === 'PAID') return 'Paid'
  if (typeof payable.dueInDays !== 'number') return 'No due date'
  if (payable.dueInDays < 0)
    return `Overdue by ${Math.abs(payable.dueInDays)} day(s)`
  if (payable.dueInDays === 0) return 'Due today'
  return `Due in ${payable.dueInDays} day(s)`
}

const SuppliersPage: React.FC = () => {
  const [loadingSuppliers, setLoadingSuppliers] = useState(false)
  const [loadingPayables, setLoadingPayables] = useState(false)
  const [savingSupplier, setSavingSupplier] = useState(false)
  const [savingPayable, setSavingPayable] = useState(false)
  const [runningAlerts, setRunningAlerts] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [payables, setPayables] = useState<SupplierPayable[]>([])
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('')
  const [editingSupplierId, setEditingSupplierId] = useState<string>('')
  const [supplierSearch, setSupplierSearch] = useState('')
  const [supplierStatusFilter, setSupplierStatusFilter] = useState<
    'ALL' | 'ACTIVE' | 'INACTIVE'
  >('ALL')
  const [payableStatusFilter, setPayableStatusFilter] = useState<
    'ALL' | SupplierPayable['status']
  >('ALL')
  const [supplierForm, setSupplierForm] =
    useState<SupplierForm>(emptySupplierForm)
  const [payableForm, setPayableForm] = useState<PayableForm>(emptyPayableForm)

  const selectedSupplier = useMemo(
    () => suppliers.find(item => item.id === selectedSupplierId) || null,
    [suppliers, selectedSupplierId]
  )

  const filteredSuppliers = useMemo(() => {
    const query = supplierSearch.trim().toLowerCase()
    return suppliers.filter(supplier => {
      const statusMatch =
        supplierStatusFilter === 'ALL' ||
        (supplierStatusFilter === 'ACTIVE' && supplier.isActive !== false) ||
        (supplierStatusFilter === 'INACTIVE' && supplier.isActive === false)
      if (!statusMatch) return false
      if (!query) return true
      const text =
        `${supplier.name} ${supplier.contactPerson} ${supplier.email} ${supplier.country}`.toLowerCase()
      return text.includes(query)
    })
  }, [suppliers, supplierSearch, supplierStatusFilter])

  const filteredPayables = useMemo(() => {
    if (payableStatusFilter === 'ALL') return payables
    return payables.filter(item => item.status === payableStatusFilter)
  }, [payables, payableStatusFilter])

  const payableFormStatusOptions = [
    { value: 'PENDING', label: 'PENDING' },
    { value: 'PARTIAL', label: 'PARTIAL' },
    { value: 'PAID', label: 'PAID' }
  ]

  const supplierStats = useMemo(
    () => ({
      total: suppliers.length,
      active: suppliers.filter(item => item.isActive !== false).length,
      inactive: suppliers.filter(item => item.isActive === false).length
    }),
    [suppliers]
  )

  const payableStats = useMemo(() => {
    const totalPayable = payables.reduce(
      (sum, row) => sum + row.payableAmount,
      0
    )
    const totalPaid = payables.reduce((sum, row) => sum + row.paidAmount, 0)
    const pending = totalPayable - totalPaid
    const dueSoon = payables.filter(
      row =>
        row.status !== 'PAID' &&
        typeof row.dueInDays === 'number' &&
        row.dueInDays >= 0 &&
        row.dueInDays <= 2
    ).length
    const overdue = payables.filter(
      row =>
        row.status !== 'PAID' &&
        typeof row.dueInDays === 'number' &&
        row.dueInDays < 0
    ).length
    return { totalPayable, totalPaid, pending, dueSoon, overdue }
  }, [payables])

  const loadSuppliers = async () => {
    setLoadingSuppliers(true)
    setError('')
    try {
      const response = await suppliersApi.list({ page: 1, limit: 200 })
      const rows = unwrapList(response).map(mapSupplier)
      setSuppliers(rows)

      if (!rows.length) {
        setSelectedSupplierId('')
      } else if (!rows.some(row => row.id === selectedSupplierId)) {
        setSelectedSupplierId(rows[0].id)
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to load suppliers'))
    } finally {
      setLoadingSuppliers(false)
    }
  }

  const loadPayables = async (supplierId: string) => {
    if (!supplierId) {
      setPayables([])
      return
    }

    setLoadingPayables(true)
    setError('')
    try {
      const response = await suppliersApi.listPayables(supplierId, {
        page: 1,
        limit: 200
      })
      setPayables(unwrapList(response).map(mapPayable))
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to load payables'))
      setPayables([])
    } finally {
      setLoadingPayables(false)
    }
  }

  useEffect(() => {
    void loadSuppliers()
  }, [])

  useEffect(() => {
    if (!selectedSupplierId) {
      setPayables([])
      return
    }
    void loadPayables(selectedSupplierId)
  }, [selectedSupplierId])

  const resetSupplierForm = () => {
    setSupplierForm(emptySupplierForm)
    setEditingSupplierId('')
  }

  const handleEditSupplier = (supplier: Supplier) => {
    setEditingSupplierId(supplier.id)
    setSelectedSupplierId(supplier.id)
    setSupplierForm({
      name: supplier.name || '',
      contactPerson: supplier.contactPerson || '',
      phone: supplier.phone || '',
      email: supplier.email || '',
      country: supplier.country || '',
      supplierCurrency: supplier.supplierCurrency || 'INR',
      contractUrl: supplier.contractUrl || '',
      rateValidUntil: normalizeDate(supplier.rateValidUntil),
      paymentDeadlineDate: normalizeDate(supplier.paymentDeadlineDate),
      productionCommitment: supplier.productionCommitment || '',
      isActive: supplier.isActive !== false
    })
  }

  const handleSaveSupplier = async () => {
    if (!supplierForm.name.trim()) {
      setError('Supplier name is required')
      return
    }

    setSavingSupplier(true)
    setError('')
    setNotice('')

    try {
      const payload = {
        name: supplierForm.name.trim(),
        contactPerson: supplierForm.contactPerson.trim() || undefined,
        phone: supplierForm.phone.trim() || undefined,
        email: supplierForm.email.trim() || undefined,
        country: supplierForm.country.trim() || undefined,
        supplierCurrency: supplierForm.supplierCurrency.trim() || undefined,
        contractUrl: supplierForm.contractUrl.trim() || undefined,
        rateValidUntil: supplierForm.rateValidUntil || undefined,
        paymentDeadlineDate: supplierForm.paymentDeadlineDate || undefined,
        productionCommitment:
          supplierForm.productionCommitment.trim() || undefined,
        isActive: supplierForm.isActive
      }

      if (editingSupplierId) {
        const updated = await suppliersApi.update(editingSupplierId, payload)
        const row = mapSupplier(unwrapObject(updated))
        setSuppliers(prev =>
          prev.map(item => (item.id === row.id ? row : item))
        )
        setNotice('Supplier updated')
      } else {
        const created = await suppliersApi.create(payload)
        const row = mapSupplier(unwrapObject(created))
        setSuppliers(prev => [row, ...prev])
        setSelectedSupplierId(row.id)
        setNotice('Supplier created')
      }

      resetSupplierForm()
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to save supplier'))
    } finally {
      setSavingSupplier(false)
    }
  }

  const handleCreatePayable = async () => {
    if (!selectedSupplierId) {
      setError('Select a supplier first')
      return
    }
    if (!payableForm.bookingId.trim()) {
      setError('Booking ID is required')
      return
    }
    if (toNumber(payableForm.payableAmount, 0) <= 0) {
      setError('Payable amount must be greater than 0')
      return
    }

    setSavingPayable(true)
    setError('')
    setNotice('')

    try {
      await suppliersApi.createPayable(selectedSupplierId, {
        bookingId: payableForm.bookingId.trim(),
        payableAmount: toNumber(payableForm.payableAmount, 0),
        paidAmount: toNumber(payableForm.paidAmount, 0),
        dueDate: payableForm.dueDate || undefined,
        status: payableForm.status,
        paymentReference: payableForm.paymentReference.trim() || undefined
      })
      setPayableForm(emptyPayableForm)
      setNotice('Payable created')
      await loadPayables(selectedSupplierId)
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to create payable'))
    } finally {
      setSavingPayable(false)
    }
  }

  const handleMarkPayablePaid = async (payable: SupplierPayable) => {
    setSavingPayable(true)
    setError('')
    setNotice('')

    try {
      await suppliersApi.updatePayable(payable.id, {
        paidAmount: payable.payableAmount,
        status: 'PAID'
      })
      setNotice('Payable marked as paid')
      await loadPayables(selectedSupplierId)
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to update payable'))
    } finally {
      setSavingPayable(false)
    }
  }

  const handleRunDeadlineAlerts = async () => {
    setRunningAlerts(true)
    setError('')
    setNotice('')

    try {
      const response = await suppliersApi.processPayableDeadlineAlerts({
        lookaheadDays: 2,
        limit: 300
      })
      const summary = unwrapObject(response) as {
        processed?: number
        triggered?: number
      }
      setNotice(
        `Deadline alerts checked ${toNumber(
          summary.processed,
          0
        )} payables and triggered ${toNumber(summary.triggered, 0)} alert(s).`
      )
      if (selectedSupplierId) {
        await loadPayables(selectedSupplierId)
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to process deadline alerts'))
    } finally {
      setRunningAlerts(false)
    }
  }

  return (
    <div className='space-y-5'>
      <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <h1 className='text-2xl font-bold text-gray-900 dark:text-gray-100'>
            Supplier Operations
          </h1>
          <p className='text-sm text-gray-500 dark:text-gray-400'>
            Clear workflow for supplier profile, contract validity, and payable
            deadlines.
          </p>
        </div>
        <button
          onClick={() => void loadSuppliers()}
          className='inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800'
        >
          <FaRotate /> Refresh
        </button>
      </div>

      {error ? (
        <div className='rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-900/30 dark:text-red-300'>
          {error}
        </div>
      ) : null}
      {notice ? (
        <div className='rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700 dark:border-green-900 dark:bg-green-900/30 dark:text-green-300'>
          {notice}
        </div>
      ) : null}

      <SurfaceCard className='p-4'>
        <h2 className='text-sm font-semibold text-gray-900 dark:text-gray-100'>
          How To Use This Page
        </h2>
        <p className='mt-2 text-sm text-gray-600 dark:text-gray-300'>
          1) Select or create supplier. 2) Keep contract and rate validity
          updated. 3) Add payables with due dates. 4) Track due risk and run
          alerts when needed.
        </p>
      </SurfaceCard>

      <div className='grid grid-cols-1 gap-4 lg:grid-cols-5'>
        <Metric
          title='Total'
          value={String(supplierStats.total)}
          tone='slate'
        />
        <Metric
          title='Active'
          value={String(supplierStats.active)}
          tone='green'
        />
        <Metric
          title='Inactive'
          value={String(supplierStats.inactive)}
          tone='slate'
        />
        <Metric
          title='Due Soon'
          value={String(payableStats.dueSoon)}
          tone='amber'
        />
        <Metric
          title='Overdue'
          value={String(payableStats.overdue)}
          tone='red'
        />
      </div>

      <div className='grid grid-cols-1 gap-5 xl:grid-cols-[340px_1fr] xl:gap-6 xl:overflow-hidden'>
        <SurfaceCard className='flex flex-col overflow-hidden p-0 xl:h-[calc(100vh-320px)]'>
          <div className='border-b border-gray-200 p-4 dark:border-gray-800'>
            <h2 className='text-sm font-semibold text-gray-900 dark:text-gray-100'>
              Supplier Directory
            </h2>
            <input
              value={supplierSearch}
              onChange={event => setSupplierSearch(event.target.value)}
              className='field-input mt-3'
              placeholder='Search supplier'
            />
            <div className='mt-2 grid grid-cols-3 gap-2'>
              {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map(status => (
                <button
                  key={status}
                  onClick={() => setSupplierStatusFilter(status)}
                  className={`rounded-md border px-2 py-1 text-xs ${
                    supplierStatusFilter === status
                      ? 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-900/30 dark:text-blue-300'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
          <div className='flex-1 overflow-y-auto scrollbar-hide'>
            {loadingSuppliers ? (
              <div className='p-4 text-sm text-gray-500'>
                Loading suppliers...
              </div>
            ) : filteredSuppliers.length ? (
              <div className='divide-y divide-gray-100 dark:divide-gray-800'>
                {filteredSuppliers.map(supplier => (
                  <button
                    key={supplier.id}
                    onClick={() => setSelectedSupplierId(supplier.id)}
                    className={`w-full px-4 py-3 text-left transition-colors ${
                      supplier.id === selectedSupplierId
                        ? 'bg-blue-50 dark:bg-blue-900/20'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                    }`}
                  >
                    <div className='flex items-start justify-between gap-2'>
                      <div>
                        <p className='text-sm font-semibold text-gray-900 dark:text-gray-100'>
                          {supplier.name}
                        </p>
                        <p className='text-xs text-gray-500 dark:text-gray-400'>
                          {supplier.country || 'No country'} |{' '}
                          {supplier.supplierCurrency || 'INR'}
                        </p>
                      </div>
                      <button
                        onClick={event => {
                          event.stopPropagation()
                          handleEditSupplier(supplier)
                        }}
                        className='inline-flex items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-[11px] text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800'
                      >
                        <FaPenToSquare /> Edit
                      </button>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className='p-4 text-sm text-gray-500'>
                No suppliers found.
              </div>
            )}
          </div>
        </SurfaceCard>

        <div className='xl:flex xl:h-[calc(100vh-320px)] xl:flex-col xl:overflow-hidden'>
          <div className='space-y-5 xl:flex-1 xl:overflow-y-auto xl:pr-1 scrollbar-thin-muted'>
            <SurfaceCard className='p-4'>
              <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
                <h2 className='text-sm font-semibold text-gray-900 dark:text-gray-100'>
                  {editingSupplierId ? 'Edit Supplier' : 'Create Supplier'}
                </h2>
                <div className='flex gap-2'>
                  <button
                    onClick={() => void handleSaveSupplier()}
                    disabled={savingSupplier}
                    className='inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60'
                  >
                    <FaCircleCheck /> {editingSupplierId ? 'Update' : 'Create'}
                  </button>
                  <button
                    onClick={resetSupplierForm}
                    className='rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800'
                  >
                    Reset
                  </button>
                </div>
              </div>
              <div className='mt-4 grid grid-cols-1 gap-3 md:grid-cols-2'>
                <div className='md:col-span-2'>
                  <label className='mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300'>
                    Supplier name <span className='text-red-500'>*</span>
                  </label>
                  <input
                    value={supplierForm.name}
                    onChange={event =>
                      setSupplierForm(prev => ({
                        ...prev,
                        name: event.target.value
                      }))
                    }
                    className='field-input'
                    placeholder='Supplier name *'
                  />
                </div>
                <div>
                  <label className='mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300'>
                    Contact person
                  </label>
                  <input
                    value={supplierForm.contactPerson}
                    onChange={event =>
                      setSupplierForm(prev => ({
                        ...prev,
                        contactPerson: event.target.value
                      }))
                    }
                    className='field-input'
                    placeholder='Contact person'
                  />
                </div>
                <div>
                  <label className='mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300'>
                    Phone
                  </label>
                  <input
                    value={supplierForm.phone}
                    onChange={event =>
                      setSupplierForm(prev => ({
                        ...prev,
                        phone: event.target.value
                      }))
                    }
                    className='field-input'
                    placeholder='Phone'
                  />
                </div>
                <div>
                  <label className='mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300'>
                    Email
                  </label>
                  <input
                    value={supplierForm.email}
                    onChange={event =>
                      setSupplierForm(prev => ({
                        ...prev,
                        email: event.target.value
                      }))
                    }
                    className='field-input'
                    placeholder='Email'
                  />
                </div>
                <div>
                  <label className='mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300'>
                    Country
                  </label>
                  <input
                    value={supplierForm.country}
                    onChange={event =>
                      setSupplierForm(prev => ({
                        ...prev,
                        country: event.target.value
                      }))
                    }
                    className='field-input'
                    placeholder='Country'
                  />
                </div>
                <div>
                  <label className='mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300'>
                    Currency
                  </label>
                  <input
                    value={supplierForm.supplierCurrency}
                    onChange={event =>
                      setSupplierForm(prev => ({
                        ...prev,
                        supplierCurrency: event.target.value.toUpperCase()
                      }))
                    }
                    className='field-input'
                    placeholder='Currency'
                  />
                </div>
                <div>
                  <label className='mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300'>
                    Rate valid until
                  </label>
                  <input
                    type='date'
                    value={supplierForm.rateValidUntil}
                    onChange={event =>
                      setSupplierForm(prev => ({
                        ...prev,
                        rateValidUntil: event.target.value
                      }))
                    }
                    min={new Date().toISOString().split('T')[0]}
                    className='field-input text-gray-900'
                  />
                </div>
                <div>
                  <label className='mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300'>
                    Payment deadline date
                  </label>
                  <input
                    type='date'
                    value={supplierForm.paymentDeadlineDate}
                    onChange={event =>
                      setSupplierForm(prev => ({
                        ...prev,
                        paymentDeadlineDate: event.target.value
                      }))
                    }
                    min={new Date().toISOString().split('T')[0]}
                    className='field-input text-gray-900'
                  />
                </div>
                <div className='md:col-span-2'>
                  <label className='mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300'>
                    Contract URL
                  </label>
                  <input
                    value={supplierForm.contractUrl}
                    onChange={event =>
                      setSupplierForm(prev => ({
                        ...prev,
                        contractUrl: event.target.value
                      }))
                    }
                    className='field-input'
                    placeholder='Contract URL'
                  />
                </div>
                <div className='md:col-span-2'>
                  <label className='mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300'>
                    Production commitment
                  </label>
                  <textarea
                    rows={3}
                    value={supplierForm.productionCommitment}
                    onChange={event =>
                      setSupplierForm(prev => ({
                        ...prev,
                        productionCommitment: event.target.value
                      }))
                    }
                    className='field-input'
                    placeholder='Production commitment'
                  />
                </div>
              </div>

              <div className='mt-3 flex items-center gap-2'>
                <input
                  id='supplier-active'
                  type='checkbox'
                  checked={supplierForm.isActive}
                  onChange={event =>
                    setSupplierForm(prev => ({
                      ...prev,
                      isActive: event.target.checked
                    }))
                  }
                />
                <label
                  htmlFor='supplier-active'
                  className='text-sm text-gray-700 dark:text-gray-300'
                >
                  Supplier is active
                </label>
              </div>
            </SurfaceCard>

            <SurfaceCard className='p-4'>
              <div className='flex items-center justify-between gap-3'>
                <h2 className='text-sm font-semibold text-gray-900 dark:text-gray-100'>
                  Supplier Payables
                </h2>
                <button
                  onClick={() => void handleRunDeadlineAlerts()}
                  disabled={runningAlerts}
                  className='inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-60 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800'
                >
                  <FaBell /> {runningAlerts ? 'Running...' : 'Run Alerts'}
                </button>
              </div>

              <div className='mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3'>
                <Info
                  label='Total Payable'
                  value={payableStats.totalPayable.toLocaleString()}
                />
                <Info
                  label='Total Paid'
                  value={payableStats.totalPaid.toLocaleString()}
                />
                <Info
                  label='Pending'
                  value={payableStats.pending.toLocaleString()}
                />
              </div>

              <div className='mt-3 grid grid-cols-1 gap-3 md:grid-cols-2'>
                <div>
                  <label className='mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300'>
                    Booking ID (UUID) <span className='text-red-500'>*</span>
                  </label>
                  <input
                    value={payableForm.bookingId}
                    onChange={event =>
                      setPayableForm(prev => ({
                        ...prev,
                        bookingId: event.target.value
                      }))
                    }
                    className='field-input'
                    placeholder='Booking ID (UUID) *'
                  />
                </div>
                <div>
                  <label className='mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300'>
                    Payment reference
                  </label>
                  <input
                    value={payableForm.paymentReference}
                    onChange={event =>
                      setPayableForm(prev => ({
                        ...prev,
                        paymentReference: event.target.value
                      }))
                    }
                    className='field-input'
                    placeholder='Payment reference'
                  />
                </div>
                <div>
                  <label className='mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300'>
                    Payable amount <span className='text-red-500'>*</span>
                  </label>
                  <input
                    type='number'
                    min='0'
                    value={payableForm.payableAmount}
                    onChange={event =>
                      setPayableForm(prev => ({
                        ...prev,
                        payableAmount: event.target.value
                      }))
                    }
                    className='field-input'
                    placeholder='Payable amount *'
                  />
                </div>
                <div>
                  <label className='mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300'>
                    Paid amount
                  </label>
                  <input
                    type='number'
                    min='0'
                    value={payableForm.paidAmount}
                    onChange={event =>
                      setPayableForm(prev => ({
                        ...prev,
                        paidAmount: event.target.value
                      }))
                    }
                    className='field-input'
                    placeholder='Paid amount'
                  />
                </div>
                <div>
                  <label className='mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300'>
                    Due date
                  </label>
                  <input
                    type='date'
                    value={payableForm.dueDate}
                    onChange={event =>
                      setPayableForm(prev => ({
                        ...prev,
                        dueDate: event.target.value
                      }))
                    }
                    className='field-input'
                  />
                </div>
                <div>
                  <label className='mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300'>
                    Status
                  </label>
                  <SearchableDropdown
                    value={payableForm.status}
                    options={payableFormStatusOptions}
                    onChange={value =>
                      setPayableForm(prev => ({
                        ...prev,
                        status: value as PayableForm['status']
                      }))
                    }
                    searchPlaceholder='Search payable status...'
                  />
                </div>
              </div>

              <button
                onClick={() => void handleCreatePayable()}
                disabled={savingPayable || !selectedSupplier}
                className='mt-3 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60'
              >
                <FaPlus /> Add Payable
              </button>

              <div className='mt-3 flex flex-wrap gap-2'>
                {(['ALL', 'PENDING', 'PARTIAL', 'PAID'] as const).map(
                  status => (
                    <button
                      key={status}
                      onClick={() => setPayableStatusFilter(status)}
                      className={`rounded-full border px-3 py-1 text-xs ${
                        payableStatusFilter === status
                          ? 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-900/30 dark:text-blue-300'
                          : 'border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800'
                      }`}
                    >
                      {status}
                    </button>
                  )
                )}
              </div>

              <div className='mt-3 space-y-2'>
                {loadingPayables ? (
                  <p className='text-sm text-gray-500'>Loading payables...</p>
                ) : filteredPayables.length ? (
                  filteredPayables.map(payable => (
                    <div
                      key={payable.id}
                      className='rounded-lg border border-gray-200 p-3 dark:border-gray-700'
                    >
                      <div className='flex items-start justify-between gap-3'>
                        <div>
                          <p className='text-sm font-semibold text-gray-900 dark:text-gray-100'>
                            Booking {payable.bookingId}
                          </p>
                          <p className='text-xs text-gray-500 dark:text-gray-400'>
                            Due: {formatDate(payable.dueDate)} | Ref:{' '}
                            {payable.paymentReference || 'N/A'}
                          </p>
                        </div>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${dueBadgeClass(
                            payable
                          )}`}
                        >
                          {dueLabel(payable)}
                        </span>
                      </div>
                      <div className='mt-2 flex items-center justify-between text-xs text-gray-600 dark:text-gray-300'>
                        <span>
                          Payable: {payable.payableAmount.toLocaleString()}
                        </span>
                        <span>Paid: {payable.paidAmount.toLocaleString()}</span>
                      </div>
                      {payable.status !== 'PAID' ? (
                        <button
                          onClick={() => void handleMarkPayablePaid(payable)}
                          className='mt-2 inline-flex items-center gap-2 rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800'
                        >
                          <FaWallet /> Mark Paid
                        </button>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <p className='text-sm text-gray-500'>No payables found.</p>
                )}
              </div>
            </SurfaceCard>
          </div>
        </div>
      </div>
    </div>
  )
}

const Metric = ({
  title,
  value,
  tone
}: {
  title: string
  value: string
  tone: 'green' | 'amber' | 'red' | 'slate'
}) => {
  const toneClass = {
    green:
      'border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-900/20',
    amber:
      'border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-900/20',
    red: 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-900/20',
    slate: 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/60'
  }[tone]

  return (
    <div className={`rounded-xl border px-4 py-3 ${toneClass}`}>
      <p className='text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400'>
        {title}
      </p>
      <p className='mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100'>
        {value}
      </p>
    </div>
  )
}

const Info = ({ label, value }: { label: string; value: string }) => (
  <div className='rounded-lg border border-gray-200 p-3 dark:border-gray-700'>
    <p className='text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400'>
      {label}
    </p>
    <p className='mt-1 break-words text-sm font-medium text-gray-900 dark:text-gray-100'>
      {value}
    </p>
  </div>
)

export default SuppliersPage
