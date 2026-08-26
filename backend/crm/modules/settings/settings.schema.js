const SettingsSchema = Object.freeze({
  tableName: "app_settings",
  leadStatusMainTable: "lead_status_main",
  leadStatusSubTable: "lead_status_sub",
  entityName: "Settings",
  keys: Object.freeze({
    system: "system",
    integrations: "integrations",
  }),
});

export { SettingsSchema };
