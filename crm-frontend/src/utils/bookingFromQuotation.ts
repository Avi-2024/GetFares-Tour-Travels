/**
 * Helpers to create a booking payload from a quotation (aligned with BookingsPage create flow).
 */

function toDateOnly(value: unknown): string {
  if (value == null || value === '') return ''
  const d = new Date(value as string)
  if (Number.isNaN(d.getTime())) return ''
  return d.toISOString().slice(0, 10)
}

function addDaysIso(isoDate: string, days: number): string {
  const base = new Date(`${isoDate}T12:00:00.000Z`)
  if (Number.isNaN(base.getTime())) return isoDate
  base.setUTCDate(base.getUTCDate() + days)
  return base.toISOString().slice(0, 10)
}

export function quotationWasSentToLead(quote: {
  status?: string
  sentAt?: string | null
  sent_at?: string | null
}): boolean {
  const st = String(quote.status ?? '').toUpperCase()
  if (st === 'DRAFT') return false
  const raw = quote.sentAt ?? quote.sent_at
  if (raw != null && String(raw).trim() !== '') return true
  return ['SENT', 'VIEWED', 'APPROVED'].includes(st)
}

export function resolveTravelDatesForBooking(
  quote: Record<string, unknown>,
  leadTravelDate?: string
): { travelStartDate: string; travelEndDate: string } | null {
  const snap = (quote.templateSnapshot ?? quote.template_snapshot) as
    | Record<string, unknown>
    | undefined

  const startRaw =
    quote.travelStartDate ??
    quote.travel_start_date ??
    quote.travelStart ??
    quote.startDate ??
    snap?.travelStartDate ??
    snap?.travel_start_date

  let travelStartDate = toDateOnly(startRaw)
  if (!travelStartDate && leadTravelDate) {
    travelStartDate = toDateOnly(leadTravelDate)
  }

  const endRaw =
    quote.travelEndDate ??
    quote.travel_end_date ??
    quote.travelEnd ??
    quote.endDate ??
    snap?.travelEndDate ??
    snap?.travel_end_date

  let travelEndDate = toDateOnly(endRaw)

  const durationDays = Number(
    quote.durationDays ?? quote.duration_days ?? snap?.durationDays ?? 0
  )
  const nights = Number(
    quote.durationNights ?? quote.duration_nights ?? snap?.durationNights ?? 0
  )

  if (travelStartDate && !travelEndDate) {
    if (durationDays > 1) {
      travelEndDate = addDaysIso(travelStartDate, durationDays - 1)
    } else if (nights > 0) {
      travelEndDate = addDaysIso(travelStartDate, nights)
    } else {
      travelEndDate = travelStartDate
    }
  }

  if (!travelStartDate) return null
  if (!travelEndDate) travelEndDate = travelStartDate
  if (travelEndDate < travelStartDate) travelEndDate = travelStartDate

  return { travelStartDate, travelEndDate }
}

export function buildBookingCreatePayloadFromQuotation(
  quote: Record<string, unknown>,
  leadTravelDate?: string
): { payload: Record<string, unknown> | null; error: string | null } {
  const dates = resolveTravelDatesForBooking(quote, leadTravelDate)
  if (!dates) {
    return {
      payload: null,
      error:
        'Add travel dates on the quotation (or travel date on the lead) before creating a booking.'
    }
  }

  const totalAmountRaw =
    quote.finalPrice ??
    quote.totalSaleValue ??
    quote.total_sale_value ??
    quote.totalCost ??
    quote.totalAmount ??
    (quote.pricing as Record<string, unknown> | undefined)?.total ??
    (quote.pricing as Record<string, unknown> | undefined)?.finalPrice

  const totalAmount =
    totalAmountRaw !== undefined && totalAmountRaw !== null
      ? Number(totalAmountRaw) || 0
      : 0

  const costAmountRaw =
    quote.totalCost ??
    quote.total_cost ??
    quote.supplierCost ??
    quote.supplier_cost ??
    quote.costAmount ??
    quote.cost ??
    (quote.pricing as Record<string, unknown> | undefined)?.cost ??
    (quote.pricing as Record<string, unknown> | undefined)?.supplierCost

  let costAmount =
    costAmountRaw !== undefined && costAmountRaw !== null
      ? Number(costAmountRaw) || 0
      : 0

  if (costAmount > totalAmount) costAmount = totalAmount

  if (totalAmount <= 0) {
    return {
      payload: null,
      error:
        'Quotation sale value is missing or zero. Update the quotation pricing first.'
    }
  }

  const advanceRaw =
    quote.advanceRequired ?? quote.advance_required ?? quote.advanceAmount
  const advanceRequired =
    advanceRaw !== undefined && advanceRaw !== null
      ? Number(advanceRaw) || 0
      : undefined

  const supplierDetails =
    (quote.supplierDetails ??
      quote.supplier_details ??
      quote.supplier ??
      (
        (quote.templateSnapshot ?? quote.template_snapshot) as
          | Record<string, unknown>
          | undefined
      )?.supplierDetails ??
      (
        (quote.templateSnapshot ?? quote.template_snapshot) as
          | Record<string, unknown>
          | undefined
      )?.supplier) as Record<string, unknown> | undefined

  const supplierId = String(
    supplierDetails?.supplierId ??
      supplierDetails?.supplier_id ??
      quote.supplierId ??
      quote.supplier_id ??
      ''
  ).trim()

  const supplierName = String(
    supplierDetails?.supplierName ??
      supplierDetails?.supplier_name ??
      quote.supplierName ??
      quote.supplier_name ??
      ''
  ).trim()

  const clientCurrency = String(
    quote.clientCurrency ?? quote.client_currency ?? 'INR'
  )
    .trim()
    .toUpperCase()

  const supplierCurrencyFromQuote = String(
    quote.supplierCurrency ?? quote.supplier_currency ?? ''
  )
    .trim()
    .toUpperCase()

  const exchangeRateRaw =
    quote.exchangeRate ??
    quote.exchange_rate ??
    (quote.pricing as Record<string, unknown> | undefined)?.exchangeRate ??
    (quote.pricing as Record<string, unknown> | undefined)?.exchange_rate
  const exchangeRate =
    exchangeRateRaw !== undefined && exchangeRateRaw !== null
      ? Number(exchangeRateRaw)
      : null

  const quotationId = String(quote.id ?? quote.quotationId ?? '').trim()
  if (!quotationId) {
    return { payload: null, error: 'Invalid quotation reference.' }
  }

  const payload: Record<string, unknown> = {
    quotationId,
    travelStartDate: dates.travelStartDate,
    travelEndDate: dates.travelEndDate,
    totalAmount,
    costAmount,
    clientCurrency
  }

  if (
    supplierCurrencyFromQuote &&
    supplierCurrencyFromQuote !== clientCurrency &&
    exchangeRate &&
    Number.isFinite(exchangeRate) &&
    exchangeRate > 0
  ) {
    payload.supplierCurrency = supplierCurrencyFromQuote
    payload.exchangeRate = Number(exchangeRate.toFixed(6))
  } else {
    // Keep single-currency booking flow unless an explicit valid FX rate is present.
    payload.supplierCurrency = clientCurrency
  }

  if (supplierId || supplierName) {
    payload.supplierDetails = {
      ...(supplierId ? { supplierId } : {}),
      ...(supplierName ? { supplierName } : {})
    }
  }

  if (advanceRequired !== undefined && advanceRequired > 0) {
    payload.advanceRequired = advanceRequired
  }

  return { payload, error: null }
}
