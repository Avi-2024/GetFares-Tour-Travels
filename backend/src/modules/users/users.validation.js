import { z } from "zod";

const createPayload = z
  .object({
    fullName: z.string().trim().min(2).max(150),
    email: z.string().email().max(150),
    phone: z.string().trim().min(6).max(20).optional(),
    role: z.string().trim().min(1).optional(),
<<<<<<< HEAD
<<<<<<< HEAD
    roleId: z.string().uuid().optional(),
=======
    roleId: z.string().trim().min(1).optional(),
>>>>>>> 260e6b1e39f13ef708b754e115df8c7e0db0356f
=======
    roleId: z.string().trim().min(1).optional(),
>>>>>>> fb108051f5efc0275ff61e2e8784b6916667c065
    password: z.string().trim().min(8).optional(),
    passwordHash: z.string().trim().min(8).max(400).optional(),
    isActive: z.boolean().optional(),
    isOnLeave: z.boolean().optional(),
    expertiseDestinations: z
      .array(z.string().trim().min(2).max(100))
      .max(50)
      .optional(),
    targetAmount: z.coerce.number().nonnegative().optional(),
    incentivePercent: z.coerce.number().min(0).max(100).optional(),
  })
  .superRefine((value, ctx) => {
    if (!value.password && !value.passwordHash) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Password is required",
        path: ["password"],
      });
    }
  });

const updatePayload = z
  .object({
    fullName: z.string().trim().min(2).max(150).optional(),
    email: z.string().email().max(150).optional(),
    phone: z.string().trim().min(6).max(20).optional(),
    role: z.string().trim().min(1).optional(),
<<<<<<< HEAD
<<<<<<< HEAD
    roleId: z.string().uuid().nullable().optional(),
=======
    roleId: z.string().trim().min(1).nullable().optional(),
>>>>>>> 260e6b1e39f13ef708b754e115df8c7e0db0356f
=======
    roleId: z.string().trim().min(1).nullable().optional(),
>>>>>>> fb108051f5efc0275ff61e2e8784b6916667c065
    isActive: z.boolean().optional(),
    isOnLeave: z.boolean().optional(),
    expertiseDestinations: z
      .array(z.string().trim().min(2).max(100))
      .max(50)
      .optional(),
    targetAmount: z.coerce.number().nonnegative().optional(),
    incentivePercent: z.coerce.number().min(0).max(100).optional(),
  })
  .refine(
    (value) => Object.keys(value).length > 0,
    "At least one field is required for update",
  );

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
      roleId: z.string().uuid().optional(),
      email: z.string().email().optional(),
      isActive: z.coerce.boolean().optional(),
      isOnLeave: z.coerce.boolean().optional(),
    })
    .optional(),
});

const listRoles = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

export const UsersValidation = {
  create,
  update,
  byId,
  list,
  listRoles,
};
