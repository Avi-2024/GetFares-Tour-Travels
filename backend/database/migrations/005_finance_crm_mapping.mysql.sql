-- Finance System <-> CRM mapping upgrade (MySQL)
-- Covers client onboarding, supplier onboarding, cost break-up, payment modes, currency mapping.

-- 1) Lead onboarding fields (captured at lead generation)
ALTER TABLE leads
  ADD COLUMN pan_number VARCHAR(20),
  ADD COLUMN address_line TEXT,
  ADD COLUMN client_currency VARCHAR(10) DEFAULT 'INR';

-- 2) Customer profile finance identity fields
ALTER TABLE customers
  ADD COLUMN pan_number VARCHAR(20),
  ADD COLUMN address_line TEXT,
  ADD COLUMN client_currency VARCHAR(10) DEFAULT 'INR';

-- 3) Supplier onboarding fields
ALTER TABLE suppliers
  ADD COLUMN pan_number VARCHAR(20),
  ADD COLUMN gst_number VARCHAR(30),
  ADD COLUMN address_line TEXT,
  ADD COLUMN invoice_beneficiary_name VARCHAR(200),
  ADD COLUMN invoice_bank_name VARCHAR(200),
  ADD COLUMN invoice_account_number VARCHAR(100),
  ADD COLUMN invoice_ifsc_swift VARCHAR(40),
  ADD COLUMN invoice_upi_id VARCHAR(100),
  ADD COLUMN supplier_currency VARCHAR(10) DEFAULT 'INR';

-- 4) Quotation cost break-up and currency context
ALTER TABLE quotations
  ADD COLUMN supplier_cost DECIMAL(12,2) DEFAULT 0 CHECK (supplier_cost >= 0),
  ADD COLUMN supplier_tax_amount DECIMAL(12,2) DEFAULT 0 CHECK (supplier_tax_amount >= 0),
  ADD COLUMN markup_amount DECIMAL(12,2) DEFAULT 0 CHECK (markup_amount >= 0),
  ADD COLUMN service_fee_amount DECIMAL(12,2) DEFAULT 0 CHECK (service_fee_amount >= 0),
  ADD COLUMN gst_amount DECIMAL(12,2) DEFAULT 0 CHECK (gst_amount >= 0),
  ADD COLUMN tcs_amount DECIMAL(12,2) DEFAULT 0 CHECK (tcs_amount >= 0),
  ADD COLUMN total_sale_value DECIMAL(12,2) DEFAULT 0 CHECK (total_sale_value >= 0),
  ADD COLUMN cost_currency VARCHAR(10) DEFAULT 'INR',
  ADD COLUMN client_currency VARCHAR(10) DEFAULT 'INR',
  ADD COLUMN supplier_currency VARCHAR(10) DEFAULT 'INR';

-- 5) Payment mode enforcement (Cash / Bank Transfer / Payment Gateway)
ALTER TABLE payments
  ADD CONSTRAINT payments_mode_allowed
  CHECK (
    UPPER(payment_mode) IN (
      'CASH',
      'BANK_TRANSFER',
      'PAYMENT_GATEWAY'
    )
  );

-- Helpful indexes for finance filtering/reporting
CREATE INDEX idx_leads_pan_number ON leads(pan_number);
CREATE INDEX idx_customers_pan_number ON customers(pan_number);
CREATE INDEX idx_suppliers_pan_number ON suppliers(pan_number);
CREATE INDEX idx_quotations_total_sale_value ON quotations(total_sale_value);
CREATE INDEX idx_payments_mode ON payments(payment_mode);
