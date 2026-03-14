import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

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
  updatedAt: string
  totalBookings: number
  lastBookingDate?: string
}

interface Booking {
  id: string
  bookingNumber: string
  destination: string
  travelDate: string
  amount: number
  status: string
}

const CustomerDetailPage: React.FC = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [error] = useState('')

  // Mock data - replace with API call
  const [customer, setCustomer] = useState<Customer>({
    id: id || '1',
    fullName: 'Sarah Connor',
    phone: '+1 555 0100',
    email: 'sarah.connor@example.com',
    preferences:
      'Beach resorts, All-inclusive packages, Ocean view rooms, Late check-out',
    lifetimeValue: 12500,
    segment: 'VIP',
    panNumber: 'ABCDE1234F',
    addressLine: '123 Main St, Los Angeles, CA 90210',
    clientCurrency: 'USD',
    createdAt: '2023-01-15T10:30:00Z',
    updatedAt: '2024-02-10T14:20:00Z',
    totalBookings: 4,
    lastBookingDate: '2024-02-10'
  })

  const [recentBookings] = useState<Booking[]>([
    {
      id: 'b1',
      bookingNumber: 'BK-2024-001',
      destination: 'Maldives',
      travelDate: '2024-02-10',
      amount: 4250,
      status: 'CONFIRMED'
    },
    {
      id: 'b2',
      bookingNumber: 'BK-2023-089',
      destination: 'Dubai',
      travelDate: '2023-12-15',
      amount: 3800,
      status: 'COMPLETED'
    },
    {
      id: 'b3',
      bookingNumber: 'BK-2023-045',
      destination: 'Thailand',
      travelDate: '2023-08-20',
      amount: 2950,
      status: 'COMPLETED'
    }
  ])

  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    preferences: '',
    segment: 'REGULAR' as 'VIP' | 'HIGH_VALUE' | 'REGULAR' | 'NEW',
    panNumber: '',
    addressLine: '',
    clientCurrency: 'USD'
  })

  const [formErrors, setFormErrors] = useState({
    fullName: '',
    email: ''
  })

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setFormData({
        fullName: customer.fullName,
        phone: customer.phone,
        email: customer.email,
        preferences: customer.preferences,
        segment: customer.segment,
        panNumber: customer.panNumber,
        addressLine: customer.addressLine,
        clientCurrency: customer.clientCurrency
      })
      setLoading(false)
    }, 500)
  }, [id, customer])

  const segments = [
    { value: 'VIP', label: 'VIP' },
    { value: 'HIGH_VALUE', label: 'High Value' },
    { value: 'REGULAR', label: 'Regular' },
    { value: 'NEW', label: 'New' }
  ]

  const currencies = [
    { value: 'USD', label: 'USD ($)' },
    { value: 'EUR', label: 'EUR (€)' },
    { value: 'GBP', label: 'GBP (£)' },
    { value: 'INR', label: 'INR (₹)' },
    { value: 'AED', label: 'AED (د.إ)' }
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

  const validateForm = () => {
    const errors = {
      fullName: '',
      email: ''
    }
    let isValid = true

    if (!formData.fullName.trim()) {
      errors.fullName = 'Full name is required'
      isValid = false
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Invalid email format'
      isValid = false
    }

    setFormErrors(errors)
    return isValid
  }

  const handleSave = () => {
    if (!validateForm()) return

    setLoading(true)
    setTimeout(() => {
      setCustomer(prev => ({
        ...prev,
        ...formData,
        updatedAt: new Date().toISOString()
      }))
      setIsEditing(false)
      setLoading(false)
    }, 500)
  }

  const handleCancel = () => {
    setFormData({
      fullName: customer.fullName,
      phone: customer.phone,
      email: customer.email,
      preferences: customer.preferences,
      segment: customer.segment,
      panNumber: customer.panNumber,
      addressLine: customer.addressLine,
      clientCurrency: customer.clientCurrency
    })
    setFormErrors({ fullName: '', email: '' })
    setIsEditing(false)
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: customer.clientCurrency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  if (loading) {
    return (
      <main className='flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-950'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
          <div className='animate-pulse space-y-6'>
            <div className='h-8 bg-gray-200 dark:bg-gray-800 rounded w-1/4'></div>
            <div className='h-64 bg-gray-200 dark:bg-gray-800 rounded-xl'></div>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className='flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100'>
      <div className='max-w-7xl mx-auto'>
        {/* Header */}
        <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6'>
          <div>
            <p className='text-sm text-gray-500 dark:text-gray-400 mb-1'>
              Customer Profile
            </p>
            <div className='flex items-center gap-3 flex-wrap'>
              <h1 className='text-2xl font-bold text-gray-900 dark:text-gray-100'>
                {customer.fullName}
              </h1>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${getSegmentClass(
                  customer.segment
                )}`}
              >
                {customer.segment.replace('_', ' ')}
              </span>
            </div>
            <p className='text-sm text-gray-500 dark:text-gray-400 mt-1'>
              Customer ID: #{customer.id}
            </p>
          </div>
          <div className='flex gap-2'>
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className='px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors'
              >
                Edit Profile
              </button>
            ) : (
              <>
                <button
                  onClick={handleCancel}
                  className='px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors'
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className='px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors'
                >
                  Save Changes
                </button>
              </>
            )}
          </div>
        </div>

        {error && (
          <div className='mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg'>
            <p className='text-sm text-red-600 dark:text-red-400'>{error}</p>
          </div>
        )}

        {/* Split Layout */}
        <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
          {/* Left Column - Main Content */}
          <div className='lg:col-span-2 space-y-6'>
            {/* Profile Details Card */}
            <div className='bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden'>
              <div className='px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50'>
                <h2 className='text-sm font-semibold text-gray-900 dark:text-gray-100'>
                  Profile Information
                </h2>
              </div>

              <div className='p-6'>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                  {/* Full Name */}
                  <div>
                    <label className='block text-xs text-gray-500 dark:text-gray-400 mb-1'>
                      Full Name <span className='text-red-500'>*</span>
                    </label>
                    {isEditing ? (
                      <>
                        <input
                          type='text'
                          value={formData.fullName}
                          onChange={e =>
                            setFormData({
                              ...formData,
                              fullName: e.target.value
                            })
                          }
                          className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100 ${
                            formErrors.fullName
                              ? 'border-red-500 dark:border-red-500'
                              : 'border-gray-300 dark:border-gray-700'
                          }`}
                        />
                        {formErrors.fullName && (
                          <p className='mt-1 text-xs text-red-500 dark:text-red-400'>
                            {formErrors.fullName}
                          </p>
                        )}
                      </>
                    ) : (
                      <p className='text-sm font-medium text-gray-900 dark:text-gray-100'>
                        {customer.fullName}
                      </p>
                    )}
                  </div>

                  {/* Phone */}
                  <div>
                    <label className='block text-xs text-gray-500 dark:text-gray-400 mb-1'>
                      Phone
                    </label>
                    {isEditing ? (
                      <input
                        type='text'
                        value={formData.phone}
                        onChange={e =>
                          setFormData({ ...formData, phone: e.target.value })
                        }
                        className='w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100'
                      />
                    ) : (
                      <p className='text-sm text-gray-900 dark:text-gray-100'>
                        {customer.phone}
                      </p>
                    )}
                  </div>

                  {/* Email */}
                  <div>
                    <label className='block text-xs text-gray-500 dark:text-gray-400 mb-1'>
                      Email
                    </label>
                    {isEditing ? (
                      <>
                        <input
                          type='email'
                          value={formData.email}
                          onChange={e =>
                            setFormData({ ...formData, email: e.target.value })
                          }
                          className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100 ${
                            formErrors.email
                              ? 'border-red-500 dark:border-red-500'
                              : 'border-gray-300 dark:border-gray-700'
                          }`}
                        />
                        {formErrors.email && (
                          <p className='mt-1 text-xs text-red-500 dark:text-red-400'>
                            {formErrors.email}
                          </p>
                        )}
                      </>
                    ) : (
                      <p className='text-sm text-gray-900 dark:text-gray-100'>
                        {customer.email}
                      </p>
                    )}
                  </div>

                  {/* PAN Number */}
                  <div>
                    <label className='block text-xs text-gray-500 dark:text-gray-400 mb-1'>
                      PAN Number
                    </label>
                    {isEditing ? (
                      <input
                        type='text'
                        value={formData.panNumber}
                        onChange={e =>
                          setFormData({
                            ...formData,
                            panNumber: e.target.value
                          })
                        }
                        className='w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100'
                        placeholder='ABCDE1234F'
                      />
                    ) : (
                      <p className='text-sm text-gray-900 dark:text-gray-100'>
                        {customer.panNumber || 'Not provided'}
                      </p>
                    )}
                  </div>

                  {/* Client Currency */}
                  <div>
                    <label className='block text-xs text-gray-500 dark:text-gray-400 mb-1'>
                      Preferred Currency
                    </label>
                    {isEditing ? (
                      <select
                        value={formData.clientCurrency}
                        onChange={e =>
                          setFormData({
                            ...formData,
                            clientCurrency: e.target.value
                          })
                        }
                        className='w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100'
                      >
                        {currencies.map(c => (
                          <option key={c.value} value={c.value}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p className='text-sm text-gray-900 dark:text-gray-100'>
                        {customer.clientCurrency}
                      </p>
                    )}
                  </div>

                  {/* Segment */}
                  <div>
                    <label className='block text-xs text-gray-500 dark:text-gray-400 mb-1'>
                      Segment
                    </label>
                    {isEditing ? (
                      <select
                        value={formData.segment}
                        onChange={e =>
                          setFormData({
                            ...formData,
                            segment: e.target.value as any
                          })
                        }
                        className='w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100'
                      >
                        {segments.map(s => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span
                        className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium border ${getSegmentClass(
                          customer.segment
                        )}`}
                      >
                        {customer.segment.replace('_', ' ')}
                      </span>
                    )}
                  </div>

                  {/* Address */}
                  <div className='md:col-span-2'>
                    <label className='block text-xs text-gray-500 dark:text-gray-400 mb-1'>
                      Address
                    </label>
                    {isEditing ? (
                      <textarea
                        value={formData.addressLine}
                        onChange={e =>
                          setFormData({
                            ...formData,
                            addressLine: e.target.value
                          })
                        }
                        rows={3}
                        className='w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100'
                        placeholder='Enter full address'
                      />
                    ) : (
                      <p className='text-sm text-gray-900 dark:text-gray-100'>
                        {customer.addressLine || 'No address provided'}
                      </p>
                    )}
                  </div>

                  {/* Preferences */}
                  <div className='md:col-span-2'>
                    <label className='block text-xs text-gray-500 dark:text-gray-400 mb-1'>
                      Preferences
                    </label>
                    {isEditing ? (
                      <textarea
                        value={formData.preferences}
                        onChange={e =>
                          setFormData({
                            ...formData,
                            preferences: e.target.value
                          })
                        }
                        rows={3}
                        className='w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100'
                        placeholder='Travel preferences, special requirements...'
                      />
                    ) : (
                      <p className='text-sm text-gray-900 dark:text-gray-100'>
                        {customer.preferences || 'No preferences specified'}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Bookings */}
            <div className='bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden'>
              <div className='px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 flex justify-between items-center'>
                <h2 className='text-sm font-semibold text-gray-900 dark:text-gray-100'>
                  Recent Bookings
                </h2>
                <button
                  onClick={() => navigate('/bookings')}
                  className='text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium'
                >
                  View All
                </button>
              </div>

              <div className='p-6'>
                <div className='space-y-3'>
                  {recentBookings.map(booking => (
                    <div
                      key={booking.id}
                      className='flex items-center justify-between p-3 border border-gray-100 dark:border-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer'
                      onClick={() => navigate(`/bookings/${booking.id}`)}
                    >
                      <div className='flex items-center gap-3'>
                        <div className='w-8 h-8 rounded bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400'>
                          B
                        </div>
                        <div>
                          <p className='text-sm font-medium text-gray-900 dark:text-gray-100'>
                            {booking.bookingNumber}
                          </p>
                          <p className='text-xs text-gray-500 dark:text-gray-400'>
                            {booking.destination} • {booking.travelDate}
                          </p>
                        </div>
                      </div>
                      <div className='text-right'>
                        <p className='text-sm font-medium text-gray-900 dark:text-gray-100'>
                          {formatCurrency(booking.amount)}
                        </p>
                        <p className='text-xs text-gray-500 dark:text-gray-400'>
                          {booking.status}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Sidebar */}
          <div className='lg:col-span-1 space-y-6'>
            {/* Customer Stats Card */}
            <div className='bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden'>
              <div className='px-5 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50'>
                <h3 className='text-xs font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wide'>
                  Customer Statistics
                </h3>
              </div>
              <div className='p-5 space-y-4'>
                <div>
                  <p className='text-xs text-gray-500 dark:text-gray-400 mb-1'>
                    Lifetime Value
                  </p>
                  <p className='text-2xl font-bold text-gray-900 dark:text-gray-100'>
                    {formatCurrency(customer.lifetimeValue)}
                  </p>
                </div>

                <div className='flex justify-between items-center py-2 border-t border-gray-100 dark:border-gray-800'>
                  <span className='text-sm text-gray-600 dark:text-gray-400'>
                    Total Bookings
                  </span>
                  <span className='text-sm font-semibold text-gray-900 dark:text-gray-100'>
                    {customer.totalBookings}
                  </span>
                </div>

                <div className='flex justify-between items-center py-2 border-t border-gray-100 dark:border-gray-800'>
                  <span className='text-sm text-gray-600 dark:text-gray-400'>
                    Last Booking
                  </span>
                  <span className='text-sm font-semibold text-gray-900 dark:text-gray-100'>
                    {customer.lastBookingDate || 'N/A'}
                  </span>
                </div>

                <div className='flex justify-between items-center py-2 border-t border-gray-100 dark:border-gray-800'>
                  <span className='text-sm text-gray-600 dark:text-gray-400'>
                    Customer Since
                  </span>
                  <span className='text-sm font-semibold text-gray-900 dark:text-gray-100'>
                    {formatDate(customer.createdAt).split(',')[0]}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Actions Card */}
            <div className='bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden'>
              <div className='px-5 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50'>
                <h3 className='text-xs font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wide'>
                  Quick Actions
                </h3>
              </div>
              <div className='p-5 space-y-2'>
                <button
                  onClick={() => navigate('/leads/new')}
                  className='w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors'
                >
                  Create Lead
                </button>
                <button
                  onClick={() => navigate('/quotations/new')}
                  className='w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors'
                >
                  Create Quotation
                </button>
                <button
                  onClick={() => navigate('/bookings/new')}
                  className='w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors'
                >
                  Create Booking
                </button>
              </div>
            </div>

            {/* Metadata Card */}
            <div className='bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden'>
              <div className='px-5 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50'>
                <h3 className='text-xs font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wide'>
                  Metadata
                </h3>
              </div>
              <div className='p-5 space-y-3 text-sm'>
                <div className='flex justify-between'>
                  <span className='text-gray-500 dark:text-gray-400'>
                    Created
                  </span>
                  <span className='text-gray-900 dark:text-gray-100 font-medium'>
                    {formatDate(customer.createdAt)}
                  </span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-gray-500 dark:text-gray-400'>
                    Last Updated
                  </span>
                  <span className='text-gray-900 dark:text-gray-100 font-medium'>
                    {formatDate(customer.updatedAt)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

export default CustomerDetailPage
