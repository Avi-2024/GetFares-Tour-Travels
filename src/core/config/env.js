const dotenv = require('dotenv');
const { z } = require('zod');

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_NAME: z.string().default('travel-crm'),
  APP_VERSION: z.string().default('1.0.0'),
  PORT: z.coerce.number().int().positive().default(3000),
  CORS_ORIGIN: z.string().default('*'),
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  DATABASE_URL: z.string().optional(),
  LOG_LEVEL: z.string().default('info'),
  HEALTH_DB_TIMEOUT_MS: z.coerce.number().int().positive().default(2000),
  SHUTDOWN_TIMEOUT_MS: z.coerce.number().int().positive().default(10000),
  METRICS_ENABLED: z.coerce.boolean().default(true),
  METRICS_TOKEN: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  throw new Error(`Invalid environment configuration: ${JSON.stringify(parsed.error.flatten().fieldErrors)}`);
}

module.exports = { env: parsed.data };
