-- Global custom status labels (team-wide) for lead status dropdown
-- No FK to users(id): MySQL requires matching type + charset/collation; many DBs
-- use a different users.id definition than utf8mb4 CHAR(36). App still stores creator id.
CREATE TABLE IF NOT EXISTS lead_custom_status_presets (
  id CHAR(36) NOT NULL,
  label VARCHAR(191) NOT NULL,
  created_by VARCHAR(36) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_lcsp_label (label),
  KEY idx_lcsp_label_sort (label),
  KEY idx_lcsp_created_by (created_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Backfill presets: run `060_leads_custom_status_label.mysql.sql` first, then `062_*` seed script.
