-- Add structured child_ages array to leads (replaces notes-based approach)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS child_ages INTEGER[];
