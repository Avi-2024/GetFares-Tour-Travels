-- Dummy Meta-style data for lead 71acb081-659c-48c8-a195-c85cabd188b3
-- UI: /leads/71acb081-659c-48c8-a195-c85cabd188b3
--
-- mysql -h HOST -u USER -p DB < backend/database/scripts/seed-lead-71acb081-dummy.sql

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;
SET collation_connection = 'utf8mb4_unicode_ci';
SET @lid := CAST('71acb081-659c-48c8-a195-c85cabd188b3' AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci;

UPDATE leads
SET
  city = 'Mumbai',
  travel_to = 'Bali, Singapore',
  destination_id = NULL,
  platform = 'meta',
  campaign_name = '5 Packages Leads | India | 14 April',
  ad_name = 'Broad Audience || Reel ad',
  full_name = COALESCE(NULLIF(TRIM(full_name), ''), 'Dummy Meta Lead'),
  email = COALESCE(NULLIF(TRIM(email), ''), 'dummy.meta.lead@example.com'),
  phone = COALESCE(NULLIF(TRIM(phone), ''), '+919999999999'),
  dynamic_fields = CAST(
    CONCAT(
      '{',
      '"which_destination_would_you_like_to_visit":"bali",',
      '"who_will_you_be_travelling_with":"couple",',
      '"how_soon_are_you_planning_to_book_your_package":"within_2_weeks",',
      '"what_is_your_budget_per_person":"40k_-_75k",',
      '"which_destinations_are_you_interested_in_you_can_mention_multiple":"Bali, Singapore"',
      '}'
    ) AS JSON
  ),
  dynamic_field_labels = CAST(
    CONCAT(
      '{',
      '"which_destination_would_you_like_to_visit":"Which destination would you like to visit?",',
      '"who_will_you_be_travelling_with":"Who will you be travelling with?",',
      '"how_soon_are_you_planning_to_book_your_package":"How soon are you planning to book your package?",',
      '"what_is_your_budget_per_person":"What is your budget per person?",',
      '"which_destinations_are_you_interested_in_you_can_mention_multiple":"Which destinations are you interested in? (you can mention multiple)"',
      '}'
    ) AS JSON
  ),
  updated_at = CURRENT_TIMESTAMP
WHERE id COLLATE utf8mb4_unicode_ci = @lid;

DELETE FROM lead_dynamic_fields WHERE lead_id COLLATE utf8mb4_unicode_ci = @lid;

INSERT INTO lead_dynamic_fields (id, lead_id, field_key, field_label, field_value)
VALUES
  (UUID(), @lid, 'which_destination_would_you_like_to_visit', 'Which destination would you like to visit?', 'bali'),
  (UUID(), @lid, 'who_will_you_be_travelling_with', 'Who will you be travelling with?', 'couple'),
  (UUID(), @lid, 'how_soon_are_you_planning_to_book_your_package', 'How soon are you planning to book your package?', 'within_2_weeks'),
  (UUID(), @lid, 'what_is_your_budget_per_person', 'What is your budget per person?', '40k_-_75k'),
  (UUID(), @lid, 'which_destinations_are_you_interested_in_you_can_mention_multiple', 'Which destinations are you interested in? (you can mention multiple)', 'Bali, Singapore');

SELECT id, full_name, city, travel_to, platform, campaign_name, ad_name
FROM leads
WHERE id COLLATE utf8mb4_unicode_ci = @lid;
