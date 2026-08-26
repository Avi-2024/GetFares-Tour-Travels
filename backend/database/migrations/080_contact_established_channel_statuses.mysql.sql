-- Add separate Contact Established sub-statuses for Call, WhatsApp, and Email.
-- Existing combined "Call / WhatsApp" is kept for history compatibility but hidden from active selection.

INSERT INTO lead_status_sub
  (id, main_status_id, code, label, sort_order, is_active, is_system, is_terminal)
SELECT UUID(), m.id, seed.code, seed.label, seed.sort_order, 1, 1, 0
FROM lead_status_main AS m
CROSS JOIN (
  SELECT 'CALL' AS code, 'Call' AS label, 10 AS sort_order
  UNION ALL SELECT 'WHATSAPP', 'WhatsApp', 20
  UNION ALL SELECT 'EMAIL', 'Email', 30
) AS seed
WHERE m.code = 'CONTACT_ESTABLISHED'
  AND NOT EXISTS (
    SELECT 1
    FROM lead_status_sub AS s
    WHERE s.main_status_id = m.id
      AND s.code = seed.code
  );

UPDATE lead_status_sub AS s
JOIN lead_status_main AS m ON m.id = s.main_status_id
SET
  s.is_active = 0,
  s.updated_at = CURRENT_TIMESTAMP
WHERE m.code = 'CONTACT_ESTABLISHED'
  AND s.code = 'CALL_WHATSAPP';
