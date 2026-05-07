-- Add missing lead_country column to leads table
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS lead_country VARCHAR(100);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_leads_lead_country ON leads(lead_country);

-- Add missing country_id column if needed
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS country_id UUID REFERENCES countries(id) ON DELETE SET NULL;

-- Add missing destination_name column for backward compatibility
ALTER TABLE leads
ADD COLUMN IF NOT EXISTS destination_name VARCHAR(200);

-- Update existing leads to populate destination_name from destinations table
UPDATE leads l
SET destination_name = d.name
FROM destinations d
WHERE l.destination_id = d.id
  AND l.destination_name IS NULL;
