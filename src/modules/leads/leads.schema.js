const LeadsSchema = Object.freeze({
  tableName: 'leads',
  activitiesTable: 'lead_activities',
  followupsTable: 'followups',
  usersTable: 'users',
  rolesTable: 'roles',
  destinationsTable: 'destinations',
  entityName: 'Leads',
});

module.exports = { LeadsSchema };
