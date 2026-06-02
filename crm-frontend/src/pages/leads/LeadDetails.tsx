import React, { useCallback, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { FaArrowLeft, FaCheckCircle, FaClock, FaEnvelope, FaListUl, FaWhatsapp } from 'react-icons/fa'
import SurfaceCard from '../../components/ui/SurfaceCard'
import StatusBadge from '../../components/ui/StatusBadge'
import SearchableDropdown from '../../components/ui/SearchableDropdown'
import { reportApiError } from '../../lib/notify'
import { toast } from 'sonner'
import { bookingsApi } from '../../api/bookings'
import { quotationsApi } from '../../api/quotations'
import PdfTemplate from '../Quotation/PdfTemplate'
import { useLeadsService } from '../../hooks/useLeadsService'
import { useCampaignsService } from '../../hooks/useCampaignsService'
import { useUsersService } from '../../hooks/useUsersService'
import {
  buildBookingCreatePayloadFromQuotation,
  quotationWasSentToLead
} from '../../utils/bookingFromQuotation'
import { useAuth } from '../../context/AuthContext'
import { useDateTimePreferences } from '../../context/DateTimePreferencesContext'
import {
  SOP_STATUS_LABELS,
  decodeCustomStatusComboValue,
  deriveSopStatusLabel,
  encodeCustomStatusComboValue,
  isEncodedCustomStatusValue,
  normalizeStatusToken,
  resolveLeadDisplayedStatus,
  sopLabelToCanonical,
  toStatusLabelText,
  type SopStatusLabel
} from '../../utils/leadStatus'
import { Country } from 'country-state-city'
import { getCurrencyOptions } from '../../utils/currency'
import { getNationalityOptions } from '../../utils/nationality'
import { toLeadCountryFormValue } from '../../utils/leadCountry'
import { getBrowserTimeZone } from '../../utils/dateTimePreferences'
import {
  nowWallClockString,
  parseWallClockLocal,
  wallClockFromDatetimeLocal
} from '../../utils/clientWallClock'

/** Readable title when Meta / CRM only stored a normalized field key. */
function humanizeSnakeCase(text: string): string {
  const s = String(text ?? '')
    .trim()
    .replace(/_/g, ' ')
  if (!s) return ''
  return s
    .split(/\s+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ')
}

function looksLikeSnakeCaseToken(value: string): boolean {
  return /^[a-z0-9_]+$/i.test(String(value ?? '').trim())
}

/** Rotating tinted surfaces for custom-field answers (light + dark). */
const CUSTOM_FIELD_ANSWER_SURFACE = [
  'border border-sky-200/90 bg-gradient-to-br from-sky-50 to-cyan-50 text-sky-950 dark:border-sky-500/40 dark:from-sky-950/50 dark:to-cyan-950/30 dark:text-sky-50',
  'border border-violet-200/90 bg-gradient-to-br from-violet-50 to-fuchsia-50 text-violet-950 dark:border-violet-500/40 dark:from-violet-950/45 dark:to-fuchsia-950/30 dark:text-violet-50',
  'border border-amber-200/90 bg-gradient-to-br from-amber-50 to-orange-50 text-amber-950 dark:border-amber-500/40 dark:from-amber-950/45 dark:to-orange-950/30 dark:text-amber-50',
  'border border-emerald-200/90 bg-gradient-to-br from-emerald-50 to-teal-50 text-emerald-950 dark:border-emerald-500/40 dark:from-emerald-950/45 dark:to-teal-950/30 dark:text-emerald-50',
  'border border-rose-200/90 bg-gradient-to-br from-rose-50 to-pink-50 text-rose-950 dark:border-rose-500/40 dark:from-rose-950/45 dark:to-pink-950/30 dark:text-rose-50'
] as const

function followupSortKey(item: any): number {
  const local = item?.followupLocalAt ?? item?.followup_local_at
  if (local && String(local).trim()) {
    const d = parseWallClockLocal(String(local))
    if (d) return d.getTime()
  }
  const raw = normalizeWallClockDisplay(item?.followupDate ?? item?.followup_date)
  if (!raw) return 0
  return parseWallClockLocal(raw)?.getTime() || 0
}

function isScheduleOnlyFollowup(item: any): boolean {
  const raw = item?.isScheduleOnly ?? item?.is_schedule_only
  if (typeof raw === 'boolean') return raw
  if (typeof raw === 'number') return raw === 1
  const text = String(raw ?? '').trim().toLowerCase()
  return text === '1' || text === 'true' || text === 'yes'
}

function countsTowardComplianceFollowup(item: any): boolean {
  const raw = item?.countsTowardCompliance ?? item?.counts_toward_compliance
  if (typeof raw === 'boolean') return raw
  if (typeof raw === 'number') return raw === 1
  const text = String(raw ?? '').trim().toLowerCase()
  if (text === '1' || text === 'true' || text === 'yes') return true
  if (text === '0' || text === 'false' || text === 'no') return false
  return false
}

function normalizeWallClockDisplay(rawValue: unknown): string | null {
  const raw = String(rawValue ?? '').trim()
  if (!raw) return null
  const m =
    /^(\d{4}-\d{2}-\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?/.exec(raw)
  if (!m) return raw
  const hh = String(m[2] || '00').padStart(2, '0')
  const mm = String(m[3] || '00').padStart(2, '0')
  const ss = String(m[4] || '00').padStart(2, '0')
  return `${m[1]} ${hh}:${mm}:${ss}`
}

function normalizeCampaignCountry(rawValue: unknown): string {
  const raw = String(rawValue ?? '').trim()
  if (!raw) return 'Other'
  if (/^india$/i.test(raw)) return 'India'
  if (/^(uae|united arab emirates)$/i.test(raw)) return 'UAE'
  return raw
}

function normalizeLeadTimeZone(rawValue: unknown): string | null {
  const raw = String(rawValue ?? '').trim()
  if (!raw) return null
  if (raw === 'Asia/Calcutta') return 'Asia/Kolkata'
  return raw
}

type QualificationForm = {
  leadType: 'HOLIDAY' | 'VISA' | ''
  panNumber: string
  addressLine: string
  leadCountry: string
  nationality: string
  clientCurrency: string
  destinationName: string
  travelDate: string
  travelEndDate: string
  adultsCount: string
  childrenCount: string
  budget: string
  salary: string
  visaRequired: 'YES' | 'NO' | ''
  preferredHotelCategory: '3_STAR' | '4_STAR' | '5_STAR' | 'ANY' | ''
  travelPurpose: string
  leadSource: string
  campaignId: string
}

type LeadDropdownOption = {
  value: string
  label: string
  selectedLabel?: string
  searchText?: string
}

const normalizeDropdownLookup = (value: unknown): string =>
  String(value ?? '').trim().toLowerCase()

const resolveDropdownValue = <T extends LeadDropdownOption>(
  options: T[],
  rawValue: unknown
): string => {
  const raw = String(rawValue ?? '').trim()
  if (!raw) return ''
  const exact = options.find(option => option.value === raw)
  if (exact) return exact.value

  const normalized = normalizeDropdownLookup(raw)
  const loose = options.find(option => {
    return (
      normalizeDropdownLookup(option.value) === normalized ||
      normalizeDropdownLookup(option.label) === normalized ||
      normalizeDropdownLookup(option.selectedLabel) === normalized
    )
  })

  return loose?.value ?? raw
}

const withSelectedDropdownValue = <T extends LeadDropdownOption>(
  options: T[],
  rawValue: unknown
): T[] => {
  const resolved = resolveDropdownValue(options, rawValue)
  if (!resolved || options.some(option => option.value === resolved)) {
    return options
  }

  return [
    ...options,
    {
      value: resolved,
      label: `${resolved} (saved)`,
      selectedLabel: resolved,
      searchText: `${resolved} saved`
    } as T
  ]
}

const emptyQualification: QualificationForm = {
  leadType: '',
  panNumber: '',
  addressLine: '',
  leadCountry: '',
  nationality: '',
  clientCurrency: 'INR',
  destinationName: '',
  travelDate: '',
  travelEndDate: '',
  adultsCount: '2',
  childrenCount: '0',
  budget: '',
  salary: '',
  visaRequired: '',
  preferredHotelCategory: '',
  travelPurpose: '',
  leadSource: 'Website',
  campaignId: ''
}

const REQUIRED_COMPLIANCE = {
  calls: 6,
  whatsapp: 7,
  finalReminders: 1
}

const AGENT_ASSIGNABLE_ROLES = new Set([
  'agent',
  'manager',
  'sales_consultant',
  'visa_executive',
  'holiday_consultant'
])

const VIEW_ONLY_MANAGER_ROLES = new Set(['manager', 'department_head', 'team_lead'])

type LeadQuotationOption = {
  id: string
  quoteNumber: string
  status: string
  tripDestination: string | null
  totalSaleValue: number
  clientCurrency: string
  requiresApproval: boolean
  sentAt: string | null
}

function unwrapApiArray (response: unknown): unknown[] {
  if (!response || typeof response !== 'object') return []
  const data = (response as { data?: unknown }).data
  return Array.isArray(data) ? data : []
}

const LeadDetails: React.FC = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const leadsService = useLeadsService()
  const campaignsService = useCampaignsService()
  const usersService = useUsersService()
  const { hasPermission, user } = useAuth()
  const { formatDate, formatDateTime } =
    useDateTimePreferences()

  const [lead, setLead] = useState<any>(null)
  const [followups, setFollowups] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingFollowups, setLoadingFollowups] = useState(false)
  const [followupsError, setFollowupsError] = useState('')
  const [followupScheduleError, setFollowupScheduleError] = useState('')
  const [followupScheduleOk, setFollowupScheduleOk] = useState('')
  const [error, setError] = useState('')
  const [statusError, setStatusError] = useState('')
  const [statusSaving, setStatusSaving] = useState(false)
  const [statusComboValue, setStatusComboValue] = useState<string>('NEW')
  const [globalStatusPresets, setGlobalStatusPresets] = useState<string[]>([])
  const [workflowFollowupType, setWorkflowFollowupType] = useState<
    'CALL' | 'WHATSAPP' | 'FINAL_REMINDER'
  >('CALL')
  const [leadTemperature, setLeadTemperature] = useState<'HOT' | 'WARM' | 'COLD'>('COLD')
  const [statusNotes, setStatusNotes] = useState('')
  const [closedReason, setClosedReason] = useState('')
  const [qualification, setQualification] =
    useState<QualificationForm>(emptyQualification)
  const [childAges, setChildAges] = useState<string[]>([])
  const [followupDraft, setFollowupDraft] = useState({
    followupType: 'CALL',
    followupDate: '',
    cadenceCode: '',
    notes: ''
  })
  const [followupSaving, setFollowupSaving] = useState(false)
  const [callsButtonDisabled, setCallsButtonDisabled] = useState(false)
  const [showDisablePopup, setShowDisablePopup] = useState(false)
  const [leadQuotations, setLeadQuotations] = useState<LeadQuotationOption[]>(
    []
  )
  const [sentQuotations, setSentQuotations] = useState<LeadQuotationOption[]>(
    []
  )
  const [loadingSentQuotations, setLoadingSentQuotations] = useState(false)
  const [selectedConversionQuotationId, setSelectedConversionQuotationId] =
    useState('')
  const [selectedLeadQuotationId, setSelectedLeadQuotationId] = useState('')
  const [quotationActionError, setQuotationActionError] = useState('')
  const [quotationActionMessage, setQuotationActionMessage] = useState('')
  const [quotationActionLoadingKey, setQuotationActionLoadingKey] = useState('')
  const [waQuickLine, setWaQuickLine] = useState<'all' | 'in' | 'uae'>('all')
  const [quotationPdfData, setQuotationPdfData] = useState<any | null>(null)
  const pdfTemplateRef = useRef<HTMLDivElement | null>(null)
  const [conversionFollowUpMessage, setConversionFollowUpMessage] = useState('')
  const [assigneeOptions, setAssigneeOptions] = useState<
    Array<{ value: string; label: string }>
  >([{ value: '', label: 'Select assignee' }])
  const [selectedAssigneeId, setSelectedAssigneeId] = useState('')
  const [assigning, setAssigning] = useState(false)
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [showSavedQualification, setShowSavedQualification] = useState(false)
  const [showCustomFields, setShowCustomFields] = useState(false)
  const [qualificationSaving, setQualificationSaving] = useState(false)
  const qualificationSavingRef = useRef(false)

  const createdAtLabel = useMemo(() => {
    const wall = lead?.clientCreatedAt ?? lead?.client_created_at
    const tz = lead?.clientTimezone ?? lead?.client_timezone
    if (wall && String(wall).trim()) {
      const w = String(wall).trim()
      const t = tz && String(tz).trim() ? ` ${String(tz).trim()}` : ''
      return `${w}${t}`
    }
    const raw =
      lead?.createdAt ??
      lead?.created_at ??
      lead?.createdOn ??
      lead?.created_on ??
      lead?.createdDate ??
      null
    if (!raw) return 'N/A'
    return formatDateTime(raw, String(raw))
  }, [lead, formatDateTime])
  const leadTimeZone = useMemo(
    () => normalizeLeadTimeZone(lead?.clientTimezone ?? lead?.client_timezone),
    [lead]
  )
  const firstContactDeadlineFromCreationLabel = useMemo(() => {
    const wall = String(lead?.clientCreatedAt ?? lead?.client_created_at ?? '').trim()
    if (!wall) return null
    const created = parseWallClockLocal(wall)
    if (!created || Number.isNaN(created.getTime())) return null
    const deadline = new Date(created.getTime() + 15 * 60 * 1000)
    const y = String(deadline.getFullYear()).padStart(4, '0')
    const m = String(deadline.getMonth() + 1).padStart(2, '0')
    const d = String(deadline.getDate()).padStart(2, '0')
    const hh = String(deadline.getHours()).padStart(2, '0')
    const mm = String(deadline.getMinutes()).padStart(2, '0')
    const ss = String(deadline.getSeconds()).padStart(2, '0')
    const tzRaw = String(lead?.clientTimezone ?? lead?.client_timezone ?? '').trim()
    const tz = tzRaw ? ` ${tzRaw}` : ''
    return `${y}-${m}-${d} ${hh}:${mm}:${ss}${tz}`
  }, [lead])

  const resolveFollowupActorName = useCallback((item: any) => {
    const name = String(
      item?.userFullName ??
        item?.user_full_name ??
        item?.userName ??
        item?.user_name ??
        item?.actorName ??
        item?.actor_name ??
        ''
    ).trim()
    return name || 'System'
  }, [])

  const resolveFollowupActionDate = useCallback(
    (item: any): Date | null => {
      const localRaw = item?.followupLocalAt ?? item?.followup_local_at ?? null
      if (localRaw) {
        const fromWall = parseWallClockLocal(String(localRaw))
        if (fromWall && !Number.isNaN(fromWall.getTime())) {
          return fromWall
        }
      }
      const scheduledRaw = normalizeWallClockDisplay(
        item?.followupDate ?? item?.followup_date ?? null
      )
      const scheduled = scheduledRaw ? parseWallClockLocal(scheduledRaw) : null
      if (scheduled && !Number.isNaN(scheduled.getTime())) {
        return scheduled
      }

      const actionTimeRaw = normalizeWallClockDisplay(
        item?.createdAt ?? item?.created_at ?? null
      )
      const actionTime = actionTimeRaw ? parseWallClockLocal(actionTimeRaw) : null
      if (actionTime && !Number.isNaN(actionTime.getTime())) {
        return actionTime
      }

      return null
    },
    []
  )

  const formatFollowupDisplay = useCallback(
    (item: any) => {
      const local = item?.followupLocalAt ?? item?.followup_local_at
      const tz = item?.clientTimezone ?? item?.client_timezone
      if (local && String(local).trim()) {
        const w = String(local).trim()
        const t = tz && String(tz).trim() ? ` ${String(tz).trim()}` : ''
        return `${w}${t}`
      }
      const raw = normalizeWallClockDisplay(item?.followupDate ?? item?.followup_date)
      if (raw) {
        const t = tz && String(tz).trim() ? ` ${String(tz).trim()}` : ''
        return `${raw}${t}`
      }
      const created = normalizeWallClockDisplay(item?.createdAt ?? item?.created_at)
      if (created) {
        const t = tz && String(tz).trim() ? ` ${String(tz).trim()}` : ''
        return `${created}${t}`
      }
      return 'No date'
    },
    []
  )



  const formatHistoryActionDisplay = useCallback((item: any) => {
    const activityCreated = normalizeWallClockDisplay(item?.activityCreatedAt ?? item?.activity_created_at)
    if (activityCreated) {
      const tz = item?.activityTimezone ?? item?.activity_timezone ?? item?.clientTimezone ?? item?.client_timezone
      const t = tz && String(tz).trim() ? ` ${String(tz).trim()}` : ''
      return `${activityCreated}${t}`
    }
    const created = normalizeWallClockDisplay(item?.createdAt ?? item?.created_at)
    if (created) {
      const tz = item?.clientTimezone ?? item?.client_timezone
      const t = tz && String(tz).trim() ? ` ${String(tz).trim()}` : ''
      return `${created}${t}`
    }
    return 'No date'
  }, [])

  const assignedLeadAgentName = useMemo(() => {
    const name = String(
      lead?.assignedUser?.fullName ??
        lead?.assignedUser?.name ??
        lead?.assigned_user?.full_name ??
        lead?.assigned_user?.name ??
        ''
    ).trim()

    return name || null
  }, [lead])

  const assignedByName = useMemo(() => {
    const name = String(
      lead?.assignedByUser?.fullName ??
        lead?.assigned_by_user?.full_name ??
        lead?.assignedByName ??
        lead?.assigned_by_name ??
        ''
    ).trim()
    return name || null
  }, [lead])

  const qualificationChildrenCount = useMemo(() => {
    const numericValue = Number(qualification.childrenCount || 0)
    if (!Number.isFinite(numericValue)) return 0
    return Math.max(0, Math.floor(numericValue))
  }, [qualification.childrenCount])

  const activeQualificationLeadType = useMemo((): 'HOLIDAY' | 'VISA' => {
    const raw = String(
      qualification.leadType || lead?.leadType || lead?.lead_type || 'HOLIDAY'
    )
      .trim()
      .toUpperCase()
    return raw === 'VISA' ? 'VISA' : 'HOLIDAY'
  }, [qualification.leadType, lead?.leadType, lead?.lead_type])

  const isHolidayQualification = activeQualificationLeadType === 'HOLIDAY'
  const isVisaQualification = activeQualificationLeadType === 'VISA'

  const cleanChildAges = useMemo(
    () =>
      childAges
        .slice(0, qualificationChildrenCount)
        .map(age => age.trim())
        .filter(age => age !== '')
        .map(age => Number(age))
        .filter(age => Number.isFinite(age) && age >= 0 && age <= 18),
    [childAges, qualificationChildrenCount]
  )

  const hydrateQualification = useCallback((item: any) => {
    const toInputDateLocal = (raw: unknown): string => {
      const value = String(raw ?? '').trim()
      if (!value) return ''
      if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value
      const d = new Date(value)
      if (Number.isNaN(d.getTime())) return value.slice(0, 10)
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${y}-${m}-${day}`
    }

    const rawChildrenCount = Number(
      item?.childrenCount ?? item?.children_count ?? 0
    )
    const nextChildrenCount = Number.isFinite(rawChildrenCount)
      ? Math.max(0, Math.floor(rawChildrenCount))
      : 0
    const rawChildAges = Array.isArray(item?.childAges)
      ? item.childAges
      : Array.isArray(item?.child_ages)
        ? item.child_ages
        : []

    setQualification({
      leadType: item?.leadType ?? item?.lead_type ?? '',
      panNumber: item?.panNumber ?? item?.pan_number ?? '',
      addressLine: item?.addressLine ?? item?.address_line ?? '',
      leadCountry: toLeadCountryFormValue(
        item?.leadCountry ?? item?.lead_country ?? item?.country ?? ''
      ),
      nationality: resolveDropdownValue(
        getNationalityOptions(),
        item?.nationality ?? ''
      ),
      clientCurrency:
        resolveDropdownValue(
          getCurrencyOptions(false),
          item?.clientCurrency ?? item?.client_currency ?? 'INR'
        ) || 'INR',
      destinationName:
        (typeof item?.destination === 'object'
          ? item?.destination?.name
          : item?.destination) ??
        item?.travelTo ??
        item?.travel_to ??
        item?.destinationName ??
        '',
      travelDate: toInputDateLocal(item?.travelDate ?? item?.travel_date ?? ''),
      travelEndDate: toInputDateLocal(item?.travelEndDate ?? item?.travel_end_date ?? ''),
      adultsCount: String(item?.adultsCount ?? 2),
      childrenCount: String(nextChildrenCount),
      budget:
        item?.budget !== undefined && item?.budget !== null
          ? String(item.budget)
          : '',
      salary:
        item?.salary !== undefined && item?.salary !== null
          ? String(item.salary)
          : '',
      visaRequired:
        typeof item?.visaRequired === 'boolean'
          ? item.visaRequired
            ? 'YES'
            : 'NO'
          : typeof item?.visaRequired === 'number'
            ? item.visaRequired === 1
              ? 'YES'
              : 'NO'
            : '',
      preferredHotelCategory: item?.preferredHotelCategory ?? '',
      travelPurpose: item?.travelPurpose ?? '',
      leadSource: item?.source ?? 'Website',
      campaignId: item?.campaignId ?? item?.campaign_id ?? ''
    })
    setChildAges(
      Array.from({ length: nextChildrenCount }, (_, index) => {
        const age = rawChildAges[index]
        return age === undefined || age === null ? '' : String(age)
      })
    )
  }, [])

  const loadGlobalStatusPresets = useCallback(async () => {
    try {
      const items = await leadsService.listCustomStatusPresets()
      setGlobalStatusPresets(items)
    } catch {
      setGlobalStatusPresets([])
    }
  }, [leadsService])

  const loadLead = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError('')
    try {
      const response = await leadsService.getLeadById(id)
      const raw =
        (response as any)?.data?.data ?? (response as any)?.data ?? response
      const callsDisabled = Boolean(raw?.callsDisabled ?? raw?.calls_disabled)
      const data = raw ? { ...raw, callsDisabled } : null
      setLead(data)
      setCallsButtonDisabled(false)
      if (data) {
        const rawCustom =
          data.customStatusLabel ?? data.custom_status_label
        const custom =
          typeof rawCustom === 'string' && rawCustom.trim()
            ? rawCustom.trim()
            : null
        setStatusComboValue(
          custom
            ? encodeCustomStatusComboValue(custom)
            : deriveSopStatusLabel(
                data.status,
                data.subStatus,
                data.statusLabel
              )
        )
        const rawTemperature = String(data.temperature || '').toUpperCase()
        setLeadTemperature(
          rawTemperature === 'HOT' || rawTemperature === 'WARM' || rawTemperature === 'COLD'
            ? rawTemperature
            : 'COLD'
        )
        hydrateQualification(data)
      }
    } catch (err) {
      reportApiError(err, 'Failed to load lead details.', setError)
      setLead(null)
    } finally {
      setLoading(false)
      void loadGlobalStatusPresets()
    }
  }, [hydrateQualification, id, leadsService, loadGlobalStatusPresets])

  const loadFollowups = useCallback(async () => {
    if (!id) return
    setLoadingFollowups(true)
    setFollowupsError('')
    try {
      const rows = await leadsService.getFollowups(id)
      setFollowups(rows)
    } catch (err) {
      setFollowups([])
      reportApiError(
        err,
        'Could not load follow-ups. Check login and API URL.',
        setFollowupsError
      )
    } finally {
      setLoadingFollowups(false)
    }
  }, [id, leadsService])

  const loadCampaigns = useCallback(async () => {
    if (!hasPermission('campaigns:read')) {
      setCampaigns([])
      return
    }
    try {
      const response = await campaignsService.list()
      const rows =
        (response as any)?.data?.data ?? (response as any)?.data ?? response
      setCampaigns(Array.isArray(rows) ? rows : [])
    } catch {
      setCampaigns([])
    }
  }, [campaignsService, hasPermission])

  const loadLeadQuotationsForLead = useCallback(async () => {
    if (!id) return
    setLoadingSentQuotations(true)
    try {
      const response = await quotationsApi.list({
        leadId: id,
        limit: 100
      })
      const rows = unwrapApiArray(response) as Record<string, unknown>[]
      const mapped: LeadQuotationOption[] = rows
        .map(q => ({
          id: String(q.id ?? ''),
          quoteNumber: String(q.quoteNumber ?? q.quote_number ?? q.id ?? ''),
          status: String(q.status ?? '').toUpperCase(),
          tripDestination: (q.tripDestination ?? q.trip_destination ?? null) as
            | string
            | null,
          totalSaleValue: Number(
            q.totalSaleValue ?? q.finalPrice ?? q.total ?? 0
          ),
          clientCurrency: String(
            q.clientCurrency ?? q.client_currency ?? 'INR'
          ).toUpperCase(),
          requiresApproval: Boolean(
            q.requiresApproval ?? q.requires_approval ?? false
          ),
          sentAt: (q.sentAt ?? q.sent_at ?? null) as string | null
        }))
      setLeadQuotations(mapped)
      setSentQuotations(mapped.filter(q => quotationWasSentToLead(q)))
      setSelectedLeadQuotationId(prev => {
        if (prev && mapped.some(q => q.id === prev)) return prev
        return mapped[0]?.id ?? ''
      })

      const eligible = mapped
        .filter(q => quotationWasSentToLead(q))
        .filter(
        item =>
          ['SENT', 'VIEWED', 'APPROVED'].includes(item.status) &&
          !(item.requiresApproval && ['SENT', 'VIEWED'].includes(item.status))
      )
      setSelectedConversionQuotationId(prev => {
        if (prev && eligible.some(q => q.id === prev)) return prev
        if (eligible.length === 1) return eligible[0].id
        return ''
      })
    } catch {
      setLeadQuotations([])
      setSentQuotations([])
      setSelectedLeadQuotationId('')
    } finally {
      setLoadingSentQuotations(false)
    }
  }, [id])

  const loadAssigneeOptions = useCallback(async () => {
    if (!lead) return
    const viewerRoleToken = String(user?.role ?? '')
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, '_')
    if (
      !hasPermission('leads:update') ||
      VIEW_ONLY_MANAGER_ROLES.has(viewerRoleToken)
    ) {
      setAssigneeOptions([{ value: '', label: 'Select assignee' }])
      return
    }
    try {
      const res = await usersService.list({ isActive: true, limit: 500 })
      const rows = unwrapApiArray(res) as Array<Record<string, unknown>>
      const assignableRows = rows.filter(row => {
        const roleToken = String(row.role ?? row.role_name ?? '')
          .trim()
          .toLowerCase()
          .replace(/[\s-]+/g, '_')
        return AGENT_ASSIGNABLE_ROLES.has(roleToken)
      })

      setAssigneeOptions([
        { value: '', label: 'Select assignee' },
        ...assignableRows.map(row => ({
          value: String(row.id ?? ''),
          label: `${String(row.fullName ?? row.full_name ?? 'User')} (${String(
            row.role ?? 'user'
          )})`
        }))
      ])
    } catch {
      setAssigneeOptions([{ value: '', label: 'Select assignee' }])
    }
  }, [lead, hasPermission, user?.role, usersService])

  React.useEffect(() => {
    void loadLead()
    void loadFollowups()
    void loadLeadQuotationsForLead()
    void loadGlobalStatusPresets()
  }, [loadFollowups, loadLead, loadLeadQuotationsForLead, loadGlobalStatusPresets])

  const pipelineSop = useMemo((): SopStatusLabel | null => {
    if (decodeCustomStatusComboValue(statusComboValue)) return null
    const v = statusComboValue as SopStatusLabel
    return SOP_STATUS_LABELS.includes(v) ? v : null
  }, [statusComboValue])

  React.useEffect(() => {
    setConversionFollowUpMessage('')
    if (pipelineSop !== 'CONVERTED') {
      setSelectedConversionQuotationId('')
      return
    }
    void loadLeadQuotationsForLead()
  }, [pipelineSop, loadLeadQuotationsForLead])

  React.useEffect(() => {
    void loadAssigneeOptions()
  }, [loadAssigneeOptions])

  React.useEffect(() => {
    void loadCampaigns()
  }, [loadCampaigns])

  /** Compliance counts: manual Schedule Follow-up rows only. */
  const followupsForCompliance = useMemo(
    () =>
      followups.filter(
        item =>
          isScheduleOnlyFollowup(item) && countsTowardComplianceFollowup(item)
      ),
    [followups]
  )

  const visibleHistoryFollowups = useMemo(
    () => followups.filter(item => !isScheduleOnlyFollowup(item)),
    [followups]
  )

  const firstFollowupLabel = useMemo(() => {
    if (!visibleHistoryFollowups.length) return 'N/A'
    const first = [...visibleHistoryFollowups].reduce((earliest, item) => {
      const itemTime = resolveFollowupActionDate(item)?.getTime() || 0
      const earliestTime = resolveFollowupActionDate(earliest)?.getTime() || 0
      return itemTime < earliestTime ? item : earliest
    })
    const label = formatFollowupDisplay(first)
    return label && label !== 'No date' ? label : 'N/A'
  }, [visibleHistoryFollowups, resolveFollowupActionDate, formatFollowupDisplay])

  const visibleScheduledFollowups = useMemo(
    () => followups.filter(item => isScheduleOnlyFollowup(item)),
    [followups]
  )

  const latestScheduleForWorkflow = useMemo(() => {
    const rows = followups.filter(f => isScheduleOnlyFollowup(f))
    if (!rows.length) return null
    return [...rows].sort((a, b) => {
      const ca = followupSortKey(a)
      const cb = followupSortKey(b)
      return cb - ca
    })[0]
  }, [followups])

  const compliance = useMemo(() => {
    const summary = {
      total: followupsForCompliance.length,
      calls: 0,
      whatsapp: 0,
      finalReminders: 0
    }
    followupsForCompliance.forEach(item => {
      const type = String(item?.followupType || '').toUpperCase()
      if (type === 'CALL') summary.calls += 1
      if (type === 'WHATSAPP') summary.whatsapp += 1
      if (type === 'FINAL_REMINDER') summary.finalReminders += 1
    })
    return summary
  }, [followupsForCompliance])

  const statusOptions = useMemo(() => {
    const base = SOP_STATUS_LABELS.map(label => ({
      value: label,
      label: toStatusLabelText(label)
    }))
    const sopTokenSet = new Set(
      SOP_STATUS_LABELS.map(l =>
        normalizeStatusToken(l)
      ).filter(Boolean)
    )
    const uniquePresets = [
      ...new Set(
        globalStatusPresets.map(s => String(s).trim()).filter(Boolean)
      )
    ].filter(
      txt =>
        !sopTokenSet.has(normalizeStatusToken(txt))
    )
    const presetRows = [...uniquePresets]
      .sort((a, b) => a.localeCompare(b))
      .map(txt => ({
        value: encodeCustomStatusComboValue(txt),
        label: txt
      }))
    const usedLower = new Set(presetRows.map(r => r.label.toLowerCase()))
    const extraLeadOnly: Array<{ value: string; label: string }> = []
    if (isEncodedCustomStatusValue(statusComboValue)) {
      const lone = decodeCustomStatusComboValue(statusComboValue)?.trim()
      if (
        lone &&
        !usedLower.has(lone.toLowerCase()) &&
        !sopTokenSet.has(normalizeStatusToken(lone))
      ) {
        usedLower.add(lone.toLowerCase())
        extraLeadOnly.push({
          value: statusComboValue,
          label: lone
        })
      }
    }
    return [...extraLeadOnly, ...presetRows, ...base]
  }, [statusComboValue, globalStatusPresets])

  const eligibleConversionQuotations = useMemo(
    () =>
      sentQuotations.filter(
        q =>
          ['SENT', 'VIEWED', 'APPROVED'].includes(q.status) &&
          !(q.requiresApproval && ['SENT', 'VIEWED'].includes(q.status))
      ),
    [sentQuotations]
  )

  const conversionQuotationDropdownOptions = useMemo(() => {
    const placeholder = {
      value: '',
      label: 'Select quotation',
      searchText:
        'select quotation quote search pick choose sent viewed approved'
    }
    const rows = eligibleConversionQuotations.map(q => {
      const sentLabel = q.sentAt
        ? formatDate(q.sentAt, '')
        : ''
      const amountLabel =
        q.totalSaleValue > 0
          ? new Intl.NumberFormat(undefined, {
              style: 'currency',
              currency: /^[A-Z]{3}$/.test(q.clientCurrency)
                ? q.clientCurrency
                : 'INR',
              maximumFractionDigits: 0
            }).format(q.totalSaleValue)
          : '—'
      const num = q.quoteNumber || q.id.slice(0, 8)
      const subParts = [
        q.status,
        sentLabel ? `Sent ${sentLabel}` : null,
        q.tripDestination
      ].filter(Boolean)
      return {
        value: q.id,
        label: `${num} · ${q.status} · ${amountLabel}`,
        selectedLabel: `${num} — ${amountLabel}`,
        searchText: `${num} ${q.status} ${
          q.tripDestination ?? ''
        } ${sentLabel} ${amountLabel} ${q.id}`.trim(),
        leftLabel: num,
        rightLabel: amountLabel,
        rightSubLabel: subParts.join(' · ')
      }
    })
    return [placeholder, ...rows]
  }, [eligibleConversionQuotations, formatDate])

  const selectedLeadQuotation = useMemo(
    () => leadQuotations.find(item => item.id === selectedLeadQuotationId) ?? null,
    [leadQuotations, selectedLeadQuotationId]
  )

  const leadQuotationDropdownOptions = useMemo(() => {
    const placeholder = {
      value: '',
      label: 'Select quotation',
      searchText: 'select quotation quote search draft sent viewed approved'
    }

    const rows = leadQuotations.map(q => {
      const sentLabel = q.sentAt ? formatDate(q.sentAt, '') : 'Not sent'
      const amountLabel =
        q.totalSaleValue > 0
          ? new Intl.NumberFormat(undefined, {
              style: 'currency',
              currency: /^[A-Z]{3}$/.test(q.clientCurrency)
                ? q.clientCurrency
                : 'INR',
              maximumFractionDigits: 0
            }).format(q.totalSaleValue)
          : '—'

      const num = q.quoteNumber || q.id.slice(0, 8)
      return {
        value: q.id,
        label: `${num} · ${q.status} · ${amountLabel}`,
        selectedLabel: `${num} — ${q.status}`,
        searchText: `${num} ${q.status} ${q.tripDestination ?? ''} ${sentLabel} ${amountLabel}`.trim(),
        leftLabel: num,
        rightLabel: q.status,
        rightSubLabel: sentLabel
      }
    })

    return [placeholder, ...rows]
  }, [leadQuotations, formatDate])

  const currencyOptions = useMemo(
    () =>
      withSelectedDropdownValue(
        getCurrencyOptions(false),
        qualification.clientCurrency
      ),
    [qualification.clientCurrency]
  )

  const visaOptions = useMemo(
    () => [
      { value: '', label: 'Visa Required' },
      { value: 'YES', label: 'Yes' },
      { value: 'NO', label: 'No' }
    ],
    []
  )

  const leadTypeOptions = useMemo(
    () =>
      withSelectedDropdownValue(
        [
          { value: 'HOLIDAY', label: 'Holidays' },
          { value: 'VISA', label: 'Visa' }
        ],
        qualification.leadType
      ),
    [qualification.leadType]
  )

  const hotelCategoryOptions = useMemo(
    () =>
      withSelectedDropdownValue(
        [
          { value: '', label: 'Select hotel category' },
          { value: '3_STAR', label: '3 Star' },
          { value: '4_STAR', label: '4 Star' },
          { value: '5_STAR', label: '5 Star' },
          { value: 'ANY', label: 'Any' }
        ],
        qualification.preferredHotelCategory
      ),
    [qualification.preferredHotelCategory]
  )

  const travelPurposeOptions = useMemo(
    () =>
      withSelectedDropdownValue(
        [
          { value: '', label: 'Select purpose' },
          { value: 'LEISURE', label: 'Leisure' },
          { value: 'BUSINESS', label: 'Business' },
          { value: 'HONEYMOON', label: 'Honeymoon' },
          { value: 'FAMILY', label: 'Family' },
          { value: 'ADVENTURE', label: 'Adventure' }
        ],
        qualification.travelPurpose
      ),
    [qualification.travelPurpose]
  )

  const leadSourceOptions = useMemo(
    () =>
      withSelectedDropdownValue(
        [
          { value: 'Website', label: 'Website' },
          { value: 'Phone', label: 'Phone' },
          { value: 'Referral', label: 'Referral' },
          { value: 'Social', label: 'Social' },
          { value: 'WalkIn', label: 'WalkIn' }
        ],
        qualification.leadSource
      ),
    [qualification.leadSource]
  )

  const campaignOptions = useMemo(
    () => {
      const selectedCountry = normalizeCampaignCountry(qualification.leadCountry)
      const selectedCampaignId = String(qualification.campaignId || '').trim()
      const allCampaigns = campaigns
        .map(campaign => ({
          ...campaign,
          normalizedCountry: normalizeCampaignCountry(campaign.country)
        }))
        .sort((left, right) => {
          const leftMatches = left.normalizedCountry === selectedCountry ? 1 : 0
          const rightMatches = right.normalizedCountry === selectedCountry ? 1 : 0
          if (leftMatches !== rightMatches) return rightMatches - leftMatches
          return String(left.name ?? left.title ?? left.id).localeCompare(
            String(right.name ?? right.title ?? right.id)
          )
        })

      const visibleCampaigns = allCampaigns.filter(
        campaign =>
          !qualification.leadCountry ||
          campaign.normalizedCountry === selectedCountry ||
          String(campaign.id) === selectedCampaignId
      )

      const fallbackCampaigns =
        visibleCampaigns.length > 0 ? visibleCampaigns : allCampaigns

      const placeholder = qualification.leadCountry
        ? `Select ${selectedCountry} campaign (optional)`
        : 'Select campaign (optional)'

      return [
        { value: '', label: placeholder },
        ...fallbackCampaigns.map(campaign => ({
          value: String(campaign.id),
          label: `[${campaign.normalizedCountry}] ${String(
            campaign.name ?? campaign.title ?? campaign.id
          )}`
        }))
      ]
    },
    [campaigns, qualification.campaignId, qualification.leadCountry]
  )

  const customFieldEntries = useMemo(() => {
    type CustomFieldRow = {
      key: string
      label: string
      value: string
      displayLabel: string
      displayValue: string
    }

    const rows: CustomFieldRow[] = []

    const pushRow = (key: string, displayLabel: string, val: unknown) => {
      const rawValue =
        val === null || val === undefined ? '' : String(val).trim()
      if (!rawValue) return
      const displayValue =
        rawValue && looksLikeSnakeCaseToken(rawValue)
          ? humanizeSnakeCase(rawValue)
          : rawValue
      rows.push({
        key,
        label: displayLabel,
        value: rawValue,
        displayLabel,
        displayValue,
      })
    }

    if (lead) {
      const l = lead as Record<string, unknown>
      pushRow('__crm_city', 'City', l.city ?? l.city_name)
    }

    const raw = lead?.dynamicFields ?? lead?.dynamic_fields ?? null
    const labelsRaw =
      lead?.dynamicFieldLabels ?? lead?.dynamic_field_labels ?? null
    const labels =
      labelsRaw && typeof labelsRaw === 'object' && !Array.isArray(labelsRaw)
        ? (labelsRaw as Record<string, unknown>)
        : {}

    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      const obj = raw as Record<string, unknown>
      for (const key of Object.keys(obj).sort((a, b) => a.localeCompare(b))) {
        const labelValue = labels[key]
        const rawLabel =
          typeof labelValue === 'string' && labelValue.trim()
            ? labelValue.trim()
            : ''
        const normalizedKey = key.replace(/\s+/g, '_').toLowerCase()
        const labelMatchesKey =
          !rawLabel ||
          rawLabel.replace(/\s+/g, '_').toLowerCase() === normalizedKey
        const displayLabel = labelMatchesKey ? humanizeSnakeCase(key) : rawLabel

        const value = obj[key]
        const rawValue =
          value === null || value === undefined ? '' : String(value).trim()
        if (!rawValue) continue
        const displayValue =
          rawValue && looksLikeSnakeCaseToken(rawValue)
            ? humanizeSnakeCase(rawValue)
            : rawValue

        rows.push({
          key,
          label: displayLabel,
          value: rawValue,
          displayLabel,
          displayValue,
        })
      }
    }

    return rows
  }, [lead])

  const countryOptions = useMemo(
    () =>
      withSelectedDropdownValue(
        [
          { value: '', label: 'Select country' },
          ...Country.getAllCountries()
            .map(country => String(country.name || '').trim())
            .filter(Boolean)
            .sort((a, b) => a.localeCompare(b))
            .map(name => ({
              value: name,
              label: name
            }))
        ],
        qualification.leadCountry
      ),
    [qualification.leadCountry]
  )

  const nationalityOptions = useMemo(
    () =>
      withSelectedDropdownValue(
        getNationalityOptions(),
        qualification.nationality
      ),
    [qualification.nationality]
  )

  const isCallsDisabled =
    lead?.callsDisabled || lead?.calls_disabled || callsButtonDisabled

  const followupTypeOptions = useMemo(() => {
    const all = [
      { value: 'CALL', label: 'Call' },
      { value: 'WHATSAPP', label: 'WhatsApp' },
      { value: 'EMAIL', label: 'Email' },
      { value: 'FINAL_REMINDER', label: 'Final Reminder' }
    ]
    if (isCallsDisabled) {
      return all.filter(opt => opt.value !== 'CALL')
    }
    return all
  }, [isCallsDisabled])

  const workflowFollowupTypeOptions = useMemo(() => {
    if (pipelineSop === null) {
      return []
    }
    if (pipelineSop === 'FINAL_REMINDER') {
      return [{ value: 'FINAL_REMINDER', label: 'Final Reminder' }]
    }

    const options = [
      { value: 'CALL', label: 'Call' },
      { value: 'WHATSAPP', label: 'WhatsApp' }
    ]

    if (isCallsDisabled) {
      return options.filter(option => option.value !== 'CALL')
    }

    return options
  }, [isCallsDisabled, pipelineSop])

  const leadTemperatureOptions = useMemo(
    () => [
      { value: 'HOT', label: 'Hot lead', rightLabel: 'Ready now' },
      { value: 'WARM', label: 'Warm lead', rightLabel: 'Interested' },
      { value: 'COLD', label: 'Cold lead', rightLabel: 'Early query' }
    ],
    []
  )

  const selectedWorkflowFollowupType =
    pipelineSop === 'FINAL_REMINDER'
      ? 'FINAL_REMINDER'
      : workflowFollowupType

  React.useEffect(() => {
    if (pipelineSop === null) {
      return
    }
    if (pipelineSop === 'FINAL_REMINDER') {
      setWorkflowFollowupType('FINAL_REMINDER')
      return
    }

    setWorkflowFollowupType(current => {
      if (current === 'FINAL_REMINDER') {
        return isCallsDisabled ? 'WHATSAPP' : 'CALL'
      }

      if (isCallsDisabled && current === 'CALL') {
        return 'WHATSAPP'
      }

      return current
    })
  }, [isCallsDisabled, pipelineSop])

  const qualificationMissing = useMemo(() => {
    const missing: string[] = []
    if (!qualification.leadCountry.trim()) missing.push('leadCountry')
    if (!qualification.clientCurrency.trim()) missing.push('clientCurrency')

    if (
      qualification.travelDate &&
      qualification.travelEndDate &&
      qualification.travelEndDate < qualification.travelDate
    ) {
      missing.push('travelDateRange')
    }

    if (isVisaQualification && !String(qualification.salary || '').trim()) {
      missing.push('salary')
    }
    if (isHolidayQualification && !String(qualification.budget || '').trim()) {
      missing.push('budget')
    }

    const adults = Number(qualification.adultsCount)
    const children = Number(qualification.childrenCount)
    if (
      !Number.isFinite(adults) ||
      adults < 1 ||
      !Number.isFinite(children) ||
      children < 0
    ) {
      missing.push('paxSplit')
    }

    if (
      children > 0 &&
      (childAges.length !== children ||
        childAges.some(age => {
          const numericAge = Number(age)
          return (
            age.trim() === '' ||
            !Number.isFinite(numericAge) ||
            numericAge < 0 ||
            numericAge > 18
          )
        }))
    ) {
      missing.push('childAges')
    }
    return missing
  }, [
    childAges,
    isHolidayQualification,
    isVisaQualification,
    qualification
  ])

  const isComplianceComplete =
    (isCallsDisabled || compliance.calls >= REQUIRED_COMPLIANCE.calls) &&
    compliance.whatsapp >= REQUIRED_COMPLIANCE.whatsapp &&
    compliance.finalReminders >= REQUIRED_COMPLIANCE.finalReminders

  const saveQualification = async () => {
    if (!id || !lead) return
    if (qualificationSavingRef.current) return
    qualificationSavingRef.current = true
    setQualificationSaving(true)
    setStatusError('')
    if (qualificationMissing.length) {
      setStatusError(
        `Missing required fields: ${qualificationMissing.join(', ')}`
      )
      qualificationSavingRef.current = false
      setQualificationSaving(false)
      return
    }

    try {
      const isVisaLead = isVisaQualification
      await leadsService.updateLead(id, {
        leadType: activeQualificationLeadType,
        panNumber: qualification.panNumber.trim() || undefined,
        addressLine: qualification.addressLine.trim() || undefined,
        leadCountry:
          toLeadCountryFormValue(qualification.leadCountry) || undefined,
        nationality: qualification.nationality.trim() || undefined,
        clientCurrency: qualification.clientCurrency.trim() || undefined,
        destinationName: qualification.destinationName.trim() || undefined,
        travelDate: qualification.travelDate.trim() || undefined,
        travelEndDate: qualification.travelEndDate.trim() || undefined,
        adultsCount: Number(qualification.adultsCount),
        childrenCount: Number(qualification.childrenCount),
        childAges: cleanChildAges,
        ...(isVisaLead
          ? { salary: Number(qualification.salary) }
          : { budget: Number(qualification.budget) }),
        visaRequired: qualification.visaRequired === 'YES',
        ...(isHolidayQualification && qualification.preferredHotelCategory
          ? {
              preferredHotelCategory: qualification.preferredHotelCategory
            }
          : {}),
        ...(isHolidayQualification
          ? { travelPurpose: qualification.travelPurpose.trim() || undefined }
          : {}),
        source: qualification.leadSource.trim() || undefined,
        campaignId: qualification.campaignId || undefined,
        qualificationCompleted: true
      })
      await loadLead()
      setShowSavedQualification(true)
      setTimeout(() => setShowSavedQualification(false), 2500)
    } catch (err) {
      reportApiError(err, 'Could not update qualification.', setStatusError)
    } finally {
      qualificationSavingRef.current = false
      setQualificationSaving(false)
    }
  }

  const updateStatus = async () => {
    if (!id || !lead) return
    setStatusSaving(true)
    setStatusError('')
    setConversionFollowUpMessage('')

    const customLabelTrimmed =
      decodeCustomStatusComboValue(statusComboValue)?.trim() ?? ''
    if (customLabelTrimmed) {
      try {
        await leadsService.updateLead(id, {
          customStatusLabel: customLabelTrimmed,
          temperature: leadTemperature,
          notes: statusNotes.trim() || undefined,
          activityCreatedAt: nowWallClockString(),
          activityTimezone: getBrowserTimeZone()
        })
        await Promise.all([loadLead(), loadFollowups()])
        setStatusNotes('')
        toast.success('Custom status saved. Pipeline unchanged.')
      } catch (err) {
        reportApiError(err, 'Could not save custom status.', setStatusError)
      } finally {
        setStatusSaving(false)
      }
      return
    }

    if (pipelineSop === null) {
      setStatusSaving(false)
      toast.error('Choose a standard status.')
      return
    }

    const conversion = sopLabelToCanonical(pipelineSop)

    if (conversion.canonical === 'LOST' && !closedReason.trim()) {
      setStatusSaving(false)
      toast.error('Closed reason is required for LOST.')
      return
    }

    if (conversion.canonical === 'CONVERTED') {
      if (loadingSentQuotations) {
        setStatusSaving(false)
        toast.error('Loading sent quotations… please wait.')
        return
      }
      if (!eligibleConversionQuotations.length) {
        setStatusSaving(false)
        toast.error(
          sentQuotations.length > 0
            ? 'Sent quotations need margin approval before conversion. Open the quotation and approve margin, then try again.'
            : 'No quotations have been sent to this lead yet. Send a quotation first, then convert.'
        )
        return
      }
      const picked = eligibleConversionQuotations.find(
        q => q.id === selectedConversionQuotationId
      )
      if (!selectedConversionQuotationId || !picked) {
        setStatusSaving(false)
        toast.error('Choose the accepted quotation from the dropdown before converting.')
        return
      }
    }

    try {
      await leadsService.updateLead(id, {
        temperature: leadTemperature,
        status: conversion.canonical,
        subStatus: conversion.subStatus,
        customStatusLabel: null,
        followupType: selectedWorkflowFollowupType,
        notes: statusNotes.trim() || undefined,
        activityCreatedAt: nowWallClockString(),
        activityTimezone: getBrowserTimeZone(),
        closedReason:
          conversion.canonical === 'LOST' || conversion.canonical === 'NON_RESPONSIVE'
            ? closedReason.trim() || undefined
            : undefined
      })
      console.log('Status updated successfully')

      if (
        conversion.canonical === 'CONVERTED' &&
        selectedConversionQuotationId
      ) {
        let followUp = ''

        const quoteRes = await quotationsApi.getById(
          selectedConversionQuotationId
        )
        const fullQuote = (
          quoteRes && typeof quoteRes === 'object'
            ? (quoteRes as { data?: unknown }).data ?? quoteRes
            : null
        ) as Record<string, unknown> | null

        const picked = eligibleConversionQuotations.find(
          q => q.id === selectedConversionQuotationId
        )
        const quoteStatus = String(
          fullQuote?.status ?? picked?.status ?? ''
        ).toUpperCase()

        if (fullQuote && ['SENT', 'VIEWED'].includes(quoteStatus)) {
          try {
            await quotationsApi.changeStatus(selectedConversionQuotationId, {
              status: 'APPROVED'
            })
          } catch (err) {
            reportApiError(
              err,
              'Lead was updated but the quotation could not be approved.',
              setStatusError
            )
            await loadLead()
            await loadLeadQuotationsForLead()
            return
          }
        }

        const bookListRes = await bookingsApi.list({
          quotationId: selectedConversionQuotationId,
          limit: 25
        })
        const bookings = unwrapApiArray(bookListRes) as Record<
          string,
          unknown
        >[]
        const activeBooking = bookings.find(
          b => !(b.isDeleted ?? b.is_deleted ?? false)
        )

        if (activeBooking?.id) {
          followUp = `A booking already exists for this quotation (${String(
            activeBooking.bookingNumber ??
              activeBooking.booking_number ??
              activeBooking.id
          )}).`
        } else {
          if (!fullQuote || typeof fullQuote !== 'object') {
            followUp =
              'Could not load quotation details to create a booking. Create the booking manually from Bookings.'
          } else {
            const { payload, error } = buildBookingCreatePayloadFromQuotation(
              fullQuote,
              qualification.travelDate
            )
            if (error || !payload) {
              followUp =
                error ??
                'Could not build booking from quotation. Create it manually from Bookings.'
            } else {
              try {
                const createdRes = await bookingsApi.create(payload)
                const createdRow =
                  createdRes &&
                  typeof createdRes === 'object' &&
                  'data' in createdRes
                    ? (createdRes as { data: Record<string, unknown> }).data
                    : (createdRes as Record<string, unknown> | null)
                const bn = (createdRow?.bookingNumber ??
                  createdRow?.booking_number) as string | undefined
                const bid = createdRow?.id as string | undefined
                followUp = bn
                  ? `Booking ${bn} was created from this quotation.`
                  : bid
                  ? `Booking was created (reference ${String(bid).slice(
                      0,
                      8
                    )}…).`
                  : 'Booking was created from this quotation.'
              } catch (cErr) {
                reportApiError(
                  cErr,
                  'Lead converted but booking could not be created.',
                  setStatusError
                )
                await loadLead()
                await loadLeadQuotationsForLead()
                return
              }
            }
          }
        }

        setConversionFollowUpMessage(followUp)
      }

      await Promise.all([
        loadLead(),
        loadFollowups(),
        conversion.canonical === 'CONVERTED' ? loadLeadQuotationsForLead() : Promise.resolve()
      ])
      console.log('Data reloaded after status update')
      setStatusNotes('')
      setClosedReason('')
    } catch (err) {
      reportApiError(err, 'Could not update lead status.', setStatusError)
    } finally {
      setStatusSaving(false)
    }
  }

  const scheduleFollowup = async () => {
    if (!id) return
    if (!followupDraft.followupDate) {
      toast.error('Please select follow-up date/time.')
      return
    }
    const scheduleType = String(followupDraft.followupType || 'CALL')
      .trim()
      .toUpperCase()
    if (
      scheduleType === 'CALL' &&
      !isCallsDisabled &&
      compliance.calls >= REQUIRED_COMPLIANCE.calls
    ) {
      toast.error('You have reached the call limit.')
      setFollowupScheduleError('You have reached the call limit.')
      return
    }
    if (
      scheduleType === 'WHATSAPP' &&
      compliance.whatsapp >= REQUIRED_COMPLIANCE.whatsapp
    ) {
      toast.error('You have reached the WhatsApp limit.')
      setFollowupScheduleError('You have reached the WhatsApp limit.')
      return
    }
    if (
      scheduleType === 'FINAL_REMINDER' &&
      compliance.finalReminders >= REQUIRED_COMPLIANCE.finalReminders
    ) {
      toast.error('You have reached the final reminder limit.')
      setFollowupScheduleError('You have reached the final reminder limit.')
      return
    }
    setFollowupSaving(true)
    setFollowupScheduleError('')
    setFollowupScheduleOk('')
    try {
      const wall = wallClockFromDatetimeLocal(followupDraft.followupDate)
      const createdAtTime = nowWallClockString()
      const timezone = getBrowserTimeZone()
      
      console.log('Scheduling followup with createdAt:', createdAtTime, 'timezone:', timezone)
      
      await leadsService.addFollowup(id, {
        followupType: followupDraft.followupType,
        followupLocalAt: wall,
        cadenceCode: followupDraft.cadenceCode || undefined,
        notes: followupDraft.notes || undefined,
        clientTimezone: timezone,
        activityCreatedAt: createdAtTime,
        activityTimezone: timezone
      })
      setFollowupDraft({
        followupType: 'CALL',
        followupDate: '',
        cadenceCode: '',
        notes: ''
      })
      await Promise.all([loadLead(), loadFollowups()])
      toast.success('Follow-up scheduled successfully.')
      setFollowupScheduleOk('Saved. Shown under Scheduled Follow-ups.')
      window.setTimeout(() => setFollowupScheduleOk(''), 6000)
    } catch (err) {
      reportApiError(err, 'Could not schedule follow-up.', setFollowupScheduleError)
    } finally {
      setFollowupSaving(false)
    }
  }

  const currentRoleToken = String(user?.role ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
  const canAssignLead =
    hasPermission('leads:update') && !VIEW_ONLY_MANAGER_ROLES.has(currentRoleToken)
  const canReadQuotations = hasPermission('quotations:read')
  const canCreateQuotation = hasPermission('quotations:create')
  const canUpdateQuotation = hasPermission('quotations:update')

  const sendQuotationFromLead = async (channel: 'EMAIL' | 'WHATSAPP') => {
    if (!selectedLeadQuotation) {
      setQuotationActionMessage('')
      setQuotationActionError('Select a quotation first.')
      return
    }

    const recipientEmail = String(lead?.email ?? '').trim()
    const recipientPhone = String(lead?.phone ?? '').trim()

    if (channel === 'EMAIL' && !recipientEmail) {
      setQuotationActionMessage('')
      setQuotationActionError('Lead email is missing. Cannot send quotation by email.')
      return
    }

    if (channel === 'WHATSAPP' && !recipientPhone) {
      setQuotationActionMessage('')
      setQuotationActionError('Lead phone is missing. Cannot send quotation by WhatsApp.')
      return
    }

    setQuotationActionLoadingKey(`${selectedLeadQuotation.id}:${channel}`)
    setQuotationActionError('')
    setQuotationActionMessage('')

    try {
      // Build PDF from template and upload, same as QuotationDetailPage flow.
      const quoteRes = await quotationsApi.getById(selectedLeadQuotation.id)
      const quotePayload: any = (quoteRes as any)?.data?.data ?? (quoteRes as any)?.data ?? quoteRes

      const safeDateOnly = (value?: string | null) => {
        if (!value) return 'N/A'
        const d = new Date(value)
        if (Number.isNaN(d.getTime())) return String(value)
        return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
      }

      const itineraryItems: any[] =
        quotePayload?.itineraryItems ??
        quotePayload?.itinerary ??
        quotePayload?.snapshot?.itinerary ??
        quotePayload?.templateSnapshot?.itinerary ??
        []

      const pdfData = {
        packageName:
          quotePayload?.packageName ??
          quotePayload?.quotationTitle ??
          quotePayload?.title ??
          quotePayload?.templateName ??
          'Package',
        email: recipientEmail || '',
        leadId:
          lead?.leadCode ??
          lead?.leadId ??
          lead?.id ??
          quotePayload?.lead?.leadCode ??
          quotePayload?.lead?.leadId ??
          quotePayload?.leadId ??
          selectedLeadQuotation.id,
        guestName: lead?.fullName ?? lead?.name ?? 'Guest',
        guestEmail: recipientEmail || '',
        nights: Number(quotePayload?.durationNights ?? quotePayload?.nights ?? 1) || 1,
        adults: Number(lead?.adultsCount ?? lead?.adults_count ?? 2) || 2,
        children: Number(lead?.childrenCount ?? lead?.children_count ?? 0) || 0,
        travelDate: safeDateOnly(lead?.travelDate ?? lead?.travel_date ?? quotePayload?.travelDate ?? null),
        validUntil: safeDateOnly(quotePayload?.validUntil ?? quotePayload?.valid_until ?? null),
        currency: String(
          quotePayload?.clientCurrency ??
            quotePayload?.client_currency ??
            quotePayload?.snapshot?.currency ??
            quotePayload?.snapshot?.pricing?.clientCurrency ??
            quotePayload?.snapshot?.pricing?.costCurrency ??
            quotePayload?.pricing?.clientCurrency ??
            quotePayload?.pricing?.costCurrency ??
            lead?.clientCurrency ??
            lead?.client_currency ??
            'INR',
        ).toUpperCase(),
        total: String(
          quotePayload?.total ??
            quotePayload?.totalPrice ??
            quotePayload?.snapshot?.pricing?.total ??
            quotePayload?.pricing?.total ??
            '0',
        ),
        totalSellValue: String(
          quotePayload?.totalSellValue ??
            quotePayload?.totalSaleValue ??
            quotePayload?.snapshot?.commercial?.finalAmount ??
            '',
        ),
        itinerary: Array.isArray(itineraryItems)
          ? itineraryItems.map((item: any) => ({
              title: item?.day && item?.title ? `${item.day}: ${item.title}` : item?.title || item?.day || 'Day',
              points: item?.description ? [String(item.description)] : [],
            }))
          : [],
        destination:
          lead?.destinationName ??
          lead?.travelTo ??
          lead?.destination ??
          quotePayload?.destinationName ??
          quotePayload?.travelTo ??
          'N/A',
        quotationTitle: String(quotePayload?.quotationTitle ?? quotePayload?.title ?? ''),
        templateName: String(quotePayload?.templateName ?? ''),
        packageType: String(quotePayload?.packageType ?? quotePayload?.packageKind ?? 'Standard Package'),
        inclusions: String(quotePayload?.inclusions ?? quotePayload?.contentTemplate?.inclusions ?? ''),
        exclusions: String(quotePayload?.exclusions ?? quotePayload?.contentTemplate?.exclusions ?? ''),
        headerBranding: String(quotePayload?.headerBranding ?? quotePayload?.contentTemplate?.headerBranding ?? ''),
        paymentTerms: String(quotePayload?.paymentTerms ?? quotePayload?.contentTemplate?.paymentTerms ?? ''),
        cancellationPolicy: String(
          quotePayload?.cancellationPolicy ?? quotePayload?.contentTemplate?.cancellationPolicy ?? '',
        ),
        footerDisclaimer: String(
          quotePayload?.footerDisclaimer ?? quotePayload?.contentTemplate?.footerDisclaimer ?? '',
        ),
        hotelDetails: String(quotePayload?.hotelDetails ?? quotePayload?.contentTemplate?.hotelDetails ?? ''),
        quoteReference: String(quotePayload?.quoteNumber ?? quotePayload?.id ?? selectedLeadQuotation.id),
        quotationStatus: String(quotePayload?.status ?? ''),
        supplierName: String(quotePayload?.createdByUser?.fullName ?? quotePayload?.createdBy ?? ''),
        enabledServices: String(quotePayload?.enabledServices ?? ''),
      }

      setQuotationPdfData(pdfData)

      if (!pdfTemplateRef.current) {
        throw new Error('PDF template not ready')
      }

      const element = pdfTemplateRef.current
      element.style.display = 'block'
      element.style.position = 'fixed'
      element.style.top = '-9999px'
      element.style.left = '-9999px'
      element.style.width = '794px'
      element.style.zIndex = '-9999'

      await new Promise(resolve => setTimeout(resolve, 500))

      const html2canvasModule = await import(
        'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/+esm'
      )
      const html2canvas = (html2canvasModule as any).default
      const jsPdfModule = await import('https://cdn.jsdelivr.net/npm/jspdf@2.5.1/+esm')
      const JsPDF = (jsPdfModule as any).default

      const pdf = new JsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const pages = Array.from(element.querySelectorAll('.pdf-page')) as HTMLElement[]
      const targets = pages.length ? pages : [element]
      const pageWidth = pdf.internal.pageSize.getWidth()
      const margin = 10
      const availableWidth = pageWidth - margin * 2

      for (let idx = 0; idx < targets.length; idx += 1) {
        const node = targets[idx]
        const canvas = await html2canvas(node, {
          scale: 1.25,
          useCORS: true,
          backgroundColor: '#ffffff',
          allowTaint: true,
          letterRendering: true,
        })
        const imgData = canvas.toDataURL('image/jpeg', 0.78)
        const imgWidth = availableWidth
        const imgHeight = (canvas.height * imgWidth) / canvas.width
        if (idx > 0) pdf.addPage()
        pdf.addImage(imgData, 'JPEG', margin, margin, imgWidth, imgHeight)
      }

      const pdfBlob = pdf.output('blob')
      const formData = new FormData()
      formData.append('quotationId', selectedLeadQuotation.id)
      formData.append('pdf', pdfBlob, `quotation-${pdfData.quoteReference || selectedLeadQuotation.id}.pdf`)
      const uploadData: any = await quotationsApi.uploadPdf(
        selectedLeadQuotation.id,
        formData
      )
      const pdfUrl = uploadData?.data?.pdfUrl ?? uploadData?.pdfUrl

      await quotationsApi.send(selectedLeadQuotation.id, {
        channel,
        ...(channel === 'EMAIL'
          ? { recipientEmail }
          : { recipientPhone }),
        ...(pdfUrl ? { pdfUrl } : {}),
      })

      setQuotationActionMessage(
        `Quotation ${selectedLeadQuotation.quoteNumber || selectedLeadQuotation.id} sent via ${
          channel === 'EMAIL' ? 'email' : 'WhatsApp'
        }.`
      )
      await loadLead()
      await loadLeadQuotationsForLead()
    } catch (error) {
      reportApiError(error, 'Failed to send quotation.', setQuotationActionError)
    } finally {
      if (pdfTemplateRef.current) {
        pdfTemplateRef.current.style.display = 'none'
        pdfTemplateRef.current.style.position = 'absolute'
        pdfTemplateRef.current.style.top = '-9999px'
      }
      setQuotationActionLoadingKey('')
    }
  }

  const handleDisableCalls = async () => {
    if (!id) return
    const newState = !isCallsDisabled
    try {
      await leadsService.disableCalls(id, newState, {
        activityCreatedAt: nowWallClockString(),
        activityTimezone: getBrowserTimeZone()
      })
      setShowDisablePopup(true)
      window.setTimeout(() => setShowDisablePopup(false), 2500)
      await loadLead()
    } catch (err) {
      setShowDisablePopup(false)
      reportApiError(err, 'Could not update call preference.')
    }
  }

  const assignLeadNow = async () => {
    if (!id || !selectedAssigneeId) return
    setAssigning(true)
    try {
      await leadsService.assignLead(id, {
        assignedTo: selectedAssigneeId,
        force: true,
        activityCreatedAt: nowWallClockString(),
        activityTimezone: getBrowserTimeZone()
      })
      await Promise.all([loadLead(), loadFollowups()])
      setSelectedAssigneeId('')
      const assignedName = assigneeOptions.find(o => o.value === selectedAssigneeId)?.label ?? 'Agent'
      toast.success(`Lead assigned to ${assignedName}`)
    } catch (err) {
      reportApiError(err, 'Unable to assign lead.')
    } finally {
      setAssigning(false)
    }
  }

  return (
    <div className='space-y-6'>
      {showCustomFields ? (
        <div
          className='fixed inset-0 z-[70] flex items-end justify-center bg-black/40 p-4 sm:items-center'
          role='dialog'
          aria-modal='true'
          onClick={() => setShowCustomFields(false)}
        >
          <div
            className='w-full max-w-3xl min-w-0 rounded-2xl bg-white p-4 shadow-xl dark:bg-gray-900 sm:p-5'
            onClick={e => e.stopPropagation()}
          >
            <div className='flex items-start justify-between gap-3'>
              <div className='min-w-0'>
                <p className='text-sm font-semibold text-gray-900 dark:text-gray-100'>
                  Custom Fields
                </p>
                <p className='text-xs text-gray-500'>
                  {customFieldEntries.length} field(s)
                </p>
              </div>
              <button
                type='button'
                onClick={() => setShowCustomFields(false)}
                className='rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-800 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800'
              >
                Close
              </button>
            </div>

            <div className='mt-3 max-h-[65vh] min-w-0 overflow-auto rounded-xl border border-gray-200 dark:border-gray-700'>
              {customFieldEntries.length === 0 ? (
                <div className='p-4 text-sm text-gray-500'>
                  No custom fields on this lead.
                </div>
              ) : (
                <div className='divide-y divide-gray-100 dark:divide-gray-800'>
                  {customFieldEntries.map((item, index) => (
                    <div
                      key={item.key}
                      className='min-w-0 space-y-2 p-3 sm:p-4'
                    >
                      <div className='min-w-0 text-xs font-semibold leading-snug text-gray-700 [overflow-wrap:anywhere] break-words dark:text-gray-200'>
                        {item.displayLabel}
                      </div>
                      <div
                        className={`min-w-0 rounded-xl px-3 py-2.5 text-sm font-medium leading-relaxed shadow-sm [overflow-wrap:anywhere] break-words whitespace-pre-wrap ${CUSTOM_FIELD_ANSWER_SURFACE[index % CUSTOM_FIELD_ANSWER_SURFACE.length]}`}
                      >
                        {item.displayValue}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
      <div
        ref={pdfTemplateRef}
        style={{ display: 'none', position: 'absolute', top: '-9999px' }}
      >
        {quotationPdfData ? <PdfTemplate data={quotationPdfData} /> : null}
      </div>
      <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
        <div className='flex items-center gap-3 min-w-0'>
          <button
            onClick={() => navigate('/leads')}
            className='inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800'
          >
            <FaArrowLeft className='text-sm' />
          </button>
          <div className='min-w-0'>
            <h1 className='text-2xl font-bold text-gray-900 dark:text-gray-100'>
              Lead Details
            </h1>
            <p className='text-sm text-gray-500'>
              SOP workflow with compliance and SLA tracking.
            </p>
          </div>
        </div>
        {lead && id ? (
          <div className='flex flex-wrap items-center gap-2 shrink-0'>
            <label className='sr-only' htmlFor='wa-line-quick'>
              WhatsApp business line
            </label>
            <select
              id='wa-line-quick'
              value={waQuickLine}
              onChange={e =>
                setWaQuickLine(e.target.value as 'all' | 'in' | 'uae')
              }
              className='rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs font-medium text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200'
            >
              <option value='all'>WA: All numbers</option>
              <option value='in'>WA: India</option>
              <option value='uae'>WA: UAE</option>
            </select>
            <button
              type='button'
              onClick={() =>
                navigate(
                  `/whatsapp?leadId=${encodeURIComponent(id)}&region=${encodeURIComponent(waQuickLine)}`
                )
              }
              className='inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700'
            >
              <FaWhatsapp className='text-sm' />
              WhatsApp
            </button>
           
            {lead.email && String(lead.email).includes('@') ? (
              <a
                href={`mailto:${String(lead.email).trim()}?subject=${encodeURIComponent(`Lead ${String(lead.leadCode ?? lead.lead_code ?? id)}`)}`}
                className='inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-800 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800'
              >
                <FaEnvelope className='text-sm text-blue-600' />
                Email
              </a>
            ) : (
              <span
                className='inline-flex cursor-not-allowed items-center gap-1.5 rounded-lg border border-dashed border-gray-200 px-3 py-1.5 text-xs text-gray-400 dark:border-gray-700'
                title='No email on lead'
              >
                <FaEnvelope className='text-sm' />
                Email
              </span>
            )}
             <button
              type='button'
              onClick={() => setShowCustomFields(true)}
              className='inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-800 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800'
              title='View custom form fields'
            >
              <FaListUl className='text-sm text-gray-500' />
              Custom Fields
              {customFieldEntries.length ? (
                <span className='ml-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'>
                  {customFieldEntries.length}
                </span>
              ) : null}
            </button>
          </div>
        ) : null}
      </div>

      {error ? (
        <div className='rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-200'>
          {error}
        </div>
      ) : null}
      {statusError ? (
        <div className='rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-200'>
          {statusError}
        </div>
      ) : null}
      {conversionFollowUpMessage ? (
        <div className='rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-900/25 dark:text-emerald-100'>
          {conversionFollowUpMessage}
        </div>
      ) : null}

      <div className='grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr]'>
        <SurfaceCard>
          {loading ? (
            <p className='text-sm text-gray-500'>Loading lead...</p>
          ) : !lead ? (
            <p className='text-sm text-gray-500'>Lead not found.</p>
          ) : (
            <div className='space-y-4'>
              <div className='flex items-start justify-between'>
                <div>
                  <h2 className='text-xl font-semibold text-gray-900 dark:text-gray-100'>
                    {lead.fullName || lead.name || 'Lead'}
                  </h2>
                  <p className='mt-0.5 text-xs font-medium text-gray-600 dark:text-gray-300'>
                    Lead code:{' '}
                    <span className='font-mono text-gray-900 dark:text-gray-100'>
                      {String(lead.leadCode ?? lead.lead_code ?? '—')}
                    </span>
                  </p>
                  <p className='text-sm text-gray-500'>
                    {lead.email || 'N/A'} | {lead.phone || 'N/A'}
                  </p>
                  {lead.leadCountry || lead.country ? (
                    <p className='mt-0.5 text-xs font-medium text-blue-600 dark:text-blue-400'>
                      {lead.leadCountry || lead.country}
                    </p>
                  ) : null}
                  <p className='mt-0.5 text-xs font-medium text-gray-600 dark:text-gray-300'>
                    Assigned To:{' '}
                    <span className='text-gray-900 dark:text-gray-100'>
                      {assignedLeadAgentName || 'Unassigned'}
                    </span>
                  </p>
                  {assignedByName ? (
                    <p className='mt-0.5 text-xs font-medium text-gray-600 dark:text-gray-300'>
                      Assigned By:{' '}
                      <span className='text-gray-900 dark:text-gray-100'>
                        {assignedByName}
                      </span>
                    </p>
                  ) : null}
                  {lead.nationality ? (
                    <p className='mt-0.5 text-xs font-medium text-blue-600 dark:text-blue-400'>
                      Nationality: {lead.nationality}
                    </p>
                  ) : null}
                </div>
                <StatusBadge
                  status={resolveLeadDisplayedStatus({
                    customStatusLabel:
                      lead.customStatusLabel ?? lead.custom_status_label,
                    canonicalStatus: lead.status,
                    subStatus: lead.subStatus,
                    providedStatusLabel: lead.statusLabel
                  })}
                />
              </div>

              <div className='rounded-xl border border-gray-200 p-3 text-sm dark:border-gray-700'>
                <p className='font-medium text-gray-900 dark:text-gray-100'>
                  SLA
                </p>
                
                <p
                  className={
                    lead.slaBreached
                      ? 'text-red-600'
                      : 'text-gray-600 dark:text-gray-300'
                  }
                >
                  {lead.slaBreached
                    ? 'First response was late (15-minute target missed)'
                    : 'Within 15-minute first-contact target'}
                </p>
              
                 <p className='mt-1 text-xs text-gray-500 dark:text-gray-400'>
                  Date of creation: {createdAtLabel}
                </p>
               
                <p className='mt-1 text-xs text-gray-500 dark:text-gray-400'>
                  First follow-up: {firstFollowupLabel}
                </p>
                {lead.responseDeadline ? (
                  <p className='mt-1 text-xs text-gray-500 dark:text-gray-400'>
                    First-contact deadline:{' '}
                    {firstContactDeadlineFromCreationLabel ||
                      formatDateTime(lead.responseDeadline, String(lead.responseDeadline), leadTimeZone) ||
                      String(lead.responseDeadline)}
                  </p>
                ) : null}
              </div>

              <div className='rounded-xl border border-gray-200 p-3 text-sm dark:border-gray-700'>
                <p className='font-medium text-gray-900 dark:text-gray-100'>
                  Finance Capture
                </p>
                <p className='mt-1 text-xs text-gray-500 dark:text-gray-400'>
                  PAN is optional at lead stage. Capture it later after payment
                  or finance onboarding.
                </p>
                <div className='mt-2 grid grid-cols-1 gap-2 md:grid-cols-3'>
                  <p className='text-xs text-gray-600 dark:text-gray-300'>
                    PAN:{' '}
                    <span className='font-semibold'>
                      {qualification.panNumber || 'Not captured'}
                    </span>
                  </p>
                  <p className='text-xs text-gray-600 dark:text-gray-300'>
                    Client Currency:{' '}
                    <span className='font-semibold'>
                      {qualification.clientCurrency || 'Not captured'}
                    </span>
                  </p>
                  <p className='text-xs text-gray-600 dark:text-gray-300 md:col-span-3'>
                    Address:{' '}
                    <span className='font-semibold'>
                      {qualification.addressLine || 'Not captured'}
                    </span>
                  </p>
                </div>
              </div>

              <div className='rounded-xl border border-gray-200 p-3 dark:border-gray-700'>
                <p className='font-medium text-gray-900 dark:text-gray-100'>
                  Qualification Capture
                </p>
                <div className='mt-3 grid grid-cols-1 gap-2 md:grid-cols-2'>
                  <div>
                    <label className='field-label'>Lead Type</label>
                    <SearchableDropdown
                      value={qualification.leadType}
                      options={leadTypeOptions}
                      searchPlaceholder='Search lead type...'
                      onChange={value => {
                        const nextType = value as 'HOLIDAY' | 'VISA' | ''
                        setQualification(prev => ({
                          ...prev,
                          leadType: nextType,
                          ...(nextType === 'VISA'
                            ? {
                                preferredHotelCategory: '',
                                travelPurpose: ''
                              }
                            : { salary: '' })
                        }))
                      }}
                    />
                  </div>
                  <div>
                    <label className='field-label'>PAN Number (optional)</label>
                    <input
                      className='field-input'
                      placeholder='ABCDE1234F'
                      value={qualification.panNumber}
                      onChange={event =>
                        setQualification(prev => ({
                          ...prev,
                          panNumber: event.target.value.toUpperCase()
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className='field-label'>Lead Country</label>
                    <SearchableDropdown
                      value={qualification.leadCountry}
                      options={countryOptions}
                      searchPlaceholder='Search country...'
                      onChange={value =>
                        setQualification(prev => ({
                          ...prev,
                          leadCountry: value
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className='field-label'>Nationality</label>
                    <SearchableDropdown
                      value={qualification.nationality}
                      options={nationalityOptions}
                      searchPlaceholder='Search nationality...'
                      onChange={value =>
                        setQualification(prev => ({
                          ...prev,
                          nationality: value
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className='field-label'>Client Currency</label>
                    <SearchableDropdown
                      value={qualification.clientCurrency}
                      options={currencyOptions}
                      searchPlaceholder='Search currency...'
                      onChange={value =>
                        setQualification(prev => ({
                          ...prev,
                          clientCurrency: value
                        }))
                      }
                    />
                  </div>
                  <div className='md:col-span-2'>
                    <label className='field-label'>Address / Location</label>
                    <textarea
                      className='field-input'
                      rows={2}
                      placeholder='Enter address or location'
                      value={qualification.addressLine}
                      onChange={event =>
                        setQualification(prev => ({
                          ...prev,
                          addressLine: event.target.value
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className='field-label'>Destination</label>
                    <input
                      className='field-input'
                      placeholder='Enter destination'
                      value={qualification.destinationName}
                      onChange={event =>
                        setQualification(prev => ({
                          ...prev,
                          destinationName: event.target.value
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className='field-label'>Travel Start Date</label>
                    <input
                      type='date'
                      className='field-input'
                      value={qualification.travelDate}
                      onChange={event =>
                        setQualification(prev => ({
                          ...prev,
                          travelDate: event.target.value
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className='field-label'>Travel End Date</label>
                    <input
                      type='date'
                      min={qualification.travelDate || undefined}
                      className='field-input'
                      value={qualification.travelEndDate}
                      onChange={event =>
                        setQualification(prev => ({
                          ...prev,
                          travelEndDate: event.target.value
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className='field-label'>Adults</label>
                    <input
                      type='number'
                      min={1}
                      className='field-input no-spinner'
                      placeholder='Adults'
                      value={qualification.adultsCount}
                      onChange={event =>
                        setQualification(prev => ({
                          ...prev,
                          adultsCount: event.target.value
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className='field-label'>Children</label>
                    <input
                      type='number'
                      min={0}
                      className='field-input no-spinner'
                      placeholder='Children'
                      value={qualification.childrenCount}
                      onChange={event => {
                        const rawValue = event.target.value
                        const nextCount = Math.max(
                          0,
                          Math.floor(Number(rawValue || 0))
                        )
                        setQualification(prev => ({
                          ...prev,
                          childrenCount: rawValue
                        }))
                        setChildAges(prev => {
                          if (nextCount === prev.length) return prev
                          if (nextCount < prev.length) {
                            return prev.slice(0, nextCount)
                          }
                          return [
                            ...prev,
                            ...Array.from(
                              { length: nextCount - prev.length },
                              () => ''
                            )
                          ]
                        })
                      }}
                    />
                  </div>
                  {qualificationChildrenCount > 0 ? (
                    <div className='md:col-span-2'>
                      <label className='field-label'>Children Ages</label>
                      <div className='grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3'>
                        {Array.from({ length: qualificationChildrenCount }).map(
                          (_, index) => (
                            <input
                              key={`lead-child-age-${index}`}
                              type='number'
                              min={0}
                              max={18}
                              step='1'
                              className={`field-input no-spinner ${
                                qualificationMissing.includes('childAges')
                                  ? 'border-red-500'
                                  : ''
                              }`}
                              placeholder={`Child ${index + 1} age`}
                              value={childAges[index] ?? ''}
                              onChange={event =>
                                setChildAges(prev => {
                                  const next = [...prev]
                                  next[index] = event.target.value
                                  return next
                                })
                              }
                            />
                          )
                        )}
                      </div>
                    </div>
                  ) : null}
                  <div>
                    <label className='field-label'>
                      {isVisaQualification ? 'Salary' : 'Budget'}
                    </label>
                    <input
                      type='number'
                      min={0}
                      className='field-input no-spinner'
                      placeholder={isVisaQualification ? 'Salary' : 'Budget'}
                      value={
                        isVisaQualification
                          ? qualification.salary
                          : qualification.budget
                      }
                      onChange={event =>
                        setQualification(prev => ({
                          ...prev,
                          ...(isVisaQualification
                            ? { salary: event.target.value }
                            : { budget: event.target.value })
                        }))
                      }
                    />
                  </div>
                  {isHolidayQualification ? (
                    <div>
                      <label className='field-label'>Visa Requirement</label>
                      <SearchableDropdown
                        value={qualification.visaRequired}
                        options={visaOptions}
                        searchPlaceholder='Search visa requirement...'
                        onChange={value =>
                          setQualification(prev => ({
                            ...prev,
                            visaRequired: value as 'YES' | 'NO' | ''
                          }))
                        }
                      />
                    </div>
                  ) : null}
                  {isHolidayQualification ? (
                    <div>
                      <label className='field-label'>
                        Preferred Hotel Category
                      </label>
                      <SearchableDropdown
                        value={qualification.preferredHotelCategory}
                        options={hotelCategoryOptions}
                        searchPlaceholder='Search hotel category...'
                        onChange={value =>
                          setQualification(prev => ({
                            ...prev,
                            preferredHotelCategory: value as
                              | '3_STAR'
                              | '4_STAR'
                              | '5_STAR'
                              | 'ANY'
                              | ''
                          }))
                        }
                      />
                    </div>
                  ) : null}
                  {isHolidayQualification ? (
                    <div>
                      <label className='field-label'>Travel Purpose</label>
                      <SearchableDropdown
                        value={qualification.travelPurpose}
                        options={travelPurposeOptions}
                        searchPlaceholder='Search purpose...'
                        onChange={value =>
                          setQualification(prev => ({
                            ...prev,
                            travelPurpose: value
                          }))
                        }
                      />
                    </div>
                  ) : null}
                  <div>
                    <label className='field-label'>Lead Source</label>
                    <SearchableDropdown
                      value={qualification.leadSource}
                      options={leadSourceOptions}
                      searchPlaceholder='Search source...'
                      onChange={value =>
                        setQualification(prev => ({
                          ...prev,
                          leadSource: value
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className='field-label'>Campaign</label>
                    <SearchableDropdown
                      value={qualification.campaignId}
                      options={campaignOptions}
                      searchPlaceholder='Search campaign...'
                      onChange={value =>
                        setQualification(prev => ({
                          ...prev,
                          campaignId: value
                        }))
                      }
                    />
                  </div>
             
                </div>
                <div className='mt-2 flex items-center justify-between'>
                  <p className='text-xs text-gray-500'>
                    {qualificationMissing.length
                      ? `Missing: ${qualificationMissing.join(', ')}`
                      : 'All mandatory lead-stage qualification fields captured. PAN can be added later.'}
                  </p>
                  <button
                    onClick={() => void saveQualification()}
                    disabled={qualificationSaving}
                    className='rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60'
                  >
                    {qualificationSaving ? 'Saving...' : 'Save Qualification'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </SurfaceCard>

        <SurfaceCard>
          <h3 className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
            Workflow Actions
          </h3>

          <div className='mt-4 rounded-xl border border-gray-200 p-3 dark:border-gray-700'>
            <p className='text-sm font-medium text-gray-900 dark:text-gray-100'>
              Status Transition
            </p>
            <SearchableDropdown
              className='mt-2'
              value={statusComboValue}
              options={statusOptions}
              searchPlaceholder='Search / Add status...'
              creatable
              onCreatePick={text => {
                const t = String(text ?? '').trim()
                if (!t) return
                setStatusComboValue(encodeCustomStatusComboValue(t))
                setGlobalStatusPresets(prev =>
                  prev.some(x => x.toLowerCase() === t.toLowerCase())
                    ? prev
                    : [...prev, t].sort((a, b) => a.localeCompare(b))
                )
                void leadsService.addCustomStatusPreset(t).catch(() => {})
              }}
              onChange={value => setStatusComboValue(value)}
            />
            <p className='mt-1 text-[11px] text-gray-500 dark:text-gray-400'>
               </p>
            <label className='mt-2 block text-xs font-medium text-gray-700 dark:text-gray-300'>
              Lead Temperature
            </label>
            <SearchableDropdown
              className='mt-1'
              value={leadTemperature}
              options={leadTemperatureOptions}
              searchPlaceholder='Search temperature...'
              onChange={value =>
                setLeadTemperature(value as 'HOT' | 'WARM' | 'COLD')
              }
            />
            <p className='mt-1 text-[11px] text-gray-500 dark:text-gray-400'>
              Manual choice only. Backend will not auto calculate when saved.
            </p>
            <label className='mt-2 block text-xs font-medium text-gray-700 dark:text-gray-300'>
              Follow-up Type
            </label>
            {pipelineSop !== null ? (
              <>
                <SearchableDropdown
                  className='mt-1'
                  value={selectedWorkflowFollowupType}
                  options={workflowFollowupTypeOptions}
                  searchPlaceholder='Search follow-up type...'
                  onChange={value =>
                    setWorkflowFollowupType(
                      value as 'CALL' | 'WHATSAPP' | 'FINAL_REMINDER'
                    )
                  }
                />
                <p className='mt-1 text-[11px] text-gray-500 dark:text-gray-400'>
                  Workflow Action history uses this type for status changes.
                  Schedule Follow-up also logs below with the same scheduled date
                  and time.
                </p>
              </>
            ) : (
              <p className='mt-1 text-[11px] text-gray-500 dark:text-gray-400'>
                Custom status keeps the current pipeline stage. Pick a standard
                status above to log call / WhatsApp on transition.
              </p>
            )}
            {latestScheduleForWorkflow?.followupDate ||
            latestScheduleForWorkflow?.followupLocalAt ||
            latestScheduleForWorkflow?.followup_local_at ? (
              <p className='bg-yellow-300 p-2 mt-2 text-xs font-medium text-gray-700  dark:text-gray-200  border border-yellow-500 rounded-lg'>
                Latest scheduled action time:{' '}
                {formatFollowupDisplay(latestScheduleForWorkflow)}
              </p>
            ) : null}
            {pipelineSop === 'CONVERTED' ? (
              <div className='mt-3 rounded-lg border border-gray-200 bg-gray-50/80 p-3 text-sm dark:border-gray-600 dark:bg-gray-800/40'>
                <p className='font-medium text-gray-900 dark:text-gray-100'>
                  Sent quotation for this lead
                </p>
                <p className='mt-1 text-xs text-gray-500 dark:text-gray-400'>
                  Searchable list of quotations that were sent to this lead and
                  are ready to convert. Updating status creates a booking when
                  one does not exist yet.
                </p>
                {loadingSentQuotations ? (
                  <p className='mt-2 text-xs text-gray-500'>Loading…</p>
                ) : sentQuotations.length === 0 ? (
                  <p className='mt-2 text-xs text-amber-700 dark:text-amber-300'>
                    No sent quotations yet. Send a quotation to this lead first.
                  </p>
                ) : eligibleConversionQuotations.length === 0 ? (
                  <p className='mt-2 text-xs text-amber-700 dark:text-amber-300'>
                    {sentQuotations.length} sent quotation
                    {sentQuotations.length === 1 ? '' : 's'} — complete margin
                    approval on each quotation first, then they will appear
                    here.
                  </p>
                ) : (
                  <>
                    <label className='mt-3 block text-xs font-medium text-gray-700 dark:text-gray-300'>
                      Select quotation
                    </label>
                    <SearchableDropdown
                      className='mt-1'
                      value={selectedConversionQuotationId}
                      onChange={setSelectedConversionQuotationId}
                      options={conversionQuotationDropdownOptions}
                      placeholder='Select quotation'
                      searchPlaceholder='Search quote #, status, destination, amount…'
                      disabled={
                        loadingSentQuotations ||
                        eligibleConversionQuotations.length === 0
                      }
                    />
                    <p className='mt-1 text-[11px] text-gray-500 dark:text-gray-400'>
                      {eligibleConversionQuotations.length} quote
                      {eligibleConversionQuotations.length === 1
                        ? ''
                        : 's'}{' '}
                      ready · use the search box when there are many.
                    </p>
                    {selectedConversionQuotationId ? (
                      <button
                        type='button'
                        onClick={() =>
                          navigate(
                            `/quotations/${selectedConversionQuotationId}`
                          )
                        }
                        className='mt-2 text-xs font-medium text-blue-600 hover:underline dark:text-blue-400'
                      >
                        Open selected quotation →
                      </button>
                    ) : null}
                  </>
                )}
              </div>
            ) : null}
            <label className='mt-2 block text-xs font-medium text-gray-700 dark:text-gray-300'>
              Notes (will appear in Follow-up History)
            </label>
            <textarea
              className='field-input mt-1'
              rows={3}
              placeholder='Enter notes about this status update...'
              value={statusNotes}
              onChange={event => setStatusNotes(event.target.value)}
            />
            {(pipelineSop === 'LOST' || pipelineSop === 'NON_RESPONSIVE') ? (
              <>
                <label className='mt-2 block text-xs font-medium text-gray-700 dark:text-gray-300'>
                  Closed Reason (required for LOST/NON_RESPONSIVE)
                </label>
                <textarea
                  className='field-input mt-1'
                  rows={2}
                  placeholder='Why is this lead being closed?'
                  value={closedReason}
                  onChange={event => setClosedReason(event.target.value)}
                />
              </>
            ) : null}
            <button
              onClick={() => void updateStatus()}
              disabled={
                statusSaving ||
                (pipelineSop === 'CONVERTED' && loadingSentQuotations)
              }
              className='mt-2 inline-flex items-center gap-2 rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-60'
            >
              {statusSaving ? 'Updating...' : 'Update Status'}
              <FaCheckCircle />
            </button>
          </div>

          {canAssignLead ? (
            <div className='mt-4 rounded-xl border border-gray-200 p-3 dark:border-gray-700'>
              <p className='text-sm font-medium text-gray-900 dark:text-gray-100'>
                Assign Lead
              </p>
              <p className='mt-1 text-xs text-gray-500 dark:text-gray-400'>
                Assignee options are scoped by your role, team, and lead
                country.
              </p>
              <div className='mt-2 grid grid-cols-1 gap-2'>
                <SearchableDropdown
                  value={selectedAssigneeId}
                  onChange={setSelectedAssigneeId}
                  options={assigneeOptions}
                  placeholder='Select assignee'
                  searchPlaceholder='Search assignee...'
                />
                <button
                  onClick={() => void assignLeadNow()}
                  disabled={assigning || !selectedAssigneeId}
                  className='inline-flex items-center justify-center rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60'
                >
                  {assigning ? 'Assigning...' : 'Assign Lead'}
                </button>
              </div>
            </div>
          ) : null}

          {canReadQuotations || canCreateQuotation || canUpdateQuotation ? (
            <div className='mt-4 rounded-xl border border-gray-200 p-3 dark:border-gray-700'>
              <p className='text-sm font-medium text-gray-900 dark:text-gray-100'>
                Quotation Actions
              </p>
              <p className='mt-1 text-xs text-gray-500 dark:text-gray-400'>
                Create, open, edit, or send quotations for this lead directly
                from here.
              </p>

              {quotationActionError ? (
                <div className='mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-200'>
                  {quotationActionError}
                </div>
              ) : null}

              {quotationActionMessage ? (
                <div className='mt-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200'>
                  {quotationActionMessage}
                </div>
              ) : null}

              <div className='mt-3 grid grid-cols-1 gap-2'>
                {canCreateQuotation ? (
                  <button
                    type='button'
                    onClick={() => navigate(`/quotations/builder?leadId=${id}`)}
                    className='inline-flex items-center justify-center rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700'
                  >
                    Create Quotation
                  </button>
                ) : null}

                {loadingSentQuotations ? (
                  <p className='text-xs text-gray-500 dark:text-gray-400'>
                    Loading quotations...
                  </p>
                ) : leadQuotations.length === 0 ? (
                  <p className='text-xs text-amber-700 dark:text-amber-300'>
                    No quotations linked to this lead yet.
                  </p>
                ) : (
                  <>
                    <SearchableDropdown
                      value={selectedLeadQuotationId}
                      onChange={setSelectedLeadQuotationId}
                      options={leadQuotationDropdownOptions}
                      placeholder='Select quotation'
                      searchPlaceholder='Search quote #, status, destination, amount...'
                    />

                    <div className='flex flex-wrap gap-2'>
                      {canReadQuotations ? (
                        <button
                          type='button'
                          onClick={() =>
                            selectedLeadQuotationId &&
                            navigate(`/quotations/${selectedLeadQuotationId}`)
                          }
                          disabled={!selectedLeadQuotationId}
                          className='rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800'
                        >
                          Open
                        </button>
                      ) : null}

                      {canUpdateQuotation &&
                      selectedLeadQuotation &&
                      selectedLeadQuotation.status !== 'APPROVED' ? (
                        <button
                          type='button'
                          onClick={() =>
                            navigate(`/quotations/${selectedLeadQuotation.id}/edit`)
                          }
                          className='rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50 dark:border-gray-700 dark:text-blue-300 dark:hover:bg-blue-900/20'
                        >
                          Edit
                        </button>
                      ) : null}

                      {canUpdateQuotation ? (
                        <button
                          type='button'
                          onClick={() => void sendQuotationFromLead('EMAIL')}
                          disabled={
                            !selectedLeadQuotationId ||
                            !lead?.email ||
                            Boolean(selectedLeadQuotation?.requiresApproval) ||
                            quotationActionLoadingKey ===
                              `${selectedLeadQuotationId}:EMAIL`
                          }
                          className='rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800'
                        >
                          {quotationActionLoadingKey ===
                          `${selectedLeadQuotationId}:EMAIL`
                            ? 'Sending Email...'
                            : 'Send Email'}
                        </button>
                      ) : null}

                      {canUpdateQuotation ? (
                        <button
                          type='button'
                          onClick={() => void sendQuotationFromLead('WHATSAPP')}
                          disabled={
                            !selectedLeadQuotationId ||
                            !lead?.phone ||
                            Boolean(selectedLeadQuotation?.requiresApproval) ||
                            quotationActionLoadingKey ===
                              `${selectedLeadQuotationId}:WHATSAPP`
                          }
                          className='rounded-lg border border-green-200 px-3 py-2 text-xs font-semibold text-green-700 hover:bg-green-50 disabled:opacity-60 dark:border-green-900 dark:text-green-300 dark:hover:bg-green-900/20'
                        >
                          {quotationActionLoadingKey ===
                          `${selectedLeadQuotationId}:WHATSAPP`
                            ? 'Sending WhatsApp...'
                            : 'Send WhatsApp'}
                        </button>
                      ) : null}
                    </div>

                    {selectedLeadQuotation ? (
                      <div className='rounded-lg bg-gray-50 px-3 py-2 text-[11px] text-gray-600 dark:bg-gray-800/50 dark:text-gray-300'>
                        <p>
                          Status:{' '}
                          <span className='font-medium'>
                            {String(selectedLeadQuotation.status).replace(/_/g, ' ')}
                          </span>
                        </p>
                        <p>
                          Last sent:{' '}
                          <span className='font-medium'>
                            {selectedLeadQuotation.sentAt
                              ? formatDateTime(
                                  selectedLeadQuotation.sentAt,
                                  String(selectedLeadQuotation.sentAt)
                                )
                              : 'Not sent'}
                          </span>
                        </p>
                        {selectedLeadQuotation.requiresApproval ? (
                          <p className='font-medium text-amber-700 dark:text-amber-300'>
                            Margin approval is pending for this quotation, so
                            sending is disabled.
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                  </>
                )}
              </div>
            </div>
          ) : null}

          <div className='mt-4 rounded-xl border border-gray-200 p-3 dark:border-gray-700'>
            <p className='text-sm font-medium text-gray-900 dark:text-gray-100'>
              Follow-up Compliance
            </p>
            <div className='mt-2 space-y-1 text-sm text-gray-700 dark:text-gray-300'>
              <div className='flex items-center justify-between gap-2'>
                <p
                  className={
                    isCallsDisabled
                      ? 'line-through text-gray-400 dark:text-gray-500'
                      : ''
                  }
                >
                  Calls: {compliance.calls} / {REQUIRED_COMPLIANCE.calls}
                </p>
                <div className='relative'>
                  {showDisablePopup ? (
                    <div className='pointer-events-none absolute bottom-full right-0 z-10 mb-1 min-w-[180px] rounded-md bg-gray-900 px-3 py-1.5 text-center text-[10px] font-medium whitespace-nowrap text-white shadow-lg dark:bg-gray-800'>
                      {isCallsDisabled
                        ? 'Calls disabled — WhatsApp only'
                        : 'Calls re-enabled'}
                    </div>
                  ) : null}
                  <button
                    type='button'
                    onClick={() => void handleDisableCalls()}
                    className={`rounded-md px-2 py-0.5 text-[11px] font-medium text-white ${
                      isCallsDisabled
                        ? 'bg-green-700 hover:bg-green-800 dark:bg-green-600'
                        : 'bg-red-800 hover:bg-red-900 dark:bg-red-700 dark:hover:bg-red-800'
                    }`}
                  >
                    {isCallsDisabled ? 'Re-enable Calls' : 'Disable Calls'}
                  </button>
                </div>
              </div>
              <p
                className={
                  isCallsDisabled
                    ? 'font-medium text-green-700 dark:text-green-400'
                    : ''
                }
              >
                WhatsApp:{' '}
                {isCallsDisabled
                  ? '∞'
                  : `${compliance.whatsapp} / ${REQUIRED_COMPLIANCE.whatsapp}`}
              </p>
              <p>Final Reminder: {compliance.finalReminders} / 1</p>
              <p
                className={
                  isComplianceComplete ? 'text-green-600' : 'text-amber-600'
                }
              >
                {isComplianceComplete
                  ? 'Compliance complete'
                  : 'Compliance pending'}
              </p>
            </div>
          </div>

          {isCallsDisabled ? (
            <div className='mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-200'>
              Client has opted out of calls. Only WhatsApp messages are allowed.
            </div>
          ) : null}

          <div className='mt-4 rounded-xl border border-gray-200 p-3 dark:border-gray-700'>
            <p className='text-sm font-medium text-gray-900 dark:text-gray-100'>
              Schedule Follow-up
            </p>
            <p className='mt-1 text-xs text-gray-500 dark:text-gray-400'>
              Date/time uses your device clock. The same wall-clock value and
              IANA zone ({getBrowserTimeZone()}) are stored for display and
              reference. Reminders still use the scheduled instant server-side.
              Assigned agent gets an in-app reminder in a ~1 minute window about{' '}
              <span className='font-semibold text-gray-700 dark:text-gray-200'>
                5 minutes before
              </span>{' '}
              the scheduled call/WhatsApp (automation job must be running).
              Rows appear under{' '}
              <span className='font-semibold'>Scheduled Follow-ups</span>, not
              Follow-up History.
            </p>
            {followupScheduleError ? (
              <p className='mt-2 text-xs font-medium text-red-600 dark:text-red-400'>
                {followupScheduleError}
              </p>
            ) : null}
            {followupScheduleOk ? (
              <p className='mt-2 text-xs font-medium text-emerald-700 dark:text-emerald-400'>
                {followupScheduleOk}
              </p>
            ) : null}
            <div className='mt-2 grid grid-cols-1 gap-2'>
              <SearchableDropdown
                value={followupDraft.followupType}
                options={followupTypeOptions}
                searchPlaceholder='Search follow-up type...'
                onChange={value =>
                  setFollowupDraft(prev => ({ ...prev, followupType: value }))
                }
              />
              <input
                type='datetime-local'
                className='field-input'
                value={followupDraft.followupDate}
                onChange={event =>
                  setFollowupDraft(prev => ({
                    ...prev,
                    followupDate: event.target.value
                  }))
                }
              />
              <input
                className='field-input'
                placeholder='Cadence code (optional)'
                value={followupDraft.cadenceCode}
                onChange={event =>
                  setFollowupDraft(prev => ({
                    ...prev,
                    cadenceCode: event.target.value
                  }))
                }
              />
              <textarea
                className='field-input'
                rows={2}
                placeholder='Notes'
                value={followupDraft.notes}
                onChange={event =>
                  setFollowupDraft(prev => ({
                    ...prev,
                    notes: event.target.value
                  }))
                }
              />
              <button
                onClick={() => void scheduleFollowup()}
                disabled={followupSaving}
                className='inline-flex w-full items-center justify-center rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60'
              >
                {followupSaving ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </div>
        </SurfaceCard>
      </div>

      {followupsError ? (
        <div className='rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100'>
          {followupsError}
        </div>
      ) : null}

      <div className='grid grid-cols-1 gap-6 lg:grid-cols-2'>
   
        
        <SurfaceCard className='h-full'>
          <div className='flex items-center justify-between'>
            <h3 className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
              Scheduled Follow-ups
            </h3>
            <span className='text-xs text-gray-500'>
              {visibleScheduledFollowups.length} item(s)
            </span>
          </div>
          {loadingFollowups ? (
            <p className='mt-3 text-sm text-gray-500'>
              Loading scheduled follow-ups...
            </p>
          ) : visibleScheduledFollowups.length === 0 ? (
            <p className='mt-3 text-sm text-gray-500'>
              No scheduled follow-ups yet.
            </p>
          ) : (
            <div className='mt-3 space-y-2'>
              {visibleScheduledFollowups
                .slice()
                .sort(
                  (a, b) =>
                    followupSortKey(a) -
                    followupSortKey(b)
                )
                .map(item => (
                  <div
                    key={item.id}
                    className='rounded-xl border border-gray-200 p-3 text-sm dark:border-gray-700'
                  >
                    <div className='flex flex-wrap items-center justify-between gap-2'>
                      <div className='inline-flex items-center gap-2'>
                        <StatusBadge status={String(item.followupType || 'CALL')} />
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-medium ${
                            item.isCompleted
                              ? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                              : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                          }`}
                        >
                          {item.isCompleted ? 'Completed' : 'Scheduled'}
                        </span>
                        {item.cadenceCode ? (
                          <span className='rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-300'>
                            {item.cadenceCode}
                          </span>
                        ) : null}
                      </div>
                      <span className='inline-flex items-center gap-1 text-xs text-gray-500'>
                        <FaClock />Schedule Time :  {formatFollowupDisplay(item)}
                        
                      </span>
                    </div>
                    <p className='mt-2 text-xs text-gray-500 dark:text-gray-400'>
                      Created at:{' '}
                      <span className='font-medium text-gray-700 dark:text-gray-200'>
                        {formatHistoryActionDisplay(item)}
                      </span>
                    </p>
                    <p className='mt-2 text-xs text-gray-500 dark:text-gray-400'>
                      Action by:{' '}
                      <span className='font-medium text-gray-700 dark:text-gray-200'>
                        {resolveFollowupActorName(item)}
                      </span>
                    </p>
                    {item.notes ? (
                      <p className='mt-2 whitespace-pre-wrap text-xs text-gray-600 dark:text-gray-300'>
                        {item.notes}
                      </p>
                    ) : (
                      <p className='mt-2 text-xs text-gray-400 dark:text-gray-500'>
                        No notes
                      </p>
                    )}
                  </div>
                ))}
            </div>
          )}
        </SurfaceCard>

        <SurfaceCard className='h-full'>
          <div className='flex items-center justify-between'>
            <h3 className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
              Follow-up History
            </h3>
            <span className='text-xs text-gray-500'>
              {visibleHistoryFollowups.length} item(s)
            </span>
          </div>
          {loadingFollowups ? (
            <p className='mt-3 text-sm text-gray-500'>Loading follow-ups...</p>
          ) : visibleHistoryFollowups.length === 0 ? (
            <p className='mt-3 text-sm text-gray-500'>
              No follow-up rows yet. Schedule a call/WhatsApp above or log
              actions from status workflow.
            </p>
          ) : (
            <div className='mt-3 space-y-2'>
              {visibleHistoryFollowups
                .slice()
                .sort((a, b) => {
                  const left = resolveFollowupActionDate(a)?.getTime() || 0
                  const right = resolveFollowupActionDate(b)?.getTime() || 0
                  return right - left
                })
                .map(item => (
                  <div
                    key={item.id}
                    className='rounded-xl border border-gray-200 p-3 text-sm dark:border-gray-700'
                  >
                    <div className='flex flex-wrap items-center justify-between gap-2'>
                      <div className='inline-flex items-center gap-2'>
                        <StatusBadge
                          status={String(
                            item.statusSnapshot || item.followupType || 'CALL'
                          )}
                        />
                        {item.statusSnapshot && item.followupType ? (
                          <span className='rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300'>
                            {String(item.followupType).replace(/_/g, ' ')}
                          </span>
                        ) : null}
                        {item.cadenceCode ? (
                          <span className='rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-300'>
                            {item.cadenceCode}
                          </span>
                        ) : null}
                      </div>
                      <span className='inline-flex items-center gap-1 text-xs text-gray-500'>
                        <FaClock />
                        {formatFollowupDisplay(item)}
                      </span>
                    </div>
                    <p className='mt-2 text-xs text-gray-500 dark:text-gray-400'>
                      Action by:{' '}
                      <span className='font-medium text-gray-700 dark:text-gray-200'>
                        {resolveFollowupActorName(item)}
                      </span>
                    </p>
                    {item.notes ? (
                      <p className='mt-2 whitespace-pre-wrap text-xs text-gray-600 dark:text-gray-300'>
                        {item.notes}
                      </p>
                    ) : (
                      <p className='mt-2 text-xs text-gray-400 dark:text-gray-500'>
                        No notes
                      </p>
                    )}
                  </div>
                ))}
            </div>
          )}
        </SurfaceCard>
      </div>

      {showSavedQualification && (
        <div className='fixed top-4 left-1/2 transform -translate-x-1/2 z-[60] animate-fadeIn'>
          <div className='flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border bg-green-50 border-green-200 dark:bg-green-900/30 dark:border-green-800'>
            <FaCheckCircle className='text-green-600 dark:text-green-400' />
            <p className='text-sm font-medium text-green-800 dark:text-green-300'>
              Qualification saved successfully
            </p>
          </div>
        </div>
      )}

      <style>{`
        .no-spinner::-webkit-outer-spin-button,
        .no-spinner::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        .no-spinner[type='number'] {
          -moz-appearance: textfield;
          appearance: textfield;
        }
      `}</style>
    </div>
  )
}

export default LeadDetails
