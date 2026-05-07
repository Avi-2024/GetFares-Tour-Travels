# Indian Standard Time (IST) Configuration

## Overview
All timestamps in the database (`created_at`, `updated_at`) are now stored and displayed in **Indian Standard Time (IST)** - Asia/Kolkata timezone.

---

## Changes Made

### 1. Database Connection Configuration
**File:** `backend/crm/core/database/connection.js`

Added timezone configuration to PostgreSQL connection pool:
```javascript
const poolConfig = {
  // ... other config
  options: '-c timezone=Asia/Kolkata',
};
```

### 2. Database Migration
**File:** `backend/database/migrations/005_set_ist_timezone.sql`

This migration:
- Sets database timezone to `Asia/Kolkata`
- Updates all existing `created_at` and `updated_at` column defaults
- Creates automatic trigger to update `updated_at` in IST
- Applies to all tables with timestamp columns

### 3. In-Memory Database (Development)
Updated `InMemoryDatabase` class to use IST for timestamps when DATABASE_URL is not configured.

---

## How It Works

### PostgreSQL Connection
When the application connects to PostgreSQL, it automatically sets the session timezone to IST:
```sql
SET TIME ZONE 'Asia/Kolkata';
```

### Automatic Timestamps
All new records automatically get IST timestamps:
```sql
-- created_at default
DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')

-- updated_at trigger
CREATE TRIGGER update_<table>_updated_at
BEFORE UPDATE ON <table>
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
```

### Trigger Function
```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata';
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## Migration Steps

### Step 1: Run the Migration
```bash
cd backend
npm run db:migrate
```

Or manually run the SQL:
```bash
psql -U your_user -d your_database -f database/migrations/005_set_ist_timezone.sql
```

### Step 2: Restart Backend Server
```bash
npm run dev
```

### Step 3: Verify Timezone
Check current timezone in PostgreSQL:
```sql
SHOW timezone;
-- Should return: Asia/Kolkata
```

Check a sample timestamp:
```sql
SELECT NOW();
-- Should show IST time (UTC+5:30)
```

---

## Examples

### Before (UTC)
```json
{
  "id": "123",
  "fullName": "John Doe",
  "created_at": "2026-04-01T00:55:38.014Z",  // UTC
  "updated_at": "2026-04-01T03:06:26.111Z"   // UTC
}
```

### After (IST)
```json
{
  "id": "123",
  "fullName": "John Doe",
  "created_at": "2026-04-01T06:25:38.014+05:30",  // IST (UTC+5:30)
  "updated_at": "2026-04-01T08:36:26.111+05:30"   // IST (UTC+5:30)
}
```

---

## Verification Queries

### Check Timezone Setting
```sql
SHOW timezone;
```

### Check Table Defaults
```sql
SELECT 
    table_name,
    column_name,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND column_name IN ('created_at', 'updated_at')
ORDER BY table_name, column_name;
```

### Check Triggers
```sql
SELECT 
    trigger_name,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND trigger_name LIKE '%updated_at%';
```

### Test Insert
```sql
-- Insert a test record
INSERT INTO leads (full_name, phone, email, status)
VALUES ('Test User', '9876543210', 'test@example.com', 'OPEN')
RETURNING id, created_at, updated_at;

-- Check the timestamps (should be in IST)
```

### Test Update
```sql
-- Update a record
UPDATE leads 
SET full_name = 'Updated Name'
WHERE id = 'your-lead-id'
RETURNING id, created_at, updated_at;

-- updated_at should automatically update to current IST time
```

---

## Frontend Display

The frontend will receive IST timestamps from the API. The `DateTimePreferencesContext` already handles timezone conversion for display.

### Example Usage
```typescript
import { useDateTimePreferences } from '../../context/DateTimePreferencesContext';

const { formatDateTime } = useDateTimePreferences();

// API returns IST timestamp
const lead = {
  created_at: "2026-04-01T06:25:38.014+05:30"
};

// Display in user's preferred format
const displayTime = formatDateTime(lead.created_at);
// Output: "01/04/2026, 06:25 am" (IST)
```

---

## Troubleshooting

### Issue: Timestamps still showing UTC
**Solution:** Restart the backend server and check connection pool configuration.

### Issue: Migration fails
**Solution:** Check if you have proper database permissions:
```sql
-- Grant necessary permissions
GRANT ALL PRIVILEGES ON DATABASE your_database TO your_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_user;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO your_user;
```

### Issue: Existing data shows wrong timezone
**Solution:** The migration only updates defaults and triggers. Existing timestamps remain as-is. To convert existing data:
```sql
-- Convert existing UTC timestamps to IST (if needed)
UPDATE leads 
SET created_at = created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata',
    updated_at = updated_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata';
```

---

## Important Notes

1. **Database Level:** Timezone is set at database connection level
2. **Automatic:** All new records automatically use IST
3. **Triggers:** `updated_at` automatically updates on row changes
4. **Consistent:** All tables with timestamp columns are affected
5. **No Code Changes:** Application code doesn't need timezone conversion

---

## Rollback (If Needed)

To revert to UTC:

```sql
-- Set timezone back to UTC
ALTER DATABASE postgres SET timezone TO 'UTC';

-- Update defaults
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT table_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND column_name IN ('created_at', 'updated_at')
        GROUP BY table_name
    LOOP
        EXECUTE format('
            ALTER TABLE %I 
            ALTER COLUMN created_at 
            SET DEFAULT CURRENT_TIMESTAMP
        ', r.table_name);
        
        EXECUTE format('
            ALTER TABLE %I 
            ALTER COLUMN updated_at 
            SET DEFAULT CURRENT_TIMESTAMP
        ', r.table_name);
    END LOOP;
END $$;

-- Update trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## Testing Checklist

- [ ] Run migration successfully
- [ ] Restart backend server
- [ ] Verify `SHOW timezone;` returns `Asia/Kolkata`
- [ ] Create a new lead and check `created_at` timestamp
- [ ] Update a lead and check `updated_at` timestamp
- [ ] Check frontend displays correct time
- [ ] Verify all tables have IST timestamps
- [ ] Test in production environment

---

## Support

If you encounter any issues with timezone configuration, check:
1. Database connection logs
2. Migration execution logs
3. PostgreSQL version (should be 9.6+)
4. Connection pool configuration
5. Environment variables (DATABASE_URL)
