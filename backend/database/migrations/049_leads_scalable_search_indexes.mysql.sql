CREATE INDEX idx_leads_email_lookup ON leads(email);
CREATE INDEX idx_leads_country_created_at ON leads(lead_country, created_at);
CREATE INDEX idx_leads_phone_created_at ON leads(phone, created_at);
