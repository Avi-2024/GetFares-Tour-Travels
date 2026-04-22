-- MySQL migration: add itinerary/hotel/visa fields to quotation templates
-- Keep templates editable and reusable in /quotations/templates.

ALTER TABLE quotation_templates
  ADD COLUMN IF NOT EXISTS itinerary JSON NULL,
  ADD COLUMN IF NOT EXISTS hotel_details TEXT NULL,
  ADD COLUMN IF NOT EXISTS visa_details TEXT NULL;

