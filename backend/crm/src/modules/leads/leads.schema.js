const LeadsSchema = Object.freeze({
  tableName: "leads",
  customersTable: "customers",
  activitiesTable: "lead_activities",
  followupsTable: "followups",
  followupAlertLogsTable: "lead_followup_alert_logs",
  queuedLeadsTable: "queued_leads",
  usersTable: "users",
  countriesTable: "countries",
  userCountriesTable: "user_countries",
  rolesTable: "roles",
  assignmentHistoryTable: "lead_assignment_history",
  destinationsTable: "destinations",
  appSettingsTable: "app_settings",
  entityName: "Leads",
});

export { LeadsSchema };
