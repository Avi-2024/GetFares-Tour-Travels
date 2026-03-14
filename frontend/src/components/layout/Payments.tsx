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
  FaFilter,
  FaEye,
  FaCheck,
  FaTrash,
  FaFileInvoice,
  FaReceipt
} from 'react-icons/fa6'
import { FaEdit } from 'react-icons/fa'
import SurfaceCard from '../ui/SurfaceCard'
import EmptyState from '../ui/EmptyState'
import StatusBadge from '../ui/StatusBadge'

type TxStatus = 'completed' | 'pending' | 'failed' | 'refunded'
type PaymentMode = 'bank' | 'card' | 'cash' | 'cheque' | 'online'

interface Transaction {
  id: string
  referenceId: string
  date: string
  customer: string
  bookingId: string
  amount: number
  mode: PaymentMode
  status: TxStatus
  paidAt?: string
  verifiedAt?: string
  verifiedBy?: string
  paymentReference?: string
  gatewayOrderId?: string
  gatewayPaymentId?: string
  gatewaySignature?: string
  proofUrl?: string
  notes?: string
  createdAt?: string
  updatedAt?: string
}

interface PaymentVerificationData {
  paidAt: string
  status: 'completed' | 'failed'
  proofUrl?: string
  paymentReference?: string
  gatewayPaymentId?: string
  notes?: string
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

const initialTransactions: Transaction[] = [
  {
    id: '1',
    referenceId: 'TRX-8902',
    date: 'Mar 09, 2026',
    customer: 'Sarah Jenkins',
    bookingId: 'BK-2034',
    amount: 1200,
    mode: 'card',
    status: 'completed',
    paidAt: '2026-03-09T14:30:00Z',
    verifiedAt: '2026-03-09T15:20:00Z',
    verifiedBy: 'Alex Morgan',
    paymentReference: 'CARD-8902',
    gatewayOrderId: 'ORD-123456',
    gatewayPaymentId: 'PAY-789012',
    gatewaySignature: 'sig_abc123',
    proofUrl: '/proofs/payment1.pdf',
    notes: 'Payment via credit card',
    createdAt: '2026-03-09T10:00:00Z',
    updatedAt: '2026-03-09T15:20:00Z'
  },
  {
    id: '2',
    referenceId: 'TRX-8901',
    date: 'Mar 08, 2026',
    customer: 'Emma Wilson',
    bookingId: 'BK-2030',
    amount: 5400,
    mode: 'bank',
    status: 'completed',
    paidAt: '2026-03-08T11:20:00Z',
    verifiedAt: '2026-03-08T14:30:00Z',
    verifiedBy: 'Sarah Lee',
    paymentReference: 'NEFT-8901',
    gatewayOrderId: 'ORD-123457',
    gatewayPaymentId: 'PAY-789013',
    gatewaySignature: 'sig_def456',
    createdAt: '2026-03-08T09:00:00Z',
    updatedAt: '2026-03-08T14:30:00Z'
  },
  {
    id: '3',
    referenceId: 'TRX-8895',
    date: 'Mar 07, 2026',
    customer: 'James Lee',
    bookingId: 'BK-2028',
    amount: -8200,
    mode: 'bank',
    status: 'refunded',
    notes: 'Full refund processed',
    createdAt: '2026-03-07T15:00:00Z',
    updatedAt: '2026-03-07T15:00:00Z'
  },
  {
    id: '4',
    referenceId: 'TRX-8888',
    date: 'Mar 05, 2026',
    customer: 'Michael Ross',
    bookingId: 'BK-2033',
    amount: 2800,
    mode: 'card',
    status: 'failed',
    notes: 'Card declined',
    createdAt: '2026-03-05T10:00:00Z',
    updatedAt: '2026-03-05T10:00:00Z'
  },
  {
    id: '5',
    referenceId: 'TRX-8889',
    date: 'Mar 06, 2026',
    customer: 'David Kim',
    bookingId: 'BK-2035',
    amount: 1500,
    mode: 'cheque',
    status: 'pending',
    notes: 'Cheque submitted, awaiting clearance',
    createdAt: '2026-03-06T11:30:00Z',
    updatedAt: '2026-03-06T11:30:00Z'
  }
]

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
        <FaXmark className='text-red-600 dark:text-red-400' />
      ) : (
        <FaEye className='text-blue-600 dark:text-blue-400' />
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

// Confirm Modal
const ConfirmModal = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel
}: {
  isOpen: boolean
  title: string
  message: string
  onConfirm: () => void
  onCancel: () => void
}) => {
  if (!isOpen) return null

  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'>
      <div className='bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-md w-full p-6 animate-fadeIn'>
        <div className='flex items-center gap-3 mb-4'>
          <div className='w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center'>
            <FaEye className='text-amber-600 dark:text-amber-400' />
          </div>
          <h3 className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
            {title}
          </h3>
        </div>
        <p className='text-sm text-gray-600 dark:text-gray-400 mb-6'>
          {message}
        </p>
        <div className='flex justify-end gap-3'>
          <button
            onClick={onCancel}
            className='px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700'
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className='px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700'
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  )
}

// Verify Modal - Complete as per document specs
const VerifyModal = ({
  isOpen,
  transaction,
  onConfirm,
  onCancel
}: {
  isOpen: boolean
  transaction: Transaction | null
  onConfirm: (data: PaymentVerificationData) => void
  onCancel: () => void
}) => {
  const [paidAt, setPaidAt] = useState(
    new Date().toISOString().split('T')[0] +
      'T' +
      new Date().toTimeString().slice(0, 5)
  )
  const [status, setStatus] = useState<'completed' | 'failed'>('completed')
  const [proofUrl, setProofUrl] = useState('')
  const [paymentReference, setPaymentReference] = useState('')
  const [gatewayPaymentId, setGatewayPaymentId] = useState('')
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  if (!isOpen || !transaction) return null

  const validate = () => {
    const newErrors: Record<string, string> = {}
    if (!paidAt) newErrors.paidAt = 'Paid at is required'
    if (status === 'completed' && !paymentReference) {
      newErrors.paymentReference =
        'Payment reference is required for completed payments'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = () => {
    if (!validate()) return
    onConfirm({
      paidAt,
      status,
      proofUrl: proofUrl || undefined,
      paymentReference: paymentReference || undefined,
      gatewayPaymentId: gatewayPaymentId || undefined,
      notes: notes || undefined
    })
  }

  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'>
      <div className='bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto'>
        <div className='sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 p-4 flex items-center justify-between'>
          <div className='flex items-center gap-3'>
            <div className='w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center'>
              <FaCircleCheck className='text-blue-600' />
            </div>
            <h3 className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
              Verify Payment - {transaction.referenceId}
            </h3>
          </div>
          <button
            onClick={onCancel}
            className='text-gray-400 hover:text-gray-600'
          >
            <FaXmark className='text-xl' />
          </button>
        </div>

        <div className='p-6 space-y-6'>
          {/* Transaction Info */}
          <div className='bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg space-y-2'>
            <div className='flex justify-between'>
              <span className='text-sm text-gray-500'>Customer</span>
              <span className='text-sm font-medium text-gray-900'>
                {transaction.customer}
              </span>
            </div>
            <div className='flex justify-between'>
              <span className='text-sm text-gray-500'>Booking ID</span>
              <span className='text-sm font-medium text-gray-900'>
                {transaction.bookingId}
              </span>
            </div>
            <div className='flex justify-between'>
              <span className='text-sm text-gray-500'>Amount</span>
              <span className='text-sm font-bold text-gray-900'>
                ${Math.abs(transaction.amount).toLocaleString()}
              </span>
            </div>
            <div className='flex justify-between'>
              <span className='text-sm text-gray-500'>Mode</span>
              <span className='text-sm font-medium text-gray-900 capitalize'>
                {transaction.mode}
              </span>
            </div>
          </div>

          {/* Verification Form - As per document specs */}
          <div className='space-y-4'>
            <h4 className='text-sm font-medium text-gray-700 dark:text-gray-300'>
              Verification Details
            </h4>

            <div className='grid grid-cols-2 gap-4'>
              <div>
                <label className='field-label'>Paid At *</label>
                <input
                  type='datetime-local'
                  value={paidAt}
                  onChange={e => setPaidAt(e.target.value)}
                  className={`field-input ${
                    errors.paidAt ? 'border-red-500' : ''
                  }`}
                />
                {errors.paidAt && (
                  <p className='text-xs text-red-500 mt-1'>{errors.paidAt}</p>
                )}
              </div>
              <div>
                <label className='field-label'>Status *</label>
                <select
                  value={status}
                  onChange={e =>
                    setStatus(e.target.value as 'completed' | 'failed')
                  }
                  className='field-input'
                >
                  <option value='completed'>Completed</option>
                  <option value='failed'>Failed</option>
                </select>
              </div>
            </div>

            <div>
              <label className='field-label'>
                Payment Reference {status === 'completed' && '*'}
              </label>
              <input
                type='text'
                value={paymentReference}
                onChange={e => setPaymentReference(e.target.value)}
                className={`field-input ${
                  errors.paymentReference ? 'border-red-500' : ''
                }`}
                placeholder='e.g., NEFT-12345, CARD-8902'
              />
              {errors.paymentReference && (
                <p className='text-xs text-red-500 mt-1'>
                  {errors.paymentReference}
                </p>
              )}
            </div>

            <div>
              <label className='field-label'>Gateway Payment ID</label>
              <input
                type='text'
                value={gatewayPaymentId}
                onChange={e => setGatewayPaymentId(e.target.value)}
                className='field-input'
                placeholder='e.g., PAY-789012'
              />
            </div>

            <div>
              <label className='field-label'>Proof URL</label>
              <input
                type='url'
                value={proofUrl}
                onChange={e => setProofUrl(e.target.value)}
                className='field-input'
                placeholder='https://example.com/proof.pdf'
              />
              <p className='text-xs text-gray-500 mt-1'>
                Link to payment receipt, screenshot, or document
              </p>
            </div>

            <div>
              <label className='field-label'>Notes</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
                className='field-input'
                placeholder='Any additional notes about this payment...'
              />
            </div>
          </div>
        </div>

        <div className='sticky bottom-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 p-4 flex justify-end gap-3'>
          <button
            onClick={onCancel}
            className='px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50'
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className='px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700'
          >
            Verify Payment
          </button>
        </div>
      </div>
    </div>
  )
}

// Add/Edit Payment Modal - Complete as per document specs
const PaymentFormModal = ({
  isOpen,
  transaction,
  onSave,
  onCancel
}: {
  isOpen: boolean
  transaction: Transaction | null
  onSave: (data: any) => void
  onCancel: () => void
}) => {
  const [formData, setFormData] = useState({
    customer: transaction?.customer || '',
    bookingId: transaction?.bookingId || '',
    amount: transaction?.amount ? Math.abs(transaction.amount).toString() : '',
    mode: transaction?.mode || 'bank',
    referenceId: transaction?.referenceId || '',
    paymentReference: transaction?.paymentReference || '',
    gatewayOrderId: transaction?.gatewayOrderId || '',
    gatewayPaymentId: transaction?.gatewayPaymentId || '',
    gatewaySignature: transaction?.gatewaySignature || '',
    proofUrl: transaction?.proofUrl || '',
    status: transaction?.status || 'pending',
    notes: transaction?.notes || '',
    date:
      transaction?.date ||
      new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric'
      })
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  if (!isOpen) return null

  const validate = () => {
    const newErrors: Record<string, string> = {}
    if (!formData.customer) newErrors.customer = 'Customer is required'
    if (!formData.bookingId) newErrors.bookingId = 'Booking ID is required'
    if (!formData.amount) newErrors.amount = 'Amount is required'
    if (parseFloat(formData.amount) <= 0)
      newErrors.amount = 'Amount must be positive'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = () => {
    if (!validate()) return

    const now = new Date().toISOString()
    onSave({
      ...formData,
      amount:
        parseFloat(formData.amount) *
        (transaction?.amount && transaction.amount < 0 ? -1 : 1),
      id: transaction?.id || `tx-${Date.now()}`,
      createdAt: transaction?.createdAt || now,
      updatedAt: now
    })
  }

  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'>
      <div className='bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto'>
        <div className='sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 p-4 flex items-center justify-between'>
          <h3 className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
            {transaction ? 'Edit Payment' : 'Add New Payment'}
          </h3>
          <button
            onClick={onCancel}
            className='text-gray-400 hover:text-gray-600'
          >
            <FaXmark className='text-xl' />
          </button>
        </div>

        <div className='p-6 space-y-4'>
          {/* Basic Info */}
          <div className='grid grid-cols-2 gap-4'>
            <div>
              <label className='field-label'>Customer *</label>
              <input
                type='text'
                value={formData.customer}
                onChange={e =>
                  setFormData({ ...formData, customer: e.target.value })
                }
                className={`field-input ${
                  errors.customer ? 'border-red-500' : ''
                }`}
                placeholder='Customer name'
              />
              {errors.customer && (
                <p className='text-xs text-red-500 mt-1'>{errors.customer}</p>
              )}
            </div>
            <div>
              <label className='field-label'>Booking ID *</label>
              <input
                type='text'
                value={formData.bookingId}
                onChange={e =>
                  setFormData({ ...formData, bookingId: e.target.value })
                }
                className={`field-input ${
                  errors.bookingId ? 'border-red-500' : ''
                }`}
                placeholder='BK-XXXX'
              />
              {errors.bookingId && (
                <p className='text-xs text-red-500 mt-1'>{errors.bookingId}</p>
              )}
            </div>
          </div>

          <div className='grid grid-cols-2 gap-4'>
            <div>
              <label className='field-label'>Amount *</label>
              <input
                type='number'
                value={formData.amount}
                onChange={e =>
                  setFormData({ ...formData, amount: e.target.value })
                }
                className={`field-input ${
                  errors.amount ? 'border-red-500' : ''
                }`}
                placeholder='0.00'
                min='0'
                step='0.01'
              />
              {errors.amount && (
                <p className='text-xs text-red-500 mt-1'>{errors.amount}</p>
              )}
            </div>
            <div>
              <label className='field-label'>Payment Mode</label>
              <select
                value={formData.mode}
                onChange={e =>
                  setFormData({
                    ...formData,
                    mode: e.target.value as PaymentMode
                  })
                }
                className='field-input'
              >
                <option value='bank'>Bank Transfer</option>
                <option value='card'>Card</option>
                <option value='cash'>Cash</option>
                <option value='cheque'>Cheque</option>
                <option value='online'>Online</option>
              </select>
            </div>
          </div>

          <div className='grid grid-cols-2 gap-4'>
            <div>
              <label className='field-label'>Reference ID</label>
              <input
                type='text'
                value={formData.referenceId}
                onChange={e =>
                  setFormData({ ...formData, referenceId: e.target.value })
                }
                className='field-input'
                placeholder='TRX-XXXX'
              />
            </div>
            <div>
              <label className='field-label'>Status</label>
              <select
                value={formData.status}
                onChange={e =>
                  setFormData({
                    ...formData,
                    status: e.target.value as TxStatus
                  })
                }
                className='field-input'
              >
                <option value='pending'>Pending</option>
                <option value='completed'>Completed</option>
                <option value='failed'>Failed</option>
                <option value='refunded'>Refunded</option>
              </select>
            </div>
          </div>

          {/* Payment Details */}
          <div className='pt-4 border-t border-gray-200 dark:border-gray-800'>
            <h4 className='text-sm font-medium text-gray-700 dark:text-gray-300 mb-3'>
              Payment Details
            </h4>
            <div className='space-y-4'>
              <div>
                <label className='field-label'>Payment Reference</label>
                <input
                  type='text'
                  value={formData.paymentReference}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      paymentReference: e.target.value
                    })
                  }
                  className='field-input'
                  placeholder='e.g., NEFT-12345'
                />
              </div>

              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <label className='field-label'>Gateway Order ID</label>
                  <input
                    type='text'
                    value={formData.gatewayOrderId}
                    onChange={e =>
                      setFormData({
                        ...formData,
                        gatewayOrderId: e.target.value
                      })
                    }
                    className='field-input'
                    placeholder='ORD-123456'
                  />
                </div>
                <div>
                  <label className='field-label'>Gateway Payment ID</label>
                  <input
                    type='text'
                    value={formData.gatewayPaymentId}
                    onChange={e =>
                      setFormData({
                        ...formData,
                        gatewayPaymentId: e.target.value
                      })
                    }
                    className='field-input'
                    placeholder='PAY-789012'
                  />
                </div>
              </div>

              <div>
                <label className='field-label'>Gateway Signature</label>
                <input
                  type='text'
                  value={formData.gatewaySignature}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      gatewaySignature: e.target.value
                    })
                  }
                  className='field-input'
                  placeholder='Signature for verification'
                />
              </div>

              <div>
                <label className='field-label'>Proof URL</label>
                <input
                  type='url'
                  value={formData.proofUrl}
                  onChange={e =>
                    setFormData({ ...formData, proofUrl: e.target.value })
                  }
                  className='field-input'
                  placeholder='https://example.com/receipt.pdf'
                />
              </div>

              <div>
                <label className='field-label'>Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={e =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  rows={3}
                  className='field-input'
                  placeholder='Additional notes...'
                />
              </div>
            </div>
          </div>
        </div>

        <div className='sticky bottom-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 p-4 flex justify-end gap-3'>
          <button
            onClick={onCancel}
            className='px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50'
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className='px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700'
          >
            {transaction ? 'Update Payment' : 'Add Payment'}
          </button>
        </div>
      </div>
    </div>
  )
}

// Details Modal
const DetailsModal = ({
  isOpen,
  transaction,
  onClose,
  onVerify,
  onEdit
}: {
  isOpen: boolean
  transaction: Transaction | null
  onClose: () => void
  onVerify: () => void
  onEdit: () => void
}) => {
  if (!isOpen || !transaction) return null

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return 'N/A'
    return new Date(dateStr).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'>
      <div className='bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto'>
        <div className='sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 p-4 flex items-center justify-between'>
          <h3 className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
            Payment Details
          </h3>
          <button
            onClick={onClose}
            className='text-gray-400 hover:text-gray-600'
          >
            <FaXmark className='text-xl' />
          </button>
        </div>

        <div className='p-6 space-y-6'>
          {/* Status */}
          <div className='flex items-center justify-between'>
            <span className='text-sm text-gray-500'>Status</span>
            <span
              className={`rounded-full border px-3 py-1 text-xs font-semibold capitalize ${
                statusClasses[transaction.status]
              }`}
            >
              {transaction.status}
            </span>
          </div>

          {/* Basic Info */}
          <div className='grid grid-cols-2 gap-4'>
            <div className='p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg'>
              <p className='text-xs text-gray-500 mb-1'>Reference ID</p>
              <p className='text-lg font-bold text-blue-600'>
                #{transaction.referenceId}
              </p>
            </div>
            <div className='p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg'>
              <p className='text-xs text-gray-500 mb-1'>Amount</p>
              <p
                className={`text-lg font-bold ${
                  transaction.amount < 0 ? 'text-red-600' : 'text-gray-900'
                }`}
              >
                {transaction.amount < 0 ? '-' : ''}$
                {Math.abs(transaction.amount).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Transaction Details */}
          <div className='space-y-3'>
            <h4 className='text-sm font-medium text-gray-700 dark:text-gray-300'>
              Transaction Details
            </h4>
            <div className='space-y-2'>
              <div className='flex justify-between py-2 border-b border-gray-100 dark:border-gray-800'>
                <span className='text-sm text-gray-500'>Customer</span>
                <span className='text-sm font-medium text-gray-900'>
                  {transaction.customer}
                </span>
              </div>
              <div className='flex justify-between py-2 border-b border-gray-100 dark:border-gray-800'>
                <span className='text-sm text-gray-500'>Booking ID</span>
                <span className='text-sm font-medium text-gray-900'>
                  {transaction.bookingId}
                </span>
              </div>
              <div className='flex justify-between py-2 border-b border-gray-100 dark:border-gray-800'>
                <span className='text-sm text-gray-500'>Date</span>
                <span className='text-sm font-medium text-gray-900'>
                  {transaction.date}
                </span>
              </div>
              <div className='flex justify-between py-2 border-b border-gray-100 dark:border-gray-800'>
                <span className='text-sm text-gray-500'>Payment Mode</span>
                <span className='text-sm font-medium text-gray-900 capitalize'>
                  {transaction.mode}
                </span>
              </div>
              {transaction.paidAt && (
                <div className='flex justify-between py-2 border-b border-gray-100 dark:border-gray-800'>
                  <span className='text-sm text-gray-500'>Paid At</span>
                  <span className='text-sm font-medium text-gray-900'>
                    {formatDateTime(transaction.paidAt)}
                  </span>
                </div>
              )}
              {transaction.paymentReference && (
                <div className='flex justify-between py-2 border-b border-gray-100 dark:border-gray-800'>
                  <span className='text-sm text-gray-500'>Payment Ref</span>
                  <span className='text-sm font-medium text-gray-900'>
                    {transaction.paymentReference}
                  </span>
                </div>
              )}
              {transaction.gatewayOrderId && (
                <div className='flex justify-between py-2 border-b border-gray-100 dark:border-gray-800'>
                  <span className='text-sm text-gray-500'>Gateway Order</span>
                  <span className='text-sm font-medium text-gray-900'>
                    {transaction.gatewayOrderId}
                  </span>
                </div>
              )}
              {transaction.gatewayPaymentId && (
                <div className='flex justify-between py-2 border-b border-gray-100 dark:border-gray-800'>
                  <span className='text-sm text-gray-500'>Gateway Payment</span>
                  <span className='text-sm font-medium text-gray-900'>
                    {transaction.gatewayPaymentId}
                  </span>
                </div>
              )}
              {transaction.gatewaySignature && (
                <div className='flex justify-between py-2 border-b border-gray-100 dark:border-gray-800'>
                  <span className='text-sm text-gray-500'>Signature</span>
                  <span className='text-sm font-medium text-gray-900 truncate max-w-[200px]'>
                    {transaction.gatewaySignature}
                  </span>
                </div>
              )}
              {transaction.proofUrl && (
                <div className='flex justify-between py-2 border-b border-gray-100 dark:border-gray-800'>
                  <span className='text-sm text-gray-500'>Proof</span>
                  <a
                    href={transaction.proofUrl}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='text-sm text-blue-600 hover:underline flex items-center gap-1'
                  >
                    <FaReceipt /> View Receipt
                  </a>
                </div>
              )}
              {transaction.notes && (
                <div className='py-2'>
                  <span className='text-sm text-gray-500 block mb-1'>
                    Notes
                  </span>
                  <p className='text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/50 p-2 rounded'>
                    {transaction.notes}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Verification Info */}
          {transaction.verifiedAt && (
            <div className='space-y-3'>
              <h4 className='text-sm font-medium text-gray-700 dark:text-gray-300'>
                Verification Details
              </h4>
              <div className='space-y-2'>
                <div className='flex justify-between py-2 border-b border-gray-100 dark:border-gray-800'>
                  <span className='text-sm text-gray-500'>Verified At</span>
                  <span className='text-sm font-medium text-gray-900'>
                    {formatDateTime(transaction.verifiedAt)}
                  </span>
                </div>
                <div className='flex justify-between py-2 border-b border-gray-100 dark:border-gray-800'>
                  <span className='text-sm text-gray-500'>Verified By</span>
                  <span className='text-sm font-medium text-gray-900'>
                    {transaction.verifiedBy}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className='space-y-3'>
            <h4 className='text-sm font-medium text-gray-700 dark:text-gray-300'>
              Metadata
            </h4>
            <div className='space-y-2'>
              <div className='flex justify-between py-2 border-b border-gray-100 dark:border-gray-800'>
                <span className='text-sm text-gray-500'>Created At</span>
                <span className='text-sm font-medium text-gray-900'>
                  {formatDateTime(transaction.createdAt)}
                </span>
              </div>
              <div className='flex justify-between py-2 border-b border-gray-100 dark:border-gray-800'>
                <span className='text-sm text-gray-500'>Updated At</span>
                <span className='text-sm font-medium text-gray-900'>
                  {formatDateTime(transaction.updatedAt)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className='sticky bottom-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 p-4 flex justify-end gap-3'>
          {transaction.status === 'pending' && (
            <button
              onClick={onVerify}
              className='px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 flex items-center gap-2'
            >
              <FaCircleCheck /> Verify Payment
            </button>
          )}
          <button
            onClick={onEdit}
            className='px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 flex items-center gap-2'
          >
            <FaEdit /> Edit
          </button>
        </div>
      </div>
    </div>
  )
}

const Payments: React.FC = () => {
  const navigate = useNavigate()
  const [transactions, setTransactions] = useState(initialTransactions)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | TxStatus>('all')
  const [showAddPanel, setShowAddPanel] = useState(false)
  const [showMobileFilters, setShowMobileFilters] = useState(false)
  const [page, setPage] = useState(1)
  const [toast, setToast] = useState<{
    show: boolean
    message: string
    type: 'success' | 'error' | 'info'
  }>({
    show: false,
    message: '',
    type: 'success'
  })
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [showVerifyModal, setShowVerifyModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

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
  }, [transactions, search, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const rows = filtered.slice((page - 1) * pageSize, page * pageSize)

  const modeIcon = (mode: Transaction['mode']) => {
    if (mode === 'bank') return <FaBuildingColumns className='text-gray-500' />
    if (mode === 'card') return <FaCreditCard className='text-blue-600' />
    return <FaMoneyBill className='text-green-600' />
  }

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToast({ show: true, message, type })
    setTimeout(
      () => setToast({ show: false, message: '', type: 'success' }),
      3000
    )
  }

  const handleViewDetails = (tx: Transaction) => {
    setSelectedTransaction(tx)
    setShowDetails(true)
  }

  const handleVerify = () => {
    setShowDetails(false)
    setShowVerifyModal(true)
  }

  const handleVerifyConfirm = (data: PaymentVerificationData) => {
    if (selectedTransaction) {
      setTransactions(prev =>
        prev.map(tx =>
          tx.id === selectedTransaction.id
            ? {
                ...tx,
                ...data,
                status: data.status,
                verifiedAt: new Date().toISOString(),
                verifiedBy: 'Current User'
              }
            : tx
        )
      )
      setShowVerifyModal(false)
      setSelectedTransaction(null)
      showToast('Payment verified successfully', 'success')
    }
  }

  const handleEdit = (tx: Transaction) => {
    setSelectedTransaction(tx)
    setShowEditModal(true)
  }

  const handleSaveEdit = (data: any) => {
    setTransactions(prev =>
      prev.map(tx => (tx.id === data.id ? { ...tx, ...data } : tx))
    )
    setShowEditModal(false)
    setSelectedTransaction(null)
    showToast('Payment updated successfully', 'success')
  }

  const handleAddPayment = (data: any) => {
    setTransactions(prev => [data, ...prev])
    setShowAddPanel(false)
    showToast('Payment added successfully', 'success')
  }

  const handleDelete = (id: string) => {
    setSelectedTransaction(transactions.find(tx => tx.id === id) || null)
    setShowDeleteConfirm(true)
  }

  const confirmDelete = () => {
    if (selectedTransaction) {
      setTransactions(prev =>
        prev.filter(tx => tx.id !== selectedTransaction.id)
      )
      setShowDeleteConfirm(false)
      setSelectedTransaction(null)
      showToast('Payment deleted successfully', 'success')
    }
  }

  return (
    <div className='space-y-4 sm:space-y-6 px-4 sm:px-0 max-w-7xl mx-auto'>
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
      <ConfirmModal
        isOpen={showDeleteConfirm}
        title='Delete Payment'
        message='Are you sure you want to delete this payment? This action cannot be undone.'
        onConfirm={confirmDelete}
        onCancel={() => {
          setShowDeleteConfirm(false)
          setSelectedTransaction(null)
        }}
      />

      <VerifyModal
        isOpen={showVerifyModal}
        transaction={selectedTransaction}
        onConfirm={handleVerifyConfirm}
        onCancel={() => {
          setShowVerifyModal(false)
          setSelectedTransaction(null)
        }}
      />

      <PaymentFormModal
        isOpen={showEditModal}
        transaction={selectedTransaction}
        onSave={handleSaveEdit}
        onCancel={() => {
          setShowEditModal(false)
          setSelectedTransaction(null)
        }}
      />

      <PaymentFormModal
        isOpen={showAddPanel}
        transaction={null}
        onSave={handleAddPayment}
        onCancel={() => setShowAddPanel(false)}
      />

      <DetailsModal
        isOpen={showDetails}
        transaction={selectedTransaction}
        onClose={() => {
          setShowDetails(false)
          setSelectedTransaction(null)
        }}
        onVerify={handleVerify}
        onEdit={() => {
          setShowDetails(false)
          setShowEditModal(true)
        }}
      />

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
            onClick={() => setShowAddPanel(true)}
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
                  className='p-4 space-y-3 hover:bg-blue-50/40 dark:hover:bg-gray-800/50 transition-colors'
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

                  {/* Actions */}
                  <div className='flex justify-end gap-2 pt-2'>
                    <button
                      onClick={() => handleViewDetails(tx)}
                      className='p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg'
                      title='View Details'
                    >
                      <FaEye />
                    </button>
                    <button
                      onClick={() => handleEdit(tx)}
                      className='p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg'
                      title='Edit'
                    >
                      <FaEdit />
                    </button>
                    <button
                      onClick={() => handleDelete(tx.id)}
                      className='p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg'
                      title='Delete'
                    >
                      <FaTrash />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop View - Table */}
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
                    <th className='px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500'>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-gray-100 dark:divide-gray-800'>
                  {rows.map(tx => (
                    <tr
                      key={tx.id}
                      className='hover:bg-blue-50/30 dark:hover:bg-gray-800/40 transition-colors'
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
                      <td className='px-5 py-4'>
                        <div className='flex justify-end gap-2'>
                          <button
                            onClick={() => handleViewDetails(tx)}
                            className='p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg'
                            title='View Details'
                          >
                            <FaEye />
                          </button>
                          <button
                            onClick={() => handleEdit(tx)}
                            className='p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg'
                            title='Edit'
                          >
                            <FaEdit />
                          </button>
                          <button
                            onClick={() => handleDelete(tx.id)}
                            className='p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg'
                            title='Delete'
                          >
                            <FaTrash />
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

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translate(-50%, -20px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}

// Stat Card Component
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
