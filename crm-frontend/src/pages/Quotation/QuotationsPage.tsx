import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FaChevronLeft,
  FaChevronRight,
  FaEye,
  FaFileInvoice,
  FaDownload,
  FaMagnifyingGlass,
  FaPlus,
  FaWhatsapp,
  FaFilter,
  FaXmark,
  FaCircleXmark,
  FaPencil
} from 'react-icons/fa6'
import SurfaceCard from '../../components/ui/SurfaceCard'
import EmptyState from '../../components/ui/EmptyState'
import SearchableDropdown from '../../components/ui/SearchableDropdown'
import { validateQuoteTransition } from '../../utils/workflowValidation'
import { quotationsApi } from '../../api/quotations'
import { reportApiError } from '../../lib/notify'
import { useAuth } from '../../context/AuthContext'

type Status = 'pending' | 'accepted' | 'expired' | 'rejected' | 'draft'
interface Quotation {
  id: string
  leadId?: string | null
  sourcePackageId?: string | null
  currency?: string | null
  quoteNumber: string
  customer: string
  email: string
  phone?: string | null
  quotationTitle?: string | null
  durationLabel?: string | null
  destination: string
  details: string
  total: number
  margin: number
  status: Status
  templateName?: string | null
  templateCode?: string | null
  lastSent: string | null
  sentDate: string | null
  createdAt?: string | null
  responseCategory?: string | null
  responseSlaMinutes?: number | null
  responseSlaBreached?: boolean | null
  leadToQuoteSentMinutes?: number | null
}

const quickFilters = [
  { key: 'ALL', label: 'All' },
  { key: 'ACTIVE', label: 'Active' },
  { key: 'PENDING', label: 'Pending' },
  { key: 'ACCEPTED', label: 'Accepted' },
  { key: 'EXPIRED', label: 'Expired' },
  { key: 'REJECTED', label: 'Rejected' },
  { key: 'DRAFT', label: 'Draft' }
] as const
type QuickFilter = (typeof quickFilters)[number]['key']

type QuotationFilterState = {
  quoteNumber: string
  customer: string
  email: string
  phone: string
  destination: string
  template: string
  status: 'ALL' | Status
  sla: 'ALL' | 'WITHIN_SLA' | 'BREACHED' | 'UNTRACKED'
  fromDate: string
  toDate: string
  sortBy:
    | 'NEWEST_FIRST'
    | 'OLDEST_FIRST'
    | 'VALUE_HIGH_TO_LOW'
    | 'VALUE_LOW_TO_HIGH'
    | 'CUSTOMER_A_Z'
}

const defaultFilters: QuotationFilterState = {
  quoteNumber: '',
  customer: '',
  email: '',
  phone: '',
  destination: '',
  template: '',
  status: 'ALL',
  sla: 'ALL',
  fromDate: '',
  toDate: '',
  sortBy: 'NEWEST_FIRST'
}
const styles: Record<Status, string> = {
  pending:
    'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-900',
  accepted:
    'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-900',
  expired:
    'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-900',
  rejected:
    'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-900',
  draft:
    'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'
}

const mapApiStatusToUi = (status?: string): Status => {
  switch (String(status || '').toUpperCase()) {
    case 'SENT':
    case 'VIEWED':
      return 'pending'
    case 'APPROVED':
      return 'accepted'
    case 'REJECTED':
      return 'rejected'
    case 'EXPIRED':
      return 'expired'
    case 'DRAFT':
    default:
      return 'draft'
  }
}

const toIsoDate = (value?: string | null) => {
  if (!value) return ''
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return ''
  return parsed.toISOString().split('T')[0]
}

const normalizeCurrencyCode = (value: unknown) => {
  const normalized = String(value ?? '')
    .trim()
    .toUpperCase()
  return /^[A-Z]{3}$/.test(normalized) ? normalized : 'INR'
}

const formatAmountByCurrency = (amount: number, currency: unknown) => {
  const safeAmount = Number.isFinite(Number(amount)) ? Number(amount) : 0
  const code = normalizeCurrencyCode(currency)
  const locale = code === 'INR' ? 'en-IN' : 'en-US'

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(safeAmount)
  } catch {
    return `${code} ${safeAmount.toFixed(2)}`
  }
}

const matchesQuickFilter = (quickFilter: QuickFilter, status: Status) => {
  switch (quickFilter) {
    case 'ALL':
      return true
    case 'ACTIVE':
      return status === 'pending' || status === 'draft'
    case 'PENDING':
      return status === 'pending'
    case 'ACCEPTED':
      return status === 'accepted'
    case 'EXPIRED':
      return status === 'expired'
    case 'REJECTED':
      return status === 'rejected'
    case 'DRAFT':
      return status === 'draft'
    default:
      return true
  }
}

const QuotationsPage: React.FC = () => {
  const nav = useNavigate()
  const { token } = useAuth()
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('ALL')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [error, setError] = useState('')
  const [filterError, setFilterError] = useState('')
  const [isFetchingList, setIsFetchingList] = useState(false)
  const [isMutating, setIsMutating] = useState(false)
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)
  const [showMobileFilters, setShowMobileFilters] = useState(false)
  const [rejectModalOpen, setRejectModalOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [draftFilters, setDraftFilters] =
    useState<QuotationFilterState>(defaultFilters)
  const [appliedFilters, setAppliedFilters] =
    useState<QuotationFilterState>(defaultFilters)
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(
    null
  )
  const pageSize = 15

  const handleViewQuotation = (quotation: Quotation) => {
    const snapshot = {
      id: quotation.id,
      quoteNumber: quotation.quoteNumber,
      customer: quotation.customer,
      email: quotation.email,
      destination: quotation.destination,
      details: quotation.details,
      total: quotation.total,
      currency: quotation.currency,
      margin: quotation.margin,
      status: quotation.status,
      templateName: quotation.templateName,
      templateCode: quotation.templateCode,
      lastSent: quotation.lastSent,
      sentDate: quotation.sentDate,
      createdAt: quotation.createdAt
    }
    sessionStorage.setItem(
      `quotation:${quotation.id}`,
      JSON.stringify(snapshot)
    )
    nav(`/quotations/${quotation.id}`, { state: { quotation: snapshot } })
  }

  useEffect(() => {
    const loadQuotations = async () => {
      // Don't make API calls if no token
      if (!token) {
        console.log('No auth token available, skipping API call')
        setQuotations([])
        setError('Please login to view quotations.')
        return
      }

      setIsFetchingList(true)
      try {
        const response = await quotationsApi.list()

        // Check if response has the expected structure
        if (response && typeof response === 'object') {
          const payload = (response as any).data ?? response
          const data =
            (payload as any)?.data || (payload as any)?.quotations || payload

          if (Array.isArray(data)) {
            // Process quotations and fetch customer data
            const quotationsWithCustomers = await Promise.all(
              data.map(async (q: any) => {
                const leadId = q.leadId || q.lead_id
                const leadData = q.lead || q.relations?.lead || null
                const destinationData =
                  q.destination || q.relations?.destination || null
                const customerName =
                  leadData?.fullName ||
                  leadData?.customerName ||
                  leadData?.name ||
                  'Unknown Customer'
                const customerEmail = leadData?.email || 'No email'
                const customerPhone = leadData?.phone || 'No phone'
                const destinationName =
                  destinationData?.name ||
                  leadData?.destination?.name ||
                  leadData?.destinationName ||
                  'Unknown Destination'
                const templateData = q.template || q.relations?.template || null
                const templateSnapshot =
                  q.templateSnapshot || q.template_snapshot || null
                const quotationTitle =
                  q.quotationTitle ||
                  q.quotation_title ||
                  templateSnapshot?.quotationTitle ||
                  templateSnapshot?.package?.name ||
                  null
                const durationLabel =
                  q.durationLabel ||
                  q.duration_label ||
                  templateSnapshot?.durationLabel ||
                  templateSnapshot?.package?.duration ||
                  null
                const templateName =
                  templateData?.name || templateSnapshot?.name || null
                const templateCode =
                  templateData?.code || templateSnapshot?.code || null
                const quotationCurrency = normalizeCurrencyCode(
                  q.clientCurrency ||
                    q.client_currency ||
                    q.costCurrency ||
                    q.cost_currency ||
                    q.supplierCurrency ||
                    q.supplier_currency ||
                    templateSnapshot?.currency ||
                    templateSnapshot?.builderSnapshot?.currency ||
                    templateSnapshot?.pricing?.clientCurrency ||
                    templateSnapshot?.pricing?.costCurrency ||
                    leadData?.clientCurrency ||
                    leadData?.client_currency
                )

                const sentAt = q.sentAt || q.sent_at
                const sentDate = sentAt
                  ? new Date(sentAt).toISOString().split('T')[0]
                  : null
                const lastSent = sentAt
                  ? `${new Date(sentAt).toLocaleDateString()} - Sent`
                  : null
                const createdAt = q.createdAt || q.created_at || null

                return {
                  id: q.id || Math.random().toString(),
                  leadId,
                  sourcePackageId:
                    q.sourcePackageId || q.source_package_id || null,
                  currency: quotationCurrency,
                  quoteNumber: q.quoteNumber || q.quote_number || 'N/A',
                  customer: customerName,
                  email: customerEmail,
                  phone: customerPhone,
                  quotationTitle,
                  durationLabel,
                  destination:
                    q.tripDestination || q.trip_destination || destinationName,
                  details:
                    [quotationTitle, durationLabel]
                      .filter(Boolean)
                      .join(' • ') ||
                    q.details ||
                    q.description ||
                    templateSnapshot?.description ||
                    (leadData
                      ? `${leadData.adultsCount || 0} Adults${
                          leadData.childrenCount
                            ? `, ${leadData.childrenCount} Children`
                            : ''
                        } - ${leadData.travelPurpose || 'Travel'}`
                      : 'No details'),
                  total: Number(
                    q.totalSaleValue || q.finalPrice || q.total || q.amount || 0
                  ),
                  margin: Number(q.marginPercent || q.margin || 0),
                  status: mapApiStatusToUi(q.status),
                  templateName,
                  templateCode,
                  lastSent,
                  sentDate,
                  createdAt,
                  responseCategory:
                    q.responseCategory || q.response_category || null,
                  responseSlaMinutes:
                    q.responseSlaMinutes ?? q.response_sla_minutes ?? null,
                  responseSlaBreached:
                    q.responseSlaBreached ?? q.response_sla_breached ?? null,
                  leadToQuoteSentMinutes:
                    q.leadToQuoteSentMinutes ??
                    q.lead_to_quote_sent_minutes ??
                    null
                }
              })
            )

            const withStatusOverrides = quotationsWithCustomers.map(item => {
              const stored =
                typeof window !== 'undefined'
                  ? sessionStorage.getItem(`quotation:${item.id}`)
                  : null
              if (!stored) return item
              try {
                const parsed = JSON.parse(stored) as { status?: string }
                if (!parsed?.status) return item
                return {
                  ...item,
                  status: mapApiStatusToUi(parsed.status)
                }
              } catch {
                return item
              }
            })

            setQuotations(withStatusOverrides)
            setError('')
          } else {
            console.warn('API response data is not an array:', data)
            setQuotations([])
            setError('Invalid data format from API.')
          }
        } else {
          console.warn('Unexpected API response format:', response)
          setQuotations([])
          setError('Unexpected response format.')
        }
      } catch (error: any) {
        console.error('Failed to load quotations:', error)
        reportApiError(error, 'Failed to load quotations.', setError)

        // No fallback data on error
        setQuotations([])
      } finally {
        setIsFetchingList(false)
        setHasLoadedOnce(true)
      }
    }

    loadQuotations()
  }, [token])

  const allItems = useMemo(() => quotations, [quotations])

  const destinationOptions = useMemo(
    () => [
      { value: '', label: 'All Destinations' },
      ...Array.from(
        new Set(
          allItems
            .map(item => String(item.destination ?? '').trim())
            .filter(Boolean)
        )
      )
        .sort((a, b) => a.localeCompare(b))
        .map(name => ({ value: name, label: name }))
    ],
    [allItems]
  )

  const statusOptions = useMemo(
    () => [
      { value: 'ALL', label: 'All Statuses' },
      { value: 'pending', label: 'Pending' },
      { value: 'accepted', label: 'Accepted' },
      { value: 'expired', label: 'Expired' },
      { value: 'rejected', label: 'Rejected' },
      { value: 'draft', label: 'Draft' }
    ],
    []
  )

  const slaOptions = useMemo(
    () => [
      { value: 'ALL', label: 'All SLA' },
      { value: 'WITHIN_SLA', label: 'Within SLA' },
      { value: 'BREACHED', label: 'Breached' },
      { value: 'UNTRACKED', label: 'Untracked' }
    ],
    []
  )

  const sortOptions = useMemo(
    () => [
      { value: 'NEWEST_FIRST', label: 'Newest First' },
      { value: 'OLDEST_FIRST', label: 'Oldest First' },
      { value: 'VALUE_HIGH_TO_LOW', label: 'Value High-Low' },
      { value: 'VALUE_LOW_TO_HIGH', label: 'Value Low-High' },
      { value: 'CUSTOMER_A_Z', label: 'Customer A-Z' }
    ],
    []
  )

  const kpis = useMemo(() => {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()
    const isInCurrentMonth = (dateStr?: string | null) => {
      if (!dateStr) return false
      const date = new Date(dateStr)
      if (Number.isNaN(date.getTime())) return false
      return (
        date.getMonth() === currentMonth && date.getFullYear() === currentYear
      )
    }

    const activeCount = quotations.filter(
      q => q.status === 'pending' || q.status === 'draft'
    ).length
    const pendingCount = quotations.filter(q => q.status === 'pending').length
    const convertedCount = quotations.filter(
      q => q.status === 'accepted'
    ).length
    const valueThisMonth = quotations
      .filter(q => q.status === 'accepted')
      .filter(
        q => isInCurrentMonth(q.createdAt) || isInCurrentMonth(q.sentDate)
      )
      .reduce((sum, q) => sum + Number(q.total || 0), 0)

    return {
      activeCount,
      pendingCount,
      convertedCount,
      valueThisMonth
    }
  }, [quotations])

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (appliedFilters.quoteNumber) count += 1
    if (appliedFilters.customer) count += 1
    if (appliedFilters.email) count += 1
    if (appliedFilters.phone) count += 1
    if (appliedFilters.destination) count += 1
    if (appliedFilters.template) count += 1
    if (appliedFilters.status !== 'ALL') count += 1
    if (appliedFilters.sla !== 'ALL') count += 1
    if (appliedFilters.fromDate) count += 1
    if (appliedFilters.toDate) count += 1
    if (appliedFilters.sortBy !== 'NEWEST_FIRST') count += 1
    return count
  }, [appliedFilters])

  const updateDraftFilter = <K extends keyof QuotationFilterState>(
    key: K,
    value: QuotationFilterState[K]
  ) => {
    setDraftFilters(previous => ({
      ...previous,
      [key]: value
    }))
  }

  useEffect(() => {
    if (
      draftFilters.fromDate &&
      draftFilters.toDate &&
      draftFilters.fromDate > draftFilters.toDate
    ) {
      setFilterError('From Date cannot be later than To Date.')
      return
    }

    setFilterError('')
    const timer = window.setTimeout(() => {
      setAppliedFilters({
        ...draftFilters,
        quoteNumber: draftFilters.quoteNumber.trim(),
        customer: draftFilters.customer.trim(),
        email: draftFilters.email.trim(),
        phone: draftFilters.phone.trim(),
        template: draftFilters.template.trim()
      })
      setPage(1)
    }, 250)

    return () => window.clearTimeout(timer)
  }, [draftFilters])

  const filtered = useMemo(
    () =>
      allItems
        .filter(q => q && typeof q === 'object')
        .filter(q => {
          if (!matchesQuickFilter(quickFilter, q.status)) return false
          if (appliedFilters.status !== 'ALL' && q.status !== appliedFilters.status)
            return false

          const recordDate = toIsoDate(q.createdAt) || toIsoDate(q.sentDate)
          if (appliedFilters.fromDate && (!recordDate || recordDate < appliedFilters.fromDate))
            return false
          if (appliedFilters.toDate && (!recordDate || recordDate > appliedFilters.toDate))
            return false

          if (appliedFilters.destination && q.destination !== appliedFilters.destination)
            return false

          if (
            appliedFilters.quoteNumber &&
            !String(q.quoteNumber ?? '')
              .toLowerCase()
              .includes(appliedFilters.quoteNumber.toLowerCase())
          ) {
            return false
          }
          if (
            appliedFilters.customer &&
            !String(q.customer ?? '')
              .toLowerCase()
              .includes(appliedFilters.customer.toLowerCase())
          ) {
            return false
          }
          if (
            appliedFilters.email &&
            !String(q.email ?? '')
              .toLowerCase()
              .includes(appliedFilters.email.toLowerCase())
          ) {
            return false
          }
          if (
            appliedFilters.phone &&
            !String(q.phone ?? '')
              .toLowerCase()
              .includes(appliedFilters.phone.toLowerCase())
          ) {
            return false
          }
          if (appliedFilters.template) {
            const templateHaystack = [
              q.templateCode,
              q.templateName,
              q.quotationTitle
            ]
              .filter(Boolean)
              .join(' ')
              .toLowerCase()
            if (!templateHaystack.includes(appliedFilters.template.toLowerCase()))
              return false
          }

          if (appliedFilters.sla === 'BREACHED' && !q.responseSlaBreached)
            return false
          if (
            appliedFilters.sla === 'WITHIN_SLA' &&
            (!q.responseCategory || q.responseSlaBreached !== false)
          ) {
            return false
          }
          if (appliedFilters.sla === 'UNTRACKED' && q.responseCategory)
            return false

          const query = search.toLowerCase().trim()
          if (!query) return true
          const createdAtText = q.createdAt
            ? new Date(q.createdAt).toLocaleDateString()
            : ''
          const createdAtIso = toIsoDate(q.createdAt)
          const sentAtText = q.sentDate
            ? new Date(q.sentDate).toLocaleDateString()
            : ''
          const sentAtIso = toIsoDate(q.sentDate)
          const haystack = [
            q.quoteNumber,
            q.id,
            q.customer,
            q.email,
            q.phone,
            q.destination,
            q.status,
            q.quotationTitle,
            q.templateName,
            q.templateCode,
            createdAtText,
            createdAtIso,
            sentAtText,
            sentAtIso
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()
          return haystack.includes(query)
        }),
    [quickFilter, search, allItems, appliedFilters]
  )

  const toTimestamp = (value?: string | null) => {
    if (!value) return 0
    const parsed = Date.parse(value)
    return Number.isFinite(parsed) ? parsed : 0
  }

  const ordered = useMemo(
    () =>
      [...filtered].sort((a, b) => {
        if (appliedFilters.sortBy === 'VALUE_HIGH_TO_LOW') {
          return Number(b.total || 0) - Number(a.total || 0)
        }
        if (appliedFilters.sortBy === 'VALUE_LOW_TO_HIGH') {
          return Number(a.total || 0) - Number(b.total || 0)
        }
        if (appliedFilters.sortBy === 'CUSTOMER_A_Z') {
          return String(a.customer || '').localeCompare(String(b.customer || ''))
        }
        if (appliedFilters.sortBy === 'OLDEST_FIRST') {
          const left = toTimestamp(a.createdAt || a.sentDate)
          const right = toTimestamp(b.createdAt || b.sentDate)
          return left - right
        }
        const left = toTimestamp(a.createdAt || a.sentDate)
        const right = toTimestamp(b.createdAt || b.sentDate)
        return right - left
      }),
    [filtered, appliedFilters.sortBy]
  )

  const totalPages = Math.max(1, Math.ceil(ordered.length / pageSize))
  const rows = ordered.slice((page - 1) * pageSize, page * pageSize)

  const handleResetFilters = () => {
    setFilterError('')
    setDraftFilters(defaultFilters)
    setAppliedFilters(defaultFilters)
    setQuickFilter('ALL')
    setSearch('')
    setShowMobileFilters(false)
    setPage(1)
  }

  const rejectQuotation = (quotation: Quotation) => {
    setSelectedQuotation(quotation)
    setRejectReason('')
    setRejectModalOpen(true)
  }

  const handleRejectSubmit = async () => {
    if (!selectedQuotation) return

    const validationError = validateQuoteTransition(
      'REJECTED',
      rejectReason ?? ''
    )

    if (validationError) {
      setError(validationError)
      return
    }

    setIsMutating(true)
    try {
      await quotationsApi.changeStatus(selectedQuotation.id, {
        status: 'REJECTED',
        reason: rejectReason
      })

      setQuotations(prev =>
        prev.map(q =>
          q.id === selectedQuotation.id
            ? { ...q, status: 'rejected' as Status }
            : q
        )
      )

      setRejectModalOpen(false)
      setSelectedQuotation(null)
      setError('')
    } catch (error) {
      console.error('Failed to reject quotation:', error)
      reportApiError(error, 'Failed to reject quotation', setError)
    } finally {
      setIsMutating(false)
    }
  }

const handleEditQuotation = (quotation: Quotation) => {
    console.log('[QuotationsPage] Edit click: start', {
      quotationId: quotation?.id,
      status: quotation?.status,
      quoteNumber: (quotation as any)?.quoteNumber
    })

    if (quotation.status === 'accepted') {
      console.log('[QuotationsPage] Edit blocked: quotation is accepted', {
        quotationId: quotation?.id
      })
      setError('Approved quotations cannot be edited')
      console.log('[QuotationsPage] Error state set for blocked edit', {
        quotationId: quotation?.id
      })
      return
    }

    const editPath = `/quotations/${quotation.id}/edit`
    console.log('[QuotationsPage] Edit allowed: navigating', {
      quotationId: quotation?.id,
      path: editPath
    })
    nav(editPath)
    console.log('[QuotationsPage] Navigate call completed', {
      quotationId: quotation?.id
    })
  }

  const handleSendWhatsApp = async (quotation: Quotation) => {
    setIsMutating(true)
    try {
      const phone = quotation.phone

      if (!phone || phone === 'No phone') {
        setError('Phone number not available for WhatsApp sending')
        setIsMutating(false)
        return
      }

      await quotationsApi.send(quotation.id, {
        channel: 'WHATSAPP',
        recipientPhone: phone
      })

      // Update local state to reflect sent status
      setQuotations(prev =>
        prev.map(q =>
          q.id === quotation.id
            ? {
                ...q,
                status: 'pending',
                lastSent: `${new Date().toLocaleDateString()} - WhatsApp`,
                sentDate: new Date().toISOString().split('T')[0]
              }
            : q
        )
      )

      setError('')
    } catch (error) {
      console.error('Failed to send via WhatsApp:', error)
      reportApiError(
        error,
        'Failed to send quotation via WhatsApp',
        setError
      )
    } finally {
      setIsMutating(false)
    }
  }

  const exportCurrentTable = () => {
    if (!rows.length) return

    const headers = [
      'Quote #',
      'Customer',
      'Email',
      'Phone',
      'Destination',
      'Details',
      'Total',
      'Margin %',
      'Status',
      'Last Sent',
      'SLA Category',
      'Lead to Quote (min)'
    ]

    const escapeCsv = (value: string) => `"${value.replace(/\"/g, '""')}"`

    const dataRows = rows.map(q => [
      q.quoteNumber ?? '',
      q.customer ?? '',
      q.email ?? '',
      q.phone ?? '',
      q.destination ?? '',
      q.details ?? '',
      q.total ?? 0,
      q.margin ?? 0,
      q.status ?? '',
      q.lastSent ?? '',
      q.responseCategory ? q.responseCategory.replace(/_/g, ' ') : '',
      q.leadToQuoteSentMinutes ?? ''
    ])

    const csv = [headers, ...dataRows]
      .map(row => row.map(cell => escapeCsv(String(cell))).join(','))
      .join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `quotations-page-${page}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className='w-full max-w-full min-w-0 overflow-x-hidden space-y-4 sm:space-y-6'>
      {/* Header */}
      <div className='flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between'>
        <div className='min-w-0 flex flex-col gap-1'>
          <h1 className='text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100'>
            Quotations
          </h1>
          <p className='text-xs sm:text-sm text-gray-500 dark:text-gray-400'>
            Manage, track, and convert quotations faster.
          </p>
        </div>

        <div className='flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end lg:w-auto lg:self-start'>
          <button
            onClick={() => nav('/quotations/builder')}
            className='inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 sm:w-auto'
          >
            <FaPlus className='mr-2' />
            <span>Create Quotation</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4'>
        {[
          {
            t: 'Total Active',
            v: kpis.activeCount.toLocaleString(),
            c: 'Live'
          },
          {
            t: 'Pending',
            v: kpis.pendingCount.toLocaleString(),
            c: 'Awaiting'
          },
          {
            t: 'Converted',
            v: kpis.convertedCount.toLocaleString(),
            c: 'Approved'
          },
          {
            t: 'Value',
            v: kpis.valueThisMonth.toLocaleString('en-IN', {
              maximumFractionDigits: 0
            }),
            c: ''
          }
        ].map(k => (
          <SurfaceCard key={k.t} hoverable className='p-3 sm:p-5'>
            <div className='flex items-start justify-between'>
              <div className='min-w-0'>
                <p className='text-[10px] sm:text-xs uppercase tracking-wide text-gray-500 truncate'>
                  {k.t}
                </p>
                <p className='text-base sm:text-2xl font-semibold text-gray-900 dark:text-gray-100 mt-0.5 sm:mt-1'>
                  {k.v}
                </p>
              </div>
              <span className='text-[10px] sm:text-xs whitespace-nowrap rounded-full bg-gray-100 dark:bg-gray-800 px-1.5 sm:px-2 py-0.5 sm:py-1 text-gray-700 dark:text-gray-300'>
                {k.c}
              </span>
            </div>
          </SurfaceCard>
        ))}
      </div>

      {/* Main Card */}
      <SurfaceCard className='p-0 overflow-hidden border border-gray-200 dark:border-gray-800'>
        {error && (
          <div className='border-b border-gray-100 dark:border-gray-800 px-4 py-2'>
            <p className='text-xs sm:text-sm text-red-500'>{error}</p>
          </div>
        )}

        {/* Filters Section */}
        <div className='border-b border-gray-100 dark:border-gray-800 p-3 sm:p-4 space-y-3'>
          {filterError ? (
            <div className='rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-200'>
              {filterError}
            </div>
          ) : null}

          <div className='w-full overflow-x-auto pb-1 scrollbar-hide'>
            <div className='inline-flex rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-1 min-w-max'>
              {quickFilters.map(item => (
                <button
                  key={item.key}
                  onClick={() => {
                    setQuickFilter(item.key)
                    setPage(1)
                  }}
                  className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg whitespace-nowrap transition-all ${
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

          <div className='grid grid-cols-1 gap-3 lg:grid-cols-[1fr_auto] lg:items-end'>
            <div className='relative w-full'>
              <FaMagnifyingGlass className='absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400' />
              <input
                value={search}
                onChange={event => {
                  setSearch(event.target.value)
                  setPage(1)
                }}
                className='w-full pl-9 pr-4 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                placeholder='Search quote, customer, destination...'
              />
            </div>
            <div className='flex items-center justify-between gap-2 lg:block'>
              <div className='text-xs text-gray-500 dark:text-gray-400'>
                {activeFilterCount > 0
                  ? `${activeFilterCount} filter(s) applied`
                  : 'No filter applied'}
              </div>
              <button
                type='button'
                onClick={() => setShowMobileFilters(previous => !previous)}
                className='inline-flex items-center rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800'
              >
                <FaFilter className='mr-2' />
                {showMobileFilters ? 'Hide Filters' : 'Advanced Filters'}
              </button>
            </div>
          </div>

          <div
            className={`${
              showMobileFilters ? 'block' : 'hidden'
            } space-y-3 rounded-xl border border-gray-200 bg-gray-50/60 p-3 dark:border-gray-700 dark:bg-gray-900/30`}
          >
            <div className='grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5'>
              <div className='w-full'>
                <label className='mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300'>
                  Quote Number
                </label>
                <input
                  type='text'
                  value={draftFilters.quoteNumber}
                  onChange={event =>
                    updateDraftFilter('quoteNumber', event.target.value)
                  }
                  placeholder='Quote # or ID'
                  className='w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:border-gray-700 dark:bg-gray-900'
                />
              </div>
              <div className='w-full'>
                <label className='mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300'>
                  Customer
                </label>
                <input
                  type='text'
                  value={draftFilters.customer}
                  onChange={event =>
                    updateDraftFilter('customer', event.target.value)
                  }
                  placeholder='Customer name'
                  className='w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:border-gray-700 dark:bg-gray-900'
                />
              </div>
              <div className='w-full'>
                <label className='mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300'>
                  Email
                </label>
                <input
                  type='text'
                  value={draftFilters.email}
                  onChange={event => updateDraftFilter('email', event.target.value)}
                  placeholder='Partial email'
                  className='w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:border-gray-700 dark:bg-gray-900'
                />
              </div>
              <div className='w-full'>
                <label className='mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300'>
                  Phone
                </label>
                <input
                  type='text'
                  value={draftFilters.phone}
                  onChange={event => updateDraftFilter('phone', event.target.value)}
                  placeholder='Partial phone'
                  className='w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:border-gray-700 dark:bg-gray-900'
                />
              </div>
              <div className='w-full'>
                <label className='mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300'>
                  Template
                </label>
                <input
                  type='text'
                  value={draftFilters.template}
                  onChange={event =>
                    updateDraftFilter('template', event.target.value)
                  }
                  placeholder='Template name/code'
                  className='w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:border-gray-700 dark:bg-gray-900'
                />
              </div>
            </div>

            <div className='grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6'>
              <div className='w-full'>
                <label className='mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300'>
                  From Date
                </label>
                <input
                  type='date'
                  value={draftFilters.fromDate}
                  onChange={event =>
                    updateDraftFilter('fromDate', event.target.value)
                  }
                  className='w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:border-gray-700 dark:bg-gray-900'
                />
              </div>
              <div className='w-full'>
                <label className='mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300'>
                  To Date
                </label>
                <input
                  type='date'
                  value={draftFilters.toDate}
                  onChange={event => updateDraftFilter('toDate', event.target.value)}
                  className='w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:border-gray-700 dark:bg-gray-900'
                />
              </div>
              <div className='w-full'>
                <label className='mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300'>
                  Destination
                </label>
                <SearchableDropdown
                  className='w-full'
                  value={draftFilters.destination}
                  options={destinationOptions}
                  placeholder='All Destinations'
                  searchPlaceholder='Search destination...'
                  onChange={value => updateDraftFilter('destination', value)}
                />
              </div>
              <div className='w-full'>
                <label className='mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300'>
                  Status
                </label>
                <SearchableDropdown
                  className='w-full'
                  value={draftFilters.status}
                  options={statusOptions}
                  placeholder='All Statuses'
                  searchPlaceholder='Search status...'
                  onChange={value =>
                    updateDraftFilter('status', value as QuotationFilterState['status'])
                  }
                />
              </div>
              <div className='w-full'>
                <label className='mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300'>
                  SLA
                </label>
                <SearchableDropdown
                  className='w-full'
                  value={draftFilters.sla}
                  options={slaOptions}
                  placeholder='All SLA'
                  searchPlaceholder='Search SLA...'
                  onChange={value =>
                    updateDraftFilter('sla', value as QuotationFilterState['sla'])
                  }
                />
              </div>
              <div className='w-full'>
                <label className='mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300'>
                  Sort By
                </label>
                <SearchableDropdown
                  className='w-full'
                  value={draftFilters.sortBy}
                  options={sortOptions}
                  placeholder='Newest First'
                  searchPlaceholder='Search sort option...'
                  onChange={value =>
                    updateDraftFilter(
                      'sortBy',
                      value as QuotationFilterState['sortBy']
                    )
                  }
                />
              </div>
            </div>

            <div className='flex flex-col-reverse gap-2 sm:flex-row sm:justify-end'>
              {showMobileFilters ? (
                <button
                  type='button'
                  onClick={() => setShowMobileFilters(false)}
                  className='rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700'
                >
                  <span className='inline-flex items-center gap-2'>
                    <FaXmark />
                    Hide Panel
                  </span>
                </button>
              ) : null}
              <button
                type='button'
                onClick={handleResetFilters}
                className='rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700'
              >
                Reset Filters
              </button>
              <button
                type='button'
                onClick={exportCurrentTable}
                disabled={!rows.length}
                className='inline-flex items-center justify-center rounded-xl border border-green-500 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-green-400 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700'
              >
                <FaDownload className='mr-2' />
                <span>Export</span>
              </button>
            </div>
          </div>
        </div>

        {/* Quotations List */}
        <div className='relative'>
          {rows.length === 0 ? (
            hasLoadedOnce && !isFetchingList ? (
              <div className='p-8'>
                <EmptyState
                  title='No quotations found'
                  description='Try different filters or create a new quotation.'
                  icon={<FaFileInvoice className='text-4xl' />}
                />
              </div>
            ) : (
              <div className='p-8 flex justify-center'>
                <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600'></div>
              </div>
            )
          ) : (
            <div className='min-h-[420px] max-h-[62vh] overflow-y-auto'>
            {/* Mobile View - Cards */}
            <div className='block lg:hidden divide-y divide-gray-100 dark:divide-gray-800'>
              {rows.map((q, index) => (
                <div
                  key={q.id}
                  className={`p-4 space-y-3 hover:bg-blue-50/40 dark:hover:bg-gray-800/50 transition-colors ${
                    index !== rows.length - 1
                      ? 'border-b border-gray-100 dark:border-gray-800'
                      : ''
                  }`}
                >
                  {/* Header with Quote Number and Status */}
                  <div className='flex items-start justify-between'>
                    <div className='space-y-1'>
                      <p className='text-sm font-medium text-blue-600 dark:text-blue-400'>
                        {q.quoteNumber}
                      </p>
                      <p className='text-xs text-gray-500'>{q.customer}</p>
                    </div>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${
                        styles[q.status]
                      }`}
                    >
                      {q.status}
                    </span>
                  </div>

                  {/* Destination and Details */}
                  <div className='space-y-1'>
                    <p className='text-sm font-medium text-gray-900 dark:text-gray-100'>
                      {q.destination}
                    </p>
                    <p className='text-xs text-gray-500'>{q.details}</p>
                    {q.templateName ? (
                      <p className='text-[11px] text-blue-600 dark:text-blue-300'>
                        Template: {q.templateCode ? `${q.templateCode} - ` : ''}
                        {q.templateName}
                      </p>
                    ) : null}
                  </div>

                  {/* Email */}
                  <p className='text-xs text-gray-500 truncate'>{q.email}</p>

                  {/* Total and Margin */}
                  <div className='flex items-center justify-between'>
                    <div>
                      <p className='text-sm font-semibold text-gray-900 dark:text-gray-100'>
                        {formatAmountByCurrency(q.total || 0, q.currency)}
                      </p>
                      <p className='text-xs text-green-600 dark:text-green-400'>
                        Margin {q.margin || 0}%
                      </p>
                    </div>
                    <p className='text-xs text-gray-500'>
                      {q.lastSent ?? 'Never Sent'}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className='flex justify-end gap-2 pt-2'>
                    <button
                      onClick={() => handleViewQuotation(q)}
                      className='p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors'
                      title='View'
                    >
                      <FaEye className='text-sm' />
                    </button>
                    {q.status !== 'accepted' && (
                      <button
                        onClick={() => handleEditQuotation(q)}
                        disabled={isMutating}
                        className='p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors disabled:opacity-50'
                        title='Edit quotation'
                      >
                        <FaPencil className='text-sm' />
                      </button>
                    )}
                    <button
                      onClick={() => handleSendWhatsApp(q)}
                      disabled={isMutating}
                      className='p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors disabled:opacity-50'
                      title='Send via WhatsApp'
                    >
                      <FaWhatsapp className='text-sm' />
                    </button>
                    <button
                      onClick={() => rejectQuotation(q)}
                      disabled={isMutating}
                      className='p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50'
                      title='Reject quotation'
                    >
                      <FaCircleXmark className='text-sm' />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop View - Table */}
            <div className='hidden max-w-full leads-table-scroll overflow-x-auto  dark:scrollbar-thumb-gray-700 lg:block'>
              <table className='w-full divide-y divide-gray-200 dark:divide-gray-800'>
                <thead className='sticky top-0 z-10 bg-gray-50 dark:bg-gray-800/95'>
                  <tr>
                    <th className='px-3 xl:px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap'>
                      Quote #
                    </th>
                    <th className='px-3 xl:px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap'>
                      Customer
                    </th>
                    <th className='px-3 xl:px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap'>
                      Destination
                    </th>
                    <th className='px-3 xl:px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap'>
                      Total
                    </th>
                    <th className='px-3 xl:px-5 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap'>
                      Status
                    </th>
                    <th className='px-3 xl:px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap'>
                      Last Sent
                    </th>
                    <th className='px-3 xl:px-5 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap'>
                      SLA
                    </th>
                    <th className='px-3 xl:px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap'>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-gray-100 dark:divide-gray-800'>
                  {rows.map(q => (
                    <tr
                      key={q.id}
                      className='group hover:bg-blue-50/30 dark:hover:bg-gray-800/40 transition-colors'
                    >
                      <td className='px-3 xl:px-5 py-4 text-sm font-medium text-blue-600 dark:text-blue-300 whitespace-nowrap'>
                        {q.quoteNumber}
                      </td>
                      <td className='px-3 xl:px-5 py-4 min-w-[150px] max-w-[200px]'>
                        <p className='text-sm font-medium text-gray-900 dark:text-gray-100 truncate'>
                          {q.customer}
                        </p>
                        <p className='text-xs text-gray-500 truncate'>{q.email}</p>
                      </td>
                      <td className='px-3 xl:px-5 py-4 min-w-[180px] max-w-[250px]'>
                        <p className='text-sm text-gray-800 dark:text-gray-100 truncate'>
                          {q.destination}
                        </p>
                        <p className='text-xs text-gray-500 truncate'>{q.details}</p>
                        {q.templateName ? (
                          <p className='text-[11px] text-blue-600 dark:text-blue-300 truncate'>
                            Template:{' '}
                            {q.templateCode ? `${q.templateCode} - ` : ''}
                            {q.templateName}
                          </p>
                        ) : null}
                      </td>
                      <td className='px-3 xl:px-5 py-4 text-right whitespace-nowrap'>
                        <p className='text-sm font-semibold text-gray-900 dark:text-gray-100'>
                          {formatAmountByCurrency(q.total || 0, q.currency)}
                        </p>
                        <p className='text-xs text-green-600 dark:text-green-400'>
                          Margin {q.margin || 0}%
                        </p>
                      </td>
                      <td className='px-3 xl:px-5 py-4 text-center'>
                        <span
                          className={`rounded-full border px-2.5 py-1 text-xs font-semibold capitalize whitespace-nowrap ${
                            styles[q.status]
                          }`}
                        >
                          {q.status}
                        </span>
                      </td>
                      <td className='px-3 xl:px-5 py-4 text-xs text-gray-500 whitespace-nowrap'>
                        {q.lastSent ?? 'Never Sent'}
                      </td>
                      <td className='px-5 py-4 text-center'>
                        {q.responseCategory ? (
                          <div className='space-y-0.5'>
                            <span
                              className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                q.responseSlaBreached
                                  ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                                  : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                              }`}
                            >
                              {q.responseCategory.replace(/_/g, ' ')}
                            </span>
                            {q.leadToQuoteSentMinutes != null ? (
                              <p className='text-[10px] text-gray-400'>
                                {q.leadToQuoteSentMinutes}m to send
                              </p>
                            ) : null}
                          </div>
                        ) : (
                          <span className='text-[10px] text-gray-400'>—</span>
                        )}
                      </td>
                      <td className='px-5 py-4'>
                        <div className='flex justify-end gap-2 transition-all duration-200'>
                          <button
                            onClick={() => handleViewQuotation(q)}
                            className='rounded-lg border border-gray-200 p-2 text-gray-500 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                            title='View'
                          >
                            <FaEye />
                          </button>
                          {q.status !== 'accepted' && (
                            <button
                              onClick={() => handleEditQuotation(q)}
                              disabled={isMutating}
                              className='rounded-lg border border-gray-200 p-2 text-blue-600 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 disabled:opacity-50'
                              title='Edit quotation'
                            >
                              <FaPencil />
                            </button>
                          )}
                          <button
                            onClick={() => handleSendWhatsApp(q)}
                            disabled={isMutating}
                            className='rounded-lg border border-gray-200 p-2 text-green-600 dark:border-gray-700 hover:bg-green-50 dark:hover:bg-green-900/20 disabled:opacity-50'
                            title='Send via WhatsApp'
                          >
                            <FaWhatsapp />
                          </button>
                          <button
                            onClick={() => rejectQuotation(q)}
                            disabled={isMutating}
                            className='rounded-lg border border-gray-200 p-2 text-red-600 dark:border-gray-700 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50'
                            title='Reject quotation'
                          >
                            <FaCircleXmark />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </div>
          )}

          {/* Pagination */}
          {rows.length > 0 ? (
            <div className='flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-4 border-t border-gray-200 dark:border-gray-800'>
              <p className='text-xs sm:text-sm text-gray-500 dark:text-gray-400 order-2 sm:order-1'>
                Showing {Math.min(filtered.length, (page - 1) * pageSize + 1)}-
                {Math.min(filtered.length, page * pageSize)} of{' '}
                {filtered.length}
              </p>
              <div className='flex items-center gap-2 order-1 sm:order-2'>
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className='p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors'
                >
                  <FaChevronLeft className='text-sm' />
                </button>
                <span className='px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-sm font-medium min-w-[40px] text-center'>
                  {page}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className='p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors'
                >
                  <FaChevronRight className='text-sm' />
                </button>
              </div>
            </div>
          ) : null}

          {isFetchingList && hasLoadedOnce ? (
            <div className='absolute inset-0 z-10 flex items-center justify-center bg-white/60 dark:bg-gray-900/60 backdrop-blur-[1px]'>
              <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600'></div>
            </div>
          ) : null}
        </div>
      </SurfaceCard>
      {rejectModalOpen && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4'>
          <div className='w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-2xl'>
            <div className='flex items-center justify-between border-b border-gray-200 dark:border-gray-800 px-5 py-4'>
              <h3 className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
                Reject Quotation
              </h3>
              <button
                onClick={() => setRejectModalOpen(false)}
                className='p-2 rounded-full text-gray-500 hover:text-gray-800 dark:text-gray-300 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800'
              >
                <FaXmark />
              </button>
            </div>
            <div className='px-5 py-4 space-y-3'>
              <p className='text-sm text-gray-600 dark:text-gray-300'>
                Please provide a reason for rejection.
              </p>
              <textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                rows={3}
                className='w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-800 dark:text-gray-100 px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500'
                placeholder='Reason for rejection'
              />
              {error && (
                <p className='text-sm text-red-500 flex items-center gap-2'>
                  <FaCircleXmark className='text-xs' /> {error}
                </p>
              )}
            </div>
            <div className='flex items-center justify-end gap-2 border-t border-gray-200 dark:border-gray-800 px-5 py-4'>
              <button
                onClick={() => setRejectModalOpen(false)}
                className='px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-gray-100 dark:hover:bg-gray-800'
              >
                Cancel
              </button>
              <button
                onClick={handleRejectSubmit}
                disabled={isMutating}
                className='px-4 py-2 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-700 shadow-sm flex items-center gap-2 disabled:opacity-50'
              >
                {isMutating ? (
                  <>
                    <span className='animate-spin'>⌛</span>
                    Rejecting...
                  </>
                ) : (
                  <>
                    <FaCircleXmark className='text-xs' />
                    Reject
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default QuotationsPage
