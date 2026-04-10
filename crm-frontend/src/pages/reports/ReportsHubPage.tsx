import { useEffect, useMemo, useState } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'
import { DateInput } from '../../components/form'
import FilterTabs from '../../components/ui/FilterTabs'
import SurfaceCard from '../../components/ui/SurfaceCard'
import { reportsApi } from '../../api/reports'
import { getApiErrorMessage } from '../../api/apiClient'

type ReportTabId =
  | 'dashboard_executive_kpis'
  | 'funnel_conversion'
  | 'revenue_monthly'
  | 'leads_by_source'
  | 'leads_by_consultant'
  | 'outstanding_payments'
  | 'visa_summary'
  | 'marketing_performance'
  | 'supplier_performance'
  | 'pipeline_forecast'

type PrimitiveValue = string | number | boolean | null
type ReportRecord = Record<string, PrimitiveValue>
type ExecutiveKpis = Record<string, number>
type ChartKind = 'bar' | 'line' | 'area' | 'pie'

type ReportTab = { id: ReportTabId; label: string }

const reportTabs: ReportTab[] = [
  { id: 'dashboard_executive_kpis', label: 'Executive KPIs' },
  { id: 'funnel_conversion', label: 'Funnel Conversion' },
  { id: 'revenue_monthly', label: 'Revenue Monthly' },
  { id: 'leads_by_source', label: 'Leads by Source' },
  { id: 'leads_by_consultant', label: 'Leads by Consultant' },
  { id: 'outstanding_payments', label: 'Outstanding Payments' },
  { id: 'visa_summary', label: 'Visa Summary' },
  { id: 'marketing_performance', label: 'Marketing Performance' },
  { id: 'supplier_performance', label: 'Supplier Performance' },
  { id: 'pipeline_forecast', label: 'Pipeline Forecast' }
]

const reportsFetcher: Record<
  ReportTabId,
  (params?: Record<string, string | number | boolean>) => Promise<unknown>
> = {
  dashboard_executive_kpis: reportsApi.dashboardExecutiveKpis,
  funnel_conversion: reportsApi.funnelConversion,
  revenue_monthly: reportsApi.revenueMonthly,
  leads_by_source: reportsApi.leadsBySource,
  leads_by_consultant: reportsApi.leadsByConsultant,
  outstanding_payments: reportsApi.outstandingPayments,
  visa_summary: reportsApi.visaSummary,
  marketing_performance: reportsApi.marketingPerformance,
  supplier_performance: reportsApi.supplierPerformance,
  pipeline_forecast: reportsApi.pipelineForecast
}

const VALUE_KEY_PREFERENCE: Record<ReportTabId, string[]> = {
  dashboard_executive_kpis: ['value'],
  funnel_conversion: ['count', 'sharePercent'],
  revenue_monthly: ['revenue', 'profit', 'cost'],
  leads_by_source: ['totalLeads', 'convertedLeads', 'conversionRatePercent'],
  leads_by_consultant: ['totalLeads', 'convertedLeads', 'avgResponseMinutes'],
  outstanding_payments: ['outstandingAmount', 'totalAmount', 'advanceReceived'],
  visa_summary: ['value'],
  marketing_performance: [
    'revenue',
    'totalLeads',
    'totalBookings',
    'roiPercent'
  ],
  supplier_performance: ['totalCases', 'successRatePercent', 'averageVisaFee'],
  pipeline_forecast: ['expectedRevenue', 'expectedConversions']
}

const KPI_CARD_ORDER: { key: string; label: string }[] = [
  { key: 'totalLeads', label: 'Total Leads' },
  { key: 'convertedLeads', label: 'Converted Leads' },
  { key: 'conversionRatePercent', label: 'Conversion Rate (%)' },
  { key: 'totalBookings', label: 'Total Bookings' },
  { key: 'revenue', label: 'Revenue' },
  { key: 'profit', label: 'Profit' },
  { key: 'holidayRevenue', label: 'Holiday Revenue' },
  { key: 'visaRevenue', label: 'Visa Revenue' },
  { key: 'pendingFollowups', label: 'Pending Follow-ups' },
  { key: 'overdueFollowups', label: 'Overdue Follow-ups' }
]

const REPORT_META: Record<
  ReportTabId,
  { description: string; chartKind: ChartKind; helper: string }
> = {
  dashboard_executive_kpis: {
    description:
      'Single source of truth for leadership numbers across leads, bookings, revenue, and follow-up workload.',
    chartKind: 'pie',
    helper:
      'Use this tab for the daily pulse. If follow-ups are rising faster than leads are converting, the sales queue is getting heavier.'
  },
  funnel_conversion: {
    description:
      'Shows how the pipeline is moving from new leads to converted or lost outcomes.',
    chartKind: 'bar',
    helper:
      'Watch for sharp drop-offs between Contacted, Quoted, and Converted. That usually points to sales process friction.'
  },
  revenue_monthly: {
    description:
      'Monthly revenue trend with cost and profit lines to show whether growth is healthy.',
    chartKind: 'area',
    helper:
      'A good month is not just higher revenue. Profit should also rise with it, otherwise margin is leaking.'
  },
  leads_by_source: {
    description:
      'Lead volume and conversion quality by source so marketing and sales can see what actually works.',
    chartKind: 'bar',
    helper:
      'Do not judge a source only by volume. Conversion rate matters more than raw lead count.'
  },
  leads_by_consultant: {
    description:
      'Consultant workload, conversion, and response performance in one view.',
    chartKind: 'line',
    helper:
      'If one consultant has high lead count but low conversion, coaching or redistribution may be needed.'
  },
  outstanding_payments: {
    description:
      'Pending payment exposure by booking so accounts can focus on collections.',
    chartKind: 'bar',
    helper:
      'Prioritize high outstanding amounts first, especially if the booking is close to travel date.'
  },
  visa_summary: {
    description:
      'Visa volume snapshot with quick visibility into the current mix of cases.',
    chartKind: 'pie',
    helper:
      'If approvals are flat but submissions keep rising, check documentation quality and supplier turnaround.'
  },
  marketing_performance: {
    description:
      'Performance of campaigns by lead generation, booking output, revenue, and ROI.',
    chartKind: 'bar',
    helper:
      'Campaigns with good lead count but weak ROI usually need better qualification or tighter targeting.'
  },
  supplier_performance: {
    description:
      'Supplier case volume, success rate, and fee quality to support vendor decisions.',
    chartKind: 'bar',
    helper:
      'Use this to compare reliability, not just cost. A slightly expensive supplier can still be better if success rate is stronger.'
  },
  pipeline_forecast: {
    description:
      'Expected future revenue and conversions based on the current pipeline.',
    chartKind: 'line',
    helper:
      'Treat this as a planning signal, not final revenue. Forecasts are strongest when follow-ups stay current.'
  }
}

const CHART_COLORS = [
  '#2563eb',
  '#0f766e',
  '#f59e0b',
  '#7c3aed',
  '#dc2626',
  '#0891b2'
]

const MOBILE_BREAKPOINT = 640

const toDateValue = (date: Date) => {
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

const extractPayload = (response: unknown) => {
  const payload = response as {
    data?: { data?: unknown; items?: unknown } | unknown
  }
  return (
    (payload?.data as { data?: unknown; items?: unknown })?.data ??
    (payload?.data as { data?: unknown; items?: unknown })?.items ??
    payload?.data ??
    response
  )
}

const toReadableLabel = (key: string) =>
  key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase())

const toNumberSafe = (value: unknown): number | null => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const toPrimitiveValue = (value: unknown): PrimitiveValue => {
  if (value === null || value === undefined) return null
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value
  }
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

const toRecord = (value: unknown): ReportRecord | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const entries = Object.entries(value).map(
    ([key, val]) => [key, toPrimitiveValue(val)] as const
  )
  return Object.fromEntries(entries)
}

const mapObjectToMetricRows = (
  payload: Record<string, unknown>
): ReportRecord[] =>
  Object.entries(payload)
    .filter(([, value]) => toNumberSafe(value) !== null)
    .map(([key, value]) => ({
      metric: toReadableLabel(key),
      value: Number(toNumberSafe(value))
    }))

const toRowsForTab = (tab: ReportTabId, payload: unknown): ReportRecord[] => {
  if (tab === 'dashboard_executive_kpis' || tab === 'visa_summary') {
    if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
      return mapObjectToMetricRows(payload as Record<string, unknown>)
    }
    return []
  }

  if (tab === 'funnel_conversion') {
    if (
      payload &&
      typeof payload === 'object' &&
      Array.isArray((payload as { funnel?: unknown[] }).funnel)
    ) {
      return (payload as { funnel: unknown[] }).funnel
        .map(toRecord)
        .filter((row): row is ReportRecord => Boolean(row))
    }
  }

  if (tab === 'pipeline_forecast') {
    if (
      payload &&
      typeof payload === 'object' &&
      Array.isArray(
        (payload as { forecastByMonth?: unknown[] }).forecastByMonth
      )
    ) {
      return (payload as { forecastByMonth: unknown[] }).forecastByMonth
        .map(toRecord)
        .filter((row): row is ReportRecord => Boolean(row))
    }
  }

  if (Array.isArray(payload)) {
    return payload
      .map(toRecord)
      .filter((row): row is ReportRecord => Boolean(row))
  }

  if (payload && typeof payload === 'object') {
    const row = toRecord(payload)
    return row ? [row] : []
  }

  return []
}

const deriveColumns = (rows: ReportRecord[]): string[] => {
  const set = new Set<string>()
  rows.forEach(row => {
    Object.keys(row).forEach(key => set.add(key))
  })
  return Array.from(set)
}

const deriveNumericColumns = (rows: ReportRecord[]): string[] => {
  const columns = deriveColumns(rows)
  return columns.filter(column =>
    rows.some(row => toNumberSafe(row[column]) !== null)
  )
}

const deriveLabelColumn = (rows: ReportRecord[], numericColumns: string[]) => {
  const preferred = [
    'label',
    'metric',
    'stage',
    'month',
    'source',
    'name',
    'consultantName',
    'bookingNumber',
    'bookingId',
    'id'
  ]
  const allColumns = deriveColumns(rows)
  const preferredMatch = preferred.find(column => allColumns.includes(column))
  if (preferredMatch) return preferredMatch
  const textColumn = allColumns.find(column => !numericColumns.includes(column))
  if (textColumn) return textColumn
  return allColumns[0] ?? 'label'
}

const formatValue = (value: PrimitiveValue) => {
  if (value === null) return '--'
  if (typeof value === 'number')
    return value.toLocaleString(undefined, { maximumFractionDigits: 2 })
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  return value
}

const formatMetricValue = (value: number, key: string) => {
  const percentLike =
    key.toLowerCase().includes('percent') || key.toLowerCase().includes('ratio')
  if (percentLike)
    return `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}%`
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 })
}

const toExecutiveKpis = (payload: unknown): ExecutiveKpis | null => {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload))
    return null
  const result: ExecutiveKpis = {}
  Object.entries(payload).forEach(([key, value]) => {
    const numberValue = toNumberSafe(value)
    if (numberValue !== null) {
      result[key] = numberValue
    }
  })
  return Object.keys(result).length ? result : null
}

const ReportsHubPage = () => {
  const now = useMemo(() => new Date(), [])
  const initialFrom = useMemo(() => {
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    return toDateValue(start)
  }, [now])
  const initialTo = useMemo(() => toDateValue(now), [now])

  const [tab, setTab] = useState<ReportTabId>('dashboard_executive_kpis')
  const [from, setFrom] = useState(initialFrom)
  const [to, setTo] = useState(initialTo)
  const [rows, setRows] = useState<ReportRecord[]>([])
  const [columns, setColumns] = useState<string[]>([])
  const [chartValueKey, setChartValueKey] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [executiveKpis, setExecutiveKpis] = useState<ExecutiveKpis | null>(null)
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined'
      ? window.innerWidth < MOBILE_BREAKPOINT
      : false
  )

  const activeTabLabel = useMemo(
    () => reportTabs.find(item => item.id === tab)?.label ?? 'Report',
    [tab]
  )
  const activeMeta = useMemo(() => REPORT_META[tab], [tab])

  const reportTabIds = useMemo(
    () => new Set(reportTabs.map(item => item.id)),
    []
  )

  const handleTabChange = (nextTabId: string) => {
    if (reportTabIds.has(nextTabId as ReportTabId)) {
      setTab(nextTabId as ReportTabId)
    }
  }

  useEffect(() => {
    const syncViewport = () =>
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    syncViewport()
    window.addEventListener('resize', syncViewport)
    return () => window.removeEventListener('resize', syncViewport)
  }, [])

  useEffect(() => {
    let cancelled = false

    const loadExecutiveKpis = async () => {
      try {
        const params: Record<string, string | number | boolean> = {}
        if (from) params.from = from
        if (to) params.to = to
        const response = await reportsApi.dashboardExecutiveKpis(params)
        const payload = extractPayload(response)
        const parsed = toExecutiveKpis(payload)
        if (!cancelled) {
          setExecutiveKpis(parsed)
        }
      } catch {
        if (!cancelled) {
          setExecutiveKpis(null)
        }
      }
    }

    void loadExecutiveKpis()
    return () => {
      cancelled = true
    }
  }, [from, to])

  useEffect(() => {
    let cancelled = false

    const loadRows = async () => {
      setLoading(true)
      setError('')
      try {
        const params: Record<string, string | number | boolean> = {}
        if (from) params.from = from
        if (to) params.to = to
        if (tab === 'pipeline_forecast') {
          params.periodMonths = 3
        }

        const response = await reportsFetcher[tab](params)
        const payload = extractPayload(response)
        const nextRows = toRowsForTab(tab, payload)
        const nextColumns = deriveColumns(nextRows)
        const numericColumns = deriveNumericColumns(nextRows)
        const preferredValues = VALUE_KEY_PREFERENCE[tab]
        const preferredKey =
          preferredValues.find(key => numericColumns.includes(key)) ??
          numericColumns[0] ??
          ''

        if (cancelled) return
        setRows(nextRows)
        setColumns(nextColumns)
        setChartValueKey(preferredKey)
      } catch (err) {
        if (cancelled) return
        setRows([])
        setColumns([])
        setChartValueKey('')
        setError(getApiErrorMessage(err, 'Failed to load report data'))
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadRows()
    return () => {
      cancelled = true
    }
  }, [tab, from, to])

  const numericColumns = useMemo(() => deriveNumericColumns(rows), [rows])
  const labelColumn = useMemo(
    () => deriveLabelColumn(rows, numericColumns),
    [rows, numericColumns]
  )

  const chartRows = useMemo(() => {
    if (!chartValueKey) return []
    return rows
      .map((row, index) => {
        const rawValue = row[chartValueKey]
        const value = toNumberSafe(rawValue)
        if (value === null) return null

        const rawLabel = row[labelColumn]
        const label =
          rawLabel !== null && rawLabel !== undefined
            ? String(rawLabel)
            : `Row ${index + 1}`
        return { label, value }
      })
      .filter((item): item is { label: string; value: number } => Boolean(item))
  }, [chartValueKey, labelColumn, rows])

  const visibleColumns = useMemo(
    () => (isMobile ? columns.slice(0, Math.min(columns.length, 4)) : columns),
    [columns, isMobile]
  )

  const visibleRowLimit = isMobile ? 6 : 12
  const visibleRows = useMemo(() => rows.slice(0, visibleRowLimit), [rows, visibleRowLimit])
  const hasMoreRows = rows.length > visibleRowLimit
  const pieInnerRadius = isMobile ? 44 : 68
  const pieOuterRadius = isMobile ? 72 : 96
  const legendFontSize = isMobile ? 10 : 12
  const chartBarSize = isMobile ? 18 : 28

  const kpiCards = useMemo(() => {
    if (!executiveKpis) return []
    return KPI_CARD_ORDER.filter(item => item.key in executiveKpis).map(
      item => ({
        label: item.label,
        key: item.key,
        value: executiveKpis[item.key]
      })
    )
  }, [executiveKpis])

  const highlightCards = useMemo(() => {
    const values = chartRows.map(item => item.value)
    const totalValue = values.reduce((sum, value) => sum + value, 0)
    const averageValue = values.length ? totalValue / values.length : 0
    const topRow =
      chartRows.length > 0
        ? chartRows.reduce(
            (best, item) => (item.value > best.value ? item : best),
            chartRows[0]
          )
        : null

    return [
      {
        label: 'Rows Loaded',
        value: rows.length.toLocaleString(),
        helper:
          'Records returned by backend for the current tab and date range.',
        tone: 'from-slate-50 to-slate-100 text-slate-900'
      },
      {
        label: chartValueKey
          ? `Total ${toReadableLabel(chartValueKey)}`
          : 'Metric Total',
        value:
          chartValueKey && values.length
            ? formatMetricValue(totalValue, chartValueKey)
            : '--',
        helper: 'Combined value for the selected metric in the chart.',
        tone: 'from-blue-50 to-blue-100 text-blue-900'
      },
      {
        label: chartValueKey
          ? `Average ${toReadableLabel(chartValueKey)}`
          : 'Metric Average',
        value:
          chartValueKey && values.length
            ? formatMetricValue(averageValue, chartValueKey)
            : '--',
        helper: 'Average value per row for the selected metric.',
        tone: 'from-emerald-50 to-emerald-100 text-emerald-900'
      },
      {
        label: 'Top Segment',
        value: topRow ? topRow.label : '--',
        helper:
          topRow && chartValueKey
            ? formatMetricValue(topRow.value, chartValueKey)
            : 'No chart data',
        tone: 'from-amber-50 to-amber-100 text-amber-900'
      }
    ]
  }, [chartRows, chartValueKey, rows.length])

  const exportCsv = () => {
    if (!rows.length || !columns.length) return
    const header = columns.map(column => `"${column}"`).join(',')
    const lines = rows.map(row =>
      columns
        .map(column => {
          const cell = row[column]
          const value = cell === null || cell === undefined ? '' : String(cell)
          return `"${value.replace(/"/g, '""')}"`
        })
        .join(',')
    )
    const csv = [header, ...lines].join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${tab}-${from || 'from'}-${to || 'to'}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className='mx-auto w-full max-w-none min-w-0 space-y-6 overflow-x-hidden pb-8'>
      <SurfaceCard className='overflow-hidden border border-slate-200/80 bg-gradient-to-br from-white via-slate-50 to-blue-50/70 p-4 shadow-[0_24px_50px_-34px_rgba(15,23,42,0.55)] dark:border-slate-800 dark:from-slate-950 dark:via-slate-900 dark:to-blue-950/30 sm:p-5 lg:p-6'>
        <div className='grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end'>
          <div className='space-y-1'>
            <p className='text-[10px] font-semibold uppercase tracking-[0.22em] text-blue-600 dark:text-blue-300'>
              Executive Analytics
            </p>
            <h1 className='text-2xl font-semibold leading-tight text-slate-900 dark:text-slate-100'>
              Reports Hub
            </h1>
            <p className='text-sm text-slate-500 dark:text-slate-400'>
              PRD Module 7 report space. Cards, chart, and table use backend APIs.
            </p>
          </div>
          <div className='grid w-full gap-3 sm:grid-cols-2 lg:grid-cols-3 lg:items-end xl:w-auto xl:grid-cols-[minmax(180px,1fr)_minmax(180px,1fr)_auto]'>
            <DateInput label='From' value={from} onChange={setFrom} className='w-full' />
            <DateInput label='To' value={to} onChange={setTo} className='w-full' />
            <button
              onClick={exportCsv}
              disabled={!rows.length}
              className='inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:border-blue-200 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-55 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-blue-400/40 dark:hover:text-blue-300'
            >
              Export CSV
            </button>
          </div>
        </div>
      </SurfaceCard>

      {error ? (
        <div className='rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300 sm:px-4 sm:py-3 sm:text-sm'>
          {error}
        </div>
      ) : null}

      <SurfaceCard className='w-full overflow-hidden border border-slate-200/80 bg-gradient-to-br from-slate-50 via-white to-blue-50/50 shadow-[0_24px_48px_-34px_rgba(15,23,42,0.65)] dark:border-slate-800 dark:from-slate-950 dark:via-slate-900 dark:to-blue-950/30'>
        <div className='border-b border-slate-200/70 p-4 dark:border-slate-800 sm:p-5'>
          <h2 className='text-lg font-semibold text-slate-900 dark:text-slate-100'>
            Executive KPI Snapshot
          </h2>
          <p className='mt-1 text-sm text-slate-500 dark:text-slate-400'>
            Leadership summary in selected reporting window.
          </p>
        </div>

        {kpiCards.length ? (
          <div className='grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-3 xl:grid-cols-5'>
            {kpiCards.map((item, idx) => (
              <div
                key={item.key}
                className='group relative min-w-0 overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-4 shadow-[0_14px_28px_-24px_rgba(15,23,42,0.75)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_24px_34px_-22px_rgba(15,23,42,0.45)] dark:border-slate-700 dark:bg-slate-900'
              >
                <div
                  className='absolute inset-x-0 top-0 h-1.5'
                  style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}
                />
                <p className='mt-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400'>
                  {item.label}
                </p>
                <p className='mt-3 text-2xl font-semibold leading-none text-slate-900 dark:text-slate-100'>
                  {formatMetricValue(item.value, item.key)}
                </p>
                <div className='mt-4 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800'>
                  <div
                    className='h-full w-2/3 rounded-full'
                    style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className='p-4 text-sm text-slate-500 dark:text-slate-400 sm:p-5'>
            Executive KPI data not available right now.
          </p>
        )}
      </SurfaceCard>

      <SurfaceCard className='w-full space-y-5 overflow-hidden border border-slate-200/70 bg-white shadow-[0_22px_44px_-30px_rgba(15,23,42,0.6)] dark:border-slate-800 dark:bg-slate-900'>
        <div className='rounded-2xl border border-slate-800/70 bg-gradient-to-r from-slate-950 via-slate-900 to-blue-900 p-4 text-white sm:p-5'>
          <div className='flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between'>
            <div className='max-w-3xl'>
              <p className='text-[10px] uppercase tracking-[0.22em] text-blue-200'>
                Active Report
              </p>
              <h2 className='mt-2 text-2xl font-semibold leading-tight'>
                {activeTabLabel}
              </h2>
              <p className='mt-2 text-sm text-slate-200'>
                {activeMeta.description}
              </p>
            </div>
            <div className='flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center'>
              {numericColumns.length > 1 ? (
                <select
                  value={chartValueKey}
                  onChange={event => setChartValueKey(event.target.value)}
                  className='field-input h-11 w-full min-w-0 border-white/20 bg-white/10 text-sm text-white sm:w-auto sm:min-w-[220px]'
                >
                  {numericColumns.map(column => (
                    <option key={column} value={column}>
                      {toReadableLabel(column)}
                    </option>
                  ))}
                </select>
              ) : null}
              <button
                onClick={exportCsv}
                disabled={!rows.length}
                className='hidden h-11 w-full rounded-xl border border-white/20 bg-white/10 px-4 text-sm font-medium text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60 sm:inline-flex sm:w-auto'
              >
                Export CSV
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Tab Selector */}
        <div className='block sm:hidden'>
          <select
            value={tab}
            onChange={e => handleTabChange(e.target.value)}
            className='w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-800 dark:bg-gray-900'
          >
            {reportTabs.map(t => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        {/* Desktop Tab Navigation */}
        <div className='hidden overflow-x-auto pb-1 sm:block'>
          <FilterTabs
            tabs={reportTabs}
            active={tab}
            onChange={handleTabChange}
          />
        </div>

        {/* Highlight Cards - Mobile Optimized Grid */}
        <div className='grid grid-cols-1 gap-3 p-2 sm:grid-cols-2 md:grid-cols-4'>
          {highlightCards.map(item => (
            <div
              key={item.label}
              className={`h-full rounded-2xl border border-gray-200 bg-gradient-to-br p-3 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-gray-800 ${item.tone}`}
            >
              <p className='text-[11px] uppercase tracking-[0.14em] opacity-75'>
                {item.label}
              </p>
              <p className='mt-2 text-2xl font-semibold leading-tight'>
                {item.value}
              </p>
              <p className='mt-2 text-xs opacity-80'>
                {item.helper}
              </p>
            </div>
          ))}
        </div>

        {/* Chart and Guide Section */}
        <div className='grid grid-cols-1 gap-4 p-2 sm:gap-5 sm:p-4 md:gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,0.75fr)]'>
          <div className='rounded-xl border border-gray-200 bg-white p-2 dark:border-gray-800 dark:bg-gray-900 sm:rounded-2xl sm:p-3 md:p-4'>
            <div className='mb-2 flex flex-col gap-1 sm:mb-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3'>
              <div>
                <h3 className='text-xs font-semibold text-gray-900 dark:text-gray-100 sm:text-sm md:text-base'>
                  {activeTabLabel} Chart
                </h3>
                <p className='text-[9px] text-gray-500 dark:text-gray-400 sm:text-[10px] md:text-xs'>
                  {chartValueKey
                    ? `Visualising ${toReadableLabel(chartValueKey)}`
                    : 'No numeric metric selected'}
                </p>
              </div>
              <span className='inline-block w-fit rounded-full bg-gray-100 px-2 py-0.5 text-[8px] font-medium uppercase tracking-[0.16em] text-gray-600 dark:bg-gray-800 dark:text-gray-300 sm:px-3 sm:py-1 sm:text-[10px] md:text-[11px]'>
                {activeMeta.chartKind} view
              </span>
            </div>

            <div className='h-48 sm:h-56 md:h-64 lg:h-72 xl:h-80'>
              {loading ? (
                <div className='flex h-full items-center justify-center text-xs text-gray-500 sm:text-sm'>
                  Loading {activeTabLabel}...
                </div>
              ) : !chartRows.length ? (
                <div className='flex h-full items-center justify-center text-xs text-gray-500 sm:text-sm'>
                  No chart data available for {activeTabLabel} in selected date
                  range.
                </div>
              ) : activeMeta.chartKind === 'area' ? (
                <ResponsiveContainer width='100%' height='100%'>
                  <AreaChart
                    data={chartRows}
                    margin={{ top: 5, right: 5, left: 0, bottom: 5 }}
                  >
                    <defs>
                      <linearGradient
                        id='reportAreaFill'
                        x1='0'
                        y1='0'
                        x2='0'
                        y2='1'
                      >
                        <stop
                          offset='5%'
                          stopColor='#2563eb'
                          stopOpacity={0.35}
                        />
                        <stop
                          offset='95%'
                          stopColor='#2563eb'
                          stopOpacity={0.04}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray='3 3' stroke='#e5e7eb' />
                    <XAxis
                      dataKey='label'
                      stroke='#9ca3af'
                      tick={{ fontSize: 10 }}
                    />
                    <YAxis stroke='#9ca3af' tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Area
                      type='monotone'
                      dataKey='value'
                      stroke='#2563eb'
                      strokeWidth={2}
                      fill='url(#reportAreaFill)'
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : activeMeta.chartKind === 'line' ? (
                <ResponsiveContainer width='100%' height='100%'>
                  <LineChart
                    data={chartRows}
                    margin={{ top: 5, right: 5, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray='3 3' stroke='#e5e7eb' />
                    <XAxis
                      dataKey='label'
                      stroke='#9ca3af'
                      tick={{ fontSize: 10 }}
                    />
                    <YAxis stroke='#9ca3af' tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Line
                      type='monotone'
                      dataKey='value'
                      stroke='#0f766e'
                      strokeWidth={2}
                      dot={{ r: 3, fill: '#0f766e' }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : activeMeta.chartKind === 'pie' ? (
                <ResponsiveContainer width='100%' height='100%'>
                  <PieChart margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                    <Pie
                      data={chartRows.slice(0, 6)}
                      dataKey='value'
                      nameKey='label'
                      innerRadius={pieInnerRadius}
                      outerRadius={pieOuterRadius}
                      paddingAngle={2}
                    >
                      {chartRows.slice(0, 6).map((entry, index) => (
                        <Cell
                          key={entry.label}
                          fill={CHART_COLORS[index % CHART_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: legendFontSize }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <ResponsiveContainer width='100%' height='100%'>
                  <BarChart
                    data={chartRows}
                    margin={{ top: 5, right: 5, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray='3 3' stroke='#e5e7eb' />
                    <XAxis
                      dataKey='label'
                      stroke='#9ca3af'
                      tick={{ fontSize: 10 }}
                    />
                    <YAxis stroke='#9ca3af' tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar
                      dataKey='value'
                      radius={[6, 6, 0, 0]}
                      barSize={chartBarSize}
                    >
                      {chartRows.map((entry, index) => (
                        <Cell
                          key={entry.label}
                          fill={CHART_COLORS[index % CHART_COLORS.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Reading Guide - Mobile Optimized */}
          <div className='rounded-xl border border-gray-200 bg-slate-50 p-3 dark:border-gray-800 dark:bg-gray-900/70 sm:rounded-2xl sm:p-4 md:p-5'>
            <h3 className='text-xs font-semibold text-gray-900 dark:text-gray-100 sm:text-sm'>
              Reading Guide
            </h3>
            <p className='mt-1 text-xs text-gray-600 dark:text-gray-300 sm:mt-2 sm:text-sm'>
              {activeMeta.helper}
            </p>
            <div className='mt-3 space-y-2 sm:mt-4 sm:space-y-3'>
              <div className='rounded-lg border border-gray-200 bg-white px-3 py-2 dark:border-gray-800 dark:bg-gray-900 sm:rounded-xl sm:px-4 sm:py-3'>
                <p className='text-[9px] uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400 sm:text-[10px] md:text-xs'>
                  Selected Metric
                </p>
                <p className='mt-0.5 text-xs font-semibold text-gray-900 dark:text-gray-100 sm:mt-1 sm:text-sm'>
                  {chartValueKey
                    ? toReadableLabel(chartValueKey)
                    : 'No numeric field available'}
                </p>
              </div>
              <div className='rounded-lg border border-gray-200 bg-white px-3 py-2 dark:border-gray-800 dark:bg-gray-900 sm:rounded-xl sm:px-4 sm:py-3'>
                <p className='text-[9px] uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400 sm:text-[10px] md:text-xs'>
                  Date Window
                </p>
                <p className='mt-0.5 text-xs font-semibold text-gray-900 dark:text-gray-100 sm:mt-1 sm:text-sm'>
                  {from || 'Start not set'} to {to || 'Today'}
                </p>
              </div>
              <div className='rounded-lg border border-gray-200 bg-white px-3 py-2 dark:border-gray-800 dark:bg-gray-900 sm:rounded-xl sm:px-4 sm:py-3'>
                <p className='text-[9px] uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400 sm:text-[10px] md:text-xs'>
                  Best Use
                </p>
                <p className='mt-0.5 text-xs text-gray-700 dark:text-gray-300 sm:mt-1 sm:text-sm'>
                  Use the chart for pattern spotting, then confirm exact numbers
                  in the table below before taking action.
                </p>
              </div>
            </div>
          </div>
        </div>
      </SurfaceCard>

      {/* Data Table - Mobile Optimized */}
      <SurfaceCard className='w-full overflow-hidden border border-slate-200/70 bg-white p-0 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.6)] dark:border-slate-800 dark:bg-slate-900'>
        <div className='border-b border-gray-100 bg-white px-3 py-2 dark:border-gray-800 dark:bg-gray-900 sm:px-4 sm:py-3 md:px-5 md:py-4'>
          <h2 className='text-sm font-semibold text-gray-900 dark:text-gray-100 sm:text-base'>
            {activeTabLabel} Table
          </h2>
          <p className='mt-0.5 text-[10px] text-gray-500 dark:text-gray-400 sm:mt-1 sm:text-xs md:text-sm'>
            Exact backend values for operational review and export.
          </p>
        </div>

        {rows.length === 0 || columns.length === 0 ? (
          <div className='p-3 text-xs text-gray-500 sm:p-4 sm:text-sm'>
            No rows available for this report and date range.
          </div>
        ) : isMobile ? (
          <div className='space-y-3 p-3'>
            {visibleRows.map((row, index) => (
              <div
                key={index}
                className='rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900'
              >
                {visibleColumns.map(column => (
                  <div
                    key={`${column}-${index}`}
                    className='grid grid-cols-[110px_1fr] gap-2 border-b border-gray-100 py-1.5 last:border-b-0 dark:border-gray-800'
                  >
                    <span className='text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400'>
                      {toReadableLabel(column)}
                    </span>
                    <span
                      className={`break-words text-xs ${
                        column === labelColumn
                          ? 'font-semibold text-gray-900 dark:text-gray-100'
                          : 'text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {formatValue(row[column] ?? null)}
                    </span>
                  </div>
                ))}
              </div>
            ))}
            {hasMoreRows && (
              <div className='px-1 text-center text-[11px] text-gray-400 dark:text-gray-500'>
                +{rows.length - visibleRowLimit} more rows
              </div>
            )}
          </div>
        ) : (
          <div className='overflow-x-auto'>
            <table className='w-full min-w-[720px] divide-y divide-gray-200 dark:divide-gray-800'>
              <thead className='bg-gray-50 dark:bg-gray-800/95'>
                <tr>
                  {visibleColumns.map(column => (
                    <th
                      key={column}
                      className='sticky top-0 px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-[0.12em] text-gray-500 sm:px-5 sm:py-3'
                    >
                      {toReadableLabel(column)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className='divide-y divide-gray-100 dark:divide-gray-800'>
                {visibleRows.map((row, index) => (
                  <tr
                    key={index}
                    className={
                      index % 2 === 0
                        ? 'bg-white dark:bg-gray-900'
                        : 'bg-slate-50/60 dark:bg-gray-900/60'
                    }
                  >
                    {visibleColumns.map(column => (
                      <td
                        key={`${column}-${index}`}
                        className={`max-w-[260px] break-words px-4 py-3 text-sm ${
                          column === labelColumn
                            ? 'font-semibold text-gray-900 dark:text-gray-100'
                            : 'text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {formatValue(row[column] ?? null)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {hasMoreRows && (
              <div className='border-t border-gray-100 px-3 py-2 text-center text-[11px] text-gray-400 dark:border-gray-800'>
                +{rows.length - visibleRowLimit} more rows
              </div>
            )}
          </div>
        )}
      </SurfaceCard>
    </div>
  )
}

export default ReportsHubPage
