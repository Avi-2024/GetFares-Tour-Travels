import { z } from "zod";

const optionalSecret = z.string().trim().max(4096).optional();

function parseBodyCandidate(value) {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!trimmed) return value;
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

function normalizeRequestBody(value) {
  const parsed = parseBodyCandidate(value);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return parsed;
  }

  const record = parsed;
  if (
    record.body !== undefined &&
    record.pageId === undefined &&
    record.sourceLabel === undefined
  ) {
    return normalizeRequestBody(record.body);
  }

  if (
    record.data !== undefined &&
    record.pageId === undefined &&
    record.sourceLabel === undefined
  ) {
    return normalizeRequestBody(record.data);
  }

  return parsed;
}

const requestBody = (schema) => z.preprocess(normalizeRequestBody, schema);

const pageBody = z.object({
  pageId: z.string().trim().min(5).max(120).optional(),
  pageName: z.string().trim().max(150).nullable().optional(),
  accountName: z.string().trim().max(150).nullable().optional(),
  countryId: z.string().uuid().nullable().optional(),
  countryCode: z.string().trim().max(20).nullable().optional(),
  countryName: z.string().trim().max(150).nullable().optional(),
  sourceLabel: z.string().trim().max(120).optional(),
  accessToken: optionalSecret,
  appSecret: optionalSecret,
  verifyToken: optionalSecret,
  graphVersion: z.string().trim().max(40).nullable().optional(),
  graphBaseUrl: z
    .union([z.string().trim().url(), z.literal(""), z.null()])
    .optional()
    .transform((v) => (v === "" ? null : v)),
  graphFields: z.string().trim().max(500).nullable().optional(),
  isActive: z.boolean().optional(),
  confirmSecrets: z.boolean().optional(),
});

const integrationBody = z.object({
  appSecret: optionalSecret,
  verifyToken: optionalSecret,
  graphVersion: z.string().trim().max(40).nullable().optional(),
  graphBaseUrl: z
    .union([z.string().trim().url(), z.literal(""), z.null()])
    .optional()
    .transform((v) => (v === "" ? null : v)),
  graphFields: z.string().trim().max(500).nullable().optional(),
  allowInsecureWebhooks: z.boolean().optional(),
  confirmSecrets: z.boolean().optional(),
});

export const MetaPageConfigValidation = {
  listPages: z.object({
    query: z.object({
      isActive: z
        .enum(["true", "false"])
        .optional()
        .transform((v) => (v === undefined ? undefined : v === "true")),
    }),
    body: z.unknown().optional(),
    params: z.unknown().optional(),
  }),

  getPage: z.object({
    params: z.object({ id: z.string().uuid() }),
    body: z.unknown().optional(),
    query: z.unknown().optional(),
  }),

  createPage: z.object({
    body: requestBody(pageBody.extend({
      pageId: z.string().trim().min(5).max(120),
    })),
    params: z.unknown().optional(),
    query: z.unknown().optional(),
  }),

  updatePage: z.object({
    params: z.object({ id: z.string().uuid() }),
    body: requestBody(pageBody),
    query: z.unknown().optional(),
  }),

  deletePage: z.object({
    params: z.object({ id: z.string().uuid() }),
    body: z.unknown().optional(),
    query: z.unknown().optional(),
  }),

  updateIntegration: z.object({
    body: requestBody(integrationBody),
    params: z.unknown().optional(),
    query: z.unknown().optional(),
  }),
};
