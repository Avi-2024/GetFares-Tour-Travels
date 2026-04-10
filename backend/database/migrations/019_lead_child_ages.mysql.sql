-- Add structured child_ages array to leads (MySQL uses JSON instead of array)
ALTER TABLE leads ADD COLUMN child_ages JSON;
