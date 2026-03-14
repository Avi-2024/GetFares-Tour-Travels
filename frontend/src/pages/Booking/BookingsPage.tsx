import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FaArrowTrendUp,
  FaCalendarDays,
  FaChevronLeft,
  FaChevronRight,
  FaCreditCard,
  FaDownload,
  FaEye,
  FaFileInvoiceDollar,
  FaMagnifyingGlass,
  FaPaperPlane,
  FaPlus,
  FaTriangleExclamation,
  // FaFileText,
  FaMoneyBillWave,
  FaEnvelope,
  
  FaFilter,
  FaXmark
} from 'react-icons/fa6'
import SurfaceCard from '../../components/ui/SurfaceCard'
import EmptyState from '../../components/ui/EmptyState'
import { validateBookingTransition } from '../../utils/workflowValidation'
import { bookingsApi } from "../../api/bookings";

type BookingStatus = 'confirmed' | 'pending' | 'cancelled'
type PaymentStatus = 'partial' | 'unpaid' | 'paid' | 'refunded'

interface Booking {
  id: string
  bookingId: string
  customer: string
  destination: string
  dates: string
  status: BookingStatus
  payment: PaymentStatus
  paid: number
  total: number
  documentsReady: number
  documentsTotal: number
}

const statusClasses: Record<BookingStatus, string> = {
  confirmed:
    'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-900',
  pending:
    'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-900',
  cancelled:
    'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-900'
}

const paymentClasses: Record<PaymentStatus, string> = {
  partial:
    'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-900',
  unpaid:
    'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-900',
  paid: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-900',
  refunded:
    'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'
}

const bookings: Booking[] = [
  {
    id: '1',
    bookingId: 'BK-2034',
    customer: 'Sarah Jenkins',
    destination: 'Maldives Retreat',
    dates: 'Dec 15 - Dec 20',
    status: 'confirmed',
    payment: 'partial',
    paid: 1200,
    total: 4250,
    documentsReady: 2,
    documentsTotal: 4
  },
  {
    id: '2',
    bookingId: 'BK-2033',
    customer: 'Michael Ross',
    destination: 'Dubai Luxury',
    dates: 'Jan 10 - Jan 15',
    status: 'pending',
    payment: 'unpaid',
    paid: 0,
    total: 2800,
    documentsReady: 0,
    documentsTotal: 3
  },
  {
    id: '3',
    bookingId: 'BK-2030',
    customer: 'Emma Wilson',
    destination: 'Paris & London',
    dates: 'Nov 05 - Nov 12',
    status: 'confirmed',
    payment: 'paid',
    paid: 5400,
    total: 5400,
    documentsReady: 5,
    documentsTotal: 5
  },
  {
    id: '4',
    bookingId: 'BK-2028',
    customer: 'James Lee',
    destination: 'Tokyo Adventure',
    dates: 'Dec 01 - Dec 10',
    status: 'cancelled',
    payment: 'refunded',
    paid: 0,
    total: 8200,
    documentsReady: 1,
    documentsTotal: 3
  }
]

const BookingsPage: React.FC = () => {
  const navigate = useNavigate()
  const [statusFilter, setStatusFilter] = useState<'all' | BookingStatus>('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [error, setError] = useState('')
  const [showMobileFilters, setShowMobileFilters] = useState(false)
  const [loading, setLoading] = useState(false);
  const pageSize = 4

  const handleGenerateInvoice = async (bookingId: string) => {
    setLoading(true);
    try {
      await bookingsApi.generateInvoice(bookingId);
      console.log(`Invoice generated for booking ${bookingId}`);
    } catch (error) {
      console.error('Failed to generate invoice:', error);
      setError('Failed to generate invoice');
    } finally {
      setLoading(false);
    }
  };

  const handleSendConfirmation = async (bookingId: string) => {
    setLoading(true);
    try {
      await bookingsApi.sendConfirmation(bookingId);
      console.log(`Confirmation sent for booking ${bookingId}`);
    } catch (error) {
      console.error('Failed to send confirmation:', error);
      setError('Failed to send confirmation');
    } finally {
      setLoading(false);
    }
  };

  const handleRecordPayment = async (bookingId: string) => {
    const amount = window.prompt('Enter payment amount:');
    if (!amount) return;
    
    setLoading(true);
    try {
      await bookingsApi.recordPayment(bookingId, {
        amount: parseFloat(amount),
        method: 'manual',
        notes: 'Manual payment entry'
      });
      console.log(`Payment recorded for booking ${bookingId}`);
      // Refresh booking data
    } catch (error) {
      console.error('Failed to record payment:', error);
      setError('Failed to record payment');
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    return bookings.filter(booking => {
      const statusMatch =
        statusFilter === 'all' || booking.status === statusFilter
      const searchMatch =
        booking.bookingId.toLowerCase().includes(search.toLowerCase()) ||
        booking.customer.toLowerCase().includes(search.toLowerCase()) ||
        booking.destination.toLowerCase().includes(search.toLowerCase())
      return statusMatch && searchMatch
    })
  }, [search, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const rows = filtered.slice((page - 1) * pageSize, page * pageSize)

  const cancelBooking = () => {
    const cancellationReason = window.prompt(
      'Cancellation reason is required for CANCELLED status.'
    )
    const validationError = validateBookingTransition(
      'CANCELLED',
      cancellationReason ?? ''
    )
    setError(validationError)
  }

  return (
    <div className='space-y-4 sm:space-y-6'>
      {/* Header */}
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
        <div>
          <h1 className='text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100'>
            Bookings
          </h1>
          <p className='text-xs sm:text-sm text-gray-500 dark:text-gray-400'>
            Monitor confirmations, payments, and documents from one place.
          </p>
        </div>
        <button className='inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-blue-700 w-full sm:w-auto'>
          <FaPlus className='mr-2' /> New Booking
        </button>
      </div>

      {/* KPI Cards */}
      <div className='grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4'>
        <SurfaceCard hoverable className='p-3 sm:p-5'>
          <div className='flex items-start justify-between'>
            <div className='min-w-0'>
              <p className='text-[10px] sm:text-xs uppercase tracking-wide text-gray-500 truncate'>
                Upcoming Trips
              </p>
              <p className='text-lg sm:text-2xl font-semibold text-gray-900 dark:text-gray-100 mt-1'>
                24
              </p>
              <p className='mt-1 text-xs text-green-600 flex items-center'>
                <FaArrowTrendUp className='mr-1 text-xs' /> 12% this week
              </p>
            </div>
            <FaCalendarDays className='text-blue-600 text-lg sm:text-xl flex-shrink-0' />
          </div>
        </SurfaceCard>
        <SurfaceCard hoverable className='p-3 sm:p-5'>
          <div className='flex items-start justify-between'>
            <div className='min-w-0'>
              <p className='text-[10px] sm:text-xs uppercase tracking-wide text-gray-500 truncate'>
                Unconfirmed
              </p>
              <p className='text-lg sm:text-2xl font-semibold text-gray-900 dark:text-gray-100 mt-1'>
                8
              </p>
              <p className='mt-1 text-xs text-amber-600 truncate'>
                Needs attention
              </p>
            </div>
            <FaTriangleExclamation className='text-amber-500 text-lg sm:text-xl flex-shrink-0' />
          </div>
        </SurfaceCard>
        <SurfaceCard hoverable className='p-3 sm:p-5'>
          <div className='flex items-start justify-between'>
            <div className='min-w-0'>
              <p className='text-[10px] sm:text-xs uppercase tracking-wide text-gray-500 truncate'>
                Pending Payments
              </p>
              <p className='text-lg sm:text-2xl font-semibold text-gray-900 dark:text-gray-100 mt-1'>
                $12.5k
              </p>
              <p className='mt-1 text-xs text-gray-500'>5 invoices</p>
            </div>
            <FaCreditCard className='text-red-500 text-lg sm:text-xl flex-shrink-0' />
          </div>
        </SurfaceCard>
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
                className='w-full pl-9 pr-4 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500'
                placeholder='Search bookings...'
                value={search}
                onChange={e => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
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
              {/* Status Filter and Search (Desktop) */}
              <div className='hidden lg:flex flex-col sm:flex-row gap-2'>
                <div className='relative w-full sm:w-80'>
                  <FaMagnifyingGlass className='pointer-events-none absolute left-3 top-3 text-xs text-gray-400' />
                  <input
                    className='field-input pl-9'
                    placeholder='Search booking, customer, destination'
                    value={search}
                    onChange={e => {
                      setSearch(e.target.value)
                      setPage(1)
                    }}
                  />
                </div>
                <select
                  className='field-input w-full sm:w-44'
                  value={statusFilter}
                  onChange={e => {
                    setStatusFilter(e.target.value as 'all' | BookingStatus)
                    setPage(1)
                  }}
                >
                  <option value='all'>All Statuses</option>
                  <option value='confirmed'>Confirmed</option>
                  <option value='pending'>Pending</option>
                  <option value='cancelled'>Cancelled</option>
                </select>
              </div>

              {/* Mobile Status Filter */}
              <div className='lg:hidden w-full'>
                <select
                  className='w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500'
                  value={statusFilter}
                  onChange={e => {
                    setStatusFilter(e.target.value as 'all' | BookingStatus)
                    setPage(1)
                    setShowMobileFilters(false)
                  }}
                >
                  <option value='all'>All Statuses</option>
                  <option value='confirmed'>Confirmed</option>
                  <option value='pending'>Pending</option>
                  <option value='cancelled'>Cancelled</option>
                </select>
              </div>

              {/* Export Button */}
              <button className='inline-flex items-center rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors'>
                <FaDownload className='mr-2' /> Export
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

        {/* Bookings List */}
        {rows.length === 0 ? (
          <div className='p-8'>
            <EmptyState
              title='No bookings found'
              description='Try changing search or filters.'
              icon={<FaCalendarDays className='text-4xl' />}
            />
          </div>
        ) : (
          <>
            {/* Mobile View - Cards */}
            <div className='block lg:hidden divide-y divide-gray-100 dark:divide-gray-800'>
              {rows.map((booking, index) => (
                <div
                  key={booking.id}
                  className={`p-4 space-y-3 hover:bg-blue-50/40 dark:hover:bg-gray-800/50 transition-colors ${
                    index !== rows.length - 1
                      ? 'border-b border-gray-100 dark:border-gray-800'
                      : ''
                  }`}
                >
                  {/* Header with Booking ID and Status */}
                  <div className='flex items-start justify-between'>
                    <div className='space-y-1'>
                      <p className='text-sm font-medium text-blue-600 dark:text-blue-400'>
                        #{booking.bookingId}
                      </p>
                      <p className='text-xs text-gray-500'>
                        {booking.customer}
                      </p>
                    </div>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${
                        statusClasses[booking.status]
                      }`}
                    >
                      {booking.status}
                    </span>
                  </div>

                  {/* Destination and Dates */}
                  <div className='space-y-1'>
                    <p className='text-sm font-medium text-gray-900 dark:text-gray-100'>
                      {booking.destination}
                    </p>
                    <p className='text-xs text-gray-500'>{booking.dates}</p>
                  </div>

                  {/* Payment Info */}
                  <div className='flex items-center justify-between'>
                    <div>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${
                          paymentClasses[booking.payment]
                        }`}
                      >
                        {booking.payment}
                      </span>
                      <p className='text-xs text-gray-500 mt-1'>
                        ${booking.paid.toLocaleString()} / $
                        {booking.total.toLocaleString()}
                      </p>
                    </div>
                    <p className='text-xs text-gray-600 dark:text-gray-300'>
                      {booking.documentsReady}/{booking.documentsTotal} docs
                    </p>
                  </div>

                  {/*   */}
                  <div className='flex justify-end gap-2 pt-2'>
                    <button
                      className='p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors'
                      onClick={() => navigate(`/bookings/${booking.id}`)}
                      title='View'
                    >
                      <FaEye className='text-sm' />
                    </button>
                    <button
                      className='p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors'
                      title='Invoice'
                    >
                      <FaFileInvoiceDollar className='text-sm' />
                    </button>
                    <button
                      onClick={cancelBooking}
                      className='p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors'
                      title='Send'
                    >
                      <FaPaperPlane className='text-sm' />
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
                      Booking ID
                    </th>
                    <th className='px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500'>
                      Customer
                    </th>
                    <th className='px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500'>
                      Dates
                    </th>
                    <th className='px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500'>
                      Status
                    </th>
                    <th className='px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500'>
                      Payment
                    </th>
                    <th className='px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500'>
                      Docs
                    </th>
                    <th className='px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500'>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-gray-100 dark:divide-gray-800'>
                  {rows.map(booking => (
                    <tr
                      key={booking.id}
                      className='group transition-all duration-200 hover:bg-blue-50/30 dark:hover:bg-gray-800/40'
                    >
                      <td className='px-5 py-4 text-sm font-medium text-blue-600 dark:text-blue-300'>
                        #{booking.bookingId}
                      </td>
                      <td className='px-5 py-4'>
                        <p className='text-sm font-medium text-gray-900 dark:text-gray-100'>
                          {booking.customer}
                        </p>
                        <p className='text-xs text-gray-500'>
                          {booking.destination}
                        </p>
                      </td>
                      <td className='px-5 py-4 text-sm text-gray-700 dark:text-gray-200'>
                        {booking.dates}
                      </td>
                      <td className='px-5 py-4'>
                        <span
                          className={`rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${
                            statusClasses[booking.status]
                          }`}
                        >
                          {booking.status}
                        </span>
                      </td>
                      <td className='px-5 py-4'>
                        <div className="flex items-center gap-2">
                          <span
                          className={`rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${
                            paymentClasses[booking.payment]
                          }`}
                        >
                            {booking.payment}
                          </span>
                          {booking.payment === 'partial' || booking.payment === 'unpaid' ? (
                            <button 
                              onClick={() => handleRecordPayment(booking.id)}
                              className="text-xs text-blue-600 hover:text-blue-800 underline"
                              title="Record Payment"
                            >
                              +Pay
                            </button>
                          ) : null}
                        </div>
                        <p className='mt-1 text-xs text-gray-500'>
                          ${booking.paid.toLocaleString()} / $
                          {booking.total.toLocaleString()}
                        </p>
                        <div className="mt-1 w-full bg-gray-200 rounded-full h-1.5">
                          <div 
                            className="bg-green-600 h-1.5 rounded-full" 
                            style={{ width: `${(booking.paid / booking.total) * 100}%` }}
                          ></div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs ${booking.documentsReady === booking.documentsTotal ? 'text-green-600' : 'text-amber-600'}`}>
                            {booking.documentsReady}/{booking.documentsTotal} ready
                          </span>
                          <button 
                            onClick={() => navigate(`/bookings/${booking.id}/documents`)}
                            className="text-xs text-blue-600 hover:text-blue-800 underline"
                            title="View Documents"
                          >
                            View
                          </button>
                        </div>
                        {booking.documentsReady < booking.documentsTotal && (
                          <p className="text-xs text-red-500 mt-1">Missing {booking.documentsTotal - booking.documentsReady} docs</p>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-1 transition-all duration-200">
                          <button
                            className='rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800'
                            onClick={() => navigate(`/bookings/${booking.id}`)}
                            title="View Details"
                          >
                            <FaEye />
                          </button>
                          <button 
                            onClick={() => handleGenerateInvoice(booking.id)}
                            disabled={loading}
                            className="rounded-lg border border-gray-200 p-2 text-blue-600 hover:bg-blue-50 dark:border-gray-700 dark:hover:bg-blue-900/20 disabled:opacity-50"
                            title="Generate Invoice"
                          >
                            <FaFileInvoiceDollar />
                          </button>
                          <button 
                            onClick={() => handleSendConfirmation(booking.id)}
                            disabled={loading}
                            className="rounded-lg border border-gray-200 p-2 text-green-600 hover:bg-green-50 dark:border-gray-700 dark:hover:bg-green-900/20 disabled:opacity-50"
                            title="Send Confirmation"
                          >
                            <FaPaperPlane />
                          </button>
                          <div className="relative group">
                            <button className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">
                              <FaEnvelope />
                            </button>
                            <div className="absolute right-0 top-full mt-1 hidden group-hover:block bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10 min-w-[120px]">
                              <button 
                                onClick={() => navigate(`/bookings/${booking.id}/documents`)}
                                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 w-full text-left"
                              >
                                <FaEnvelope /> Documents
                              </button>
                              <button 
                                onClick={() => navigate(`/bookings/${booking.id}/payments`)}
                                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 w-full text-left"
                              >
                                <FaMoneyBillWave /> Payments
                              </button>
                              <button 
                                onClick={cancelBooking}
                                className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 w-full text-left"
                              >
                                Cancel Booking
                              </button>
                            </div>
                          </div>
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
    </div>
  )
}

export default BookingsPage
