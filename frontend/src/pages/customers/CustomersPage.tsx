import React, { useState, useMemo } from 'react'
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

interface Customer {
  id: string
  fullName: string
  phone: string
  email: string
  preferences: string
  lifetimeValue: number
  segment: 'VIP' | 'HIGH_VALUE' | 'REGULAR' | 'NEW'
  panNumber: string
  addressLine: string
  clientCurrency: string
  createdAt: string
  totalBookings: number
  lastBookingDate?: string
}

const CustomersPage: React.FC = () => {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [segmentFilter, setSegmentFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [page, setPage] = useState(1)
  const pageSize = 10

  // Mock data - replace with API call
  const [customers, setCustomers] = useState<Customer[]>([
    {
      id: '1',
      fullName: 'Sarah Connor',
      phone: '+1 555 0100',
      email: 'sarah.connor@example.com',
      preferences: 'Beach resorts, All-inclusive packages',
      lifetimeValue: 12500,
      segment: 'VIP',
      panNumber: 'ABCDE1234F',
      addressLine: '123 Main St, Los Angeles, CA 90210',
      clientCurrency: 'USD',
      createdAt: '2023-01-15',
      totalBookings: 4,
      lastBookingDate: '2024-02-10'
    },
    {
      id: '2',
      fullName: 'Michael Chen',
      phone: '+1 555 0102',
      email: 'michael.chen@example.com',
      preferences: 'Business travel, Luxury hotels',
      lifetimeValue: 8900,
      segment: 'HIGH_VALUE',
      panNumber: 'XYZAB7890C',
      addressLine: '456 Oak Ave, San Francisco, CA 94105',
      clientCurrency: 'USD',
      createdAt: '2023-03-20',
      totalBookings: 3,
      lastBookingDate: '2024-01-15'
    },
    {
      id: '3',
      fullName: 'Emma Wilson',
      phone: '+1 555 0103',
      email: 'emma.wilson@example.com',
      preferences: 'Family trips, Adventure activities',
      lifetimeValue: 3400,
      segment: 'REGULAR',
      panNumber: 'PQRST4567D',
      addressLine: '789 Pine St, New York, NY 10001',
      clientCurrency: 'USD',
      createdAt: '2023-06-10',
      totalBookings: 2,
      lastBookingDate: '2023-12-05'
    },
    {
      id: '4',
      fullName: 'James Rodriguez',
      phone: '+1 555 0104',
      email: 'james.r@example.com',
      preferences: 'Cruise packages, European tours',
      lifetimeValue: 5600,
      segment: 'HIGH_VALUE',
      panNumber: 'LMNOP1234E',
      addressLine: '321 Elm Blvd, Miami, FL 33101',
      clientCurrency: 'USD',
      createdAt: '2023-02-28',
      totalBookings: 3,
      lastBookingDate: '2024-03-01'
    },
    {
      id: '5',
      fullName: 'Priya Patel',
      phone: '+1 555 0105',
      email: 'priya.p@example.com',
      preferences: 'Spa retreats, Cultural tours',
      lifetimeValue: 2100,
      segment: 'NEW',
      panNumber: 'FGHIJ6789F',
      addressLine: '654 Cedar Rd, Chicago, IL 60601',
      clientCurrency: 'USD',
      createdAt: '2024-01-05',
      totalBookings: 1,
      lastBookingDate: '2024-02-20'
    }
  ])

  const segments = [
    { value: 'VIP', label: 'VIP', color: 'purple' },
    { value: 'HIGH_VALUE', label: 'High Value', color: 'blue' },
    { value: 'REGULAR', label: 'Regular', color: 'green' },
    { value: 'NEW', label: 'New', color: 'yellow' }
  ]

  const getSegmentClass = (segment: string) => {
    switch (segment) {
      case 'VIP':
        return 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-900'
      case 'HIGH_VALUE':
        return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-900'
      case 'REGULAR':
        return 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-900'
      case 'NEW':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-900'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'
    }
  }

  // Filter and search customers
  const filteredCustomers = useMemo(() => {
    return customers
      .filter(customer => {
        const searchMatch =
          customer.fullName.toLowerCase().includes(search.toLowerCase()) ||
          customer.email.toLowerCase().includes(search.toLowerCase()) ||
          customer.phone.includes(search) ||
          customer.panNumber.toLowerCase().includes(search.toLowerCase())

        const segmentMatch =
          segmentFilter === 'all' || customer.segment === segmentFilter

        return searchMatch && segmentMatch
      })
      .sort((a, b) => {
        let comparison = 0
        switch (sortBy) {
          case 'name':
            comparison = a.fullName.localeCompare(b.fullName)
            break
          case 'ltv':
            comparison = a.lifetimeValue - b.lifetimeValue
            break
          case 'bookings':
            comparison = a.totalBookings - b.totalBookings
            break
          default:
            comparison = 0
        }
        return sortOrder === 'asc' ? comparison : -comparison
      })
  }, [customers, search, segmentFilter, sortBy, sortOrder])

  // Pagination
  const totalPages = Math.ceil(filteredCustomers.length / pageSize)
  const paginatedCustomers = filteredCustomers.slice(
    (page - 1) * pageSize,
    page * pageSize
  )

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const handleDeleteCustomer = (id: string) => {
    if (window.confirm('Are you sure you want to delete this customer?')) {
      setCustomers(prev => prev.filter(c => c.id !== id))
    }
  }

  const handleExport = () => {
    // Implement CSV export
    console.log('Exporting customers...')
  }

  return (
    <main className='flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8'>
        {/* Header */}
        <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6'>
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
          <button
            onClick={() => navigate('/customers/new')}
            className='inline-flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors w-full sm:w-auto'
          >
            <FaPlus className='mr-2' /> New Customer
          </button>
        </div>

        {/* KPI Cards */}
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6'>
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
              VIP Customers
            </p>
            <p className='text-2xl font-bold text-gray-900 dark:text-gray-100'>
              {customers.filter(c => c.segment === 'VIP').length}
            </p>
            <p className='text-xs text-purple-600 dark:text-purple-400 mt-1'>
              {(
                (customers.filter(c => c.segment === 'VIP').length /
                  customers.length) *
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
                customers.reduce((acc, c) => acc + c.lifetimeValue, 0) /
                  customers.length
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
              {customers.reduce((acc, c) => acc + c.totalBookings, 0)}
            </p>
            <p className='text-xs text-green-600 dark:text-green-400 mt-1'>
              Across all customers
            </p>
          </div>
        </div>

        {/* Filters Section */}
        <div className='bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 mb-6'>
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

              <div className='flex flex-col sm:flex-row gap-2 sm:gap-4'>
                {/* Segment Filter */}
                <select
                  value={segmentFilter}
                  onChange={e => {
                    setSegmentFilter(e.target.value)
                    setPage(1)
                  }}
                  className='flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100'
                >
                  <option value='all'>All Segments</option>
                  {segments.map(s => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>

                {/* Sort By */}
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value)}
                  className='flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100'
                >
                  <option value='name'>Sort by Name</option>
                  <option value='ltv'>Sort by LTV</option>
                  <option value='bookings'>Sort by Bookings</option>
                </select>

                {/* Sort Order */}
                <button
                  onClick={() =>
                    setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'))
                  }
                  className='px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors whitespace-nowrap'
                >
                  {sortOrder === 'asc' ? '↑ Ascending' : '↓ Descending'}
                </button>

                {/* Export Button */}
                <button
                  onClick={handleExport}
                  className='px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2 whitespace-nowrap'
                >
                  <FaDownload /> Export
                </button>
              </div>
            </div>
          </div>

          {/* Customers Table */}
          <div className='overflow-x-auto'>
            <table className='w-full '>
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
                    Last Booking
                  </th>
                  <th className='px-3 sm:px-6 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className='divide-y divide-gray-100 dark:divide-gray-800'>
                {paginatedCustomers.map(customer => (
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
                      <div className='sm:hidden mt-1 space-y-1'>
                        <p className='text-xs text-gray-700 dark:text-gray-300 flex items-center gap-1'>
                          <FaPhone className='text-gray-400 dark:text-gray-500 text-xs' />{' '}
                          {customer.phone}
                        </p>
                        <p className='text-xs text-gray-700 dark:text-gray-300 flex items-center gap-1'>
                          <FaEnvelope className='text-gray-400 dark:text-gray-500 text-xs' />{' '}
                          {customer.email}
                        </p>
                        <p className='text-xs text-gray-600 dark:text-gray-400 mt-1'>
                          LTV: {formatCurrency(customer.lifetimeValue)}
                        </p>
                      </div>
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
                          customer.segment
                        )}`}
                      >
                        <MdOutlineSegment className='mr-1' />
                        {customer.segment.replace('_', ' ')}
                      </span>
                    </td>
                    <td className='hidden md:table-cell px-3 sm:px-6 py-4'>
                      <p className='text-sm font-medium text-gray-900 dark:text-gray-100'>
                        {formatCurrency(customer.lifetimeValue)}
                      </p>
                    </td>
                    <td className='px-3 sm:px-6 py-4'>
                      <p className='text-sm text-gray-900 dark:text-gray-100'>
                        {customer.totalBookings}
                      </p>
                    </td>
                    <td className='hidden lg:table-cell px-3 sm:px-6 py-4'>
                      <p className='text-sm text-gray-700 dark:text-gray-300'>
                        {customer.lastBookingDate || 'N/A'}
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
                          onClick={() => navigate(`/customers/${customer.id}/edit`)}
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
      </div>
    </main>
  )
}

export default CustomersPage
