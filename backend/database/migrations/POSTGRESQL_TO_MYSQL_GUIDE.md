# PostgreSQL to MySQL Migration Conversion Guide

## Key Differences and Conversions

### 1. UUID Generation
**PostgreSQL:**
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
```

**MySQL:**
```sql
id CHAR(36) PRIMARY KEY DEFAULT (UUID())
```

### 2. JSONB to JSON
**PostgreSQL:**
```sql
data JSONB DEFAULT '{}'::jsonb
```

**MySQL:**
```sql
data JSON DEFAULT (JSON_OBJECT())
```

### 3. ENUM Types
**PostgreSQL:**
```sql
CREATE TYPE lead_status AS ENUM ('OPEN', 'CONTACTED', 'WIP');
ALTER TYPE lead_status ADD VALUE 'NEW_VALUE';
```

**MySQL:**
```sql
-- Inline ENUM in column definition
status ENUM('OPEN', 'CONTACTED', 'WIP') DEFAULT 'OPEN'

-- To add new value, must ALTER TABLE
ALTER TABLE leads MODIFY COLUMN status ENUM('OPEN', 'CONTACTED', 'WIP', 'NEW_VALUE');
```

### 4. Arrays
**PostgreSQL:**
```sql
tags TEXT[]
```

**MySQL:**
```sql
-- Use JSON array instead
tags JSON
```

### 5. Conditional DDL (IF NOT EXISTS)
**PostgreSQL:**
```sql
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_name') THEN
    ALTER TABLE table_name ADD CONSTRAINT fk_name FOREIGN KEY ...;
  END IF;
END $$;
```

**MySQL:**
```sql
-- Use prepared statements
SET @query = IF(
  (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS 
   WHERE CONSTRAINT_SCHEMA = DATABASE() 
   AND TABLE_NAME = 'table_name' 
   AND CONSTRAINT_NAME = 'fk_name') = 0,
  'ALTER TABLE table_name ADD CONSTRAINT fk_name FOREIGN KEY ...',
  'SELECT 1'
);
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
```

### 6. Timestamps
**PostgreSQL:**
```sql
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

**MySQL:**
```sql
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
```

### 7. NUMERIC to DECIMAL
**PostgreSQL:**
```sql
amount NUMERIC(12,2)
```

**MySQL:**
```sql
amount DECIMAL(12,2)
```

### 8. Boolean
**PostgreSQL:**
```sql
is_active BOOLEAN DEFAULT TRUE
```

**MySQL:**
```sql
is_active BOOLEAN DEFAULT TRUE  -- Same syntax works
-- Or use TINYINT(1)
```

### 9. Timezone Functions
**PostgreSQL:**
```sql
SET TIME ZONE 'Asia/Kolkata';
ALTER DATABASE dbname SET timezone TO 'Asia/Kolkata';
```

**MySQL:**
```sql
SET GLOBAL time_zone = '+05:30';
SET time_zone = '+05:30';
```

### 10. Triggers
**PostgreSQL:**
```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_table_updated_at
BEFORE UPDATE ON table_name
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
```

**MySQL:**
```sql
DELIMITER $$

DROP TRIGGER IF EXISTS update_table_updated_at$$
CREATE TRIGGER update_table_updated_at
BEFORE UPDATE ON table_name
FOR EACH ROW
BEGIN
    SET NEW.updated_at = CURRENT_TIMESTAMP;
END$$

DELIMITER ;
```

### 11. Comments
**PostgreSQL:**
```sql
COMMENT ON COLUMN table_name.column_name IS 'Description';
```

**MySQL:**
```sql
-- Comments are added inline during CREATE/ALTER
ALTER TABLE table_name MODIFY COLUMN column_name VARCHAR(100) COMMENT 'Description';
```

### 12. Generated Columns
**PostgreSQL:**
```sql
profit_amount NUMERIC(12,2) GENERATED ALWAYS AS (total_amount - cost_amount) STORED
```

**MySQL:**
```sql
profit_amount DECIMAL(12,2) GENERATED ALWAYS AS (total_amount - cost_amount) STORED
```

### 13. ON DELETE/UPDATE Actions
**PostgreSQL & MySQL:** (Same syntax)
```sql
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
```

### 14. CHECK Constraints
**PostgreSQL & MySQL:** (Same syntax)
```sql
CHECK (amount >= 0)
CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED'))
```

### 15. Indexes
**PostgreSQL:**
```sql
CREATE INDEX idx_name ON table_name(column) WHERE condition;
```

**MySQL:**
```sql
-- Partial indexes not supported, create full index
CREATE INDEX idx_name ON table_name(column);
```

## Migration Status

### Converted Files:
- ✅ 001_add_crm_package_fields.sql
- ✅ 001_initial_schema.sql
- ✅ 002_initial_schema.sql
- ✅ 003_followups_schedule_only.sql
- ✅ 003_quotation_engine_sprint3.sql
- ✅ 004_notifications_socketio_mvp.sql
- ✅ 004_update_existing_followups.sql
- ✅ 005_finance_crm_mapping.sql
- ✅ 005_set_ist_timezone.sql

### Remaining Files:
- 006_prd_completion_modules.sql
- 007_meta_lead_ads.sql
- 008_settings_module.sql
- 009_dynamic_rbac_permissions.sql
- 010_quotation_prd_response_sla_pdf_notes.sql
- 011_leads_followup_compliance_and_packages_policy.sql
- 012_scheduler_deadlines_and_alert_logs.sql
- 013_leads_followup_alert_dedupe.sql
- 014_visa_workflow_stage_and_delivery.sql
- 015_fix_lead_sla_flags.sql
- 016_active_users_and_queued_leads.sql
- 018_roles_country.sql
- 019_lead_child_ages.sql
- 020_users_agent_fields.sql
- 021_leads_calls_disabled_packages_kind.sql
- 022_quotation_manual_trip_fields.sql
- 023_users_manager_hierarchy.sql
- 024_hierarchical_rbac_countries.sql
- 025_leads_list_performance_indexes.sql
- 026_booking_approval.sql
- 027_token_blacklist.sql
- 028_system_datetime_preferences_defaults.sql
- 029_followups_workflow_history_and_reminders.sql
- 030_followups_status_snapshot.sql
- 031_leads_travel_route_fields.sql
- 032_leads_travel_end_date.sql
- 033_leads_lead_code.sql
- 034_supplier_payable_settlements.sql
- 035_payments_invoice_uploads.sql

## Notes
- MySQL does not support partial indexes (WHERE clause in CREATE INDEX)
- MySQL ENUM types are defined inline, not as separate types
- MySQL uses CHAR(36) for UUIDs instead of UUID type
- MySQL JSON type replaces PostgreSQL JSONB
- Conditional DDL in MySQL requires prepared statements
