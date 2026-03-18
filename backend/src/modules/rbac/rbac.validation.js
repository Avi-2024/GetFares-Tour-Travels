import { z } from "zod";

const assignRole = z.object({
  body: z.object({
    userId: z.string().min(1),
    role: z.string().min(1),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

const RbacValidation = {
  assignRole,
};

export { RbacValidation };
