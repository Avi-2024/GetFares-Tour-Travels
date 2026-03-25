const LeadsSchema = Object.freeze({
  tableName: "leads",
  customersTable: "customers",
  activitiesTable: "lead_activities",
  followupsTable: "followups",
  followupAlertLogsTable: "lead_followup_alert_logs",
  queuedLeadsTable: "queued_leads",
  usersTable: "users",
  rolesTable: "roles",
  destinationsTable: "destinations",
  entityName: "Leads",
});

export { LeadsSchema };
