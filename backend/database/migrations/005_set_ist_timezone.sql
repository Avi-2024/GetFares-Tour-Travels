-- Set PostgreSQL timezone to Indian Standard Time (IST)
-- This ensures all timestamps are stored and displayed in IST

-- Set timezone for current session
SET TIME ZONE 'Asia/Kolkata';

-- Set default timezone for database (this will apply to all new connections)
ALTER DATABASE CURRENT_DATABASE() SET timezone TO 'Asia/Kolkata';

-- Create or replace function to automatically update updated_at in IST
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at column
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT table_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND column_name = 'updated_at'
    LOOP
        -- Drop existing trigger if exists
        EXECUTE format('DROP TRIGGER IF EXISTS update_%I_updated_at ON %I', r.table_name, r.table_name);
        
        -- Create new trigger
        EXECUTE format('
            CREATE TRIGGER update_%I_updated_at
            BEFORE UPDATE ON %I
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column()
        ', r.table_name, r.table_name);
    END LOOP;
END $$;

COMMENT ON FUNCTION update_updated_at_column() IS 
'Automatically updates updated_at column to current timestamp (in database timezone) on row update';
