-- IANA zone from browser when scheduling (e.g. Asia/Dubai); optional.
ALTER TABLE followups
  ADD COLUMN client_timezone VARCHAR(80) NULL;

