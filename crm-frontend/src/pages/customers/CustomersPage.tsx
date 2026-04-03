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
import { getApiErrorMessage } from '../../api/apiClient'
import { customersApi } from '../../api/customers'
import SearchableDropdown from '../../components/ui/SearchableDropdown'

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

const CustomersPage: React.FC = () => {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [segmentFilter, setSegmentFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [page, setPage] = useState(1)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showMobileFilters, setShowMobileFilters] = useState(false)
  const pageSize = 15

  const [customers, setCustomers] = useState<Customer[]>([])

  // Edit form state
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

  const sortByOptions = [
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

  // Filter and search customers
  const filteredCustomers = useMemo(() => {
    return customers.filter(customer => {
      const searchValue = search.trim().toLowerCase()
      const createdAtDate = customer.createdAt
        ? new Date(customer.createdAt)
        : null
      const createdAtLocal = createdAtDate
        ? createdAtDate.toLocaleDateString()
        : ''
      const createdAtIso = createdAtDate
        ? createdAtDate.toISOString().split('T')[0]
        : ''
      const lastBookingDate = customer.lastBookingDate
        ? new Date(customer.lastBookingDate)
        : null
      const lastBookingLocal = lastBookingDate
        ? lastBookingDate.toLocaleDateString()
        : ''
      const lastBookingIso = lastBookingDate
        ? lastBookingDate.toISOString().split('T')[0]
        : ''
      const haystack = [
        customer.id,
        customer.fullName,
        customer.email,
        customer.phone,
        customer.panNumber,
        customer.preferences,
        customer.addressLine,
        customer.clientCurrency,
        customer.segment,
        getSegmentLabel(customer.segment),
        customer.totalBookings?.toString(),
        customer.lifetimeValue?.toString(),
        customer.lastBookingNumber,
        createdAtLocal,
        createdAtIso,
        lastBookingLocal,
        lastBookingIso
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      const searchMatch = !searchValue || haystack.includes(searchValue)

      const segmentMatch =
        segmentFilter === 'all' || customer.segment === segmentFilter

      return searchMatch && segmentMatch
    })
  }, [customers, search, segmentFilter])

  const toTimestamp = (value?: string | null) => {
    if (!value) return 0
    const parsed = Date.parse(value)
    return Number.isFinite(parsed) ? parsed : 0
  }

  const orderedCustomers = useMemo(
    () =>
      [...filteredCustomers].sort((a, b) => {
        const left = toTimestamp(a.createdAt)
        const right = toTimestamp(b.createdAt)
        if (left !== right) {
          return right - left
        }
        let comparison = 0
        switch (sortBy) {
          case 'name':
            comparison = a.fullName.localeCompare(b.fullName)
            break
          case 'ltv':
            comparison = (a.lifetimeValue ?? 0) - (b.lifetimeValue ?? 0)
            break
          case 'bookings':
            comparison = (a.totalBookings ?? 0) - (b.totalBookings ?? 0)
            break
          default:
            comparison = 0
        }
        return sortOrder === 'asc' ? comparison : -comparison
      }),
    [filteredCustomers, sortBy, sortOrder]
  )

  // Pagination
  const totalPages = Math.max(1, Math.ceil(orderedCustomers.length / pageSize))
  const paginatedCustomers = orderedCustomers.slice(
    (page - 1) * pageSize,
    page * pageSize
  )

  const formatCurrency = (amount?: number, currency = 'USD') => {
    const safeAmount = Number.isFinite(amount) ? (amount as number) : 0
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

  const normalizeCustomers = (response: unknown): Customer[] => {
    const payload = (response as { data?: unknown })?.data ?? response ?? []
    const data =
      (payload as { data?: unknown })?.data ??
      (payload as { items?: unknown })?.items ??
      payload
    if (!Array.isArray(data)) return []

    return data
      .map(raw => {
        const item = (raw ?? {}) as Record<string, unknown>
        const id = String(item.id ?? '').trim()
        if (!id) return null

        const clientCurrency = String(
          item.clientCurrency ?? item.client_currency ?? 'USD'
        )
          .trim()
          .toUpperCase()
        const totalBookingsRaw =
          item.totalBookings ?? item.total_bookings ?? 0
        const totalBookings = Number(totalBookingsRaw)

        return {
          id,
          fullName: String(
            item.fullName ?? item.full_name ?? 'Unknown Customer'
          ),
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
  }

  const loadCustomers = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await customersApi.list()
      setCustomers(normalizeCustomers(response))
    } catch (err) {
      const message = getApiErrorMessage(err, 'Unable to load customers')
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadCustomers()
  }, [loadCustomers])

  const handleDeleteCustomer = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this customer?'))
      return

    setLoading(true)
    setError('')
    try {
      await customersApi.delete(id)
      await loadCustomers()
    } catch (err) {
      const message = getApiErrorMessage(err, 'Failed to delete customer')
      setError(message)
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
    } catch (error) {
      setError(getApiErrorMessage(error, 'Failed to update customer'))
    } finally {
      setLoading(false)
    }
  }

  const handleExport = () => {
    if (!paginatedCustomers.length) return

    const headers = [
      'Full Name',
      'Email',
      'Phone',
      'Segment',
      'Total Bookings',
      'Last Booking Date',
      'Lifetime Value',
      'Created At'
    ]

    const escapeCsv = (value: string) => `"${value.replace(/"/g, '""')}"`

    const dataRows = paginatedCustomers.map(customer => [
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
        {/* Header */}
        <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 px-0 sm:px-0'>
          <div>
            <p className='text-sm text-gray-500 dark:text-gray-400 mb-1'>
              Customers
            </p>
            <h1 className='text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100'>
              Customer Directory
            </h1>
            <p className='text-sm text-gray-500 dark:text-gray-400 mt-1'>
              Manage customer profiles and segmentation data
            </p>
          </div>
          <div className='flex flex-col sm:flex-row gap-2 w-full sm:w-auto'>
            <button
              onClick={handleExport}
              className='inline-flex items-center justify-center px-4 py-2 rounded-lg border border-green-500 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors w-full sm:w-auto dark:border-green-400 dark:text-gray-200 dark:hover:bg-gray-800'
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

        {/* KPI Cards */}
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 px-0 sm:px-0'>
          <div className='bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-5'>
            <p className='text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1'>
              Total Customers
            </p>
            <p className='text-2xl font-bold text-gray-900 dark:text-gray-100'>
              {customers.length}
            </p>
            <p className='text-xs text-green-600 dark:text-green-400 mt-1'>
              +{customers.filter(c => c.segment === 'NEW').length} new this
              month
            </p>
          </div>

          <div className='bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-5'>
            <p className='text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1'>
              Platinum Customers
            </p>
            <p className='text-2xl font-bold text-gray-900 dark:text-gray-100'>
              {customers.filter(c => c.segment === 'PLATINUM').length}
            </p>
            <p className='text-xs text-purple-600 dark:text-purple-400 mt-1'>
              {(
                (customers.filter(c => c.segment === 'PLATINUM').length /
                  (customers.length || 1)) *
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
              {formatCurrency(
                customers.length
                  ? customers.reduce(
                      (acc, c) => acc + (c.lifetimeValue ?? 0),
                      0
                    ) / customers.length
                  : 0
              )}
            </p>
            <p className='text-xs text-blue-600 dark:text-blue-400 mt-1'>
              Per customer
            </p>
          </div>

          <div className='bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-5'>
            <p className='text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1'>
              Total Bookings
            </p>
            <p className='text-2xl font-bold text-gray-900 dark:text-gray-100'>
              {customers.reduce((acc, c) => acc + (c.totalBookings ?? 0), 0)}
            </p>
            <p className='text-xs text-green-600 dark:text-green-400 mt-1'>
              Across all customers
            </p>
          </div>
        </div>

        <div className='bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 mb-6 mx-0 sm:mx-0'>
          <div className='p-4 border-b border-gray-100 dark:border-gray-800'>
            <div className='flex flex-col gap-4'>
              {/* Search */}
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

              {/* Desktop Filters */}
              <div className='hidden sm:flex flex-col sm:flex-row gap-2 sm:gap-4'>
                {/* Segment Filter */}
                <SearchableDropdown
                  value={segmentFilter}
                  options={segmentFilterOptions}
                  onChange={value => {
                    setSegmentFilter(value)
                    setPage(1)
                  }}
                  className='flex-1'
                  searchPlaceholder='Search segment...'
                />

                {/* Sort By */}
                <SearchableDropdown
                  value={sortBy}
                  options={sortByOptions}
                  onChange={setSortBy}
                  className='flex-1'
                  searchPlaceholder='Search sort field...'
                />

                {/* Sort Order */}
                <button
                  onClick={() =>
                    setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'))
                  }
                  className='px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors whitespace-nowrap'
                >
                  {sortOrder === 'asc' ? '↑ Ascending' : '↓ Descending'}
                </button>

              </div>

              {/* Mobile Filter Button */}
              <div className='sm:hidden'>
                <button
                  onClick={() => setShowMobileFilters(!showMobileFilters)}
                  className='w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200'
                >
                  {showMobileFilters ? 'Hide Filters' : 'Show Filters'}
                </button>
              </div>

              {/* Mobile Filters */}
              {showMobileFilters && (
                <div className='sm:hidden space-y-3 mt-2'>
                  <SearchableDropdown
                    value={segmentFilter}
                    options={segmentFilterOptions}
                    onChange={value => {
                      setSegmentFilter(value)
                      setPage(1)
                    }}
                    searchPlaceholder='Search segment...'
                  />

                  <SearchableDropdown
                    value={sortBy}
                    options={sortByOptions}
                    onChange={setSortBy}
                    searchPlaceholder='Search sort field...'
                  />

                  <button
                    onClick={() =>
                      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'))
                    }
                    className='w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200'
                  >
                    {sortOrder === 'asc' ? '↑ Ascending' : '↓ Descending'}
                  </button>

                </div>
              )}
            </div>
          </div>

          {/* Customers Table - Desktop */}
          <div className='hidden sm:block overflow-x-auto'>
            <table className='w-full'>
              <thead className='bg-gray-50 dark:bg-gray-800/50'>
                <tr>
                  <th className='px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                    Customer
                  </th>
                  <th className='hidden sm:table-cell px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                    Contact
                  </th>
                  <th className='px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                    Segment
                  </th>
                  <th className='hidden md:table-cell px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                    Lifetime Value
                  </th>
                  <th className='px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                    Bookings
                  </th>
                  <th className='hidden lg:table-cell px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                    Last Booking Date
                  </th>
                 
                  <th className='px-3 sm:px-6 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className='divide-y divide-gray-100 dark:divide-gray-800'>
                {paginatedCustomers.map((customer: Customer) => (
                  <tr
                    key={customer.id}
                    className='hover:bg-blue-50/30 dark:hover:bg-blue-900/20 transition-colors cursor-pointer'
                    onClick={() => navigate(`/customers/${customer.id}`)}
                  >
                    <td className='px-3 sm:px-6 py-4'>
                      <p className='text-sm font-medium text-gray-900 dark:text-gray-100'>
                        {customer.fullName}
                      </p>
                      <p className='text-xs text-gray-500 dark:text-gray-400'>
                        PAN: {customer.panNumber}
                      </p>
                    </td>
                    <td className='hidden sm:table-cell px-3 sm:px-6 py-4'>
                      <div className='space-y-1'>
                        <p className='text-xs text-gray-700 dark:text-gray-300 flex items-center gap-1'>
                          <FaPhone className='text-gray-400 dark:text-gray-500 text-xs' />{' '}
                          {customer.phone}
                        </p>
                        <p className='text-xs text-gray-700 dark:text-gray-300 flex items-center gap-1'>
                          <FaEnvelope className='text-gray-400 dark:text-gray-500 text-xs' />{' '}
                          {customer.email}
                        </p>
                      </div>
                    </td>
                    <td className='px-3 sm:px-6 py-4'>
                      <span
                        className={`inline-flex items-center px-2 sm:px-2.5 py-1 rounded-full text-xs font-medium border ${getSegmentClass(
                          customer.segment ?? 'N/A'
                        )}`}
                      >
                        <MdOutlineSegment className='mr-1' />
                        {getSegmentLabel(customer.segment)}
                      </span>
                    </td>
                    <td className='hidden md:table-cell px-3 sm:px-6 py-4'>
                      <p className='text-sm font-medium text-gray-900 dark:text-gray-100'>
                        {formatCurrency(
                          customer.lifetimeValue,
                          customer.clientCurrency
                        )}
                      </p>
                    </td>
                    <td className='px-3 sm:px-6 py-4'>
                      <p className='text-sm text-gray-900 dark:text-gray-100'>
                        {customer.totalBookings ?? 0}
                      </p>
                    </td>
                    <td className='hidden lg:table-cell px-3 sm:px-6 py-4'>
                      <p className='text-sm text-gray-700 dark:text-gray-300'>
                        {formatDateLabel(customer.lastBookingDate) || 'N/A'}
                      </p>
                    </td>
                
                    <td className='px-3 sm:px-6 py-4'>
                      <div
                        className='flex justify-end gap-1 sm:gap-2'
                        onClick={e => e.stopPropagation()}
                      >
                        <button
                          onClick={() => navigate(`/customers/${customer.id}`)}
                          className='p-1.5 sm:p-2 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors'
                          title='View'
                        >
                          <FaEye className='text-xs sm:text-sm' />
                        </button>
                        <button
                          onClick={() => handleEditCustomer(customer)}
                          className='p-1.5 sm:p-2 text-gray-500 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg transition-colors'
                          title='Edit'
                        >
                          <FaEdit className='text-xs sm:text-sm' />
                        </button>
                        <button
                          onClick={() => handleDeleteCustomer(customer.id)}
                          className='p-1.5 sm:p-2 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors'
                          title='Delete'
                        >
                          <FaTrash className='text-xs sm:text-sm' />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Customers Cards - Mobile */}
          <div className='sm:hidden divide-y divide-gray-100 dark:divide-gray-800'>
            {paginatedCustomers.map(customer => (
              <div
                key={customer.id}
                className='p-4 space-y-3 hover:bg-blue-50/40 dark:hover:bg-gray-800/50 transition-colors'
              >
                {/* Header */}
                <div className='flex items-start justify-between'>
                  <div>
                    <p className='text-sm font-medium text-gray-900 dark:text-gray-100'>
                      {customer.fullName}
                    </p>
                    <p className='text-xs text-gray-500 dark:text-gray-400'>
                      PAN: {customer.panNumber}
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

                {/* Contact */}
                <div className='space-y-1'>
                  <p className='text-xs text-gray-700 dark:text-gray-300 flex items-center gap-1'>
                    <FaPhone className='text-gray-400 dark:text-gray-500 text-xs' />{' '}
                    {customer.phone}
                  </p>
                  <p className='text-xs text-gray-700 dark:text-gray-300 flex items-center gap-1'>
                    <FaEnvelope className='text-gray-400 dark:text-gray-500 text-xs' />{' '}
                    {customer.email}
                  </p>
                </div>

                {/* Stats */}
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

                {/* Last Booking */}
                <div className='grid grid-cols-2 gap-2'>
                  <div>
                    <p className='text-xs text-gray-500'>Last Booking Date</p>
                    <p className='text-sm text-gray-700 dark:text-gray-300'>
                      {formatDateLabel(customer.lastBookingDate) || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className='text-xs text-gray-500'>Last Bookings</p>
                    <p className='text-sm text-gray-700 dark:text-gray-300'>
                      {customer.lastBookingNumber || 'N/A'}
                    </p>
                  </div>
                </div>

                {/* Actions */}
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

          {/* Pagination */}
          <div className='flex items-center justify-between border-t border-gray-100 dark:border-gray-800 px-6 py-4'>
            <p className='text-sm text-gray-500 dark:text-gray-400'>
              Showing{' '}
              {Math.min(filteredCustomers.length, (page - 1) * pageSize + 1)}-
              {Math.min(filteredCustomers.length, page * pageSize)} of{' '}
              {filteredCustomers.length}
            </p>
            <div className='flex gap-2'>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className='px-3 py-1 border border-gray-300 dark:border-gray-700 rounded-lg text-sm disabled:opacity-50 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors'
              >
                <FaChevronLeft />
              </button>
              <span className='px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg text-sm font-medium'>
                {page}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className='px-3 py-1 border border-gray-300 dark:border-gray-700 rounded-lg text-sm disabled:opacity-50 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors'
              >
                <FaChevronRight />
              </button>
            </div>
          </div>
        </div>

        {/* Edit Customer Modal */}
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
                  ✕
                </button>
              </div>

              <div className='p-6 space-y-6'>
                {/* Personal Information */}
                <div>
                  <h3 className='text-md font-medium text-gray-900 dark:text-gray-100 mb-4'>
                    Personal Information
                  </h3>
                  <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                    {/* Full Name */}
                    <div className='md:col-span-2'>
                      <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                        Full Name <span className='text-red-500'>*</span>
                      </label>
                      <input
                        type='text'
                        value={editFormData.fullName}
                        onChange={e =>
                          setEditFormData(prev => ({
                            ...prev,
                            fullName: e.target.value
                          }))
                        }
                        className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100 ${
                          editFormErrors.fullName
                            ? 'border-red-500'
                            : 'border-gray-300 dark:border-gray-700'
                        }`}
                        placeholder='Enter full name'
                      />
                      {editFormErrors.fullName && (
                        <p className='mt-1 text-xs text-red-500'>
                          {editFormErrors.fullName}
                        </p>
                      )}
                    </div>

                    {/* Phone */}
                    <div>
                      <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                        Phone Number <span className='text-red-500'>*</span>
                      </label>
                      <input
                        type='tel'
                        value={editFormData.phone}
                        onChange={e =>
                          setEditFormData(prev => ({
                            ...prev,
                            phone: e.target.value
                          }))
                        }
                        className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100 ${
                          editFormErrors.phone
                            ? 'border-red-500'
                            : 'border-gray-300 dark:border-gray-700'
                        }`}
                        placeholder='+1 555 0123'
                      />
                      {editFormErrors.phone && (
                        <p className='mt-1 text-xs text-red-500'>
                          {editFormErrors.phone}
                        </p>
                      )}
                    </div>

                    {/* Email */}
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
                      {editFormErrors.email && (
                        <p className='mt-1 text-xs text-red-500'>
                          {editFormErrors.email}
                        </p>
                      )}
                    </div>

                    {/* PAN Number */}
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
                      {editFormErrors.panNumber && (
                        <p className='mt-1 text-xs text-red-500'>
                          {editFormErrors.panNumber}
                        </p>
                      )}
                    </div>

                    {/* Currency */}
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

                    {/* Address */}
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
                      {editFormErrors.addressLine && (
                        <p className='mt-1 text-xs text-red-500'>
                          {editFormErrors.addressLine}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Preferences & Segmentation */}
                <div>
                  <h3 className='text-md font-medium text-gray-900 dark:text-gray-100 mb-4'>
                    Preferences & Segmentation
                  </h3>
                  <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                    {/* Customer Segment */}
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

                    {/* Travel Preferences */}
                    <div>
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
                        placeholder='e.g., Beach resorts, All-inclusive packages, etc.'
                      />
                    </div>
                  </div>
                </div>

                {/* Error Message */}
                {error && (
                  <div className='bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-3'>
                    <p className='text-sm text-red-700 dark:text-red-400'>
                      {error}
                    </p>
                  </div>
                )}
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
                  {loading ? (
                    <>
                      <span className='animate-spin'>⌛</span>
                      Updating...
                    </>
                  ) : (
                    'Update Customer'
                  )}
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
