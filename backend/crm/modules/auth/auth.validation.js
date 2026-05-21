import { z } from "zod";
import { optionalPhoneSchema } from "../../core/utils/phone-validation.js";

const register = z.object({
  body: z.object({
    fullName: z.string().min(2),
    email: z.string().email(),
    phone: optionalPhoneSchema,
    password: z.string().min(8),
    role: z.string().optional(),
    roleId: z.string().uuid().optional(),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

const login = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

const AuthValidation = {
  register,
  login,
};

export { AuthValidation };
