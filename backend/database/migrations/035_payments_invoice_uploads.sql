BEGIN;

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS invoice_url TEXT;

COMMENT ON COLUMN payments.invoice_url IS
'Stores uploaded invoice document URL for the payment entry';

COMMIT;
 