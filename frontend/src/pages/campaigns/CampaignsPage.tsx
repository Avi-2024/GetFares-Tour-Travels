import React, { useState, useMemo } from 'react'
import {
  FaPlus,
  FaSearch,
  FaDownload,
  FaEdit,
  FaTrash,
  FaChartLine,
  FaChevronLeft,
  FaChevronRight,
  FaCopy
} from 'react-icons/fa'
import {
  FaFacebook,
  FaGoogle,
  FaInstagram,
  FaLinkedin,
  FaTwitter,
  FaPlay,
  FaPause
} from 'react-icons/fa'
import {
  MdCheckCircle,
  MdAccessTime
} from 'react-icons/md'

interface Campaign {
  id: string
  name: string
  source: string
  budget: number
  actualSpend: number
  leadsGenerated: number
  revenueGenerated: number
  metaCampaignId?: string
  metaAdsetId?: string
  metaAdId?: string
  startDate: string
  endDate: string
  status: 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'DRAFT'
  roi: number
  conversionRate: number
}

const CampaignsPage: React.FC = () => {
  const [search, setSearch] = useState('')
  const [sourceFilter, setSourceFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [dateRange, setDateRange] = useState({ start: '', end: '' })
  const [page, setPage] = useState(1)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const pageSize = 5

  // Mock data - replace with API call
  const [campaigns, setCampaigns] = useState<Campaign[]>([
    {
      id: '1',
      name: 'Summer Maldives Campaign',
      source: 'META',
      budget: 5000,
      actualSpend: 3200,
      leadsGenerated: 145,
      revenueGenerated: 28500,
      metaCampaignId: 'meta_123',
      startDate: '2024-06-01',
      endDate: '2024-08-31',
      status: 'ACTIVE',
      roi: 4.7,
      conversionRate: 12.4
    },
    {
      id: '2',
      name: 'Google Ads - Dubai',
      source: 'GOOGLE',
      budget: 3000,
      actualSpend: 2800,
      leadsGenerated: 98,
      revenueGenerated: 15600,
      startDate: '2024-07-15',
      endDate: '2024-09-15',
      status: 'ACTIVE',
      roi: 4.2,
      conversionRate: 8.7
    },
    {
      id: '3',
      name: 'Instagram Stories - Europe',
      source: 'INSTAGRAM',
      budget: 2500,
      actualSpend: 2500,
      leadsGenerated: 67,
      revenueGenerated: 12400,
      startDate: '2024-05-01',
      endDate: '2024-07-31',
      status: 'COMPLETED',
      roi: 3.96,
      conversionRate: 10.2
    },
    {
      id: '4',
      name: 'LinkedIn B2B Campaign',
      source: 'LINKEDIN',
      budget: 4000,
      actualSpend: 1200,
      leadsGenerated: 34,
      revenueGenerated: 8900,
      startDate: '2024-08-01',
      endDate: '2024-10-31',
      status: 'PAUSED',
      roi: 6.4,
      conversionRate: 15.3
    },
    {
      id: '5',
      name: 'Twitter X - Japan',
      source: 'TWITTER',
      budget: 1500,
      actualSpend: 0,
      leadsGenerated: 0,
      revenueGenerated: 0,
      startDate: '2024-09-01',
      endDate: '2024-11-30',
      status: 'DRAFT',
      roi: 0,
      conversionRate: 0
    }
  ])

  // Campaign form state
  const [formData, setFormData] = useState({
    name: '',
    source: 'META',
    budget: '',
    metaCampaignId: '',
    metaAdsetId: '',
    metaAdId: '',
    startDate: '',
    endDate: '',
    status: 'DRAFT'
  })

  const [formErrors, setFormErrors] = useState({
    name: '',
    startDate: '',
    endDate: '',
    dateRange: ''
  })

  const sources = [
    { value: 'META', label: 'Meta (Facebook/Instagram)' },
    { value: 'GOOGLE', label: 'Google Ads' },
    { value: 'INSTAGRAM', label: 'Instagram' },
    { value: 'LINKEDIN', label: 'LinkedIn' },
    { value: 'TWITTER', label: 'Twitter/X' },
    { value: 'OTHER', label: 'Other' }
  ]

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'META':
        return <FaFacebook className='text-blue-600' />
      case 'GOOGLE':
        return <FaGoogle className='text-blue-500' />
      case 'INSTAGRAM':
        return <FaInstagram className='text-pink-600' />
      case 'LINKEDIN':
        return <FaLinkedin className='text-blue-700' />
      case 'TWITTER':
        return <FaTwitter className='text-sky-500' />
      default:
        return <FaChartLine className='text-gray-500' />
    }
  }

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-700 border-green-200'
      case 'PAUSED':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200'
      case 'COMPLETED':
        return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'DRAFT':
        return 'bg-gray-100 text-gray-700 border-gray-200'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <FaPlay className='text-green-600 text-xs' />
      case 'PAUSED':
        return <FaPause className='text-yellow-600 text-xs' />
      case 'COMPLETED':
        return <MdCheckCircle className='text-blue-600 text-xs' />
      case 'DRAFT':
        return <MdAccessTime className='text-gray-600 text-xs' />
      default:
        return null
    }
  }

  // Filter campaigns
  const filteredCampaigns = useMemo(() => {
    return campaigns.filter(campaign => {
      const searchMatch =
        campaign.name.toLowerCase().includes(search.toLowerCase()) ||
        campaign.source.toLowerCase().includes(search.toLowerCase())
      const sourceMatch =
        sourceFilter === 'all' || campaign.source === sourceFilter
      const statusMatch =
        statusFilter === 'all' || campaign.status === statusFilter
      const dateMatch =
        (!dateRange.start || campaign.startDate >= dateRange.start) &&
        (!dateRange.end || campaign.endDate <= dateRange.end)

      return searchMatch && sourceMatch && statusMatch && dateMatch
    })
  }, [campaigns, search, sourceFilter, statusFilter, dateRange])

  // Pagination
  const totalPages = Math.ceil(filteredCampaigns.length / pageSize)
  const paginatedCampaigns = filteredCampaigns.slice(
    (page - 1) * pageSize,
    page * pageSize
  )

  // Calculate totals
  const totals = useMemo(() => {
    return filteredCampaigns.reduce(
      (acc, campaign) => ({
        budget: acc.budget + campaign.budget,
        spend: acc.spend + campaign.actualSpend,
        leads: acc.leads + campaign.leadsGenerated,
        revenue: acc.revenue + campaign.revenueGenerated
      }),
      { budget: 0, spend: 0, leads: 0, revenue: 0 }
    )
  }, [filteredCampaigns])

  const handleCreateCampaign = () => {
    setFormData({
      name: '',
      source: 'META',
      budget: '',
      metaCampaignId: '',
      metaAdsetId: '',
      metaAdId: '',
      startDate: '',
      endDate: '',
      status: 'DRAFT'
    })
    setFormErrors({ name: '', startDate: '', endDate: '', dateRange: '' })
    setEditingCampaign(null)
    setShowCreateModal(true)
  }

  const handleEditCampaign = (campaign: Campaign) => {
    setFormData({
      name: campaign.name,
      source: campaign.source,
      budget: campaign.budget.toString(),
      metaCampaignId: campaign.metaCampaignId || '',
      metaAdsetId: campaign.metaAdsetId || '',
      metaAdId: campaign.metaAdId || '',
      startDate: campaign.startDate,
      endDate: campaign.endDate,
      status: campaign.status
    })
    setEditingCampaign(campaign)
    setShowCreateModal(true)
  }

  const handleDeleteCampaign = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this campaign?')) {
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 500))
        setCampaigns(prev => prev.filter(c => c.id !== id))
      } catch (error) {
        console.error('Failed to delete campaign:', error)
        setError('Failed to delete campaign')
      }
    }
  }

  const handleDuplicateCampaign = async (campaign: Campaign) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500))
      const newCampaign: Campaign = {
        ...campaign,
        id: Date.now().toString(),
        name: `${campaign.name} (Copy)`,
        status: 'DRAFT',
        leadsGenerated: 0,
        revenueGenerated: 0,
        actualSpend: 0
      }
      setCampaigns(prev => [newCampaign, ...prev])
    } catch (error) {
      console.error('Failed to duplicate campaign:', error)
      setError('Failed to duplicate campaign')
    }
  }

  const validateForm = () => {
    const errors = {
      name: '',
      startDate: '',
      endDate: '',
      dateRange: ''
    }
    let isValid = true

    if (!formData.name.trim()) {
      errors.name = 'Campaign name is required'
      isValid = false
    }

    if (!formData.startDate) {
      errors.startDate = 'Start date is required'
      isValid = false
    }

    if (!formData.endDate) {
      errors.endDate = 'End date is required'
      isValid = false
    }

    if (
      formData.startDate &&
      formData.endDate &&
      formData.endDate < formData.startDate
    ) {
      errors.dateRange = 'End date must be after start date'
      isValid = false
    }

    setFormErrors(errors)
    return isValid
  }

  const handleSubmitCampaign = async () => {
    if (!validateForm()) return

    setLoading(true)
    setError('')
    
    try {
      // Validate date range
      if (formData.endDate <= formData.startDate) {
        throw new Error('End date must be after start date')
      }
      
      const now = new Date()
      const startDate = new Date(formData.startDate)
      const endDate = new Date(formData.endDate)
      
      if (startDate < now && endDate < now) {
        throw new Error('Campaign dates cannot be in the past')
      }
      
      const payload = {
        name: formData.name,
        source: formData.source,
        budget: parseFloat(formData.budget) || 0,
        metaCampaignId: formData.metaCampaignId || undefined,
        metaAdsetId: formData.metaAdsetId || undefined,
        metaAdId: formData.metaAdId || undefined,
        startDate: formData.startDate,
        endDate: formData.endDate,
        status: formData.status as Campaign['status']
      }
      
      // Simulate API call with timeout
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      if (editingCampaign) {
        setCampaigns(prev =>
          prev.map(c =>
            c.id === editingCampaign.id
              ? { ...c, ...payload }
              : c
          )
        )
      } else {
        const newCampaign: Campaign = {
          id: Date.now().toString(),
          ...payload,
          actualSpend: 0,
          leadsGenerated: 0,
          revenueGenerated: 0,
          roi: 0,
          conversionRate: 0
        }
        setCampaigns(prev => [newCampaign, ...prev])
      }

      setShowCreateModal(false)
      setEditingCampaign(null)
    } catch (error: any) {
      setError(error.message || 'Failed to save campaign')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <main className='flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100'>
      <div className='max-w-7xl mx-auto '>
        {/* Header */}
        <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6'>
          <div>
            <p className='text-sm text-gray-500 mb-1'>Campaigns</p>
            <h1 className='text-2xl font-bold text-gray-900'>
              Marketing Campaigns
            </h1>
            <p className='text-sm text-gray-500 mt-1'>
              Manage campaign setup and performance metadata
            </p>
          </div>
          <button
            onClick={handleCreateCampaign}
            className='inline-flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors'
          >
            <FaPlus className='mr-2' /> New Campaign
          </button>
        </div>

        {/* KPI Cards */}
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6'>
          <div className='bg-white rounded-xl shadow-sm border border-gray-200 p-5'>
            <p className='text-xs text-gray-500 uppercase tracking-wide mb-1'>
              Total Budget
            </p>
            <p className='text-2xl font-bold text-gray-900'>
              {formatCurrency(totals.budget)}
            </p>
            <p className='text-xs text-gray-500 mt-1'>
              Across {filteredCampaigns.length} campaigns
            </p>
          </div>

          <div className='bg-white rounded-xl shadow-sm border border-gray-200 p-5'>
            <p className='text-xs text-gray-500 uppercase tracking-wide mb-1'>
              Actual Spend
            </p>
            <p className='text-2xl font-bold text-gray-900'>
              {formatCurrency(totals.spend)}
            </p>
            <p className='text-xs text-green-600 mt-1'>
              {((totals.spend / totals.budget) * 100).toFixed(1)}% of budget
              used
            </p>
          </div>

          <div className='bg-white rounded-xl shadow-sm border border-gray-200 p-5'>
            <p className='text-xs text-gray-500 uppercase tracking-wide mb-1'>
              Leads Generated
            </p>
            <p className='text-2xl font-bold text-gray-900'>{totals.leads}</p>
            <p className='text-xs text-blue-600 mt-1'>From all campaigns</p>
          </div>

          <div className='bg-white rounded-xl shadow-sm border border-gray-200 p-5'>
            <p className='text-xs text-gray-500 uppercase tracking-wide mb-1'>
              Revenue
            </p>
            <p className='text-2xl font-bold text-gray-900'>
              {formatCurrency(totals.revenue)}
            </p>
            <p className='text-xs text-green-600 mt-1'>
              ROI:{' '}
              {(((totals.revenue - totals.spend) / totals.spend) * 100).toFixed(
                1
              )}
              %
            </p>
          </div>
        </div>

        {/* Filters Section */}
        <div className='bg-white rounded-xl shadow-sm border border-gray-200 mb-6'>
          <div className='p-4 border-b border-gray-100'>
            <div className='flex flex-col lg:flex-row gap-4'>
              {/* Search */}
              <div className='flex-1 relative'>
                <FaSearch className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm' />
                <input
                  type='text'
                  placeholder='Search campaigns...'
                  value={search}
                  onChange={e => {
                    setSearch(e.target.value)
                    setPage(1)
                  }}
                  className='w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500'
                />
              </div>

              {/* Source Filter */}
              <select
                value={sourceFilter}
                onChange={e => {
                  setSourceFilter(e.target.value)
                  setPage(1)
                }}
                className='px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500'
              >
                <option value='all'>All Sources</option>
                {sources.map(s => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={e => {
                  setStatusFilter(e.target.value)
                  setPage(1)
                }}
                className='px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500'
              >
                <option value='all'>All Statuses</option>
                <option value='ACTIVE'>Active</option>
                <option value='PAUSED'>Paused</option>
                <option value='COMPLETED'>Completed</option>
                <option value='DRAFT'>Draft</option>
              </select>

              {/* Date Range */}
              <div className='flex gap-2'>
                <input
                  type='date'
                  placeholder='Start'
                  value={dateRange.start}
                  onChange={e =>
                    setDateRange(prev => ({ ...prev, start: e.target.value }))
                  }
                  className='px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500'
                />
                <input
                  type='date'
                  placeholder='End'
                  value={dateRange.end}
                  onChange={e =>
                    setDateRange(prev => ({ ...prev, end: e.target.value }))
                  }
                  className='px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500'
                />
              </div>

              {/* Export Button */}
              <button
                onClick={async () => {
                  try {
                    // Simulate export with dummy data
                    const filteredData = filteredCampaigns.map(campaign => ({
                      name: campaign.name,
                      source: campaign.source,
                      budget: campaign.budget,
                      actualSpend: campaign.actualSpend,
                      leadsGenerated: campaign.leadsGenerated,
                      revenueGenerated: campaign.revenueGenerated,
                      status: campaign.status,
                      startDate: campaign.startDate,
                      endDate: campaign.endDate,
                      roi: campaign.roi
                    }))
                    
                    // Create CSV content
                    const headers = Object.keys(filteredData[0] || {})
                    const csvContent = [
                      headers.join(','),
                      ...filteredData.map(row => headers.map(header => row[header as keyof typeof row]).join(','))
                    ].join('\n')
                    
                    // Download CSV
                    const blob = new Blob([csvContent], { type: 'text/csv' })
                    const url = window.URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `campaigns-${new Date().toISOString().split('T')[0]}.csv`
                    document.body.appendChild(a)
                    a.click()
                    window.URL.revokeObjectURL(url)
                    document.body.removeChild(a)
                  } catch (error) {
                    console.error('Export failed:', error)
                    setError('Failed to export campaigns')
                  }
                }}
                className='px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2'
              >
                <FaDownload /> Export
              </button>
            </div>
          </div>

          {/* Campaigns Table */}
          <div className='overflow-x-auto'>
            <table className='w-full'>
              <thead className='bg-gray-50'>
                <tr>
                  <th className='px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider'>
                    Campaign
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider'>
                    Source
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider'>
                    Budget/Spend
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider'>
                    Leads
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider'>
                    Revenue
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider'>
                    ROI
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider'>
                    Status
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider'>
                    Dates
                  </th>
                  <th className='px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider'>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className='divide-y divide-gray-100'>
                {paginatedCampaigns.map(campaign => (
                  <tr
                    key={campaign.id}
                    className='hover:bg-blue-50/30 transition-colors'
                  >
                    <td className='px-6 py-4'>
                      <p className='text-sm font-medium text-gray-900'>
                        {campaign.name}
                      </p>
                      {campaign.metaCampaignId && (
                        <p className='text-xs text-gray-500'>
                          ID: {campaign.metaCampaignId}
                        </p>
                      )}
                    </td>
                    <td className='px-6 py-4'>
                      <div className='flex items-center gap-2'>
                        {getSourceIcon(campaign.source)}
                        <span className='text-sm text-gray-700'>
                          {campaign.source}
                        </span>
                      </div>
                    </td>
                    <td className='px-6 py-4'>
                      <p className='text-sm font-medium text-gray-900'>
                        {formatCurrency(campaign.budget)}
                      </p>
                      <p className='text-xs text-gray-500'>
                        Spent: {formatCurrency(campaign.actualSpend)}
                      </p>
                    </td>
                    <td className='px-6 py-4'>
                      <p className='text-sm text-gray-900'>
                        {campaign.leadsGenerated}
                      </p>
                      <p className='text-xs text-gray-500'>
                        {campaign.conversionRate}% conv.
                      </p>
                    </td>
                    <td className='px-6 py-4'>
                      <p className='text-sm font-medium text-green-600'>
                        {formatCurrency(campaign.revenueGenerated)}
                      </p>
                    </td>
                    <td className='px-6 py-4'>
                      <span
                        className={`text-sm font-medium ${
                          campaign.roi > 3
                            ? 'text-green-600'
                            : campaign.roi > 1
                            ? 'text-blue-600'
                            : 'text-yellow-600'
                        }`}
                      >
                        {campaign.roi.toFixed(1)}x
                      </span>
                    </td>
                    <td className='px-6 py-4'>
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusClass(
                          campaign.status
                        )}`}
                      >
                        {getStatusIcon(campaign.status)}
                        {campaign.status}
                      </span>
                    </td>
                    <td className='px-6 py-4'>
                      <p className='text-xs text-gray-700'>
                        {formatDate(campaign.startDate)}
                      </p>
                      <p className='text-xs text-gray-500'>
                        to {formatDate(campaign.endDate)}
                      </p>
                    </td>
                    <td className='px-6 py-4'>
                      <div className='flex justify-end gap-2'>
                        <button
                          onClick={() => handleEditCampaign(campaign)}
                          className='p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors'
                          title='Edit'
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => handleDuplicateCampaign(campaign)}
                          className='p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors'
                          title='Duplicate'
                        >
                          <FaCopy />
                        </button>
                        <button
                          onClick={() => handleDeleteCampaign(campaign.id)}
                          className='p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors'
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
          <div className='flex items-center justify-between border-t border-gray-100 px-6 py-4'>
            <p className='text-sm text-gray-500'>
              Showing{' '}
              {Math.min(filteredCampaigns.length, (page - 1) * pageSize + 1)}-
              {Math.min(filteredCampaigns.length, page * pageSize)} of{' '}
              {filteredCampaigns.length}
            </p>
            <div className='flex gap-2'>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className='px-3 py-1 border border-gray-300 rounded-lg text-sm disabled:opacity-50'
              >
                <FaChevronLeft />
              </button>
              <span className='px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium'>
                {page}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className='px-3 py-1 border border-gray-300 rounded-lg text-sm disabled:opacity-50'
              >
                <FaChevronRight />
              </button>
            </div>
          </div>
        </div>

        {/* Create/Edit Campaign Modal */}
        {showCreateModal && (
          <div className='fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4'>
            <div className='bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-800 w-full max-w-5xl max-h-[90vh] overflow-y-auto'>
              <div className='px-6 py-4 border-b border-gray-100 flex justify-between items-center'>
                <h2 className='text-lg font-semibold text-gray-900'>
                  {editingCampaign ? 'Edit Campaign' : 'Create New Campaign'}
                </h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className='text-gray-400 hover:text-gray-600'
                >
                  ✕
                </button>
              </div>

              <div className='p-6 space-y-4'>
                {/* Campaign Name */}
                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-1'>
                    Campaign Name <span className='text-red-500'>*</span>
                  </label>
                  <input
                    type='text'
                    value={formData.name}
                    onChange={e =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 ${
                      formErrors.name ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder='e.g., Summer Maldives Campaign'
                  />
                  {formErrors.name && (
                    <p className='mt-1 text-xs text-red-500'>
                      {formErrors.name}
                    </p>
                  )}
                </div>

                {/* Source */}
                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-1'>
                    Source
                  </label>
                  <select
                    value={formData.source}
                    onChange={e =>
                      setFormData({ ...formData, source: e.target.value })
                    }
                    className='w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500'
                  >
                    {sources.map(s => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Budget */}
                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-1'>
                    Budget ($)
                  </label>
                  <input
                    type='number'
                    value={formData.budget}
                    onChange={e =>
                      setFormData({ ...formData, budget: e.target.value })
                    }
                    className='w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500'
                    placeholder='5000'
                    min='0'
                    step='100'
                  />
                </div>

                {/* Meta Campaign ID (conditional) */}
                {formData.source === 'META' && (
                  <>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-1'>
                        Meta Campaign ID
                      </label>
                      <input
                        type='text'
                        value={formData.metaCampaignId}
                        onChange={e =>
                          setFormData({
                            ...formData,
                            metaCampaignId: e.target.value
                          })
                        }
                        className='w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500'
                        placeholder='meta_123456'
                      />
                    </div>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-1'>
                        Meta Adset ID
                      </label>
                      <input
                        type='text'
                        value={formData.metaAdsetId}
                        onChange={e =>
                          setFormData({
                            ...formData,
                            metaAdsetId: e.target.value
                          })
                        }
                        className='w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500'
                        placeholder='adset_123456'
                      />
                    </div>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-1'>
                        Meta Ad ID
                      </label>
                      <input
                        type='text'
                        value={formData.metaAdId}
                        onChange={e =>
                          setFormData({ ...formData, metaAdId: e.target.value })
                        }
                        className='w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500'
                        placeholder='ad_123456'
                      />
                    </div>
                  </>
                )}

                {/* Date Range */}
                <div className='grid grid-cols-2 gap-4'>
                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-1'>
                      Start Date <span className='text-red-500'>*</span>
                    </label>
                    <input
                      type='date'
                      value={formData.startDate}
                      onChange={e =>
                        setFormData({ ...formData, startDate: e.target.value })
                      }
                      className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 ${
                        formErrors.startDate
                          ? 'border-red-500'
                          : 'border-gray-300'
                      }`}
                    />
                    {formErrors.startDate && (
                      <p className='mt-1 text-xs text-red-500'>
                        {formErrors.startDate}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-1'>
                      End Date <span className='text-red-500'>*</span>
                    </label>
                    <input
                      type='date'
                      value={formData.endDate}
                      onChange={e =>
                        setFormData({ ...formData, endDate: e.target.value })
                      }
                      className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 ${
                        formErrors.endDate
                          ? 'border-red-500'
                          : 'border-gray-300'
                      }`}
                    />
                    {formErrors.endDate && (
                      <p className='mt-1 text-xs text-red-500'>
                        {formErrors.endDate}
                      </p>
                    )}
                  </div>
                </div>

                {formErrors.dateRange && (
                  <p className='text-sm text-red-500'>{formErrors.dateRange}</p>
                )}
                
                {error && (
                  <div className='p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700'>
                    {error}
                  </div>
                )}

                {/* Status */}
                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-1'>
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={e =>
                      setFormData({ ...formData, status: e.target.value })
                    }
                    className='w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500'
                  >
                    <option value='DRAFT'>Draft</option>
                    <option value='ACTIVE'>Active</option>
                    <option value='PAUSED'>Paused</option>
                    <option value='COMPLETED'>Completed</option>
                  </select>
                </div>
              </div>

              <div className='px-6 py-4 border-t border-gray-100 flex justify-end gap-3'>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className='px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50'
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitCampaign}
                  disabled={loading}
                  className='px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2'
                >
                  {loading ? (
                    <>
                      <span className='animate-spin'>⌛</span>
                      Saving...
                    </>
                  ) : editingCampaign ? (
                    'Update Campaign'
                  ) : (
                    'Create Campaign'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}

export default CampaignsPage
