const SettingsSchema = Object.freeze({
  tableName: "app_settings",
  entityName: "Settings",
  keys: Object.freeze({
    system: "system",
    integrations: "integrations",
  }),
});

export { SettingsSchema };
