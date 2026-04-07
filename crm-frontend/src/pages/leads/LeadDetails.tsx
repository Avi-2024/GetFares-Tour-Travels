import React, { useCallback, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { FaArrowLeft, FaCheckCircle, FaClock } from 'react-icons/fa'
import SurfaceCard from '../../components/ui/SurfaceCard'
import StatusBadge from '../../components/ui/StatusBadge'
import SearchableDropdown from '../../components/ui/SearchableDropdown'
import { getApiErrorMessage } from '../../api/apiClient'
import { bookingsApi } from '../../api/bookings'
import { quotationsApi } from '../../api/quotations'
import { usersApi } from '../../api/users'
import { useLeadsService } from '../../hooks/useLeadsService'
import { useCampaignsService } from '../../hooks/useCampaignsService'
import {
  buildBookingCreatePayloadFromQuotation,
  quotationWasSentToLead
} from '../../utils/bookingFromQuotation'
import { useAuth } from '../../context/AuthContext'
import { useDateTimePreferences } from '../../context/DateTimePreferencesContext'
import {
  SOP_STATUS_LABELS,
  STATUS_REQUIRING_QUALIFICATION,
  deriveSopStatusLabel,
  sopLabelToCanonical,
  toStatusLabelText,
  type SopStatusLabel
} from '../../utils/leadStatus'
import { Country } from 'country-state-city'
import { getCurrencyOptions } from '../../utils/currency'
import { getNationalityOptions } from '../../utils/nationality'

type QualificationForm = {
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
  visaRequired: 'YES' | 'NO' | ''
  preferredHotelCategory: '3_STAR' | '4_STAR' | '5_STAR' | 'ANY' | ''
  travelPurpose: string
  leadSource: string
  campaignId: string
}

const emptyQualification: QualificationForm = {
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
  const { hasPermission, user } = useAuth()
  const { parseApiDateTime, formatDate, formatDateTime } =
    useDateTimePreferences()

  const [lead, setLead] = useState<any>(null)
  const [followups, setFollowups] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingFollowups, setLoadingFollowups] = useState(false)
  const [error, setError] = useState('')
  const [statusError, setStatusError] = useState('')
  const [statusSaving, setStatusSaving] = useState(false)
  const [selectedStatusLabel, setSelectedStatusLabel] =
    useState<SopStatusLabel>('NEW')
  const [workflowFollowupType, setWorkflowFollowupType] = useState<
    'CALL' | 'WHATSAPP' | 'FINAL_REMINDER'
  >('CALL')
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
  const [conversionFollowUpMessage, setConversionFollowUpMessage] = useState('')
  const [assigneeOptions, setAssigneeOptions] = useState<
    Array<{ value: string; label: string }>
  >([{ value: '', label: 'Select assignee' }])
  const [selectedAssigneeId, setSelectedAssigneeId] = useState('')
  const [assigning, setAssigning] = useState(false)
  const [campaigns, setCampaigns] = useState<any[]>([])

  const createdAtLabel = useMemo(() => {
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

  const firstFollowupLabel = useMemo(() => {
    if (!followups.length) return 'N/A'
    const dates = followups
      .map(item => item?.followupDate || item?.followup_date || null)
      .filter(Boolean)
      .map(value => parseApiDateTime(value))
      .filter((value): value is Date => Boolean(value))
      .filter(value => !Number.isNaN(value.getTime()))
      .sort((a, b) => a.getTime() - b.getTime())
    if (!dates.length) return 'N/A'
    return formatDateTime(dates[0], 'N/A')
  }, [followups, formatDateTime, parseApiDateTime])

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
      const actionTimeRaw = item?.createdAt ?? item?.created_at ?? null
      const actionTime = actionTimeRaw ? parseApiDateTime(actionTimeRaw) : null
      if (actionTime && !Number.isNaN(actionTime.getTime())) {
        return actionTime
      }

      const fallbackRaw = item?.followupDate ?? item?.followup_date ?? null
      const fallback = fallbackRaw ? parseApiDateTime(fallbackRaw) : null
      if (fallback && !Number.isNaN(fallback.getTime())) {
        return fallback
      }

      return null
    },
    [parseApiDateTime]
  )

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

  const qualificationChildrenCount = useMemo(() => {
    const numericValue = Number(qualification.childrenCount || 0)
    if (!Number.isFinite(numericValue)) return 0
    return Math.max(0, Math.floor(numericValue))
  }, [qualification.childrenCount])

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
      panNumber: item?.panNumber ?? item?.pan_number ?? '',
      addressLine: item?.addressLine ?? item?.address_line ?? '',
      leadCountry: item?.leadCountry ?? item?.lead_country ?? item?.country ?? '',
      nationality: item?.nationality ?? '',
      clientCurrency: item?.clientCurrency ?? item?.client_currency ?? 'INR',
      destinationName:
        (typeof item?.destination === 'object'
          ? item?.destination?.name
          : item?.destination) ??
        item?.travelTo ??
        item?.travel_to ??
        item?.destinationName ??
        '',
      travelDate:
        item?.travelDate?.slice?.(0, 10) ||
        item?.travel_date?.slice?.(0, 10) ||
        '',
      travelEndDate:
        item?.travelEndDate?.slice?.(0, 10) ||
        item?.travel_end_date?.slice?.(0, 10) ||
        '',
      adultsCount: String(item?.adultsCount ?? 2),
      childrenCount: String(nextChildrenCount),
      budget:
        item?.budget !== undefined && item?.budget !== null
          ? String(item.budget)
          : '',
      visaRequired:
        typeof item?.visaRequired === 'boolean'
          ? item.visaRequired
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
        setSelectedStatusLabel(
          deriveSopStatusLabel(data.status, data.subStatus, data.statusLabel)
        )
        hydrateQualification(data)
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to load lead details.'))
      setLead(null)
    } finally {
      setLoading(false)
    }
  }, [hydrateQualification, id, leadsService])

  const loadFollowups = useCallback(async () => {
    if (!id) return
    setLoadingFollowups(true)
    try {
      const rows = await leadsService.getFollowups(id)
      setFollowups(rows)
    } catch (_error) {
      setFollowups([])
    } finally {
      setLoadingFollowups(false)
    }
  }, [id, leadsService])

  const loadCampaigns = useCallback(async () => {
    try {
      const response = await campaignsService.list({ status: 'ACTIVE' })
      const rows =
        (response as any)?.data?.data ?? (response as any)?.data ?? response
      setCampaigns(Array.isArray(rows) ? rows : [])
    } catch {
      setCampaigns([])
    }
  }, [campaignsService])

  const loadLeadQuotationsForLead = useCallback(async () => {
    if (!id) return
    setLoadingSentQuotations(true)
    try {
      const response = await quotationsApi.list({
        leadId: id,
        includeItems: false,
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
      const res = await usersApi.list({ isActive: true, limit: 500 })
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
  }, [lead, hasPermission, user?.role])

  React.useEffect(() => {
    void loadLead()
    void loadFollowups()
    void loadLeadQuotationsForLead()
  }, [loadFollowups, loadLead, loadLeadQuotationsForLead])

  React.useEffect(() => {
    setConversionFollowUpMessage('')
    if (selectedStatusLabel !== 'CONVERTED') {
      setSelectedConversionQuotationId('')
      return
    }
    void loadLeadQuotationsForLead()
  }, [selectedStatusLabel, loadLeadQuotationsForLead])

  React.useEffect(() => {
    void loadAssigneeOptions()
  }, [loadAssigneeOptions])

  React.useEffect(() => {
    void loadCampaigns()
  }, [loadCampaigns])

  const visibleHistoryFollowups = useMemo(
    () => followups.filter(item => !item?.isScheduleOnly),
    [followups]
  )

  const visibleScheduledFollowups = useMemo(
    () => followups.filter(item => item?.isScheduleOnly),
    [followups]
  )

  const compliance = useMemo(() => {
    const summary = {
      total: visibleHistoryFollowups.length,
      calls: 0,
      whatsapp: 0,
      finalReminders: 0
    }
    visibleHistoryFollowups.forEach(item => {
      const type = String(item?.followupType || '').toUpperCase()
      if (type === 'CALL') summary.calls += 1
      if (type === 'WHATSAPP') summary.whatsapp += 1
      if (type === 'FINAL_REMINDER') summary.finalReminders += 1
    })
    return summary
  }, [visibleHistoryFollowups])

  const statusOptions = useMemo(
    () =>
      SOP_STATUS_LABELS.map(label => ({
        value: label,
        label: toStatusLabelText(label)
      })),
    []
  )

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

  const currencyOptions = useMemo(() => getCurrencyOptions(false), [])

  const visaOptions = useMemo(
    () => [
      { value: '', label: 'Visa Required' },
      { value: 'YES', label: 'Yes' },
      { value: 'NO', label: 'No' }
    ],
    []
  )

  const hotelCategoryOptions = useMemo(
    () => [
      { value: '', label: 'Hotel Category' },
      { value: '3_STAR', label: '3 Star' },
      { value: '4_STAR', label: '4 Star' },
      { value: '5_STAR', label: '5 Star' },
      { value: 'ANY', label: 'Any' }
    ],
    []
  )

  const leadSourceOptions = useMemo(
    () => [
      { value: 'Website', label: 'Website' },
      { value: 'Phone', label: 'Phone' },
      { value: 'Referral', label: 'Referral' },
      { value: 'Social', label: 'Social' },
      { value: 'WalkIn', label: 'WalkIn' }
    ],
    []
  )

  const campaignOptions = useMemo(
    () => [
      { value: '', label: 'Select campaign (optional)' },
      ...campaigns.map(campaign => ({
        value: String(campaign.id),
        label: String(campaign.name ?? campaign.title ?? campaign.id)
      }))
    ],
    [campaigns]
  )

  const countryOptions = useMemo(
    () => [
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
    []
  )

  const nationalityOptions = useMemo(() => getNationalityOptions(), [])

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
    if (selectedStatusLabel === 'FINAL_REMINDER') {
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
  }, [isCallsDisabled, selectedStatusLabel])

  const selectedWorkflowFollowupType =
    selectedStatusLabel === 'FINAL_REMINDER'
      ? 'FINAL_REMINDER'
      : workflowFollowupType

  React.useEffect(() => {
    if (selectedStatusLabel === 'FINAL_REMINDER') {
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
  }, [isCallsDisabled, selectedStatusLabel])

  const qualificationMissing = useMemo(() => {
    const missing: string[] = []
    if (!qualification.leadCountry.trim()) missing.push('leadCountry')
    if (!qualification.nationality.trim()) missing.push('nationality')
    if (!qualification.clientCurrency.trim()) missing.push('clientCurrency')
    if (!qualification.destinationName.trim()) missing.push('destination')
    if (!qualification.travelDate) missing.push('travelDate')
    if (!qualification.travelEndDate) missing.push('travelEndDate')
    if (
      qualification.travelDate &&
      qualification.travelEndDate &&
      qualification.travelEndDate < qualification.travelDate
    ) {
      missing.push('travelDateRange')
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
  }, [childAges, qualification])

  const isComplianceComplete =
    (isCallsDisabled || compliance.calls >= REQUIRED_COMPLIANCE.calls) &&
    compliance.whatsapp >= REQUIRED_COMPLIANCE.whatsapp &&
    compliance.finalReminders >= REQUIRED_COMPLIANCE.finalReminders

  const saveQualification = async () => {
    if (!id || !lead) return
    setStatusError('')
    if (qualificationMissing.length) {
      setStatusError(
        `Missing required fields: ${qualificationMissing.join(', ')}`
      )
      return
    }

    try {
      await leadsService.updateLead(id, {
        panNumber: qualification.panNumber.trim() || undefined,
        addressLine: qualification.addressLine.trim() || undefined,
        leadCountry: qualification.leadCountry.trim() || undefined,
        nationality: qualification.nationality.trim() || undefined,
        clientCurrency: qualification.clientCurrency.trim() || undefined,
        destinationName: qualification.destinationName.trim(),
        travelDate: qualification.travelDate,
        travelEndDate: qualification.travelEndDate,
        adultsCount: Number(qualification.adultsCount),
        childrenCount: Number(qualification.childrenCount),
        childAges: cleanChildAges,
        budget: Number(qualification.budget),
        visaRequired: qualification.visaRequired === 'YES',
        preferredHotelCategory: qualification.preferredHotelCategory,
        travelPurpose: qualification.travelPurpose.trim(),
        source: qualification.leadSource.trim() || undefined,
        campaignId: qualification.campaignId || undefined,
        qualificationCompleted: true
      })
      await loadLead()
    } catch (err) {
      setStatusError(getApiErrorMessage(err, 'Could not update qualification.'))
    }
  }

  const updateStatus = async () => {
    if (!id || !lead) return
    setStatusSaving(true)
    setStatusError('')
    setConversionFollowUpMessage('')
    const conversion = sopLabelToCanonical(selectedStatusLabel)

    if (
      STATUS_REQUIRING_QUALIFICATION.has(conversion.canonical) &&
      qualificationMissing.length
    ) {
      setStatusSaving(false)
      setStatusError(
        `Missing required fields: ${qualificationMissing.join(', ')}`
      )
      return
    }
    if (
      (conversion.canonical === 'LOST' ||
        conversion.canonical === 'NON_RESPONSIVE') &&
      !isComplianceComplete
    ) {
      setStatusSaving(false)
      setStatusError(
        'Follow-up compliance is incomplete. Required: 6 calls + 7 WhatsApp + 1 final reminder.'
      )
      return
    }
    if (conversion.canonical === 'LOST' && !closedReason.trim()) {
      setStatusSaving(false)
      setStatusError('closedReason is required for LOST.')
      return
    }

    if (conversion.canonical === 'CONVERTED') {
      if (loadingSentQuotations) {
        setStatusSaving(false)
        setStatusError('Loading sent quotations… please wait.')
        return
      }
      if (!eligibleConversionQuotations.length) {
        setStatusSaving(false)
        setStatusError(
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
        setStatusError(
          'Choose the accepted quotation from the dropdown before converting.'
        )
        return
      }
    }

    try {
      await leadsService.updateLead(id, {
        status: conversion.canonical,
        subStatus: conversion.subStatus,
        followupType: selectedWorkflowFollowupType,
        notes: statusNotes.trim() || undefined,
        closedReason:
          conversion.canonical === 'LOST' || conversion.canonical === 'NON_RESPONSIVE'
            ? closedReason.trim() || undefined
            : undefined,
        panNumber: qualification.panNumber.trim() || undefined,
        addressLine: qualification.addressLine.trim() || undefined,
        leadCountry: qualification.leadCountry.trim() || undefined,
        nationality: qualification.nationality.trim() || undefined,
        clientCurrency: qualification.clientCurrency.trim() || undefined,
        destinationName: qualification.destinationName.trim(),
        travelDate: qualification.travelDate,
        travelEndDate: qualification.travelEndDate,
        adultsCount: Number(qualification.adultsCount),
        childrenCount: Number(qualification.childrenCount),
        childAges: cleanChildAges,
        budget: Number(qualification.budget),
        visaRequired: qualification.visaRequired === 'YES',
        preferredHotelCategory: qualification.preferredHotelCategory,
        travelPurpose: qualification.travelPurpose.trim(),
        source: qualification.leadSource.trim() || undefined,
        campaignId: qualification.campaignId || undefined,
        qualificationCompleted: STATUS_REQUIRING_QUALIFICATION.has(
          conversion.canonical
        )
          ? true
          : undefined
      })

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
            setStatusError(
              getApiErrorMessage(
                err,
                'Lead was updated but the quotation could not be approved.'
              )
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
                setStatusError(
                  getApiErrorMessage(
                    cErr,
                    'Lead converted but booking could not be created.'
                  )
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

      await loadLead()
      if (conversion.canonical === 'CONVERTED') {
        await loadLeadQuotationsForLead()
      }
      await loadFollowups()
      setStatusNotes('')
      setClosedReason('')
    } catch (err) {
      setStatusError(getApiErrorMessage(err, 'Could not update lead status.'))
    } finally {
      setStatusSaving(false)
    }
  }

  const scheduleFollowup = async () => {
    if (!id) return
    if (!followupDraft.followupDate) {
      setStatusError('Please select follow-up date/time.')
      return
    }
    setFollowupSaving(true)
    setStatusError('')
    try {
      await leadsService.addFollowup(id, {
        followupType: followupDraft.followupType,
        followupDate: new Date(followupDraft.followupDate).toISOString(),
        cadenceCode: followupDraft.cadenceCode || undefined,
        notes: followupDraft.notes || undefined
      })
      setFollowupDraft({
        followupType: 'CALL',
        followupDate: '',
        cadenceCode: '',
        notes: ''
      })
      await loadLead()
      await loadFollowups()
    } catch (err) {
      setStatusError(getApiErrorMessage(err, 'Could not schedule follow-up.'))
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
      await quotationsApi.send(selectedLeadQuotation.id, {
        channel,
        ...(channel === 'EMAIL'
          ? { recipientEmail }
          : { recipientPhone })
      })

      setQuotationActionMessage(
        `Quotation ${selectedLeadQuotation.quoteNumber || selectedLeadQuotation.id} sent via ${
          channel === 'EMAIL' ? 'email' : 'WhatsApp'
        }.`
      )
      await loadLead()
      await loadLeadQuotationsForLead()
    } catch (error) {
      setQuotationActionError(
        getApiErrorMessage(error, 'Failed to send quotation.')
      )
    } finally {
      setQuotationActionLoadingKey('')
    }
  }

  const handleDisableCalls = async () => {
    if (!id) return
    const newState = !isCallsDisabled
    try {
      await leadsService.disableCalls(id, newState)
      setShowDisablePopup(true)
      window.setTimeout(() => setShowDisablePopup(false), 2500)
      await loadLead()
    } catch {
      setShowDisablePopup(false)
    }
  }

  const assignLeadNow = async () => {
    if (!id || !selectedAssigneeId) return
    setAssigning(true)
    setStatusError('')
    try {
      await leadsService.assignLead(id, {
        assignedTo: selectedAssigneeId,
        force: true
      })
      await loadLead()
      setSelectedAssigneeId('')
    } catch (err) {
      setStatusError(getApiErrorMessage(err, 'Unable to assign lead.'))
    } finally {
      setAssigning(false)
    }
  }

  return (
    <div className='space-y-6'>
      <div className='flex items-center gap-3'>
        <button
          onClick={() => navigate('/leads')}
          className='inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800'
        >
          <FaArrowLeft className='text-sm' />
        </button>
        <div>
          <h1 className='text-2xl font-bold text-gray-900 dark:text-gray-100'>
            Lead Details
          </h1>
          <p className='text-sm text-gray-500'>
            SOP workflow with compliance and SLA tracking.
          </p>
        </div>
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
                  {lead.nationality ? (
                    <p className='mt-0.5 text-xs font-medium text-blue-600 dark:text-blue-400'>
                      Nationality: {lead.nationality}
                    </p>
                  ) : null}
                </div>
                <StatusBadge
                  status={deriveSopStatusLabel(
                    lead.status,
                    lead.subStatus,
                    lead.statusLabel
                  )}
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
                 {lead.responseAt ? (
                  <p className='mt-1 text-xs text-gray-500 dark:text-gray-400'>
                    {`First contact logged at ${
                      formatDateTime(lead.responseAt, String(lead.responseAt))
                    }.`}
                  </p>
                ) : null}
                <p className='mt-1 text-xs text-gray-500 dark:text-gray-400'>
                  First follow-up: {firstFollowupLabel}
                </p>
                {lead.responseDeadline ? (
                  <p className='mt-1 text-xs text-gray-500 dark:text-gray-400'>
                    First-contact deadline:{' '}
                    {formatDateTime(lead.responseDeadline) ||
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
                    <label className='field-label'>PAN Number (optional)</label>
                    <input
                      className='field-input'
                      placeholder='Enter PAN number'
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
                    <label className='field-label'>Budget</label>
                    <input
                      type='number'
                      min={0}
                      className='field-input no-spinner'
                      placeholder='Budget'
                      value={qualification.budget}
                      onChange={event =>
                        setQualification(prev => ({
                          ...prev,
                          budget: event.target.value
                        }))
                      }
                    />
                  </div>
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
                  <div>
                    <label className='field-label'>Travel Purpose</label>
                    <input
                      className='field-input'
                      placeholder='Travel purpose'
                      value={qualification.travelPurpose}
                      onChange={event =>
                        setQualification(prev => ({
                          ...prev,
                          travelPurpose: event.target.value
                        }))
                      }
                    />
                  </div>
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
                    className='rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700'
                  >
                    Save Qualification
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
              value={selectedStatusLabel}
              options={statusOptions}
              searchPlaceholder='Search status...'
              onChange={value =>
                setSelectedStatusLabel(value as SopStatusLabel)
              }
            />
            <label className='mt-2 block text-xs font-medium text-gray-700 dark:text-gray-300'>
              Follow-up Type
            </label>
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
              Workflow Action history will use this selected type. Schedule
              Follow-up reminders stay separate.
            </p>
            {selectedStatusLabel === 'CONVERTED' ? (
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
            {(selectedStatusLabel === 'LOST' || selectedStatusLabel === 'NON_RESPONSIVE') ? (
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
                (selectedStatusLabel === 'CONVERTED' && loadingSentQuotations)
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
              Use this for the next action only. If the customer already
              answered your first call, also update the lead status so the
              first-response SLA is closed. Call follow-ups raise due-time
              reminders, and WhatsApp, Email, and Final Reminder notifications
              are sent by automation when the selected date/time is due. Notes
              stay private for reminders and do not appear in Follow-up
              History.
            </p>
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
                .sort((a, b) => {
                  const left = parseApiDateTime(a.followupDate)?.getTime() || 0
                  const right = parseApiDateTime(b.followupDate)?.getTime() || 0
                  return left - right
                })
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
                        <FaClock />
                        {item.followupDate
                          ? formatDateTime(
                              item.followupDate,
                              String(item.followupDate)
                            )
                          : 'No date'}
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
            <p className='mt-3 text-sm text-gray-500'>No follow-ups yet.</p>
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
                        {resolveFollowupActionDate(item)
                          ? formatDateTime(
                              resolveFollowupActionDate(item) as Date,
                              String(
                                item?.createdAt ??
                                  item?.created_at ??
                                  item?.followupDate ??
                                  item?.followup_date ??
                                  ''
                              )
                            )
                          : 'No date'}
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
