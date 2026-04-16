import dotenv from "dotenv";
import { z } from "zod";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRootEnvPath = path.resolve(__dirname, "../../../.env");

const defaultLoad = dotenv.config();
if (!defaultLoad.parsed) {
  dotenv.config({ path: backendRootEnvPath });
}

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  APP_NAME: z.string().default("travel-crm"),
  APP_VERSION: z.string().default("1.0.0"),
  PORT: z.coerce.number().int().positive().default(3000),
  CORS_ORIGIN: z.string().default("*"),
  JWT_ACCESS_SECRET: z
    .string()
    .min(32, "JWT secret must be at least 32 characters for security")
    .refine(
      (val) => {
        // Fail if using default weak secret in production
        if (process.env.NODE_ENV === 'production' && 
            val === 'super-secret-key-minimum-16-chars') {
          return false;
        }
        return true;
      },
      { message: "Must change default JWT secret in production environment" }
    ),
  JWT_ACCESS_EXPIRES_IN: z.string().default("7d"),
  AUTH_DEFAULT_ROLE: z.string().default("sales_consultant"),
  AUTH_BCRYPT_ROUNDS: z.coerce.number().int().min(6).max(12).default(8),
  AUTH_DB_SLOW_QUERY_MS: z.coerce.number().int().positive().default(150),
  RBAC_PERMISSION_CACHE_TTL_SEC: z.coerce.number().int().positive().default(60),
  DATABASE_CLIENT: z.string().optional(),
  DATABASE_URL: z.string().optional(),
  MYSQL_HOST: z.string().optional(),
  MYSQL_PORT: z.coerce.number().int().positive().default(3306),
  MYSQL_USER: z.string().optional(),
  MYSQL_PASSWORD: z.string().optional(),
  MYSQL_DATABASE: z.string().optional(),
  MYSQL_POOL_MAX: z.coerce.number().int().positive().max(200).default(50),
  MYSQL_POOL_QUEUE_LIMIT: z.coerce.number().int().min(0).default(0),
  MYSQL_CONNECT_TIMEOUT_MS: z.coerce.number().int().positive().default(15000),
  /** "true" | "false" | omit (auto: SSL on for *.mysql.database.azure.com) */
  MYSQL_SSL: z.string().optional(),
  AZURE_SQL_SERVER: z.string().optional(),
  AZURE_SQL_DATABASE: z.string().optional(),
  AZURE_SQL_USER: z.string().optional(),
  AZURE_SQL_PASSWORD: z.string().optional(),
  AZURE_SQL_PORT: z.coerce.number().int().positive().optional(),
  AZURE_SQL_TRUST_SERVER_CERTIFICATE: z.coerce.boolean().optional(),
  LOG_LEVEL: z.string().default("info"),
  LOG_DB_URL: z.string().optional(),
  LOG_DB_DIRECT_URL: z.string().optional(),
  LOG_DB_COLLECTION: z.string().default("application_logs"),
  HEALTH_DB_TIMEOUT_MS: z.coerce.number().int().positive().default(2000),
  SHUTDOWN_TIMEOUT_MS: z.coerce.number().int().positive().default(10000),
  METRICS_ENABLED: z.coerce.boolean().default(true),
  METRICS_TOKEN: z.string().optional(),
  META_VERIFY_TOKEN: z.string().optional(),
  META_ACCESS_TOKEN: z.string().optional(),
  META_GRAPH_BASE_URL: z.string().url().default("https://graph.facebook.com"),
  META_GRAPH_VERSION: z.string().default("v20.0"),
  META_GRAPH_FIELDS: z
    .string()
    .default(
      "id,created_time,field_data,ad_id,adset_id,campaign_id,form_id,page_id",
    ),
  WHATSAPP_VERIFY_TOKEN: z.string().optional(),
  WHATSAPP_ACCESS_TOKEN: z.string().optional(),
  WHATSAPP_APP_SECRET: z.string().optional(),
  WHATSAPP_APP_ID: z.string().optional(),
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
  WHATSAPP_API_BASE_URL: z.string().url().optional(),
  WHATSAPP_API_VERSION: z.string().default("v20.0"),
  WHATSAPP_ALLOW_INSECURE_WEBHOOKS: z.coerce.boolean().default(false),
  WHATSAPP_PRE_TRAVEL_DAYS: z.coerce.number().int().min(0).default(2),
  WHATSAPP_POST_TRAVEL_DAYS: z.coerce.number().int().min(0).default(1),
  WHATSAPP_TEMPLATE_LEAD_WELCOME: z.string().optional(),
  WHATSAPP_TEMPLATE_LEAD_FOLLOWUP: z.string().optional(),
  WHATSAPP_TEMPLATE_QUOTATION: z.string().optional(),
  WHATSAPP_TEMPLATE_QUOTATION_REMINDER: z.string().optional(),
  WHATSAPP_TEMPLATE_BOOKING: z.string().optional(),
  WHATSAPP_TEMPLATE_PAYMENT: z.string().optional(),
  WHATSAPP_TEMPLATE_VISA: z.string().optional(),
  WHATSAPP_TEMPLATE_PRE_TRAVEL: z.string().optional(),
  WHATSAPP_TEMPLATE_POST_TRAVEL: z.string().optional(),
  AUTOMATION_ENABLED: z.coerce.boolean().default(true),
  AUTOMATION_STARTUP_DELAY_MS: z.coerce.number().int().min(0).default(10000),
  AUTOMATION_LOCK_TIMEOUT_SEC: z.coerce.number().int().positive().default(240),
  AUTOMATION_LEAD_SLA_INTERVAL_MS: z
    .coerce.number()
    .int()
    .positive()
    .default(300000),
  AUTOMATION_LEAD_FOLLOWUP_INTERVAL_MS: z
    .coerce.number()
    .int()
    .positive()
    .default(900000),
  AUTOMATION_LEAD_FOLLOWUP_REMINDER_INTERVAL_MS: z
    .coerce.number()
    .int()
    .positive()
    .default(60000),
  AUTOMATION_LEAD_QUEUE_INTERVAL_MS: z
    .coerce.number()
    .int()
    .positive()
    .default(1800000),
  AUTOMATION_QUOTATION_REMINDERS_INTERVAL_MS: z
    .coerce.number()
    .int()
    .positive()
    .default(3600000),
  AUTOMATION_BOOKING_TRAVEL_REMINDERS_INTERVAL_MS: z
    .coerce.number()
    .int()
    .positive()
    .default(3600000),
  AUTOMATION_BOOKING_TRAVEL_BACKFILL_DAYS: z
    .coerce.number()
    .int()
    .min(0)
    .max(7)
    .default(1),
  AUTOMATION_BOOKING_DEADLINES_INTERVAL_MS: z
    .coerce.number()
    .int()
    .positive()
    .default(3600000),
  AUTOMATION_SUPPLIER_PAYABLE_INTERVAL_MS: z
    .coerce.number()
    .int()
    .positive()
    .default(3600000),
  AUTOMATION_DEADLINE_LOOKAHEAD_HOURS: z
    .coerce.number()
    .int()
    .min(1)
    .max(240)
    .default(24),
  AUTOMATION_SUPPLIER_LOOKAHEAD_DAYS: z
    .coerce.number()
    .int()
    .min(1)
    .max(60)
    .default(2),
  AZURE_STORAGE_CONNECTION_STRING: z.string().optional(),
  AZURE_STORAGE_ACCOUNT_NAME: z.string().optional(),
  AZURE_STORAGE_ACCOUNT_KEY: z.string().optional(),
  AZURE_STORAGE_ENDPOINT_SUFFIX: z.string().optional(),
  AZURE_STORAGE_CONTAINER: z.string().optional(),
  AZURE_STORAGE_PUBLIC_READ: z.coerce.boolean().optional(),
  AZURE_STORAGE_PUBLIC_BASE_URL: z.string().url().optional(),
  AZURE_STORAGE_UPLOAD_PREFIX: z.string().optional(),
  UPLOAD_MAX_SIZE_MB: z.coerce.number().int().positive().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: z.coerce.boolean().default(false),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM_EMAIL: z.string().email().optional(),
  SMTP_FROM_NAME: z.string().default("Get2Vacations"),
  CURRENCY_API_KEY: z.string().optional(),
  CURRENCY_USE_MOCK: z.string().optional(),
}).superRefine((data, ctx) => {
  const explicitClient = String(data.DATABASE_CLIENT || "")
    .trim()
    .toLowerCase();
  const dbUrl = String(data.DATABASE_URL || "").trim();
  const dbUrlLower = dbUrl.toLowerCase();
  const isMysqlUrl =
    dbUrlLower.startsWith("mysql://") || dbUrlLower.startsWith("mysql2://");

  const hasMysqlDiscreteConfig = Boolean(
    data.MYSQL_HOST && data.MYSQL_USER && data.MYSQL_DATABASE,
  );

  // If client is explicitly mysql, enforce mysql-compatible settings.
  if (explicitClient === "mysql" || explicitClient === "mariadb") {
    if (!isMysqlUrl && !hasMysqlDiscreteConfig) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["DATABASE_CLIENT"],
        message:
          'For DATABASE_CLIENT=mysql, set DATABASE_URL=mysql://... or MYSQL_HOST, MYSQL_USER, MYSQL_DATABASE.',
      });
    }
  }

  if (explicitClient === "mssql") {
    const server = String(
      data.AZURE_SQL_SERVER || process.env.DB_HOST || "",
    ).trim();
    const database = String(
      data.AZURE_SQL_DATABASE ||
        process.env.DB_NAME ||
        process.env.MYSQL_DATABASE ||
        "",
    ).trim();
    const user = String(
      data.AZURE_SQL_USER ||
        process.env.DB_USER ||
        process.env.MYSQL_USER ||
        "",
    ).trim();
    const password =
      data.AZURE_SQL_PASSWORD ??
      process.env.DB_PASSWORD ??
      process.env.MYSQL_PASSWORD;
    if (!server || !database || !user || password === undefined || password === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["AZURE_SQL_SERVER"],
        message:
          "For DATABASE_CLIENT=mssql set AZURE_SQL_SERVER, AZURE_SQL_DATABASE, AZURE_SQL_USER, AZURE_SQL_PASSWORD (or DB_* / MYSQL_* fallbacks).",
      });
    }
  }

  if (
    explicitClient &&
    explicitClient !== "mysql" &&
    explicitClient !== "mariadb" &&
    explicitClient !== "mssql"
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["DATABASE_CLIENT"],
      message:
        "Unsupported DATABASE_CLIENT. Use mysql, mariadb, or mssql (Azure SQL).",
    });
  }

  // If URL is present, validate recognizable URL schemes.
  if (dbUrl && !isMysqlUrl) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["DATABASE_URL"],
      message:
        "DATABASE_URL must start with mysql:// or mysql2://.",
    });
  }
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const errors = parsed.error.flatten().fieldErrors;
  const errorMessage = `Invalid environment configuration:\n${Object.entries(
    errors,
  )
    .map(([field, fieldErrors]) => `  ${field}: ${fieldErrors?.join(", ")}`)
    .join("\n")}`;
  throw new Error(errorMessage);
}

export const env = parsed.data;
