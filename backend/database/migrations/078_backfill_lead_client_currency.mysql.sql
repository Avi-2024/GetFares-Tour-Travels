-- Leads are the booking client-currency authority.
-- Backfill missing values from existing quotation currency.

UPDATE leads l
INNER JOIN quotations q ON q.lead_id = l.id
INNER JOIN bookings b ON b.quotation_id = q.id
SET l.client_currency = UPPER(TRIM(q.client_currency))
WHERE (l.client_currency IS NULL OR TRIM(l.client_currency) = '')
  AND q.client_currency IS NOT NULL
  AND TRIM(q.client_currency) <> '';
