const CACHE_TTL_MS = 5 * 60 * 1000

export type BookingsPageStats = {
  totalBookings: number
  activeBookings: number
  pendingBookings: number
  completedBookings: number
  cancelledBookings: number
  totalRevenue: number
  pendingPaymentsAmount: number
  pendingPaymentsCount: number
  currency?: string
}

export type CachedBookingRow = {
  id: string
  bookingId: string
  customer: string
  email?: string
  phone?: string
  consultant?: string
  destination: string
  dates: string
  startDate?: string
  endDate?: string
  createdAt?: string | null
  leadCreatedAt?: string | null
  status: 'confirmed' | 'pending' | 'cancelled'
  payment: 'partial' | 'unpaid' | 'paid' | 'refunded'
  paid: number
  total: number
  currency?: string
  documentsReady: number
  documentsTotal: number
  deadlineRiskLevel?: 'SAFE' | 'D2_DUE' | 'DEADLINE_DUE' | 'OVERDUE'
  blockingDeadlineAt?: string | null
  balanceDueBy?: string | null
  supplierPaymentDeadlineAt?: string | null
  cancellationDeadlineAt?: string | null
}

type PageCache = {
  items: CachedBookingRow[]
  stats: BookingsPageStats
  fetchedAt: number
}

let pageCache: PageCache | null = null

export function isBookingsPageCacheFresh(): boolean {
  return Boolean(pageCache && Date.now() - pageCache.fetchedAt < CACHE_TTL_MS)
}

export function getBookingsPageCache(): PageCache | null {
  if (!isBookingsPageCacheFresh()) {
    return null
  }
  return pageCache
}

const emptyStats = (): BookingsPageStats => ({
  totalBookings: 0,
  activeBookings: 0,
  pendingBookings: 0,
  completedBookings: 0,
  cancelledBookings: 0,
  totalRevenue: 0,
  pendingPaymentsAmount: 0,
  pendingPaymentsCount: 0,
  currency: "AED",
})

export function setBookingsPageCache(items: CachedBookingRow[], stats: BookingsPageStats) {
  pageCache = { items, stats, fetchedAt: Date.now() }
}

export function patchBookingsPageCache(partial: {
  items?: CachedBookingRow[]
  stats?: BookingsPageStats
}) {
  const current = pageCache ?? {
    items: [],
    stats: emptyStats(),
    fetchedAt: 0,
  }
  pageCache = {
    items: partial.items ?? current.items,
    stats: partial.stats ?? current.stats,
    fetchedAt: Date.now(),
  }
}

export function normalizeBookingApiStats(response: unknown): BookingsPageStats {
  const data =
    (response as { data?: { data?: Record<string, unknown> } })?.data?.data ??
    (response as { data?: Record<string, unknown> })?.data ??
    (response as Record<string, unknown>) ??
    {}

  return {
    totalBookings: Number(data.totalBookings ?? data.total_bookings ?? 0) || 0,
    activeBookings: Number(data.activeBookings ?? data.active_bookings ?? 0) || 0,
    pendingBookings:
      Number(data.pendingBookings ?? data.pending_bookings ?? 0) || 0,
    completedBookings:
      Number(data.completedBookings ?? data.completed_bookings ?? 0) || 0,
    cancelledBookings:
      Number(data.cancelledBookings ?? data.cancelled_bookings ?? 0) || 0,
    totalRevenue: Number(data.totalRevenue ?? data.total_revenue ?? 0) || 0,
    pendingPaymentsAmount:
      Number(data.pendingPaymentsAmount ?? data.pending_payments_amount ?? 0) ||
      0,
    pendingPaymentsCount:
      Number(data.pendingPaymentsCount ?? data.pending_payments_count ?? 0) || 0,
    currency:
      typeof data.currency === "string" && data.currency.trim()
        ? data.currency.trim().toUpperCase()
        : "AED",
  }
}

export function invalidateBookingsPageCache() {
  pageCache = null
}

export function invalidateBookingsFormDropdownCaches() {
  quotationOptionsCache = null
  supplierOptionsCache = null
}

const CREATE_MODAL_OPEN_KEY = 'crm:bookings-create-open'
const CREATE_DRAFT_KEY = 'crm:bookings-create-draft'

export type BookingsCreateFormDraft = {
  formData: Record<string, unknown>
  selectedQuotationId: string
}

export function readBookingsCreateModalOpen(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return sessionStorage.getItem(CREATE_MODAL_OPEN_KEY) === '1'
  } catch {
    return false
  }
}

export function writeBookingsCreateModalOpen(open: boolean) {
  if (typeof window === 'undefined') return
  try {
    if (open) {
      sessionStorage.setItem(CREATE_MODAL_OPEN_KEY, '1')
    } else {
      sessionStorage.removeItem(CREATE_MODAL_OPEN_KEY)
    }
  } catch {
    /* ignore */
  }
}

export function readBookingsCreateDraft(): BookingsCreateFormDraft | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(CREATE_DRAFT_KEY)
    if (!raw) return null
    return JSON.parse(raw) as BookingsCreateFormDraft
  } catch {
    return null
  }
}

export function writeBookingsCreateDraft(draft: BookingsCreateFormDraft) {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(CREATE_DRAFT_KEY, JSON.stringify(draft))
  } catch {
    /* ignore */
  }
}

export function clearBookingsCreateDraft() {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.removeItem(CREATE_DRAFT_KEY)
    sessionStorage.removeItem(CREATE_MODAL_OPEN_KEY)
  } catch {
    /* ignore */
  }
}

export type QuoteOptionCache = {
  id: string
  value: string
  label: string
  selectedLabel: string
  searchText: string
  leftLabel: string
  rightLabel: string
}

export type SupplierOptionCache = {
  id: string
  name: string
  label: string
}

let quotationOptionsCache: { items: QuoteOptionCache[]; fetchedAt: number } | null =
  null
let supplierOptionsCache: { items: SupplierOptionCache[]; fetchedAt: number } | null =
  null

export function getCachedQuotationOptions(): QuoteOptionCache[] | null {
  if (
    quotationOptionsCache &&
    Date.now() - quotationOptionsCache.fetchedAt < CACHE_TTL_MS
  ) {
    return quotationOptionsCache.items
  }
  return null
}

export function setCachedQuotationOptions(items: QuoteOptionCache[]) {
  quotationOptionsCache = { items, fetchedAt: Date.now() }
}

export function getCachedSupplierOptions(): SupplierOptionCache[] | null {
  if (
    supplierOptionsCache &&
    Date.now() - supplierOptionsCache.fetchedAt < CACHE_TTL_MS
  ) {
    return supplierOptionsCache.items
  }
  return null
}

export function setCachedSupplierOptions(items: SupplierOptionCache[]) {
  supplierOptionsCache = { items, fetchedAt: Date.now() }
}
