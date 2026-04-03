import React, { useState, useEffect } from 'react'
import { FaBuilding, FaSearch, FaFilter, FaDownload, FaChevronDown, FaChevronUp } from 'react-icons/fa'
import SurfaceCard from '../../components/ui/SurfaceCard'
import EmptyState from '../../components/ui/EmptyState'
import SearchableDropdown from '../../components/ui/SearchableDropdown'

// Types
interface SupplierServiceRow {
  id: string
  quotationId: string
  quoteNumber: string
  leadName: string
  supplierName: string
  supplierId: string
  serviceType: string // HOTEL, FLIGHT, TOUR, INSURANCE, etc.
  serviceName: string
  baseCost: number
  markup: number
  markupPercent: number
  finalSellValue: number
  currency: string
  createdAt: string
  status: string
}

interface SupplierSummary {
  supplierId: string
  supplierName: string
  totalServices: number
  totalBaseCost: number
  totalMarkup: number
  totalSellValue: number
  currency: string
  services: {
    [serviceType: string]: {
      count: number
      baseCost: number
      markup: number
      sellValue: number
    }
  }
}

const SupplierServiceBreakdown: React.FC = () => {
  const [data, setData] = useState<SupplierServiceRow[]>([])
  const [supplierSummaries, setSupplierSummaries] = useState<SupplierSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState({
    supplier: '',
    serviceType: '',
    currency: '',
    from: '',
    to: '',
    status: ''
  })
  const [expandedSuppliers, setExpandedSuppliers] = useState<Set<string>>(new Set())

  // Mock data - Replace with actual API call
  useEffect(() => {
    fetchSupplierServiceData()
  }, [filters])

  const fetchSupplierServiceData = async () => {
    setLoading(true)
    try {
      // TODO: Replace with actual API call
      // const response = await reportsApi.supplierServiceBreakdown(filters)
      
      // Mock data for demonstration
      const mockData: SupplierServiceRow[] = [
        {
          id: '1',
          quotationId: 'qt-001',
          quoteNumber: 'QT-20240115-123456',
          leadName: 'John Doe',
          supplierName: 'Maldives Resorts',
          supplierId: 'sup-001',
          serviceType: 'HOTEL',
          serviceName: 'Accommodation - 5N Hotel',
          baseCost: 5000,
          markup: 500,
          markupPercent: 10,
          finalSellValue: 5500,
          currency: 'USD',
          createdAt: '2024-01-15T10:30:00Z',
          status: 'APPROVED'
        },
        {
          id: '2',
          quotationId: 'qt-001',
          quoteNumber: 'QT-20240115-123456',
          leadName: 'John Doe',
          supplierName: 'Emirates Airlines',
          supplierId: 'sup-002',
          serviceType: 'FLIGHT',
          serviceName: 'Round Trip Flight',
          baseCost: 6000,
          markup: 900,
          markupPercent: 15,
          finalSellValue: 6900,
          currency: 'USD',
          createdAt: '2024-01-15T10:30:00Z',
          status: 'APPROVED'
        },
        {
          id: '3',
          quotationId: 'qt-002',
          quoteNumber: 'QT-20240116-789012',
          leadName: 'Jane Smith',
          supplierName: 'Maldives Resorts',
          supplierId: 'sup-001',
          serviceType: 'HOTEL',
          serviceName: 'Accommodation - 3N Hotel',
          baseCost: 3000,
          markup: 300,
          markupPercent: 10,
          finalSellValue: 3300,
          currency: 'USD',
          createdAt: '2024-01-16T14:20:00Z',
          status: 'SENT'
        }
      ]

      setData(mockData)
      calculateSupplierSummaries(mockData)
    } catch (error) {
      console.error('Failed to fetch supplier service data:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateSupplierSummaries = (rows: SupplierServiceRow[]) => {
    const summaryMap = new Map<string, SupplierSummary>()

    rows.forEach(row => {
      if (!summaryMap.has(row.supplierId)) {
        summaryMap.set(row.supplierId, {
          supplierId: row.supplierId,
          supplierName: row.supplierName,
          totalServices: 0,
          totalBaseCost: 0,
          totalMarkup: 0,
          totalSellValue: 0,
          currency: row.currency,
          services: {}
        })
      }

      const summary = summaryMap.get(row.supplierId)!
      summary.totalServices += 1
      summary.totalBaseCost += row.baseCost
      summary.totalMarkup += row.markup
      summary.totalSellValue += row.finalSellValue

      if (!summary.services[row.serviceType]) {
        summary.services[row.serviceType] = {
          count: 0,
          baseCost: 0,
          markup: 0,
          sellValue: 0
        }
      }

      summary.services[row.serviceType].count += 1
      summary.services[row.serviceType].baseCost += row.baseCost
      summary.services[row.serviceType].markup += row.markup
      summary.services[row.serviceType].sellValue += row.finalSellValue
    })

    setSupplierSummaries(Array.from(summaryMap.values()))
  }

  const toggleSupplierExpansion = (supplierId: string) => {
    setExpandedSuppliers(prev => {
      const newSet = new Set(prev)
      if (newSet.has(supplierId)) {
        newSet.delete(supplierId)
      } else {
        newSet.add(supplierId)
      }
      return newSet
    })
  }

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(amount)
    } catch {
      return `${amount.toFixed(2)} ${currency}`
    }
  }

  const formatDateTime = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString()
    } catch {
      return dateStr
    }
  }

  const filteredData = data.filter(row => {
    const searchLower = search.toLowerCase()
    const matchesSearch = !search || 
      row.supplierName.toLowerCase().includes(searchLower) ||
      row.serviceName.toLowerCase().includes(searchLower) ||
      row.quoteNumber.toLowerCase().includes(searchLower) ||
      row.leadName.toLowerCase().includes(searchLower)

    const matchesSupplier = !filters.supplier || row.supplierId === filters.supplier
    const matchesServiceType = !filters.serviceType || row.serviceType === filters.serviceType
    const matchesCurrency = !filters.currency || row.currency === filters.currency
    const matchesStatus = !filters.status || row.status === filters.status

    return matchesSearch && matchesSupplier && matchesServiceType && matchesCurrency && matchesStatus
  })

  const exportToCSV = () => {
    const headers = ['Quote Number', 'Lead Name', 'Supplier', 'Service Type', 'Service Name', 'Base Cost', 'Markup %', 'Markup Amount', 'Final Sell Value', 'Currency', 'Status', 'Created At']
    const rows = filteredData.map(row => [
      row.quoteNumber,
      row.leadName,
      row.supplierName,
      row.serviceType,
      row.serviceName,
      row.baseCost,
      row.markupPercent,
      row.markup,
      row.finalSellValue,
      row.currency,
      row.status,
      formatDateTime(row.createdAt)
    ])

    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `supplier-service-breakdown-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
        <div>
          <h2 className='text-2xl font-bold text-gray-900 dark:text-gray-100'>
            Supplier-wise Service Breakdown
          </h2>
          <p className='text-sm text-gray-600 dark:text-gray-400 mt-1'>
            Track which supplier is providing which service and at what cost
          </p>
        </div>
        <button
          onClick={exportToCSV}
          disabled={filteredData.length === 0}
          className='inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed'
        >
          <FaDownload /> Export CSV
        </button>
      </div>

      {/* Info Banner */}
      <SurfaceCard className='p-4 border border-blue-200 bg-blue-50/60 dark:border-blue-800 dark:bg-blue-900/20'>
        <div className='flex items-start gap-3'>
          <div className='flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center'>
            <FaBuilding className='text-blue-600 dark:text-blue-400' />
          </div>
          <div className='flex-1'>
            <h3 className='text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1'>
              Supplier Service Allocation
            </h3>
            <p className='text-sm text-blue-800 dark:text-blue-200'>
              This report shows which supplier is selected for each service in quotations. Base cost, markup percentage, and final sell value are tracked per service.
            </p>
          </div>
        </div>
      </SurfaceCard>

      {/* Filters */}
      <SurfaceCard className='p-4 border border-gray-200 dark:border-gray-800'>
        <div className='flex items-center gap-2 mb-4'>
          <FaFilter className='text-gray-500' />
          <h3 className='text-sm font-semibold text-gray-900 dark:text-gray-100'>Filters</h3>
        </div>
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
          <div>
            <label className='field-label'>Supplier</label>
            <SearchableDropdown
              value={filters.supplier}
              onChange={value => setFilters({ ...filters, supplier: value })}
              options={[
                { value: '', label: 'All Suppliers' },
                { value: 'sup-001', label: 'Maldives Resorts' },
                { value: 'sup-002', label: 'Emirates Airlines' }
              ]}
              placeholder='Select supplier'
              className='w-full'
            />
          </div>
          <div>
            <label className='field-label'>Service Type</label>
            <SearchableDropdown
              value={filters.serviceType}
              onChange={value => setFilters({ ...filters, serviceType: value })}
              options={[
                { value: '', label: 'All Services' },
                { value: 'HOTEL', label: 'Hotel' },
                { value: 'FLIGHT', label: 'Flight' },
                { value: 'TOUR', label: 'Tours & Activities' },
                { value: 'INSURANCE', label: 'Insurance' },
                { value: 'TRANSFER', label: 'Transfer' }
              ]}
              placeholder='Select service type'
              className='w-full'
            />
          </div>
          <div>
            <label className='field-label'>Currency</label>
            <SearchableDropdown
              value={filters.currency}
              onChange={value => setFilters({ ...filters, currency: value })}
              options={[
                { value: '', label: 'All Currencies' },
                { value: 'USD', label: 'USD' },
                { value: 'EUR', label: 'EUR' },
                { value: 'INR', label: 'INR' }
              ]}
              placeholder='Select currency'
              className='w-full'
            />
          </div>
          <div>
            <label className='field-label'>Status</label>
            <SearchableDropdown
              value={filters.status}
              onChange={value => setFilters({ ...filters, status: value })}
              options={[
                { value: '', label: 'All Status' },
                { value: 'DRAFT', label: 'Draft' },
                { value: 'SENT', label: 'Sent' },
                { value: 'APPROVED', label: 'Approved' }
              ]}
              placeholder='Select status'
              className='w-full'
            />
          </div>
        </div>
      </SurfaceCard>

      {/* Search */}
      <div className='relative'>
        <FaSearch className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm' />
        <input
          type='text'
          placeholder='Search by supplier, service, quote number, or lead name...'
          value={search}
          onChange={e => setSearch(e.target.value)}
          className='w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-800'
        />
      </div>

      {/* Supplier Summaries */}
      <div className='space-y-4'>
        <h3 className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
          Supplier Summaries
        </h3>
        {supplierSummaries.map(summary => (
          <SurfaceCard key={summary.supplierId} className='border border-gray-200 dark:border-gray-800 overflow-hidden'>
            <div 
              className='p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50'
              onClick={() => toggleSupplierExpansion(summary.supplierId)}
            >
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-3'>
                  <div className='w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center'>
                    <FaBuilding className='text-blue-600 dark:text-blue-400' />
                  </div>
                  <div>
                    <h4 className='text-base font-semibold text-gray-900 dark:text-gray-100'>
                      {summary.supplierName}
                    </h4>
                    <p className='text-xs text-gray-500 dark:text-gray-400'>
                      {summary.totalServices} services • {summary.currency}
                    </p>
                  </div>
                </div>
                <div className='flex items-center gap-6'>
                  <div className='text-right'>
                    <p className='text-xs text-gray-500 dark:text-gray-400'>Base Cost</p>
                    <p className='text-sm font-semibold text-gray-900 dark:text-gray-100'>
                      {formatCurrency(summary.totalBaseCost, summary.currency)}
                    </p>
                  </div>
                  <div className='text-right'>
                    <p className='text-xs text-gray-500 dark:text-gray-400'>Markup</p>
                    <p className='text-sm font-semibold text-green-600 dark:text-green-400'>
                      {formatCurrency(summary.totalMarkup, summary.currency)}
                    </p>
                  </div>
                  <div className='text-right'>
                    <p className='text-xs text-gray-500 dark:text-gray-400'>Total Sell</p>
                    <p className='text-base font-bold text-blue-600 dark:text-blue-400'>
                      {formatCurrency(summary.totalSellValue, summary.currency)}
                    </p>
                  </div>
                  {expandedSuppliers.has(summary.supplierId) ? 
                    <FaChevronUp className='text-gray-400' />
                  : <FaChevronDown className='text-gray-400' />
                  }
                </div>
              </div>
            </div>

            {expandedSuppliers.has(summary.supplierId) && (
              <div className='border-t border-gray-200 dark:border-gray-800 p-4 bg-gray-50 dark:bg-gray-800/30'>
                <h5 className='text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3'>
                  Service Breakdown
                </h5>
                <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3'>
                  {Object.entries(summary.services).map(([serviceType, serviceData]) => (
                    <div key={serviceType} className='p-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700'>
                      <p className='text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2'>
                        {serviceType}
                      </p>
                      <div className='space-y-1 text-xs'>
                        <div className='flex justify-between'>
                          <span className='text-gray-500'>Count:</span>
                          <span className='font-medium'>{serviceData.count}</span>
                        </div>
                        <div className='flex justify-between'>
                          <span className='text-gray-500'>Base:</span>
                          <span className='font-medium'>{formatCurrency(serviceData.baseCost, summary.currency)}</span>
                        </div>
                        <div className='flex justify-between'>
                          <span className='text-gray-500'>Markup:</span>
                          <span className='font-medium text-green-600'>{formatCurrency(serviceData.markup, summary.currency)}</span>
                        </div>
                        <div className='flex justify-between border-t border-gray-200 dark:border-gray-700 pt-1'>
                          <span className='text-gray-700 dark:text-gray-300 font-semibold'>Total:</span>
                          <span className='font-semibold text-blue-600'>{formatCurrency(serviceData.sellValue, summary.currency)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Detailed Rows for this Supplier */}
                <div className='mt-4'>
                  <h6 className='text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide'>
                    Detailed Services
                  </h6>
                  <div className='overflow-x-auto'>
                    <table className='w-full text-sm'>
                      <thead className='bg-gray-100 dark:bg-gray-800'>
                        <tr>
                          <th className='px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400'>Quote</th>
                          <th className='px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400'>Lead</th>
                          <th className='px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400'>Service</th>
                          <th className='px-3 py-2 text-right text-xs font-semibold text-gray-600 dark:text-gray-400'>Base Cost</th>
                          <th className='px-3 py-2 text-right text-xs font-semibold text-gray-600 dark:text-gray-400'>Markup %</th>
                          <th className='px-3 py-2 text-right text-xs font-semibold text-gray-600 dark:text-gray-400'>Markup</th>
                          <th className='px-3 py-2 text-right text-xs font-semibold text-gray-600 dark:text-gray-400'>Sell Value</th>
                          <th className='px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400'>Status</th>
                        </tr>
                      </thead>
                      <tbody className='divide-y divide-gray-200 dark:divide-gray-700'>
                        {filteredData
                          .filter(row => row.supplierId === summary.supplierId)
                          .map(row => (
                            <tr key={row.id} className='hover:bg-gray-50 dark:hover:bg-gray-800/50'>
                              <td className='px-3 py-2 text-xs'>{row.quoteNumber}</td>
                              <td className='px-3 py-2 text-xs'>{row.leadName}</td>
                              <td className='px-3 py-2 text-xs'>
                                <div>
                                  <p className='font-medium'>{row.serviceType}</p>
                                  <p className='text-gray-500'>{row.serviceName}</p>
                                </div>
                              </td>
                              <td className='px-3 py-2 text-xs text-right'>{formatCurrency(row.baseCost, row.currency)}</td>
                              <td className='px-3 py-2 text-xs text-right'>{row.markupPercent}%</td>
                              <td className='px-3 py-2 text-xs text-right text-green-600'>{formatCurrency(row.markup, row.currency)}</td>
                              <td className='px-3 py-2 text-xs text-right font-semibold'>{formatCurrency(row.finalSellValue, row.currency)}</td>
                              <td className='px-3 py-2 text-xs'>
                                <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                                  row.status === 'APPROVED' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                                  row.status === 'SENT' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                                  'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                                }`}>
                                  {row.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </SurfaceCard>
        ))}

        {supplierSummaries.length === 0 && (
          <EmptyState
            title='No supplier data found'
            description='No services have been allocated to suppliers yet'
            icon={<FaBuilding className='text-4xl' />}
          />
        )}
      </div>
    </div>
  )
}

export default SupplierServiceBreakdown
