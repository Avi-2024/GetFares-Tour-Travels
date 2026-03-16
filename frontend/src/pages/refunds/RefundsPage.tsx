import { useMemo, useState } from 'react'
import {
  FaCheck,
  FaCircleXmark,
  FaMoneyBillTransfer,
  FaPlus,
  FaEye,
 
  FaChevronLeft,
  FaChevronRight,
  FaXmark
} from 'react-icons/fa6'
import { FaSearch } from 'react-icons/fa'
import { CurrencyInput, UUIDSelect } from '../../components/form'
import PermissionGate from '../../components/ui/PermissionGate'
import StatusBadge from '../../components/ui/StatusBadge'
import SurfaceCard from '../../components/ui/SurfaceCard'
import EmptyState from '../../components/ui/EmptyState'

type RefundStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'PROCESSED'

type RefundRow = {
  id: string
  bookingId: string
  paymentId?: string
  refundAmount: number
  supplierPenalty: number
  serviceCharge: number
  netAmount: number
  status: RefundStatus
  createdAt: string
  createdBy: string
  approvedAt?: string
  approvedBy?: string
  rejectedAt?: string
  rejectedBy?: string
  rejectedReason?: string
  processedAt?: string
  processedBy?: string
  gatewayRefundId?: string
}

// Toast Component
const Toast = ({
  message,
  type
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
        <FaCheck className='text-green-600 dark:text-green-400' />
      ) : type === 'error' ? (
        <FaCircleXmark className='text-red-600 dark:text-red-400' />
      ) : (
        <FaMoneyBillTransfer className='text-blue-600 dark:text-blue-400' />
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

// Confirmation Modal
const ConfirmModal = ({
  isOpen,
  title,
  message,
  type = 'info',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  children
}: {
  isOpen: boolean
  title: string
  message: string
  type?: 'info' | 'warning' | 'danger'
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  onCancel: () => void
  children?: React.ReactNode
}) => {
  if (!isOpen) return null

  const colors = {
    info: {
      bg: 'bg-blue-100 dark:bg-blue-900/20',
      icon: (
        <FaMoneyBillTransfer className='text-blue-600 dark:text-blue-400' />
      ),
      confirm: 'bg-blue-600 hover:bg-blue-700'
    },
    warning: {
      bg: 'bg-yellow-100 dark:bg-yellow-900/20',
      icon: <FaCircleXmark className='text-yellow-600 dark:text-yellow-400' />,
      confirm: 'bg-yellow-600 hover:bg-yellow-700'
    },
    danger: {
      bg: 'bg-red-100 dark:bg-red-900/20',
      icon: <FaCircleXmark className='text-red-600 dark:text-red-400' />,
      confirm: 'bg-red-600 hover:bg-red-700'
    }
  }

  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'>
      <div className='bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-md w-full p-6 animate-fadeIn'>
        <div className='flex items-center gap-3 mb-4'>
          <div
            className={`w-10 h-10 rounded-full ${colors[type].bg} flex items-center justify-center`}
          >
            {colors[type].icon}
          </div>
          <h3 className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
            {title}
          </h3>
        </div>
        <p className='text-sm text-gray-600 dark:text-gray-400 mb-6'>
          {message}
        </p>
        {children}
        <div className='flex justify-end gap-3'>
          <button
            onClick={onCancel}
            className='px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700'
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg ${colors[type].confirm} transition-colors`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

// Rejection Modal
const RejectModal = ({
  isOpen,
  onConfirm,
  onCancel
}: {
  isOpen: boolean
  onConfirm: (reason: string) => void
  onCancel: () => void
}) => {
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleConfirm = () => {
    if (!reason.trim()) {
      setError('Rejection reason is required')
      return
    }
    onConfirm(reason)
    setReason('')
    setError('')
  }

  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'>
      <div className='bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-md w-full p-6 animate-fadeIn'>
        <div className='flex items-center gap-3 mb-4'>
          <div className='w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center'>
            <FaCircleXmark className='text-red-600 dark:text-red-400' />
          </div>
          <h3 className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
            Reject Refund
          </h3>
        </div>

        <p className='text-sm text-gray-600 dark:text-gray-400 mb-4'>
          Please provide a reason for rejecting this refund request.
        </p>

        <textarea
          value={reason}
          onChange={e => {
            setReason(e.target.value)
            setError('')
          }}
          rows={4}
          className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-red-500 dark:bg-gray-800 dark:text-gray-100 ${
            error ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'
          }`}
          placeholder='Enter rejection reason...'
        />

        {error && (
          <p className='mt-2 text-sm text-red-600 flex items-center gap-1'>
            <FaCircleXmark /> {error}
          </p>
        )}

        <div className='flex justify-end gap-3 mt-6'>
          <button
            onClick={onCancel}
            className='px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700'
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className='px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700'
          >
            Confirm Rejection
          </button>
        </div>
      </div>
    </div>
  )
}

// Process Modal
const ProcessModal = ({
  isOpen,
  onConfirm,
  onCancel
}: {
  isOpen: boolean
  onConfirm: (gatewayRefundId: string) => void
  onCancel: () => void
}) => {
  const [gatewayRefundId, setGatewayRefundId] = useState('')
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleConfirm = () => {
    if (!gatewayRefundId.trim()) {
      setError('Gateway Refund ID is required')
      return
    }
    onConfirm(gatewayRefundId)
    setGatewayRefundId('')
    setError('')
  }

  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'>
      <div className='bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-md w-full p-6 animate-fadeIn'>
        <div className='flex items-center gap-3 mb-4'>
          <div className='w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center'>
            <FaMoneyBillTransfer className='text-blue-600 dark:text-blue-400' />
          </div>
          <h3 className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
            Process Refund
          </h3>
        </div>

        <p className='text-sm text-gray-600 dark:text-gray-400 mb-4'>
          Enter the Gateway Refund ID to process this refund.
        </p>

        <input
          type='text'
          value={gatewayRefundId}
          onChange={e => {
            setGatewayRefundId(e.target.value)
            setError('')
          }}
          className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100 ${
            error ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'
          }`}
          placeholder='e.g., GWR-123456'
        />

        {error && (
          <p className='mt-2 text-sm text-red-600 flex items-center gap-1'>
            <FaCircleXmark /> {error}
          </p>
        )}

        <div className='flex justify-end gap-3 mt-6'>
          <button
            onClick={onCancel}
            className='px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700'
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className='px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700'
          >
            Process Refund
          </button>
        </div>
      </div>
    </div>
  )
}

// View Details Modal
const DetailsModal = ({
  isOpen,
  refund,
  onClose
}: {
  isOpen: boolean
  refund: RefundRow | null
  onClose: () => void
}) => {
  if (!isOpen || !refund) return null

  const formatDate = (dateStr?: string) => {
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
            Refund Details
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
            <span className='text-sm text-gray-500'>Current Status</span>
            <StatusBadge status={refund.status} />
          </div>

          {/* Amounts */}
          <div className='grid grid-cols-2 gap-4'>
            <div className='p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg'>
              <p className='text-xs text-gray-500 mb-1'>Refund Amount</p>
              <p className='text-xl font-bold text-gray-900 dark:text-gray-100'>
                ${refund.refundAmount.toFixed(2)}
              </p>
            </div>
            <div className='p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg'>
              <p className='text-xs text-gray-500 mb-1'>Net Amount</p>
              <p className='text-xl font-bold text-green-600'>
                ${refund.netAmount.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Charges */}
          <div className='space-y-2'>
            <h4 className='text-sm font-medium text-gray-700 dark:text-gray-300'>
              Charges Breakdown
            </h4>
            <div className='flex justify-between py-2 border-b border-gray-100 dark:border-gray-800'>
              <span className='text-sm text-gray-600'>Supplier Penalty</span>
              <span className='text-sm font-medium text-gray-900'>
                ${refund.supplierPenalty.toFixed(2)}
              </span>
            </div>
            <div className='flex justify-between py-2 border-b border-gray-100 dark:border-gray-800'>
              <span className='text-sm text-gray-600'>Service Charge</span>
              <span className='text-sm font-medium text-gray-900'>
                ${refund.serviceCharge.toFixed(2)}
              </span>
            </div>
            <div className='flex justify-between py-2'>
              <span className='text-sm font-medium text-gray-700'>
                Total Charges
              </span>
              <span className='text-sm font-medium text-red-600'>
                ${(refund.supplierPenalty + refund.serviceCharge).toFixed(2)}
              </span>
            </div>
          </div>

          {/* Timeline */}
          <div className='space-y-3'>
            <h4 className='text-sm font-medium text-gray-700 dark:text-gray-300'>
              Timeline
            </h4>
            <div className='space-y-2'>
              <div className='flex items-start gap-2'>
                <div className='w-1 h-1 mt-2 rounded-full bg-gray-400'></div>
                <div>
                  <p className='text-xs text-gray-500'>Created</p>
                  <p className='text-sm text-gray-900'>
                    {formatDate(refund.createdAt)} by {refund.createdBy}
                  </p>
                </div>
              </div>
              {refund.approvedAt && (
                <div className='flex items-start gap-2'>
                  <div className='w-1 h-1 mt-2 rounded-full bg-green-400'></div>
                  <div>
                    <p className='text-xs text-green-600'>Approved</p>
                    <p className='text-sm text-gray-900'>
                      {formatDate(refund.approvedAt)} by {refund.approvedBy}
                    </p>
                  </div>
                </div>
              )}
              {refund.rejectedAt && (
                <div className='flex items-start gap-2'>
                  <div className='w-1 h-1 mt-2 rounded-full bg-red-400'></div>
                  <div>
                    <p className='text-xs text-red-600'>Rejected</p>
                    <p className='text-sm text-gray-900'>
                      {formatDate(refund.rejectedAt)} by {refund.rejectedBy}
                    </p>
                    <p className='text-xs text-gray-500 mt-1'>
                      Reason: {refund.rejectedReason}
                    </p>
                  </div>
                </div>
              )}
              {refund.processedAt && (
                <div className='flex items-start gap-2'>
                  <div className='w-1 h-1 mt-2 rounded-full bg-blue-400'></div>
                  <div>
                    <p className='text-xs text-blue-600'>Processed</p>
                    <p className='text-sm text-gray-900'>
                      {formatDate(refund.processedAt)} by {refund.processedBy}
                    </p>
                    {refund.gatewayRefundId && (
                      <p className='text-xs text-gray-500'>
                        Gateway ID: {refund.gatewayRefundId}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const initialRows: RefundRow[] = [
  {
    id: 'REF-001',
    bookingId: 'BK-2034',
    paymentId: 'PMT-2001',
    refundAmount: 500,
    supplierPenalty: 100,
    serviceCharge: 50,
    netAmount: 350,
    status: 'PENDING',
    createdAt: '2026-03-10T10:30:00Z',
    createdBy: 'Alex Morgan'
  },
  {
    id: 'REF-002',
    bookingId: 'BK-2030',
    paymentId: 'PMT-2002',
    refundAmount: 900,
    supplierPenalty: 0,
    serviceCharge: 0,
    netAmount: 900,
    status: 'APPROVED',
    createdAt: '2026-03-09T14:20:00Z',
    createdBy: 'Sarah Lee',
    approvedAt: '2026-03-10T09:15:00Z',
    approvedBy: 'Mike Ross'
  },
  {
    id: 'REF-003',
    bookingId: 'BK-2028',
    paymentId: 'PMT-2003',
    refundAmount: 1200,
    supplierPenalty: 300,
    serviceCharge: 75,
    netAmount: 825,
    status: 'PROCESSED',
    createdAt: '2026-03-08T11:45:00Z',
    createdBy: 'Emma Wilson',
    approvedAt: '2026-03-09T10:30:00Z',
    approvedBy: 'Mike Ross',
    processedAt: '2026-03-10T14:20:00Z',
    processedBy: 'John Smith',
    gatewayRefundId: 'GWR-123456'
  },
  {
    id: 'REF-004',
    bookingId: 'BK-2035',
    paymentId: 'PMT-2004',
    refundAmount: 750,
    supplierPenalty: 200,
    serviceCharge: 25,
    netAmount: 525,
    status: 'REJECTED',
    createdAt: '2026-03-07T09:30:00Z',
    createdBy: 'Alex Morgan',
    rejectedAt: '2026-03-08T11:20:00Z',
    rejectedBy: 'Sarah Lee',
    rejectedReason: 'Insufficient documentation'
  }
]

const RefundsPage = () => {
  const [rows, setRows] = useState(initialRows)
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | RefundStatus>('all')
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
  const [selectedRefund, setSelectedRefund] = useState<RefundRow | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [showProcessModal, setShowProcessModal] = useState(false)
  const [showApproveConfirm, setShowApproveConfirm] = useState(false)
  const [actionRefundId, setActionRefundId] = useState<string | null>(null)

  const pageSize = 5

  const [form, setForm] = useState({
    bookingId: '',
    paymentId: '',
    refundAmount: '' as number | '',
    supplierPenalty: '' as number | '',
    serviceCharge: '' as number | ''
  })

  const bookingOptions = useMemo(
    () => rows.map(item => ({ value: item.bookingId, label: item.bookingId })),
    [rows]
  )

  const paymentOptions = useMemo(
    () =>
      rows
        .filter(item => item.paymentId)
        .map(item => ({
          value: item.paymentId as string,
          label: item.paymentId as string
        })),
    [rows]
  )

  // Filter and pagination
  const filteredRows = useMemo(() => {
    return rows.filter(row => {
      const matchesSearch =
        row.id.toLowerCase().includes(search.toLowerCase()) ||
        row.bookingId.toLowerCase().includes(search.toLowerCase()) ||
        (row.paymentId?.toLowerCase() || '').includes(search.toLowerCase())

      const matchesStatus =
        statusFilter === 'all' || row.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [rows, search, statusFilter])

  const totalPages = Math.ceil(filteredRows.length / pageSize)
  const paginatedRows = filteredRows.slice(
    (page - 1) * pageSize,
    page * pageSize
  )

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToast({ show: true, message, type })
    setTimeout(
      () => setToast({ show: false, message: '', type: 'success' }),
      3000
    )
  }

  const createRefund = () => {
    if (!form.bookingId || form.refundAmount === '') return

    const refundAmount = Number(form.refundAmount)
    const supplierPenalty = Number(form.supplierPenalty || 0)
    const serviceCharge = Number(form.serviceCharge || 0)
    const netAmount = refundAmount - supplierPenalty - serviceCharge

    const newRefund: RefundRow = {
      id: `REF-${String(rows.length + 1).padStart(3, '0')}`,
      bookingId: form.bookingId,
      paymentId: form.paymentId || undefined,
      refundAmount,
      supplierPenalty,
      serviceCharge,
      netAmount,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      createdBy: 'Current User'
    }

    setRows(current => [newRefund, ...current])
    setForm({
      bookingId: '',
      paymentId: '',
      refundAmount: '',
      supplierPenalty: '',
      serviceCharge: ''
    })
    setShowForm(false)
    showToast('Refund created successfully', 'success')
  }

  const handleApprove = (id: string) => {
    setActionRefundId(id)
    setShowApproveConfirm(true)
  }

  const confirmApprove = () => {
    if (actionRefundId) {
      setRows(current =>
        current.map(item =>
          item.id === actionRefundId
            ? {
                ...item,
                status: 'APPROVED',
                approvedAt: new Date().toISOString(),
                approvedBy: 'Current User'
              }
            : item
        )
      )
      showToast('Refund approved successfully', 'success')
      setShowApproveConfirm(false)
      setActionRefundId(null)
    }
  }

  const handleReject = (id: string) => {
    setActionRefundId(id)
    setShowRejectModal(true)
  }

  const confirmReject = (reason: string) => {
    if (actionRefundId) {
      setRows(current =>
        current.map(item =>
          item.id === actionRefundId
            ? {
                ...item,
                status: 'REJECTED',
                rejectedAt: new Date().toISOString(),
                rejectedBy: 'Current User',
                rejectedReason: reason
              }
            : item
        )
      )
      showToast('Refund rejected', 'info')
      setShowRejectModal(false)
      setActionRefundId(null)
    }
  }

  const handleProcess = (id: string) => {
    setActionRefundId(id)
    setShowProcessModal(true)
  }

  const confirmProcess = (gatewayRefundId: string) => {
    if (actionRefundId) {
      setRows(current =>
        current.map(item =>
          item.id === actionRefundId
            ? {
                ...item,
                status: 'PROCESSED',
                processedAt: new Date().toISOString(),
                processedBy: 'Current User',
                gatewayRefundId
              }
            : item
        )
      )
      showToast('Refund processed successfully', 'success')
      setShowProcessModal(false)
      setActionRefundId(null)
    }
  }

  const handleViewDetails = (refund: RefundRow) => {
    setSelectedRefund(refund)
    setShowDetails(true)
  }

  return (
    <div className='space-y-4 sm:space-y-6 px-0 sm:px-0 max-w-9xl mx-auto'>
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
        isOpen={showApproveConfirm}
        title='Approve Refund'
        message='Are you sure you want to approve this refund request?'
        type='info'
        confirmText='Approve'
        onConfirm={confirmApprove}
        onCancel={() => {
          setShowApproveConfirm(false)
          setActionRefundId(null)
        }}
      />

      <RejectModal
        isOpen={showRejectModal}
        onConfirm={confirmReject}
        onCancel={() => {
          setShowRejectModal(false)
          setActionRefundId(null)
        }}
      />

      <ProcessModal
        isOpen={showProcessModal}
        onConfirm={confirmProcess}
        onCancel={() => {
          setShowProcessModal(false)
          setActionRefundId(null)
        }}
      />

      <DetailsModal
        isOpen={showDetails}
        refund={selectedRefund}
        onClose={() => {
          setShowDetails(false)
          setSelectedRefund(null)
        }}
      />

      {/* Header */}
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
        <div>
          <h1 className='text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100'>
            Refunds
          </h1>
          <p className='text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1'>
            Manage refund lifecycle and processing actions
          </p>
        </div>
        <PermissionGate permission='refunds.write'>
          <button
            onClick={() => setShowForm(open => !open)}
            className='inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors w-full sm:w-auto'
          >
            <FaPlus /> Create Refund
          </button>
        </PermissionGate>
      </div>

      {/* Create Form */}
      {showForm && (
        <SurfaceCard className='p-5 border border-gray-200 dark:border-gray-800'>
          <h2 className='text-base font-semibold text-gray-900 dark:text-gray-100 mb-4'>
            New Refund Request
          </h2>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <UUIDSelect
              label='Booking ID *'
              value={form.bookingId}
              onChange={value =>
                setForm(current => ({ ...current, bookingId: value }))
              }
              options={bookingOptions}
              required
            />
            <UUIDSelect
              label='Payment ID'
              value={form.paymentId}
              onChange={value =>
                setForm(current => ({ ...current, paymentId: value }))
              }
              options={paymentOptions}
            />
            <CurrencyInput
              label='Refund Amount *'
              value={form.refundAmount}
              onChange={value =>
                setForm(current => ({ ...current, refundAmount: value }))
              }
              required
            />
            <CurrencyInput
              label='Supplier Penalty'
              value={form.supplierPenalty}
              onChange={value =>
                setForm(current => ({ ...current, supplierPenalty: value }))
              }
            />
            <CurrencyInput
              label='Service Charge'
              value={form.serviceCharge}
              onChange={value =>
                setForm(current => ({ ...current, serviceCharge: value }))
              }
            />
          </div>
          <div className='flex justify-end gap-3 mt-4'>
            <button
              onClick={() => setShowForm(false)}
              className='px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50'
            >
              Cancel
            </button>
            <button
              onClick={createRefund}
              className='px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700'
            >
              Create Refund
            </button>
          </div>
        </SurfaceCard>
      )}

      {/* Filters */}
      <div className='flex flex-col sm:flex-row gap-3'>
        <div className='flex-1 relative'>
          <FaSearch className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm' />
          <input
            type='text'
            value={search}
            onChange={e => {
              setSearch(e.target.value)
              setPage(1)
            }}
            placeholder='Search by ID, booking, payment...'
            className='w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-800'
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => {
            setStatusFilter(e.target.value as any)
            setPage(1)
          }}
          className='px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-800'
        >
          <option value='all'>All Statuses</option>
          <option value='PENDING'>Pending</option>
          <option value='APPROVED'>Approved</option>
          <option value='REJECTED'>Rejected</option>
          <option value='PROCESSED'>Processed</option>
        </select>
      </div>

      {/* Table */}
      <SurfaceCard className='overflow-hidden border border-gray-200 dark:border-gray-800'>
        {paginatedRows.length === 0 ? (
          <div className='p-8'>
            <EmptyState
              title='No refunds found'
              description='Create a new refund request to get started'
              icon={<FaMoneyBillTransfer className='text-4xl' />}
            />
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className='hidden sm:block overflow-x-auto'>
              <table className='w-full'>
                <thead className='bg-gray-50 dark:bg-gray-800/50'>
                  <tr>
                    <th className='px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400'>
                      Refund ID
                    </th>
                    <th className='px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400'>
                      Booking
                    </th>
                    <th className='px-5 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400'>
                      Refund
                    </th>
                    <th className='px-5 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400'>
                      Net Amount
                    </th>
                    <th className='px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400'>
                      Status
                    </th>
                    <th className='px-5 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400'>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-gray-100 dark:divide-gray-800'>
                  {paginatedRows.map(row => (
                    <tr
                      key={row.id}
                      className='hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors'
                    >
                      <td className='px-5 py-4'>
                        <p className='text-sm font-medium text-blue-600 dark:text-blue-400'>
                          {row.id}
                        </p>
                        <p className='text-xs text-gray-500'>
                          {row.paymentId || 'No payment'}
                        </p>
                      </td>
                      <td className='px-5 py-4 text-sm text-gray-700 dark:text-gray-300'>
                        {row.bookingId}
                      </td>
                      <td className='px-5 py-4 text-right'>
                        <p className='text-sm font-medium text-gray-900 dark:text-gray-100'>
                          ${row.refundAmount.toFixed(2)}
                        </p>
                        <p className='text-xs text-gray-500'>
                          Charges: $
                          {(row.supplierPenalty + row.serviceCharge).toFixed(2)}
                        </p>
                      </td>
                      <td className='px-5 py-4 text-right'>
                        <p className='text-sm font-semibold text-green-600'>
                          ${row.netAmount.toFixed(2)}
                        </p>
                      </td>
                      <td className='px-5 py-4'>
                        <StatusBadge status={row.status} />
                      </td>
                      <td className='px-5 py-4 text-right'>
                        <PermissionGate permission='refunds.write'>
                          <div className='flex justify-end gap-2'>
                            <button
                              onClick={() => handleViewDetails(row)}
                              className='p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors'
                              title='View Details'
                            >
                              <FaEye />
                            </button>
                            {row.status === 'PENDING' && (
                              <>
                                <button
                                  onClick={() => handleApprove(row.id)}
                                  className='p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors'
                                  title='Approve'
                                >
                                  <FaCheck />
                                </button>
                                <button
                                  onClick={() => handleReject(row.id)}
                                  className='p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors'
                                  title='Reject'
                                >
                                  <FaCircleXmark />
                                </button>
                              </>
                            )}
                            {row.status === 'APPROVED' && (
                              <button
                                onClick={() => handleProcess(row.id)}
                                className='p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors'
                                title='Process'
                              >
                                <FaMoneyBillTransfer />
                              </button>
                            )}
                          </div>
                        </PermissionGate>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className='sm:hidden divide-y divide-gray-100 dark:divide-gray-800'>
              {paginatedRows.map(row => (
                <div key={row.id} className='p-4 space-y-3'>
                  <div className='flex items-start justify-between'>
                    <div>
                      <p className='text-sm font-medium text-blue-600 dark:text-blue-400'>
                        {row.id}
                      </p>
                      <p className='text-xs text-gray-500'>
                        Booking: {row.bookingId}
                      </p>
                    </div>
                    <StatusBadge status={row.status} />
                  </div>

                  <div className='grid grid-cols-2 gap-2'>
                    <div>
                      <p className='text-xs text-gray-500'>Refund Amount</p>
                      <p className='text-sm font-semibold text-gray-900'>
                        ${row.refundAmount.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className='text-xs text-gray-500'>Net Amount</p>
                      <p className='text-sm font-semibold text-green-600'>
                        ${row.netAmount.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div className='flex justify-end gap-2'>
                    <button
                      onClick={() => handleViewDetails(row)}
                      className='p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg'
                    >
                      <FaEye />
                    </button>
                    {row.status === 'PENDING' && (
                      <>
                        <button
                          onClick={() => handleApprove(row.id)}
                          className='p-2 text-green-600 hover:bg-green-50 rounded-lg'
                        >
                          <FaCheck />
                        </button>
                        <button
                          onClick={() => handleReject(row.id)}
                          className='p-2 text-red-600 hover:bg-red-50 rounded-lg'
                        >
                          <FaCircleXmark />
                        </button>
                      </>
                    )}
                    {row.status === 'APPROVED' && (
                      <button
                        onClick={() => handleProcess(row.id)}
                        className='p-2 text-blue-600 hover:bg-blue-50 rounded-lg'
                      >
                        <FaMoneyBillTransfer />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className='flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-4 border-t border-gray-200 dark:border-gray-800'>
              <p className='text-xs sm:text-sm text-gray-500 order-2 sm:order-1'>
                Showing{' '}
                {Math.min(filteredRows.length, (page - 1) * pageSize + 1)}-
                {Math.min(filteredRows.length, page * pageSize)} of{' '}
                {filteredRows.length}
              </p>
              <div className='flex items-center gap-2 order-1 sm:order-2'>
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className='p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 disabled:opacity-40'
                >
                  <FaChevronLeft />
                </button>
                <span className='px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 text-sm font-medium'>
                  {page}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className='p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 disabled:opacity-40'
                >
                  <FaChevronRight />
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

export default RefundsPage
