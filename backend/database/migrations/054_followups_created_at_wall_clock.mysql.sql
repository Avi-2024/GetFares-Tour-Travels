-- Change followups.created_at from TIMESTAMP to VARCHAR to store wall clock time
-- This allows storing browser local time (e.g., "2026-04-30 18:55:30") without UTC conversion

ALTER TABLE followups 
  MODIFY COLUMN created_at VARCHAR(30) NULL;
