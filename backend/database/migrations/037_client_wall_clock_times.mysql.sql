-- Fixed time storage (no conversion): same digits every user sees.
-- `client_created_at` / `followup_local_at`: `YYYY-MM-DD HH:mm:ss` as sent from the browser.
-- `client_timezone`: IANA id for reference only (display label), not used to shift times.
-- Existing `created_at` TIMESTAMP remains for server audit / sorting (may use DB defaults).

ALTER TABLE leads
  ADD COLUMN client_created_at VARCHAR(32) NULL,
  ADD COLUMN client_timezone VARCHAR(80) NULL;

ALTER TABLE lead_activities
  ADD COLUMN client_created_at VARCHAR(32) NULL,
  ADD COLUMN client_timezone VARCHAR(80) NULL;

ALTER TABLE followups
  ADD COLUMN followup_local_at VARCHAR(32) NULL;
