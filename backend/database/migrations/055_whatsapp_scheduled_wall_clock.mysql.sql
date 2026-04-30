-- Change whatsapp_scheduled columns to VARCHAR to store wall clock time
-- This allows storing browser local time without UTC conversion

ALTER TABLE whatsapp_scheduled 
  MODIFY COLUMN schedule_time VARCHAR(30) NULL,
  MODIFY COLUMN created_at VARCHAR(30) NULL;
