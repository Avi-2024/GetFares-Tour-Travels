-- Update existing followups that were created via Schedule Follow-up (MySQL)
-- These should be marked as schedule-only (not appear in history)

-- Mark all existing followups as schedule-only by default
-- (since the new system separates schedule from workflow actions)
UPDATE followups 
SET is_schedule_only = TRUE 
WHERE is_schedule_only IS NULL OR is_schedule_only = FALSE;

-- If you want to keep existing followups in history, comment out the above
-- and only mark future ones as schedule-only

-- Alternatively, if you want to preserve existing history:
-- UPDATE followups 
-- SET is_schedule_only = FALSE 
-- WHERE is_schedule_only IS NULL;
