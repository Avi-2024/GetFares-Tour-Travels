import { z } from "zod";
import { optionalQueryBoolean } from "../../core/utils/zod-query-boolean.js";

const uuid = z.string().uuid();
const leaveStatus = z.enum(["PENDING", "APPROVED", "REJECTED", "CANCELLED"]);

const directory = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z
    .object({
      page: z.coerce.number().int().positive().optional(),
      limit: z.coerce.number().int().positive().optional(),
      email: z.string().email().optional(),
      isActive: optionalQueryBoolean,
      isOnLeave: optionalQueryBoolean,
    })
    .optional(),
});

const checkIn = z.object({
  body: z
    .object({
      userId: uuid.optional(),
      date: z.string().date().optional(),
      checkIn: z.string().optional(),
    })
    .optional(),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

const checkOut = z.object({
  body: z
    .object({
      userId: uuid.optional(),
      date: z.string().date().optional(),
      checkOut: z.string().optional(),
    })
    .optional(),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

const listAttendance = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z
    .object({
      page: z.coerce.number().int().positive().optional(),
      limit: z.coerce.number().int().positive().optional(),
      userId: uuid.optional(),
      date: z.string().date().optional(),
    })
    .optional(),
});

const listLeaves = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z
    .object({
      page: z.coerce.number().int().positive().optional(),
      limit: z.coerce.number().int().positive().optional(),
      userId: uuid.optional(),
      status: leaveStatus.optional(),
    })
    .optional(),
});

const createLeave = z.object({
  body: z.object({
    userId: uuid.optional(),
    startDate: z.string().date(),
    endDate: z.string().date(),
    reason: z.string().trim().max(2000).optional(),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

const updateLeaveStatus = z.object({
  body: z.object({
    status: leaveStatus,
  }),
  params: z.object({ id: uuid }),
  query: z.object({}).optional(),
});

const EmployeesValidation = {
  directory,
  checkIn,
  checkOut,
  listAttendance,
  listLeaves,
  createLeave,
  updateLeaveStatus,
};

export { EmployeesValidation };
