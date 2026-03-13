const { z } = require('zod');

const complaintStatus = z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED']);

const createPayload = z.object({
  bookingId: z.string().uuid().optional(),
  assignedTo: z.string().uuid().optional(),
  issueType: z.string().trim().min(2).max(150),
  description: z.string().trim().min(5).max(4000),
  status: complaintStatus.optional(),
});

const updatePayload = z
  .object({
    assignedTo: z.string().uuid().nullable().optional(),
    issueType: z.string().trim().min(2).max(150).optional(),
    description: z.string().trim().min(5).max(4000).optional(),
    status: complaintStatus.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, 'At least one field is required for update');

const create = z.object({
  body: createPayload,
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

const update = z.object({
  body: updatePayload,
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
      status: complaintStatus.optional(),
      assignedTo: z.string().uuid().optional(),
      bookingId: z.string().uuid().optional(),
    })
    .optional(),
});

const createActivity = z.object({
  body: z.object({
    note: z.string().trim().min(2).max(2000),
    userId: z.string().uuid().optional(),
  }),
  params: z.object({ id: z.string().uuid() }),
  query: z.object({}).optional(),
});

const listActivities = z.object({
  body: z.object({}).optional(),
  params: z.object({ id: z.string().uuid() }),
  query: z
    .object({
      page: z.coerce.number().int().positive().optional(),
      limit: z.coerce.number().int().positive().optional(),
    })
    .optional(),
});

module.exports = {
  ComplaintsValidation: {
    create,
    update,
    byId,
    list,
    createActivity,
    listActivities,
  },
};
