import { useCallback, useEffect, useMemo, useState } from 'react'
import {
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
import { FaDownload, FaPrint, FaTimes } from 'react-icons/fa'
import { DateInput } from '../../components/form'
import FilterTabs from '../../components/ui/FilterTabs'
import SearchableDropdown from '../../components/ui/SearchableDropdown'
import SurfaceCard from '../../components/ui/SurfaceCard'
import { reportsApi } from '../../api/reports'
import { suppliersApi } from '../../api/suppliers'
import { reportApiError } from '../../lib/notify'
import { useLeadsService } from '../../hooks/useLeadsService'
import { useUsersService } from '../../hooks/useUsersService'
import {
  type SopStatusLabel,
  sopLabelToCanonical
} from '../../utils/leadStatus'

type TabId = 'sales' | 'leads' | 'users' | 'activity'

type AppliedFilters = {
  from: string
  to: string
  country: string
  destination: string
  consultantId: string
  status: SopStatusLabel | 'ALL'
  leadSource: string
  supplierId: string
}

const CHART_COLORS = ['#2563eb', '#0f766e', '#f59e0b', '#7c3aed', '#dc2626', '#0891b2']

const KPI_CARD_ORDER: { key: string; label: string }[] = [
  { key: 'totalLeads', label: 'Total Leads' },
  { key: 'holidayLeads', label: 'Holiday Leads' },
  { key: 'visaLeads', label: 'Visa Leads' },
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

function unwrapApiData(res: unknown): unknown {
  if (!res || typeof res !== 'object') return null
  let cur: unknown = (res as { data?: unknown }).data
  if (
    cur &&
    typeof cur === 'object' &&
    !Array.isArray(cur) &&
    'data' in cur &&
    (cur as { data?: unknown }).data !== undefined &&
    typeof (cur as { data: unknown }).data === 'object'
  ) {
    cur = (cur as { data: unknown }).data
  }
  return cur ?? null
}

function extractExecutivePayload(res: unknown): Record<string, unknown> | null {
  const d = unwrapApiData(res)
  if (d && typeof d === 'object' && !Array.isArray(d)) return d as Record<string, unknown>
  return null
}

function formatMoneyIntl(amount: number, currency: string) {
  const c = String(currency || 'AED').toUpperCase()
  if (!Number.isFinite(amount)) return '—'
  try {
    return new Intl.NumberFormat(c === 'INR' ? 'en-IN' : 'en-US', {
      style: 'currency',
      currency: c,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  } catch {
    return `${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })} ${c}`
  }
}

function compactAxisNumber(n: number) {
  if (!Number.isFinite(n)) return ''
  const a = Math.abs(n)
  if (a >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (a >= 1_000) return `${(n / 1_000).toFixed(0)}k`
  return String(Math.round(n))
}

function aggregateSourcePie(
  rows: { source?: string; totalLeads?: number }[],
  topN = 8
) {
  const sorted = [...rows]
    .map(r => ({
      name: String(r.source ?? 'UNKNOWN').trim() || 'UNKNOWN',
      value: Number(r.totalLeads ?? 0)
    }))
    .filter(r => r.value > 0)
    .sort((a, b) => b.value - a.value)
  const head = sorted.slice(0, topN)
  const tail = sorted.slice(topN)
  const otherVal = tail.reduce((s, r) => s + r.value, 0)
  if (otherVal > 0) {
    head.push({ name: `Other (${tail.length})`, value: otherVal })
  }
  return head.map((r, i) => ({
    ...r,
    fill: CHART_COLORS[i % CHART_COLORS.length]
  }))
}

function extractFinanceSupplierRows(res: unknown): Record<string, unknown>[] {
  const payload = res as { data?: { rows?: unknown[] } }
  const nested = payload?.data?.rows
  if (Array.isArray(nested)) return nested as Record<string, unknown>[]
  return extractListRows(res) as Record<string, unknown>[]
}

function prettyFieldLabel(key: string) {
  if (!key) return ''
  const spaced = key.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2')
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

function formatFinanceDetailValue(
  key: string,
  raw: unknown,
  row: Record<string, unknown>,
  defaultCurrency: string
) {
  const n = Number(raw)
  if (key === 'basePrice' && Number.isFinite(n)) {
    return formatMoneyIntl(n, String(row.currency || defaultCurrency))
  }
  if (
    (key === 'bookingTotalAmount' ||
      key === 'advanceReceived' ||
      key === 'bookingCostAmount') &&
    Number.isFinite(n)
  ) {
    return formatMoneyIntl(
      n,
      String(row.bookingCurrency || row.currency || defaultCurrency)
    )
  }
  if (raw === null || raw === undefined || raw === '') return '—'
  if (typeof raw === 'object') return JSON.stringify(raw)
  return String(raw)
}

function formatKpiCell(key: string, value: unknown, currency?: string) {
  const n = Number(value ?? 0)
  if (!Number.isFinite(n)) return '—'
  const curr = String(currency || 'AED').toUpperCase()
  if (
    key === 'revenue' ||
    key.endsWith('Revenue') ||
    key === 'profit' ||
    key === 'cost'
  ) {
    return formatMoneyIntl(n, curr)
  }
  if (
    key.endsWith('Percent') ||
    key === 'conversionRatePercent' ||
    key === 'cancellationRatioPercent'
  ) {
    return `${n.toFixed(1)}%`
  }
  return n.toLocaleString('en-IN', { maximumFractionDigits: 0 })
}

function defaultRange() {
  const to = new Date()
  const from = new Date(to)
  from.setDate(from.getDate() - 30)
  const slice = (d: Date) => d.toISOString().slice(0, 10)
  return { from: slice(from), to: slice(to) }
}

const extractListRows = <T,>(response: unknown): T[] => {
  const payload = response as { data?: T[] | { data?: T[] } }
  if (Array.isArray(payload?.data)) return payload.data as T[]
  const inner = payload?.data as { data?: T[] } | undefined
  if (Array.isArray(inner?.data)) return inner.data as T[]
  return []
}

function normalizeFromDateParam(value: string) {
  const t = value.trim()
  if (!t) return t
  return /^\d{4}-\d{2}-\d{2}$/.test(t) ? `${t} 00:00:00` : t
}

function normalizeToDateParam(value: string) {
  const t = value.trim()
  if (!t) return t
  return /^\d{4}-\d{2}-\d{2}$/.test(t) ? `${t} 23:59:59` : t
}

function priorRange(fromIso: string, toIso: string) {
  const a = new Date(normalizeFromDateParam(fromIso) || fromIso)
  const b = new Date(normalizeToDateParam(toIso) || toIso)
  const ms = Math.max(b.getTime() - a.getTime(), 86400000)
  const prevEnd = new Date(a.getTime() - 86400000)
  const prevStart = new Date(prevEnd.getTime() - ms)
  const slice = (d: Date) => d.toISOString().slice(0, 10)
  return {
    from: normalizeFromDateParam(slice(prevStart)),
    to: normalizeToDateParam(slice(prevEnd))
  }
}

function statusForReports(status: SopStatusLabel | 'ALL') {
  if (status === 'ALL') return undefined
  return sopLabelToCanonical(status).canonical
}

function csvEscape(value: unknown) {
  const s = value == null ? '' : String(value)
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

function rowsToCsv(rows: Record<string, unknown>[]) {
  if (!rows.length) return ''
  const keys = Object.keys(rows[0])
  const header = keys.map(csvEscape).join(',')
  const lines = rows.map(row => keys.map(k => csvEscape(row[k])).join(','))
  return [header, ...lines].join('\r\n')
}

function downloadText(filename: string, text: string, mime: string) {
  const blob = new Blob([text], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function exportSectionsCsv(
  filename: string,
  sections: { title: string; rows: Record<string, unknown>[] }[]
) {
  const parts: string[] = []
  sections.forEach(s => {
    parts.push(csvEscape(s.title))
    if (s.rows.length) parts.push(rowsToCsv(s.rows))
    parts.push('')
  })
  downloadText(filename, `\uFEFF${parts.join('\r\n')}`, 'text/csv;charset=utf-8')
}

function exportSectionsExcelTab(
  filename: string,
  sections: { title: string; rows: Record<string, unknown>[] }[]
) {
  const parts: string[] = []
  sections.forEach(s => {
    parts.push(s.title)
    if (s.rows.length) {
      const keys = Object.keys(s.rows[0])
      parts.push(keys.join('\t'))
      s.rows.forEach(row => parts.push(keys.map(k => String(row[k] ?? '')).join('\t')))
    }
    parts.push('')
  })
  downloadText(
    filename,
    `\uFEFF${parts.join('\r\n')}`,
    'application/vnd.ms-excel;charset=utf-8'
  )
}

function toRecordRows<T extends Record<string, unknown>>(items: T[]) {
  return items.map(row => ({ ...row } as Record<string, unknown>))
}

type ConsultantOpt = { id: string; name: string }

const TestReportPage = () => {
  const rng = defaultRange()
  const [applied, setApplied] = useState<AppliedFilters>({
    from: rng.from,
    to: rng.to,
    country: '',
    destination: '',
    consultantId: '',
    status: 'ALL',
    leadSource: '',
    supplierId: ''
  })
  const [draft, setDraft] = useState<AppliedFilters>(applied)
  const [tab, setTab] = useState<TabId>('sales')

  const [destinationNames, setDestinationNames] = useState<string[]>([])
  const [consultants, setConsultants] = useState<ConsultantOpt[]>([])
  const [supplierChoices, setSupplierChoices] = useState<
    { id: string; label: string }[]
  >([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [revenueMonthly, setRevenueMonthly] = useState<
    Record<string, string | number>[]
  >([])
  const [revenueDest, setRevenueDest] = useState<Record<string, string | number>[]>(
    []
  )
  const [revenueSvc, setRevenueSvc] = useState<Record<string, string | number>[]>(
    []
  )
  const [leadsSource, setLeadsSource] = useState<Record<string, string | number>[]>(
    []
  )
  const [leadsConsultant, setLeadsConsultant] = useState<
    Record<string, string | number>[]
  >([])
  const [targetRows, setTargetRows] = useState<Record<string, string | number>[]>([])
  const [activityBundle, setActivityBundle] = useState<{
    items: Record<string, unknown>[]
    byType: { activityType: string; total: number }[]
  }>({ items: [], byType: [] })
  const [fuToday, setFuToday] = useState<Record<string, unknown>[]>([])
  const [fuMissed, setFuMissed] = useState<Record<string, unknown>[]>([])

  const [executiveKpis, setExecutiveKpis] = useState<Record<
    string,
    unknown
  > | null>(null)
  const [financeSvcRows, setFinanceSvcRows] = useState<
    Record<string, unknown>[]
  >([])
  const [dealLines, setDealLines] = useState<Record<string, unknown>[]>([])
  const [funnelSnapshot, setFunnelSnapshot] = useState<{
    funnel?: { stage: string; count: number; sharePercent: number }[]
  } | null>(null)

  const [supplierAll, setSupplierAll] = useState<Record<string, string | number>[]>([])
  const [supplierCurrent, setSupplierCurrent] = useState<
    Record<string, string | number> | null
  >(null)
  const [supplierPrev, setSupplierPrev] = useState<Record<
    string,
    string | number
  > | null>(null)

  const [financeDetailRow, setFinanceDetailRow] = useState<Record<
    string,
    unknown
  > | null>(null)

  const leadsService = useLeadsService()
  const usersService = useUsersService()

  const buildQuery = useCallback(
    (f: AppliedFilters, omitSource = false) => {
      const q: Record<string, string> = {}
      if (f.from) q.from = normalizeFromDateParam(f.from)
      if (f.to) q.to = normalizeToDateParam(f.to)
      if (f.consultantId) q.userId = f.consultantId
      if (f.destination.trim()) q.destination = f.destination.trim()
      if (f.country.trim()) q.country = f.country.trim()
      const st = statusForReports(f.status)
      if (st) q.status = st
      if (!omitSource && f.leadSource.trim()) q.source = f.leadSource.trim()
      if (f.supplierId.trim()) q.supplierId = f.supplierId.trim()
      return q
    },
    []
  )

  const destinationOptions = useMemo(
    () => [
      { value: '', label: 'All destinations' },
      ...destinationNames.map(n => ({ value: n, label: n }))
    ],
    [destinationNames]
  )

  const consultantOptions = useMemo(
    () => [
      { value: '', label: 'All consultants' },
      ...consultants.map(c => ({ value: c.id, label: c.name }))
    ],
    [consultants]
  )

  const supplierOptsDropdown = useMemo(
    () => [{ value: '', label: 'All suppliers' }, ...supplierChoices.map(s => ({ value: s.id, label: s.label }))],
    [supplierChoices]
  )

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      try {
        const names = await leadsService.getLeadDestinations({ limit: 500 })
        if (!cancelled) setDestinationNames(names)
      } catch {
        if (!cancelled) setDestinationNames([])
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [leadsService])

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      try {
        const res = await usersService.list()
        const rows = extractListRows<{
          id?: string
          role?: string
          fullName?: string
          full_name?: string
          name?: string
          email?: string
          isActive?: boolean
          is_active?: boolean
          active?: boolean | null
        }>(res)
          .filter(
            u =>
              String(u.role || '')
                .trim()
                .toLowerCase() === 'sales_consultant'
          )
          .filter(
            u =>
              u.isActive !== false &&
              u.is_active !== false &&
              u.active !== false
          )
          .map(u => ({
            id: String(u.id || ''),
            name: String(
              u.fullName ||
                u.full_name ||
                u.name ||
                u.email ||
                ''
            ).trim()
          }))
          .filter(u => u.id && u.name)
          .sort((a, b) => a.name.localeCompare(b.name))
        if (!cancelled) setConsultants(rows)
      } catch {
        if (!cancelled) setConsultants([])
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [usersService])

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      try {
        const supRes = await suppliersApi.list({ page: 1, limit: 1200 })
        const list = extractListRows<{
          id?: string
          name?: string
          isActive?: boolean
        }>(supRes)
          .filter(r => r.id && r.isActive !== false)
          .map(r => ({
            id: String(r.id),
            label: String(r.name || r.id || '').trim() || String(r.id)
          }))
          .sort((a, b) => a.label.localeCompare(b.label))
        if (!cancelled) setSupplierChoices(list)
      } catch {
        if (!cancelled) setSupplierChoices([])
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [])

  const loadReports = useCallback(async () => {
    setLoading(true)
    setExecutiveKpis(null)
    setError('')
    try {
      const q = buildQuery(applied)
      const qSources = buildQuery(applied, true)

      const prev = priorRange(applied.from, applied.to)
      const supBase: Record<string, string> = {}
      if (applied.from)
        supBase.from = normalizeFromDateParam(applied.from)
      if (applied.to) supBase.to = normalizeToDateParam(applied.to)
      if (applied.supplierId) supBase.supplierId = applied.supplierId

      const supPrevQuery = applied.supplierId ?
        {
          ...prev,
          supplierId: applied.supplierId
        }
      : {}

      const financeQ: Record<string, string | number> = {
        ...q,
        page: 1,
        limit: 1000,
        ...(applied.supplierId ? { supplierId: applied.supplierId } : {})
      }

      const [
        kpiRes,
        financeRes,
        dealRes,
        funnelRes,
        mRes,
        dRes,
        sRes,
        srcRes,
        srcOptRes,
        cRes,
        tRes,
        actRes,
        fuT,
        fuM,
        supAll
      ] = await Promise.all([
        reportsApi.dashboardExecutiveKpis(q),
        reportsApi.financeSupplierServices(financeQ),
        reportsApi.leadsDealLines({ ...q, limit: 1500 }),
        reportsApi.funnelConversion(q),
        reportsApi.revenueMonthly(q),
        reportsApi.revenueByDestination(q),
        reportsApi.revenueByServiceType(q),
        reportsApi.leadsBySource(q),
        reportsApi.leadsBySource(qSources),
        reportsApi.leadsByConsultant(q),
        reportsApi.targetVsAchievement(q),
        reportsApi.activityFeed({ ...q, limit: 300 }),
        reportsApi.followupsToday({
          date: applied.to.trim() || new Date().toISOString().slice(0, 10),
          ...(applied.consultantId ? { userId: applied.consultantId } : {})
        }),
        reportsApi.followupsMissed({
          date: applied.to.trim() || new Date().toISOString().slice(0, 10),
          ...(applied.consultantId ? { userId: applied.consultantId } : {})
        }),
        reportsApi.supplierPerformance(supBase)
      ])

      setExecutiveKpis(extractExecutivePayload(kpiRes))
      setFinanceSvcRows(extractFinanceSupplierRows(financeRes))
      const dealRaw = unwrapApiData(dealRes)
      setDealLines(
        (Array.isArray(dealRaw)
          ? dealRaw
          : extractListRows(dealRes)) as Record<string, unknown>[]
      )
      const funnelUnwrap = unwrapApiData(funnelRes) as {
        funnel?: { stage: string; count: number; sharePercent: number }[]
      } | null
      setFunnelSnapshot(
        funnelUnwrap && typeof funnelUnwrap === 'object' ? funnelUnwrap : null
      )

      setRevenueMonthly(extractListRows(mRes))
      setRevenueDest(extractListRows(dRes))
      setRevenueSvc(extractListRows(sRes))

      const leadSrcRows = extractListRows<any>(srcRes)
      const leadConsultRows = extractListRows<any>(cRes)
      setLeadsSource(leadSrcRows)
      setLeadsConsultant(leadConsultRows)
      setTargetRows(extractListRows(tRes))

      const actPayload = unwrapApiData(actRes) as {
        items?: Record<string, unknown>[]
        byType?: { activityType: string; total: number }[]
      } | null
      setActivityBundle({
        items: Array.isArray(actPayload?.items) ? actPayload.items : [],
        byType: Array.isArray(actPayload?.byType) ? actPayload.byType : []
      })

      extractListRows<{ source?: string }>(srcOptRes)

      setFuToday(extractListRows(fuT))
      setFuMissed(extractListRows(fuM))

      const perfRows = extractListRows<any>(supAll).map(r =>
        Object.fromEntries(
          Object.entries(r).map(([k, v]) => [k, v as string | number])
        )
      ) as Record<string, string | number>[]
      setSupplierAll(perfRows)

      let curRow: Record<string, string | number> | null = null
      let prvRow: Record<string, string | number> | null = null

      if (applied.supplierId) {
        const match = perfRows.filter(
          r => String(r.id) === applied.supplierId
        )
        curRow = match[0] || null
        const prevPerf = await reportsApi.supplierPerformance(supPrevQuery)
        const prevRows = extractListRows<any>(prevPerf).map(r =>
          Object.fromEntries(Object.entries(r)) as Record<string, string | number>
        )
        prvRow =
          prevRows.filter(r => String(r.id) === applied.supplierId)[0] || null
      }

      setSupplierCurrent(curRow)
      setSupplierPrev(prvRow)
    } catch (err) {
      reportApiError(err, 'Reports failed', setError)
    } finally {
      setLoading(false)
    }
  }, [applied, buildQuery])

  useEffect(() => {
    void loadReports()
  }, [loadReports])

  const chartMonthly = useMemo(
    () =>
      revenueMonthly.map(r => ({
        month: String(r.month ?? ''),
        revenue: Number(r.revenue ?? 0),
        profit: Number(r.profit ?? 0)
      })),
    [revenueMonthly]
  )

  const chartDest = useMemo(
    () =>
      revenueDest.map(r => ({
        destination: String(r.destination ?? ''),
        revenue: Number(r.revenue ?? 0),
        bookings: Number(r.totalBookings ?? 0)
      })),
    [revenueDest]
  )

  const chartSvcPie = useMemo(
    () =>
      revenueSvc.map(r => ({
        name: String(r.serviceType ?? '—'),
        value: Number(r.revenue ?? 0)
      })),
    [revenueSvc]
  )

  const chartSvcPieActive = useMemo(
    () => chartSvcPie.filter(d => d.value > 0),
    [chartSvcPie]
  )

  const chartLeadsSrc = useMemo(
    () =>
      leadsSource.map(r => ({
        source: String(r.source ?? ''),
        total: Number(r.totalLeads ?? 0),
        conv: Number(r.conversionRatePercent ?? 0)
      })),
    [leadsSource]
  )

  const reportingCurrency = useMemo(
    () => String(executiveKpis?.currency ?? 'AED').toUpperCase(),
    [executiveKpis]
  )

  const chartActivityTypes = useMemo(
    () =>
      activityBundle.byType.map(row => ({
        activityType: String(row.activityType ?? 'UNKNOWN').slice(0, 28),
        count: Number(row.total ?? 0)
      })),
    [activityBundle.byType]
  )

  const chartFunnel = useMemo(() => {
    const f = funnelSnapshot?.funnel
    return Array.isArray(f)
      ? f.map(row => ({
          stage: String(row.stage ?? '').replace(/_/g, ' '),
          count: Number(row.count ?? 0)
        }))
      : []
  }, [funnelSnapshot])

  const chartLeadSourcePie = useMemo(
    () =>
      aggregateSourcePie(
        leadsSource as { source?: string; totalLeads?: number }[],
        8
      ),
    [leadsSource]
  )

  const leadSourcePieSlices = useMemo(
    () => chartLeadSourcePie.filter(d => d.value > 0),
    [chartLeadSourcePie]
  )

  const chartFinanceBySupplier = useMemo(() => {
    const totals = new Map<string, number>()
    financeSvcRows.forEach(row => {
      const name = String(row.supplierName ?? 'Suppliers').trim() || '—'
      const amt = Number(row.basePrice ?? row.bookingTotalAmount ?? 0) || 0
      totals.set(name, (totals.get(name) || 0) + amt)
    })
    return [...totals.entries()]
      .map(([name, revenue]) => ({ name: name.slice(0, 18), revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 14)
  }, [financeSvcRows])

  const supplierDelta = useMemo(() => {
    if (!supplierCurrent || !supplierPrev) return null
    const tc =
      Number(supplierCurrent.totalCases ?? 0) -
      Number(supplierPrev.totalCases ?? 0)
    const sr =
      Number(supplierCurrent.successRatePercent ?? 0) -
      Number(supplierPrev.successRatePercent ?? 0)
    const fee =
      Number(supplierCurrent.averageVisaFee ?? 0) -
      Number(supplierPrev.averageVisaFee ?? 0)
    const days =
      Number(supplierCurrent.averageProcessingDays ?? 0) -
      Number(supplierPrev.averageProcessingDays ?? 0)
    return {
      growthCases: tc,
      deltaSuccessRate: sr,
      deltaFee: fee,
      deltaProcessingDays: days
    }
  }, [supplierCurrent, supplierPrev])

  const applyDraft = () => setApplied({ ...draft })

  const exportCurrentTab = (mode: 'csv' | 'excel') => {
    const sections: { title: string; rows: Record<string, unknown>[] }[] = []
    if (executiveKpis) {
      sections.push({
        title: 'Executive KPIs',
        rows: [executiveKpis as Record<string, unknown>]
      })
    }
    if (tab === 'sales') {
      sections.push({ title: 'Revenue monthly', rows: toRecordRows(revenueMonthly) })
      sections.push({ title: 'Revenue by destination', rows: toRecordRows(revenueDest) })
      sections.push({ title: 'Revenue by service', rows: toRecordRows(revenueSvc) })
      sections.push({ title: 'Target vs achievement', rows: toRecordRows(targetRows) })
      sections.push({
        title: 'Supplier booking services',
        rows: toRecordRows(financeSvcRows as Record<string, string | number>[])
      })
      sections.push({ title: 'Leads · deal snapshot', rows: toRecordRows(dealLines as Record<string, string | number>[]) })
    } else if (tab === 'leads') {
      sections.push({ title: 'Leads by source', rows: toRecordRows(leadsSource) })
      sections.push({ title: 'Leads by consultant', rows: toRecordRows(leadsConsultant) })
      sections.push({
        title: 'Deal lines (filtered leads · booking value in window)',
        rows: toRecordRows(dealLines as Record<string, string | number>[])
      })
      if (funnelSnapshot?.funnel) {
        sections.push({
          title: 'Funnel counts',
          rows: funnelSnapshot.funnel.map(row => ({
            stage: row.stage,
            count: row.count,
            sharePercent: row.sharePercent
          })) as Record<string, unknown>[]
        })
      }
    } else if (tab === 'users') {
      sections.push({ title: 'Target vs achievement', rows: toRecordRows(targetRows) })
      sections.push({ title: 'Leads by consultant', rows: toRecordRows(leadsConsultant) })
    } else {
      sections.push({
        title: 'Lead activities (non-call)',
        rows: toRecordRows(activityBundle.items as Record<string, string | number>[])
      })
      sections.push({
        title: 'Activity volume by type',
        rows: activityBundle.byType.map(r => ({
          activityType: r.activityType,
          total: r.total
        })) as Record<string, unknown>[]
      })
      sections.push({ title: 'Follow-ups due (end date)', rows: fuToday })
      sections.push({
        title: 'Missed follow-ups (through end date)',
        rows: fuMissed
      })
    }

    const stamp = new Date().toISOString().slice(0, 10)
    const nameBase = `test-report-${tab}-${stamp}`

    if (mode === 'csv') exportSectionsCsv(`${nameBase}.csv`, sections)
    else exportSectionsExcelTab(`${nameBase}.xls`, sections)
  }

  const handlePrintPdf = () => window.print()

  const tabsList = [
    { id: 'sales' as const, label: 'Sales' },
    { id: 'leads' as const, label: 'Leads' },
    { id: 'users' as const, label: 'User performance' },
    { id: 'activity' as const, label: 'Activity' }
  ]

  const targetChart = targetRows.slice(0, 12).map(r => ({
    name: String(r.fullName ?? '').slice(0, 14) || '—',
    achieved: Number(r.achievedAmount ?? 0),
    target: Number(r.targetAmount ?? 0)
  }))

  return (
    <div className='min-h-[calc(100vh-80px)] space-y-6 p-4 md:p-6'>
      <div className='print:hidden flex flex-col gap-3 md:flex-row md:items-end md:justify-between'>
        <div>
          <h1 className='text-2xl font-bold text-gray-900 dark:text-gray-100'>
           Report Page
          </h1>
          <p className='text-sm text-gray-500 dark:text-gray-400'>
            Consultant maps to lead assignee. Destination / country / source / status
            match the Leads module. Supplier filters booking-based revenue (KPIs,
            charts, supplier lines table). Activity feed ignores supplier. Apply
            after edits.
          </p>
        </div>
        <div className='flex flex-wrap gap-2'>
          <button
            type='button'
            disabled={loading}
            onClick={() => exportCurrentTab('csv')}
            className='inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800'
          >
            <FaDownload /> CSV
          </button>
          <button
            type='button'
            disabled={loading}
            onClick={() => exportCurrentTab('excel')}
            className='inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800'
          >
            <FaDownload /> Excel
          </button>
          <button
            type='button'
            onClick={handlePrintPdf}
            className='inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800'
          >
            <FaPrint /> PDF (print)
          </button>
        </div>
      </div>

      <SurfaceCard className='print:hidden space-y-4 p-4'>
        <div className='flex flex-wrap items-end gap-3'>
          <DateInput
            label='From'
            value={draft.from}
            onChange={v => setDraft(d => ({ ...d, from: v }))}
            className='min-w-[140px]'
          />
          <DateInput
            label='To'
            value={draft.to}
            onChange={v => setDraft(d => ({ ...d, to: v }))}
            className='min-w-[140px]'
          />
          <div className='min-w-[180px] flex-1'>
            <label className='mb-1 block text-xs font-semibold text-gray-500'>
              Destination
            </label>
            <SearchableDropdown
              value={draft.destination}
              onChange={v => setDraft(d => ({ ...d, destination: v }))}
              options={destinationOptions}
              placeholder='All destinations'
              searchPlaceholder='Search…'
            />
          </div>
        
          <div className='min-w-[180px] flex-1'>
            <label className='mb-1 block text-xs font-semibold text-gray-500'>
              Consultant
            </label>
            <SearchableDropdown
              value={draft.consultantId}
              onChange={v => setDraft(d => ({ ...d, consultantId: v }))}
              options={consultantOptions}
              placeholder='All consultants'
              searchPlaceholder='Search…'
            />
          </div>
        
       
          <div className='min-w-[200px] flex-1'>
            <label className='mb-1 block text-xs font-semibold text-gray-500'>
              Supplier · booking services table
            </label>
            <SearchableDropdown
              value={draft.supplierId}
              onChange={v => setDraft(d => ({ ...d, supplierId: v }))}
              options={supplierOptsDropdown}
              placeholder='All suppliers'
              searchPlaceholder='Search…'
            />
          </div>
          <button
            type='button'
            disabled={loading}
            onClick={applyDraft}
            className='rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60'
          >
            Apply filters
          </button>
        </div>
        {error ?
          <p className='text-sm text-red-600'>{error}</p>
        : null}
      </SurfaceCard>

      <SurfaceCard className='space-y-3 p-4'>
        <div className='flex flex-wrap items-center justify-between gap-2'>
          <h2 className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
            KPI snapshot
          </h2>
          {loading ?
            <span className='text-xs text-gray-500'>Refreshing…</span>
          : null}
        </div>
        <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-4'>
          {KPI_CARD_ORDER.map(entry => (
            <div
              key={entry.key}
              className='rounded-xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900'
            >
              <p className='text-[11px] font-semibold uppercase tracking-wide text-gray-500'>
                {entry.label}
              </p>
              <p
                className={`mt-1 text-xl font-bold text-gray-900 dark:text-gray-50 ${
                  loading && !executiveKpis ? 'animate-pulse text-gray-400 dark:text-gray-500' : ''
                }`}
              >
                {loading && !executiveKpis ?
                  '…'
                : executiveKpis ?
                  formatKpiCell(
                    entry.key,
                    executiveKpis[entry.key],
                    String(executiveKpis.currency ?? 'AED')
                  )
                : '—'}
              </p>
            </div>
          ))}
        </div>
      </SurfaceCard>

      <div className='space-y-6 print:px-0'>
        <SurfaceCard className='space-y-3 p-4'>
          <h2 className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
            Supplier booking lines (quotation services)
          </h2>
          <p className='text-sm text-gray-500'>
            Every row is a billed service line on a booked quote: supplier name,
            booking/quote refs, estimate value (basePrice), booking total. Click a
            row for export-friendly detail.
          </p>
          {chartFinanceBySupplier.length > 0 ?
            <div className='h-[220px] w-full'>
              <ResponsiveContainer width='100%' height='100%'>
                <BarChart data={chartFinanceBySupplier}>
                  <CartesianGrid strokeDasharray='3 3' opacity={0.3} />
                  <XAxis dataKey='name' tick={{ fontSize: 10 }} />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickFormatter={v => compactAxisNumber(Number(v))}
                  />
                  <Tooltip
                    formatter={(value: number | undefined) =>
                      formatMoneyIntl(Number(value ?? 0), reportingCurrency)
                    }
                  />
                  <Bar
                    dataKey='revenue'
                    fill={CHART_COLORS[0]}
                    radius={[6, 6, 0, 0]}
                    name='Est. supplier line value'
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          : null}
          <div className='overflow-x-auto'>
            <table className='min-w-[960px] w-full text-left text-sm'>
              <thead>
                <tr className='border-b border-gray-200 text-xs uppercase text-gray-500 dark:border-gray-700'>
                  <th className='py-2 pr-3'>Supplier</th>
                  <th className='py-2 pr-3'>Service</th>
                  <th className='py-2 pr-3'>Booking</th>
                  <th className='py-2 pr-3'>Quote</th>
                  <th className='py-2 pr-3'>Lead</th>
                  <th className='py-2 pr-3'>Destination</th>
                  <th className='py-2 pr-3 text-right'>Line value</th>
                  <th className='py-2 pr-3 text-right'>Booking total</th>
                </tr>
              </thead>
              <tbody>
                {financeSvcRows.map((row, idx) => (
                  <tr
                    key={`${String(row.bookingId ?? '')}-${String(row.supplierId ?? '')}-${idx}`}
                    role='button'
                    tabIndex={0}
                    onClick={() => setFinanceDetailRow(row)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        setFinanceDetailRow(row)
                      }
                    }}
                    className='cursor-pointer border-b border-gray-100 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/60'
                  >
                    <td className='py-2 pr-3 font-medium'>
                      {String(row.supplierName ?? '—')}
                    </td>
                    <td className='max-w-[200px] truncate py-2 pr-3'>
                      {String(row.serviceLabel ?? '')}
                    </td>
                    <td className='py-2 pr-3 whitespace-nowrap'>
                      {String(row.bookingNumber ?? row.bookingId ?? '')}
                    </td>
                    <td className='py-2 pr-3 whitespace-nowrap'>
                      {String(row.quoteNumber ?? '')}
                    </td>
                    <td className='py-2 pr-3'>{String(row.leadName ?? '')}</td>
                    <td className='py-2 pr-3'>{String(row.destination ?? '')}</td>
                    <td className='py-2 pr-3 text-right'>
                      {formatMoneyIntl(
                        Number(row.basePrice ?? 0),
                        String(row.currency ?? reportingCurrency)
                      )}
                    </td>
                    <td className='py-2 pr-3 text-right'>
                      {formatMoneyIntl(
                        Number(row.bookingTotalAmount ?? 0),
                        String(
                          row.bookingCurrency ?? row.currency ?? reportingCurrency
                        )
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!financeSvcRows.length ?
              <p className='py-6 text-center text-sm text-gray-500'>
                {loading ? 'Loading…' : 'No booked supplier lines in this window.'}
              </p>
            : null}
          </div>
        </SurfaceCard>

        <SurfaceCard className='space-y-3 p-4'>
          <h2 className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
            Visa supplier KPIs (visa cases only)
          </h2>
          {!applied.supplierId ?
            <p className='text-sm text-gray-500'>
              Optional: choose one supplier for period-over-period visa case deltas.
              Table lists suppliers with visa volume in date range.
            </p>
          : null}
          {supplierDelta && applied.supplierId ?
            <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-4'>
              <div className='rounded-xl border border-gray-100 bg-gray-50/80 p-3 dark:border-gray-700 dark:bg-gray-800/40'>
                <p className='text-xs font-semibold text-gray-500'>Growth (cases)</p>
                <p className='text-xl font-bold text-gray-900 dark:text-gray-50'>
                  {supplierDelta.growthCases >= 0 ? '+' : ''}
                  {supplierDelta.growthCases}
                </p>
              </div>
              <div className='rounded-xl border border-gray-100 bg-gray-50/80 p-3 dark:border-gray-700 dark:bg-gray-800/40'>
                <p className='text-xs font-semibold text-gray-500'>
                  Success rate change (pts)
                </p>
                <p className='text-xl font-bold text-gray-900 dark:text-gray-50'>
                  {supplierDelta.deltaSuccessRate >= 0 ? '+' : ''}
                  {supplierDelta.deltaSuccessRate.toFixed(1)}
                </p>
              </div>
              <div className='rounded-xl border border-gray-100 bg-gray-50/80 p-3 dark:border-gray-700 dark:bg-gray-800/40'>
                <p className='text-xs font-semibold text-gray-500'>Avg fee change</p>
                <p className='text-xl font-bold text-gray-900 dark:text-gray-50'>
                  {supplierDelta.deltaFee >= 0 ? '+' : '-'}
                  {formatMoneyIntl(Math.abs(supplierDelta.deltaFee), reportingCurrency)}
                </p>
              </div>
              <div className='rounded-xl border border-gray-100 bg-gray-50/80 p-3 dark:border-gray-700 dark:bg-gray-800/40'>
                <p className='text-xs font-semibold text-gray-500'>
                  Processing days change
                </p>
                <p className='text-xl font-bold text-gray-900 dark:text-gray-50'>
                  {supplierDelta.deltaProcessingDays >= 0 ? '+' : ''}
                  {supplierDelta.deltaProcessingDays.toFixed(1)}
                </p>
              </div>
            </div>
          : null}
          <div className='overflow-x-auto'>
            <table className='min-w-full text-left text-sm'>
              <thead>
                <tr className='border-b border-gray-200 text-xs uppercase text-gray-500 dark:border-gray-700'>
                  <th className='py-2 pr-3'>Supplier</th>
                  <th className='py-2 pr-3'>Cases</th>
                  <th className='py-2 pr-3'>Success %</th>
                  <th className='py-2 pr-3'>Rejected</th>
                  <th className='py-2 pr-3'>Pending</th>
                  <th className='py-2 pr-3'>Avg fee</th>
                </tr>
              </thead>
              <tbody>
                {supplierAll.map(row => (
                  <tr
                    key={String(row.id)}
                    className='border-b border-gray-100 dark:border-gray-800'
                  >
                    <td className='py-2 pr-3 font-medium'>{String(row.name ?? '')}</td>
                    <td className='py-2 pr-3'>{String(row.totalCases ?? '')}</td>
                    <td className='py-2 pr-3'>
                      {String(row.successRatePercent ?? '')}
                    </td>
                    <td className='py-2 pr-3'>{String(row.rejectedCases ?? '')}</td>
                    <td className='py-2 pr-3'>{String(row.pendingCases ?? '')}</td>
                    <td className='py-2 pr-3'>
                      {formatMoneyIntl(
                        Number(row.averageVisaFee ?? 0),
                        reportingCurrency
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!supplierAll.length ?
              <p className='py-6 text-center text-sm text-gray-500'>
                {loading ? 'Loading…' : 'No supplier visa data in range.'}
              </p>
            : null}
          </div>
        </SurfaceCard>

        <div className='print:hidden overflow-x-auto pb-2'>
          <FilterTabs tabs={tabsList} active={tab} onChange={(id: string) => setTab(id as TabId)} />
        </div>

        {tab === 'sales' ?
          <div className='space-y-6'>
            <SurfaceCard className='p-4'>
              <h3 className='mb-4 font-semibold'>Revenue trend</h3>
              <div className='h-[280px] w-full'>
                <ResponsiveContainer width='100%' height='100%'>
                  <LineChart data={chartMonthly}>
                    <CartesianGrid strokeDasharray='3 3' opacity={0.3} />
                    <XAxis dataKey='month' tick={{ fontSize: 11 }} />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      tickFormatter={v => compactAxisNumber(Number(v))}
                    />
                    <Tooltip
                      formatter={(value: number | undefined, name: string | undefined) => [
                        formatMoneyIntl(Number(value ?? 0), reportingCurrency),
                        name
                      ]}
                    />
                    <Legend />
                    <Line
                      type='monotone'
                      dataKey='revenue'
                      stroke={CHART_COLORS[0]}
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type='monotone'
                      dataKey='profit'
                      stroke={CHART_COLORS[1]}
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </SurfaceCard>

            <div className='grid gap-6 lg:grid-cols-2'>
              <SurfaceCard className='p-4'>
                <h3 className='mb-4 font-semibold'>Lead sources (share)</h3>
                <div className='h-[260px] w-full'>
                  <ResponsiveContainer width='100%' height='100%'>
                    <PieChart>
                      <Pie
                        data={leadSourcePieSlices}
                        dataKey='value'
                        nameKey='name'
                        outerRadius={88}
                        paddingAngle={1}
                      >
                        {leadSourcePieSlices.map((entry, i) => (
                          <Cell
                            key={entry.name}
                            fill={entry.fill ?? CHART_COLORS[i % 6]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number | undefined) =>
                          `${Number(value ?? 0).toLocaleString('en-IN')} leads`
                        }
                      />
                      <Legend wrapperStyle={{ fontSize: '11px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </SurfaceCard>
              <SurfaceCard className='p-4'>
                <h3 className='mb-4 font-semibold'>Pipeline funnel (counts)</h3>
                <div className='h-[260px] w-full'>
                  <ResponsiveContainer width='100%' height='100%'>
                    <BarChart data={chartFunnel}>
                      <CartesianGrid strokeDasharray='3 3' opacity={0.3} />
                      <XAxis dataKey='stage' tick={{ fontSize: 9 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey='count' fill={CHART_COLORS[3]} radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </SurfaceCard>
            </div>

            <div className='grid gap-6 lg:grid-cols-2'>
              <SurfaceCard className='p-4'>
                <h3 className='mb-4 font-semibold'>Revenue by destination</h3>
                <div className='h-[260px] w-full'>
                  <ResponsiveContainer width='100%' height='100%'>
                    <BarChart data={chartDest}>
                      <CartesianGrid strokeDasharray='3 3' opacity={0.3} />
                      <XAxis dataKey='destination' tick={{ fontSize: 10 }} />
                      <YAxis
                        tick={{ fontSize: 11 }}
                        tickFormatter={v => compactAxisNumber(Number(v))}
                      />
                      <Tooltip
                        formatter={(value: number | undefined) =>
                          formatMoneyIntl(Number(value ?? 0), reportingCurrency)
                        }
                      />
                      <Bar dataKey='revenue' fill={CHART_COLORS[0]} radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </SurfaceCard>
              <SurfaceCard className='p-4'>
                <h3 className='mb-4 font-semibold'>Revenue by service type</h3>
                <div className='h-[260px] w-full'>
                  {chartSvcPieActive.length ?
                    <ResponsiveContainer width='100%' height='100%'>
                      <PieChart>
                        <Pie
                          data={chartSvcPieActive}
                          dataKey='value'
                          nameKey='name'
                          innerRadius={42}
                          outerRadius={82}
                          paddingAngle={2}
                        >
                          {chartSvcPieActive.map((_, i) => (
                            <Cell
                              key={chartSvcPieActive[i]?.name ?? i}
                              fill={CHART_COLORS[i % CHART_COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number | undefined) =>
                            formatMoneyIntl(Number(value ?? 0), reportingCurrency)
                          }
                        />
                        <Legend wrapperStyle={{ fontSize: '11px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  : <p className='flex h-full items-center justify-center text-sm text-gray-500'>
                      No service-type revenue in this range.
                    </p>
                  }
                </div>
              </SurfaceCard>
            </div>

            <SurfaceCard className='p-4'>
              <h3 className='mb-3 font-semibold'>Target vs achievement</h3>
              <div className='overflow-x-auto'>
                <table className='min-w-full text-left text-sm'>
                  <thead>
                    <tr className='border-b text-xs uppercase text-gray-500'>
                      <th className='py-2 pr-3'>User</th>
                      <th className='py-2 pr-3'>Target</th>
                      <th className='py-2 pr-3'>Achieved</th>
                      <th className='py-2 pr-3'>%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {targetRows.map(r => (
                      <tr key={String(r.userId)} className='border-b border-gray-100'>
                        <td className='py-2 pr-3'>{String(r.fullName ?? '')}</td>
                        <td className='py-2 pr-3'>
                          {formatMoneyIntl(
                            Number(r.targetAmount ?? 0),
                            reportingCurrency
                          )}
                        </td>
                        <td className='py-2 pr-3'>
                          {formatMoneyIntl(
                            Number(r.achievedAmount ?? 0),
                            reportingCurrency
                          )}
                        </td>
                        <td className='py-2 pr-3'>
                          {String(r.achievementPercent ?? '')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SurfaceCard>
            <SurfaceCard className='p-4'>
              <h3 className='mb-3 font-semibold'>Lead & deal detail (export-friendly)</h3>
              <div className='max-h-[360px] overflow-auto'>
                <table className='min-w-full text-left text-sm'>
                  <thead className='sticky top-0 bg-white dark:bg-gray-900'>
                    <tr className='border-b text-xs uppercase text-gray-500'>
                      <th className='py-2 pr-3'>Date</th>
                      <th className='py-2 pr-3'>Lead</th>
                      <th className='py-2 pr-3'>Source</th>
                      <th className='py-2 pr-3'>Status</th>
                      <th className='py-2 pr-3'>Assignee</th>
                      <th className='py-2 pr-3 text-right'>Deal amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dealLines.slice(0, 400).map(r => (
                      <tr key={String(r.leadId)} className='border-b border-gray-100'>
                        <td className='py-2 pr-3 whitespace-nowrap'>
                          {String(r.leadDate ?? '').slice(0, 10)}
                        </td>
                        <td className='py-2 pr-3'>{String(r.leadName ?? '')}</td>
                        <td className='py-2 pr-3'>{String(r.source ?? '')}</td>
                        <td className='py-2 pr-3'>
                          {String(r.status ?? '')}
                          {r.subStatus ? ` · ${String(r.subStatus)}` : ''}
                        </td>
                        <td className='py-2 pr-3'>{String(r.assignedUser ?? '')}</td>
                        <td className='py-2 pr-3 text-right'>
                          {formatMoneyIntl(
                            Number(r.dealAmount ?? 0),
                            reportingCurrency
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!dealLines.length ?
                  <p className='py-6 text-center text-sm text-gray-500'>No rows.</p>
                : null}
              </div>
            </SurfaceCard>
          </div>
        : null}

        {tab === 'leads' ?
          <div className='space-y-6'>
            <SurfaceCard className='p-4'>
              <h3 className='mb-4 font-semibold'>Status funnel (database)</h3>
              <div className='h-[280px] w-full'>
                <ResponsiveContainer width='100%' height='100%'>
                  <BarChart data={chartFunnel}>
                    <CartesianGrid strokeDasharray='3 3' opacity={0.3} />
                    <XAxis dataKey='stage' tick={{ fontSize: 9 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey='count' fill={CHART_COLORS[0]} radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </SurfaceCard>
            <div className='grid gap-6 lg:grid-cols-2'>
              <SurfaceCard className='p-4'>
                <h3 className='mb-4 font-semibold'>Leads by source (bar)</h3>
                <div className='h-[260px] w-full'>
                  <ResponsiveContainer width='100%' height='100%'>
                    <BarChart data={chartLeadsSrc}>
                      <CartesianGrid strokeDasharray='3 3' opacity={0.3} />
                      <XAxis dataKey='source' tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar
                        dataKey='total'
                        fill={CHART_COLORS[2]}
                        radius={[6, 6, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </SurfaceCard>
              <SurfaceCard className='p-4'>
                <h3 className='mb-4 font-semibold'>Lead sources (pie)</h3>
                <div className='h-[260px] w-full'>
                  <ResponsiveContainer width='100%' height='100%'>
                    <PieChart>
                      <Pie
                        data={leadSourcePieSlices}
                        dataKey='value'
                        nameKey='name'
                        outerRadius={88}
                        paddingAngle={1}
                      >
                        {leadSourcePieSlices.map((entry, i) => (
                          <Cell
                            key={entry.name}
                            fill={entry.fill ?? CHART_COLORS[i % 6]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number | undefined) =>
                          `${Number(value ?? 0).toLocaleString('en-IN')} leads`
                        }
                      />
                      <Legend wrapperStyle={{ fontSize: '11px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </SurfaceCard>
            </div>
            <SurfaceCard className='p-4'>
              <h3 className='mb-4 font-semibold'>Conversion rate by source</h3>
              <div className='h-[260px] w-full'>
                <ResponsiveContainer width='100%' height='100%'>
                  <LineChart data={chartLeadsSrc}>
                    <CartesianGrid strokeDasharray='3 3' opacity={0.3} />
                    <XAxis dataKey='source' tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Line dataKey='conv' stroke={CHART_COLORS[3]} strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </SurfaceCard>
            <SurfaceCard className='p-4'>
              <h3 className='mb-3 font-semibold'>Leads by consultant</h3>
              <div className='overflow-x-auto'>
                <table className='min-w-full text-left text-sm'>
                  <thead>
                    <tr className='border-b text-xs uppercase text-gray-500'>
                      <th className='py-2 pr-3'>Consultant</th>
                      <th className='py-2 pr-3'>Leads</th>
                      <th className='py-2 pr-3'>Converted</th>
                      <th className='py-2 pr-3'>Conv %</th>
                      <th className='py-2 pr-3'>Avg resp (min)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leadsConsultant.map(r => (
                      <tr
                        key={String(r.userId)}
                        className='border-b border-gray-100'
                      >
                        <td className='py-2 pr-3'>
                          {String(r.consultantName ?? '')}
                        </td>
                        <td className='py-2 pr-3'>{String(r.totalLeads ?? '')}</td>
                        <td className='py-2 pr-3'>
                          {String(r.convertedLeads ?? '')}
                        </td>
                        <td className='py-2 pr-3'>
                          {String(r.conversionRatePercent ?? '')}
                        </td>
                        <td className='py-2 pr-3'>
                          {String(r.averageResponseMinutes ?? '')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SurfaceCard>
            <SurfaceCard className='p-4'>
              <h3 className='mb-3 font-semibold'>
                Filtered leads & deal totals (booking amount in window)
              </h3>
              <p className='mb-3 text-xs text-gray-500'>
                Lead dates use filter range. Deal amount sums bookings whose booking date
                is in the same range.
              </p>
              <div className='max-h-[440px] overflow-auto'>
                <table className='min-w-full text-left text-sm'>
                  <thead className='sticky top-0 bg-white dark:bg-gray-900'>
                    <tr className='border-b text-xs uppercase text-gray-500'>
                      <th className='py-2 pr-3'>Date</th>
                      <th className='py-2 pr-3'>Lead</th>
                      <th className='py-2 pr-3'>Source</th>
                      <th className='py-2 pr-3'>Status</th>
                      <th className='py-2 pr-3'>Assignee</th>
                      <th className='py-2 pr-3 text-right'>Deal amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dealLines.map(r => (
                      <tr key={String(r.leadId)} className='border-b border-gray-100'>
                        <td className='py-2 pr-3 whitespace-nowrap'>
                          {String(r.leadDate ?? '').slice(0, 10)}
                        </td>
                        <td className='py-2 pr-3'>{String(r.leadName ?? '')}</td>
                        <td className='py-2 pr-3'>{String(r.source ?? '')}</td>
                        <td className='py-2 pr-3'>
                          {String(r.status ?? '')}
                          {r.subStatus ? ` · ${String(r.subStatus)}` : ''}
                        </td>
                        <td className='py-2 pr-3'>{String(r.assignedUser ?? '')}</td>
                        <td className='py-2 pr-3 text-right'>
                          {formatMoneyIntl(
                            Number(r.dealAmount ?? 0),
                            reportingCurrency
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!dealLines.length ?
                  <p className='py-6 text-center text-sm text-gray-500'>
                    {loading ? 'Loading…' : 'No leads in filters.'}
                  </p>
                : null}
              </div>
            </SurfaceCard>
          </div>
        : null}

        {tab === 'users' ?
          <div className='space-y-6'>
            <SurfaceCard className='p-4'>
              <h3 className='mb-4 font-semibold'>Achievement vs target</h3>
              <div className='h-[300px] w-full'>
                <ResponsiveContainer width='100%' height='100%'>
                  <BarChart data={targetChart}>
                    <CartesianGrid strokeDasharray='3 3' opacity={0.3} />
                    <XAxis dataKey='name' tick={{ fontSize: 10 }} />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      tickFormatter={v => compactAxisNumber(Number(v))}
                    />
                    <Tooltip
                      formatter={(value: number | undefined, name: string | undefined) => [
                        formatMoneyIntl(Number(value ?? 0), reportingCurrency),
                        name
                      ]}
                    />
                    <Legend />
                    <Bar dataKey='achieved' fill={CHART_COLORS[0]} name='Achieved' />
                    <Bar dataKey='target' fill={CHART_COLORS[4]} name='Target' />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </SurfaceCard>
            <SurfaceCard className='p-4'>
              <h3 className='mb-3 font-semibold'>Consultant lead load</h3>
              <div className='h-[260px] w-full'>
                <ResponsiveContainer width='100%' height='100%'>
                  <BarChart
                    data={leadsConsultant.map(r => ({
                      name: String(r.consultantName ?? '').slice(0, 12),
                      leads: Number(r.totalLeads ?? 0),
                      converted: Number(r.convertedLeads ?? 0)
                    }))}
                  >
                    <CartesianGrid strokeDasharray='3 3' opacity={0.3} />
                    <XAxis dataKey='name' tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey='leads' fill={CHART_COLORS[0]} />
                    <Bar dataKey='converted' fill={CHART_COLORS[1]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </SurfaceCard>
          </div>
        : null}

        {tab === 'activity' ?
          <div className='space-y-6'>
            <div className='print:hidden rounded-xl border border-amber-200 bg-amber-50/60 p-3 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-100'>
              Follow-ups use <strong>{applied.to}</strong>. Activity feed excludes
              call-type rows; timestamps use the same lead filters (assignee / source /
              status / geo).
            </div>
            <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
              <SurfaceCard className='p-4'>
                <p className='text-xs font-semibold text-gray-500'>Due today</p>
                <p className='text-3xl font-bold'>{fuToday.length}</p>
              </SurfaceCard>
              <SurfaceCard className='p-4'>
                <p className='text-xs font-semibold text-gray-500'>Open overdue</p>
                <p className='text-3xl font-bold'>{fuMissed.length}</p>
              </SurfaceCard>
              <SurfaceCard className='p-4'>
                <p className='text-xs font-semibold text-gray-500'>
                  Non-call activities
                </p>
                <p className='text-3xl font-bold'>{activityBundle.items.length}</p>
              </SurfaceCard>
              <SurfaceCard className='p-4'>
                <p className='text-xs font-semibold text-gray-500'>
                  Distinct activity types
                </p>
                <p className='text-3xl font-bold'>
                  {
                    chartActivityTypes.filter(
                      r => Number(r.count ?? 0) > 0
                    ).length
                  }
                </p>
              </SurfaceCard>
            </div>
            <SurfaceCard className='p-4'>
              <h3 className='mb-4 font-semibold'>Volume by activity type</h3>
              <div className='h-[260px] w-full'>
                {chartActivityTypes.some(r => Number(r.count ?? 0) > 0) ?
                  <ResponsiveContainer width='100%' height='100%'>
                    <BarChart data={chartActivityTypes}>
                      <CartesianGrid strokeDasharray='3 3' opacity={0.3} />
                      <XAxis
                        dataKey='activityType'
                        tick={{ fontSize: 9 }}
                        interval={0}
                        angle={-28}
                        textAnchor='end'
                        height={70}
                      />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey='count' fill={CHART_COLORS[5]} radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                : <p className='flex h-full items-center justify-center text-sm text-gray-500'>
                    No non-call activities in this range.
                  </p>
                }
              </div>
            </SurfaceCard>
            <SurfaceCard className='p-4'>
              <h3 className='mb-3 font-semibold'>Recent non-call activities</h3>
              <div className='max-h-[360px] overflow-auto'>
                <table className='min-w-full text-left text-sm'>
                  <thead className='sticky top-0 bg-white dark:bg-gray-900'>
                    <tr className='border-b text-xs uppercase text-gray-500'>
                      <th className='py-2 pr-3'>When</th>
                      <th className='py-2 pr-3'>Lead</th>
                      <th className='py-2 pr-3'>Consultant</th>
                      <th className='py-2 pr-3'>Type</th>
                      <th className='py-2 pr-3'>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activityBundle.items.slice(0, 200).map(r => (
                      <tr key={String(r.id)} className='border-b border-gray-100'>
                        <td className='py-2 pr-3 whitespace-nowrap'>
                          {String(r.createdAt ?? '')}
                        </td>
                        <td className='py-2 pr-3'>{String(r.leadName ?? '')}</td>
                        <td className='py-2 pr-3'>
                          {String(r.consultantName ?? '')}
                        </td>
                        <td className='py-2 pr-3'>
                          {String(r.activityType ?? '')}
                        </td>
                        <td className='py-2 pr-3'>
                          {(String(r.notes ?? '').slice(0, 160) +
                            (String(r.notes ?? '').length > 160 ? '…' : '')) ||
                            '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!activityBundle.items.length ?
                  <p className='py-6 text-center text-sm text-gray-500'>
                    {loading ? 'Loading…' : 'No rows.'}
                  </p>
                : null}
              </div>
            </SurfaceCard>
          </div>
        : null}
      </div>

      {financeDetailRow ?
        <div className='print:hidden fixed inset-0 z-50 flex justify-end'>
          <button
            type='button'
            className='absolute inset-0 bg-black/40'
            aria-label='Close supplier line detail'
            onClick={() => setFinanceDetailRow(null)}
          />
          <aside
            className='relative flex max-h-screen w-full max-w-lg flex-col border-l border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900'
            role='dialog'
            aria-labelledby='finance-detail-heading'
          >
            <div className='flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700'>
              <div>
                <h2
                  id='finance-detail-heading'
                  className='text-base font-semibold text-gray-900 dark:text-gray-50'
                >
                  Supplier line detail
                </h2>
                <p className='text-xs text-gray-500'>Tab-separated labels for Excel</p>
              </div>
              <button
                type='button'
                className='rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
                onClick={() => setFinanceDetailRow(null)}
                aria-label='Close'
              >
                <FaTimes />
              </button>
            </div>
            <div className='min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3'>
              {Object.keys(financeDetailRow)
                .sort()
                .map(key => (
                  <div key={key} className='border-b border-gray-100 pb-2 dark:border-gray-800'>
                    <p className='text-[11px] font-semibold uppercase tracking-wide text-gray-500'>
                      {prettyFieldLabel(key)}
                    </p>
                    <p className='break-words text-sm text-gray-900 dark:text-gray-100'>
                      {formatFinanceDetailValue(
                        key,
                        financeDetailRow[key],
                        financeDetailRow,
                        reportingCurrency
                      )}
                    </p>
                  </div>
                ))}
            </div>
            <div className='border-t border-gray-200 p-4 dark:border-gray-700'>
              <button
                type='button'
                className='w-full rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700'
                onClick={() => {
                  const lines = Object.keys(financeDetailRow)
                    .sort()
                    .map(
                      k =>
                        `${prettyFieldLabel(k)}\t${formatFinanceDetailValue(
                          k,
                          financeDetailRow[k],
                          financeDetailRow,
                          reportingCurrency
                        )}`
                    )
                  void navigator.clipboard.writeText(lines.join('\n'))
                }}
              >
                Copy detail (Excel)
              </button>
            </div>
          </aside>
        </div>
      : null}
    </div>
  )
}

export default TestReportPage
