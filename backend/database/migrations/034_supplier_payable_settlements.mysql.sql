START TRANSACTION;

CREATE TABLE IF NOT EXISTS supplier_payable_settlements (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  payable_id CHAR(36) NOT NULL,
  supplier_id CHAR(36) NOT NULL,
  booking_id CHAR(36),
  settlement_amount DECIMAL(12,2) NOT NULL CHECK (settlement_amount > 0),
  payment_mode VARCHAR(30) NOT NULL DEFAULT 'BANK_TRANSFER',
  settlement_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reference VARCHAR(120),
  notes TEXT,
  created_by CHAR(36),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (payable_id) REFERENCES supplier_payables(id) ON DELETE CASCADE,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
  FOREIGN KEY (booking_id) REFERENCES bookings(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX idx_supplier_payable_settlements_payable_id
  ON supplier_payable_settlements(payable_id);

CREATE INDEX idx_supplier_payable_settlements_supplier_id
  ON supplier_payable_settlements(supplier_id);

CREATE INDEX idx_supplier_payable_settlements_booking_id
  ON supplier_payable_settlements(booking_id);

CREATE INDEX idx_supplier_payable_settlements_settlement_date
  ON supplier_payable_settlements(settlement_date DESC);

COMMIT;
