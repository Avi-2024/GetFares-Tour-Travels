import React, { useMemo, useState, useEffect } from 'react'
import {
  Area,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'
import {
  FaArrowTrendDown,
  FaArrowTrendUp,
  FaCalendarDays,
  FaPhone,
  FaPlane,
  FaSackDollar,
  FaUserGroup
} from 'react-icons/fa6'
import SurfaceCard from '../../components/ui/SurfaceCard'
import { dashboardApi } from '../../api/dashboard'
import { reportsApi } from '../../api/reports'
import { useAuth } from '../../context/AuthContext'

// Type definitions
interface DashboardStats {
  totalLeads: number
  totalLeadsChange: number
  revenue: number
  currency?: string
  revenueChange: number
  pendingCalls: number
  pendingCallsChange: number
  bookings: number
  bookingsChange: number
}

interface RevenueData {
  name: string
  revenue: number
  last: number
}

interface LeadSource {
  name: string
  value: number
}

type Range = 'Today' | 'Week' | 'Month' | 'Year'
const EMPTY_REVENUE_DATA: Record<Range, RevenueData[]> = {
  Today: [],
  Week: [],
  Month: [],
  Year: []
}
const REVENUE_RANGE_FALLBACK: Record<Range, Range> = {
  Today: 'Week',
  Week: 'Month',
  Month: 'Year',
  Year: 'Month'
}
const EMPTY_STATS: DashboardStats = {
  totalLeads: 0,
  totalLeadsChange: 0,
  revenue: 0,
  currency: 'AED',
  revenueChange: 0,
  pendingCalls: 0,
  pendingCallsChange: 0,
  bookings: 0,
  bookingsChange: 0
}
const colors = ['#2563eb', '#22c55e', '#a855f7', '#f59e0b']
const DASHBOARD_CURRENCY = 'AED'

const Dashboard: React.FC = () => {
  const { token } = useAuth()
  const [range, setRange] = useState<Range>('Week')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(
    null
  )
  const [statsLoaded, setStatsLoaded] = useState(false)
  const [revenueData, setRevenueData] =
    useState<Record<Range, RevenueData[]>>(EMPTY_REVENUE_DATA)
  const [revenueLoaded, setRevenueLoaded] = useState(false)
  const [leadSources, setLeadSources] = useState<LeadSource[]>([])
  const [leadSourcesLoaded, setLeadSourcesLoaded] = useState(false)

  const rev = useMemo(
    () =>
      revenueData[range].map(point => ({
        name: String(point?.name ?? ''),
        revenue: Number(point?.revenue ?? 0),
        last: Number(point?.last ?? 0)
      })),
    [revenueData, range]
  )
  const hasRevenueChartData = useMemo(
    () => rev.some(point => point.revenue > 0 || point.last > 0),
    [rev]
  )
  const effectiveRevenueRange = useMemo(() => {
    if (hasRevenueChartData) return range
    const fallbackRange = REVENUE_RANGE_FALLBACK[range]
    const fallback = revenueData[fallbackRange] ?? []
    const fallbackHasData = fallback.some(
      point => Number(point?.revenue ?? 0) > 0 || Number(point?.last ?? 0) > 0
    )
    return fallbackHasData ? fallbackRange : range
  }, [hasRevenueChartData, range, revenueData])
  const chartRevenueData = useMemo(() => {
    const selected = revenueData[effectiveRevenueRange] ?? []
    return selected.map(point => ({
      name: String(point?.name ?? ''),
      revenue: Number(point?.revenue ?? 0),
      last: Number(point?.last ?? 0)
    }))
  }, [effectiveRevenueRange, revenueData])
  const hasRenderableRevenueData = useMemo(
    () =>
      chartRevenueData.some(
        point => point.revenue > 0 || point.last > 0
      ),
    [chartRevenueData]
  )
  const leadSourceTotal = useMemo(
    () => leadSources.reduce((sum, source) => sum + Number(source.value || 0), 0),
    [leadSources]
  )
  const hasLeadSourceChartData = useMemo(
    () => leadSources.some(source => Number(source.value || 0) > 0),
    [leadSources]
  )
  const formatStatNumber = (
    value: unknown,
    formatter: (num: number) => string
  ) => {
    const parsed = Number(value)
    if (!Number.isFinite(parsed)) return 'N/A'
    return formatter(parsed)
  }
  const formatCompact = (value: number) => {
    if (value < 1000) return value.toString()
    if (value < 1_000_000) {
      return `${(value / 1000).toFixed(1).replace(/\.0$/, '')}k`
    }
    if (value < 1_000_000_000) {
      return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
    }
    return `${(value / 1_000_000_000).toFixed(1).replace(/\.0$/, '')}B`
  }
  const formatRevenueValue = (value: number) => {
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: DASHBOARD_CURRENCY,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(value)
    } catch (_error) {
      return `${DASHBOARD_CURRENCY} ${Number(value || 0).toLocaleString('en-US')}`
    }
  }

  // Load KPI stats and lead sources (not dependent on range)
  useEffect(() => {
    const loadStaticData = async () => {
      if (!token) {
        setDashboardStats(null)
        setLeadSources([])
        setStatsLoaded(false)
        setLeadSourcesLoaded(false)
        setError('Please login to view dashboard data.')
        return
      }

      setLoading(true)
      try {
        // Load KPI cards from unified executive KPI source.
        const kpiResponse = (await reportsApi.dashboardExecutiveKpis({
          currency: DASHBOARD_CURRENCY
        })) as any
        const executive = kpiResponse?.data || kpiResponse
        if (executive) {
          const pendingCalls =
            Number(executive.pendingFollowups || 0) +
            Number(executive.overdueFollowups || 0)
          let revenueValue = Number(executive.revenue || 0)
          // Fallback: if executive KPI revenue is empty, derive from bookings revenue trend.
          // This keeps dashboard usable even when reporting revenue backend returns 0.
          if (!Number.isFinite(revenueValue) || revenueValue <= 0) {
            try {
              const revenueResponse = (await dashboardApi.getRevenue({
                range: 'week',
                currency: DASHBOARD_CURRENCY
              })) as any
              const points = revenueResponse?.data || revenueResponse
              if (Array.isArray(points)) {
                const sum = points.reduce(
                  (total, point) => total + Number(point?.revenue || 0),
                  0
                )
                if (Number.isFinite(sum) && sum > 0) {
                  revenueValue = sum
                }
              }
            } catch (_error) {
              // ignore fallback errors; keep executive KPI revenue
            }
          }
          setDashboardStats({
            totalLeads: Number(executive.totalLeads || 0),
            totalLeadsChange: 0,
            revenue: revenueValue,
            currency: executive.currency || DASHBOARD_CURRENCY,
            revenueChange: 0,
            pendingCalls,
            pendingCallsChange: 0,
            bookings: Number(executive.totalBookings || 0),
            bookingsChange: 0
          })
          setStatsLoaded(true)
        } else {
          setStatsLoaded(false)
        }

        // Load lead sources
        const sourcesResponse = (await dashboardApi.getLeadSources()) as any
        const sources = sourcesResponse?.data || sourcesResponse
        if (Array.isArray(sources)) {
          setLeadSources(sources)
          setLeadSourcesLoaded(true)
        } else {
          setLeadSources([])
          setLeadSourcesLoaded(false)
        }

        setError('')
      } catch (error: any) {
        console.error('Failed to load dashboard static data:', error)

        if (error.status === 401 || error.message?.includes('token')) {
          setError('Authentication failed. Please login again.')
        } else if (error.status === 404) {
          setError(
            'Dashboard API endpoints not found. Please check backend server.'
          )
        } else {
          setError('Failed to load dashboard data.')
        }
        setDashboardStats(current => current ?? EMPTY_STATS)
        setLeadSources([])
        setStatsLoaded(false)
        setLeadSourcesLoaded(false)
      } finally {
        setLoading(false)
      }
    }

    loadStaticData()
  }, [token])

  // Load revenue data (dependent on range)
  useEffect(() => {
    const loadRevenueData = async () => {
      if (!token) {
        setRevenueData(EMPTY_REVENUE_DATA)
        setRevenueLoaded(false)
        return
      }

      try {
        setRevenueLoaded(false)
        // Load revenue data
        const revenueResponse = (await dashboardApi.getRevenue({
          range: range.toLowerCase(),
          currency: DASHBOARD_CURRENCY
        })) as any
        const revenue = revenueResponse?.data || revenueResponse
        if (Array.isArray(revenue)) {
          setRevenueData(prev => ({ ...prev, [range]: revenue }))
          setRevenueLoaded(true)
        } else {
          setRevenueData(prev => ({ ...prev, [range]: [] }))
          setRevenueLoaded(false)
        }
      } catch (error: any) {
        console.error('Failed to load revenue data:', error)
        setRevenueData(current => ({ ...current, [range]: [] }))
        setRevenueLoaded(false)
      }
    }

    loadRevenueData()
  }, [token, range])

  const kpis = useMemo(() => {
    if (!dashboardStats || !statsLoaded) {
      return [
        {
          title: 'Total Leads',
          value: 'N/A',
          trend: null,
          up: true,
          icon: FaUserGroup,
          bg: 'bg-blue-100 text-blue-600'
        },
        {
          title: 'Revenue',
          value: 'N/A',
          trend: null,
          up: true,
          icon: FaSackDollar,
          bg: 'bg-green-100 text-green-600'
        },
        {
          title: 'Open Follow-ups',
          value: 'N/A',
          trend: null,
          up: true,
          icon: FaPhone,
          bg: 'bg-amber-100 text-amber-500'
        },
        {
          title: 'Bookings',
          value: 'N/A',
          trend: null,
          up: true,
          icon: FaPlane,
          bg: 'bg-gray-100 text-gray-700'
        }
      ]
    }

    return [
      {
        title: 'Total Leads',
        value: formatStatNumber(dashboardStats.totalLeads, formatCompact),
        trend: `${dashboardStats.totalLeadsChange >= 0 ? '+' : ''}${
          dashboardStats.totalLeadsChange
        }%`,
        up: dashboardStats.totalLeadsChange >= 0,
        icon: FaUserGroup,
        bg: 'bg-blue-100 text-blue-600'
      },
      {
        title: 'Revenue',
        value: formatStatNumber(
          dashboardStats.revenue,
          num => `${DASHBOARD_CURRENCY} ${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        ),
        trend: `${dashboardStats.revenueChange >= 0 ? '+' : ''}${
          dashboardStats.revenueChange
        }%`,
        up: dashboardStats.revenueChange >= 0,
        icon: FaSackDollar,
        bg: 'bg-green-100 text-green-600'
      },
      {
        title: 'Open Follow-ups',
        value: formatStatNumber(dashboardStats.pendingCalls, formatCompact),
        trend: `${dashboardStats.pendingCallsChange >= 0 ? '+' : ''}${
          dashboardStats.pendingCallsChange
        }%`,
        up: dashboardStats.pendingCallsChange >= 0,
        icon: FaPhone,
        bg: 'bg-amber-100 text-amber-500'
      },
      {
        title: 'Bookings',
        value: formatStatNumber(dashboardStats.bookings, formatCompact),
        trend: `${dashboardStats.bookingsChange >= 0 ? '+' : ''}${
          dashboardStats.bookingsChange
        }%`,
        up: dashboardStats.bookingsChange >= 0,
        icon: FaPlane,
        bg: 'bg-gray-100 text-gray-700'
      }
    ]
  }, [dashboardStats, statsLoaded])

  return (
    <div className='space-y-6'>
      <div className='flex flex-col justify-between gap-3 sm:flex-row sm:items-center'>
        <div>
          <h1 className='text-2xl font-bold text-gray-900 dark:text-gray-100'>
            Dashboard Overview
          </h1>
          <p className='mt-1 text-sm text-gray-500 dark:text-gray-400'>
            Performance, pipeline health, and recent operations at a glance.
          </p>
          {error && <p className='mt-1 text-sm text-red-500'>{error}</p>}
        </div>
        <div className='flex items-center gap-2'>
          <div className='rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200'>
            AED Dashboard
          </div>
          <div className='flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300'>
            <FaCalendarDays className='text-blue-600' />{' '}
            {new Date().toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </div>
        </div>
      </div>

      <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4'>
        {loading
          ? // Loading skeleton for KPI cards
            Array.from({ length: 4 }).map((_, index) => (
              <SurfaceCard key={index} className='p-5'>
                <div className='animate-pulse'>
                  <div className='flex items-start justify-between'>
                    <div className='h-10 w-10 rounded-xl bg-gray-200 dark:bg-gray-700'></div>
                    <div className='h-6 w-12 rounded-full bg-gray-200 dark:bg-gray-700'></div>
                  </div>
                  <div className='mt-4 h-4 w-20 rounded bg-gray-200 dark:bg-gray-700'></div>
                  <div className='mt-2 h-8 w-16 rounded bg-gray-200 dark:bg-gray-700'></div>
                </div>
              </SurfaceCard>
            ))
          : kpis.map(k => (
              <SurfaceCard key={k.title} hoverable className='p-5'>
                <div className='flex items-start justify-between'>
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl ${k.bg}`}
                  >
                    <k.icon />
                  </div>
                  {k.trend ? (
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${
                        k.up
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {k.up ? (
                        <FaArrowTrendUp className='mr-1' />
                      ) : (
                        <FaArrowTrendDown className='mr-1' />
                      )}
                      {k.trend}
                    </span>
                  ) : null}
                </div>
                <p className='mt-4 text-sm text-gray-500'>{k.title}</p>
                <p className='mt-1 break-all text-xl font-semibold leading-tight text-gray-900 dark:text-gray-100'>
                  {k.value}
                </p>
              </SurfaceCard>
            ))}
      </div>

      <p className='text-xs text-gray-500 dark:text-gray-400'>
        Open Follow-ups = pending follow-ups scheduled for today or future +
        overdue follow-ups not marked complete yet.
      </p>

      <div className='grid grid-cols-1 gap-6 xl:grid-cols-3'>
        <SurfaceCard className='xl:col-span-2'>
          <div className='mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
            <div>
              <h2 className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
                Revenue Performance
              </h2>
              <p className='text-sm text-gray-500'>
                {effectiveRevenueRange === range
                  ? 'Current period vs previous period.'
                  : `Showing ${effectiveRevenueRange} data (fallback for ${range}).`}
              </p>
            </div>
            <div className='inline-flex rounded-xl border border-gray-200 bg-gray-50 p-1 dark:border-gray-700 dark:bg-gray-800'>
              {(['Today', 'Week', 'Month', 'Year'] as Range[]).map(r => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                    range === r ? 'bg-blue-600 text-white' : 'text-gray-600'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          {!revenueLoaded ? (
            <div className='flex h-[320px] items-center justify-center text-sm text-gray-500'>
              Loading revenue trend...
            </div>
          ) : !hasRenderableRevenueData ? (
            <div className='flex h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50/70 px-6 text-center dark:border-gray-700 dark:bg-gray-800/40'>
              <p className='text-sm font-semibold text-gray-900 dark:text-gray-100'>
                No booked revenue found for this range
              </p>
              <p className='mt-2 max-w-md text-xs text-gray-500 dark:text-gray-400'>
                This chart updates from non-cancelled bookings. Once bookings
                are created in the selected period, the revenue trend will
                appear here.
              </p>
            </div>
          ) : (
            <ResponsiveContainer width='100%' height={320}>
              <ComposedChart data={chartRevenueData}>
                <defs>
                  <linearGradient id='g' x1='0' y1='0' x2='0' y2='1'>
                    <stop offset='5%' stopColor='#2563eb' stopOpacity={0.25} />
                    <stop offset='95%' stopColor='#2563eb' stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray='3 3' stroke='#e5e7eb' />
                <XAxis dataKey='name' stroke='#9ca3af' fontSize={12} />
                <YAxis stroke='#9ca3af' fontSize={12} />
                <Tooltip
                  formatter={(
                    v: number | string | undefined,
                    _name,
                    item: any
                  ) => [
                    formatRevenueValue(Number(v ?? 0)),
                    item?.dataKey === 'last' ? 'Previous' : 'Current'
                  ]}
                />
                <Legend />
                <Area
                  type='linear'
                  dataKey='revenue'
                  fill='url(#g)'
                  stroke='#2563eb'
                  strokeWidth={2}
                  name='Current'
                />
                <Line
                  type='linear'
                  dataKey='last'
                  stroke='#94a3b8'
                  strokeWidth={2}
                  dot={false}
                  name='Previous'
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </SurfaceCard>

        <SurfaceCard>
          <h2 className='mb-1 text-lg font-semibold text-gray-900 dark:text-gray-100'>
            Lead Sources
          </h2>
          <p className='mb-4 text-sm text-gray-500'>
            Channel split for new leads.
          </p>
          {leadSourcesLoaded ? (
            hasLeadSourceChartData ? (
              <div>
                <div className='h-[220px] sm:h-[260px]'>
                  <ResponsiveContainer width='100%' height='100%'>
                    <PieChart>
                      <Pie
                        data={leadSources}
                        cx='50%'
                        cy='50%'
                        innerRadius='55%'
                        outerRadius='82%'
                        paddingAngle={2}
                        dataKey='value'
                        nameKey='name'
                      >
                        {leadSources.map((_, i) => (
                          <Cell key={i} fill={colors[i % colors.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(v: number | string | undefined, _name, item) => {
                          const percentage = Number(v ?? 0)
                          const actualCount =
                            leadSourceTotal > 0
                              ? Math.round((percentage / 100) * leadSourceTotal)
                              : 0
                          const percentLabel = `${percentage
                            .toFixed(1)
                            .replace(/\.0$/, '')}%`
                          return [`${actualCount} (${percentLabel})`, item?.name || 'Leads']
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className='mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2'>
                  {leadSources.map((source, i) => (
                    <div
                      key={`${source.name}-${i}`}
                      className='flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300'
                    >
                      <span
                        className='mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full'
                        style={{ backgroundColor: colors[i % colors.length] }}
                      />
                      <span className='break-words leading-5'>{source.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className='flex h-[220px] items-center justify-center text-sm text-gray-400'>
                No lead source data yet.
              </div>
            )
          ) : (
            <div className='flex h-[280px] items-center justify-center text-sm text-gray-400'>
              N/A
            </div>
          )}
        </SurfaceCard>
      </div>
    </div>
  )
}

export default Dashboard
