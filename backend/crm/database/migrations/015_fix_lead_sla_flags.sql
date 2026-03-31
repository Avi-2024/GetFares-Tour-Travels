UPDATE leads
SET sla_breached = (response_at > response_deadline)
WHERE response_at IS NOT NULL
  AND response_deadline IS NOT NULL
  AND sla_breached IS DISTINCT FROM (response_at > response_deadline);
