import { z } from "zod";
import {
  META_LEAD_SCOPE_TYPES,
  META_LEAD_TRANSFORMS,
  isAllowedTargetColumn,
} from "./metaLeadMapping.constants.js";

const scopeType = z.enum(META_LEAD_SCOPE_TYPES);
const transform = z.enum(META_LEAD_TRANSFORMS);
const leadType = z.enum(["HOLIDAY", "VISA", "BOTH"]).optional();

const metaFieldKeys = z
  .array(z.string().trim().min(1).max(120))
  .min(1)
  .max(20);

const targetColumn = z
  .string()
  .trim()
  .max(64)
  .refine((value) => isAllowedTargetColumn(value), {
    message: "targetColumn is not an allowed leads column",
  });

const profileBody = z.object({
  name: z.string().trim().min(2).max(150),
  scopeType,
  scopeId: z.string().trim().max(120).optional(),
  priority: z.coerce.number().int().min(1).max(9999).optional(),
  leadType: leadType.nullable().optional(),
  leadCountry: z.string().trim().max(100).nullable().optional(),
  clientCurrency: z.string().trim().min(3).max(10).nullable().optional(),
  sourceLabel: z.string().trim().max(120).nullable().optional(),
  isActive: z.boolean().optional(),
});

const fieldMapBody = z.object({
  metaFieldKeys,
  targetColumn,
  transform: transform.optional(),
  stripFromDynamic: z.boolean().optional(),
  sortOrder: z.coerce.number().int().min(0).max(9999).optional(),
  isActive: z.boolean().optional(),
});

const testMapBody = z.object({
  fieldData: z
    .array(
      z.object({
        name: z.string(),
        values: z.union([z.array(z.string()), z.string()]).optional(),
        value: z.union([z.array(z.string()), z.string()]).optional(),
      }),
    )
    .min(1),
  metaAdId: z.string().trim().max(120).optional(),
  metaFormId: z.string().trim().max(120).optional(),
  metaCampaignId: z.string().trim().max(120).optional(),
  metaPageId: z.string().trim().max(120).optional(),
});

const createTestLeadBody = testMapBody.extend({
  metaPageId: z.string().trim().min(1).max(120),
  leadgenId: z.string().trim().max(120).optional(),
});

export const MetaLeadMappingValidation = {
  listProfiles: z.object({
    query: z
      .object({
        isActive: z
          .enum(["true", "false"])
          .optional()
          .transform((v) => (v === undefined ? undefined : v === "true")),
      })
      .optional(),
  }),

  getProfile: z.object({
    params: z.object({ id: z.string().uuid() }),
  }),

  createProfile: z.object({
    body: profileBody,
  }),

  updateProfile: z.object({
    params: z.object({ id: z.string().uuid() }),
    body: profileBody.partial(),
  }),

  createFieldMap: z.object({
    params: z.object({ profileId: z.string().uuid() }),
    body: fieldMapBody,
  }),

  updateFieldMap: z.object({
    params: z.object({ id: z.string().uuid() }),
    body: fieldMapBody.partial(),
  }),

  deleteFieldMap: z.object({
    params: z.object({ id: z.string().uuid() }),
  }),

  testMap: z.object({
    body: testMapBody,
  }),

  createTestLead: z.object({
    body: createTestLeadBody,
  }),
};
