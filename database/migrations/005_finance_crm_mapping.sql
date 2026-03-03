-- Finance System <-> CRM mapping upgrade
-- Covers client onboarding, supplier onboarding, cost break-up, payment modes, currency mapping.

-- 1) Lead onboarding fields (captured at lead generation)
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS pan_number VARCHAR(20),
  ADD COLUMN IF NOT EXISTS address_line TEXT,
  ADD COLUMN IF NOT EXISTS client_currency VARCHAR(10) DEFAULT 'INR';

-- 2) Customer profile finance identity fields
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS pan_number VARCHAR(20),
  ADD COLUMN IF NOT EXISTS address_line TEXT,
  ADD COLUMN IF NOT EXISTS client_currency VARCHAR(10) DEFAULT 'INR';

-- 3) Supplier onboarding fields
ALTER TABLE suppliers
  ADD COLUMN IF NOT EXISTS pan_number VARCHAR(20),
  ADD COLUMN IF NOT EXISTS gst_number VARCHAR(30),
  ADD COLUMN IF NOT EXISTS address_line TEXT,
  ADD COLUMN IF NOT EXISTS invoice_beneficiary_name VARCHAR(200),
  ADD COLUMN IF NOT EXISTS invoice_bank_name VARCHAR(200),
  ADD COLUMN IF NOT EXISTS invoice_account_number VARCHAR(100),
  ADD COLUMN IF NOT EXISTS invoice_ifsc_swift VARCHAR(40),
  ADD COLUMN IF NOT EXISTS invoice_upi_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS supplier_currency VARCHAR(10) DEFAULT 'INR';

-- 4) Quotation cost break-up and currency context
ALTER TABLE quotations
  ADD COLUMN IF NOT EXISTS supplier_cost NUMERIC(12,2) DEFAULT 0 CHECK (supplier_cost >= 0),
  ADD COLUMN IF NOT EXISTS supplier_tax_amount NUMERIC(12,2) DEFAULT 0 CHECK (supplier_tax_amount >= 0),
  ADD COLUMN IF NOT EXISTS markup_amount NUMERIC(12,2) DEFAULT 0 CHECK (markup_amount >= 0),
  ADD COLUMN IF NOT EXISTS service_fee_amount NUMERIC(12,2) DEFAULT 0 CHECK (service_fee_amount >= 0),
  ADD COLUMN IF NOT EXISTS gst_amount NUMERIC(12,2) DEFAULT 0 CHECK (gst_amount >= 0),
  ADD COLUMN IF NOT EXISTS tcs_amount NUMERIC(12,2) DEFAULT 0 CHECK (tcs_amount >= 0),
  ADD COLUMN IF NOT EXISTS total_sale_value NUMERIC(12,2) DEFAULT 0 CHECK (total_sale_value >= 0),
  ADD COLUMN IF NOT EXISTS cost_currency VARCHAR(10) DEFAULT 'INR',
  ADD COLUMN IF NOT EXISTS client_currency VARCHAR(10) DEFAULT 'INR',
  ADD COLUMN IF NOT EXISTS supplier_currency VARCHAR(10) DEFAULT 'INR';

-- 5) Payment mode enforcement (Cash / Bank Transfer / Payment Gateway)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'payments_mode_allowed'
  ) THEN
    ALTER TABLE payments
      ADD CONSTRAINT payments_mode_allowed
      CHECK (
        UPPER(payment_mode) IN (
          'CASH',
          'BANK_TRANSFER',
          'PAYMENT_GATEWAY'
        )
      );
  END IF;
END $$;

-- Helpful indexes for finance filtering/reporting
CREATE INDEX IF NOT EXISTS idx_leads_pan_number ON leads(pan_number);
CREATE INDEX IF NOT EXISTS idx_customers_pan_number ON customers(pan_number);
CREATE INDEX IF NOT EXISTS idx_suppliers_pan_number ON suppliers(pan_number);
CREATE INDEX IF NOT EXISTS idx_quotations_total_sale_value ON quotations(total_sale_value);
CREATE INDEX IF NOT EXISTS idx_payments_mode ON payments(payment_mode);
