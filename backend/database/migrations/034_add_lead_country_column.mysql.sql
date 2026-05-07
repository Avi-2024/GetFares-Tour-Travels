-- Add lead_country column to leads table (MySQL)
-- This column stores the country associated with the lead

ALTER TABLE leads 
ADD COLUMN lead_country VARCHAR(100);

-- Create index for better query performance
CREATE INDEX idx_leads_lead_country ON leads(lead_country);

-- Add country_id column for foreign key relationship
ALTER TABLE leads 
ADD COLUMN country_id VARCHAR(36);

-- Add foreign key constraint if countries table exists
-- ALTER TABLE leads 
-- ADD CONSTRAINT fk_leads_country_id 
-- FOREIGN KEY (country_id) REFERENCES countries(id) ON DELETE SET NULL;
