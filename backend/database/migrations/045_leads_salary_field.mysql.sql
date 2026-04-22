-- Add salary field for VISA leads (monthly income).
-- Backwards compatible: existing budget remains unchanged.

ALTER TABLE leads
  ADD COLUMN salary DECIMAL(12,2) NULL AFTER budget;

