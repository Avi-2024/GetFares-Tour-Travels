-- Meta lead form questions can exceed VARCHAR(255); store full label text.
ALTER TABLE lead_dynamic_fields
  MODIFY COLUMN field_label TEXT NULL;
