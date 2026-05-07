/**
 * Client-facing currency for quotations / bookings (aligned with Quotations list).
 */

export function normalizeCurrencyCode(currency?: string | null): string {
  const code = String(currency ?? "INR")
    .trim()
    .toUpperCase();
  return /^[A-Z]{3}$/.test(code) ? code : "INR";
}

export function pickFirstValidCurrencyCode(
  ...candidates: unknown[]
): string | null {
  for (const candidate of candidates) {
    const raw = String(candidate ?? "")
      .trim()
      .toUpperCase();
    if (/^[A-Z]{3}$/.test(raw)) return raw;
  }
  return null;
}

export function pickQuotationDisplayCurrencyCode(quote: any): string | null {
  if (!quote) return null;
  const templateSnapshot =
    quote.templateSnapshot ?? quote.template_snapshot ?? null;
  const builderSnapshot =
    templateSnapshot?.builderSnapshot ?? templateSnapshot?.builder_snapshot;
  return pickFirstValidCurrencyCode(
    quote.clientCurrency,
    quote.client_currency,
    quote.costCurrency,
    quote.cost_currency,
    quote.supplierCurrency,
    quote.supplier_currency,
    templateSnapshot?.currency,
    builderSnapshot?.currency,
    templateSnapshot?.pricing?.clientCurrency,
    templateSnapshot?.pricing?.client_currency,
    templateSnapshot?.pricing?.costCurrency,
    templateSnapshot?.pricing?.cost_currency,
    quote.currency,
  );
}

export function pickLeadDisplayCurrencyCode(leadRecord: any): string | null {
  if (!leadRecord) return null;
  return pickFirstValidCurrencyCode(
    leadRecord.clientCurrency,
    leadRecord.client_currency,
    leadRecord.currency,
  );
}
