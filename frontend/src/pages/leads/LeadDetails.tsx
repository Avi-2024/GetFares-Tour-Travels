import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { validateLeadTransition } from '../../utils/workflowValidation'

const LeadDetails: React.FC = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const [leadStatus, setLeadStatus] = useState('NEW')
  const [leadError, setLeadError] = useState('')
  const [activeTab, setActiveTab] = useState('overview')
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  
  // Mock data
  const [timeline, setTimeline] = useState<any[]>([
    {
      id: 1,
      icon: 'fa-solid fa-phone',
      bg: 'bg-blue-100',
      color: 'text-blue-600',
      title: 'Outbound Call',
      user: 'Alex Morgan',
      time: 'Today, 10:30 AM',
      description: 'Spoke with Sarah regarding her Maldives trip. She is interested in the overwater villa options at Constance Moofushi. Budget is flexible if the value is right.',
      tags: [{ label: 'Connected', icon: 'fa-solid fa-check', bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-100' }],
      meta: 'Duration: 12m 45s',
      action: { label: 'Play Recording', icon: 'fa-solid fa-play' }
    },
    {
      id: 2,
      icon: 'fa-regular fa-envelope',
      bg: 'bg-purple-100',
      color: 'text-purple-600',
      title: 'Email Sent',
      user: 'System Automation',
      time: 'Yesterday, 4:15 PM',
      description: 'Sent "Welcome to TravelCRM - Maldives Packages" brochure.',
      attachment: { name: 'Maldives_Brochure_2023.pdf', icon: 'fa-regular fa-file-pdf', color: 'text-red-500' },
      meta: 'Opened 2 times'
    }
  ])
  
  const [followups, setFollowups] = useState<any[]>([
    { id: 1, type: 'Call', scheduledAt: '2023-11-15T10:00:00Z', notes: 'Follow up on Maldives package interest', status: 'pending' },
    { id: 2, type: 'Email', scheduledAt: '2023-11-16T14:00:00Z', notes: 'Send detailed itinerary options', status: 'pending' }
  ])


  useEffect(() => {
    // Simulate loading - using id parameter
    console.log('Loading lead:', id)
  }, [id])

  const markLost = () => {
    const closedReason = window.prompt('Closed reason is required for LOST lead status.')
    const error = validateLeadTransition('LOST', closedReason ?? '')
    setLeadError(error)
    if (!error && closedReason) {
      setLeadStatus('LOST')
      // Add to timeline
      const newTimelineItem = {
        id: Date.now(),
        icon: 'fa-solid fa-ban',
        bg: 'bg-red-100',
        color: 'text-red-600',
        title: 'Lead Marked as Lost',
        user: 'Current User',
        time: new Date().toLocaleString(),
        description: `Lead marked as lost. Reason: ${closedReason}`,
        tags: [{ label: 'Lost', icon: 'fa-solid fa-ban', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-100' }]
      }
      setTimeline(prev => [newTimelineItem, ...prev])
    }
  }

  const handleAssignLead = () => {
    const userId = window.prompt('Enter user name to assign lead to:')
    if (!userId) return
    
    const newTimelineItem = {
      id: Date.now(),
      icon: 'fa-solid fa-user-plus',
      bg: 'bg-green-100',
      color: 'text-green-600',
      title: 'Lead Assigned',
      user: 'Current User',
      time: new Date().toLocaleString(),
      description: `Lead assigned to ${userId}`,
      tags: [{ label: 'Assigned', icon: 'fa-solid fa-user-check', bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-100' }]
    }
    setTimeline(prev => [newTimelineItem, ...prev])
    setLeadError('')
  }

  const handleScheduleFollowup = () => {
    const followupDate = '2023-11-15'
    const followupTime = '10:00'
    const followupType = 'Call'
    
    const newFollowup = {
      id: Date.now(),
      type: followupType,
      scheduledAt: `${followupDate}T${followupTime}:00Z`,
      notes: `Scheduled ${followupType.toLowerCase()} follow-up`,
      status: 'pending'
    }
    
    setFollowups(prev => [...prev, newFollowup])
    
    const newTimelineItem = {
      id: Date.now() + 1,
      icon: 'fa-regular fa-calendar-check',
      bg: 'bg-blue-100',
      color: 'text-blue-600',
      title: 'Follow-up Scheduled',
      user: 'Current User',
      time: new Date().toLocaleString(),
      description: `${followupType} follow-up scheduled for ${new Date(followupDate).toLocaleDateString()} at ${followupTime}`,
      tags: [{ label: 'Scheduled', icon: 'fa-solid fa-calendar', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-100' }]
    }
    
    setTimeline(prev => [newTimelineItem, ...prev])
    setLeadError('')
  }

  const handleAddNote = () => {
    const newNote = 'Sample note'
    
    const newTimelineItem = {
      id: Date.now(),
      icon: 'fa-regular fa-sticky-note',
      bg: 'bg-yellow-100',
      color: 'text-yellow-600',
      title: 'Note Added',
      user: 'Current User',
      time: new Date().toLocaleString(),
      description: newNote
    }
    
    setTimeline(prev => [newTimelineItem, ...prev])
    setLeadError('')
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: 'fa-solid fa-table-columns' },
    {
      id: 'followups',
      label: 'Follow-ups',
      icon: 'fa-solid fa-list-check',
      badge: followups.length
    },
    {
      id: 'quotations',
      label: 'Quotations',
      icon: 'fa-solid fa-file-invoice-dollar'
    },
    { id: 'documents', label: 'Documents', icon: 'fa-solid fa-folder-open' }
  ]

  const actions = [
    {
      label: 'Assign',
      icon: 'fa-solid fa-user-plus',
      onClick: handleAssignLead,
      variant: 'secondary' as const
    },
    {
      label: 'Mark Lost',
      icon: 'fa-solid fa-ban',
      onClick: markLost,
      variant: 'danger' as const
    },
    {
      label: 'Create Quotation',
      icon: 'fa-solid fa-file-invoice-dollar',
      onClick: () => navigate('/quotations/builder'),
      variant: 'secondary' as const
    },
    {
      label: 'Create Booking',
      icon: 'fa-solid fa-check',
      onClick: () => navigate('/bookings'),
      variant: 'primary' as const
    },
    {
      label: 'Add Payment',
      icon: 'fa-solid fa-credit-card',
      onClick: () => navigate('/payments'),
      variant: 'secondary' as const
    },
    {
      label: 'Create Visa Case',
      icon: 'fa-solid fa-passport',
      onClick: () => navigate('/visa/visa-1'),
      variant: 'secondary' as const
    },
    {
      label: 'Raise Complaint',
      icon: 'fa-solid fa-triangle-exclamation',
      onClick: () => navigate('/complaints'),
      variant: 'secondary' as const
    }
  ]

  return (
    <main className='flex-1 overflow-y-auto bg-gray-50'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8'>
        {/* Mobile Header with Menu Toggle */}
        <div className='lg:hidden flex items-center justify-between mb-4'>
          <div className='flex items-center gap-3'>
            <div className='w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-base font-bold border border-blue-200'>
              SC
            </div>
            <div>
              <h1 className='text-lg font-bold text-gray-900'>Sarah Connor</h1>
              <p className='text-xs text-gray-500'>#LD-2023-001</p>
            </div>
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
        <div className='hidden lg:flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6'>
          <div className='flex items-center gap-4'>
            <div className='w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xl font-bold border border-blue-200 shadow-sm'>
              SC
            </div>
            <div>
              <div className='flex items-center gap-3'>
                <h1 className='text-2xl font-bold text-gray-900'>
                  Sarah Connor
                </h1>
                <span
                  className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    leadStatus === 'LOST'
                      ? 'bg-red-100 text-red-800 border-red-200'
                      : 'bg-green-100 text-green-800 border-green-200'
                  } border`}
                >
                  {leadStatus}
                </span>
              </div>
              <div className='flex items-center gap-4 text-sm text-gray-500 mt-1.5'>
                <span className='flex items-center gap-1.5'>
                  <i className='fa-regular fa-id-card w-4'></i> #LD-2023-001
                </span>
                <span className='flex items-center gap-1.5'>
                  <i className='fa-solid fa-globe w-4'></i> Website
                </span>
                <span className='flex items-center gap-1.5'>
                  <i className='fa-regular fa-clock w-4'></i> Created 2h ago
                </span>
              </div>
            </div>
          </div>
        </div>

      
        {isMobileMenuOpen && (
          <div className='lg:hidden mb-4 bg-white rounded-xl shadow-lg border border-gray-200 p-2 animate-fadeIn'>
            <div className='grid grid-cols-2 gap-1'>
              {actions.map((action, index) => (
                <button
                  key={index}
                  onClick={action.onClick}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    action.variant === 'primary'
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : action.variant === 'danger'
                      ? 'bg-red-50 text-red-600 hover:bg-red-100'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <i
                    className={`${action.icon} ${
                      action.variant === 'primary'
                        ? 'text-white'
                        : action.variant === 'danger'
                        ? 'text-red-500'
                        : 'text-gray-400'
                    }`}
                  ></i>
                  <span className='truncate'>{action.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Desktop Actions */}
        <div className='hidden lg:flex flex-wrap items-center gap-2 mb-6'>
          {actions.map((action, index) => (
            <button
              key={index}
              onClick={action.onClick}
              className={`px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-all flex items-center justify-center gap-2 ${
                action.variant === 'primary'
                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-100'
                  : action.variant === 'danger'
                  ? 'bg-white hover:bg-red-50 text-red-600 border border-gray-300 hover:border-red-200'
                  : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300'
              }`}
            >
              <i
                className={`${action.icon} ${
                  action.variant === 'primary' ? 'text-white' : ''
                }`}
              ></i>
              <span>{action.label}</span>
            </button>
          ))}
        </div>

        {leadError && (
          <div className='mb-4 p-3 bg-red-50 border border-red-200 rounded-lg'>
            <p className='text-sm text-red-600 flex items-center gap-2'>
              <i className='fa-solid fa-circle-exclamation'></i>
              {leadError}
            </p>
          </div>
        )}

        {/* Split Layout */}
        <div className='grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6 items-stretch'>
          {/* Left Column: Lead Profile */}
          <div className='lg:col-span-1 space-y-4 lg:space-y-6 h-full flex flex-col'>
            {/* Contact Info Card */}
            <div className='bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow'>
              <div className='px-4 sm:px-5 py-3 sm:py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/80'>
                <h3 className='text-xs sm:text-sm font-semibold text-gray-900 uppercase tracking-wide'>
                  Contact Details
                </h3>
                <button className='text-blue-600 hover:text-blue-700 text-xs font-medium px-2 py-1 rounded hover:bg-blue-50 transition-colors'>
                  <i className='fa-regular fa-pen-to-square sm:hidden'></i>
                  <span className='hidden sm:inline'>Edit</span>
                </button>
              </div>
              <div className='p-4 sm:p-5 space-y-3 sm:space-y-4'>
                {[
                  {
                    icon: 'fa-regular fa-envelope',
                    bg: 'bg-blue-50',
                    color: 'text-blue-500',
                    label: 'Email Address',
                    value: 'sarah.c@gmail.com',
                    type: 'email'
                  },
                  {
                    icon: 'fa-solid fa-phone',
                    bg: 'bg-green-50',
                    color: 'text-green-500',
                    label: 'Phone Number',
                    value: '+1 (555) 123-4567',
                    type: 'tel'
                  },
                  {
                    icon: 'fa-solid fa-location-dot',
                    bg: 'bg-purple-50',
                    color: 'text-purple-500',
                    label: 'Location',
                    value: 'San Francisco, CA, USA',
                    type: 'text'
                  },
                  {
                    icon: 'fa-regular fa-building',
                    bg: 'bg-orange-50',
                    color: 'text-orange-500',
                    label: 'Company',
                    value: 'Tech Solutions Inc.',
                    type: 'text'
                  }
                ].map((item, idx) => (
                  <div key={idx} className='flex items-start gap-3 group'>
                    <div
                      className={`mt-0.5 w-8 h-8 rounded-lg ${item.bg} flex items-center justify-center ${item.color} shrink-0`}
                    >
                      <i className={`${item.icon} text-sm`}></i>
                    </div>
                    <div className='flex-1 min-w-0'>
                      <p className='text-xs text-gray-500 mb-0.5'>
                        {item.label}
                      </p>
                      {item.type === 'email' ? (
                        <a
                          href={`mailto:${item.value}`}
                          className='text-sm font-medium text-blue-600 hover:underline truncate block'
                        >
                          {item.value}
                        </a>
                      ) : item.type === 'tel' ? (
                        <a
                          href={`tel:${item.value}`}
                          className='text-sm font-medium text-gray-900 hover:text-blue-600 truncate block'
                        >
                          {item.value}
                        </a>
                      ) : (
                        <p className='text-sm font-medium text-gray-900 truncate'>
                          {item.value}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Trip Intent Card */}
            <div className='bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow'>
              <div className='px-4 sm:px-5 py-3 sm:py-4 border-b border-gray-100 bg-gray-50/80'>
                <h3 className='text-xs sm:text-sm font-semibold text-gray-900 uppercase tracking-wide'>
                  Trip Intent
                </h3>
              </div>
              <div className='p-4 sm:p-5 space-y-4'>
                <div className='grid grid-cols-2 gap-3 sm:gap-4'>
                  <div>
                    <p className='text-xs text-gray-500 mb-1'>Destination</p>
                    <div className='flex items-center gap-2'>
                      <img
                        src='https://flagcdn.com/w20/mv.png'
                        className='rounded-sm w-5 h-3.5 object-cover'
                        alt='Maldives'
                      />
                      <span className='text-sm font-medium text-gray-900'>
                        Maldives
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className='text-xs text-gray-500 mb-1'>Trip Type</p>
                    <span className='inline-flex items-center gap-1.5 text-sm font-medium text-gray-900'>
                      <i className='fa-solid fa-umbrella-beach text-blue-400 text-xs'></i>{' '}
                      Leisure
                    </span>
                  </div>
                  <div>
                    <p className='text-xs text-gray-500 mb-1'>Travelers</p>
                    <p className='text-sm font-medium text-gray-900'>
                      2 Adults
                    </p>
                  </div>
                  <div>
                    <p className='text-xs text-gray-500 mb-1'>Budget</p>
                    <p className='text-sm font-medium text-gray-900'>
                      $5k - $7k
                    </p>
                  </div>
                </div>

                <div className='pt-3 border-t border-gray-100'>
                  <p className='text-xs text-gray-500 mb-2'>Preferred Dates</p>
                  <div className='flex items-center gap-2 text-sm text-gray-700 bg-gray-50 p-2.5 rounded-lg border border-gray-100'>
                    <i className='fa-regular fa-calendar text-gray-400'></i>
                    <span className='font-medium'>Dec 15 - 22, 2023</span>
                  </div>
                </div>

                <div>
                  <p className='text-xs text-gray-500 mb-2'>Requirements</p>
                  <div className='flex flex-wrap gap-1.5'>
                    {['Overwater Villa', 'All Inclusive', 'Seaplane'].map(
                      (tag, idx) => (
                        <span
                          key={idx}
                          className='px-2 py-1 bg-gray-100 text-gray-600 rounded-md text-xs border border-gray-200'
                        >
                          {tag}
                        </span>
                      )
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Priority & Tags */}
            <div className='bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow'>
              <div className='px-4 sm:px-5 py-3 sm:py-4 border-b border-gray-100 bg-gray-50/80'>
                <h3 className='text-xs sm:text-sm font-semibold text-gray-900 uppercase tracking-wide'>
                  Status & Tags
                </h3>
              </div>
              <div className='p-4 sm:p-5 space-y-4'>
                <div>
                  <p className='text-xs text-gray-500 mb-2'>Priority Level</p>
                  <div className='flex items-center gap-2'>
                    <div className='flex-1 h-2 bg-gray-100 rounded-full overflow-hidden'>
                      <div className='h-full bg-red-500 w-3/4 rounded-full'></div>
                    </div>
                    <span className='text-xs font-bold text-red-600'>High</span>
                  </div>
                </div>

                <div>
                  <p className='text-xs text-gray-500 mb-2'>Source</p>
                  <span className='inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-blue-50 text-blue-700 text-xs font-medium border border-blue-100'>
                    <i className='fa-brands fa-facebook text-xs'></i> Facebook
                    Ad
                  </span>
                </div>

                <div>
                  <p className='text-xs text-gray-500 mb-2'>Tags</p>
                  <div className='flex flex-wrap gap-1.5'>
                    <span className='px-2 py-1 bg-purple-50 text-purple-700 rounded-md text-xs border border-purple-100'>
                      #Honeymoon
                    </span>
                    <span className='px-2 py-1 bg-yellow-50 text-yellow-700 rounded-md text-xs border border-yellow-100'>
                      #Luxury
                    </span>
                    <button className='text-xs text-gray-400 hover:text-blue-600 border border-dashed border-gray-300 rounded-md px-2 py-1 hover:border-blue-300 transition-colors'>
                      <i className='fa-solid fa-plus'></i> Add
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Tabs & Content */}
          <div className='lg:col-span-2 space-y-4 lg:space-y-6 h-full flex flex-col'>
            {/* Tabs Navigation - Mobile Dropdown */}
            <div className='lg:hidden'>
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

            {/* Tabs Navigation - Desktop */}
            <div className='hidden lg:block bg-white rounded-xl shadow-sm border border-gray-200'>
              <div className='border-b border-gray-200'>
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

              {/* Follow-up Scheduler */}
              <div className='p-4 sm:p-5 border-b border-gray-100 bg-gradient-to-r from-blue-50/50 to-indigo-50/50'>
                <h4 className='text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2'>
                  <i className='fa-regular fa-calendar-check text-blue-500'></i>
                  Schedule Next Action
                </h4>
                <div className='flex flex-col sm:flex-row gap-3'>
                  <div className='relative flex-1'>
                    <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
                      <i className='fa-regular fa-calendar text-gray-400'></i>
                    </div>
                    <input
                      type='date'
                      className='block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white'
                      defaultValue='2023-11-15'
                    />
                  </div>
                  <div className='relative flex-1'>
                    <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
                      <i className='fa-regular fa-clock text-gray-400'></i>
                    </div>
                    <input
                      type='time'
                      className='block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white'
                      defaultValue='10:00'
                    />
                  </div>
                  <div className='flex-1'>
                    <select className='block w-full py-2.5 px-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white'>
                      <option>Call</option>
                      <option>Email</option>
                      <option>Meeting</option>
                      <option>WhatsApp</option>
                    </select>
                  </div>
                  <button
                    onClick={handleScheduleFollowup}
                    className='w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium shadow-sm transition-colors whitespace-nowrap flex items-center justify-center gap-2'
                  >
                    <i className='fa-regular fa-bell'></i>
                    Schedule
                  </button>
                </div>
              </div>

              {/* Activity Timeline */}
              <div className='p-4 sm:p-5'>
                <div className='flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6'>
                  <h3 className='text-base font-semibold text-gray-900 flex items-center gap-2'>
                    <i className='fa-regular fa-clock text-gray-400'></i>
                    Activity Timeline
                  </h3>
                  <div className='flex gap-1 overflow-x-auto pb-1 sm:pb-0'>
                    {['All', 'Notes', 'Calls', 'Emails'].map((filter, idx) => (
                      <button
                        key={idx}
                        className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                          idx === 0
                            ? 'bg-blue-50 text-blue-600 border border-blue-200'
                            : 'text-gray-500 hover:text-gray-700 bg-white border border-transparent hover:bg-gray-50'
                        }`}
                      >
                        {filter}
                      </button>
                    ))}
                  </div>
                </div>

                <div className='relative pl-4 space-y-6'>
                  {/* Timeline Items */}
                  {timeline.map(item => (
                    <div key={item.id} className='relative pl-8 group'>
                      <div
                        className={`absolute left-0 top-1 w-8 h-8 rounded-full ${item.bg} border-2 border-white shadow-sm flex items-center justify-center z-10 group-hover:scale-110 transition-transform`}
                      >
                        <i className={`${item.icon} ${item.color} text-xs`}></i>
                      </div>
                      <div className='bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-all hover:border-gray-300'>
                        <div className='flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-2'>
                          <div className='flex items-center gap-2 flex-wrap'>
                            <span className='font-semibold text-gray-900 text-sm'>
                              {item.title}
                            </span>
                            <span className='text-xs text-gray-500'>
                              • {item.user}
                            </span>
                          </div>
                          <span className='text-xs text-gray-400'>
                            {item.time}
                          </span>
                        </div>

                        <p className='text-sm text-gray-600 mb-3'>
                          {item.description}
                        </p>

                        <div className='flex flex-wrap items-center gap-3'>
                          {item.tags?.map((tag: any, tagIdx: number) => (
                            <span
                              key={tagIdx}
                              className={`inline-flex items-center gap-1 px-2 py-1 rounded ${tag.bg} ${tag.text} text-xs border ${tag.border}`}
                            >
                              <i className={tag.icon}></i> {tag.label}
                            </span>
                          ))}

                          {item.attachment && (
                            <div className='flex items-center gap-2 bg-gray-50 px-2 py-1 rounded border border-gray-200'>
                              <i
                                className={`${item.attachment.icon} ${item.attachment.color} text-sm`}
                              ></i>
                              <span className='text-xs text-gray-700'>
                                {item.attachment.name}
                              </span>
                            </div>
                          )}

                          {item.meta && (
                            <span className='text-xs text-gray-500'>
                              {item.meta}
                            </span>
                          )}

                          {item.action && (
                            <button className='text-blue-600 hover:text-blue-800 text-xs font-medium ml-auto flex items-center gap-1 px-2 py-1 rounded hover:bg-blue-50'>
                              <i className={item.action.icon}></i>{' '}
                              {item.action.label}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className='mt-6'>
                  <button className='w-full py-2.5 text-sm text-gray-500 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg border border-dashed border-gray-300 transition-colors flex items-center justify-center gap-2'>
                    <i className='fa-regular fa-eye'></i>
                    View older activity
                  </button>
                </div>
              </div>

              {/* Add Note Area */}
              <div className='p-4 sm:p-5 border-t border-gray-100 bg-gray-50/80 rounded-b-xl'>
                <div className='flex flex-col sm:flex-row gap-3'>
                  <div className='w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex-shrink-0 overflow-hidden hidden sm:block shadow-sm'>
                    <div className='w-full h-full flex items-center justify-center text-white text-xs font-bold'>
                      AM
                    </div>
                  </div>
                  <div className='flex-1'>
                    <div className='relative'>
                      <textarea
                        rows={2}
                        className='block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 sm:text-sm p-3 pr-20 border'
                        placeholder='Add a note, log a call, or send an email...'
                      ></textarea>
                      <div className='absolute bottom-2 right-2 flex gap-1 bg-white rounded-lg border border-gray-200 p-1'>
                        <button className='p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded transition-colors'>
                          <i className='fa-solid fa-paperclip text-sm'></i>
                        </button>
                        <button className='p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded transition-colors'>
                          <i className='fa-regular fa-face-smile text-sm'></i>
                        </button>
                      </div>
                    </div>

                    <div className='flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mt-3'>
                      <div className='flex gap-1'>
                        {['Note', 'Email', 'SMS'].map((type, idx) => (
                          <button
                            key={idx}
                            className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                              idx === 0
                                ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border border-yellow-200'
                                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                            }`}
                          >
                            {type}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={handleAddNote}
                        className='bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-medium shadow-sm transition-colors flex items-center justify-center gap-2'
                      >
                        <i className='fa-regular fa-floppy-disk'></i>
                        Save Note
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Related Items Section - Fixed alignment */}
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6 min-h-[200px]'>
              {/* Recent Quotations */}
              <div className='bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5 hover:shadow-md transition-shadow h-full flex flex-col'>
                <div className='flex justify-between items-center mb-4'>
                  <h3 className='text-xs sm:text-sm font-semibold text-gray-900 uppercase tracking-wide flex items-center gap-2'>
                    <i className='fa-solid fa-file-invoice-dollar text-blue-500'></i>
                    Quotations
                  </h3>
                  <button className='text-blue-600 hover:text-blue-700 text-xs font-medium px-2 py-1 rounded hover:bg-blue-50 transition-colors flex items-center gap-1'>
                    <i className='fa-solid fa-plus text-xs'></i>
                    <span className='hidden sm:inline'>New</span>
                  </button>
                </div>

                <div className='space-y-2 flex-1'>
                  {[
                    {
                      id: 'Q1',
                      name: 'Maldives 5N/6D',
                      amount: '$5,400',
                      status: 'Sent'
                    }
                  ].map((quote, idx) => (
                    <div
                      key={idx}
                      className='flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors group cursor-pointer'
                    >
                      <div className='flex items-center gap-3 min-w-0 flex-1'>
                        <div className='w-8 h-8 rounded bg-blue-50 flex items-center justify-center text-blue-600 text-xs font-bold shrink-0'>
                          {quote.id}
                        </div>
                        <div className='min-w-0 flex-1'>
                          <p className='text-sm font-medium text-gray-900 truncate'>
                            {quote.name}
                          </p>
                          <p className='text-xs text-gray-500 truncate'>
                            {quote.amount} • {quote.status}
                          </p>
                        </div>
                      </div>
                      <i className='fa-solid fa-chevron-right text-gray-300 group-hover:text-gray-500 text-xs transition-colors shrink-0 ml-2'></i>
                    </div>
                  ))}
                </div>
              </div>

              {/* Documents */}
              <div className='bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5 hover:shadow-md transition-shadow h-full flex flex-col'>
                <div className='flex justify-between items-center mb-4'>
                  <h3 className='text-xs sm:text-sm font-semibold text-gray-900 uppercase tracking-wide flex items-center gap-2'>
                    <i className='fa-regular fa-folder-open text-blue-500'></i>
                    Documents
                  </h3>
                  <button className='text-blue-600 hover:text-blue-700 text-xs font-medium px-2 py-1 rounded hover:bg-blue-50 transition-colors flex items-center gap-1'>
                    <i className='fa-solid fa-upload text-xs'></i>
                    <span className='hidden sm:inline'>Upload</span>
                  </button>
                </div>

                <div className='space-y-2 flex-1'>
                  {[
                    {
                      name: 'Passport_Front.pdf',
                      size: '2.4 MB',
                      date: 'Oct 24',
                      icon: 'fa-regular fa-file-pdf',
                      bg: 'bg-red-50',
                      color: 'text-red-500'
                    },
                    {
                      name: 'Visa_Photo.jpg',
                      size: '1.1 MB',
                      date: 'Oct 24',
                      icon: 'fa-regular fa-image',
                      bg: 'bg-blue-50',
                      color: 'text-blue-500'
                    }
                  ].map((doc, idx) => (
                    <div
                      key={idx}
                      className='flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors group'
                    >
                      <div className='flex items-center gap-3 min-w-0 flex-1'>
                        <div
                          className={`w-8 h-8 rounded ${doc.bg} flex items-center justify-center ${doc.color} shrink-0`}
                        >
                          <i className={doc.icon}></i>
                        </div>
                        <div className='min-w-0 flex-1'>
                          <p className='text-sm font-medium text-gray-900 truncate'>
                            {doc.name}
                          </p>
                          <p className='text-xs text-gray-500 truncate'>
                            {doc.size} • {doc.date}
                          </p>
                        </div>
                      </div>
                      <button className='text-gray-400 hover:text-gray-600 p-1.5 rounded hover:bg-gray-100 transition-colors shrink-0 ml-2'>
                        <i className='fa-solid fa-download'></i>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

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

export default LeadDetails
