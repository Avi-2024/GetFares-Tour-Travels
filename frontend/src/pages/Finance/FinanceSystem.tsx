import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FaBuilding,
  FaUser,
  FaCreditCard,
  FaPlus,
  FaTrash,
  FaSearch,
  FaChevronLeft,
  FaChevronRight,
  FaArrowLeft,
  FaCheck
} from 'react-icons/fa'
import {
  FaXmark,
  FaPenToSquare,
  FaPercent,
  FaFloppyDisk
} from 'react-icons/fa6'
import SurfaceCard from '../../components/ui/SurfaceCard'
import EmptyState from '../../components/ui/EmptyState'

// Types
interface Client {
  id: string
  pan: string
  address: string
  email: string
  phone: string
  name?: string
  currency: string
}

interface Supplier {
  id: string
  pan: string
  gst?: string
  address: string
  email: string
  phone: string
  name?: string
  invoiceDetails: string
  currency: string
}

interface CostBreakup {
  supplierCost: number
  supplierTax: number
  markup: number
  serviceFee: number
  gst: number
  tcs: number
  totalValue: number
  currency: string
}

interface Payment {
  id: string
  mode: 'cash' | 'bank' | 'gateway'
  amount: number
  date: string
  reference?: string
  status: 'pending' | 'completed' | 'failed'
  currency: string
}

// Mock Data
const mockClients: Client[] = [
  {
    id: 'CLT-001',
    pan: 'ABCDE1234F',
    address: '123 Main St, Los Angeles, CA 90210',
    email: 'john.doe@example.com',
    phone: '+1 555 0101',
    name: 'John Doe',
    currency: 'USD'
  },
  {
    id: 'CLT-002',
    pan: 'FGHIJ5678K',
    address: '456 Oak Ave, San Francisco, CA 94105',
    email: 'jane.smith@example.com',
    phone: '+1 555 0102',
    name: 'Jane Smith',
    currency: 'EUR'
  }
]

const mockSuppliers: Supplier[] = [
  {
    id: 'SUP-001',
    pan: 'PQRST9012L',
    gst: 'GST123456',
    address: '789 Pine St, New York, NY 10001',
    email: 'maldives.resorts@example.com',
    phone: '+1 555 0201',
    name: 'Maldives Resorts',
    invoiceDetails: 'Net 30 days',
    currency: 'USD'
  },
  {
    id: 'SUP-002',
    pan: 'UVWXY3456M',
    address: '321 Elm Blvd, Miami, FL 33101',
    email: 'dubai.hotels@example.com',
    phone: '+1 555 0202',
    name: 'Dubai Hotels',
    invoiceDetails: 'Net 15 days',
    currency: 'AED'
  }
]

const mockCostBreakup: CostBreakup = {
  supplierCost: 5000,
  supplierTax: 500,
  markup: 15,
  serviceFee: 200,
  gst: 18,
  tcs: 1,
  totalValue: 6850,
  currency: 'USD'
}

const mockPayments: Payment[] = [
  {
    id: 'PAY-001',
    mode: 'bank',
    amount: 3425,
    date: '2026-03-15',
    reference: 'NEFT-123456',
    status: 'completed',
    currency: 'USD'
  },
  {
    id: 'PAY-002',
    mode: 'gateway',
    amount: 3425,
    date: '2026-03-10',
    reference: 'STRIPE-789012',
    status: 'completed',
    currency: 'USD'
  }
]

// Modal Components
const ClientModal = ({
  isOpen,
  onClose,
  onSave,
  client
}: {
  isOpen: boolean
  onClose: () => void
  onSave: (data: any) => void
  client?: Client | null
}) => {
  const [formData, setFormData] = useState({
    name: client?.name || '',
    pan: client?.pan || '',
    email: client?.email || '',
    phone: client?.phone || '',
    address: client?.address || '',
    currency: client?.currency || 'USD'
  })

  const currencies = ['USD', 'EUR', 'GBP', 'INR', 'AED', 'CAD', 'AUD']

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'>
      <div className='bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto'>
        <div className='sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 p-4 flex items-center justify-between'>
          <h3 className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
            {client ? 'Edit Client' : 'Add New Client'}
          </h3>
          <button
            onClick={onClose}
            className='text-gray-400 hover:text-gray-600'
          >
            <FaXmark className='text-xl' />
          </button>
        </div>

        <form onSubmit={handleSubmit} className='p-6 space-y-4'>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <div>
              <label className='field-label'>Full Name</label>
              <input
                type='text'
                value={formData.name}
                onChange={e =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className='field-input'
                placeholder='John Doe'
              />
            </div>
            <div>
              <label className='field-label'>PAN *</label>
              <input
                type='text'
                required
                value={formData.pan}
                onChange={e =>
                  setFormData({
                    ...formData,
                    pan: e.target.value.toUpperCase()
                  })
                }
                className='field-input'
                placeholder='ABCDE1234F'
                maxLength={10}
              />
            </div>
            <div>
              <label className='field-label'>Email *</label>
              <input
                type='email'
                required
                value={formData.email}
                onChange={e =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className='field-input'
                placeholder='john@example.com'
              />
            </div>
            <div>
              <label className='field-label'>Contact Number *</label>
              <input
                type='tel'
                required
                value={formData.phone}
                onChange={e =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                className='field-input'
                placeholder='+1 555 0101'
              />
            </div>
            <div className='md:col-span-2'>
              <label className='field-label'>Address *</label>
              <textarea
                required
                value={formData.address}
                onChange={e =>
                  setFormData({ ...formData, address: e.target.value })
                }
                rows={3}
                className='field-input'
                placeholder='Enter complete address'
              />
            </div>
            <div>
              <label className='field-label'>Currency</label>
              <select
                value={formData.currency}
                onChange={e =>
                  setFormData({ ...formData, currency: e.target.value })
                }
                className='field-input'
              >
                {currencies.map(c => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className='flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-800'>
            <button
              type='button'
              onClick={onClose}
              className='px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700'
            >
              Cancel
            </button>
            <button
              type='submit'
              className='px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700'
            >
              {client ? 'Update Client' : 'Add Client'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const SupplierModal = ({
  isOpen,
  onClose,
  onSave,
  supplier
}: {
  isOpen: boolean
  onClose: () => void
  onSave: (data: any) => void
  supplier?: Supplier | null
}) => {
  const [formData, setFormData] = useState({
    name: supplier?.name || '',
    pan: supplier?.pan || '',
    gst: supplier?.gst || '',
    email: supplier?.email || '',
    phone: supplier?.phone || '',
    address: supplier?.address || '',
    invoiceDetails: supplier?.invoiceDetails || '',
    currency: supplier?.currency || 'USD'
  })

  const currencies = ['USD', 'EUR', 'GBP', 'INR', 'AED', 'CAD', 'AUD']

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'>
      <div className='bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto'>
        <div className='sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 p-4 flex items-center justify-between'>
          <h3 className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
            {supplier ? 'Edit Supplier' : 'Add New Supplier'}
          </h3>
          <button
            onClick={onClose}
            className='text-gray-400 hover:text-gray-600'
          >
            <FaXmark className='text-xl' />
          </button>
        </div>

        <form onSubmit={handleSubmit} className='p-6 space-y-4'>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <div>
              <label className='field-label'>Supplier Name *</label>
              <input
                type='text'
                required
                value={formData.name}
                onChange={e =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className='field-input'
                placeholder='Maldives Resorts'
              />
            </div>
            <div>
              <label className='field-label'>PAN *</label>
              <input
                type='text'
                required
                value={formData.pan}
                onChange={e =>
                  setFormData({
                    ...formData,
                    pan: e.target.value.toUpperCase()
                  })
                }
                className='field-input'
                placeholder='ABCDE1234F'
                maxLength={10}
              />
            </div>
            <div>
              <label className='field-label'>GST (if applicable)</label>
              <input
                type='text'
                value={formData.gst}
                onChange={e =>
                  setFormData({ ...formData, gst: e.target.value })
                }
                className='field-input'
                placeholder='GST123456'
              />
            </div>
            <div>
              <label className='field-label'>Email *</label>
              <input
                type='email'
                required
                value={formData.email}
                onChange={e =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className='field-input'
                placeholder='supplier@example.com'
              />
            </div>
            <div>
              <label className='field-label'>Contact Number *</label>
              <input
                type='tel'
                required
                value={formData.phone}
                onChange={e =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                className='field-input'
                placeholder='+1 555 0201'
              />
            </div>
            <div>
              <label className='field-label'>Invoice Details</label>
              <input
                type='text'
                value={formData.invoiceDetails}
                onChange={e =>
                  setFormData({ ...formData, invoiceDetails: e.target.value })
                }
                className='field-input'
                placeholder='Net 30 days'
              />
            </div>
            <div className='md:col-span-2'>
              <label className='field-label'>Address *</label>
              <textarea
                required
                value={formData.address}
                onChange={e =>
                  setFormData({ ...formData, address: e.target.value })
                }
                rows={3}
                className='field-input'
                placeholder='Enter complete address'
              />
            </div>
            <div>
              <label className='field-label'>Currency</label>
              <select
                value={formData.currency}
                onChange={e =>
                  setFormData({ ...formData, currency: e.target.value })
                }
                className='field-input'
              >
                {currencies.map(c => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className='flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-800'>
            <button
              type='button'
              onClick={onClose}
              className='px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700'
            >
              Cancel
            </button>
            <button
              type='submit'
              className='px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700'
            >
              {supplier ? 'Update Supplier' : 'Add Supplier'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const PaymentModal = ({
  isOpen,
  onClose,
  onSave
}: {
  isOpen: boolean
  onClose: () => void
  onSave: (data: any) => void
}) => {
  const [formData, setFormData] = useState({
    mode: 'bank' as 'cash' | 'bank' | 'gateway',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    reference: '',
    currency: 'USD'
  })

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      ...formData,
      amount: parseFloat(formData.amount),
      status: 'pending'
    })
  }

  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'>
      <div className='bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-md w-full'>
        <div className='p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between'>
          <h3 className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
            Record Payment
          </h3>
          <button
            onClick={onClose}
            className='text-gray-400 hover:text-gray-600'
          >
            <FaXmark className='text-xl' />
          </button>
        </div>

        <form onSubmit={handleSubmit} className='p-6 space-y-4'>
          <div>
            <label className='field-label'>Payment Mode *</label>
            <select
              required
              value={formData.mode}
              onChange={e =>
                setFormData({ ...formData, mode: e.target.value as any })
              }
              className='field-input'
            >
              <option value='cash'>Cash</option>
              <option value='bank'>Bank Transfer</option>
              <option value='gateway'>Payment Gateway</option>
            </select>
          </div>

          <div>
            <label className='field-label'>Amount *</label>
            <input
              type='number'
              required
              value={formData.amount}
              onChange={e =>
                setFormData({ ...formData, amount: e.target.value })
              }
              className='field-input'
              placeholder='0.00'
              min='0'
              step='0.01'
            />
          </div>

          <div>
            <label className='field-label'>Date *</label>
            <input
              type='date'
              required
              value={formData.date}
              onChange={e => setFormData({ ...formData, date: e.target.value })}
              className='field-input'
            />
          </div>

          <div>
            <label className='field-label'>Reference (Optional)</label>
            <input
              type='text'
              value={formData.reference}
              onChange={e =>
                setFormData({ ...formData, reference: e.target.value })
              }
              className='field-input'
              placeholder='Transaction ID / Reference'
            />
          </div>

          <div>
            <label className='field-label'>Currency</label>
            <select
              value={formData.currency}
              onChange={e =>
                setFormData({ ...formData, currency: e.target.value })
              }
              className='field-input'
            >
              <option value='USD'>USD</option>
              <option value='EUR'>EUR</option>
              <option value='GBP'>GBP</option>
              <option value='INR'>INR</option>
              <option value='AED'>AED</option>
            </select>
          </div>

          <div className='flex justify-end gap-3 pt-4'>
            <button
              type='button'
              onClick={onClose}
              className='px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50'
            >
              Cancel
            </button>
            <button
              type='submit'
              className='px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700'
            >
              Record Payment
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const FinanceSystem: React.FC = () => {
  const navigate = useNavigate()

  // State
  const [activeTab, setActiveTab] = useState<
    'clients' | 'suppliers' | 'cost' | 'payments'
  >('clients')
  const [clients, setClients] = useState(mockClients)
  const [suppliers, setSuppliers] = useState(mockSuppliers)
  const [costBreakup, setCostBreakup] = useState(mockCostBreakup)
  const [payments, setPayments] = useState(mockPayments)
  const [search, setSearch] = useState('')
  const [showClientModal, setShowClientModal] = useState(false)
  const [showSupplierModal, setShowSupplierModal] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
  const [page, setPage] = useState(1)
  const pageSize = 5

  // Filter clients/suppliers
  const filteredClients = clients.filter(
    c =>
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      c.pan.toLowerCase().includes(search.toLowerCase())
  )

  const filteredSuppliers = suppliers.filter(
    s =>
      s.name?.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase()) ||
      s.pan.toLowerCase().includes(search.toLowerCase())
  )

  // Pagination
  const totalPages = Math.ceil(
    (activeTab === 'clients'
      ? filteredClients.length
      : activeTab === 'suppliers'
      ? filteredSuppliers.length
      : payments.length) / pageSize
  )

  const paginatedClients = filteredClients.slice(
    (page - 1) * pageSize,
    page * pageSize
  )
  const paginatedSuppliers = filteredSuppliers.slice(
    (page - 1) * pageSize,
    page * pageSize
  )
  const paginatedPayments = payments.slice(
    (page - 1) * pageSize,
    page * pageSize
  )

  // Handlers
  const handleAddClient = (data: any) => {
    const newClient: Client = {
      id: `CLT-${String(clients.length + 1).padStart(3, '0')}`,
      ...data
    }
    setClients([...clients, newClient])
    setShowClientModal(false)
  }

  const handleUpdateClient = (data: any) => {
    if (!editingClient) return
    setClients(
      clients.map(c => (c.id === editingClient.id ? { ...c, ...data } : c))
    )
    setShowClientModal(false)
    setEditingClient(null)
  }

  const handleDeleteClient = (id: string) => {
    if (window.confirm('Are you sure you want to delete this client?')) {
      setClients(clients.filter(c => c.id !== id))
    }
  }

  const handleAddSupplier = (data: any) => {
    const newSupplier: Supplier = {
      id: `SUP-${String(suppliers.length + 1).padStart(3, '0')}`,
      ...data
    }
    setSuppliers([...suppliers, newSupplier])
    setShowSupplierModal(false)
  }

  const handleUpdateSupplier = (data: any) => {
    if (!editingSupplier) return
    setSuppliers(
      suppliers.map(s => (s.id === editingSupplier.id ? { ...s, ...data } : s))
    )
    setShowSupplierModal(false)
    setEditingSupplier(null)
  }

  const handleDeleteSupplier = (id: string) => {
    if (window.confirm('Are you sure you want to delete this supplier?')) {
      setSuppliers(suppliers.filter(s => s.id !== id))
    }
  }

  const handleAddPayment = (data: any) => {
    const newPayment: Payment = {
      id: `PAY-${String(payments.length + 1).padStart(3, '0')}`,
      ...data,
      status: 'completed'
    }
    setPayments([newPayment, ...payments])
    setShowPaymentModal(false)
  }

  const handleCostUpdate = () => {
    // Recalculate total
    const supplierTotal = costBreakup.supplierCost + costBreakup.supplierTax
    const markupAmount = supplierTotal * (costBreakup.markup / 100)
    const serviceFee = costBreakup.serviceFee
    const gstAmount =
      (supplierTotal + markupAmount + serviceFee) * (costBreakup.gst / 100)
    const tcsAmount =
      (supplierTotal + markupAmount + serviceFee + gstAmount) *
      (costBreakup.tcs / 100)

    setCostBreakup({
      ...costBreakup,
      totalValue:
        supplierTotal + markupAmount + serviceFee + gstAmount + tcsAmount
    })
  }

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  return (
    <main className='flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-950'>
      <div className='max-w-9xl mx-auto px-0 py-4 sm:py-6 lg:py-8'>
        {/* Header */}
        <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 -mt-2 sm:-mt-8'>
          <div>
            <h1 className='text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100'>
              Finance System
            </h1>
            <p className='text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1'>
              Manage clients, suppliers, cost breakdowns, and payments
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className='px-0 sm:px-0 lg:px-0 mb-6'>
          <div className='flex flex-wrap gap-2 border-b border-gray-200 dark:border-gray-800 pb-2'>
            {[
              { id: 'clients', label: 'Client Onboarding', icon: FaUser },
              {
                id: 'suppliers',
                label: 'Supplier Onboarding',
                icon: FaBuilding
              },
              { id: 'cost', label: 'Cost Break-up', icon: FaPercent },
              { id: 'payments', label: 'Payments', icon: FaCreditCard }
            ].map(tab => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as any)
                    setPage(1)
                  }}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <Icon className='text-sm' />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Search and Actions */}
        <div className='px-0 sm:px-0 lg:px-0 mb-6'>
          <div className='flex flex-col sm:flex-row gap-3'>
            <div className='flex-1 relative'>
              <FaSearch className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm' />
              <input
                type='text'
                placeholder={
                  activeTab === 'clients'
                    ? 'Search clients by name, email, or PAN...'
                    : activeTab === 'suppliers'
                    ? 'Search suppliers by name, email, or PAN...'
                    : 'Search payments...'
                }
                value={search}
                onChange={e => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                className='w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-800'
              />
            </div>

            {activeTab === 'clients' && (
              <button
                onClick={() => {
                  setEditingClient(null)
                  setShowClientModal(true)
                }}
                className='inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium'
              >
                <FaPlus /> Add Client
              </button>
            )}

            {activeTab === 'suppliers' && (
              <button
                onClick={() => {
                  setEditingSupplier(null)
                  setShowSupplierModal(true)
                }}
                className='inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium'
              >
                <FaPlus /> Add Supplier
              </button>
            )}

            {activeTab === 'payments' && (
              <button
                onClick={() => setShowPaymentModal(true)}
                className='inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium'
              >
                <FaPlus /> Record Payment
              </button>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className='px-0 sm:px-0 lg:px-0'>
          {/* Clients Tab */}
          {activeTab === 'clients' && (
            <SurfaceCard className='overflow-hidden border border-gray-200 dark:border-gray-800'>
              {paginatedClients.length === 0 ? (
                <div className='p-8'>
                  <EmptyState
                    title='No clients found'
                    description='Add your first client to get started'
                    icon={<FaUser className='text-4xl' />}
                  />
                </div>
              ) : (
                <>
                  {/* Desktop Table */}
                  <div className='hidden md:block overflow-x-auto'>
                    <table className='w-full'>
                      <thead className='bg-gray-50 dark:bg-gray-800/50'>
                        <tr>
                          <th className='px-6 py-3 text-left text-xs font-semibold text-gray-500'>
                            Name
                          </th>
                          <th className='px-6 py-3 text-left text-xs font-semibold text-gray-500'>
                            PAN
                          </th>
                          <th className='px-6 py-3 text-left text-xs font-semibold text-gray-500'>
                            Email
                          </th>
                          <th className='px-6 py-3 text-left text-xs font-semibold text-gray-500'>
                            Phone
                          </th>
                          <th className='px-6 py-3 text-left text-xs font-semibold text-gray-500'>
                            Currency
                          </th>
                          <th className='px-6 py-3 text-right text-xs font-semibold text-gray-500'>
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className='divide-y divide-gray-100 dark:divide-gray-800'>
                        {paginatedClients.map(client => (
                          <tr
                            key={client.id}
                            className='hover:bg-gray-50 dark:hover:bg-gray-800/50'
                          >
                            <td className='px-6 py-4 text-sm text-gray-900 dark:text-gray-100'>
                              {client.name}
                            </td>
                            <td className='px-6 py-4 text-sm text-gray-700 dark:text-gray-300'>
                              {client.pan}
                            </td>
                            <td className='px-6 py-4 text-sm text-gray-700 dark:text-gray-300'>
                              {client.email}
                            </td>
                            <td className='px-6 py-4 text-sm text-gray-700 dark:text-gray-300'>
                              {client.phone}
                            </td>
                            <td className='px-6 py-4 text-sm text-gray-700 dark:text-gray-300'>
                              {client.currency}
                            </td>
                            <td className='px-6 py-4 text-right'>
                              <div className='flex justify-end gap-2'>
                                <button
                                  onClick={() => {
                                    setEditingClient(client)
                                    setShowClientModal(true)
                                  }}
                                  className='p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg'
                                  title='Edit'
                                >
                                  <FaPenToSquare />
                                </button>
                                <button
                                  onClick={() => handleDeleteClient(client.id)}
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

                  {/* Mobile Cards */}
                  <div className='md:hidden divide-y divide-gray-100 dark:divide-gray-800'>
                    {paginatedClients.map(client => (
                      <div key={client.id} className='p-4 space-y-2'>
                        <div className='flex items-start justify-between'>
                          <div>
                            <p className='text-sm font-medium text-gray-900 dark:text-gray-100'>
                              {client.name}
                            </p>
                            <p className='text-xs text-gray-500'>
                              PAN: {client.pan}
                            </p>
                          </div>
                          <div className='flex gap-1'>
                            <button
                              onClick={() => {
                                setEditingClient(client)
                                setShowClientModal(true)
                              }}
                              className='p-1.5 text-gray-500 hover:text-green-600'
                            >
                              <FaPenToSquare />
                            </button>
                            <button
                              onClick={() => handleDeleteClient(client.id)}
                              className='p-1.5 text-gray-500 hover:text-red-600'
                            >
                              <FaTrash />
                            </button>
                          </div>
                        </div>
                        <p className='text-xs text-gray-600'>{client.email}</p>
                        <p className='text-xs text-gray-600'>{client.phone}</p>
                        <p className='text-xs text-gray-600'>
                          Currency: {client.currency}
                        </p>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </SurfaceCard>
          )}

          {/* Suppliers Tab */}
          {activeTab === 'suppliers' && (
            <SurfaceCard className='overflow-hidden border border-gray-200 dark:border-gray-800'>
              {paginatedSuppliers.length === 0 ? (
                <div className='p-8'>
                  <EmptyState
                    title='No suppliers found'
                    description='Add your first supplier to get started'
                    icon={<FaBuilding className='text-4xl' />}
                  />
                </div>
              ) : (
                <>
                  {/* Desktop Table */}
                  <div className='hidden md:block overflow-x-auto'>
                    <table className='w-full'>
                      <thead className='bg-gray-50 dark:bg-gray-800/50'>
                        <tr>
                          <th className='px-6 py-3 text-left text-xs font-semibold text-gray-500'>
                            Name
                          </th>
                          <th className='px-6 py-3 text-left text-xs font-semibold text-gray-500'>
                            PAN
                          </th>
                          <th className='px-6 py-3 text-left text-xs font-semibold text-gray-500'>
                            GST
                          </th>
                          <th className='px-6 py-3 text-left text-xs font-semibold text-gray-500'>
                            Email
                          </th>
                          <th className='px-6 py-3 text-left text-xs font-semibold text-gray-500'>
                            Currency
                          </th>
                          <th className='px-6 py-3 text-right text-xs font-semibold text-gray-500'>
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className='divide-y divide-gray-100 dark:divide-gray-800'>
                        {paginatedSuppliers.map(supplier => (
                          <tr
                            key={supplier.id}
                            className='hover:bg-gray-50 dark:hover:bg-gray-800/50'
                          >
                            <td className='px-6 py-4 text-sm text-gray-900 dark:text-gray-100'>
                              {supplier.name}
                            </td>
                            <td className='px-6 py-4 text-sm text-gray-700 dark:text-gray-300'>
                              {supplier.pan}
                            </td>
                            <td className='px-6 py-4 text-sm text-gray-700 dark:text-gray-300'>
                              {supplier.gst || '-'}
                            </td>
                            <td className='px-6 py-4 text-sm text-gray-700 dark:text-gray-300'>
                              {supplier.email}
                            </td>
                            <td className='px-6 py-4 text-sm text-gray-700 dark:text-gray-300'>
                              {supplier.currency}
                            </td>
                            <td className='px-6 py-4 text-right'>
                              <div className='flex justify-end gap-2'>
                                <button
                                  onClick={() => {
                                    setEditingSupplier(supplier)
                                    setShowSupplierModal(true)
                                  }}
                                  className='p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg'
                                  title='Edit'
                                >
                                  <FaPenToSquare />
                                </button>
                                <button
                                  onClick={() =>
                                    handleDeleteSupplier(supplier.id)
                                  }
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

                  {/* Mobile Cards */}
                  <div className='md:hidden divide-y divide-gray-100 dark:divide-gray-800'>
                    {paginatedSuppliers.map(supplier => (
                      <div key={supplier.id} className='p-4 space-y-2'>
                        <div className='flex items-start justify-between'>
                          <div>
                            <p className='text-sm font-medium text-gray-900 dark:text-gray-100'>
                              {supplier.name}
                            </p>
                            <p className='text-xs text-gray-500'>
                              PAN: {supplier.pan}
                            </p>
                          </div>
                          <div className='flex gap-1'>
                            <button
                              onClick={() => {
                                setEditingSupplier(supplier)
                                setShowSupplierModal(true)
                              }}
                              className='p-1.5 text-gray-500 hover:text-green-600'
                            >
                              <FaPenToSquare />
                            </button>
                            <button
                              onClick={() => handleDeleteSupplier(supplier.id)}
                              className='p-1.5 text-gray-500 hover:text-red-600'
                            >
                              <FaTrash />
                            </button>
                          </div>
                        </div>
                        {supplier.gst && (
                          <p className='text-xs text-gray-600'>
                            GST: {supplier.gst}
                          </p>
                        )}
                        <p className='text-xs text-gray-600'>
                          {supplier.email}
                        </p>
                        <p className='text-xs text-gray-600'>
                          Phone: {supplier.phone}
                        </p>
                        <p className='text-xs text-gray-600'>
                          Currency: {supplier.currency}
                        </p>
                        <p className='text-xs text-gray-600'>
                          Invoice: {supplier.invoiceDetails}
                        </p>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </SurfaceCard>
          )}

          {/* Cost Break-up Tab */}
          {activeTab === 'cost' && (
            <SurfaceCard className='p-6 border border-gray-200 dark:border-gray-800'>
              <h2 className='text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6'>
                Cost Break-up Details
              </h2>

              <div className='grid grid-cols-1 lg:grid-cols-2 gap-8'>
                {/* Input Section */}
                <div className='space-y-4'>
                  <div className='grid grid-cols-2 gap-4'>
                    <div>
                      <label className='field-label'>Supplier Cost</label>
                      <input
                        type='number'
                        value={costBreakup.supplierCost}
                        onChange={e =>
                          setCostBreakup({
                            ...costBreakup,
                            supplierCost: parseFloat(e.target.value) || 0
                          })
                        }
                        className='field-input'
                      />
                    </div>
                    <div>
                      <label className='field-label'>Supplier Tax</label>
                      <input
                        type='number'
                        value={costBreakup.supplierTax}
                        onChange={e =>
                          setCostBreakup({
                            ...costBreakup,
                            supplierTax: parseFloat(e.target.value) || 0
                          })
                        }
                        className='field-input'
                      />
                    </div>
                  </div>

                  <div>
                    <label className='field-label'>Our Markup (%)</label>
                    <input
                      type='number'
                      value={costBreakup.markup}
                      onChange={e =>
                        setCostBreakup({
                          ...costBreakup,
                          markup: parseFloat(e.target.value) || 0
                        })
                      }
                      className='field-input'
                    />
                  </div>

                  <div>
                    <label className='field-label'>Service Fee</label>
                    <input
                      type='number'
                      value={costBreakup.serviceFee}
                      onChange={e =>
                        setCostBreakup({
                          ...costBreakup,
                          serviceFee: parseFloat(e.target.value) || 0
                        })
                      }
                      className='field-input'
                    />
                  </div>

                  <div className='grid grid-cols-2 gap-4'>
                    <div>
                      <label className='field-label'>GST (%)</label>
                      <input
                        type='number'
                        value={costBreakup.gst}
                        onChange={e =>
                          setCostBreakup({
                            ...costBreakup,
                            gst: parseFloat(e.target.value) || 0
                          })
                        }
                        className='field-input'
                      />
                    </div>
                    <div>
                      <label className='field-label'>TCS (%)</label>
                      <input
                        type='number'
                        value={costBreakup.tcs}
                        onChange={e =>
                          setCostBreakup({
                            ...costBreakup,
                            tcs: parseFloat(e.target.value) || 0
                          })
                        }
                        className='field-input'
                      />
                    </div>
                  </div>

                  <div>
                    <label className='field-label'>Currency</label>
                    <select
                      value={costBreakup.currency}
                      onChange={e =>
                        setCostBreakup({
                          ...costBreakup,
                          currency: e.target.value
                        })
                      }
                      className='field-input'
                    >
                      <option value='USD'>USD</option>
                      <option value='EUR'>EUR</option>
                      <option value='GBP'>GBP</option>
                      <option value='INR'>INR</option>
                      <option value='AED'>AED</option>
                    </select>
                  </div>

                  <button
                    onClick={handleCostUpdate}
                    className='w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2'
                  >
                    <FaFloppyDisk /> Update Calculation
                  </button>
                </div>

                {/* Summary Section */}
                <div className='bg-gray-50 dark:bg-gray-800/50 rounded-xl p-6 space-y-4'>
                  <h3 className='text-sm font-semibold text-gray-700 dark:text-gray-300'>
                    Cost Summary
                  </h3>

                  <div className='space-y-3'>
                    <div className='flex justify-between py-2 border-b border-gray-200 dark:border-gray-700'>
                      <span className='text-sm text-gray-600'>
                        Supplier Cost
                      </span>
                      <span className='text-sm font-medium text-gray-900'>
                        {formatCurrency(
                          costBreakup.supplierCost,
                          costBreakup.currency
                        )}
                      </span>
                    </div>

                    <div className='flex justify-between py-2 border-b border-gray-200 dark:border-gray-700'>
                      <span className='text-sm text-gray-600'>
                        Supplier Tax
                      </span>
                      <span className='text-sm font-medium text-gray-900'>
                        {formatCurrency(
                          costBreakup.supplierTax,
                          costBreakup.currency
                        )}
                      </span>
                    </div>

                    <div className='flex justify-between py-2 border-b border-gray-200 dark:border-gray-700'>
                      <span className='text-sm text-gray-600'>
                        Markup ({costBreakup.markup}%)
                      </span>
                      <span className='text-sm font-medium text-green-600'>
                        {formatCurrency(
                          (costBreakup.supplierCost + costBreakup.supplierTax) *
                            (costBreakup.markup / 100),
                          costBreakup.currency
                        )}
                      </span>
                    </div>

                    <div className='flex justify-between py-2 border-b border-gray-200 dark:border-gray-700'>
                      <span className='text-sm text-gray-600'>Service Fee</span>
                      <span className='text-sm font-medium text-gray-900'>
                        {formatCurrency(
                          costBreakup.serviceFee,
                          costBreakup.currency
                        )}
                      </span>
                    </div>

                    <div className='flex justify-between py-2 border-b border-gray-200 dark:border-gray-700'>
                      <span className='text-sm text-gray-600'>
                        GST ({costBreakup.gst}%)
                      </span>
                      <span className='text-sm font-medium text-blue-600'>
                        {formatCurrency(
                          (costBreakup.supplierCost +
                            costBreakup.supplierTax +
                            (costBreakup.supplierCost +
                              costBreakup.supplierTax) *
                              (costBreakup.markup / 100) +
                            costBreakup.serviceFee) *
                            (costBreakup.gst / 100),
                          costBreakup.currency
                        )}
                      </span>
                    </div>

                    <div className='flex justify-between py-2 border-b border-gray-200 dark:border-gray-700'>
                      <span className='text-sm text-gray-600'>
                        TCS ({costBreakup.tcs}%)
                      </span>
                      <span className='text-sm font-medium text-purple-600'>
                        {formatCurrency(
                          (costBreakup.supplierCost +
                            costBreakup.supplierTax +
                            (costBreakup.supplierCost +
                              costBreakup.supplierTax) *
                              (costBreakup.markup / 100) +
                            costBreakup.serviceFee +
                            (costBreakup.supplierCost +
                              costBreakup.supplierTax +
                              (costBreakup.supplierCost +
                                costBreakup.supplierTax) *
                                (costBreakup.markup / 100) +
                              costBreakup.serviceFee) *
                              (costBreakup.gst / 100)) *
                            (costBreakup.tcs / 100),
                          costBreakup.currency
                        )}
                      </span>
                    </div>

                    <div className='flex justify-between pt-4 text-base font-bold'>
                      <span className='text-gray-900 dark:text-gray-100'>
                        Total Value
                      </span>
                      <span className='text-blue-600'>
                        {formatCurrency(
                          costBreakup.totalValue,
                          costBreakup.currency
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </SurfaceCard>
          )}

          {/* Payments Tab */}
          {activeTab === 'payments' && (
            <SurfaceCard className='overflow-hidden border border-gray-200 dark:border-gray-800'>
              {paginatedPayments.length === 0 ? (
                <div className='p-8'>
                  <EmptyState
                    title='No payments found'
                    description='Record your first payment to get started'
                    icon={<FaCreditCard className='text-4xl' />}
                  />
                </div>
              ) : (
                <>
                  {/* Desktop Table */}
                  <div className='hidden md:block overflow-x-auto'>
                    <table className='w-full'>
                      <thead className='bg-gray-50 dark:bg-gray-800/50'>
                        <tr>
                          <th className='px-6 py-3 text-left text-xs font-semibold text-gray-500'>
                            Payment ID
                          </th>
                          <th className='px-6 py-3 text-left text-xs font-semibold text-gray-500'>
                            Mode
                          </th>
                          <th className='px-6 py-3 text-right text-xs font-semibold text-gray-500'>
                            Amount
                          </th>
                          <th className='px-6 py-3 text-left text-xs font-semibold text-gray-500'>
                            Date
                          </th>
                          <th className='px-6 py-3 text-left text-xs font-semibold text-gray-500'>
                            Reference
                          </th>
                          <th className='px-6 py-3 text-left text-xs font-semibold text-gray-500'>
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className='divide-y divide-gray-100 dark:divide-gray-800'>
                        {paginatedPayments.map(payment => (
                          <tr
                            key={payment.id}
                            className='hover:bg-gray-50 dark:hover:bg-gray-800/50'
                          >
                            <td className='px-6 py-4 text-sm font-medium text-blue-600'>
                              {payment.id}
                            </td>
                            <td className='px-6 py-4 text-sm text-gray-700 capitalize'>
                              {payment.mode}
                            </td>
                            <td className='px-6 py-4 text-right text-sm font-medium text-gray-900'>
                              {formatCurrency(payment.amount, payment.currency)}
                            </td>
                            <td className='px-6 py-4 text-sm text-gray-700'>
                              {payment.date}
                            </td>
                            <td className='px-6 py-4 text-sm text-gray-700'>
                              {payment.reference || '-'}
                            </td>
                            <td className='px-6 py-4'>
                              <span
                                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                  payment.status === 'completed'
                                    ? 'bg-green-100 text-green-800'
                                    : payment.status === 'pending'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-red-100 text-red-800'
                                }`}
                              >
                                {payment.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Cards */}
                  <div className='md:hidden divide-y divide-gray-100 dark:divide-gray-800'>
                    {paginatedPayments.map(payment => (
                      <div key={payment.id} className='p-4 space-y-2'>
                        <div className='flex items-start justify-between'>
                          <p className='text-sm font-medium text-blue-600'>
                            {payment.id}
                          </p>
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
                        <div className='flex justify-between'>
                          <span className='text-sm capitalize'>
                            {payment.mode}
                          </span>
                          <span className='text-sm font-bold text-gray-900'>
                            {formatCurrency(payment.amount, payment.currency)}
                          </span>
                        </div>
                        <p className='text-xs text-gray-600'>
                          Date: {payment.date}
                        </p>
                        {payment.reference && (
                          <p className='text-xs text-gray-600'>
                            Ref: {payment.reference}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </SurfaceCard>
          )}

          {/* Pagination */}
          {(activeTab === 'clients' && filteredClients.length > pageSize) ||
          (activeTab === 'suppliers' && filteredSuppliers.length > pageSize) ||
          (activeTab === 'payments' && payments.length > pageSize) ? (
            <div className='flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-4 border-t border-gray-200 dark:border-gray-800'>
              <p className='text-xs sm:text-sm text-gray-500 order-2 sm:order-1'>
                Showing{' '}
                {Math.min(
                  activeTab === 'clients'
                    ? filteredClients.length
                    : activeTab === 'suppliers'
                    ? filteredSuppliers.length
                    : payments.length,
                  (page - 1) * pageSize + 1
                )}
                -
                {Math.min(
                  activeTab === 'clients'
                    ? filteredClients.length
                    : activeTab === 'suppliers'
                    ? filteredSuppliers.length
                    : payments.length,
                  page * pageSize
                )}{' '}
                of{' '}
                {activeTab === 'clients'
                  ? filteredClients.length
                  : activeTab === 'suppliers'
                  ? filteredSuppliers.length
                  : payments.length}
              </p>
              <div className='flex items-center gap-2 order-1 sm:order-2'>
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className='p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 disabled:opacity-40'
                >
                  <FaChevronLeft className='text-sm' />
                </button>
                <span className='px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 text-sm font-medium'>
                  {page}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className='p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 disabled:opacity-40'
                >
                  <FaChevronRight className='text-sm' />
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Modals */}
      <ClientModal
        isOpen={showClientModal}
        onClose={() => {
          setShowClientModal(false)
          setEditingClient(null)
        }}
        onSave={editingClient ? handleUpdateClient : handleAddClient}
        client={editingClient}
      />

      <SupplierModal
        isOpen={showSupplierModal}
        onClose={() => {
          setShowSupplierModal(false)
          setEditingSupplier(null)
        }}
        onSave={editingSupplier ? handleUpdateSupplier : handleAddSupplier}
        supplier={editingSupplier}
      />

      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onSave={handleAddPayment}
      />

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

export default FinanceSystem
