import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FaCalendarPlus,
  FaChevronLeft,
  FaChevronRight,
  FaEye,
  FaFire,
  FaPlus,
  FaSearch,
  FaUsers
} from 'react-icons/fa'
import EmptyState from '../../components/ui/EmptyState'
import StatusBadge from '../../components/ui/StatusBadge'
import SurfaceCard from '../../components/ui/SurfaceCard'
import { getApiErrorMessage } from '../../api/apiClient'
import { useLeadsService } from '../../hooks/useLeadsService'
import type { LeadListItem } from '../../services/leadsService'
import {
  SOP_STATUS_LABELS,
  type SopStatusLabel,
  toStatusLabelText
} from '../../utils/leadStatus'

interface LeadStats {
  totalLeads: number
  newToday: number
  followupActive: number
  slaBreached: number
}

const quickFilters = [
  { key: 'ALL', label: 'All' },
  { key: 'ACTIVE', label: 'Active' },
  { key: 'FOLLOW_UP', label: 'Follow-up' },
  { key: 'CLOSED', label: 'Closed' },
  { key: 'LATE_RESPONSE', label: 'Late Response' }
] as const
type QuickFilter = typeof quickFilters[number]['key']

const Leads: React.FC = () => {
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('ALL')
  const [statusFilter, setStatusFilter] = useState<SopStatusLabel | 'ALL'>(
    'ALL'
  )
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fetchedLeads, setFetchedLeads] = useState<LeadListItem[]>([])
  const pageSize = 15
  const nav = useNavigate()
  const leadsService = useLeadsService()

  useEffect(() => {
    const fetchLeads = async () => {
      setLoading(true)
      setError('')
      try {
        const mapped = await leadsService.listLeads({
          page: 1,
          limit: 500
        })
        setFetchedLeads(mapped)
      } catch (err) {
        setError(getApiErrorMessage(err, 'Failed to load leads'))
        setFetchedLeads([])
      } finally {
        setLoading(false)
      }
    }
    void fetchLeads()
  }, [leadsService])

  const filtered = useMemo(
    () =>
      fetchedLeads.filter(lead => {
        const quickMatch =
          quickFilter === 'ALL' ||
          (quickFilter === 'ACTIVE' &&
            ['NEW', 'CONTACTED', 'NEGOTIATION', 'QUOTED'].includes(
              lead.statusLabel
            )) ||
          (quickFilter === 'FOLLOW_UP' &&
            (lead.statusLabel.startsWith('FOLLOW_UP') ||
              lead.statusLabel === 'FINAL_REMINDER')) ||
          (quickFilter === 'CLOSED' &&
            ['CONVERTED', 'LOST', 'NON_RESPONSIVE'].includes(
              lead.statusLabel
            )) ||
          (quickFilter === 'LATE_RESPONSE' && lead.slaBreached)
        const statusMatch =
          statusFilter === 'ALL' || lead.statusLabel === statusFilter
        const text =
          `${lead.name} ${lead.email} ${lead.destination} ${lead.phone}`.toLowerCase()
        return quickMatch && statusMatch && text.includes(search.toLowerCase())
      }),
    [fetchedLeads, quickFilter, search, statusFilter]
  )

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const rows = filtered.slice((page - 1) * pageSize, page * pageSize)

  const leadStats = useMemo<LeadStats>(
    () => ({
      totalLeads: fetchedLeads.length,
      newToday: fetchedLeads.filter(lead => lead.statusLabel === 'NEW').length,
      followupActive: fetchedLeads.filter(
        lead =>
          lead.statusLabel.startsWith('FOLLOW_UP') ||
          lead.statusLabel === 'FINAL_REMINDER'
      ).length,
      slaBreached: fetchedLeads.filter(lead => lead.slaBreached).length
    }),
    [fetchedLeads]
  )

  const handleViewLead = (lead: LeadListItem) => {
    sessionStorage.setItem(`lead:${lead.id}`, JSON.stringify(lead))
    nav(`/leads/${lead.id}`, { state: { lead } })
  }

  const getVisaHolidayLabel = (lead: LeadListItem) => {
    const source = `${lead.packageName ?? ''} ${lead.statusLabel ?? ''}`
      .trim()
      .toLowerCase()
    return source.includes('visa') ? 'Visa' : 'Holidays'
  }

  return (
    <div className='space-y-4 sm:space-y-6 overflow-x-hidden'>
      <div className='max-w-9xl mx-auto space-y-4 sm:space-y-6 px-0 sm:px-0 lg:pl-0 lg:pr-0'>
        <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
          <div className='flex flex-col gap-1'>
            <h1 className='text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100'>
              Leads Management
            </h1>
            <p className='text-xs sm:text-sm text-gray-500 dark:text-gray-400'>
              SOP-aligned lead pipeline with follow-up and SLA visibility.
            </p>
          </div>
          <button
            onClick={() => nav('/create-lead')}
            className='inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors w-full sm:w-auto'
          >
            <FaPlus className='mr-2' />
            <span>Create Lead</span>
          </button>
        </div>

        <div className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4'>
          <KpiCard
            title='All Leads'
            value={String(leadStats.totalLeads)}
            icon={<FaUsers className='text-blue-600 text-xl' />}
          />
          <KpiCard
            title='New Today'
            value={String(leadStats.newToday)}
            icon={<FaCalendarPlus className='text-green-500 text-xl' />}
          />
          <KpiCard
            title='Follow-up Active'
            value={String(leadStats.followupActive)}
            icon={<FaCalendarPlus className='text-amber-500 text-xl' />}
          />
          <KpiCard
            title='Late Responses'
            value={String(leadStats.slaBreached)}
            icon={<FaFire className='text-red-500 text-xl' />}
          />
        </div>

        <SurfaceCard className='p-0 overflow-hidden border border-gray-200 dark:border-gray-800'>
          <div className='p-3 sm:p-4 border-b border-gray-200 dark:border-gray-800 space-y-3'>
            {error ? (
              <div className='rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-200'>
                {error}
              </div>
            ) : null}
            <div className='w-full overflow-x-auto pb-1 scrollbar-hide'>
              <div className='inline-flex rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-1'>
                {quickFilters.map(item => (
                  <button
                    key={item.key}
                    onClick={() => {
                      setQuickFilter(item.key)
                      setPage(1)
                    }}
                    className={`px-3 py-2 text-xs sm:text-sm font-medium rounded-lg whitespace-nowrap transition-all ${
                      quickFilter === item.key
                        ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
            <div className='grid grid-cols-1 gap-3 lg:grid-cols-[1fr_220px]'>
              <div className='relative w-full'>
                <FaSearch className='absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400' />
                <input
                  type='text'
                  value={search}
                  onChange={event => {
                    setSearch(event.target.value)
                    setPage(1)
                  }}
                  placeholder='Search leads...'
                  className='w-full pl-9 pr-4 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                />
              </div>
              <select
                value={statusFilter}
                onChange={event => {
                  setStatusFilter(event.target.value as SopStatusLabel | 'ALL')
                  setPage(1)
                }}
                className='w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent'
              >
                <option value='ALL'>All Statuses</option>
                {SOP_STATUS_LABELS.map(status => (
                  <option key={status} value={status}>
                    {toStatusLabelText(status)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <div className='p-8 text-center text-sm text-gray-500 dark:text-gray-400'>
              Loading leads...
            </div>
          ) : rows.length === 0 ? (
            <div className='p-8'>
              <EmptyState
                title='No leads found'
                description='Try adjusting your search or status filters.'
                icon={<FaUsers className='text-4xl' />}
              />
            </div>
          ) : (
            <>
              <div className='hidden lg:block w-full max-w-full overflow-x-auto leads-table-scroll'>
                <table className='min-w-[1320px] w-full'>
                  <thead className='bg-gray-50 dark:bg-gray-800/50'>
                    <tr>
                      <th className='px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider'>
                        Lead
                      </th>
                      <th className='pl-1 pr-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider'>
                        Lead ID
                      </th>
                      <th className='px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider'>
                        Email
                      </th>
                      <th className='px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider'>
                        Phone
                      </th>
                      <th className='px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider'>
                        Destination
                      </th>
                      <th className='px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider'>
                        Visa/Holidays
                      </th>
                      <th className='px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider'>
                        Status
                      </th>
                      <th className='px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider'>
                        SLA
                      </th>
                      <th className='px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider'>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className='divide-y divide-gray-100 dark:divide-gray-800'>
                    {rows.map(lead => (
                      <tr
                        key={lead.id}
                        className='hover:bg-blue-50/40 dark:hover:bg-gray-800/50 transition-colors'
                      >
                        <td className='px-5 py-4'>
                          <p className='font-medium text-gray-900 dark:text-gray-100'>
                            {lead.name}
                          </p>
                        </td>
                        <td className='pl-1 pr-5 py-4 text-xs text-gray-500'>
                          {lead.leadId}
                        </td>
                        <td className='px-5 py-4'>
                          <p className='text-sm text-gray-800 dark:text-gray-200'>
                            {lead.email}
                          </p>
                        </td>
                        <td className='px-5 py-4 text-sm text-gray-800 dark:text-gray-200'>
                          {lead.phone}
                        </td>
                        <td className='px-5 py-4 text-sm text-gray-800 dark:text-gray-200'>
                          {lead.destination}
                        </td>
                        <td className='px-5 py-4 text-sm text-gray-800 dark:text-gray-200'>
                          {getVisaHolidayLabel(lead)}
                        </td>
                        <td className='px-5 py-4'>
                          <StatusBadge status={lead.statusLabel} />
                        </td>
                        <td className='px-5 py-4'>
                          <p
                            className={`text-xs ${
                              lead.slaBreached
                                ? 'text-red-600'
                                : 'text-gray-500'
                            }`}
                          >
                            {lead.slaBreached ? 'Breached' : lead.sla}
                          </p>
                        </td>
                        <td className='px-5 py-4 text-right'>
                          <button
                            className='inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5 text-xs hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800'
                            onClick={() => handleViewLead(lead)}
                          >
                            <FaEye />
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className='block lg:hidden divide-y divide-gray-100 dark:divide-gray-800'>
                {rows.map(lead => (
                  <div key={lead.id} className='p-4 space-y-2'>
                    <div className='flex items-start justify-between'>
                      <div>
                        <p className='font-semibold text-gray-900 dark:text-gray-100'>
                          {lead.name}
                        </p>
                        <p className='text-xs text-gray-500'>
                          Lead ID: {lead.leadId}
                        </p>
                      </div>
                      <StatusBadge status={lead.statusLabel} />
                    </div>
                    <div className='grid grid-cols-1 sm:grid-cols-2 gap-1.5'>
                      <p className='text-xs text-gray-600 dark:text-gray-300'>
                        <span className='text-gray-500'>Email:</span>{' '}
                        {lead.email}
                      </p>
                      <p className='text-xs text-gray-600 dark:text-gray-300'>
                        <span className='text-gray-500'>Phone:</span>{' '}
                        {lead.phone}
                      </p>
                    </div>
                    <p className='text-sm text-gray-700 dark:text-gray-200'>
                      {lead.destination}
                    </p>
                    <p className='text-xs text-gray-600 dark:text-gray-300'>
                      <span className='text-gray-500'>Visa/Holidays:</span>{' '}
                      {getVisaHolidayLabel(lead)}
                    </p>
                    <div className='flex items-center justify-between'>
                      <p
                        className={`text-xs ${
                          lead.slaBreached ? 'text-red-600' : 'text-gray-500'
                        }`}
                      >
                        SLA: {lead.slaBreached ? 'Breached' : lead.sla}
                      </p>
                      <button
                        className='inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5 text-xs hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800'
                        onClick={() => handleViewLead(lead)}
                      >
                        <FaEye />
                        View
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className='flex items-center justify-between px-4 py-4 border-t border-gray-200 dark:border-gray-800'>
                <p className='text-sm text-gray-500 dark:text-gray-400'>
                  Showing {Math.min(filtered.length, (page - 1) * pageSize + 1)}
                  -{Math.min(filtered.length, page * pageSize)} of{' '}
                  {filtered.length}
                </p>
                <div className='flex items-center gap-2'>
                  <button
                    onClick={() => setPage(prev => Math.max(1, prev - 1))}
                    disabled={page === 1}
                    className='p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 disabled:opacity-40'
                  >
                    <FaChevronLeft />
                  </button>
                  <span className='px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-sm font-medium'>
                    {page}
                  </span>
                  <button
                    onClick={() =>
                      setPage(prev => Math.min(totalPages, prev + 1))
                    }
                    disabled={page === totalPages}
                    className='p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 disabled:opacity-40'
                  >
                    <FaChevronRight />
                  </button>
                </div>
              </div>
            </>
          )}
        </SurfaceCard>

        <style>{`
          html,
          body {
            overflow-x: hidden;
          }

          .leads-table-scroll {
            scrollbar-width: thin;
            scrollbar-color: rgba(107, 114, 128, 0.22) transparent;
          }

          .leads-table-scroll::-webkit-scrollbar {
            height: 5px;
          }

          .leads-table-scroll::-webkit-scrollbar-track {
            background: transparent;
          }

          .leads-table-scroll::-webkit-scrollbar-thumb {
            background: rgba(107, 114, 128, 0.22);
            border-radius: 9999px;
          }

          .leads-table-scroll:hover::-webkit-scrollbar-thumb {
            background: rgba(107, 114, 128, 0.35);
          }
        `}</style>
      </div>
    </div>
  )
}

const KpiCard = ({
  title,
  value,
  icon
}: {
  title: string
  value: string
  icon: React.ReactNode
}) => (
  <SurfaceCard hoverable className='p-3 sm:p-5'>
    <div className='flex items-start justify-between'>
      <div className='min-w-0'>
        <p className='text-[10px] sm:text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 truncate'>
          {title}
        </p>
        <p className='text-base sm:text-2xl font-semibold text-gray-900 dark:text-gray-100 mt-0.5 sm:mt-1'>
          {value}
        </p>
      </div>
      <div className='text-2xl'>{icon}</div>
    </div>
  </SurfaceCard>
)

export default Leads
