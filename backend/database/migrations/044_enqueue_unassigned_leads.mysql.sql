-- Enqueue unassigned leads so automation can assign them.
-- Works for leads inserted outside the API (direct DB writes).

DROP TRIGGER IF EXISTS trg_leads_enqueue_after_insert;
DROP TRIGGER IF EXISTS trg_leads_enqueue_after_update;

DELIMITER $$

CREATE TRIGGER trg_leads_enqueue_after_insert
AFTER INSERT ON leads
FOR EACH ROW
BEGIN
  IF NEW.assigned_to IS NULL THEN
    INSERT INTO queued_leads (id, lead_id, reason, queued_at, processed_at, created_at, updated_at)
    VALUES (UUID(), NEW.id, 'TRIGGER_ENQUEUE', NOW(), NULL, NOW(), NOW())
    ON DUPLICATE KEY UPDATE
      processed_at = NULL,
      reason = 'TRIGGER_ENQUEUE',
      queued_at = NOW(),
      updated_at = NOW();
  END IF;
END$$

CREATE TRIGGER trg_leads_enqueue_after_update
AFTER UPDATE ON leads
FOR EACH ROW
BEGIN
  IF NEW.assigned_to IS NULL AND (OLD.assigned_to IS NOT NULL OR OLD.assigned_to IS NULL) THEN
    INSERT INTO queued_leads (id, lead_id, reason, queued_at, processed_at, created_at, updated_at)
    VALUES (UUID(), NEW.id, 'TRIGGER_ENQUEUE', NOW(), NULL, NOW(), NOW())
    ON DUPLICATE KEY UPDATE
      processed_at = NULL,
      reason = 'TRIGGER_ENQUEUE',
      queued_at = NOW(),
      updated_at = NOW();
  END IF;
END$$

DELIMITER ;

