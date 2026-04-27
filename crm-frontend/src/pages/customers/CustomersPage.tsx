import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FaPlus,
  FaSearch,
  FaDownload,
  FaEdit,
  FaTrash,
  FaEye,
  FaChevronLeft,
  FaChevronRight,
  FaPhone,
  FaEnvelope
} from 'react-icons/fa'
import { MdOutlineSegment } from 'react-icons/md'
import { reportApiError } from '../../lib/notify'
import { customersApi } from '../../api/customers'
import SearchableDropdown from '../../components/ui/SearchableDropdown'
import EmptyState from '../../components/ui/EmptyState'

interface Customer {
  id: string
  fullName: string
  phone?: string
  email?: string
  preferences?: string
  lifetimeValue?: number
  segment?: 'PLATINUM' | 'GOLD' | 'SILVER' | 'NEW' | string
  panNumber?: string
  addressLine?: string
  clientCurrency?: string
  createdAt?: string
  totalBookings?: number
  lastBookingDate?: string
  lastBookingNumber?: string
}

interface CustomersPagination {
  page: number
  limit: number
  totalItems: number
  totalPages: number
}

interface CustomersSummary {
  totalCustomers: number
  newCustomers: number
  platinumCustomers: number
  averageLifetimeValue: number
  totalBookings: number
}

const PAGE_SIZE_OPTIONS = [
  { value: '10', label: '10 rows' },
  { value: '25', label: '25 rows' },
  { value: '50', label: '50 rows' }
]

const DESKTOP_ROW_HEIGHT = 80
const DESKTOP_VIEWPORT_HEIGHT = 480
const DESKTOP_OVERSCAN = 4

const CustomersPage: React.FC = () => {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [segmentFilter, setSegmentFilter] = useState<string>('all')
  const [currencyFilter, setCurrencyFilter] = useState<string>('all')
  const [createdFrom, setCreatedFrom] = useState('')
  const [createdTo, setCreatedTo] = useState('')
  const [sortBy, setSortBy] = useState<string>('createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(15)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showMobileFilters, setShowMobileFilters] = useState(false)
  const [tableScrollTop, setTableScrollTop] = useState(0)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [pagination, setPagination] = useState<CustomersPagination>({
    page: 1,
    limit: 15,
    totalItems: 0,
    totalPages: 1
  })
  const [summary, setSummary] = useState<CustomersSummary>({
    totalCustomers: 0,
    newCustomers: 0,
    platinumCustomers: 0,
    averageLifetimeValue: 0,
    totalBookings: 0
  })

  const [editFormData, setEditFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    preferences: '',
    panNumber: '',
    addressLine: '',
    clientCurrency: 'USD',
    segment: 'NEW' as Customer['segment']
  })

  const [editFormErrors, setEditFormErrors] = useState({
    fullName: '',
    phone: '',
    email: '',
    panNumber: '',
    addressLine: ''
  })

  const segments = [
    { value: 'PLATINUM', label: 'Platinum', color: 'purple' },
    { value: 'GOLD', label: 'Gold', color: 'yellow' },
    { value: 'SILVER', label: 'Silver', color: 'gray' },
    { value: 'NEW', label: 'New', color: 'blue' }
  ]

  const currencies = [
    { value: 'USD', label: 'USD - US Dollar' },
    { value: 'EUR', label: 'EUR - Euro' },
    { value: 'GBP', label: 'GBP - British Pound' },
    { value: 'INR', label: 'INR - Indian Rupee' },
    { value: 'AED', label: 'AED - UAE Dirham' },
    { value: 'CAD', label: 'CAD - Canadian Dollar' },
    { value: 'AUD', label: 'AUD - Australian Dollar' }
  ]

  const segmentFilterOptions = [
    { value: 'all', label: 'All Segments' },
    ...segments.map(segment => ({ value: segment.value, label: segment.label }))
  ]

  const currencyFilterOptions = [
    { value: 'all', label: 'All Currencies' },
    ...currencies.map(currency => ({
      value: currency.value,
      label: currency.label
    }))
  ]

  const sortByOptions = [
    { value: 'createdAt', label: 'Sort by Created' },
    { value: 'name', label: 'Sort by Name' },
    { value: 'ltv', label: 'Sort by LTV' },
    { value: 'bookings', label: 'Sort by Bookings' }
  ]

  const getSegmentClass = (segment: string) => {
    switch (segment) {
      case 'VIP':
      case 'PLATINUM':
        return 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-900'
      case 'HIGH_VALUE':
      case 'GOLD':
        return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-900'
      case 'REGULAR':
      case 'SILVER':
        return 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-900'
      case 'NEW':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-900'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'
    }
  }

  const getSegmentLabel = (segment?: string) => {
    const match = segments.find(s => s.value === segment)
    if (match) return match.label
    if (!segment) return 'New'
    return segment.replace('_', ' ')
  }

  const formatCurrency = (amount?: number, currency = 'USD') => {
    const safeAmount = Number.isFinite(amount) ? Number(amount) : 0
    const normalizedCurrency = String(currency || 'USD')
      .trim()
      .toUpperCase()
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: /^[A-Z]{3}$/.test(normalizedCurrency)
        ? normalizedCurrency
        : 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(safeAmount)
  }

  const formatDateLabel = (value?: string | null) => {
    if (!value) return ''
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return String(value)
    return parsed.toLocaleDateString('en-GB')
  }

  const normalizeCustomersResponse = (
    response: unknown
  ): {
    items: Customer[]
    pagination: CustomersPagination
    summary: CustomersSummary
  } => {
    const envelope = (response ?? {}) as {
      data?: unknown
      pagination?: Partial<CustomersPagination>
      summary?: Partial<CustomersSummary>
    }
    const payload = envelope.data ?? response ?? []
    const rows =
      ((payload as { data?: unknown }).data as unknown[]) ??
      ((payload as { items?: unknown }).items as unknown[]) ??
      (Array.isArray(payload) ? payload : [])

    const items = (Array.isArray(rows) ? rows : [])
      .map(raw => {
        const item = (raw ?? {}) as Record<string, unknown>
        const id = String(item.id ?? '').trim()
        if (!id) return null

        const clientCurrency = String(
          item.clientCurrency ?? item.client_currency ?? 'USD'
        )
          .trim()
          .toUpperCase()
        const totalBookings = Number(
          item.totalBookings ?? item.total_bookings ?? 0
        )

        return {
          id,
          fullName: String(item.fullName ?? item.full_name ?? 'Unknown Customer'),
          phone: String(item.phone ?? ''),
          email: String(item.email ?? ''),
          preferences: String(item.preferences ?? ''),
          lifetimeValue: Number(item.lifetimeValue ?? item.lifetime_value ?? 0),
          segment: String(item.segment ?? 'NEW'),
          panNumber: String(item.panNumber ?? item.pan_number ?? ''),
          addressLine: String(item.addressLine ?? item.address_line ?? ''),
          clientCurrency: /^[A-Z]{3}$/.test(clientCurrency)
            ? clientCurrency
            : 'USD',
          createdAt: String(item.createdAt ?? item.created_at ?? '') || undefined,
          totalBookings: Number.isFinite(totalBookings) ? totalBookings : 0,
          lastBookingDate:
            String(item.lastBookingDate ?? item.last_booking_date ?? '') ||
            undefined,
          lastBookingNumber: String(
            item.lastBookingNumber ?? item.last_booking_number ?? ''
          )
        } as Customer
      })
      .filter(Boolean) as Customer[]

    const payloadObject =
      typeof payload === 'object' && payload !== null
        ? (payload as {
            pagination?: Partial<CustomersPagination>
            summary?: Partial<CustomersSummary>
          })
        : {}
    const parsedPagination =
      envelope.pagination ?? payloadObject.pagination ?? {}
    const parsedSummary = envelope.summary ?? payloadObject.summary ?? {}

    return {
      items,
      pagination: {
        page: Number(parsedPagination.page ?? page),
        limit: Number(parsedPagination.limit ?? pageSize),
        totalItems: Number(parsedPagination.totalItems ?? items.length),
        totalPages: Number(
          parsedPagination.totalPages ??
            Math.max(1, Math.ceil(items.length / pageSize))
        )
      },
      summary: {
        totalCustomers: Number(
          parsedSummary.totalCustomers ?? parsedPagination.totalItems ?? items.length
        ),
        newCustomers: Number(parsedSummary.newCustomers ?? 0),
        platinumCustomers: Number(parsedSummary.platinumCustomers ?? 0),
        averageLifetimeValue: Number(parsedSummary.averageLifetimeValue ?? 0),
        totalBookings: Number(parsedSummary.totalBookings ?? 0)
      }
    }
  }

  const loadCustomers = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await customersApi.list({
        page,
        limit: pageSize,
        ...(debouncedSearch ? { search: debouncedSearch } : {}),
        ...(segmentFilter !== 'all' ? { segment: segmentFilter } : {}),
        ...(currencyFilter !== 'all'
          ? { clientCurrency: currencyFilter }
          : {}),
        ...(createdFrom ? { createdFrom } : {}),
        ...(createdTo ? { createdTo } : {}),
        sortBy,
        sortOrder
      })

      const normalized = normalizeCustomersResponse(response)
      setCustomers(normalized.items)
      setPagination(normalized.pagination)
      setSummary(normalized.summary)
    } catch (err) {
      reportApiError(err, 'Unable to load customers', setError)
    } finally {
      setLoading(false)
    }
  }, [
    createdFrom,
    createdTo,
    currencyFilter,
    debouncedSearch,
    page,
    pageSize,
    segmentFilter,
    sortBy,
    sortOrder
  ])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim())
    }, 350)
    return () => window.clearTimeout(timer)
  }, [search])

  useEffect(() => {
    void loadCustomers()
  }, [loadCustomers])

  useEffect(() => {
    setTableScrollTop(0)
  }, [customers, page, pageSize])

  const visibleDesktopCustomers = useMemo(() => {
    const startIndex = Math.max(
      0,
      Math.floor(tableScrollTop / DESKTOP_ROW_HEIGHT) - DESKTOP_OVERSCAN
    )
    const endIndex = Math.min(
      customers.length,
      Math.ceil(
        (tableScrollTop + DESKTOP_VIEWPORT_HEIGHT) / DESKTOP_ROW_HEIGHT
      ) + DESKTOP_OVERSCAN
    )

    return {
      startIndex,
      items: customers.slice(startIndex, endIndex)
    }
  }, [customers, tableScrollTop])

  const handleDeleteCustomer = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this customer?')) {
      return
    }

    setLoading(true)
    setError('')
    try {
      await customersApi.delete(id)
      await loadCustomers()
    } catch (err) {
      reportApiError(err, 'Failed to delete customer', setError)
    } finally {
      setLoading(false)
    }
  }

  const handleEditCustomer = (customer: Customer) => {
    setEditingCustomer(customer)
    setEditFormData({
      fullName: customer.fullName,
      phone: customer.phone ?? '',
      email: customer.email ?? '',
      preferences: customer.preferences ?? '',
      panNumber: customer.panNumber ?? '',
      addressLine: customer.addressLine ?? '',
      clientCurrency: customer.clientCurrency ?? 'USD',
      segment: (customer.segment ?? 'NEW') as Customer['segment']
    })
    setEditFormErrors({
      fullName: '',
      phone: '',
      email: '',
      panNumber: '',
      addressLine: ''
    })
    setShowEditModal(true)
  }

  const validateEditForm = (): boolean => {
    const errors = {
      fullName: '',
      phone: '',
      email: '',
      panNumber: '',
      addressLine: ''
    }
    let isValid = true

    if (!editFormData.fullName.trim()) {
      errors.fullName = 'Full name is required'
      isValid = false
    }

    if (!editFormData.phone.trim()) {
      errors.phone = 'Phone number is required'
      isValid = false
    } else if (
      !/^[\+]?[1-9][\d]{0,15}$/.test(
        editFormData.phone.replace(/[\s\-\(\)]/g, '')
      )
    ) {
      errors.phone = 'Please enter a valid phone number'
      isValid = false
    }

    if (!editFormData.email.trim()) {
      errors.email = 'Email is required'
      isValid = false
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editFormData.email)) {
      errors.email = 'Please enter a valid email address'
      isValid = false
    }

    if (!editFormData.panNumber.trim()) {
      errors.panNumber = 'PAN number is required'
      isValid = false
    } else if (
      !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(editFormData.panNumber.toUpperCase())
    ) {
      errors.panNumber = 'Please enter a valid PAN number'
      isValid = false
    }

    if (!editFormData.addressLine.trim()) {
      errors.addressLine = 'Address is required'
      isValid = false
    }

    setEditFormErrors(errors)
    return isValid
  }

  const handleUpdateCustomer = async () => {
    if (!validateEditForm() || !editingCustomer) return

    setLoading(true)
    setError('')

    try {
      await customersApi.update(editingCustomer.id, {
        fullName: editFormData.fullName,
        phone: editFormData.phone || undefined,
        email: editFormData.email || undefined,
        preferences: editFormData.preferences || undefined,
        panNumber: editFormData.panNumber || undefined,
        addressLine: editFormData.addressLine || undefined,
        clientCurrency: editFormData.clientCurrency || undefined,
        segment: editFormData.segment
      })

      setShowEditModal(false)
      setEditingCustomer(null)
      await loadCustomers()
    } catch (err) {
      reportApiError(err, 'Failed to update customer', setError)
    } finally {
      setLoading(false)
    }
  }

  const handleExport = () => {
    if (!customers.length) return

    const headers = [
      'Full Name',
      'Email',
      'Phone',
      'Segment',
      'Total Bookings',
      'Last Booking Number',
      'Last Booking Date',
      'Lifetime Value',
      'Created At'
    ]

    const escapeCsv = (value: string) => `"${value.replace(/"/g, '""')}"`

    const dataRows = customers.map(customer => [
      customer.fullName ?? '',
      customer.email ?? '',
      customer.phone ?? '',
      getSegmentLabel(customer.segment),
      customer.totalBookings ?? 0,
      customer.lastBookingNumber ?? '',
      customer.lastBookingDate ?? '',
      customer.lifetimeValue ?? 0,
      customer.createdAt ?? ''
    ])

    const csv = [headers, ...dataRows]
      .map(row => row.map(cell => escapeCsv(String(cell))).join(','))
      .join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `customers-page-${page}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <main className='flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100'>
      <div className='max-w-8xl mx-auto '>
        <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 px-0 sm:px-0'>
          <div>
            <p className='text-sm text-gray-500 dark:text-gray-400 mb-1'>
              Customers
            </p>
            <h1 className='text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100'>
              Customer Directory
            </h1>
            <p className='text-sm text-gray-500 dark:text-gray-400 mt-1'>
              Server-side pagination and filters
            </p>
          </div>
          <div className='flex flex-col sm:flex-row gap-2 w-full sm:w-auto'>
            <button
              onClick={handleExport}
              disabled={!customers.length}
              className='inline-flex items-center justify-center px-4 py-2 rounded-lg border border-green-500 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors w-full sm:w-auto disabled:opacity-50 dark:border-green-400 dark:text-gray-200 dark:hover:bg-gray-800'
            >
              <FaDownload className='mr-2' /> Export
            </button>
            <button
              onClick={() => navigate('/customers/new')}
              className='inline-flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors w-full sm:w-auto'
            >
              <FaPlus className='mr-2' /> New Customer
            </button>
          </div>
        </div>

        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 px-0 sm:px-0'>
          <div className='bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-5'>
            <p className='text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1'>
              Total Customers
            </p>
            <p className='text-2xl font-bold text-gray-900 dark:text-gray-100'>
              {summary.totalCustomers}
            </p>
            <p className='text-xs text-green-600 dark:text-green-400 mt-1'>
              {summary.newCustomers} in new segment
            </p>
          </div>

          <div className='bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-5'>
            <p className='text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1'>
              Platinum Customers
            </p>
            <p className='text-2xl font-bold text-gray-900 dark:text-gray-100'>
              {summary.platinumCustomers}
            </p>
            <p className='text-xs text-purple-600 dark:text-purple-400 mt-1'>
              {(
                (summary.platinumCustomers / (summary.totalCustomers || 1)) *
                100
              ).toFixed(1)}
              % of total
            </p>
          </div>

          <div className='bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-5'>
            <p className='text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1'>
              Average LTV
            </p>
            <p className='text-2xl font-bold text-gray-900 dark:text-gray-100'>
              {formatCurrency(summary.averageLifetimeValue)}
            </p>
            <p className='text-xs text-blue-600 dark:text-blue-400 mt-1'>
              Filtered result set
            </p>
          </div>

          <div className='bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-5'>
            <p className='text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1'>
              Total Bookings
            </p>
            <p className='text-2xl font-bold text-gray-900 dark:text-gray-100'>
              {summary.totalBookings}
            </p>
            <p className='text-xs text-green-600 dark:text-green-400 mt-1'>
              Filtered result set
            </p>
          </div>
        </div>

        <div className='bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 mb-6 mx-0 sm:mx-0'>
          <div className='p-4 border-b border-gray-100 dark:border-gray-800 space-y-4'>
            <div className='w-full relative'>
              <FaSearch className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 text-sm' />
              <input
                type='text'
                placeholder='Search by name, email, phone, or PAN...'
                value={search}
                onChange={e => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                className='w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500'
              />
            </div>

            <div className='hidden sm:grid sm:grid-cols-2 xl:grid-cols-6 gap-2 sm:gap-4'>
              <SearchableDropdown
                value={segmentFilter}
                options={segmentFilterOptions}
                onChange={value => {
                  setPage(1)
                  setSegmentFilter(value)
                }}
                className='flex-1'
                searchPlaceholder='Search segment...'
              />
              <SearchableDropdown
                value={currencyFilter}
                options={currencyFilterOptions}
                onChange={value => {
                  setPage(1)
                  setCurrencyFilter(value)
                }}
                className='flex-1'
                searchPlaceholder='Search currency...'
              />
              <input
                type='date'
                value={createdFrom}
                onChange={event => {
                  setPage(1)
                  setCreatedFrom(event.target.value)
                }}
                className='w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100'
              />
              <input
                type='date'
                value={createdTo}
                onChange={event => {
                  setPage(1)
                  setCreatedTo(event.target.value)
                }}
                className='w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100'
              />
              <SearchableDropdown
                value={sortBy}
                options={sortByOptions}
                onChange={value => {
                  setPage(1)
                  setSortBy(value)
                }}
                className='flex-1'
                searchPlaceholder='Search sort field...'
              />
              <button
                onClick={() => {
                  setPage(1)
                  setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'))
                }}
                className='px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors whitespace-nowrap'
              >
                {sortOrder === 'asc' ? 'Ascending' : 'Descending'}
              </button>
            </div>

            <div className='sm:hidden'>
              <button
                onClick={() => setShowMobileFilters(!showMobileFilters)}
                className='w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200'
              >
                {showMobileFilters ? 'Hide Filters' : 'Show Filters'}
              </button>
            </div>

            {showMobileFilters && (
              <div className='sm:hidden space-y-3'>
                <SearchableDropdown
                  value={segmentFilter}
                  options={segmentFilterOptions}
                  onChange={value => {
                    setPage(1)
                    setSegmentFilter(value)
                  }}
                  searchPlaceholder='Search segment...'
                />
                <SearchableDropdown
                  value={currencyFilter}
                  options={currencyFilterOptions}
                  onChange={value => {
                    setPage(1)
                    setCurrencyFilter(value)
                  }}
                  searchPlaceholder='Search currency...'
                />
                <SearchableDropdown
                  value={sortBy}
                  options={sortByOptions}
                  onChange={value => {
                    setPage(1)
                    setSortBy(value)
                  }}
                  searchPlaceholder='Search sort field...'
                />
                <input
                  type='date'
                  value={createdFrom}
                  onChange={event => {
                    setPage(1)
                    setCreatedFrom(event.target.value)
                  }}
                  className='w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100'
                />
                <input
                  type='date'
                  value={createdTo}
                  onChange={event => {
                    setPage(1)
                    setCreatedTo(event.target.value)
                  }}
                  className='w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100'
                />
                <button
                  onClick={() => {
                    setPage(1)
                    setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'))
                  }}
                  className='w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200'
                >
                  {sortOrder === 'asc' ? 'Ascending' : 'Descending'}
                </button>
              </div>
            )}

            {error ? (
              <div className='rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300'>
                {error}
              </div>
            ) : null}

            {loading && customers.length > 0 ? (
              <p className='text-xs text-gray-500 dark:text-gray-400'>
                Refreshing page...
              </p>
            ) : null}
          </div>

          {loading && customers.length === 0 ? (
            <div className='px-4 py-6 space-y-3'>
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className='h-16 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse'
                />
              ))}
            </div>
          ) : customers.length === 0 ? (
            <EmptyState
              title='No customers found'
              description='Try another search or filter.'
              className='py-12'
            />
          ) : (
            <>
              <div className='hidden sm:block'>
                <div className='grid grid-cols-[2.2fr_2fr_1.2fr_1.2fr_0.8fr_1.2fr_0.8fr] gap-3 border-b border-gray-100 bg-gray-50 px-6 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:border-gray-800 dark:bg-gray-800/50 dark:text-gray-400'>
                  <div>Customer</div>
                  <div>Contact</div>
                  <div>Segment</div>
                  <div>Lifetime Value</div>
                  <div>Bookings</div>
                  <div>Last Booking</div>
                  <div className='text-right'>Actions</div>
                </div>

                <div
                  className='overflow-y-auto'
                  style={{ maxHeight: `${DESKTOP_VIEWPORT_HEIGHT}px` }}
                  onScroll={event => setTableScrollTop(event.currentTarget.scrollTop)}
                >
                  <div
                    className='relative'
                    style={{ height: `${customers.length * DESKTOP_ROW_HEIGHT}px` }}
                  >
                    {visibleDesktopCustomers.items.map((customer, index) => {
                      const absoluteIndex =
                        visibleDesktopCustomers.startIndex + index

                      return (
                        <div
                          key={customer.id}
                          role='button'
                          tabIndex={0}
                          onClick={() => navigate(`/customers/${customer.id}`)}
                          onKeyDown={event => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              navigate(`/customers/${customer.id}`)
                            }
                          }}
                          className='absolute inset-x-0 grid grid-cols-[2.2fr_2fr_1.2fr_1.2fr_0.8fr_1.2fr_0.8fr] gap-3 border-b border-gray-100 px-6 py-4 hover:bg-blue-50/30 cursor-pointer dark:border-gray-800 dark:hover:bg-blue-900/20'
                          style={{
                            top: `${absoluteIndex * DESKTOP_ROW_HEIGHT}px`,
                            height: `${DESKTOP_ROW_HEIGHT}px`
                          }}
                        >
                          <div>
                            <p className='text-sm font-medium text-gray-900 dark:text-gray-100'>
                              {customer.fullName}
                            </p>
                            <p className='text-xs text-gray-500 dark:text-gray-400'>
                              PAN: {customer.panNumber || 'N/A'}
                            </p>
                          </div>
                          <div className='space-y-1'>
                            <p className='text-xs text-gray-700 dark:text-gray-300 flex items-center gap-1'>
                              <FaPhone className='text-gray-400 dark:text-gray-500 text-xs' />{' '}
                              {customer.phone || 'N/A'}
                            </p>
                            <p className='text-xs text-gray-700 dark:text-gray-300 flex items-center gap-1 truncate'>
                              <FaEnvelope className='text-gray-400 dark:text-gray-500 text-xs' />{' '}
                              {customer.email || 'N/A'}
                            </p>
                          </div>
                          <div>
                            <span
                              className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getSegmentClass(
                                customer.segment ?? 'N/A'
                              )}`}
                            >
                              <MdOutlineSegment className='mr-1' />
                              {getSegmentLabel(customer.segment)}
                            </span>
                          </div>
                          <div className='text-sm font-medium text-gray-900 dark:text-gray-100'>
                            {formatCurrency(
                              customer.lifetimeValue,
                              customer.clientCurrency
                            )}
                          </div>
                          <div className='text-sm text-gray-900 dark:text-gray-100'>
                            {customer.totalBookings ?? 0}
                          </div>
                          <div className='text-sm text-gray-700 dark:text-gray-300'>
                            {formatDateLabel(customer.lastBookingDate) || 'N/A'}
                          </div>
                          <div
                            className='flex justify-end gap-2'
                            onClick={event => event.stopPropagation()}
                          >
                            <button
                              onClick={() =>
                                navigate(`/customers/${customer.id}`)
                              }
                              className='p-2 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors'
                              title='View'
                            >
                              <FaEye className='text-sm' />
                            </button>
                            <button
                              onClick={() => handleDeleteCustomer(customer.id)}
                              className='p-2 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors'
                              title='Delete'
                            >
                              <FaTrash className='text-sm' />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              <div className='sm:hidden divide-y divide-gray-100 dark:divide-gray-800'>
                {customers.map(customer => (
                  <div
                    key={customer.id}
                    className='p-4 space-y-3 hover:bg-blue-50/40 dark:hover:bg-gray-800/50 transition-colors'
                  >
                    <div className='flex items-start justify-between'>
                      <div>
                        <p className='text-sm font-medium text-gray-900 dark:text-gray-100'>
                          {customer.fullName}
                        </p>
                        <p className='text-xs text-gray-500 dark:text-gray-400'>
                          PAN: {customer.panNumber || 'N/A'}
                        </p>
                      </div>
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getSegmentClass(
                          customer.segment ?? 'N/A'
                        )}`}
                      >
                        <MdOutlineSegment className='mr-1' />
                        {getSegmentLabel(customer.segment)}
                      </span>
                    </div>

                    <div className='space-y-1'>
                      <p className='text-xs text-gray-700 dark:text-gray-300 flex items-center gap-1'>
                        <FaPhone className='text-gray-400 dark:text-gray-500 text-xs' />{' '}
                        {customer.phone || 'N/A'}
                      </p>
                      <p className='text-xs text-gray-700 dark:text-gray-300 flex items-center gap-1'>
                        <FaEnvelope className='text-gray-400 dark:text-gray-500 text-xs' />{' '}
                        {customer.email || 'N/A'}
                      </p>
                    </div>

                    <div className='grid grid-cols-2 gap-2'>
                      <div>
                        <p className='text-xs text-gray-500'>Lifetime Value</p>
                        <p className='text-sm font-medium text-gray-900 dark:text-gray-100'>
                          {formatCurrency(
                            customer.lifetimeValue,
                            customer.clientCurrency
                          )}
                        </p>
                      </div>
                      <div>
                        <p className='text-xs text-gray-500'>Bookings</p>
                        <p className='text-sm text-gray-900 dark:text-gray-100'>
                          {customer.totalBookings ?? 0}
                        </p>
                      </div>
                    </div>

                    <div className='grid grid-cols-2 gap-2'>
                      <div>
                        <p className='text-xs text-gray-500'>Last Booking Date</p>
                        <p className='text-sm text-gray-700 dark:text-gray-300'>
                          {formatDateLabel(customer.lastBookingDate) || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className='text-xs text-gray-500'>Last Booking</p>
                        <p className='text-sm text-gray-700 dark:text-gray-300'>
                          {customer.lastBookingNumber || 'N/A'}
                        </p>
                      </div>
                    </div>

                    <div className='flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800'>
                      <button
                        onClick={() => navigate(`/customers/${customer.id}`)}
                        className='p-2 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors'
                        title='View'
                      >
                        <FaEye className='text-sm' />
                      </button>
                      <button
                        onClick={() => handleEditCustomer(customer)}
                        className='p-2 text-gray-500 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg transition-colors'
                        title='Edit'
                      >
                        <FaEdit className='text-sm' />
                      </button>
                      <button
                        onClick={() => handleDeleteCustomer(customer.id)}
                        className='p-2 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors'
                        title='Delete'
                      >
                        <FaTrash className='text-sm' />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-gray-100 dark:border-gray-800 px-6 py-4'>
            <p className='text-sm text-gray-500 dark:text-gray-400'>
              Showing{' '}
              {pagination.totalItems === 0
                ? 0
                : Math.min(
                    pagination.totalItems,
                    (pagination.page - 1) * pagination.limit + 1
                  )}
              -
              {Math.min(
                pagination.totalItems,
                pagination.page * pagination.limit
              )}{' '}
              of {pagination.totalItems}
            </p>

            <div className='flex flex-col gap-3 sm:flex-row sm:items-center'>
              <SearchableDropdown
                value={String(pageSize)}
                options={PAGE_SIZE_OPTIONS}
                onChange={value => {
                  setPage(1)
                  setPageSize(Number(value))
                }}
                className='min-w-[120px]'
                searchPlaceholder='Rows...'
              />
              <div className='flex gap-2'>
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={pagination.page <= 1}
                  className='px-3 py-1 border border-gray-300 dark:border-gray-700 rounded-lg text-sm disabled:opacity-50 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors'
                >
                  <FaChevronLeft />
                </button>
                <span className='px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg text-sm font-medium'>
                  {pagination.page}
                </span>
                <button
                  onClick={() =>
                    setPage(p => Math.min(pagination.totalPages, p + 1))
                  }
                  disabled={pagination.page >= pagination.totalPages}
                  className='px-3 py-1 border border-gray-300 dark:border-gray-700 rounded-lg text-sm disabled:opacity-50 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors'
                >
                  <FaChevronRight />
                </button>
              </div>
            </div>
          </div>
        </div>

        {showEditModal && editingCustomer && (
          <div className='fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4'>
            <div className='bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-800 w-full max-w-4xl max-h-[90vh] overflow-y-auto'>
              <div className='px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center'>
                <h2 className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
                  Edit Customer - {editingCustomer.fullName}
                </h2>
                <button
                  onClick={() => setShowEditModal(false)}
                  className='text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                >
                  x
                </button>
              </div>

              <div className='p-6 space-y-6'>
                <div>
                  <h3 className='text-md font-medium text-gray-900 dark:text-gray-100 mb-4'>
                    Personal Information
                  </h3>
                  <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                    <div className='md:col-span-2'>
                      <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                        Full Name <span className='text-red-500'>*</span>
                      </label>
                      <input
                        type='text'
                        value={editFormData.fullName}
                        onChange={e => {
                          const value = e.target.value
                          const lettersOnly = /^[A-Za-z\s]*$/
                          if (!lettersOnly.test(value)) return
                          setEditFormData(prev => ({
                            ...prev,
                            fullName: value
                          }))
                        }}
                        className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100 ${
                          editFormErrors.fullName
                            ? 'border-red-500'
                            : 'border-gray-300 dark:border-gray-700'
                        }`}
                        placeholder='Enter full name'
                      />
                      {editFormErrors.fullName ? (
                        <p className='mt-1 text-xs text-red-500'>
                          {editFormErrors.fullName}
                        </p>
                      ) : null}
                    </div>

                    <div>
                      <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                        Phone Number <span className='text-red-500'>*</span>
                      </label>
                      <input
                        type='tel'
                        value={editFormData.phone}
                        onChange={e => {
                          const value = e.target.value
                          const digitsOnly = /^[\d+]{0,16}$/
                          if (!digitsOnly.test(value)) return
                          setEditFormData(prev => ({
                            ...prev,
                            phone: value
                          }))
                        }}
                        className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100 ${
                          editFormErrors.phone
                            ? 'border-red-500'
                            : 'border-gray-300 dark:border-gray-700'
                        }`}
                        placeholder='+971501234567'
                      />
                      {editFormErrors.phone ? (
                        <p className='mt-1 text-xs text-red-500'>
                          {editFormErrors.phone}
                        </p>
                      ) : null}
                    </div>

                    <div>
                      <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                        Email Address <span className='text-red-500'>*</span>
                      </label>
                      <input
                        type='email'
                        value={editFormData.email}
                        onChange={e =>
                          setEditFormData(prev => ({
                            ...prev,
                            email: e.target.value
                          }))
                        }
                        className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100 ${
                          editFormErrors.email
                            ? 'border-red-500'
                            : 'border-gray-300 dark:border-gray-700'
                        }`}
                        placeholder='customer@example.com'
                      />
                      {editFormErrors.email ? (
                        <p className='mt-1 text-xs text-red-500'>
                          {editFormErrors.email}
                        </p>
                      ) : null}
                    </div>

                    <div>
                      <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                        PAN Number <span className='text-red-500'>*</span>
                      </label>
                      <input
                        type='text'
                        value={editFormData.panNumber}
                        onChange={e =>
                          setEditFormData(prev => ({
                            ...prev,
                            panNumber: e.target.value.toUpperCase()
                          }))
                        }
                        className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100 ${
                          editFormErrors.panNumber
                            ? 'border-red-500'
                            : 'border-gray-300 dark:border-gray-700'
                        }`}
                        placeholder='ABCDE1234F'
                        maxLength={10}
                      />
                      {editFormErrors.panNumber ? (
                        <p className='mt-1 text-xs text-red-500'>
                          {editFormErrors.panNumber}
                        </p>
                      ) : null}
                    </div>

                    <div>
                      <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                        Preferred Currency
                      </label>
                      <SearchableDropdown
                        value={editFormData.clientCurrency}
                        options={currencies.map(currency => ({
                          value: currency.value,
                          label: currency.label
                        }))}
                        onChange={value =>
                          setEditFormData(prev => ({
                            ...prev,
                            clientCurrency: value
                          }))
                        }
                        searchPlaceholder='Search currency...'
                      />
                    </div>

                    <div>
                      <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                        Customer Segment
                      </label>
                      <SearchableDropdown
                        value={editFormData.segment ?? 'NEW'}
                        options={segments.map(segment => ({
                          value: segment.value,
                          label: segment.label
                        }))}
                        onChange={value =>
                          setEditFormData(prev => ({
                            ...prev,
                            segment: value as Customer['segment']
                          }))
                        }
                        searchPlaceholder='Search segment...'
                      />
                    </div>

                    <div className='md:col-span-2'>
                      <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                        Address <span className='text-red-500'>*</span>
                      </label>
                      <textarea
                        value={editFormData.addressLine}
                        onChange={e =>
                          setEditFormData(prev => ({
                            ...prev,
                            addressLine: e.target.value
                          }))
                        }
                        rows={3}
                        className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100 resize-none ${
                          editFormErrors.addressLine
                            ? 'border-red-500'
                            : 'border-gray-300 dark:border-gray-700'
                        }`}
                        placeholder='Enter complete address'
                      />
                      {editFormErrors.addressLine ? (
                        <p className='mt-1 text-xs text-red-500'>
                          {editFormErrors.addressLine}
                        </p>
                      ) : null}
                    </div>

                    <div className='md:col-span-2'>
                      <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                        Travel Preferences
                      </label>
                      <textarea
                        value={editFormData.preferences}
                        onChange={e =>
                          setEditFormData(prev => ({
                            ...prev,
                            preferences: e.target.value
                          }))
                        }
                        rows={4}
                        className='w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100 resize-none'
                        placeholder='Preferred destinations, packages, budgets...'
                      />
                    </div>
                  </div>
                </div>

                {error ? (
                  <div className='bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-3'>
                    <p className='text-sm text-red-700 dark:text-red-400'>
                      {error}
                    </p>
                  </div>
                ) : null}
              </div>

              <div className='px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3'>
                <button
                  onClick={() => setShowEditModal(false)}
                  className='px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700'
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateCustomer}
                  disabled={loading}
                  className='px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-lg flex items-center gap-2'
                >
                  {loading ? 'Updating...' : 'Update Customer'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}

export default CustomersPage
