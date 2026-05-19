import { bookingsApi } from '../api/bookings'

export type BookingPickerOption = {
  id: string
  bookingNumber: string
  customer?: string
  currency?: string
  totalAmount?: number
}

const CACHE_TTL_MS = 5 * 60 * 1000
const DEFAULT_LIMIT = 50

let cache: { items: BookingPickerOption[]; fetchedAt: number } | null = null
let inflight: Promise<BookingPickerOption[]> | null = null

const unwrapList = (response: unknown): unknown[] => {
  const payload = (response as { data?: unknown })?.data ?? response
  const data =
    (payload as { data?: unknown })?.data ??
    (payload as { items?: unknown[] })?.items ??
    payload
  return Array.isArray(data) ? data : []
}

const mapRow = (row: unknown): BookingPickerOption | null => {
  if (!row || typeof row !== 'object') return null
  const record = row as Record<string, unknown>
  const id = String(record.id ?? '').trim()
  if (!id) return null
  const customer =
    typeof record.customer === 'string'
      ? record.customer.trim()
      : String(record.customerName ?? record.customer_name ?? '').trim()
  return {
    id,
    bookingNumber: String(
      record.bookingNumber ?? record.booking_number ?? id,
    ).trim(),
    customer: customer || undefined,
    currency: String(record.currency ?? 'INR').toUpperCase(),
    totalAmount: Number(record.totalAmount ?? record.total_amount ?? 0) || 0,
  }
}

export async function fetchBookingPickerOptions(
  search?: string,
): Promise<BookingPickerOption[]> {
  const term = search?.trim() ?? ''
  if (!term && cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.items
  }

  if (!term && inflight) {
    return inflight
  }

  const request = (async () => {
    const response = await bookingsApi.paymentOptions({
      limit: DEFAULT_LIMIT,
      ...(term.length >= 2 ? { search: term } : {}),
    })
    return unwrapList(response)
      .map(mapRow)
      .filter((item): item is BookingPickerOption => item !== null)
  })()

  if (!term) {
    inflight = request
  }

  try {
    const items = await request
    if (!term) {
      cache = { items, fetchedAt: Date.now() }
    }
    return items
  } finally {
    if (!term) {
      inflight = null
    }
  }
}

export function prefetchBookingPickerOptions() {
  void fetchBookingPickerOptions()
}
