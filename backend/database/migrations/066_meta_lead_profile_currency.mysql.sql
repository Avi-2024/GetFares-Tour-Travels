ALTER TABLE meta_lead_profiles
  ADD COLUMN client_currency VARCHAR(10) NULL AFTER lead_country;
