CREATE INDEX IF NOT EXISTS idx_leads_assigned_at ON leads(assigned_at);
CREATE INDEX IF NOT EXISTS idx_leads_sla_breached ON leads(sla_breached);

CREATE INDEX IF NOT EXISTS idx_followups_lead_id ON followups(lead_id);
CREATE INDEX IF NOT EXISTS idx_followups_due_open ON followups(followup_date, is_completed);

CREATE INDEX IF NOT EXISTS idx_lead_activities_lead_user_created
  ON lead_activities(lead_id, user_id, created_at);
