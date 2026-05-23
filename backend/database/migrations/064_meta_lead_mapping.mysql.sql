-- Super-admin configurable Meta lead field mapping (scope: ad / form / campaign / page / default)

CREATE TABLE IF NOT EXISTS meta_lead_profiles (
  id CHAR(36) NOT NULL DEFAULT (UUID()),
  name VARCHAR(150) NOT NULL,
  scope_type ENUM('ad', 'form', 'campaign', 'page', 'default') NOT NULL,
  scope_id VARCHAR(120) NOT NULL DEFAULT '',
  priority INT NOT NULL DEFAULT 100,
  lead_type VARCHAR(20) NULL,
  lead_country VARCHAR(100) NULL,
  source_label VARCHAR(120) NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by CHAR(36) NULL,
  updated_by CHAR(36) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_meta_lead_profiles_scope (scope_type, scope_id),
  KEY idx_meta_lead_profiles_active (is_active, priority)
);

CREATE TABLE IF NOT EXISTS meta_lead_field_maps (
  id CHAR(36) NOT NULL DEFAULT (UUID()),
  profile_id CHAR(36) NOT NULL,
  meta_field_keys JSON NOT NULL,
  target_column VARCHAR(64) NOT NULL,
  transform VARCHAR(40) NOT NULL DEFAULT 'none',
  strip_from_dynamic BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_meta_lead_field_maps_profile (profile_id, is_active, sort_order),
  CONSTRAINT fk_meta_lead_field_maps_profile
    FOREIGN KEY (profile_id) REFERENCES meta_lead_profiles(id) ON DELETE CASCADE
);
