-- Configurable lead main/sub-status workflow.
-- Canonical leads.status remains stable for reports/automation.

CREATE TABLE IF NOT EXISTS lead_status_main (
  id CHAR(36) NOT NULL,
  code VARCHAR(80) NOT NULL,
  label VARCHAR(120) NOT NULL,
  canonical_status ENUM('OPEN','CONTACTED','WIP','QUOTED','FOLLOW_UP','CONVERTED','LOST','NON_RESPONSIVE') NOT NULL DEFAULT 'OPEN',
  sort_order INT NOT NULL DEFAULT 0,
  color VARCHAR(24) NOT NULL DEFAULT '#2563eb',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  is_system TINYINT(1) NOT NULL DEFAULT 0,
  is_terminal TINYINT(1) NOT NULL DEFAULT 0,
  requires_sub_status TINYINT(1) NOT NULL DEFAULT 0,
  requires_quotation TINYINT(1) NOT NULL DEFAULT 0,
  creates_booking TINYINT(1) NOT NULL DEFAULT 0,
  is_booking_controlled TINYINT(1) NOT NULL DEFAULT 0,
  created_by VARCHAR(36) NULL,
  updated_by VARCHAR(36) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_lead_status_main_code (code),
  KEY idx_lead_status_main_active_sort (is_active, sort_order),
  KEY idx_lead_status_main_canonical (canonical_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS lead_status_sub (
  id CHAR(36) NOT NULL,
  main_status_id CHAR(36) NOT NULL,
  code VARCHAR(80) NOT NULL,
  label VARCHAR(120) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  is_system TINYINT(1) NOT NULL DEFAULT 0,
  is_terminal TINYINT(1) NOT NULL DEFAULT 0,
  created_by VARCHAR(36) NULL,
  updated_by VARCHAR(36) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_lead_status_sub_main_code (main_status_id, code),
  KEY idx_lead_status_sub_main_sort (main_status_id, is_active, sort_order),
  CONSTRAINT fk_lead_status_sub_main
    FOREIGN KEY (main_status_id) REFERENCES lead_status_main(id)
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS main_status VARCHAR(80) NULL AFTER status;

CREATE INDEX IF NOT EXISTS idx_leads_main_sub_status
  ON leads (main_status, sub_status);

CREATE INDEX IF NOT EXISTS idx_leads_status_main_sub
  ON leads (status, main_status, sub_status);

INSERT IGNORE INTO lead_status_main
  (id, code, label, canonical_status, sort_order, color, is_active, is_system, is_terminal, requires_sub_status, requires_quotation, creates_booking, is_booking_controlled)
VALUES
  (UUID(), 'NEW', 'New', 'OPEN', 10, '#2563eb', 1, 1, 0, 0, 0, 0, 0),
  (UUID(), 'CONTACT_ATTEMPTED', 'Contact Attempted', 'CONTACTED', 20, '#f97316', 1, 1, 0, 1, 0, 0, 0),
  (UUID(), 'CONTACT_ESTABLISHED', 'Contact Established', 'CONTACTED', 30, '#16a34a', 1, 1, 0, 1, 0, 0, 0),
  (UUID(), 'QUOTATION_IN_PROGRESS', 'Quotation in Progress', 'WIP', 40, '#7c3aed', 1, 1, 0, 0, 0, 0, 0),
  (UUID(), 'QUOTATION_SENT', 'Quotation Sent', 'QUOTED', 50, '#0891b2', 1, 1, 0, 0, 1, 0, 0),
  (UUID(), 'FOLLOW_UP', 'Follow Up', 'FOLLOW_UP', 60, '#ca8a04', 1, 1, 0, 1, 0, 0, 0),
  (UUID(), 'BOOKING_CONFIRMATION_AWAITED', 'Booking Confirmation Awaited', 'CONVERTED', 70, '#0d9488', 1, 1, 0, 0, 0, 1, 1),
  (UUID(), 'PAYMENT_PARTIALLY_RECEIVED', 'Payment Partially Received', 'CONVERTED', 80, '#059669', 1, 1, 0, 0, 0, 0, 1),
  (UUID(), 'BOOKING_CONFIRMED', 'Booking Confirmed', 'CONVERTED', 90, '#15803d', 1, 1, 1, 0, 0, 0, 1),
  (UUID(), 'CLOSED', 'Closed', 'LOST', 100, '#dc2626', 1, 1, 1, 1, 0, 0, 0);

INSERT IGNORE INTO lead_status_sub
  (id, main_status_id, code, label, sort_order, is_active, is_system, is_terminal)
SELECT UUID(), m.id, seed.code, seed.label, seed.sort_order, 1, 1, seed.is_terminal
FROM (
  SELECT 'CONTACT_ATTEMPTED' AS main_code, 'NO_RESPONSE_1' AS code, '1 - No response' AS label, 10 AS sort_order, 0 AS is_terminal
  UNION ALL SELECT 'CONTACT_ATTEMPTED', 'NO_RESPONSE_2', '2 - No response', 20, 0
  UNION ALL SELECT 'CONTACT_ATTEMPTED', 'NO_RESPONSE_3', '3 - No response', 30, 0
  UNION ALL SELECT 'CONTACT_ATTEMPTED', 'NO_RESPONSE_4', '4 - No response', 40, 0
  UNION ALL SELECT 'CONTACT_ATTEMPTED', 'NO_RESPONSE_FINAL_REMINDER', '5 - Final Reminder', 50, 0
  UNION ALL SELECT 'CONTACT_ESTABLISHED', 'CALL', 'Call', 10, 0
  UNION ALL SELECT 'CONTACT_ESTABLISHED', 'WHATSAPP', 'WhatsApp', 20, 0
  UNION ALL SELECT 'CONTACT_ESTABLISHED', 'EMAIL', 'Email', 30, 0
  UNION ALL SELECT 'FOLLOW_UP', 'FOLLOW_UP_1', 'Follow up 1', 10, 0
  UNION ALL SELECT 'FOLLOW_UP', 'FOLLOW_UP_2', 'Follow up 2', 20, 0
  UNION ALL SELECT 'FOLLOW_UP', 'FOLLOW_UP_3', 'Follow up 3', 30, 0
  UNION ALL SELECT 'FOLLOW_UP', 'FOLLOW_UP_4', 'Follow up 4', 40, 0
  UNION ALL SELECT 'FOLLOW_UP', 'FINAL_REMINDER', 'Final Reminder', 50, 0
  UNION ALL SELECT 'CLOSED', 'PRICE_TOO_HIGH', 'Price Too High', 10, 1
  UNION ALL SELECT 'CLOSED', 'BOOKED_WITH_COMPETITOR', 'Booked with Competitor', 20, 1
  UNION ALL SELECT 'CLOSED', 'VISA_REJECTED', 'Visa Rejected', 30, 1
  UNION ALL SELECT 'CLOSED', 'TRAVEL_CANCELLED', 'Travel Cancelled', 40, 1
  UNION ALL SELECT 'CLOSED', 'DATES_CHANGED', 'Dates Changed', 50, 1
  UNION ALL SELECT 'CLOSED', 'NON_RESPONSIVE', 'Non Responsive', 60, 1
  UNION ALL SELECT 'CLOSED', 'BUDGET_ISSUE', 'Budget Issue', 70, 1
  UNION ALL SELECT 'CLOSED', 'DUPLICATE_LEAD', 'Duplicate Lead', 80, 1
  UNION ALL SELECT 'CLOSED', 'INVALID_ENQUIRY', 'Invalid Enquiry', 90, 1
) AS seed
JOIN lead_status_main AS m ON m.code = seed.main_code;

UPDATE leads
SET main_status = CASE
  WHEN status = 'OPEN' THEN 'NEW'
  WHEN status = 'CONTACTED' AND COALESCE(sub_status, '') LIKE 'NO_RESPONSE%' THEN 'CONTACT_ATTEMPTED'
  WHEN status = 'CONTACTED' THEN 'CONTACT_ESTABLISHED'
  WHEN status = 'WIP' THEN 'QUOTATION_IN_PROGRESS'
  WHEN status = 'QUOTED' THEN 'QUOTATION_SENT'
  WHEN status = 'FOLLOW_UP' THEN 'FOLLOW_UP'
  WHEN status = 'CONVERTED' AND sub_status = 'PAYMENT_PARTIALLY_RECEIVED' THEN 'PAYMENT_PARTIALLY_RECEIVED'
  WHEN status = 'CONVERTED' AND sub_status = 'BOOKING_CONFIRMATION_AWAITED' THEN 'BOOKING_CONFIRMATION_AWAITED'
  WHEN status = 'CONVERTED' THEN 'BOOKING_CONFIRMED'
  WHEN status IN ('LOST', 'NON_RESPONSIVE') THEN 'CLOSED'
  ELSE 'NEW'
END
WHERE main_status IS NULL OR TRIM(main_status) = '';
