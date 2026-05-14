ALTER TABLE leads
  ADD COLUMN custom_status_label VARCHAR(191) NULL
  COMMENT 'User-defined label shown alongside pipeline status';
