import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FaCalendarDays,
  FaChevronLeft,
  FaChevronRight,
  FaCopy,
  FaEllipsis,
  FaEye,
  FaFileInvoice,
  FaMagnifyingGlass,
  FaPlus,
  FaWhatsapp,
  FaFilter,
  FaXmark
} from 'react-icons/fa6'
import SurfaceCard from '../../components/ui/SurfaceCard'
import EmptyState from '../../components/ui/EmptyState'
import { validateQuoteTransition } from '../../utils/workflowValidation'

type Status = 'pending' | 'accepted' | 'expired' | 'rejected' | 'draft'
interface Quotation {
  id: string
  quoteNumber: string
  customer: string
  email: string
  destination: string
  details: string
  total: number
  margin: number
  status: Status
  lastSent: string | null
}

const items: Quotation[] = [
  {
    id: '1',
    quoteNumber: 'QT-2026-089',
    customer: 'Sarah Jenkins',
    email: 'sarah.j@example.com',
    destination: 'Maldives Retreat',
    details: '5 Nights - All Inclusive',
    total: 4250,
    margin: 12,
    status: 'pending',
    lastSent: 'Mar 9 - Email'
  },
  {
    id: '2',
    quoteNumber: 'QT-2026-088',
    customer: 'Michael Ross',
    email: 'm.ross@company.com',
    destination: 'Tokyo Business Trip',
    details: '7 Nights - Hotel Only',
    total: 2800,
    margin: 15,
    status: 'accepted',
    lastSent: 'Mar 8 - WhatsApp'
  },
  {
    id: '3',
    quoteNumber: 'QT-2026-085',
    customer: 'Emma Lewis',
    email: 'emma.l@gmail.com',
    destination: 'Paris Family Vacation',
    details: '10 Nights - Package',
    total: 8450,
    margin: 10,
    status: 'expired',
    lastSent: 'Mar 2 - Email'
  },
  {
    id: '4',
    quoteNumber: 'Draft',
    customer: 'David Kim',
    email: 'New Lead',
    destination: 'Bali Honeymoon',
    details: '14 Nights',
    total: 5100,
    margin: 0,
    status: 'draft',
    lastSent: null
  }
]

const tabs = [
  'All',
  'pending',
  'accepted',
  'expired',
  'rejected',
  'draft'
] as const
const styles: Record<Status, string> = {
  pending:
    'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-900',
  accepted:
    'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-900',
  expired:
    'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-900',
  rejected:
    'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-900',
  draft:
    'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'
}

const QuotationsPage: React.FC = () => {
  const nav = useNavigate()
  const [tab, setTab] = useState<typeof tabs[number]>('All')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [error, setError] = useState('')
  const [showMobileFilters, setShowMobileFilters] = useState(false)
  const pageSize = 4

  const filtered = useMemo(
    () =>
      items.filter(
        q =>
          (tab === 'All' || q.status === tab) &&
          `${q.quoteNumber} ${q.customer} ${q.destination}`
            .toLowerCase()
            .includes(search.toLowerCase())
      ),
    [tab, search]
  )

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const rows = filtered.slice((page - 1) * pageSize, page * pageSize)

  const rejectQuotation = () => {
    const reason = window.prompt('Reason is required for REJECTED status.')
    const validationError = validateQuoteTransition('REJECTED', reason ?? '')
    setError(validationError)
  }

  return (
    <div className='space-y-4 sm:space-y-6'>
      {/* Header */}
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
        <div>
          <h1 className='text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100'>
            Quotations
          </h1>
          <p className='text-xs sm:text-sm text-gray-500 dark:text-gray-400'>
            Manage, track, and convert quotations faster.
          </p>
        </div>

        <button
          onClick={() => nav('/quotations/builder')}
          className='inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors w-full sm:w-auto'
        >
          <FaPlus className='mr-2' />
          <span>Create Quotation</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4'>
        {[
          { t: 'Total Active', v: '142', c: '+12%' },
          { t: 'Pending', v: '28', c: 'Attention' },
          { t: 'Converted', v: '45', c: 'This Month' },
          { t: 'Value', v: '$342.8k', c: 'USD' }
        ].map(k => (
          <SurfaceCard key={k.t} hoverable className='p-3 sm:p-5'>
            <div className='flex items-start justify-between'>
              <div className='min-w-0'>
                <p className='text-[10px] sm:text-xs uppercase tracking-wide text-gray-500 truncate'>
                  {k.t}
                </p>
                <p className='text-base sm:text-2xl font-semibold text-gray-900 dark:text-gray-100 mt-0.5 sm:mt-1'>
                  {k.v}
                </p>
              </div>
              <span className='text-[10px] sm:text-xs whitespace-nowrap rounded-full bg-gray-100 dark:bg-gray-800 px-1.5 sm:px-2 py-0.5 sm:py-1 text-gray-700 dark:text-gray-300'>
                {k.c}
              </span>
            </div>
          </SurfaceCard>
        ))}
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
                value={search}
                onChange={e => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                className='w-full pl-9 pr-4 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500'
                placeholder='Search quotations...'
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
              {/* Tabs */}
              <div className='w-full lg:w-auto overflow-x-auto pb-1 scrollbar-hide'>
                <div className='inline-flex rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-1 min-w-max'>
                  {tabs.map(t => (
                    <button
                      key={t}
                      onClick={() => {
                        setTab(t)
                        setPage(1)
                        setShowMobileFilters(false)
                      }}
                      className={`px-3 py-1.5 text-xs sm:text-sm font-medium capitalize rounded-lg whitespace-nowrap transition-all ${
                        tab === t
                          ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Desktop Search and Date Range (unchanged) */}
              <div className='hidden lg:flex items-center gap-2'>
                <div className='relative w-80'>
                  <FaMagnifyingGlass className='absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400' />
                  <input
                    value={search}
                    onChange={e => {
                      setSearch(e.target.value)
                      setPage(1)
                    }}
                    className='w-full pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-gray-800'
                    placeholder='Search quote, customer, destination'
                  />
                </div>
                <button className='inline-flex items-center rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors'>
                  <FaCalendarDays className='mr-2' /> Date Range
                </button>
              </div>

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

        {/* Quotations List */}
        {rows.length === 0 ? (
          <div className='p-8'>
            <EmptyState
              title='No quotations found'
              description='Try different filters or create a new quotation.'
              icon={<FaFileInvoice className='text-4xl' />}
            />
          </div>
        ) : (
          <>
            {/* Mobile View - Cards */}
            <div className='block lg:hidden divide-y divide-gray-100 dark:divide-gray-800'>
              {rows.map((q, index) => (
                <div
                  key={q.id}
                  className={`p-4 space-y-3 hover:bg-blue-50/40 dark:hover:bg-gray-800/50 transition-colors ${
                    index !== rows.length - 1
                      ? 'border-b border-gray-100 dark:border-gray-800'
                      : ''
                  }`}
                >
                  {/* Header with Quote Number and Status */}
                  <div className='flex items-start justify-between'>
                    <div className='space-y-1'>
                      <p className='text-sm font-medium text-blue-600 dark:text-blue-400'>
                        {q.quoteNumber}
                      </p>
                      <p className='text-xs text-gray-500'>{q.customer}</p>
                    </div>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${
                        styles[q.status]
                      }`}
                    >
                      {q.status}
                    </span>
                  </div>

                  {/* Destination and Details */}
                  <div className='space-y-1'>
                    <p className='text-sm font-medium text-gray-900 dark:text-gray-100'>
                      {q.destination}
                    </p>
                    <p className='text-xs text-gray-500'>{q.details}</p>
                  </div>

                  {/* Email */}
                  <p className='text-xs text-gray-500 truncate'>{q.email}</p>

                  {/* Total and Margin */}
                  <div className='flex items-center justify-between'>
                    <div>
                      <p className='text-sm font-semibold text-gray-900 dark:text-gray-100'>
                        ${q.total.toLocaleString()}
                      </p>
                      <p className='text-xs text-green-600 dark:text-green-400'>
                        Margin {q.margin}%
                      </p>
                    </div>
                    <p className='text-xs text-gray-500'>
                      {q.lastSent ?? 'Never Sent'}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className='flex justify-end gap-2 pt-2'>
                    <button
                      onClick={() => nav(`/quotations/${q.id}`)}
                      className='p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors'
                      title='View'
                    >
                      <FaEye className='text-sm' />
                    </button>
                    <button
                      className='p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors'
                      title='Send via WhatsApp'
                    >
                      <FaWhatsapp className='text-sm' />
                    </button>
                    <button
                      className='p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors'
                      title='Copy'
                    >
                      <FaCopy className='text-sm' />
                    </button>
                    <button
                      onClick={rejectQuotation}
                      className='p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors'
                      title='More options'
                    >
                      <FaEllipsis className='text-sm' />
                    </button>
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
                      Quote #
                    </th>
                    <th className='px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500'>
                      Customer
                    </th>
                    <th className='px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500'>
                      Destination
                    </th>
                    <th className='px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500'>
                      Total
                    </th>
                    <th className='px-5 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500'>
                      Status
                    </th>
                    <th className='px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500'>
                      Last Sent
                    </th>
                    <th className='px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500'>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-gray-100 dark:divide-gray-800'>
                  {rows.map(q => (
                    <tr
                      key={q.id}
                      className='group hover:bg-blue-50/30 dark:hover:bg-gray-800/40 transition-colors'
                    >
                      <td className='px-5 py-4 text-sm font-medium text-blue-600 dark:text-blue-300'>
                        {q.quoteNumber}
                      </td>
                      <td className='px-5 py-4'>
                        <p className='text-sm font-medium text-gray-900 dark:text-gray-100'>
                          {q.customer}
                        </p>
                        <p className='text-xs text-gray-500'>{q.email}</p>
                      </td>
                      <td className='px-5 py-4'>
                        <p className='text-sm text-gray-800 dark:text-gray-100'>
                          {q.destination}
                        </p>
                        <p className='text-xs text-gray-500'>{q.details}</p>
                      </td>
                      <td className='px-5 py-4 text-right'>
                        <p className='text-sm font-semibold text-gray-900 dark:text-gray-100'>
                          ${q.total.toFixed(2)}
                        </p>
                        <p className='text-xs text-green-600 dark:text-green-400'>
                          Margin {q.margin}%
                        </p>
                      </td>
                      <td className='px-5 py-4 text-center'>
                        <span
                          className={`rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${
                            styles[q.status]
                          }`}
                        >
                          {q.status}
                        </span>
                      </td>
                      <td className='px-5 py-4 text-xs text-gray-500'>
                        {q.lastSent ?? 'Never Sent'}
                      </td>
                      <td className='px-5 py-4'>
                        <div className='flex justify-end gap-2 transition-all duration-200'>
                          <button
                            onClick={() => nav(`/quotations/${q.id}`)}
                            className='rounded-lg border border-gray-200 p-2 text-gray-500 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                          >
                            <FaEye />
                          </button>
                          <button className='rounded-lg border border-gray-200 p-2 text-green-600 dark:border-gray-700 hover:bg-green-50 dark:hover:bg-green-900/20'>
                            <FaWhatsapp />
                          </button>
                          <button className='rounded-lg border border-gray-200 p-2 text-gray-500 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'>
                            <FaCopy />
                          </button>
                          <button
                            onClick={rejectQuotation}
                            className='rounded-lg border border-gray-200 p-2 text-red-600 dark:border-gray-700 hover:bg-red-50 dark:hover:bg-red-900/20'
                          >
                            <FaEllipsis />
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
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className='p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors'
                >
                  <FaChevronLeft className='text-sm' />
                </button>
                <span className='px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-sm font-medium min-w-[40px] text-center'>
                  {page}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
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
    </div>
  )
}

export default QuotationsPage
