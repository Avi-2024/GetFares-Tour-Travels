-- Add is_schedule_only column to followups table (MySQL)
-- This separates schedule-only followups (for notifications) from compliance-tracked followups

ALTER TABLE followups 
ADD COLUMN is_schedule_only BOOLEAN DEFAULT FALSE;

-- Create index for filtering
CREATE INDEX idx_followups_is_schedule_only ON followups(is_schedule_only);
