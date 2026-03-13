import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FaBuildingColumns,
  FaChevronLeft,
  FaChevronRight,
  FaCircleCheck,
  FaClockRotateLeft,
  FaCreditCard,
  FaDownload,
  FaListUl,
  FaMagnifyingGlass,
  FaMoneyBill,
  FaPlus,
  FaRotateLeft,
  FaRotateRight,
  FaWallet,
  FaXmark,
  FaFilter
} from 'react-icons/fa6'
import SurfaceCard from '../ui/SurfaceCard'
import EmptyState from '../ui/EmptyState'

type TxStatus = 'completed' | 'pending' | 'failed' | 'refunded'

interface Transaction {
  id: string
  referenceId: string
  date: string
  customer: string
  bookingId: string
  amount: number
  mode: 'bank' | 'card' | 'cash'
  status: TxStatus
}

const statusClasses: Record<TxStatus, string> = {
  completed:
    'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-900',
  pending:
    'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-900',
  failed:
    'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-900',
  refunded:
    'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'
}

const transactions: Transaction[] = [
  {
    id: '1',
    referenceId: 'TRX-8902',
    date: 'Mar 09, 2026',
    customer: 'Sarah Jenkins',
    bookingId: 'BK-2034',
    amount: 1200,
    mode: 'card',
    status: 'completed'
  },
  {
    id: '2',
    referenceId: 'TRX-8901',
    date: 'Mar 08, 2026',
    customer: 'Emma Wilson',
    bookingId: 'BK-2030',
    amount: 5400,
    mode: 'bank',
    status: 'completed'
  },
  {
    id: '3',
    referenceId: 'TRX-8895',
    date: 'Mar 07, 2026',
    customer: 'James Lee',
    bookingId: 'BK-2028',
    amount: -8200,
    mode: 'bank',
    status: 'refunded'
  },
  {
    id: '4',
    referenceId: 'TRX-8888',
    date: 'Mar 05, 2026',
    customer: 'Michael Ross',
    bookingId: 'BK-2033',
    amount: 2800,
    mode: 'card',
    status: 'failed'
  }
]

const Payments: React.FC = () => {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | TxStatus>('all')
  const [showPanel, setShowPanel] = useState(false)
  const [showMobileFilters, setShowMobileFilters] = useState(false)
  const [page, setPage] = useState(1)
  const pageSize = 4

  const filtered = useMemo(() => {
    return transactions.filter(tx => {
      const statusMatch = statusFilter === 'all' || tx.status === statusFilter
      const searchMatch =
        tx.referenceId.toLowerCase().includes(search.toLowerCase()) ||
        tx.customer.toLowerCase().includes(search.toLowerCase()) ||
        tx.bookingId.toLowerCase().includes(search.toLowerCase())
      return statusMatch && searchMatch
    })
  }, [search, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const rows = filtered.slice((page - 1) * pageSize, page * pageSize)

  const modeIcon = (mode: Transaction['mode']) => {
    if (mode === 'bank') return <FaBuildingColumns className='text-gray-500' />
    if (mode === 'card') return <FaCreditCard className='text-blue-600' />
    return <FaMoneyBill className='text-green-600' />
  }

  return (
    <div className='space-y-4 sm:space-y-6'>
      {/* Header */}
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
        <div>
          <h1 className='text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100'>
            Payments
          </h1>
          <p className='text-xs sm:text-sm text-gray-500 dark:text-gray-400'>
            Track transactions, statuses, and receipts in real time.
          </p>
        </div>
        <div className='flex flex-wrap sm:flex-nowrap items-center gap-2'>
          <button
            onClick={() => setShowPanel(true)}
            className='inline-flex h-10 min-w-[140px] items-center justify-center rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white transition-all duration-200 hover:bg-blue-700'
          >
            <FaPlus className='mr-2' /> Add Payment
          </button>
          <button
            onClick={() => navigate('/refunds')}
            className='inline-flex h-10 min-w-[140px] items-center justify-center rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800'
          >
            Create Refund
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4'>
        <StatCard
          title='Collected'
          value='$48.2k'
          subtitle='+8% vs last month'
          icon={<FaWallet className='text-blue-600' />}
        />
        <StatCard
          title='Outstanding'
          value='$12.4k'
          subtitle='14 pending'
          icon={<FaClockRotateLeft className='text-amber-500' />}
        />
        <StatCard
          title='Overdue'
          value='$3.2k'
          subtitle='3 invoices'
          icon={<FaRotateRight className='text-red-500' />}
        />
        <StatCard
          title='Refunds'
          value='$1.8k'
          subtitle='This month'
          icon={<FaRotateLeft className='text-gray-500' />}
        />
      </div>

      {/* Main Card */}
      <SurfaceCard className='p-0 overflow-hidden border border-gray-200 dark:border-gray-800'>
        {/* Filters Section */}
        <div className='border-b border-gray-100 dark:border-gray-800 p-3 sm:p-4'>
          {/* Mobile: Search + Filter Button */}
          <div className='flex items-center gap-2 lg:hidden'>
            <div className='flex-1 relative'>
              <FaMagnifyingGlass className='absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400' />
              <input
                className='w-full pl-9 pr-4 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500'
                value={search}
                onChange={e => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                placeholder='Search transactions...'
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
              {/* Desktop Search and Filter */}
              <div className='hidden lg:flex flex-col sm:flex-row gap-2'>
                <div className='relative w-full sm:w-80'>
                  <FaMagnifyingGlass className='pointer-events-none absolute left-3 top-3 text-xs text-gray-400' />
                  <input
                    className='field-input pl-9'
                    value={search}
                    onChange={e => {
                      setSearch(e.target.value)
                      setPage(1)
                    }}
                    placeholder='Search by transaction, customer, booking'
                  />
                </div>
                <select
                  className='field-input w-full sm:w-44'
                  value={statusFilter}
                  onChange={e => {
                    setStatusFilter(e.target.value as 'all' | TxStatus)
                    setPage(1)
                  }}
                >
                  <option value='all'>All Statuses</option>
                  <option value='completed'>Completed</option>
                  <option value='pending'>Pending</option>
                  <option value='failed'>Failed</option>
                  <option value='refunded'>Refunded</option>
                </select>
              </div>

              {/* Mobile Status Filter */}
              <div className='lg:hidden w-full'>
                <select
                  className='w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500'
                  value={statusFilter}
                  onChange={e => {
                    setStatusFilter(e.target.value as 'all' | TxStatus)
                    setPage(1)
                    setShowMobileFilters(false)
                  }}
                >
                  <option value='all'>All Statuses</option>
                  <option value='completed'>Completed</option>
                  <option value='pending'>Pending</option>
                  <option value='failed'>Failed</option>
                  <option value='refunded'>Refunded</option>
                </select>
              </div>

              {/* Export Button */}
              <button className='inline-flex items-center rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors'>
                <FaDownload className='mr-2' /> Export CSV
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

        {/* Transactions List */}
        {rows.length === 0 ? (
          <div className='p-8'>
            <EmptyState
              title='No transactions'
              description='Try a different filter or add a new payment.'
              icon={<FaListUl className='text-4xl' />}
            />
          </div>
        ) : (
          <>
            {/* Mobile View - Cards */}
            <div className='block lg:hidden divide-y divide-gray-100 dark:divide-gray-800'>
              {rows.map((tx, index) => (
                <div
                  key={tx.id}
                  className={`p-4 space-y-3 hover:bg-blue-50/40 dark:hover:bg-gray-800/50 transition-colors ${
                    index !== rows.length - 1
                      ? 'border-b border-gray-100 dark:border-gray-800'
                      : ''
                  }`}
                >
                  {/* Header with Reference and Status */}
                  <div className='flex items-start justify-between'>
                    <div className='space-y-1'>
                      <p className='text-sm font-medium text-blue-600 dark:text-blue-400'>
                        #{tx.referenceId}
                      </p>
                      <p className='text-xs text-gray-500'>{tx.date}</p>
                    </div>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${
                        statusClasses[tx.status]
                      }`}
                    >
                      {tx.status}
                    </span>
                  </div>

                  {/* Customer and Booking */}
                  <div className='space-y-1'>
                    <p className='text-sm font-medium text-gray-900 dark:text-gray-100'>
                      {tx.customer}
                    </p>
                    <p className='text-xs text-gray-500'>
                      Booking #{tx.bookingId}
                    </p>
                  </div>

                  {/* Amount and Mode */}
                  <div className='flex items-center justify-between'>
                    <div className='flex items-center gap-2'>
                      <span className='inline-flex items-center gap-1 text-sm text-gray-600 dark:text-gray-300'>
                        {modeIcon(tx.mode)} {tx.mode}
                      </span>
                    </div>
                    <p
                      className={`text-sm font-semibold ${
                        tx.amount < 0
                          ? 'text-red-600'
                          : 'text-gray-900 dark:text-gray-100'
                      }`}
                    >
                      {tx.amount < 0 ? '-' : ''}$
                      {Math.abs(tx.amount).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop View - Table (UNCHANGED) */}
            <div className='hidden lg:block overflow-x-auto'>
              <table className='min-w-[980px] w-full divide-y divide-gray-200 dark:divide-gray-800'>
                <thead className='sticky top-0 z-10 bg-gray-50 dark:bg-gray-800/95'>
                  <tr>
                    <th className='px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500'>
                      Reference
                    </th>
                    <th className='px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500'>
                      Date
                    </th>
                    <th className='px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500'>
                      Customer
                    </th>
                    <th className='px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500'>
                      Amount
                    </th>
                    <th className='px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500'>
                      Mode
                    </th>
                    <th className='px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500'>
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-gray-100 dark:divide-gray-800'>
                  {rows.map(tx => (
                    <tr
                      key={tx.id}
                      className='hover:bg-blue-50/30 dark:hover:bg-gray-800/40'
                    >
                      <td className='px-5 py-4 text-sm font-medium text-blue-600 dark:text-blue-300'>
                        #{tx.referenceId}
                      </td>
                      <td className='px-5 py-4 text-sm text-gray-600 dark:text-gray-300'>
                        {tx.date}
                      </td>
                      <td className='px-5 py-4'>
                        <p className='text-sm font-medium text-gray-900 dark:text-gray-100'>
                          {tx.customer}
                        </p>
                        <p className='text-xs text-gray-500'>#{tx.bookingId}</p>
                      </td>
                      <td
                        className={`px-5 py-4 text-right text-sm font-semibold ${
                          tx.amount < 0
                            ? 'text-red-600'
                            : 'text-gray-900 dark:text-gray-100'
                        }`}
                      >
                        {tx.amount < 0 ? '-' : ''}$
                        {Math.abs(tx.amount).toFixed(2)}
                      </td>
                      <td className='px-5 py-4'>
                        <span className='inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300'>
                          {modeIcon(tx.mode)} {tx.mode}
                        </span>
                      </td>
                      <td className='px-5 py-4'>
                        <span
                          className={`rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${
                            statusClasses[tx.status]
                          }`}
                        >
                          {tx.status}
                        </span>
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

      {/* Add Payment Panel */}
      {showPanel && (
        <div className='fixed inset-0 z-50'>
          <div
            className='absolute inset-0 bg-black/40'
            onClick={() => setShowPanel(false)}
          />
          <div className='absolute right-0 top-0 h-full w-full max-w-md border-l border-gray-200 bg-white p-6 shadow-xl dark:border-gray-700 dark:bg-gray-900 overflow-y-auto'>
            <div className='mb-5 flex items-center justify-between'>
              <h2 className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
                Add New Payment
              </h2>
              <button
                onClick={() => setShowPanel(false)}
                className='text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
              >
                <FaXmark />
              </button>
            </div>
            <div className='space-y-4'>
              <div>
                <label className='field-label'>Booking / Customer</label>
                <input
                  className='field-input'
                  placeholder='Search booking ID or customer'
                />
              </div>
              <div>
                <label className='field-label'>Amount</label>
                <input
                  type='number'
                  className='field-input'
                  placeholder='0.00'
                />
              </div>
              <div>
                <label className='field-label'>Payment Mode</label>
                <select className='field-input'>
                  <option>Bank Transfer</option>
                  <option>Card</option>
                  <option>Cash</option>
                </select>
              </div>
              <div>
                <label className='field-label'>Reference ID</label>
                <input className='field-input' placeholder='TRX-0001' />
              </div>
              <button className='mt-2 w-full rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700'>
                <FaCircleCheck className='mr-2 inline' /> Record Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Stat Card Component - Responsive
const StatCard = ({
  title,
  value,
  subtitle,
  icon
}: {
  title: string
  value: string
  subtitle: string
  icon: React.ReactNode
}) => (
  <SurfaceCard hoverable className='p-3 sm:p-5'>
    <div className='flex items-start justify-between'>
      <div className='min-w-0'>
        <p className='text-[10px] sm:text-xs uppercase tracking-wide text-gray-500 truncate'>
          {title}
        </p>
        <p className='text-base sm:text-2xl font-semibold text-gray-900 dark:text-gray-100 mt-0.5 sm:mt-1'>
          {value}
        </p>
        <p className='text-[10px] sm:text-xs text-gray-500 mt-0.5 sm:mt-1 truncate'>
          {subtitle}
        </p>
      </div>
      <div className='text-lg sm:text-xl flex-shrink-0'>{icon}</div>
    </div>
  </SurfaceCard>
)

export default Payments
