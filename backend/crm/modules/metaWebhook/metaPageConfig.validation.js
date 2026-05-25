import { z } from "zod";

const optionalSecret = z.string().trim().max(4096).optional();

const pageBody = z.object({
  pageId: z.string().trim().min(5).max(120).optional(),
  pageName: z.string().trim().max(150).nullable().optional(),
  countryId: z.string().uuid().nullable().optional(),
  countryCode: z.string().trim().max(20).nullable().optional(),
  countryName: z.string().trim().max(150).nullable().optional(),
  sourceLabel: z.string().trim().min(2).max(120).optional(),
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
    body: pageBody.extend({
      pageId: z.string().trim().min(5).max(120),
      sourceLabel: z.string().trim().min(2).max(120),
    }),
    params: z.unknown().optional(),
    query: z.unknown().optional(),
  }),

  updatePage: z.object({
    params: z.object({ id: z.string().uuid() }),
    body: pageBody,
    query: z.unknown().optional(),
  }),

  updateIntegration: z.object({
    body: integrationBody,
    params: z.unknown().optional(),
    query: z.unknown().optional(),
  }),
};
