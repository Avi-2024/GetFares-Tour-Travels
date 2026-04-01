-- Add is_schedule_only column to followups table
-- This separates schedule-only followups (for notifications) from compliance-tracked followups

ALTER TABLE followups 
ADD COLUMN IF NOT EXISTS is_schedule_only BOOLEAN DEFAULT FALSE;

-- Create index for filtering
CREATE INDEX IF NOT EXISTS idx_followups_is_schedule_only ON followups(is_schedule_only);

-- Comment for documentation
COMMENT ON COLUMN followups.is_schedule_only IS 'TRUE for schedule-only followups (notifications), FALSE for compliance-tracked followups';
