import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  FaBell,
  FaCheck,
  FaCheckDouble,
  FaChevronLeft,
  FaChevronRight,
  FaSearch,
  FaSync
} from 'react-icons/fa'
import {
  notificationsApi,
  type NotificationsListQuery
} from '../../api/notifications'
import { bookingsApi } from '../../api/bookings'
import { quotationsApi } from '../../api/quotations'
import { paymentsApi } from '../../api/payments'
import { getApiErrorMessage } from '../../api/apiClient'
import { useNotifications } from '../../context/NotificationsContext'
import type { NotificationItem, NotificationStatus } from '../../types'
import SearchableDropdown from '../../components/ui/SearchableDropdown'

const STATUS_OPTIONS: Array<{ label: string; value: '' | NotificationStatus }> =
  [
    { label: 'All Status', value: '' },
    { label: 'Pending', value: 'PENDING' },
    { label: 'Delivered', value: 'DELIVERED' },
    { label: 'Read', value: 'READ' },
    { label: 'Failed', value: 'FAILED' }
  ]

const LIMIT_OPTIONS = [10, 20, 50]
const EVENT_LABELS: Record<string, string> = {
  'leads.created': 'New lead captured',
  'leads.updated': 'Lead updated',
  'leads.assigned': 'Lead assigned',
  'leads.reassigned': 'Lead reassigned',
  'leads.followup_created': 'Follow-up scheduled',
  'leads.followup_overdue': 'Follow-up overdue',
  'leads.sla_breached': 'First response missed SLA',
  'leads.escalated': 'Lead escalated',
  'quotations.created': 'Quotation created',
  'quotations.updated': 'Quotation updated',
  'quotations.sent': 'Quotation sent',
  'quotations.viewed': 'Quotation viewed',
  'quotations.status_changed': 'Quotation status changed',
  'quotations.reminder_triggered': 'Quotation reminder triggered',
  'bookings.created': 'Booking created',
  'bookings.updated': 'Booking updated',
  'bookings.deadline_alert': 'Booking deadline alert',
  'payments.created': 'Payment recorded',
  'payments.updated': 'Payment updated',
  'refunds.created': 'Refund created',
  'refunds.updated': 'Refund updated',
  'visa.created': 'Visa case created',
  'visa.updated': 'Visa case updated',
  'suppliers.created': 'Supplier created',
  'suppliers.updated': 'Supplier updated',
  'suppliers.payable_created': 'Supplier payable created',
  'suppliers.payable_updated': 'Supplier payable updated',
  'suppliers.payable_deadline_alert': 'Supplier payment deadline alert',
  'webhooks.lead_captured': 'Website lead captured'
}

type LookupEntry = { key: string; label: string }
type LookupBuilder = (
  entity: Record<string, unknown>,
  fallbackKey?: string
) => LookupEntry[]

const createLookupEntries = (
  values: unknown[],
  label: string
): LookupEntry[] => {
  const unique = new Map<string, LookupEntry>()
  values.forEach(value => {
    const key = toPlainText(value)
    if (key && !unique.has(key)) {
      unique.set(key, { key, label })
    }
  })
  return Array.from(unique.values())
}

const addFallbackEntry = (
  entries: LookupEntry[],
  fallbackKey?: string,
  label?: string
) => {
  const fallback = toPlainText(fallbackKey)
  if (fallback && label && !entries.some(entry => entry.key === fallback)) {
    entries.push({ key: fallback, label })
  }
}

const pickNestedValue = (source: unknown, path: string[]): string => {
  let current: unknown = source
  for (const segment of path) {
    if (!current || typeof current !== 'object') return ''
    current = (current as Record<string, unknown>)[segment]
  }
  return toPlainText(current)
}

const buildBookingLookupEntries: LookupBuilder = (booking, fallbackKey) => {
  const bookingId = toPlainText(booking.id)
  const bookingNumber =
    toPlainText(booking.bookingNumber) ||
    toPlainText(booking.booking_number) ||
    toPlainText(booking.code) ||
    (bookingId ? `BK-${bookingId}` : 'Booking')
  const customerName =
    toPlainText(booking.customerName) ||
    toPlainText(booking.customer_name) ||
    pickNestedValue(booking, ['customer', 'name']) ||
    pickNestedValue(booking, ['customer', 'fullName']) ||
    pickNestedValue(booking, ['customer', 'customerName']) ||
    toPlainText(booking.leadName) ||
    toPlainText(booking.lead_name) ||
    pickNestedValue(booking, ['lead', 'name']) ||
    pickNestedValue(booking, ['lead', 'fullName']) ||
    toPlainText(booking.customer) ||
    ''
  const label = customerName ? `${customerName} · ${bookingNumber}` : bookingNumber
  const entries = createLookupEntries(
    [
      booking.id,
      bookingNumber,
      booking.bookingNumber,
      booking.booking_number,
      booking.code
    ],
    label
  )
  addFallbackEntry(entries, fallbackKey, label)
  return entries
}

const buildQuotationLookupEntries: LookupBuilder = (quotation, fallbackKey) => {
  const quoteNumber =
    toPlainText(quotation.quotationNumber) ||
    toPlainText(quotation.quotation_number) ||
    toPlainText(quotation.quoteNumber) ||
    toPlainText(quotation.quote_number) ||
    toPlainText(quotation.code) ||
    (toPlainText(quotation.id) ? `QT-${toPlainText(quotation.id)}` : 'Quotation')
  const customerName =
    toPlainText(quotation.customerName) ||
    toPlainText(quotation.customer_name) ||
    pickNestedValue(quotation, ['customer', 'name']) ||
    pickNestedValue(quotation, ['customer', 'fullName']) ||
    toPlainText(quotation.leadName) ||
    toPlainText(quotation.lead_name) ||
    pickNestedValue(quotation, ['lead', 'name']) ||
    pickNestedValue(quotation, ['lead', 'fullName']) ||
    toPlainText(quotation.customer) ||
    ''
  const label = customerName ? `${customerName} · ${quoteNumber}` : quoteNumber
  const entries = createLookupEntries(
    [
      quotation.id,
      quoteNumber,
      quotation.quotationNumber,
      quotation.quotation_number,
      quotation.quoteNumber,
      quotation.quote_number,
      quotation.code
    ],
    label
  )
  addFallbackEntry(entries, fallbackKey, label)
  return entries
}

const buildPaymentLookupEntries: LookupBuilder = (payment, fallbackKey) => {
  const referenceId =
    toPlainText(payment.paymentReference) ||
    toPlainText(payment.payment_reference) ||
    toPlainText(payment.gatewayPaymentId) ||
    toPlainText(payment.gateway_payment_id) ||
    toPlainText(payment.id) ||
    'Payment'
  const customerName =
    toPlainText(payment.customerName) ||
    toPlainText(payment.customer_name) ||
    pickNestedValue(payment, ['customer', 'name']) ||
    pickNestedValue(payment, ['customer', 'fullName']) ||
    pickNestedValue(payment, ['booking', 'customer', 'name']) ||
    pickNestedValue(payment, ['booking', 'customer', 'fullName']) ||
    pickNestedValue(payment, ['booking', 'customerName']) ||
    ''
  const label = customerName ? `${customerName} · ${referenceId}` : referenceId
  const entries = createLookupEntries(
    [
      payment.id,
      referenceId,
      payment.paymentReference,
      payment.payment_reference,
      payment.gatewayPaymentId,
      payment.gateway_payment_id
    ],
    label
  )
  addFallbackEntry(entries, fallbackKey, label)
  return entries
}

const mergeLookupEntries = (
  existing: LookupEntry[],
  incoming: LookupEntry[]
): LookupEntry[] => {
  if (!incoming.length) return existing
  const merged = new Map(existing.map(entry => [entry.key, entry.label]))
  incoming.forEach(entry => {
    if (entry.key) merged.set(entry.key, entry.label)
  })
  return Array.from(merged.entries()).map(([key, label]) => ({ key, label }))
}

const unwrapEntity = <T,>(response: unknown): T | null => {
  if (!response) return null
  if (typeof response === 'object' && response && 'data' in response) {
    return ((response as { data?: T }).data ?? null) as T | null
  }
  return (response as T) ?? null
}

const collectEntityIds = (items: NotificationItem[]) => {
  const bookingIds = new Set<string>()
  const quotationIds = new Set<string>()
  const paymentIds = new Set<string>()

  items.forEach(notification => {
    const payload = (notification.payload || {}) as Record<string, unknown>
    const eventName = toPlainText(notification.eventName).toLowerCase()
    const entityType = toPlainText(notification.entityType).toLowerCase()
    const add = (set: Set<string>, value: unknown) => {
      const key = toPlainText(value)
      if (key) set.add(key)
    }

    const looksLikeBooking =
      entityType.includes('booking') ||
      eventName.startsWith('bookings.') ||
      Boolean(payload.bookingId || payload.bookingNumber)
    const looksLikeQuotation =
      entityType.includes('quotation') ||
      eventName.startsWith('quotations.') ||
      Boolean(
        payload.quotationId || payload.quotationNumber || payload.quoteNumber
      )
    const looksLikePayment =
      entityType.includes('payment') ||
      eventName.startsWith('payments.') ||
      Boolean(payload.paymentId || payload.paymentReference)

    if (looksLikeBooking) {
      add(bookingIds, notification.entityId)
      add(bookingIds, payload.bookingId)
      add(bookingIds, payload.bookingNumber)
      add(bookingIds, payload.booking_code)
      add(bookingIds, payload.code)
    }
    if (looksLikeQuotation) {
      add(quotationIds, notification.entityId)
      add(quotationIds, payload.quotationId)
      add(quotationIds, payload.quotationNumber)
      add(quotationIds, payload.quoteNumber)
      add(quotationIds, payload.code)
    }
    if (looksLikePayment) {
      add(paymentIds, notification.entityId)
      add(paymentIds, payload.paymentId)
      add(paymentIds, payload.paymentReference)
      add(paymentIds, payload.gatewayPaymentId)
      add(paymentIds, payload.gateway_payment_id)
    }
  })

  return { bookingIds, quotationIds, paymentIds }
}

const fetchLookupEntriesByIds = async (
  ids: string[],
  fetcher: (id: string) => Promise<unknown>,
  builder: LookupBuilder
): Promise<LookupEntry[]> => {
  if (!ids.length) return []
  const responses = await Promise.all(
    ids.map(async id => {
      try {
        const response = await fetcher(id)
        return { response, sourceId: id }
      } catch (error) {
        console.warn('Failed to fetch lookup entity', id, error)
        return null
      }
    })
  )

  const entries: LookupEntry[] = []
  responses.forEach(result => {
    if (!result) return
    const entity = unwrapEntity<Record<string, unknown>>(result.response)
    if (!entity) return
    entries.push(...builder(entity, result.sourceId))
  })
  return entries
}

const toPlainText = (value: unknown, fallback = ''): string => {
  if (typeof value === 'string') return value.trim() || fallback
  if (typeof value === 'number' || typeof value === 'boolean')
    return String(value)
  if (Array.isArray(value)) {
    const joined = value
      .map(item => toPlainText(item))
      .filter(Boolean)
      .join(', ')
    return joined || fallback
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>
    const preferred = [
      record.title,
      record.name,
      record.message,
      record.label,
      record.id
    ]
      .map(item => toPlainText(item))
      .find(Boolean)
    if (preferred) return preferred
    try {
      return JSON.stringify(value)
    } catch {
      return fallback
    }
  }
  return fallback
}

const toTitle = (notification: NotificationItem) => {
  const title = toPlainText(notification.title)
  if (title) return title
  return toPlainText(notification.eventName, 'Notification')
    .split('.')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

const shortId = (value?: string | null) => {
  const normalized = toPlainText(value)
  if (!normalized) return ''
  return normalized.length > 10 ? `${normalized.slice(0, 8)}...` : normalized
}

const toModule = (notification: NotificationItem) => {
  const eventName = toPlainText(notification.eventName)
  const source =
    toPlainText(notification.entityType) || eventName.split('.')[0] || 'general'
  return source
    .split(/[_\s.-]+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

const extractList = (response: unknown) => {
  const payload = response as any
  const data = payload?.data?.data ?? payload?.data ?? payload ?? []
  return Array.isArray(data) ? data : []
}

const toEntityLabel = (notification: NotificationItem) => {
  const payload = (notification.payload || {}) as Record<string, unknown>
  const candidates = [
    payload.fullName,
    payload.customerName,
    payload.leadName,
    payload.supplierName,
    payload.consultantName,
    payload.bookingNumber,
    payload.quotationNumber,
    payload.quoteNumber,
    payload.paymentReference,
    payload.refundReference,
    payload.country,
    payload.name
  ]
    .map(item => toPlainText(item))
    .filter(Boolean)

  if (candidates.length) {
    return candidates[0]
  }

  const entityId = toPlainText(notification.entityId)
  if (!entityId) return ''
  return `${toModule(notification)} ${shortId(entityId)}`
}

const toFriendlyTitle = (notification: NotificationItem) => {
  const eventName = toPlainText(notification.eventName).toLowerCase()
  return EVENT_LABELS[eventName] || toTitle(notification)
}

const toFriendlyMessage = (notification: NotificationItem) => {
  const rawMessage = toPlainText(notification.message)
  const eventName = toPlainText(notification.eventName).toLowerCase()
  const entityLabel = toEntityLabel(notification)
  const payload = (notification.payload || {}) as Record<string, unknown>

  if (rawMessage && !/event for/i.test(rawMessage)) {
    return rawMessage
  }

  switch (eventName) {
    case 'leads.followup_overdue':
      return entityLabel
        ? `${entityLabel} needs attention because a scheduled follow-up is overdue.`
        : 'A scheduled lead follow-up is overdue and needs attention.'
    case 'leads.sla_breached':
      return entityLabel
        ? `${entityLabel} did not receive first contact inside the 15-minute response target.`
        : 'A lead missed the 15-minute first-response target.'
    case 'leads.followup_created':
      return entityLabel
        ? `A new follow-up has been scheduled for ${entityLabel}.`
        : 'A new lead follow-up has been scheduled.'
    case 'bookings.deadline_alert':
      return entityLabel
        ? `${entityLabel} has a booking deadline that needs review.`
        : 'A booking deadline needs review.'
    case 'suppliers.payable_deadline_alert': {
      const dueInDays = Number(payload.dueInDays)
      if (Number.isFinite(dueInDays) && dueInDays < 0) {
        return entityLabel
          ? `${entityLabel} has a supplier payable that is already overdue.`
          : 'A supplier payable is already overdue.'
      }
      return entityLabel
        ? `${entityLabel} has a supplier payment deadline coming up soon.`
        : 'A supplier payment deadline is coming up soon.'
    }
    default:
      if (entityLabel) {
        return `${toFriendlyTitle(notification)} for ${entityLabel}.`
      }
      return rawMessage || 'A new CRM event has been recorded.'
  }
}

const formatDateTime = (value?: string | null) => {
  const text = toPlainText(value, 'Unknown time')
  if (!text || text === 'Unknown time') return 'Unknown time'
  const date = new Date(text)
  if (Number.isNaN(date.getTime())) return text
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date)
}

const formatRelativeTime = (value?: string | null) => {
  const text = toPlainText(value)
  if (!text) return ''
  const date = new Date(text)
  if (Number.isNaN(date.getTime())) return ''

  const diffMs = date.getTime() - Date.now()
  const diffMinutes = Math.round(diffMs / (60 * 1000))
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

  if (Math.abs(diffMinutes) < 60) {
    return rtf.format(diffMinutes, 'minute')
  }
  const diffHours = Math.round(diffMinutes / 60)
  if (Math.abs(diffHours) < 24) {
    return rtf.format(diffHours, 'hour')
  }
  const diffDays = Math.round(diffHours / 24)
  return rtf.format(diffDays, 'day')
}

const getStatusTone = (status: NotificationStatus) => {
  if (status === 'READ') {
    return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
  }
  if (status === 'FAILED') {
    return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
  }
  if (status === 'DELIVERED') {
    return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
  }
  return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
}

const NotificationsPage: React.FC = () => {
  const { refresh: refreshGlobalNotifications } = useNotifications()
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [actionLoadingId, setActionLoadingId] = useState('')
  const [actionLoadingAll, setActionLoadingAll] = useState(false)
  const [error, setError] = useState('')
  const [statusFilter, setStatusFilter] = useState<'' | NotificationStatus>('')
  const [moduleFilter, setModuleFilter] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [total, setTotal] = useState(0)
  const [bookingLookups, setBookingLookups] = useState<
    { key: string; label: string }[]
  >([])
  const [quotationLookups, setQuotationLookups] = useState<
    { key: string; label: string }[]
  >([])
  const [paymentLookups, setPaymentLookups] = useState<
    { key: string; label: string }[]
  >([])

  const bookingById = useMemo(
    () => new Map(bookingLookups.map(item => [item.key, item.label])),
    [bookingLookups]
  )
  const quotationById = useMemo(
    () => new Map(quotationLookups.map(item => [item.key, item.label])),
    [quotationLookups]
  )
  const paymentById = useMemo(
    () => new Map(paymentLookups.map(item => [item.key, item.label])),
    [paymentLookups]
  )

  const loadNotifications = useCallback(
    async (options?: { silent?: boolean }) => {
      const isSilent = options?.silent === true
      if (isSilent) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      setError('')

      try {
        const params: NotificationsListQuery = {
          page,
          limit,
          status: statusFilter || undefined
        }
        const [listResponse, unreadResponse] = await Promise.all([
          notificationsApi.list(params),
          notificationsApi.unreadCount()
        ])

        setNotifications(
          Array.isArray(listResponse.data?.items) ? listResponse.data.items : []
        )
        setUnreadCount(
          Number(
            unreadResponse.data?.unreadCount ??
              listResponse.data?.unreadCount ??
              0
          )
        )
        setTotal(Number(listResponse.data?.pagination?.total ?? 0))
      } catch (err) {
        setNotifications([])
        setUnreadCount(0)
        setTotal(0)
        setError(getApiErrorMessage(err, 'Failed to load notifications.'))
      } finally {
        if (isSilent) {
          setRefreshing(false)
        } else {
          setLoading(false)
        }
      }
    },
    [limit, page, statusFilter]
  )

  useEffect(() => {
    void loadNotifications()
  }, [loadNotifications])

  useEffect(() => {
    const interval = setInterval(() => {
      void loadNotifications({ silent: true })
    }, 30000)
    return () => clearInterval(interval)
  }, [loadNotifications])
  useEffect(() => {
    let cancelled = false
    const loadLookups = async () => {
      try {
        const [bookingsRes, quotationsRes, paymentsRes] = await Promise.all([
          bookingsApi.list({ page: 1, limit: 300 }),
          quotationsApi.list({ page: 1, limit: 300 }),
          paymentsApi.list({ page: 1, limit: 300 })
        ])
        const bookings = extractList(bookingsRes) as Record<string, unknown>[]
        const quotations = extractList(quotationsRes) as Record<
          string,
          unknown
        >[]
        const payments = extractList(paymentsRes) as Record<string, unknown>[]
        if (cancelled) return
        setBookingLookups(prev =>
          mergeLookupEntries(
            prev,
            bookings.flatMap(booking => buildBookingLookupEntries(booking))
          )
        )
        setQuotationLookups(prev =>
          mergeLookupEntries(
            prev,
            quotations.flatMap(quotation =>
              buildQuotationLookupEntries(quotation)
            )
          )
        )
        setPaymentLookups(prev =>
          mergeLookupEntries(
            prev,
            payments.flatMap(payment => buildPaymentLookupEntries(payment))
          )
        )
      } catch (err) {
        console.error('Failed to load notification lookups:', err)
      }
    }

    void loadLookups()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!notifications.length) return
    let cancelled = false

    const resolveMissingEntities = async () => {
      const { bookingIds, quotationIds, paymentIds } =
        collectEntityIds(notifications)
      const missingBookings = Array.from(bookingIds).filter(
        id => id && !bookingById.has(id)
      )
      const missingQuotations = Array.from(quotationIds).filter(
        id => id && !quotationById.has(id)
      )
      const missingPayments = Array.from(paymentIds).filter(
        id => id && !paymentById.has(id)
      )

      if (
        missingBookings.length === 0 &&
        missingQuotations.length === 0 &&
        missingPayments.length === 0
      ) {
        return
      }

      try {
        const [bookingEntries, quotationEntries, paymentEntries] =
          await Promise.all([
            fetchLookupEntriesByIds(
              missingBookings,
              bookingsApi.getById,
              buildBookingLookupEntries
            ),
            fetchLookupEntriesByIds(
              missingQuotations,
              quotationsApi.getById,
              buildQuotationLookupEntries
            ),
            fetchLookupEntriesByIds(
              missingPayments,
              paymentsApi.getById,
              buildPaymentLookupEntries
            )
          ])

        if (cancelled) return

        if (bookingEntries.length) {
          setBookingLookups(prev => mergeLookupEntries(prev, bookingEntries))
        }
        if (quotationEntries.length) {
          setQuotationLookups(prev =>
            mergeLookupEntries(prev, quotationEntries)
          )
        }
        if (paymentEntries.length) {
          setPaymentLookups(prev => mergeLookupEntries(prev, paymentEntries))
        }
      } catch (err) {
        console.error('Failed to resolve notification entities:', err)
      }
    }

    void resolveMissingEntities()
    return () => {
      cancelled = true
    }
  }, [notifications, bookingById, paymentById, quotationById])

  const modules = useMemo(
    () => Array.from(new Set(notifications.map(item => toModule(item)))).sort(),
    [notifications]
  )

  const statusFilterOptions = STATUS_OPTIONS.map(option => ({
    value: option.value,
    label: option.label
  }))
  const moduleFilterOptions = [
    { value: '', label: 'All Modules' },
    ...modules.map(module => ({ value: module, label: module }))
  ]
  const limitFilterOptions = LIMIT_OPTIONS.map(value => ({
    value: String(value),
    label: `${value} / page`
  }))

  const resolveEntityLabel = useCallback(
    (notification: NotificationItem) => {
      const payload = (notification.payload || {}) as Record<string, unknown>
      const eventName = toPlainText(notification.eventName).toLowerCase()
      const entityType = toPlainText(notification.entityType).toLowerCase()
      const entityId =
        toPlainText(notification.entityId) ||
        toPlainText(payload.bookingId) ||
        toPlainText(payload.bookingNumber) ||
        toPlainText(payload.quotationId) ||
        toPlainText(payload.quotationNumber) ||
        toPlainText(payload.quoteNumber) ||
        toPlainText(payload.paymentId) ||
        toPlainText(payload.paymentReference)

      if (entityId) {
        if (
          entityType.includes('booking') ||
          eventName.startsWith('bookings.') ||
          payload.bookingId ||
          payload.bookingNumber
        ) {
          const label = bookingById.get(entityId)
          if (label) return label
        }
        if (
          entityType.includes('quotation') ||
          eventName.startsWith('quotations.') ||
          payload.quotationId ||
          payload.quotationNumber ||
          payload.quoteNumber
        ) {
          const label = quotationById.get(entityId)
          if (label) return label
        }
        if (
          entityType.includes('payment') ||
          eventName.startsWith('payments.') ||
          payload.paymentId ||
          payload.paymentReference
        ) {
          const label = paymentById.get(entityId)
          if (label) return label
        }
      }

      return toEntityLabel(notification)
    },
    [bookingById, paymentById, quotationById]
  )

  const toFriendlyMessageLocal = useCallback(
    (notification: NotificationItem) => {
      const rawMessage = toPlainText(notification.message)
      const eventName = toPlainText(notification.eventName).toLowerCase()
      const entityLabel = resolveEntityLabel(notification)
      const payload = (notification.payload || {}) as Record<string, unknown>

      if (rawMessage && !/event for/i.test(rawMessage)) {
        return rawMessage
      }

      switch (eventName) {
        case 'leads.followup_overdue':
          return entityLabel
            ? `${entityLabel} needs attention because a scheduled follow-up is overdue.`
            : 'A scheduled lead follow-up is overdue and needs attention.'
        case 'leads.sla_breached':
          return entityLabel
            ? `${entityLabel} did not receive first contact inside the 15-minute response target.`
            : 'A lead missed the 15-minute first-response target.'
        case 'leads.followup_created':
          return entityLabel
            ? `A new follow-up has been scheduled for ${entityLabel}.`
            : 'A new lead follow-up has been scheduled.'
        case 'bookings.deadline_alert':
          return entityLabel
            ? `${entityLabel} has a booking deadline that needs review.`
            : 'A booking deadline needs review.'
        case 'suppliers.payable_deadline_alert': {
          const dueInDays = Number(payload.dueInDays)
          if (Number.isFinite(dueInDays) && dueInDays < 0) {
            return entityLabel
              ? `${entityLabel} has a supplier payable that is already overdue.`
              : 'A supplier payable is already overdue.'
          }
          return entityLabel
            ? `${entityLabel} has a supplier payment deadline coming up soon.`
            : 'A supplier payment deadline is coming up soon.'
        }
        default:
          if (entityLabel) {
            return `${toFriendlyTitle(notification)} for ${entityLabel}.`
          }
          return toFriendlyTitle(notification)
      }
    },
    [resolveEntityLabel]
  )

  const filteredNotifications = useMemo(() => {
    return notifications.filter(notification => {
      const matchesModule =
        !moduleFilter || toModule(notification) === moduleFilter
      const searchValue = searchTerm.trim().toLowerCase()
      if (!searchValue) return matchesModule

      const haystack = [
        toFriendlyTitle(notification),
        toFriendlyMessageLocal(notification),
        resolveEntityLabel(notification),
        toPlainText(notification.entityType),
        toPlainText(notification.entityId),
        toPlainText(notification.eventName),
        toPlainText(notification.channel)
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      return matchesModule && haystack.includes(searchValue)
    })
  }, [
    moduleFilter,
    notifications,
    resolveEntityLabel,
    searchTerm,
    toFriendlyMessageLocal
  ])

  const statusBreakdown = useMemo(() => {
    return notifications.reduce(
      (accumulator, item) => {
        accumulator[item.status] = (accumulator[item.status] || 0) + 1
        return accumulator
      },
      { PENDING: 0, DELIVERED: 0, READ: 0, FAILED: 0 } as Record<
        NotificationStatus,
        number
      >
    )
  }, [notifications])

  const totalPages = Math.max(1, Math.ceil(total / limit))

  const handleRefresh = async () => {
    await loadNotifications({ silent: true })
    await refreshGlobalNotifications()
  }

  const handleMarkRead = async (id: string) => {
    setActionLoadingId(id)
    try {
      await notificationsApi.markRead(id)
      await Promise.all([
        loadNotifications({ silent: true }),
        refreshGlobalNotifications()
      ])
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to mark notification as read.'))
    } finally {
      setActionLoadingId('')
    }
  }

  const handleMarkAllRead = async () => {
    setActionLoadingAll(true)
    try {
      await notificationsApi.markAllRead()
      await Promise.all([
        loadNotifications({ silent: true }),
        refreshGlobalNotifications()
      ])
    } catch (err) {
      setError(
        getApiErrorMessage(err, 'Failed to mark all notifications as read.')
      )
    } finally {
      setActionLoadingAll(false)
    }
  }

  return (
    <main className='flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-950'>
      <div className='mx-auto max-w-9xl px-0 py-4 sm:py-6 lg:py-8'>
        <div className='mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
          <div className='flex items-center gap-3'>
            <FaBell className='text-2xl text-blue-600 dark:text-blue-400' />
            <div>
              <h1 className='text-xl font-bold text-gray-900 dark:text-gray-100 sm:text-2xl'>
                Notifications
              </h1>
              <p className='text-xs text-gray-500 dark:text-gray-400 sm:text-sm'>
                Action feed for CRM events, reminders, escalations, and
                operational alerts.
              </p>
            </div>
          </div>

          <div className='flex flex-col gap-3 sm:flex-row sm:items-center'>
            <span className='flex items-center justify-center gap-2 rounded-lg bg-blue-100 px-3 py-2 text-sm font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-200'>
              <FaBell className='text-xs' />
              {unreadCount} unread
            </span>
            <button
              onClick={() => void handleRefresh()}
              disabled={loading || refreshing}
              className='flex items-center justify-center gap-2 rounded-lg bg-gray-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50'
            >
              <FaSync className={refreshing ? 'animate-spin' : ''} />
              Refresh
            </button>
            <button
              onClick={() => void handleMarkAllRead()}
              disabled={loading || actionLoadingAll || unreadCount === 0}
              className='flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50'
            >
              <FaCheckDouble />
              Mark all read
            </button>
          </div>
        </div>

        {error ? (
          <div className='mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/30 dark:text-red-200'>
            {error}
          </div>
        ) : null}

        <div className='mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800'>
          <div className='flex flex-col gap-4 lg:flex-row lg:items-center'>
            <div className='relative flex-1'>
              <FaSearch className='absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400' />
              <input
                type='text'
                placeholder='Search title, message, entity, event...'
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className='w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-gray-900 placeholder-gray-500 focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400'
              />
            </div>

            <div className='flex flex-col gap-3 sm:flex-row'>
              <SearchableDropdown
                value={statusFilter}
                onChange={value => {
                  setStatusFilter(value as '' | NotificationStatus)
                  setPage(1)
                }}
                options={statusFilterOptions}
                className='min-w-[140px]'
                searchPlaceholder='Search status...'
              />

              <SearchableDropdown
                value={moduleFilter}
                onChange={setModuleFilter}
                options={moduleFilterOptions}
                className='min-w-[150px]'
                searchPlaceholder='Search module...'
              />

              <SearchableDropdown
                value={String(limit)}
                onChange={value => {
                  setLimit(Number(value))
                  setPage(1)
                }}
                options={limitFilterOptions}
                className='min-w-[120px]'
                searchPlaceholder='Search page size...'
              />
            </div>
          </div>
        </div>

        <div className='mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200'>
          Notifications are stored as history. Marking them as read removes them
          from unread count, but old rows are not deleted automatically. A very
          high count usually means scheduler events have been accumulating over
          time.
        </div>

        <div className='mb-6 rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800'>
          {loading ? (
            <div className='p-8 text-center text-sm text-gray-500 dark:text-gray-400'>
              Loading notifications...
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className='p-8 text-center sm:p-12'>
              <div className='mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700'>
                <FaBell className='h-6 w-6 text-gray-400 dark:text-gray-500' />
              </div>
              <h3 className='mb-2 text-base font-medium text-gray-900 dark:text-gray-100 sm:text-lg'>
                {searchTerm || moduleFilter
                  ? 'No matching notifications'
                  : 'No notifications found'}
              </h3>
              <p className='text-sm text-gray-500 dark:text-gray-400'>
                {searchTerm || moduleFilter
                  ? 'Try adjusting your search or module filter.'
                  : 'No notifications are available for the selected status yet.'}
              </p>
            </div>
          ) : (
            <div className='divide-y divide-gray-200 dark:divide-gray-700'>
              {filteredNotifications.map(notification => {
                const isRead = notification.status === 'READ'
                const module = toModule(notification)
                const title = toFriendlyTitle(notification)
                const body = toFriendlyMessageLocal(notification)
                const entityLabel = resolveEntityLabel(notification)
                const relativeTime = formatRelativeTime(notification.createdAt)

                return (
                  <div
                    key={notification.id}
                    className={`p-4 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 sm:p-6 ${
                      !isRead
                        ? 'border-l-4 border-l-blue-500 bg-blue-50/40 dark:bg-blue-900/10'
                        : ''
                    }`}
                  >
                    <div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
                      <div className='min-w-0 flex-1'>
                        <div className='mb-2 flex flex-wrap items-center gap-2 text-xs'>
                          <span className='rounded-full bg-gray-100 px-2 py-1 font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300'>
                            {module}
                          </span>
                          <span
                            className={`rounded-full px-2 py-1 font-medium ${getStatusTone(
                              notification.status
                            )}`}
                          >
                            {notification.status}
                          </span>
                          <span className='text-gray-500 dark:text-gray-400'>
                            {formatDateTime(notification.createdAt)}
                          </span>
                          {relativeTime ? (
                            <span className='text-gray-400 dark:text-gray-500'>
                              {relativeTime}
                            </span>
                          ) : null}
                        </div>

                        <h3 className='text-sm font-semibold text-gray-900 dark:text-gray-100'>
                          {title}
                        </h3>

                        <p className='mt-2 text-sm text-gray-600 dark:text-gray-300'>
                          {body}
                        </p>

                        <div className='mt-3 flex flex-wrap gap-2 text-xs'>
                          {entityLabel ? (
                            <span className='rounded-full bg-slate-100 px-2 py-1 text-slate-700 dark:bg-slate-800 dark:text-slate-200'>
                              {entityLabel}
                            </span>
                          ) : null}
                          {notification.recipientRole ? (
                            <span className='rounded-full bg-gray-100 px-2 py-1 text-gray-600 dark:bg-gray-800 dark:text-gray-300'>
                              Role: {notification.recipientRole}
                            </span>
                          ) : null}
                          {notification.lastError ? (
                            <span className='rounded-full bg-red-100 px-2 py-1 text-red-700 dark:bg-red-900/30 dark:text-red-200'>
                              Error: {toPlainText(notification.lastError)}
                            </span>
                          ) : null}
                        </div>

                        <details className='mt-3 text-xs text-gray-500 dark:text-gray-400'>
                          <summary className='cursor-pointer select-none font-medium text-gray-600 dark:text-gray-300'>
                            Technical details
                          </summary>
                          <div className='mt-2 flex flex-wrap gap-x-4 gap-y-2'>
                            <span>
                              Event:{' '}
                              {toPlainText(notification.eventName, 'Unknown')}
                            </span>
                            <span>
                              Channel:{' '}
                              {toPlainText(notification.channel, 'Unknown')}
                            </span>
                            {toPlainText(notification.entityId) ? (
                              <span>
                                Entity ID: {toPlainText(notification.entityId)}
                              </span>
                            ) : null}
                          </div>
                        </details>
                      </div>

                      {!isRead ? (
                        <button
                          onClick={() => void handleMarkRead(notification.id)}
                          disabled={actionLoadingId === notification.id}
                          className='flex items-center justify-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-900/20 dark:text-blue-300 dark:hover:bg-blue-900/30'
                        >
                          <FaCheck />
                          {actionLoadingId === notification.id
                            ? 'Updating...'
                            : 'Mark read'}
                        </button>
                      ) : null}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className='rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800'>
          <div className='flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between'>
            <div className='grid grid-cols-2 gap-4 text-center md:grid-cols-4'>
              <div>
                <div className='text-xl font-bold text-gray-900 dark:text-gray-100'>
                  {total}
                </div>
                <div className='text-xs text-gray-500 dark:text-gray-400'>
                  Total
                </div>
              </div>
              <div>
                <div className='text-xl font-bold text-blue-600 dark:text-blue-400'>
                  {unreadCount}
                </div>
                <div className='text-xs text-gray-500 dark:text-gray-400'>
                  Unread
                </div>
              </div>
              <div>
                <div className='text-xl font-bold text-green-600 dark:text-green-400'>
                  {statusBreakdown.READ}
                </div>
                <div className='text-xs text-gray-500 dark:text-gray-400'>
                  Read
                </div>
              </div>
              <div>
                <div className='text-xl font-bold text-purple-600 dark:text-purple-400'>
                  {statusBreakdown.PENDING + statusBreakdown.FAILED}
                </div>
                <div className='text-xs text-gray-500 dark:text-gray-400'>
                  Needs Attention
                </div>
              </div>
            </div>

            <div className='flex items-center justify-end gap-3'>
              <button
                onClick={() => setPage(current => Math.max(1, current - 1))}
                disabled={page <= 1 || loading}
                className='inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-700'
              >
                <FaChevronLeft />
                Previous
              </button>
              <span className='text-sm text-gray-600 dark:text-gray-300'>
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() =>
                  setPage(current => Math.min(totalPages, current + 1))
                }
                disabled={page >= totalPages || loading}
                className='inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-700'
              >
                Next
                <FaChevronRight />
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

export default NotificationsPage













