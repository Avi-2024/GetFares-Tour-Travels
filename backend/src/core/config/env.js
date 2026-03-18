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
    .min(128)
    .default("super-secret-key-minimum-16-chars"),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  DATABASE_URL: z.string().optional(),
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
