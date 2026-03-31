-- Migration: Add indexes for optimized country-based lead assignment
-- Date: 2024-01-15
-- Purpose: Speed up country-based agent queries and round-robin lookups

-- Index for country-based agent queries
-- This speeds up: SELECT * FROM users WHERE agent_country = 'india' AND is_active = true
CREATE INDEX IF NOT EXISTS idx_users_country_active 
ON users(agent_country, is_active, is_on_leave) 
WHERE is_active = true AND is_on_leave = false;

-- Index for agent type filtering
-- This speeds up: SELECT * FROM users WHERE agent_type = 'HOLIDAY'
CREATE INDEX IF NOT EXISTS idx_users_agent_type 
ON users(agent_type) 
WHERE is_active = true;

-- Composite index for country + type queries
-- This speeds up: SELECT * FROM users WHERE agent_country = 'india' AND agent_type = 'HOLIDAY'
CREATE INDEX IF NOT EXISTS idx_users_country_type 
ON users(agent_country, agent_type, is_active) 
WHERE is_active = true AND is_on_leave = false;

-- Index for round-robin last assigned lookup
-- This speeds up: SELECT * FROM leads WHERE assigned_to IN (...) ORDER BY assigned_at DESC
CREATE INDEX IF NOT EXISTS idx_leads_assigned_at 
ON leads(assigned_at DESC) 
WHERE assigned_to IS NOT NULL;

-- Index for lead country filtering
-- This speeds up: SELECT * FROM leads WHERE lead_country = 'india'
CREATE INDEX IF NOT EXISTS idx_leads_country 
ON leads(lead_country);

-- Verify indexes created
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename IN ('users', 'leads')
  AND indexname LIKE 'idx_%country%'
ORDER BY tablename, indexname;
