BEGIN;

CREATE TABLE IF NOT EXISTS supplier_payable_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payable_id UUID NOT NULL REFERENCES supplier_payables(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  booking_id UUID REFERENCES bookings(id),
  settlement_amount NUMERIC(12,2) NOT NULL CHECK (settlement_amount > 0),
  payment_mode VARCHAR(30) NOT NULL DEFAULT 'BANK_TRANSFER',
  settlement_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reference VARCHAR(120),
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_supplier_payable_settlements_payable_id
  ON supplier_payable_settlements(payable_id);

CREATE INDEX IF NOT EXISTS idx_supplier_payable_settlements_supplier_id
  ON supplier_payable_settlements(supplier_id);

CREATE INDEX IF NOT EXISTS idx_supplier_payable_settlements_booking_id
  ON supplier_payable_settlements(booking_id);

CREATE INDEX IF NOT EXISTS idx_supplier_payable_settlements_settlement_date
  ON supplier_payable_settlements(settlement_date DESC);

COMMENT ON TABLE supplier_payable_settlements IS
'Immutable supplier settlement ledger for audit-safe payable tracking.';

COMMENT ON COLUMN supplier_payable_settlements.settlement_amount IS
'Amount settled in this transaction. supplier_payables.paid_amount is derived by cumulative updates.';

COMMIT;
