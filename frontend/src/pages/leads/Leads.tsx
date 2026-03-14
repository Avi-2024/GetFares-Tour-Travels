import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FaCalendarPlus,
  FaChevronLeft,
  FaChevronRight,
  FaEye,
  FaFileImport,
  FaFileInvoiceDollar,
  FaFire,
  FaSearch,
  FaPlus,
  FaUsers
} from 'react-icons/fa'
import EmptyState from '../../components/ui/EmptyState'
import StatusBadge from '../../components/ui/StatusBadge'
import SurfaceCard from '../../components/ui/SurfaceCard'

interface Lead {
  id: number
  leadId: string
  name: string
  email: string
  phone: string
  destination: string
  packageName: string
  status: 'New' | 'Contacted' | 'Qualified' | 'Lost'
  priority: 'High' | 'Medium' | 'Low'
  sla: string
  consultant: string
}

const allLeads: Lead[] = [
  {
    id: 1,
    leadId: '#LD-2026-001',
    name: 'Sarah Connor',
    email: 'sarah.c@gmail.com',
    phone: '+1 555 123 4567',
    destination: 'Maldives',
    packageName: 'Honeymoon',
    status: 'New',
    priority: 'High',
    sla: '1h left',
    consultant: 'Alex Morgan'
  },
  {
    id: 2,
    leadId: '#LD-2026-002',
    name: 'John Miller',
    email: 'john.m@corp.com',
    phone: '+44 20 7123',
    destination: 'Dubai',
    packageName: 'Business',
    status: 'Contacted',
    priority: 'Medium',
    sla: '4h left',
    consultant: 'Sarah Jenkins'
  },
  {
    id: 3,
    leadId: '#LD-2026-003',
    name: 'Luna Raymond',
    email: 'luna.r@gmail.com',
    phone: '+1 555 122',
    destination: 'Bali',
    packageName: 'Family',
    status: 'Qualified',
    priority: 'Low',
    sla: 'On time',
    consultant: 'Mike Ross'
  },
  {
    id: 4,
    leadId: '#LD-2026-004',
    name: 'David Roy',
    email: 'david.roy@gmail.com',
    phone: '+91 97322',
    destination: 'Paris',
    packageName: 'Luxury',
    status: 'Lost',
    priority: 'High',
    sla: 'Overdue',
    consultant: 'Alex Morgan'
  }
]

const tabs = ['All', 'New', 'Contacted', 'Qualified', 'Lost'] as const
type Tab = typeof tabs[number]

const Leads: React.FC = () => {
  const [tab, setTab] = useState<Tab>('All')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 3
  const nav = useNavigate()

  const filtered = useMemo(
    () =>
      allLeads.filter(
        l =>
          (tab === 'All' || l.status === tab) &&
          `${l.name} ${l.email} ${l.destination} ${l.phone}`
            .toLowerCase()
            .includes(search.toLowerCase())
      ),
    [tab, search]
  )

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const leads = filtered.slice((page - 1) * pageSize, page * pageSize)

  const getPriorityClass = (priority: string) => {
    switch (priority) {
      case 'High':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
      case 'Medium':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
      case 'Low':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
    }
  }

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-gray-950'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8'>
        {/* Header Section - Desktop original, Mobile adjusted */}
        <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6'>
          <div>
            <h1 className='text-2xl font-bold text-gray-900 dark:text-gray-100'>
              Leads Management
            </h1>
            <p className='mt-1 text-sm text-gray-500 dark:text-gray-400'>
              Manage your potential customers.
            </p>
          </div>

          {/* Action Buttons */}
          <div className='flex w-full sm:w-auto flex-wrap sm:flex-nowrap items-center gap-2'>
            <button className='inline-flex h-10 min-w-[140px] items-center justify-center gap-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors'>
              <FaFileImport /> Import
            </button>

            <button
              onClick={() => nav('/create-lead')}
              className='inline-flex h-10 min-w-[140px] items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 text-sm font-semibold text-white transition-colors'
            >
              <FaPlus /> Create Lead
            </button>
          </div>
        </div>

        {/* KPI Cards - Desktop: 4 in a row, Mobile: stacked */}
        <div className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6'>
          <KpiCard
            title='All Leads'
            value='1248'
            icon={<FaUsers className='text-blue-600 text-xl' />}
          />
          <KpiCard
            title='New Today'
            value='24'
            icon={<FaCalendarPlus className='text-green-500 text-xl' />}
          />
          <KpiCard
            title='Hot Leads'
            value='86'
            icon={<FaFire className='text-red-500 text-xl' />}
          />
          <KpiCard
            title='Qualified'
            value='220'
            icon={<FaFileInvoiceDollar className='text-amber-500 text-xl' />}
          />
        </div>

        {/* Main Card */}
        <SurfaceCard className='overflow-hidden border border-gray-200 dark:border-gray-800'>
          {/* Search and Filter Bar */}
          <div className='p-4 border-b border-gray-200 dark:border-gray-800'>
            <div className='flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3'>
              {/* Tabs - Horizontal scroll on mobile, inline on desktop */}
              <div className='w-full lg:w-auto overflow-x-auto pb-1 scrollbar-hide'>
                <div className='inline-flex rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-1'>
                  {tabs.map(t => (
                    <button
                      key={t}
                      onClick={() => {
                        setTab(t)
                        setPage(1)
                      }}
                      className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-lg whitespace-nowrap transition-all ${
                        tab === t
                          ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Search */}
              <div className='relative w-full lg:w-80'>
                <FaSearch className='absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400' />
                <input
                  type='text'
                  value={search}
                  onChange={e => {
                    setSearch(e.target.value)
                    setPage(1)
                  }}
                  placeholder='Search leads...'
                  className='w-full pl-9 pr-4 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                />
              </div>
            </div>
          </div>

          {/* Leads List */}
          {leads.length === 0 ? (
            <div className='p-8'>
              <EmptyState
                title='No leads found'
                description='Try adjusting your search or filters'
                action={
                  <button
                    onClick={() => {
                      setSearch('')
                      setTab('All')
                    }}
                    className='px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors'
                  >
                    Clear filters
                  </button>
                }
                icon={<FaUsers className='text-4xl' />}
              />
            </div>
          ) : (
            <>
              {/* Mobile View - Card Layout (stacked) */}
              <div className='block lg:hidden divide-y divide-gray-100 dark:divide-gray-800'>
                {leads.map(lead => (
                  <div
                    key={lead.id}
                    className='p-4 space-y-4 hover:bg-blue-50/40 dark:hover:bg-gray-800/50 transition-colors'
                  >
                    {/* Header Row */}
                    <div className='flex items-start justify-between'>
                      <div className='space-y-1'>
                        <h3 className='font-semibold text-gray-900 dark:text-gray-100'>
                          {lead.name}
                        </h3>
                        <p className='text-xs text-gray-500'>{lead.leadId}</p>
                      </div>
                      <StatusBadge status={lead.status} />
                    </div>

                    {/* Contact Details */}
                    <div className='grid grid-cols-2 gap-3'>
                      <div>
                        <p className='text-xs text-gray-500'>Email</p>
                        <p className='text-sm text-gray-800 dark:text-gray-300 break-all'>
                          {lead.email}
                        </p>
                      </div>
                      <div>
                        <p className='text-xs text-gray-500'>Phone</p>
                        <p className='text-sm text-gray-800 dark:text-gray-300'>
                          {lead.phone}
                        </p>
                      </div>
                    </div>

                    {/* Trip Details */}
                    <div className='grid grid-cols-2 gap-3'>
                      <div>
                        <p className='text-xs text-gray-500'>Destination</p>
                        <p className='text-sm font-medium text-gray-900 dark:text-gray-100'>
                          {lead.destination}
                        </p>
                      </div>
                      <div>
                        <p className='text-xs text-gray-500'>Package</p>
                        <p className='text-sm text-gray-800 dark:text-gray-300'>
                          {lead.packageName}
                        </p>
                      </div>
                    </div>

                    {/* Priority & Consultant */}
                    <div className='grid grid-cols-2 gap-3'>
                      <div>
                        <p className='text-xs text-gray-500'>Priority</p>
                        <div className='flex items-center gap-2 mt-1'>
                          <span
                            className={`text-xs px-2 py-1 rounded-full ${getPriorityClass(
                              lead.priority
                            )}`}
                          >
                            {lead.priority}
                          </span>
                        </div>
                      </div>
                      <div>
                        <p className='text-xs text-gray-500'>SLA</p>
                        <p className='text-sm text-gray-600 dark:text-gray-400'>
                          {lead.sla}
                        </p>
                      </div>
                    </div>

                    {/* Consultant & Actions */}
                    <div className='flex items-center justify-between pt-2'>
                      <p className='text-sm text-gray-700 dark:text-gray-300'>
                        {lead.consultant}
                      </p>
                      <div className='flex gap-2'>
                        <button
                          onClick={() => nav(`/leads/${lead.id}`)}
                          className='p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all'
                        >
                          <FaEye />
                        </button>
                        <button className='p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all'>
                          <FaFileInvoiceDollar />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop View - Table (ORIGINAL - UNCHANGED) */}
              <div className='hidden lg:block overflow-x-auto'>
                <table className='w-full'>
                  <thead className='bg-gray-50 dark:bg-gray-800/50'>
                    <tr>
                      <th className='px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                        Lead
                      </th>
                      <th className='px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                        Contact
                      </th>
                      <th className='px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                        Trip
                      </th>
                      <th className='px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                        Status
                      </th>
                      <th className='px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                        Priority / SLA
                      </th>
                      <th className='px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                        Consultant
                      </th>
                      <th className='px-5 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className='divide-y divide-gray-100 dark:divide-gray-800'>
                    {leads.map(lead => (
                      <tr
                        key={lead.id}
                        className='group hover:bg-blue-50/40 dark:hover:bg-gray-800/50 transition-colors cursor-pointer'
                        onClick={() => nav(`/leads/${lead.id}`)}
                      >
                        <td className='px-5 py-4'>
                          <p className='font-medium text-gray-900 dark:text-gray-100'>
                            {lead.name}
                          </p>
                          <p className='text-xs text-gray-500'>{lead.leadId}</p>
                        </td>
                        <td className='px-5 py-4'>
                          <p className='text-sm text-gray-800 dark:text-gray-200'>
                            {lead.email}
                          </p>
                          <p className='text-xs text-gray-500'>{lead.phone}</p>
                        </td>
                        <td className='px-5 py-4'>
                          <p className='text-sm text-gray-800 dark:text-gray-200'>
                            {lead.destination}
                          </p>
                          <p className='text-xs text-gray-500'>
                            {lead.packageName}
                          </p>
                        </td>
                        <td className='px-5 py-4'>
                          <StatusBadge status={lead.status} />
                        </td>
                        <td className='px-5 py-4'>
                          <p className='text-xs text-gray-600 dark:text-gray-300'>
                            {lead.priority}
                          </p>
                          <p className='text-xs text-gray-500'>{lead.sla}</p>
                        </td>
                        <td className='px-5 py-4 text-sm text-gray-700 dark:text-gray-300'>
                          {lead.consultant}
                        </td>
                        <td className='px-5 py-4'>
                          <div
                            className='flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity'
                            onClick={e => e.stopPropagation()}
                          >
                            <button className='p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:text-gray-400 dark:hover:text-blue-400 dark:hover:bg-blue-900/20 transition-colors'>
                              <FaEye />
                            </button>
                            <button className='p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-green-600 hover:bg-green-50 dark:text-gray-400 dark:hover:text-green-400 dark:hover:bg-green-900/20 transition-colors'>
                              <FaFileInvoiceDollar />
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
                <p className='text-sm text-gray-500 dark:text-gray-400 order-2 sm:order-1'>
                  Showing {Math.min(filtered.length, (page - 1) * pageSize + 1)}
                  -{Math.min(filtered.length, page * pageSize)} of{' '}
                  {filtered.length}
                </p>

                <div className='flex items-center gap-2 order-1 sm:order-2'>
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className='p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors'
                  >
                    <FaChevronLeft />
                  </button>
                  <span className='px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-sm font-medium'>
                    {page}
                  </span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className='p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors'
                  >
                    <FaChevronRight />
                  </button>
                </div>
              </div>
            </>
          )}
        </SurfaceCard>
      </div>
    </div>
  )
}

// KPI Card Component
const KpiCard = ({
  title,
  value,
  icon
}: {
  title: string
  value: string
  icon: React.ReactNode
}) => (
  <SurfaceCard className='p-5 hover:shadow-md transition-shadow'>
    <div className='flex items-center justify-between'>
      <div>
        <p className='text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400'>
          {title}
        </p>
        <h3 className='mt-2 text-2xl font-semibold text-gray-900 dark:text-gray-100'>
          {value}
        </h3>
      </div>
      <div className='text-2xl'>{icon}</div>
    </div>
  </SurfaceCard>
)

export default Leads
