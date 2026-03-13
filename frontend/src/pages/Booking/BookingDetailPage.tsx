import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

// Types based on specifications
interface Booking {
  id: string
  bookingNumber: string
  quotationId: string
  travelStart: string
  travelEnd: string
  totalAmount: number
  costAmount: number
  profit: number
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED'
  paymentStatus: 'PENDING' | 'PARTIAL' | 'COMPLETED' | 'REFUNDED'
  advanceRequired: number
  advanceReceived: number
  clientCurrency: string
  supplierCurrency: string
  cancellationReason?: string
}

interface Invoice {
  id: string
  invoiceNumber: string
  amount: number
  status: 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE'
  dueDate: string
  createdAt: string
}

interface StatusHistory {
  id: string
  status: string
  changedBy: string
  changedAt: string
  reason?: string
}

const BookingDetailPage: React.FC = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('overview')
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancellationReason, setCancellationReason] = useState('')
  const [cancelError, setCancelError] = useState('')

  // Mock data - replace with API calls
  const [booking, setBooking] = useState<Booking>({
    id: id || 'BKG-001',
    bookingNumber: 'BKG-2023-001',
    quotationId: 'Q-2023-001',
    travelStart: '2023-12-15',
    travelEnd: '2023-12-22',
    totalAmount: 7500,
    costAmount: 5200,
    profit: 2300,
    status: 'CONFIRMED',
    paymentStatus: 'PARTIAL',
    advanceRequired: 3000,
    advanceReceived: 1500,
    clientCurrency: 'USD',
    supplierCurrency: 'USD'
  })

  const [invoices, setInvoices] = useState<Invoice[]>([
    {
      id: 'INV-001',
      invoiceNumber: 'INV-2023-001',
      amount: 3000,
      status: 'SENT',
      dueDate: '2023-11-30',
      createdAt: '2023-11-15'
    },
    {
      id: 'INV-002',
      invoiceNumber: 'INV-2023-002',
      amount: 4500,
      status: 'DRAFT',
      dueDate: '2023-12-15',
      createdAt: '2023-11-20'
    }
  ])

  const [history, setHistory] = useState<StatusHistory[]>([
    {
      id: '1',
      status: 'CREATED',
      changedBy: 'John Smith',
      changedAt: '2023-11-15T10:30:00Z'
    },
    {
      id: '2',
      status: 'CONFIRMED',
      changedBy: 'Sarah Johnson',
      changedAt: '2023-11-16T14:20:00Z'
    }
  ])

  useEffect(() => {
    // Simulate API call
    setTimeout(() => setLoading(false), 1000)
  }, [id])

  const tabs = [
    { id: 'overview', label: 'Overview', icon: 'fa-solid fa-table-columns' },
    {
      id: 'invoices',
      label: 'Invoices',
      icon: 'fa-solid fa-file-invoice',
      badge: invoices.length
    },
    { id: 'history', label: 'History', icon: 'fa-solid fa-clock-rotate-left' },
    { id: 'payments', label: 'Payments', icon: 'fa-solid fa-credit-card' }
  ]

  const handleStatusChange = async (
    newStatus: 'PENDING' | 'CONFIRMED' | 'CANCELLED'
  ) => {
    if (newStatus === 'CANCELLED') {
      setShowCancelModal(true)
      return
    }

    try {
      setLoading(true)
      // API call: POST /api/bookings/:id/status
      await new Promise(resolve => setTimeout(resolve, 500))

      setBooking(prev => ({ ...prev, status: newStatus }))

      // Add to history
      const newHistory: StatusHistory = {
        id: Date.now().toString(),
        status: newStatus,
        changedBy: 'Current User',
        changedAt: new Date().toISOString()
      }
      setHistory(prev => [newHistory, ...prev])

      setError('')
    } catch (err) {
      setError('Failed to update booking status')
    } finally {
      setLoading(false)
    }
  }

  const handleCancelConfirm = async () => {
    if (!cancellationReason.trim()) {
      setCancelError('Cancellation reason is required')
      return
    }

    try {
      setLoading(true)
      // API call: POST /api/bookings/:id/status with reason
      await new Promise(resolve => setTimeout(resolve, 500))

      setBooking(prev => ({ ...prev, status: 'CANCELLED', cancellationReason }))

      // Add to history
      const newHistory: StatusHistory = {
        id: Date.now().toString(),
        status: 'CANCELLED',
        changedBy: 'Current User',
        changedAt: new Date().toISOString(),
        reason: cancellationReason
      }
      setHistory(prev => [newHistory, ...prev])

      setShowCancelModal(false)
      setCancellationReason('')
      setCancelError('')
    } catch (err) {
      setError('Failed to cancel booking')
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateInvoice = async () => {
    try {
      setLoading(true)
      // API call: POST /api/bookings/:id/invoices/generate
      await new Promise(resolve => setTimeout(resolve, 500))

      const newInvoice: Invoice = {
        id: `INV-${Date.now()}`,
        invoiceNumber: `INV-2023-${String(invoices.length + 1).padStart(
          3,
          '0'
        )}`,
        amount: booking.totalAmount - booking.advanceReceived,
        status: 'DRAFT',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
        createdAt: new Date().toISOString().split('T')[0]
      }

      setInvoices(prev => [...prev, newInvoice])
    } catch (err) {
      setError('Failed to generate invoice')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'CANCELLED':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'PARTIAL':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'REFUNDED':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getInvoiceStatusColor = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'SENT':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'DRAFT':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      case 'OVERDUE':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency
    }).format(amount)
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatDateTime = (dateTime: string) => {
    return new Date(dateTime).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading && !booking) {
    return (
      <main className='flex-1 overflow-y-auto bg-gray-50'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8'>
          <div className='animate-pulse space-y-6'>
            <div className='h-8 bg-gray-200 rounded w-1/4'></div>
            <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
              <div className='lg:col-span-2 space-y-4'>
                <div className='h-64 bg-gray-200 rounded-xl'></div>
                <div className='h-48 bg-gray-200 rounded-xl'></div>
              </div>
              <div className='space-y-4'>
                <div className='h-40 bg-gray-200 rounded-xl'></div>
                <div className='h-32 bg-gray-200 rounded-xl'></div>
              </div>
            </div>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className='flex-1 overflow-y-auto bg-gray-50'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8'>
        {/* Mobile Header with Menu Toggle */}
        <div className='lg:hidden flex items-center justify-between mb-4'>
          <div>
            <p className='text-xs text-gray-500'>Booking</p>
            <h1 className='text-lg font-bold text-gray-900'>
              #{booking.bookingNumber}
            </h1>
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className='p-2 rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
          >
            <i
              className={`fa-solid ${
                isMobileMenuOpen ? 'fa-xmark' : 'fa-ellipsis-vertical'
              }`}
            ></i>
          </button>
        </div>

        {/* Desktop Header */}
        <div className='hidden lg:flex items-center justify-between mb-6'>
          <div>
            <p className='text-sm text-gray-500 mb-1'>Booking</p>
            <div className='flex items-center gap-3'>
              <h1 className='text-2xl font-bold text-gray-900'>
                #{booking.bookingNumber}
              </h1>
              <span
                className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full border ${getStatusColor(
                  booking.status
                )}`}
              >
                {booking.status}
              </span>
            </div>
            <div className='flex items-center gap-4 text-sm text-gray-500 mt-1.5'>
              <span className='flex items-center gap-1.5'>
                <i className='fa-regular fa-file-lines w-4'></i>
                Quote: #{booking.quotationId}
              </span>
              <span className='flex items-center gap-1.5'>
                <i className='fa-regular fa-calendar w-4'></i>
                {formatDate(booking.travelStart)} -{' '}
                {formatDate(booking.travelEnd)}
              </span>
            </div>
          </div>
        </div>

        {/* Mobile Actions Menu */}
        {isMobileMenuOpen && (
          <div className='lg:hidden mb-4 bg-white rounded-xl shadow-lg border border-gray-200 p-2 animate-fadeIn'>
            <div className='grid grid-cols-2 gap-1'>
              <button
                onClick={handleGenerateInvoice}
                className='flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50'
              >
                <i className='fa-solid fa-file-invoice text-gray-400'></i>
                <span>Generate Invoice</span>
              </button>
              <button
                onClick={() => navigate(`/bookings/${id}/edit`)}
                className='flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700'
              >
                <i className='fa-solid fa-pen-to-square'></i>
                <span>Update</span>
              </button>
            </div>
          </div>
        )}

        {/* Desktop Actions */}
        <div className='hidden lg:flex flex-wrap items-center gap-2 mb-6'>
          <button
            onClick={handleGenerateInvoice}
            className='px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-all flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300'
          >
            <i className='fa-solid fa-file-invoice text-gray-400'></i>
            Generate Invoice
          </button>
          <button
            onClick={() => navigate(`/bookings/${id}/edit`)}
            className='px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-all flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-blue-100'
          >
            <i className='fa-solid fa-pen-to-square'></i>
            Update Booking
          </button>
        </div>

        {error && (
          <div className='mb-4 p-3 bg-red-50 border border-red-200 rounded-lg'>
            <p className='text-sm text-red-600 flex items-center gap-2'>
              <i className='fa-solid fa-circle-exclamation'></i>
              {error}
            </p>
          </div>
        )}

        {/* Split Layout - Fixed Alignment */}
        <div className='grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6'>
          {/* Left Column: Main Content */}
          <div className='lg:col-span-2'>
            {/* Tabs Navigation - Mobile Dropdown */}
            <div className='lg:hidden mb-4'>
              <select
                className='w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                value={activeTab}
                onChange={e => setActiveTab(e.target.value)}
              >
                {tabs.map(tab => (
                  <option key={tab.id} value={tab.id}>
                    {tab.label} {tab.badge ? `(${tab.badge})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Main Content Card with Tabs */}
            <div className='bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden'>
              {/* Tabs Navigation - Desktop */}
              <div className='hidden lg:block border-b border-gray-200'>
                <nav className='-mb-px flex' aria-label='Tabs'>
                  {tabs.map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex-1 py-4 px-4 text-center border-b-2 font-medium text-sm flex items-center justify-center gap-2 transition-colors ${
                        activeTab === tab.id
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <i className={tab.icon}></i>
                      <span>{tab.label}</span>
                      {tab.badge && (
                        <span className='bg-red-100 text-red-600 py-0.5 px-2 rounded-full text-xs ml-1'>
                          {tab.badge}
                        </span>
                      )}
                    </button>
                  ))}
                </nav>
              </div>

              {/* Tab Content */}
              <div className='p-5'>
                {activeTab === 'overview' && (
                  <div className='space-y-6'>
                    {/* Booking Info */}
                    <div>
                      <h3 className='text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2'>
                        <i className='fa-solid fa-circle-info text-blue-500'></i>
                        Booking Information
                      </h3>
                      <div className='grid grid-cols-2 md:grid-cols-3 gap-4'>
                        <div className='bg-gray-50 p-3 rounded-lg border border-gray-100'>
                          <p className='text-xs text-gray-500 mb-1'>
                            Total Amount
                          </p>
                          <p className='text-lg font-bold text-gray-900'>
                            {formatCurrency(
                              booking.totalAmount,
                              booking.clientCurrency
                            )}
                          </p>
                        </div>
                        <div className='bg-gray-50 p-3 rounded-lg border border-gray-100'>
                          <p className='text-xs text-gray-500 mb-1'>
                            Cost Amount
                          </p>
                          <p className='text-lg font-bold text-gray-900'>
                            {formatCurrency(
                              booking.costAmount,
                              booking.supplierCurrency
                            )}
                          </p>
                        </div>
                        <div className='bg-gray-50 p-3 rounded-lg border border-gray-100'>
                          <p className='text-xs text-gray-500 mb-1'>Profit</p>
                          <p className='text-lg font-bold text-green-600'>
                            {formatCurrency(
                              booking.profit,
                              booking.clientCurrency
                            )}
                          </p>
                        </div>
                        <div className='bg-gray-50 p-3 rounded-lg border border-gray-100'>
                          <p className='text-xs text-gray-500 mb-1'>
                            Travel Dates
                          </p>
                          <p className='text-sm font-medium text-gray-900'>
                            {formatDate(booking.travelStart)} -{' '}
                            {formatDate(booking.travelEnd)}
                          </p>
                        </div>
                        <div className='bg-gray-50 p-3 rounded-lg border border-gray-100'>
                          <p className='text-xs text-gray-500 mb-1'>
                            Client Currency
                          </p>
                          <p className='text-sm font-medium text-gray-900'>
                            {booking.clientCurrency}
                          </p>
                        </div>
                        <div className='bg-gray-50 p-3 rounded-lg border border-gray-100'>
                          <p className='text-xs text-gray-500 mb-1'>
                            Supplier Currency
                          </p>
                          <p className='text-sm font-medium text-gray-900'>
                            {booking.supplierCurrency}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Invoice Panel */}
                    <div>
                      <div className='flex justify-between items-center mb-4'>
                        <h3 className='text-sm font-semibold text-gray-900 flex items-center gap-2'>
                          <i className='fa-solid fa-file-invoice text-blue-500'></i>
                          Recent Invoices
                        </h3>
                        <button
                          onClick={handleGenerateInvoice}
                          className='text-blue-600 hover:text-blue-700 text-xs font-medium px-2 py-1 rounded hover:bg-blue-50 transition-colors flex items-center gap-1'
                        >
                          <i className='fa-solid fa-plus'></i>
                          Generate New
                        </button>
                      </div>

                      <div className='space-y-2'>
                        {invoices.slice(0, 2).map(invoice => (
                          <div
                            key={invoice.id}
                            className='flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors'
                          >
                            <div className='flex items-center gap-3'>
                              <div className='w-8 h-8 rounded bg-blue-50 flex items-center justify-center text-blue-500'>
                                <i className='fa-regular fa-file-pdf'></i>
                              </div>
                              <div>
                                <p className='text-sm font-medium text-gray-900'>
                                  {invoice.invoiceNumber}
                                </p>
                                <p className='text-xs text-gray-500'>
                                  {formatCurrency(invoice.amount)} • Due{' '}
                                  {formatDate(invoice.dueDate)}
                                </p>
                              </div>
                            </div>
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium border ${getInvoiceStatusColor(
                                invoice.status
                              )}`}
                            >
                              {invoice.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* History Timeline */}
                    <div>
                      <h3 className='text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2'>
                        <i className='fa-regular fa-clock text-blue-500'></i>
                        Recent History
                      </h3>

                      <div className='relative pl-4 space-y-4'>
                        {history.slice(0, 3).map((item, idx) => (
                          <div key={item.id} className='relative pl-8'>
                            <div className='absolute left-0 top-1 w-6 h-6 rounded-full bg-gray-100 border-2 border-white shadow-sm flex items-center justify-center'>
                              <i className='fa-solid fa-rotate text-gray-600 text-xs'></i>
                            </div>
                            <div>
                              <p className='text-sm font-medium text-gray-900'>
                                Status changed to {item.status}
                                {item.reason && (
                                  <span className='text-gray-500'>
                                    {' '}
                                    - {item.reason}
                                  </span>
                                )}
                              </p>
                              <p className='text-xs text-gray-500'>
                                {item.changedBy} •{' '}
                                {formatDateTime(item.changedAt)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'invoices' && (
                  <div className='space-y-4'>
                    <div className='flex justify-between items-center'>
                      <h3 className='text-sm font-semibold text-gray-900'>
                        All Invoices
                      </h3>
                      <button
                        onClick={handleGenerateInvoice}
                        className='text-blue-600 hover:text-blue-700 text-xs font-medium px-2 py-1 rounded hover:bg-blue-50 transition-colors flex items-center gap-1'
                      >
                        <i className='fa-solid fa-plus'></i>
                        Generate New
                      </button>
                    </div>

                    <div className='space-y-2'>
                      {invoices.map(invoice => (
                        <div
                          key={invoice.id}
                          className='flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors'
                        >
                          <div className='flex items-center gap-3 flex-1'>
                            <div className='w-10 h-10 rounded bg-blue-50 flex items-center justify-center text-blue-500'>
                              <i className='fa-regular fa-file-pdf text-lg'></i>
                            </div>
                            <div className='flex-1'>
                              <div className='flex items-center gap-2'>
                                <p className='text-sm font-medium text-gray-900'>
                                  {invoice.invoiceNumber}
                                </p>
                                <span
                                  className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getInvoiceStatusColor(
                                    invoice.status
                                  )}`}
                                >
                                  {invoice.status}
                                </span>
                              </div>
                              <p className='text-xs text-gray-500'>
                                {formatCurrency(invoice.amount)} • Created{' '}
                                {formatDate(invoice.createdAt)} • Due{' '}
                                {formatDate(invoice.dueDate)}
                              </p>
                            </div>
                          </div>
                          <div className='flex items-center gap-2'>
                            <button className='p-2 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100'>
                              <i className='fa-solid fa-download'></i>
                            </button>
                            <button className='p-2 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100'>
                              <i className='fa-regular fa-pen-to-square'></i>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'history' && (
                  <div className='space-y-4'>
                    <h3 className='text-sm font-semibold text-gray-900'>
                      Status History
                    </h3>

                    <div className='relative pl-4 space-y-6'>
                      {history.map(item => (
                        <div key={item.id} className='relative pl-8'>
                          <div className='absolute left-0 top-1 w-6 h-6 rounded-full bg-gray-100 border-2 border-white shadow-sm flex items-center justify-center'>
                            <i className='fa-solid fa-rotate text-gray-600 text-xs'></i>
                          </div>
                          <div>
                            <p className='text-sm font-medium text-gray-900'>
                              Status changed to {item.status}
                              {item.reason && (
                                <span className='block text-sm text-gray-600 mt-1'>
                                  Reason: {item.reason}
                                </span>
                              )}
                            </p>
                            <p className='text-xs text-gray-500 mt-1'>
                              {item.changedBy} •{' '}
                              {formatDateTime(item.changedAt)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'payments' && (
                  <div className='space-y-4'>
                    <h3 className='text-sm font-semibold text-gray-900'>
                      Payment Details
                    </h3>

                    <div className='grid grid-cols-2 gap-4 mb-4'>
                      <div className='bg-gray-50 p-4 rounded-lg border border-gray-200'>
                        <p className='text-xs text-gray-500 mb-1'>
                          Advance Required
                        </p>
                        <p className='text-xl font-bold text-gray-900'>
                          {formatCurrency(
                            booking.advanceRequired,
                            booking.clientCurrency
                          )}
                        </p>
                      </div>
                      <div className='bg-gray-50 p-4 rounded-lg border border-gray-200'>
                        <p className='text-xs text-gray-500 mb-1'>
                          Advance Received
                        </p>
                        <p className='text-xl font-bold text-green-600'>
                          {formatCurrency(
                            booking.advanceReceived,
                            booking.clientCurrency
                          )}
                        </p>
                      </div>
                    </div>

                    <div className='bg-blue-50 p-4 rounded-lg border border-blue-200'>
                      <div className='flex justify-between items-center'>
                        <div>
                          <p className='text-sm font-medium text-blue-900'>
                            Payment Status
                          </p>
                          <p className='text-xs text-blue-700'>
                            Remaining:{' '}
                            {formatCurrency(
                              booking.advanceRequired - booking.advanceReceived,
                              booking.clientCurrency
                            )}
                          </p>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium border ${getPaymentStatusColor(
                            booking.paymentStatus
                          )}`}
                        >
                          {booking.paymentStatus}
                        </span>
                      </div>
                      <div className='mt-3 w-full bg-blue-200 rounded-full h-2'>
                        <div
                          className='bg-blue-600 h-2 rounded-full transition-all'
                          style={{
                            width: `${
                              (booking.advanceReceived /
                                booking.advanceRequired) *
                              100
                            }%`
                          }}
                        ></div>
                      </div>
                    </div>

                    <button
                      onClick={() =>
                        navigate('/payments', {
                          state: { bookingId: booking.id }
                        })
                      }
                      className='w-full py-2.5 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors'
                    >
                      View All Payments
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Sidebar - Fixed to align with left column's first card */}
          <div className='lg:col-span-1'>
            <div className='space-y-4 lg:space-y-6'>
              {/* Status Controls Card */}
              <div className='bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden'>
                <div className='px-4 sm:px-5 py-3 sm:py-4 border-b border-gray-100 bg-gray-50/80'>
                  <h3 className='text-xs sm:text-sm font-semibold text-gray-900 uppercase tracking-wide flex items-center gap-2'>
                    <i className='fa-solid fa-toggle-on text-blue-500'></i>
                    Status Controls
                  </h3>
                </div>
                <div className='p-4 sm:p-5 space-y-3'>
                  <button
                    onClick={() => handleStatusChange('PENDING')}
                    disabled={booking.status === 'PENDING'}
                    className={`w-full py-2.5 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                      booking.status === 'PENDING'
                        ? 'bg-yellow-100 text-yellow-700 border border-yellow-200 cursor-default'
                        : 'bg-white hover:bg-yellow-50 text-gray-700 border border-gray-300 hover:border-yellow-300'
                    }`}
                  >
                    <i className='fa-regular fa-clock'></i>
                    Pending
                  </button>

                  <button
                    onClick={() => handleStatusChange('CONFIRMED')}
                    disabled={booking.status === 'CONFIRMED'}
                    className={`w-full py-2.5 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                      booking.status === 'CONFIRMED'
                        ? 'bg-green-100 text-green-700 border border-green-200 cursor-default'
                        : 'bg-white hover:bg-green-50 text-gray-700 border border-gray-300 hover:border-green-300'
                    }`}
                  >
                    <i className='fa-solid fa-check-circle'></i>
                    Confirmed
                  </button>

                  <button
                    onClick={() => handleStatusChange('CANCELLED')}
                    disabled={booking.status === 'CANCELLED'}
                    className={`w-full py-2.5 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                      booking.status === 'CANCELLED'
                        ? 'bg-red-100 text-red-700 border border-red-200 cursor-default'
                        : 'bg-white hover:bg-red-50 text-gray-700 border border-gray-300 hover:border-red-300'
                    }`}
                  >
                    <i className='fa-solid fa-ban'></i>
                    Cancelled
                  </button>

                  <p className='text-xs text-gray-500 mt-2 flex items-center gap-1'>
                    <i className='fa-solid fa-info-circle'></i>
                    Cancellation requires a reason
                  </p>
                </div>
              </div>

              {/* Payment Snapshot Card */}
              <div className='bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden'>
                <div className='px-4 sm:px-5 py-3 sm:py-4 border-b border-gray-100 bg-gray-50/80'>
                  <h3 className='text-xs sm:text-sm font-semibold text-gray-900 uppercase tracking-wide flex items-center gap-2'>
                    <i className='fa-solid fa-credit-card text-blue-500'></i>
                    Payment Snapshot
                  </h3>
                </div>
                <div className='p-4 sm:p-5 space-y-4'>
                  <div className='flex justify-between items-center'>
                    <span className='text-sm text-gray-600'>
                      Advance Required
                    </span>
                    <span className='text-sm font-semibold text-gray-900'>
                      {formatCurrency(
                        booking.advanceRequired,
                        booking.clientCurrency
                      )}
                    </span>
                  </div>
                  <div className='flex justify-between items-center'>
                    <span className='text-sm text-gray-600'>
                      Advance Received
                    </span>
                    <span className='text-sm font-semibold text-green-600'>
                      {formatCurrency(
                        booking.advanceReceived,
                        booking.clientCurrency
                      )}
                    </span>
                  </div>
                  <div className='flex justify-between items-center pt-3 border-t border-gray-100'>
                    <span className='text-sm text-gray-600'>Balance</span>
                    <span className='text-sm font-bold text-gray-900'>
                      {formatCurrency(
                        booking.advanceRequired - booking.advanceReceived,
                        booking.clientCurrency
                      )}
                    </span>
                  </div>

                  <div className='mt-2'>
                    <div className='flex justify-between items-center mb-1'>
                      <span className='text-xs text-gray-500'>
                        Payment Progress
                      </span>
                      <span className='text-xs font-medium text-gray-700'>
                        {Math.round(
                          (booking.advanceReceived / booking.advanceRequired) *
                            100
                        )}
                        %
                      </span>
                    </div>
                    <div className='w-full bg-gray-200 rounded-full h-2'>
                      <div
                        className='bg-blue-600 h-2 rounded-full transition-all'
                        style={{
                          width: `${
                            (booking.advanceReceived /
                              booking.advanceRequired) *
                            100
                          }%`
                        }}
                      ></div>
                    </div>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${getPaymentStatusColor(
                      booking.paymentStatus
                    )}`}
                  >
                    <i className='fa-regular fa-circle-check'></i>
                    Status: {booking.paymentStatus}
                  </span>
                </div>
              </div>

              {/* Quick Links Card */}
              <div className='bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden'>
                <div className='px-4 sm:px-5 py-3 sm:py-4 border-b border-gray-100 bg-gray-50/80'>
                  <h3 className='text-xs sm:text-sm font-semibold text-gray-900 uppercase tracking-wide flex items-center gap-2'>
                    <i className='fa-solid fa-link text-blue-500'></i>
                    Quick Links
                  </h3>
                </div>
                <div className='p-4 sm:p-5 space-y-2'>
                  <button
                    onClick={() =>
                      navigate(`/quotations/${booking.quotationId}`)
                    }
                    className='w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors flex items-center gap-2'
                  >
                    <i className='fa-regular fa-file-lines text-gray-400'></i>
                    View Quotation #{booking.quotationId}
                  </button>
                  <button
                    onClick={() =>
                      navigate(`/payments?bookingId=${booking.id}`)
                    }
                    className='w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors flex items-center gap-2'
                  >
                    <i className='fa-solid fa-credit-card text-gray-400'></i>
                    View All Payments
                  </button>
                  <button
                    onClick={() =>
                      navigate(`/invoices?bookingId=${booking.id}`)
                    }
                    className='w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors flex items-center gap-2'
                  >
                    <i className='fa-regular fa-file-pdf text-gray-400'></i>
                    View All Invoices
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cancellation Modal */}
      {showCancelModal && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'>
          <div className='bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-fadeIn'>
            <div className='flex items-center justify-between mb-4'>
              <h3 className='text-lg font-semibold text-gray-900'>
                Cancel Booking
              </h3>
              <button
                onClick={() => setShowCancelModal(false)}
                className='text-gray-400 hover:text-gray-600'
              >
                <i className='fa-solid fa-xmark text-xl'></i>
              </button>
            </div>

            <p className='text-sm text-gray-600 mb-4'>
              Please provide a reason for cancelling this booking. This is
              required.
            </p>

            <textarea
              value={cancellationReason}
              onChange={e => {
                setCancellationReason(e.target.value)
                setCancelError('')
              }}
              rows={4}
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                cancelError ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder='Enter cancellation reason...'
            ></textarea>

            {cancelError && (
              <p className='mt-2 text-sm text-red-600 flex items-center gap-1'>
                <i className='fa-solid fa-circle-exclamation'></i>
                {cancelError}
              </p>
            )}

            <div className='flex justify-end gap-3 mt-6'>
              <button
                onClick={() => setShowCancelModal(false)}
                className='px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors'
              >
                Cancel
              </button>
              <button
                onClick={handleCancelConfirm}
                disabled={loading}
                className='px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2'
              >
                {loading ? (
                  <>
                    <i className='fa-solid fa-spinner fa-spin'></i>
                    Processing...
                  </>
                ) : (
                  'Confirm Cancellation'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add custom animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
      `}</style>
    </main>
  )
}

export default BookingDetailPage
