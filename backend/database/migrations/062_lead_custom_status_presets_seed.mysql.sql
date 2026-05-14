-- Requires column leads.custom_status_label (migration 060). Run after 060 + 061.
INSERT IGNORE INTO lead_custom_status_presets (id, label, created_by)
SELECT UUID(), t.label, NULL
FROM (
  SELECT DISTINCT TRIM(custom_status_label) AS label
  FROM leads
  WHERE COALESCE(TRIM(custom_status_label), '') != ''
    AND LENGTH(TRIM(custom_status_label)) <= 191
) AS t;
