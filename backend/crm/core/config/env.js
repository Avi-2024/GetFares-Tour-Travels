import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

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
  RBAC_PERMISSION_CACHE_TTL_SEC: z.coerce.number().int().positive().default(60),
  DATABASE_URL: z.string().optional(),
  MYSQL_HOST: z.string().optional(),
  MYSQL_PORT: z.coerce.number().int().positive().default(3306),
  MYSQL_USER: z.string().optional(),
  MYSQL_PASSWORD: z.string().optional(),
  MYSQL_DATABASE: z.string().optional(),
  LOG_LEVEL: z.string().default("info"),
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
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_REGION: z.string().optional(),
  AWS_S3_BUCKET_NAME: z.string().optional(),
  AWS_S3_BUCKET: z.string().optional(),
  AWS_S3_PUBLIC_READ: z.coerce.boolean().optional(),
  AWS_S3_PUBLIC_BASE_URL: z.string().url().optional(),
  AWS_S3_UPLOAD_PREFIX: z.string().optional(),
  UPLOAD_MAX_SIZE_MB: z.coerce.number().int().positive().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: z.coerce.boolean().default(false),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM_EMAIL: z.string().email().optional(),
  SMTP_FROM_NAME: z.string().default("Get2Vacations"),
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
