-- Dev-only: sample rows for GET /api/leads/:id/followups → LeadDetails "Follow-up History" / "Scheduled Follow-ups".
-- History = is_schedule_only = 0. Scheduled = is_schedule_only = 1 AND is_completed = 0.
-- Uses latest lead by created_at. Requires at least one row in `leads`.

INSERT INTO followups (
  id,
  lead_id,
  user_id,
  followup_type,
  followup_date,
  notes,
  is_completed,
  is_schedule_only,
  cadence_code,
  counts_toward_compliance,
  created_at
)
SELECT
  UUID(),
  (SELECT id FROM leads ORDER BY created_at DESC LIMIT 1),
  NULL,
  1,
  DATE_SUB(NOW(), INTERVAL 1 DAY),
  'Seed: completed call (history)',
  TRUE,
  FALSE,
  NULL,
  TRUE,
  NOW()
WHERE EXISTS (SELECT 1 FROM leads LIMIT 1);

INSERT INTO followups (
  id,
  lead_id,
  user_id,
  followup_type,
  followup_date,
  notes,
  is_completed,
  is_schedule_only,
  cadence_code,
  counts_toward_compliance,
  created_at
)
SELECT
  UUID(),
  (SELECT id FROM leads ORDER BY created_at DESC LIMIT 1),
  NULL,
  2,
  DATE_SUB(NOW(), INTERVAL 3 DAY),
  'Seed: WhatsApp logged (history)',
  TRUE,
  FALSE,
  NULL,
  TRUE,
  NOW()
WHERE EXISTS (SELECT 1 FROM leads LIMIT 1);

INSERT INTO followups (
  id,
  lead_id,
  user_id,
  followup_type,
  followup_date,
  notes,
  is_completed,
  is_schedule_only,
  cadence_code,
  counts_toward_compliance,
  created_at
)
SELECT
  UUID(),
  (SELECT id FROM leads ORDER BY created_at DESC LIMIT 1),
  NULL,
  1,
  DATE_ADD(NOW(), INTERVAL 2 DAY),
  'Seed: future call (scheduled)',
  FALSE,
  TRUE,
  NULL,
  FALSE,
  NOW()
WHERE EXISTS (SELECT 1 FROM leads LIMIT 1);
