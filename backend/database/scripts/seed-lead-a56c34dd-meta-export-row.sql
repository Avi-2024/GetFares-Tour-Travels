-- Populate existing lead with Meta export row (Supriya / leadgen 910400815152791).
-- Target UI: http://localhost:5173/leads/a56c34dd-cfe0-4db2-b19a-9bff74f2d051
--
-- Run (adjust user/host/db):
--   mysql -h 127.0.0.1 -u YOUR_USER -p YOUR_DB < backend/database/scripts/seed-lead-a56c34dd-meta-export-row.sql
--
-- MySQL 8+ (uses UUID()). Requires: leads.dynamic_fields, lead_dynamic_fields (migration 056+).

SET @lid := 'a56c34dd-cfe0-4db2-b19a-9bff74f2d051';

-- Dev-only: free meta_lead_id if another row holds it (unique index idx_leads_meta_lead_id).
UPDATE leads SET meta_lead_id = NULL WHERE meta_lead_id = '910400815152791' AND id <> @lid;

UPDATE leads
SET
  full_name = 'Supriya Punwee',
  email = 'supriyaparsa98@outlook.com',
  phone = '+918554989229',
  phone_normalized = '918554989229',
  platform = 'instagram',
  campaign_name = '5 Packages Leads | India |  14 April',
  ad_name = 'Broad Audience || Reel ad',
  source = 'Meta India Page',
  lead_country = 'India',
  travel_to = NULL,
  meta_lead_id = '910400815152791',
  meta_ad_id = '120247522809820110',
  meta_adset_id = '120247522809810110',
  meta_campaign_id = '120247520245520110',
  meta_form_id = '35414224904842634',
  client_created_at = '2026-04-15 23:28:41',
  client_timezone = 'Asia/Kolkata',
  utm_source = 'meta',
  utm_medium = 'lead_ads',
  utm_campaign = '120247520245520110',
  dynamic_fields = CAST(
    CONCAT(
      '{',
      '"which_destination_would_you_like_to_visit":"not_sure_(help_me_choose)",',
      '"who_will_you_be_travelling_with":"couple",',
      '"how_soon_are_you_planning_to_book_your_package":"immediately",',
      '"what_is_your_budget_per_person":"<_40k"',
      '}'
    ) AS JSON
  ),
  dynamic_field_labels = CAST(
    CONCAT(
      '{',
      '"which_destination_would_you_like_to_visit":"Which destination would you like to visit?",',
      '"who_will_you_be_travelling_with":"Who will you be travelling with?",',
      '"how_soon_are_you_planning_to_book_your_package":"How soon are you planning to book your package?",',
      '"what_is_your_budget_per_person":"What is your budget per person?"',
      '}'
    ) AS JSON
  ),
  updated_at = CURRENT_TIMESTAMP
WHERE id = @lid;

DELETE FROM lead_dynamic_fields WHERE lead_id = @lid;

INSERT INTO lead_dynamic_fields (id, lead_id, field_key, field_label, field_value)
VALUES
  (UUID(), @lid, 'which_destination_would_you_like_to_visit', 'Which destination would you like to visit?', 'not_sure_(help_me_choose)'),
  (UUID(), @lid, 'who_will_you_be_travelling_with', 'Who will you be travelling with?', 'couple'),
  (UUID(), @lid, 'how_soon_are_you_planning_to_book_your_package', 'How soon are you planning to book your package?', 'immediately'),
  (UUID(), @lid, 'what_is_your_budget_per_person', 'What is your budget per person?', '<_40k');

SELECT id, full_name, email, phone, meta_lead_id, source, campaign_name, JSON_PRETTY(dynamic_fields) AS dynamic_fields
FROM leads
WHERE id = @lid;
