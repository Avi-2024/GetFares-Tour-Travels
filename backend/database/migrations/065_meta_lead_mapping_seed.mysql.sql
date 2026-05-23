-- Seed default Meta lead mapping profiles (safe to re-run: INSERT IGNORE)

INSERT IGNORE INTO meta_lead_profiles (
  id, name, scope_type, scope_id, priority, lead_type, lead_country, source_label, is_active
) VALUES
  (
    'a1000001-0000-4000-8000-000000000001',
    'UK Visa UAE Form',
    'form',
    '964456066326392',
    10,
    'VISA',
    NULL,
    'Getfares',
    TRUE
  ),
  (
    'a1000001-0000-4000-8000-000000000002',
    'India 5 Packages Form',
    'form',
    '35414224904842634',
    20,
    'HOLIDAY',
    NULL,
    'Meta India Page',
    TRUE
  ),
  (
    'a1000001-0000-4000-8000-000000000003',
    'Luxury Maldives Form (legacy)',
    'form',
    '1653700885666898',
    30,
    'HOLIDAY',
    NULL,
    'Meta UAE Page',
    TRUE
  ),
  (
    'a1000001-0000-4000-8000-000000000004',
    'Luxury Maldives Form (updated)',
    'form',
    '1424002562747237',
    30,
    'HOLIDAY',
    NULL,
    'Meta UAE Page',
    TRUE
  );

INSERT IGNORE INTO meta_lead_field_maps (
  id, profile_id, meta_field_keys, target_column, transform, strip_from_dynamic, sort_order
) VALUES
  (
    'b2000001-0000-4000-8000-000000000001',
    'a1000001-0000-4000-8000-000000000001',
    '["what_is_your_nationality"]',
    'nationality',
    'normalize_nationality',
    TRUE,
    10
  ),
  (
    'b2000001-0000-4000-8000-000000000002',
    'a1000001-0000-4000-8000-000000000001',
    '["what_is_the_purpose_of_travel"]',
    'travel_purpose',
    'none',
    TRUE,
    20
  ),
  (
    'b2000001-0000-4000-8000-000000000003',
    'a1000001-0000-4000-8000-000000000001',
    '["which_visa_assistance_are_you_looking_for"]',
    'travel_to',
    'truncate_150',
    TRUE,
    30
  ),
  (
    'b2000001-0000-4000-8000-000000000010',
    'a1000001-0000-4000-8000-000000000002',
    '["which_destination_would_you_like_to_visit","which_destinations_are_you_interested_in"]',
    'travel_to',
    'truncate_150',
    TRUE,
    10
  ),
  (
    'b2000001-0000-4000-8000-000000000011',
    'a1000001-0000-4000-8000-000000000002',
    '["what_is_your_budget_per_person"]',
    'budget',
    'parse_budget',
    TRUE,
    20
  ),
  (
    'b2000001-0000-4000-8000-000000000012',
    'a1000001-0000-4000-8000-000000000002',
    '["city"]',
    'city',
    'none',
    TRUE,
    30
  ),
  (
    'b2000001-0000-4000-8000-000000000020',
    'a1000001-0000-4000-8000-000000000003',
    '["what_is_your_nationality"]',
    'nationality',
    'normalize_nationality',
    TRUE,
    10
  ),
  (
    'b2000001-0000-4000-8000-000000000021',
    'a1000001-0000-4000-8000-000000000003',
    '["which_maldives_resort_are_you_interested_in"]',
    'travel_to',
    'truncate_150',
    TRUE,
    20
  ),
  (
    'b2000001-0000-4000-8000-000000000022',
    'a1000001-0000-4000-8000-000000000003',
    '["which_uae_city_will_you_be_travelling_from"]',
    'city',
    'none',
    TRUE,
    30
  );

INSERT IGNORE INTO meta_lead_field_maps (
  id, profile_id, meta_field_keys, target_column, transform, strip_from_dynamic, sort_order
) VALUES
  (
    'b2000001-0000-4000-8000-000000000031',
    'a1000001-0000-4000-8000-000000000004',
    '["what_is_your_nationality"]',
    'nationality',
    'normalize_nationality',
    TRUE,
    10
  ),
  (
    'b2000001-0000-4000-8000-000000000032',
    'a1000001-0000-4000-8000-000000000004',
    '["which_maldives_resort_are_you_interested_in"]',
    'travel_to',
    'truncate_150',
    TRUE,
    20
  ),
  (
    'b2000001-0000-4000-8000-000000000033',
    'a1000001-0000-4000-8000-000000000004',
    '["which_uae_city_will_you_be_travelling_from"]',
    'city',
    'none',
    TRUE,
    30
  );
