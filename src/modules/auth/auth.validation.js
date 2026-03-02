const { z } = require('zod');

const register = z.object({
  body: z.object({
    fullName: z.string().min(2),
    email: z.string().email(),
    phone: z.string().min(6).max(20).optional(),
    password: z.string().min(8),
    role: z.string().optional(),
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

module.exports = {
  AuthValidation: {
    register,
    login,
  },
};
