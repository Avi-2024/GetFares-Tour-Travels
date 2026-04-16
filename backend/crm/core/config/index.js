import { env } from "./env.js";

function resolveAzureStorageConnectionString() {
  const direct = String(env.AZURE_STORAGE_CONNECTION_STRING || "").trim();
  if (direct) {
    return direct;
  }
  const name = String(env.AZURE_STORAGE_ACCOUNT_NAME || "").trim();
  const key = String(env.AZURE_STORAGE_ACCOUNT_KEY || "").trim();
  if (!name || !key) {
    return undefined;
  }
  const suffix = String(env.AZURE_STORAGE_ENDPOINT_SUFFIX || "core.windows.net").trim() || "core.windows.net";
  return `DefaultEndpointsProtocol=https;AccountName=${name};AccountKey=${key};EndpointSuffix=${suffix}`;
}

const config = Object.freeze({
  env: env.NODE_ENV,
  app: {
    name: env.APP_NAME,
    version: env.APP_VERSION,
    port: env.PORT,
    corsOrigin: env.CORS_ORIGIN,
    shutdownTimeoutMs: env.SHUTDOWN_TIMEOUT_MS,
  },
  auth: {
    jwtAccessSecret: env.JWT_ACCESS_SECRET,
    jwtAccessExpiresIn: env.JWT_ACCESS_EXPIRES_IN,
    defaultRole: env.AUTH_DEFAULT_ROLE,
    bcryptRounds: env.AUTH_BCRYPT_ROUNDS,
    dbSlowQueryMs: env.AUTH_DB_SLOW_QUERY_MS,
  },
  rbac: {
    permissionCacheTtlMs: env.RBAC_PERMISSION_CACHE_TTL_SEC * 1000,
  },
  database: {
    client: env.DATABASE_CLIENT,
    url: env.DATABASE_URL,
    mysql: {
      host: env.MYSQL_HOST,
      port: env.MYSQL_PORT || 3306,
      user: env.MYSQL_USER,
      password: env.MYSQL_PASSWORD,
      database: env.MYSQL_DATABASE,
      ssl: env.MYSQL_SSL,
      poolMax: env.MYSQL_POOL_MAX,
      poolQueueLimit: env.MYSQL_POOL_QUEUE_LIMIT,
      connectTimeoutMs: env.MYSQL_CONNECT_TIMEOUT_MS,
    },
    azureSql: {
      server: env.AZURE_SQL_SERVER,
      database: env.AZURE_SQL_DATABASE,
      user: env.AZURE_SQL_USER,
      password: env.AZURE_SQL_PASSWORD,
      port: env.AZURE_SQL_PORT || 1433,
      trustServerCertificate: env.AZURE_SQL_TRUST_SERVER_CERTIFICATE ?? false,
    },
  },
  logger: {
    level: env.LOG_LEVEL,
    logDbUrl: env.LOG_DB_URL,
    logDbDirectUrl: env.LOG_DB_DIRECT_URL,
    logDbCollection: env.LOG_DB_COLLECTION,
  },
  health: {
    dbTimeoutMs: env.HEALTH_DB_TIMEOUT_MS,
  },
  metrics: {
    enabled: env.METRICS_ENABLED,
    token: env.METRICS_TOKEN,
  },
  meta: {
    verifyToken: env.META_VERIFY_TOKEN,
    accessToken: env.META_ACCESS_TOKEN,
    graphBaseUrl: env.META_GRAPH_BASE_URL,
    graphVersion: env.META_GRAPH_VERSION,
    graphFields: env.META_GRAPH_FIELDS.split(",")
      .map((field) => field.trim())
      .filter(Boolean),
  },
  whatsapp: {
    verifyToken: env.WHATSAPP_VERIFY_TOKEN || env.META_VERIFY_TOKEN,
    accessToken: env.WHATSAPP_ACCESS_TOKEN || env.META_ACCESS_TOKEN,
    appSecret: env.WHATSAPP_APP_SECRET,
    appId: env.WHATSAPP_APP_ID,
    phoneNumberId: env.WHATSAPP_PHONE_NUMBER_ID,
    apiBaseUrl: env.WHATSAPP_API_BASE_URL || env.META_GRAPH_BASE_URL,
    apiVersion: env.WHATSAPP_API_VERSION,
    allowInsecureWebhooks: env.WHATSAPP_ALLOW_INSECURE_WEBHOOKS,
    preTravelDays: env.WHATSAPP_PRE_TRAVEL_DAYS,
    postTravelDays: env.WHATSAPP_POST_TRAVEL_DAYS,
    templates: {
      leadWelcome: env.WHATSAPP_TEMPLATE_LEAD_WELCOME,
      leadFollowup: env.WHATSAPP_TEMPLATE_LEAD_FOLLOWUP,
      quotation: env.WHATSAPP_TEMPLATE_QUOTATION,
      quotationReminder: env.WHATSAPP_TEMPLATE_QUOTATION_REMINDER,
      booking: env.WHATSAPP_TEMPLATE_BOOKING,
      payment: env.WHATSAPP_TEMPLATE_PAYMENT,
      visa: env.WHATSAPP_TEMPLATE_VISA,
      preTravel: env.WHATSAPP_TEMPLATE_PRE_TRAVEL,
      postTravel: env.WHATSAPP_TEMPLATE_POST_TRAVEL,
    },
  },
  automation: {
    enabled: env.AUTOMATION_ENABLED,
    startupDelayMs: env.AUTOMATION_STARTUP_DELAY_MS,
    lockTimeoutSec: env.AUTOMATION_LOCK_TIMEOUT_SEC,
    deadlineLookaheadHours: env.AUTOMATION_DEADLINE_LOOKAHEAD_HOURS,
    supplierLookaheadDays: env.AUTOMATION_SUPPLIER_LOOKAHEAD_DAYS,
    bookingTravelBackfillDays: env.AUTOMATION_BOOKING_TRAVEL_BACKFILL_DAYS,
    intervalsMs: {
      leadSla: env.AUTOMATION_LEAD_SLA_INTERVAL_MS,
      leadFollowup: env.AUTOMATION_LEAD_FOLLOWUP_INTERVAL_MS,
      leadFollowupReminder: env.AUTOMATION_LEAD_FOLLOWUP_REMINDER_INTERVAL_MS,
      leadQueue: env.AUTOMATION_LEAD_QUEUE_INTERVAL_MS,
      quotationReminders: env.AUTOMATION_QUOTATION_REMINDERS_INTERVAL_MS,
      bookingTravelReminders: env.AUTOMATION_BOOKING_TRAVEL_REMINDERS_INTERVAL_MS,
      bookingDeadlines: env.AUTOMATION_BOOKING_DEADLINES_INTERVAL_MS,
      supplierPayables: env.AUTOMATION_SUPPLIER_PAYABLE_INTERVAL_MS,
    },
  },
  azureBlob: {
    connectionString: resolveAzureStorageConnectionString(),
    containerName: env.AZURE_STORAGE_CONTAINER,
    publicRead: env.AZURE_STORAGE_PUBLIC_READ ?? false,
    publicBaseUrl: env.AZURE_STORAGE_PUBLIC_BASE_URL,
    uploadPrefix: env.AZURE_STORAGE_UPLOAD_PREFIX,
    maxUploadSizeMb: env.UPLOAD_MAX_SIZE_MB || 10,
  },
  uploads: {
    maxFileSizeMb: env.UPLOAD_MAX_SIZE_MB || 10,
  },
  currency: {
    apiKey: env.CURRENCY_API_KEY,
    useMock: env.CURRENCY_USE_MOCK === 'true',
    baseCurrency: env.CURRENCY_BASE,
    supportedCurrencies: env.CURRENCY_SUPPORTED.split(",")
      .map((currency) => String(currency || "").trim().toUpperCase())
      .filter(Boolean),
  },
});

export { config, env };
