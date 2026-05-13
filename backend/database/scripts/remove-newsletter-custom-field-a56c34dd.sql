-- Remove mistaken "Newsletter" custom field (was guessed from export "N" column).
-- Run once if you already applied an older seed-lead-a56c34dd-meta-export-row.sql.

SET @lid := 'a56c34dd-cfe0-4db2-b19a-9bff74f2d051';

UPDATE leads
SET
  dynamic_fields = JSON_REMOVE(COALESCE(dynamic_fields, CAST('{}' AS JSON)), '$.do_you_want_to_receive_newsletter'),
  dynamic_field_labels = JSON_REMOVE(COALESCE(dynamic_field_labels, CAST('{}' AS JSON)), '$.do_you_want_to_receive_newsletter'),
  updated_at = CURRENT_TIMESTAMP
WHERE id = @lid;

DELETE FROM lead_dynamic_fields
WHERE lead_id = @lid AND field_key = 'do_you_want_to_receive_newsletter';
