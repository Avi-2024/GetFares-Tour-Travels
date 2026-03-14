import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  FaArrowLeft,
  FaFileInvoice,
  FaCreditCard,
  FaBan,
  FaClock,
  FaClockRotateLeft,
  FaDownload,
  FaEye,
  FaPlus,
  FaXmark,
  FaCircleCheck,
  FaCircleExclamation,
  FaPrint
} from 'react-icons/fa6'

// Types
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
  cancelledAt?: string
  cancelledBy?: string
}

interface Invoice {
  id: string
  invoiceNumber: string
  amount: number
  status: 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED'
  dueDate: string
  createdAt: string
  paidAt?: string
  paidAmount?: number
  pdfUrl?: string
  notes?: string
}

interface StatusHistory {
  id: string
  status: string
  changedBy: string
  changedAt: string
  reason?: string
  type:
    | 'status_change'
    | 'invoice_generated'
    | 'payment_received'
    | 'cancellation'
}

interface Payment {
  id: string
  amount: number
  date: string
  mode: 'cash' | 'card' | 'bank'
  reference: string
  status: 'pending' | 'completed' | 'failed'
}

// Toast Component
const Toast = ({
  message,
  type,
  onClose
}: {
  message: string
  type: 'success' | 'error' | 'info'
  onClose: () => void
}) => (
  <div className='fixed top-4 left-1/2 transform -translate-x-1/2 z-50 animate-fadeIn'>
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border ${
        type === 'success'
          ? 'bg-green-50 border-green-200 dark:bg-green-900/30 dark:border-green-800'
          : type === 'error'
          ? 'bg-red-50 border-red-200 dark:bg-red-900/30 dark:border-red-800'
          : 'bg-blue-50 border-blue-200 dark:bg-blue-900/30 dark:border-blue-800'
      }`}
    >
      {type === 'success' ? (
        <FaCircleCheck className='text-green-600 dark:text-green-400' />
      ) : type === 'error' ? (
        <FaCircleExclamation className='text-red-600 dark:text-red-400' />
      ) : (
        <FaClock className='text-blue-600 dark:text-blue-400' />
      )}
      <p
        className={`text-sm font-medium ${
          type === 'success'
            ? 'text-green-800 dark:text-green-300'
            : type === 'error'
            ? 'text-red-800 dark:text-red-300'
            : 'text-blue-800 dark:text-blue-300'
        }`}
      >
        {message}
      </p>
    </div>
  </div>
)

// Invoice Details Modal
const InvoiceDetailsModal = ({
  isOpen,
  invoice,
  onClose,
  onDownload,
  onMarkAsPaid
}: {
  isOpen: boolean
  invoice: Invoice | null
  onClose: () => void
  onDownload: () => void
  onMarkAsPaid: () => void
}) => {
  if (!isOpen || !invoice) return null

  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'>
      <div className='bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto'>
        <div className='sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 p-4 flex items-center justify-between'>
          <h3 className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
            Invoice Details
          </h3>
          <button
            onClick={onClose}
            className='text-gray-400 hover:text-gray-600'
          >
            <FaXmark className='text-xl' />
          </button>
        </div>

        <div className='p-6 space-y-6'>
          <div className='flex items-center justify-between'>
            <div>
              <p className='text-sm text-gray-500'>Invoice Number</p>
              <p className='text-xl font-bold text-gray-900'>
                {invoice.invoiceNumber}
              </p>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                invoice.status === 'PAID'
                  ? 'bg-green-100 text-green-800 border-green-200'
                  : invoice.status === 'SENT'
                  ? 'bg-blue-100 text-blue-800 border-blue-200'
                  : invoice.status === 'OVERDUE'
                  ? 'bg-red-100 text-red-800 border-red-200'
                  : 'bg-gray-100 text-gray-800 border-gray-200'
              }`}
            >
              {invoice.status}
            </span>
          </div>

          <div className='grid grid-cols-2 gap-4'>
            <div className='p-4 bg-gray-50 rounded-lg'>
              <p className='text-xs text-gray-500'>Amount</p>
              <p className='text-xl font-bold text-gray-900'>
                {new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: 'USD'
                }).format(invoice.amount)}
              </p>
            </div>
            <div className='p-4 bg-gray-50 rounded-lg'>
              <p className='text-xs text-gray-500'>Due Date</p>
              <p className='text-lg font-semibold text-gray-900'>
                {new Date(invoice.dueDate).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div className='space-y-3'>
            <h4 className='text-sm font-medium text-gray-700'>Details</h4>
            <div className='space-y-2'>
              <div className='flex justify-between py-2 border-b border-gray-100'>
                <span className='text-sm text-gray-500'>Created At</span>
                <span className='text-sm font-medium text-gray-900'>
                  {new Date(invoice.createdAt).toLocaleString()}
                </span>
              </div>
              {invoice.paidAt && (
                <div className='flex justify-between py-2 border-b border-gray-100'>
                  <span className='text-sm text-gray-500'>Paid At</span>
                  <span className='text-sm font-medium text-gray-900'>
                    {new Date(invoice.paidAt).toLocaleString()}
                  </span>
                </div>
              )}
              {invoice.notes && (
                <div className='py-2'>
                  <span className='text-sm text-gray-500 block mb-1'>
                    Notes
                  </span>
                  <p className='text-sm text-gray-700 bg-gray-50 p-2 rounded'>
                    {invoice.notes}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className='sticky bottom-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 p-4 flex justify-end gap-3'>
          <button
            onClick={onDownload}
            className='px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2'
          >
            <FaDownload /> Download PDF
          </button>
          {invoice.status !== 'PAID' && (
            <button
              onClick={onMarkAsPaid}
              className='px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 flex items-center gap-2'
            >
              <FaCircleCheck /> Mark as Paid
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// Payment Details Modal
const PaymentDetailsModal = ({
  isOpen,
  payments,
  onClose,
  onAddPayment
}: {
  isOpen: boolean
  payments: Payment[]
  onClose: () => void
  onAddPayment: () => void
}) => {
  if (!isOpen) return null

  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'>
      <div className='bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto'>
        <div className='sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 p-4 flex items-center justify-between'>
          <h3 className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
            Payment History
          </h3>
          <button
            onClick={onClose}
            className='text-gray-400 hover:text-gray-600'
          >
            <FaXmark className='text-xl' />
          </button>
        </div>

        <div className='p-6'>
          {payments.length === 0 ? (
            <div className='text-center py-8'>
              <p className='text-gray-500'>No payments recorded yet</p>
            </div>
          ) : (
            <div className='space-y-4'>
              {payments.map(payment => (
                <div
                  key={payment.id}
                  className='flex items-center justify-between p-4 bg-gray-50 rounded-lg'
                >
                  <div>
                    <p className='text-sm font-medium text-gray-900'>
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: 'USD'
                      }).format(payment.amount)}
                    </p>
                    <p className='text-xs text-gray-500'>
                      {new Date(payment.date).toLocaleString()} • {payment.mode}{' '}
                      • Ref: {payment.reference}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      payment.status === 'completed'
                        ? 'bg-green-100 text-green-800'
                        : payment.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {payment.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className='sticky bottom-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 p-4 flex justify-end'>
          <button
            onClick={onAddPayment}
            className='px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 flex items-center gap-2'
          >
            <FaPlus /> Add Payment
          </button>
        </div>
      </div>
    </div>
  )
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
  const [toast, setToast] = useState<{
    show: boolean
    message: string
    type: 'success' | 'error' | 'info'
  }>({
    show: false,
    message: '',
    type: 'success'
  })
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [showInvoiceModal, setShowInvoiceModal] = useState(false)
  const [showPaymentsModal, setShowPaymentsModal] = useState(false)

  // Mock data with payments
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
      createdAt: '2023-11-15',
      pdfUrl: '#'
    },
    {
      id: 'INV-002',
      invoiceNumber: 'INV-2023-002',
      amount: 4500,
      status: 'DRAFT',
      dueDate: '2023-12-15',
      createdAt: '2023-11-20',
      notes: 'Final payment invoice'
    }
  ])

  const [payments, setPayments] = useState<Payment[]>([
    {
      id: 'PAY-001',
      amount: 1000,
      date: '2023-11-20T10:30:00Z',
      mode: 'card',
      reference: 'CARD-1234',
      status: 'completed'
    },
    {
      id: 'PAY-002',
      amount: 500,
      date: '2023-11-25T14:20:00Z',
      mode: 'bank',
      reference: 'NEFT-5678',
      status: 'completed'
    }
  ])

  const [history, setHistory] = useState<StatusHistory[]>([
    {
      id: '1',
      status: 'CREATED',
      changedBy: 'John Smith',
      changedAt: '2023-11-15T10:30:00Z',
      type: 'status_change'
    },
    {
      id: '2',
      status: 'CONFIRMED',
      changedBy: 'Sarah Johnson',
      changedAt: '2023-11-16T14:20:00Z',
      type: 'status_change'
    },
    {
      id: '3',
      status: 'INVOICE_GENERATED',
      changedBy: 'System',
      changedAt: '2023-11-20T09:15:00Z',
      reason: 'Invoice INV-2023-001 generated',
      type: 'invoice_generated'
    },
    {
      id: '4',
      status: 'PAYMENT_RECEIVED',
      changedBy: 'System',
      changedAt: '2023-11-20T10:35:00Z',
      reason: 'Payment of $1,000 received',
      type: 'payment_received'
    }
  ])

  useEffect(() => {
    setTimeout(() => setLoading(false), 1000)
  }, [id])

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToast({ show: true, message, type })
    setTimeout(
      () => setToast({ show: false, message: '', type: 'success' }),
      3000
    )
  }

  const handleStatusChange = async (
    newStatus: 'PENDING' | 'CONFIRMED' | 'CANCELLED'
  ) => {
    if (newStatus === 'CANCELLED') {
      setShowCancelModal(true)
      return
    }

    try {
      setLoading(true)
      await new Promise(resolve => setTimeout(resolve, 500))

      setBooking(prev => ({ ...prev, status: newStatus }))

      const newHistory: StatusHistory = {
        id: Date.now().toString(),
        status: newStatus,
        changedBy: 'Current User',
        changedAt: new Date().toISOString(),
        type: 'status_change'
      }
      setHistory(prev => [newHistory, ...prev])

      showToast(`Booking status updated to ${newStatus}`, 'success')
    } catch (err) {
      showToast('Failed to update booking status', 'error')
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
      await new Promise(resolve => setTimeout(resolve, 500))

      setBooking(prev => ({
        ...prev,
        status: 'CANCELLED',
        cancellationReason,
        cancelledAt: new Date().toISOString(),
        cancelledBy: 'Current User'
      }))

      const newHistory: StatusHistory = {
        id: Date.now().toString(),
        status: 'CANCELLED',
        changedBy: 'Current User',
        changedAt: new Date().toISOString(),
        reason: cancellationReason,
        type: 'cancellation'
      }
      setHistory(prev => [newHistory, ...prev])

      setShowCancelModal(false)
      setCancellationReason('')
      setCancelError('')
      showToast('Booking cancelled successfully', 'success')
    } catch (err) {
      showToast('Failed to cancel booking', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateInvoice = async () => {
    try {
      setLoading(true)
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
      setSelectedInvoice(newInvoice)
      setShowInvoiceModal(true)

      const newHistory: StatusHistory = {
        id: Date.now().toString(),
        status: 'INVOICE_GENERATED',
        changedBy: 'Current User',
        changedAt: new Date().toISOString(),
        reason: `Invoice ${newInvoice.invoiceNumber} generated`,
        type: 'invoice_generated'
      }
      setHistory(prev => [newHistory, ...prev])

      showToast('Invoice generated successfully', 'success')
    } catch (err) {
      showToast('Failed to generate invoice', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleMarkInvoiceAsPaid = (invoiceId: string) => {
    setInvoices(prev =>
      prev.map(inv =>
        inv.id === invoiceId
          ? {
              ...inv,
              status: 'PAID',
              paidAt: new Date().toISOString(),
              paidAmount: inv.amount
            }
          : inv
      )
    )

    const paidAmount = invoices.find(i => i.id === invoiceId)?.amount || 0
    setBooking(prev => ({
      ...prev,
      advanceReceived: prev.advanceReceived + paidAmount,
      paymentStatus:
        prev.advanceReceived + paidAmount >= prev.advanceRequired
          ? 'COMPLETED'
          : 'PARTIAL'
    }))

    const newHistory: StatusHistory = {
      id: Date.now().toString(),
      status: 'PAYMENT_RECEIVED',
      changedBy: 'Current User',
      changedAt: new Date().toISOString(),
      reason: `Payment of $${paidAmount} received for invoice`,
      type: 'payment_received'
    }
    setHistory(prev => [newHistory, ...prev])

    setShowInvoiceModal(false)
    showToast('Invoice marked as paid', 'success')
  }

  const handleAddPayment = () => {
    const newPayment: Payment = {
      id: `PAY-${Date.now()}`,
      amount: 500,
      date: new Date().toISOString(),
      mode: 'cash',
      reference: 'CASH-001',
      status: 'completed'
    }

    setPayments(prev => [...prev, newPayment])
    setBooking(prev => ({
      ...prev,
      advanceReceived: prev.advanceReceived + 500,
      paymentStatus:
        prev.advanceReceived + 500 >= prev.advanceRequired
          ? 'COMPLETED'
          : 'PARTIAL'
    }))

    const newHistory: StatusHistory = {
      id: Date.now().toString(),
      status: 'PAYMENT_RECEIVED',
      changedBy: 'Current User',
      changedAt: new Date().toISOString(),
      reason: 'Manual payment of $500 added',
      type: 'payment_received'
    }
    setHistory(prev => [newHistory, ...prev])

    showToast('Payment added successfully', 'success')
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-900'
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-900'
      case 'CANCELLED':
        return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-900'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'
    }
  }

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-900'
      case 'PARTIAL':
        return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-900'
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-900'
      case 'REFUNDED':
        return 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-900'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'
    }
  }

  const getInvoiceStatusColor = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-900'
      case 'SENT':
        return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-900'
      case 'DRAFT':
        return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'
      case 'OVERDUE':
        return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-900'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'
    }
  }

  const getHistoryIcon = (type: string) => {
    switch (type) {
      case 'status_change':
        return <FaClockRotateLeft className='text-blue-600' />
      case 'invoice_generated':
        return <FaFileInvoice className='text-green-600' />
      case 'payment_received':
        return <FaCreditCard className='text-purple-600' />
      case 'cancellation':
        return <FaBan className='text-red-600' />
      default:
        return <FaClock className='text-gray-600' />
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
      <main className='flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-950'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8'>
          <div className='animate-pulse space-y-6'>
            <div className='h-8 bg-gray-200 dark:bg-gray-800 rounded w-1/4'></div>
            <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
              <div className='lg:col-span-2 space-y-4'>
                <div className='h-64 bg-gray-200 dark:bg-gray-800 rounded-xl'></div>
                <div className='h-48 bg-gray-200 dark:bg-gray-800 rounded-xl'></div>
              </div>
              <div className='space-y-4'>
                <div className='h-40 bg-gray-200 dark:bg-gray-800 rounded-xl'></div>
                <div className='h-32 bg-gray-200 dark:bg-gray-800 rounded-xl'></div>
              </div>
            </div>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className='flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-950'>
      {/* Toast */}
      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() =>
            setToast({ show: false, message: '', type: 'success' })
          }
        />
      )}

      {/* Modals */}
      <InvoiceDetailsModal
        isOpen={showInvoiceModal}
        invoice={selectedInvoice}
        onClose={() => {
          setShowInvoiceModal(false)
          setSelectedInvoice(null)
        }}
        onDownload={() => {
          showToast('Downloading invoice PDF...', 'info')
        }}
        onMarkAsPaid={() => {
          if (selectedInvoice) {
            handleMarkInvoiceAsPaid(selectedInvoice.id)
          }
        }}
      />

      <PaymentDetailsModal
        isOpen={showPaymentsModal}
        payments={payments}
        onClose={() => setShowPaymentsModal(false)}
        onAddPayment={handleAddPayment}
      />

      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8'>
        {/* Header */}
        <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6'>
          <div>
            <p className='text-sm text-gray-500 dark:text-gray-400 mb-1'>
              Booking
            </p>
            <div className='flex items-center gap-3 flex-wrap'>
              <h1 className='text-2xl font-bold text-gray-900 dark:text-gray-100'>
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
            <div className='flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mt-1.5'>
              <span className='flex items-center gap-1.5'>
                <FaFileInvoice className='w-4' />
                Quote: #{booking.quotationId}
              </span>
              <span className='flex items-center gap-1.5'>
                <FaClock className='w-4' />
                {formatDate(booking.travelStart)} -{' '}
                {formatDate(booking.travelEnd)}
              </span>
            </div>
          </div>

          <div className='flex flex-wrap items-center gap-2'>
            <button
              onClick={handleGenerateInvoice}
              className='px-4 py-2 rounded-lg text-sm font-medium bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2'
            >
              <FaFileInvoice /> Generate Invoice
            </button>
            <button
              onClick={() => navigate(`/bookings/${id}/edit`)}
              className='px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors flex items-center gap-2'
            >
              <FaCreditCard /> Update Booking
            </button>
          </div>
        </div>

        {/* Main Grid */}
        <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
          {/* Left Column */}
          <div className='lg:col-span-2 space-y-6'>
            {/* Tabs */}
            <div className='bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden'>
              <div className='border-b border-gray-200 dark:border-gray-800'>
                <div className='flex overflow-x-auto'>
                  {[
                    { id: 'overview', label: 'Overview', icon: FaFileInvoice },
                    {
                      id: 'invoices',
                      label: 'Invoices',
                      icon: FaFileInvoice,
                      badge: invoices.length
                    },
                    {
                      id: 'history',
                      label: 'History',
                      icon: FaClockRotateLeft
                    },
                    { id: 'payments', label: 'Payments', icon: FaCreditCard }
                  ].map(tab => {
                    const Icon = tab.icon
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex-1 py-4 px-4 text-center border-b-2 font-medium text-sm flex items-center justify-center gap-2 whitespace-nowrap transition-colors ${
                          activeTab === tab.id
                            ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                            : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
                        }`}
                      >
                        <Icon className='text-sm' />
                        <span>{tab.label}</span>
                        {tab.badge && (
                          <span className='bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 py-0.5 px-2 rounded-full text-xs'>
                            {tab.badge}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className='p-6'>
                {/* Overview Tab */}
                {activeTab === 'overview' && (
                  <div className='space-y-6'>
                    <div>
                      <h3 className='text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2'>
                        <FaFileInvoice className='text-blue-500' />
                        Booking Information
                      </h3>
                      <div className='grid grid-cols-2 md:grid-cols-3 gap-4'>
                        <div className='bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg'>
                          <p className='text-xs text-gray-500 dark:text-gray-400 mb-1'>
                            Total Amount
                          </p>
                          <p className='text-lg font-bold text-gray-900 dark:text-gray-100'>
                            {formatCurrency(
                              booking.totalAmount,
                              booking.clientCurrency
                            )}
                          </p>
                        </div>
                        <div className='bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg'>
                          <p className='text-xs text-gray-500 dark:text-gray-400 mb-1'>
                            Cost Amount
                          </p>
                          <p className='text-lg font-bold text-gray-900 dark:text-gray-100'>
                            {formatCurrency(
                              booking.costAmount,
                              booking.supplierCurrency
                            )}
                          </p>
                        </div>
                        <div className='bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg'>
                          <p className='text-xs text-gray-500 dark:text-gray-400 mb-1'>
                            Profit
                          </p>
                          <p className='text-lg font-bold text-green-600 dark:text-green-400'>
                            {formatCurrency(
                              booking.profit,
                              booking.clientCurrency
                            )}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Recent Invoices */}
                    <div>
                      <div className='flex justify-between items-center mb-4'>
                        <h3 className='text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2'>
                          <FaFileInvoice className='text-blue-500' />
                          Recent Invoices
                        </h3>
                        <button
                          onClick={handleGenerateInvoice}
                          className='text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium flex items-center gap-1'
                        >
                          <FaPlus /> Generate New
                        </button>
                      </div>
                      <div className='space-y-2'>
                        {invoices.slice(0, 2).map(invoice => (
                          <div
                            key={invoice.id}
                            onClick={() => {
                              setSelectedInvoice(invoice)
                              setShowInvoiceModal(true)
                            }}
                            className='flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer'
                          >
                            <div className='flex items-center gap-3'>
                              <div className='w-8 h-8 rounded bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-500'>
                                <FaFileInvoice />
                              </div>
                              <div>
                                <p className='text-sm font-medium text-gray-900 dark:text-gray-100'>
                                  {invoice.invoiceNumber}
                                </p>
                                <p className='text-xs text-gray-500 dark:text-gray-400'>
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

                    {/* Recent History */}
                    <div>
                      <h3 className='text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2'>
                        <FaClockRotateLeft className='text-blue-500' />
                        Recent History
                      </h3>
                      <div className='space-y-4'>
                        {history.slice(0, 3).map(item => (
                          <div key={item.id} className='flex gap-3'>
                            <div className='w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0'>
                              {getHistoryIcon(item.type)}
                            </div>
                            <div>
                              <p className='text-sm font-medium text-gray-900 dark:text-gray-100'>
                                {item.status}
                                {item.reason && (
                                  <span className='text-gray-500 dark:text-gray-400'>
                                    {' '}
                                    - {item.reason}
                                  </span>
                                )}
                              </p>
                              <p className='text-xs text-gray-500 dark:text-gray-400'>
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

                {/* Invoices Tab */}
                {activeTab === 'invoices' && (
                  <div className='space-y-4'>
                    <div className='flex justify-between items-center'>
                      <h3 className='text-sm font-semibold text-gray-900 dark:text-gray-100'>
                        All Invoices
                      </h3>
                      <button
                        onClick={handleGenerateInvoice}
                        className='text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium flex items-center gap-1'
                      >
                        <FaPlus /> Generate New
                      </button>
                    </div>
                    <div className='space-y-2'>
                      {invoices.map(invoice => (
                        <div
                          key={invoice.id}
                          onClick={() => {
                            setSelectedInvoice(invoice)
                            setShowInvoiceModal(true)
                          }}
                          className='flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer'
                        >
                          <div className='flex items-center gap-3 flex-1'>
                            <div className='w-10 h-10 rounded bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-500'>
                              <FaFileInvoice className='text-lg' />
                            </div>
                            <div className='flex-1'>
                              <div className='flex items-center gap-2'>
                                <p className='text-sm font-medium text-gray-900 dark:text-gray-100'>
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
                              <p className='text-xs text-gray-500 dark:text-gray-400'>
                                {formatCurrency(invoice.amount)} • Created{' '}
                                {formatDate(invoice.createdAt)} • Due{' '}
                                {formatDate(invoice.dueDate)}
                              </p>
                            </div>
                          </div>
                          <div className='flex items-center gap-2'>
                            <button className='p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-800'>
                              <FaDownload />
                            </button>
                            <button className='p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-800'>
                              <FaEye />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* History Tab */}
                {activeTab === 'history' && (
                  <div className='space-y-4'>
                    <h3 className='text-sm font-semibold text-gray-900 dark:text-gray-100'>
                      Status History
                    </h3>
                    <div className='space-y-4'>
                      {history.map(item => (
                        <div key={item.id} className='flex gap-3'>
                          <div className='w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0'>
                            {getHistoryIcon(item.type)}
                          </div>
                          <div>
                            <p className='text-sm font-medium text-gray-900 dark:text-gray-100'>
                              {item.status}
                            </p>
                            {item.reason && (
                              <p className='text-xs text-gray-600 dark:text-gray-400 mt-1'>
                                {item.reason}
                              </p>
                            )}
                            <p className='text-xs text-gray-500 dark:text-gray-400 mt-1'>
                              {item.changedBy} •{' '}
                              {formatDateTime(item.changedAt)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Payments Tab */}
                {activeTab === 'payments' && (
                  <div className='space-y-4'>
                    <div className='flex justify-between items-center'>
                      <h3 className='text-sm font-semibold text-gray-900 dark:text-gray-100'>
                        Payment Details
                      </h3>
                      <button
                        onClick={() => setShowPaymentsModal(true)}
                        className='text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium flex items-center gap-1'
                      >
                        <FaEye /> View All
                      </button>
                    </div>

                    <div className='grid grid-cols-2 gap-4 mb-4'>
                      <div className='bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg'>
                        <p className='text-xs text-gray-500 dark:text-gray-400 mb-1'>
                          Advance Required
                        </p>
                        <p className='text-xl font-bold text-gray-900 dark:text-gray-100'>
                          {formatCurrency(
                            booking.advanceRequired,
                            booking.clientCurrency
                          )}
                        </p>
                      </div>
                      <div className='bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg'>
                        <p className='text-xs text-gray-500 dark:text-gray-400 mb-1'>
                          Advance Received
                        </p>
                        <p className='text-xl font-bold text-green-600 dark:text-green-400'>
                          {formatCurrency(
                            booking.advanceReceived,
                            booking.clientCurrency
                          )}
                        </p>
                      </div>
                    </div>

                    <div className='bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800'>
                      <div className='flex justify-between items-center'>
                        <div>
                          <p className='text-sm font-medium text-blue-900 dark:text-blue-300'>
                            Payment Status
                          </p>
                          <p className='text-xs text-blue-700 dark:text-blue-400'>
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
                      <div className='mt-3 w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2'>
                        <div
                          className='bg-blue-600 dark:bg-blue-400 h-2 rounded-full transition-all'
                          style={{
                            width: `${
                              (booking.advanceReceived /
                                booking.advanceRequired) *
                              100
                            }%`
                          }}
                        />
                      </div>
                    </div>

                    {/* Recent Payments */}
                    <div className='space-y-2'>
                      {payments.slice(0, 2).map(payment => (
                        <div
                          key={payment.id}
                          className='flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg'
                        >
                          <div>
                            <p className='text-sm font-medium text-gray-900 dark:text-gray-100'>
                              {formatCurrency(payment.amount)}
                            </p>
                            <p className='text-xs text-gray-500 dark:text-gray-400'>
                              {formatDateTime(payment.date)} • {payment.mode}
                            </p>
                          </div>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              payment.status === 'completed'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                            }`}
                          >
                            {payment.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className='space-y-6'>
            {/* Status Controls */}
            <div className='bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden'>
              <div className='px-5 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50'>
                <h3 className='text-xs font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wide flex items-center gap-2'>
                  <FaClock className='text-blue-500' />
                  Status Controls
                </h3>
              </div>
              <div className='p-5 space-y-3'>
                <button
                  onClick={() => handleStatusChange('PENDING')}
                  disabled={booking.status === 'PENDING'}
                  className={`w-full py-2.5 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                    booking.status === 'PENDING'
                      ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-900 cursor-default'
                      : 'bg-white dark:bg-gray-800 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-700 hover:border-yellow-300'
                  }`}
                >
                  <FaClock /> Pending
                </button>
                <button
                  onClick={() => handleStatusChange('CONFIRMED')}
                  disabled={booking.status === 'CONFIRMED'}
                  className={`w-full py-2.5 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                    booking.status === 'CONFIRMED'
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border border-green-200 dark:border-green-900 cursor-default'
                      : 'bg-white dark:bg-gray-800 hover:bg-green-50 dark:hover:bg-green-900/20 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-700 hover:border-green-300'
                  }`}
                >
                  <FaCircleCheck /> Confirmed
                </button>
                <button
                  onClick={() => handleStatusChange('CANCELLED')}
                  disabled={booking.status === 'CANCELLED'}
                  className={`w-full py-2.5 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                    booking.status === 'CANCELLED'
                      ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 border border-red-200 dark:border-red-900 cursor-default'
                      : 'bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-700 hover:border-red-300'
                  }`}
                >
                  <FaBan /> Cancelled
                </button>
                <p className='text-xs text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-1'>
                  <FaClock /> Cancellation requires a reason
                </p>
              </div>
            </div>

            {/* Payment Snapshot */}
            <div className='bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden'>
              <div className='px-5 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50'>
                <h3 className='text-xs font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wide flex items-center gap-2'>
                  <FaCreditCard className='text-blue-500' />
                  Payment Snapshot
                </h3>
              </div>
              <div className='p-5 space-y-4'>
                <div className='flex justify-between items-center'>
                  <span className='text-sm text-gray-600 dark:text-gray-400'>
                    Advance Required
                  </span>
                  <span className='text-sm font-semibold text-gray-900 dark:text-gray-100'>
                    {formatCurrency(
                      booking.advanceRequired,
                      booking.clientCurrency
                    )}
                  </span>
                </div>
                <div className='flex justify-between items-center'>
                  <span className='text-sm text-gray-600 dark:text-gray-400'>
                    Advance Received
                  </span>
                  <span className='text-sm font-semibold text-green-600 dark:text-green-400'>
                    {formatCurrency(
                      booking.advanceReceived,
                      booking.clientCurrency
                    )}
                  </span>
                </div>
                <div className='flex justify-between items-center pt-3 border-t border-gray-100 dark:border-gray-800'>
                  <span className='text-sm text-gray-600 dark:text-gray-400'>
                    Balance
                  </span>
                  <span className='text-sm font-bold text-gray-900 dark:text-gray-100'>
                    {formatCurrency(
                      booking.advanceRequired - booking.advanceReceived,
                      booking.clientCurrency
                    )}
                  </span>
                </div>
                <div className='mt-2'>
                  <div className='flex justify-between items-center mb-1'>
                    <span className='text-xs text-gray-500 dark:text-gray-400'>
                      Progress
                    </span>
                    <span className='text-xs font-medium text-gray-700 dark:text-gray-300'>
                      {Math.round(
                        (booking.advanceReceived / booking.advanceRequired) *
                          100
                      )}
                      %
                    </span>
                  </div>
                  <div className='w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2'>
                    <div
                      className='bg-blue-600 dark:bg-blue-500 h-2 rounded-full transition-all'
                      style={{
                        width: `${
                          (booking.advanceReceived / booking.advanceRequired) *
                          100
                        }%`
                      }}
                    />
                  </div>
                </div>
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${getPaymentStatusColor(
                    booking.paymentStatus
                  )}`}
                >
                  <FaCreditCard /> {booking.paymentStatus}
                </span>
              </div>
            </div>

            {/* Quick Links */}
            <div className='bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden'>
              <div className='px-5 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50'>
                <h3 className='text-xs font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wide flex items-center gap-2'>
                  <FaFileInvoice className='text-blue-500' />
                  Quick Links
                </h3>
              </div>
              <div className='p-5 space-y-2'>
                <button
                  onClick={() => navigate(`/quotations/${booking.quotationId}`)}
                  className='w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors flex items-center gap-2'
                >
                  <FaFileInvoice className='text-gray-400' />
                  View Quotation #{booking.quotationId}
                </button>
                <button
                  onClick={() => setShowPaymentsModal(true)}
                  className='w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors flex items-center gap-2'
                >
                  <FaCreditCard className='text-gray-400' />
                  View All Payments
                </button>
                <button
                  onClick={() => setActiveTab('invoices')}
                  className='w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors flex items-center gap-2'
                >
                  <FaFileInvoice className='text-gray-400' />
                  View All Invoices
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cancellation Modal */}
      {showCancelModal && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'>
          <div className='bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-md w-full p-6 animate-fadeIn'>
            <div className='flex items-center justify-between mb-4'>
              <h3 className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
                Cancel Booking
              </h3>
              <button
                onClick={() => setShowCancelModal(false)}
                className='text-gray-400 hover:text-gray-600'
              >
                <FaXmark className='text-xl' />
              </button>
            </div>
            <p className='text-sm text-gray-600 dark:text-gray-400 mb-4'>
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
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-red-500 dark:bg-gray-800 dark:text-gray-100 ${
                cancelError
                  ? 'border-red-500'
                  : 'border-gray-300 dark:border-gray-700'
              }`}
              placeholder='Enter cancellation reason...'
            />
            {cancelError && (
              <p className='mt-2 text-sm text-red-600 dark:text-red-400 flex items-center gap-1'>
                <FaBan /> {cancelError}
              </p>
            )}
            <div className='flex justify-end gap-3 mt-6'>
              <button
                onClick={() => setShowCancelModal(false)}
                className='px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700'
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
                    <FaClock className='animate-spin' />
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
