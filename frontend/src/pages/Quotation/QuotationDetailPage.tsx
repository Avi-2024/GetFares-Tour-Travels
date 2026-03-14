import React, { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  FaArrowLeft,
  FaCheck,
  FaCopy,
  FaDownload,
  FaEnvelope,
  FaEye,
  FaPlus,
  FaXmark,
  FaPaperPlane,
  FaFilePdf,
  FaTrash
} from 'react-icons/fa6'
import { FaHistory } from 'react-icons/fa'
import SurfaceCard from '../../components/ui/SurfaceCard'
import StatusBadge from '../../components/ui/StatusBadge'
import EmptyState from '../../components/ui/EmptyState'
import { validateQuoteTransition } from '../../utils/workflowValidation'

type QuoteStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'SENT'

interface ComponentRow {
  id: string
  itemType: 'HOTEL' | 'FLIGHT' | 'TRANSFER' | 'VISA' | 'INSURANCE' | 'OTHER'
  description: string
  cost: number
}

interface Version {
  id: string
  version: number
  createdAt: string
  createdBy: string
  changes: string
}

interface SendLog {
  id: string
  sentAt: string
  sentTo: string
  method: 'email' | 'whatsapp'
  viewedAt?: string
  viewCount: number
}

const seedRows: ComponentRow[] = [
  {
    id: '1',
    itemType: 'HOTEL',
    description: '5N Beach Resort - Deluxe Room',
    cost: 3200
  },
  {
    id: '2',
    itemType: 'TRANSFER',
    description: 'Airport Return Private Transfer',
    cost: 220
  },
  {
    id: '3',
    itemType: 'VISA',
    description: 'Tourist Visa Processing (per person)',
    cost: 180
  }
]

const seedVersions: Version[] = [
  {
    id: 'v1',
    version: 1,
    createdAt: '2026-03-10T10:30Z',
    createdBy: 'Alex Morgan',
    changes: 'Initial draft created'
  },
  {
    id: 'v2',
    version: 2,
    createdAt: '2026-03-11T14:20Z',
    createdBy: 'Sarah Lee',
    changes: 'Updated hotel costs based on availability'
  }
]

const seedLogs: SendLog[] = [
  {
    id: 'l1',
    sentAt: '2026-03-11T15:00Z',
    sentTo: 'sarah.j@example.com',
    method: 'email',
    viewedAt: '2026-03-11T16:30Z',
    viewCount: 3
  },
  {
    id: 'l2',
    sentAt: '2026-03-12T09:15Z',
    sentTo: '+1 555 1234',
    method: 'whatsapp',
    viewCount: 1
  }
]

const QuotationDetailPage: React.FC = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState<QuoteStatus>('PENDING')
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('components')
  const [showSendDropdown, setShowSendDropdown] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [showAddComponentModal, setShowAddComponentModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteCandidateId, setDeleteCandidateId] = useState<string | null>(
    null
  )
  const [rejectReason, setRejectReason] = useState('')
  const [rejectError, setRejectError] = useState('')

  // New component form state
  const [newComponent, setNewComponent] = useState({
    itemType: 'HOTEL' as ComponentRow['itemType'],
    description: '',
    cost: ''
  })
  const [componentError, setComponentError] = useState('')

  const [rows, setRows] = useState(seedRows)
  const [versions] = useState(seedVersions)
  const [logs] = useState(seedLogs)

  const summary = useMemo(() => {
    const totalCost = rows.reduce((sum, row) => sum + row.cost, 0)
    const marginPercent = 14
    const discount = 120
    const taxAmount = (totalCost - discount) * 0.1
    const finalPrice = totalCost - discount + taxAmount
    return { totalCost, marginPercent, discount, taxAmount, finalPrice }
  }, [rows])

  const changeStatus = (nextStatus: QuoteStatus) => {
    if (nextStatus === 'REJECTED') {
      setShowRejectModal(true)
      return
    }
    setError('')
    setStatus(nextStatus)
  }

  const handleRejectConfirm = () => {
    if (!rejectReason.trim()) {
      setRejectError('Reason is required for REJECTED status')
      return
    }

    const validationError = validateQuoteTransition('REJECTED', rejectReason)
    if (validationError) {
      setRejectError(validationError)
      return
    }

    setStatus('REJECTED')
    setReason(rejectReason)
    setShowRejectModal(false)
    setRejectReason('')
    setRejectError('')
  }

  const handleSend = (method: 'email' | 'whatsapp') => {
    console.log(`Sending via ${method}`)
    setStatus('SENT')
    setShowSendDropdown(false)

    // Add to send logs
    const newLog: SendLog = {
      id: `log-${Date.now()}`,
      sentAt: new Date().toISOString(),
      sentTo: method === 'email' ? 'customer@example.com' : '+1 555 1234',
      method: method,
      viewCount: 0
    }
    // In real app, would add to logs state via API
  }

  const handleDeleteRow = (id: string) => {
    setDeleteCandidateId(id)
    setShowDeleteModal(true)
  }

  const confirmDeleteRow = () => {
    if (!deleteCandidateId) return
    setRows(prev => prev.filter(row => row.id !== deleteCandidateId))
    setDeleteCandidateId(null)
    setShowDeleteModal(false)
  }

  const cancelDelete = () => {
    setDeleteCandidateId(null)
    setShowDeleteModal(false)
  }

  const handleCopyRow = (row: ComponentRow) => {
    const newRow = { ...row, id: Date.now().toString() }
    setRows(prev => [...prev, newRow])
  }

  const handleAddComponent = () => {
    // Validate
    if (!newComponent.description.trim()) {
      setComponentError('Description is required')
      return
    }
    if (!newComponent.cost || parseFloat(newComponent.cost) <= 0) {
      setComponentError('Valid cost is required')
      return
    }

    const newRow: ComponentRow = {
      id: Date.now().toString(),
      itemType: newComponent.itemType,
      description: newComponent.description,
      cost: parseFloat(newComponent.cost)
    }

    setRows(prev => [...prev, newRow])
    setShowAddComponentModal(false)
    setNewComponent({ itemType: 'HOTEL', description: '', cost: '' })
    setComponentError('')
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const tabs = [
    { id: 'components', label: 'Components', icon: FaPlus },
    { id: 'versions', label: 'Versions', icon: FaHistory },
    { id: 'logs', label: 'Send Logs', icon: FaEye }
  ]

  const itemTypes = [
    { value: 'HOTEL', label: 'Hotel' },
    { value: 'FLIGHT', label: 'Flight' },
    { value: 'TRANSFER', label: 'Transfer' },
    { value: 'VISA', label: 'Visa' },
    { value: 'INSURANCE', label: 'Insurance' },
    { value: 'OTHER', label: 'Other' }
  ]

  return (
    <div className='space-y-4 sm:space-y-6 px-4 sm:px-0'>
      {/* Header */}
      <div className='flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4'>
        <div>
          <button
            onClick={() => navigate('/quotations')}
            className='mb-2 inline-flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors'
          >
            <FaArrowLeft className='text-xs' /> Back to Quotations
          </button>
          <div className='flex items-center justify-between gap-2'>
            <h1 className='text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100'>
              Quotation #{id}
            </h1>
            <div className='sm:hidden'>
              <StatusBadge status={status} />
            </div>
          </div>
          <div className='flex items-center gap-2 mt-1'>
            <p className='text-xs sm:text-sm text-gray-500'>
              Created Mar 10, 2026
            </p>
            <span className='text-gray-300'>•</span>
            <p className='text-xs sm:text-sm text-gray-500'>
              Last updated 2h ago
            </p>
          </div>
        </div>

        <div className='flex flex-wrap items-center gap-2'>
          <div className='hidden sm:flex'>
            <StatusBadge status={status} />
          </div>

          {/* Action Buttons */}
          <div className='flex flex-wrap items-center gap-2 w-full sm:w-auto'>
            {/* PDF Button */}
            <button className='flex-1 sm:flex-none h-9 px-3 sm:px-4 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors inline-flex items-center justify-center sm:justify-start'>
              <FaFilePdf className='mr-2' />
              <span className='hidden sm:inline'>PDF</span>
            </button>

            {/* Send Button with Dropdown */}
            <div className='relative flex-1 sm:flex-none'>
              <button
                onClick={() => setShowSendDropdown(!showSendDropdown)}
                className='w-full h-9 px-3 sm:px-4 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors inline-flex items-center justify-center sm:justify-start'
              >
                <FaPaperPlane className='mr-2' />
                <span className='hidden sm:inline'>Send</span>
              </button>

              {showSendDropdown && (
                <>
                  <div
                    className='fixed inset-0 z-10'
                    onClick={() => setShowSendDropdown(false)}
                  />
                  <div className='absolute right-0 mt-1 w-full sm:w-40 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20 py-1'>
                    <button
                      onClick={() => handleSend('email')}
                      className='w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2'
                    >
                      <FaEnvelope className='text-gray-500' /> Email
                    </button>
                    <button
                      onClick={() => handleSend('whatsapp')}
                      className='w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2'
                    >
                      <FaPaperPlane className='text-green-500' /> WhatsApp
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Approve Button */}
            <button
              onClick={() => changeStatus('APPROVED')}
              className='flex-1 sm:flex-none h-9 px-3 sm:px-4 rounded-lg bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 transition-colors inline-flex items-center justify-center sm:justify-start'
            >
              <FaCheck className='mr-2' />
              <span>Approve</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2 sm:gap-4'>
        {[
          {
            label: 'Total Cost',
            value: `$${summary.totalCost.toLocaleString()}`,
            sub: 'Supplier cost'
          },
          {
            label: 'Margin',
            value: `${summary.marginPercent}%`,
            sub: '14% margin'
          },
          {
            label: 'Discount',
            value: `$${summary.discount.toLocaleString()}`,
            sub: 'Special offer'
          },
          {
            label: 'Final Price',
            value: `$${summary.finalPrice.toLocaleString()}`,
            sub: 'Inc. taxes',
            highlight: true
          }
        ].map(item => (
          <SurfaceCard
            key={item.label}
            className='p-3 sm:p-5 hover:shadow-md transition-shadow'
          >
            {/* Mobile Layout */}
            <div className='sm:hidden'>
              <p className='text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1'>
                {item.label}
              </p>
              <div className='flex items-center justify-between'>
                <p
                  className={`text-lg font-bold ${
                    item.highlight
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-gray-900 dark:text-gray-100'
                  }`}
                >
                  {item.value}
                </p>
                <p className='text-xs text-gray-500 dark:text-gray-400'>
                  {item.sub}
                </p>
              </div>
            </div>

            {/* Desktop Layout (unchanged) */}
            <div className='hidden sm:block'>
              <p className='text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400'>
                {item.label}
              </p>
              <p
                className={`text-xl sm:text-2xl font-bold mt-1 ${
                  item.highlight
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-gray-900 dark:text-gray-100'
                }`}
              >
                {item.value}
              </p>
              <p className='text-xs text-gray-500 dark:text-gray-400 mt-1'>
                {item.sub}
              </p>
            </div>
          </SurfaceCard>
        ))}
      </div>

      {/* Main Card */}
      <SurfaceCard className='overflow-hidden border border-gray-200 dark:border-gray-800'>
        {/* Tabs */}
        <div className='border-b border-gray-200 dark:border-gray-800 p-3 sm:p-4'>
          {/* Mobile Dropdown */}
          <div className='sm:hidden'>
            <select
              value={activeTab}
              onChange={e => setActiveTab(e.target.value)}
              className='w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm'
            >
              {tabs.map(tab => (
                <option key={tab.id} value={tab.id}>
                  {tab.label}
                </option>
              ))}
            </select>
          </div>

          {/* Desktop Tabs */}
          <div className='hidden sm:flex items-center justify-between'>
            <div className='flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg'>
              {tabs.map(tab => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-2 ${
                      activeTab === tab.id
                        ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                    }`}
                  >
                    <Icon className='text-sm' />
                    {tab.label}
                  </button>
                )
              })}
            </div>

            {/* Status Actions - Working Now */}
            <div className='flex items-center gap-2'>
              <button
                onClick={() => changeStatus('PENDING')}
                className='px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors'
              >
                Mark Pending
              </button>
              <button
                onClick={() => changeStatus('REJECTED')}
                className='px-3 py-1.5 text-xs rounded-lg border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors'
              >
                Reject
              </button>
            </div>
          </div>

          {/* Mobile Status Actions */}
          <div className='sm:hidden flex items-center justify-between mt-3'>
            <div className='flex gap-2'>
              <button
                onClick={() => changeStatus('PENDING')}
                className='px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300'
              >
                Pending
              </button>
              <button
                onClick={() => changeStatus('REJECTED')}
                className='px-3 py-1.5 text-xs rounded-lg border border-red-200 text-red-600'
              >
                Reject
              </button>
            </div>
          </div>

          {/* Inline Rejection Input (Fallback) */}
          {status === 'REJECTED' && !showRejectModal && (
            <div className='mt-3'>
              <input
                value={reason}
                onChange={e => setReason(e.target.value)}
                className='w-full px-3 py-2 text-sm border border-red-300 dark:border-red-700 rounded-lg focus:ring-2 focus:ring-red-500 dark:bg-gray-800'
                placeholder='Reason is required for REJECTED status'
              />
              {error && <p className='mt-1 text-xs text-red-500'>{error}</p>}
            </div>
          )}
        </div>

        {/* Tab Content */}
        <div className='p-4'>
          {/* Components Tab */}
          {activeTab === 'components' && (
            <div className='space-y-4'>
              {/* Mobile Cards */}
              <div className='sm:hidden space-y-3'>
                {rows.map(row => (
                  <div
                    key={row.id}
                    className='bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 space-y-3'
                  >
                    <div className='flex items-center justify-between'>
                      <span className='text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                        {row.itemType}
                      </span>
                      <div className='flex gap-2'>
                        <button
                          onClick={() => handleCopyRow(row)}
                          className='p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors'
                          title='Copy'
                        >
                          <FaCopy className='text-sm' />
                        </button>
                        <button
                          onClick={() => handleDeleteRow(row.id)}
                          className='p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors'
                          title='Delete'
                        >
                          <FaTrash className='text-sm' />
                        </button>
                      </div>
                    </div>
                    <p className='text-sm text-gray-900 dark:text-gray-100 font-medium'>
                      {row.description}
                    </p>
                    <p className='text-lg font-bold text-gray-900 dark:text-gray-100'>
                      ${row.cost.toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>

              {/* Desktop Table */}
              <div className='hidden sm:block overflow-x-auto'>
                <table className='w-full'>
                  <thead>
                    <tr className='border-b border-gray-200 dark:border-gray-800'>
                      <th className='pb-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                        Type
                      </th>
                      <th className='pb-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                        Description
                      </th>
                      <th className='pb-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                        Cost
                      </th>
                      <th className='pb-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className='divide-y divide-gray-100 dark:divide-gray-800'>
                    {rows.map(row => (
                      <tr
                        key={row.id}
                        className='hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors'
                      >
                        <td className='py-4 text-sm text-gray-700 dark:text-gray-300'>
                          {row.itemType}
                        </td>
                        <td className='py-4 text-sm text-gray-900 dark:text-gray-100'>
                          {row.description}
                        </td>
                        <td className='py-4 text-right text-sm font-medium text-gray-900 dark:text-gray-100'>
                          ${row.cost.toLocaleString()}
                        </td>
                        <td className='py-4 text-right'>
                          <div className='flex justify-end gap-2'>
                            <button
                              onClick={() => handleCopyRow(row)}
                              className='p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors'
                              title='Copy'
                            >
                              <FaCopy />
                            </button>
                            <button
                              onClick={() => handleDeleteRow(row.id)}
                              className='p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors'
                              title='Delete'
                            >
                              <FaXmark />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Add Component Button */}
              <div className='flex justify-center sm:justify-start pt-2'>
                <button
                  onClick={() => setShowAddComponentModal(true)}
                  className='inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors'
                >
                  <FaPlus /> Add Component
                </button>
              </div>
            </div>
          )}

          {/* Versions Tab */}
          {activeTab === 'versions' && (
            <div className='space-y-3'>
              {versions.length > 0 ? (
                versions.map(v => (
                  <div
                    key={v.id}
                    className='flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg'
                  >
                    <div className='w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0'>
                      <FaHistory className='text-blue-600 dark:text-blue-400 text-sm' />
                    </div>
                    <div className='flex-1 min-w-0'>
                      <div className='flex items-center justify-between gap-2'>
                        <p className='text-sm font-semibold text-gray-900 dark:text-gray-100'>
                          Version {v.version}
                        </p>
                        <p className='text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap'>
                          {formatDate(v.createdAt)}
                        </p>
                      </div>
                      <p className='text-xs text-gray-600 dark:text-gray-300 mt-1'>
                        {v.changes}
                      </p>
                      <p className='text-xs text-gray-500 dark:text-gray-400 mt-1'>
                        by {v.createdBy}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState
                  title='No versions yet'
                  description='Save changes to generate new versions'
                  icon={<FaHistory className='text-4xl' />}
                />
              )}
            </div>
          )}

          {/* Send Logs Tab */}
          {activeTab === 'logs' && (
            <div className='space-y-3'>
              {logs.length > 0 ? (
                logs.map(log => (
                  <div
                    key={log.id}
                    className='p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg space-y-2'
                  >
                    <div className='flex items-center justify-between'>
                      <div className='flex items-center gap-2'>
                        {log.method === 'email' ? (
                          <FaEnvelope className='text-blue-500' />
                        ) : (
                          <FaPaperPlane className='text-green-500' />
                        )}
                        <p className='text-sm font-medium text-gray-900 dark:text-gray-100'>
                          Sent via {log.method}
                        </p>
                      </div>
                      <p className='text-xs text-gray-500 dark:text-gray-400'>
                        {formatDate(log.sentAt)}
                      </p>
                    </div>
                    <p className='text-xs text-gray-600 dark:text-gray-300'>
                      To: {log.sentTo}
                    </p>
                    {log.viewedAt ? (
                      <p className='text-xs text-green-600 dark:text-green-400 flex items-center gap-1'>
                        <FaEye /> Viewed {log.viewCount} times • Last{' '}
                        {formatDate(log.viewedAt)}
                      </p>
                    ) : (
                      <p className='text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1'>
                        <FaEye /> Not viewed yet
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <EmptyState
                  title='No send logs'
                  description='Send this quotation to track views'
                  icon={<FaEye className='text-4xl' />}
                />
              )}
            </div>
          )}
        </div>
      </SurfaceCard>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'>
          <div className='bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-md w-full p-6'>
            <div className='flex items-center justify-between mb-4'>
              <h3 className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
                Reject Quotation
              </h3>
              <button
                onClick={() => setShowRejectModal(false)}
                className='text-gray-400 hover:text-gray-600'
              >
                <FaXmark className='text-xl' />
              </button>
            </div>

            <p className='text-sm text-gray-600 dark:text-gray-400 mb-4'>
              Please provide a reason for rejecting this quotation. This is
              required.
            </p>

            <textarea
              value={rejectReason}
              onChange={e => {
                setRejectReason(e.target.value)
                setRejectError('')
              }}
              rows={4}
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-red-500 dark:bg-gray-800 dark:text-gray-100 ${
                rejectError
                  ? 'border-red-500'
                  : 'border-gray-300 dark:border-gray-700'
              }`}
              placeholder='Enter rejection reason...'
            />

            {rejectError && (
              <p className='mt-2 text-sm text-red-600 flex items-center gap-1'>
                <FaXmark /> {rejectError}
              </p>
            )}

            <div className='flex justify-end gap-3 mt-6'>
              <button
                onClick={() => setShowRejectModal(false)}
                className='px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700'
              >
                Cancel
              </button>
              <button
                onClick={handleRejectConfirm}
                className='px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors'
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Component Modal */}
      {showAddComponentModal && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'>
          <div className='bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-md w-full p-6'>
            <div className='flex items-center justify-between mb-4'>
              <h3 className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
                Add Component
              </h3>
              <button
                onClick={() => {
                  setShowAddComponentModal(false)
                  setNewComponent({
                    itemType: 'HOTEL',
                    description: '',
                    cost: ''
                  })
                  setComponentError('')
                }}
                className='text-gray-400 hover:text-gray-600'
              >
                <FaXmark className='text-xl' />
              </button>
            </div>

            <div className='space-y-4'>
              <div>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                  Item Type
                </label>
                <select
                  value={newComponent.itemType}
                  onChange={e =>
                    setNewComponent({
                      ...newComponent,
                      itemType: e.target.value as any
                    })
                  }
                  className='w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100'
                >
                  {itemTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                  Description <span className='text-red-500'>*</span>
                </label>
                <input
                  type='text'
                  value={newComponent.description}
                  onChange={e =>
                    setNewComponent({
                      ...newComponent,
                      description: e.target.value
                    })
                  }
                  className='w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100'
                  placeholder='e.g., 5N Beach Resort - Deluxe Room'
                />
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                  Cost ($) <span className='text-red-500'>*</span>
                </label>
                <input
                  type='number'
                  value={newComponent.cost}
                  onChange={e =>
                    setNewComponent({ ...newComponent, cost: e.target.value })
                  }
                  className='w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100'
                  placeholder='0.00'
                  min='0'
                  step='0.01'
                />
              </div>

              {componentError && (
                <p className='text-sm text-red-600 flex items-center gap-1'>
                  <FaXmark /> {componentError}
                </p>
              )}
            </div>

            <div className='flex justify-end gap-3 mt-6'>
              <button
                onClick={() => {
                  setShowAddComponentModal(false)
                  setNewComponent({
                    itemType: 'HOTEL',
                    description: '',
                    cost: ''
                  })
                  setComponentError('')
                }}
                className='px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700'
              >
                Cancel
              </button>
              <button
                onClick={handleAddComponent}
                className='px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors'
              >
                Add Component
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'>
          <div className='bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-sm w-full p-6'>
            <div className='flex items-start justify-between gap-3'>
              <div>
                <p className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
                  Delete component?
                </p>
                <p className='text-sm text-gray-500 dark:text-gray-400 mt-1'>
                  Are you sure you want to delete this component from the
                  quotation? This action cannot be undone.
                </p>
              </div>
              <button
                onClick={cancelDelete}
                className='text-gray-400 hover:text-gray-600'
                aria-label='Close'
              >
                <FaXmark className='text-xl' />
              </button>
            </div>
            <div className='mt-6 flex justify-end gap-2'>
              <button
                onClick={cancelDelete}
                className='px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700'
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteRow}
                className='px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700'
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default QuotationDetailPage
