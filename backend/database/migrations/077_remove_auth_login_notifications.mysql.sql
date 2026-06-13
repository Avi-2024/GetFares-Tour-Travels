-- Login events remain available in structured application logs.
-- They are not actionable CRM notifications.
DELETE FROM notification_events
WHERE event_name = 'auth.logged_in';
