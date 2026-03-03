const { z } = require('zod');

const leadStatus = z.enum(['OPEN', 'CONTACTED', 'WIP', 'QUOTED', 'FOLLOW_UP', 'CONVERTED', 'LOST']);

const dateTimeString = z.string().refine((value) => !Number.isNaN(new Date(value).getTime()), {
  message: 'Invalid date-time',
});

const basePayload = z.object({
  fullName: z.string().min(2),
  phone: z.string().min(6).max(20).optional(),
  email: z.string().email().optional(),
  panNumber: z.string().min(8).max(20).optional(),
  addressLine: z.string().min(5).max(2000).optional(),
  clientCurrency: z.string().min(3).max(10).optional(),
  destinationId: z.string().uuid().optional(),
  travelDate: z.string().date().optional(),
  budget: z.coerce.number().nonnegative().optional(),
  source: z.string().min(2).max(100).optional(),
  campaignId: z.string().uuid().optional(),
  utmSource: z.string().max(100).optional(),
  utmMedium: z.string().max(100).optional(),
  utmCampaign: z.string().max(100).optional(),
  respondedPositively: z.boolean().optional(),
  priorityLevel: z.coerce.number().int().nonnegative().optional(),
  isVip: z.boolean().optional(),
  status: leadStatus.optional(),
  assignedTo: z.string().uuid().optional(),
  qualificationCompleted: z.boolean().optional(),
  closedReason: z.string().max(1000).optional(),
  nextFollowupDate: z.string().date().optional(),
  notes: z.string().max(2000).optional(),
});

const create = z.object({
  body: basePayload.extend({
    autoAssign: z.boolean().optional(),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

const update = z.object({
  body: basePayload
    .partial()
    .refine((value) => Object.keys(value).length > 0, 'At least one field is required for update')
    .superRefine((value, ctx) => {
      if (value.status === 'LOST' && !value.closedReason) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['closedReason'],
          message: 'closedReason is required when status is LOST',
        });
      }
    }),
  params: z.object({ id: z.string().uuid() }),
  query: z.object({}).optional(),
});

const byId = z.object({
  body: z.object({}).optional(),
  params: z.object({ id: z.string().uuid() }),
  query: z.object({}).optional(),
});

const list = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z
    .object({
      page: z.coerce.number().int().positive().optional(),
      limit: z.coerce.number().int().positive().optional(),
      status: leadStatus.optional(),
      source: z.string().optional(),
      assignedTo: z.string().uuid().optional(),
      email: z.string().email().optional(),
      phone: z.string().optional(),
    })
    .optional(),
});

const assign = z.object({
  body: z
    .object({
      force: z.boolean().optional(),
      excludeUserId: z.string().uuid().optional(),
      reason: z.string().max(200).optional(),
      mode: z.enum(['MANUAL', 'AUTO', 'AUTO_DISTRIBUTION', 'AUTO_REASSIGN', 'AUTO_CREATE']).optional(),
    })
    .optional(),
  params: z.object({ id: z.string().uuid() }),
  query: z.object({}).optional(),
});

const distribute = z.object({
  body: z
    .object({
      limit: z.coerce.number().int().positive().max(500).optional(),
      reason: z.string().max(200).optional(),
    })
    .optional(),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

const reassignInactive = z.object({
  body: z
    .object({
      inactiveMinutes: z.coerce.number().int().positive().max(1440).optional(),
      limit: z.coerce.number().int().positive().max(500).optional(),
      reason: z.string().max(200).optional(),
    })
    .optional(),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

const createFollowup = z.object({
  body: z.object({
    userId: z.string().uuid().optional(),
    followupType: z.enum(['CALL', 'WHATSAPP', 'EMAIL', 'FINAL_REMINDER', 'TASK']).optional(),
    followupDate: dateTimeString,
    notes: z.string().max(2000).optional(),
  }),
  params: z.object({ id: z.string().uuid() }),
  query: z.object({}).optional(),
});

const listOverdueFollowups = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z
    .object({
      limit: z.coerce.number().int().positive().max(500).optional(),
    })
    .optional(),
});

const processOverdueFollowups = z.object({
  body: z
    .object({
      limit: z.coerce.number().int().positive().max(500).optional(),
    })
    .optional(),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

const processSlaBreaches = z.object({
  body: z
    .object({
      limit: z.coerce.number().int().positive().max(500).optional(),
    })
    .optional(),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

module.exports = {
  LeadsValidation: {
    create,
    update,
    byId,
    list,
    assign,
    distribute,
    reassignInactive,
    createFollowup,
    listOverdueFollowups,
    processOverdueFollowups,
    processSlaBreaches,
  },
};
