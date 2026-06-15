import { z } from "zod";

const bookingStatus = z.enum(["PENDING", "CONFIRMED", "CANCELLED"]);
const paymentStatus = z.enum(["PENDING", "PARTIAL", "FULL", "REFUNDED"]);
const currencyCode = z.string().trim().min(3).max(10);
const upperEnum = (values) =>
  z
    .string()
    .trim()
    .transform((value) => value.toUpperCase())
    .pipe(z.enum(values));
const bookingFilterQuery = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(500).optional(),
  status: upperEnum(["PENDING", "CONFIRMED", "CANCELLED"]).optional(),
  paymentStatus: upperEnum(["PENDING", "PARTIAL", "FULL", "REFUNDED"]).optional(),
  payment: upperEnum(["ALL", "PAID", "PARTIAL", "UNPAID", "REFUNDED", "DUE"]).optional(),
  risk: upperEnum(["ALL", "SAFE", "D2_DUE", "DEADLINE_DUE", "OVERDUE"]).optional(),
  market: upperEnum(["ALL", "INDIA", "UAE"]).optional(),
  country: z.string().trim().min(1).max(100).optional(),
  region: z.string().trim().min(1).max(100).optional(),
  quotationId: z.string().uuid().optional(),
  createdBy: z.string().uuid().optional(),
  bookingId: z.string().trim().min(1).max(150).optional(),
  customer: z.string().trim().min(1).max(150).optional(),
  email: z.string().trim().min(1).max(254).optional(),
  phone: z.string().trim().min(1).max(40).optional(),
  consultantId: z.string().uuid().optional(),
  consultant: z.string().trim().min(1).max(150).optional(),
  destinationId: z.string().uuid().optional(),
  destination: z.string().trim().min(1).max(200).optional(),
  fromDate: z.string().date().optional(),
  toDate: z.string().date().optional(),
  search: z.string().trim().min(1).max(150).optional(),
  sortBy: z
    .enum([
      "NEWEST_FIRST",
      "OLDEST_FIRST",
      "AMOUNT_HIGH_TO_LOW",
      "AMOUNT_LOW_TO_HIGH",
      "CUSTOMER_A_Z",
    ])
    .optional(),
  currency: currencyCode.optional(),
});

const dateTimeString = z
  .string()
  .refine((value) => !Number.isNaN(new Date(value).getTime()), {
    message: "Invalid date-time",
  });

const supplierDetailsSchema = z
  .object({
    supplierId: z.string().uuid().optional(),
    supplierName: z.string().trim().min(2).max(200).optional(),
    country: z.string().trim().min(2).max(100).optional(),
    contractRef: z.string().trim().max(120).optional(),
    notes: z.string().trim().max(2000).optional(),
  })
  .optional();

const dmcDetailsSchema = z
  .object({
    dmcId: z.string().uuid().optional(),
    dmcName: z.string().trim().min(2).max(200).optional(),
    contactPerson: z.string().trim().max(150).optional(),
    contactPhone: z.string().trim().max(30).optional(),
    notes: z.string().trim().max(2000).optional(),
  })
  .optional();

const hotelSegmentSchema = z.object({
  hotelName: z.string().trim().min(2).max(200),
  city: z.string().trim().max(120).optional(),
  country: z.string().trim().max(120).optional(),
  checkIn: z.string().date(),
  checkOut: z.string().date(),
  roomType: z.string().trim().max(120).optional(),
  mealPlan: z.string().trim().max(120).optional(),
  nights: z.coerce.number().int().nonnegative().optional(),
  supplierRef: z.string().trim().max(120).optional(),
});

const flightSegmentSchema = z.object({
  from: z.string().trim().min(2).max(20),
  to: z.string().trim().min(2).max(20),
  departureAt: dateTimeString,
  arrivalAt: dateTimeString,
  airline: z.string().trim().max(120).optional(),
  flightNumber: z.string().trim().max(60).optional(),
  pnr: z.string().trim().max(60).optional(),
});

const insuranceDetailsSchema = z
  .object({
    required: z.boolean().optional(),
    provider: z.string().trim().max(150).optional(),
    policyType: z.string().trim().max(120).optional(),
    policyNumber: z.string().trim().max(120).optional(),
    coverageAmount: z.coerce.number().nonnegative().optional(),
    premiumAmount: z.coerce.number().nonnegative().optional(),
    validFrom: z.string().date().optional(),
    validTo: z.string().date().optional(),
    notes: z.string().trim().max(2000).optional(),
  })
  .optional();

const otherServiceSchema = z.object({
  serviceType: z.string().trim().min(2).max(80),
  description: z.string().trim().max(500).optional(),
  supplierName: z.string().trim().max(200).optional(),
  costAmount: z.coerce.number().nonnegative().optional(),
  currency: currencyCode.optional(),
  status: z.string().trim().max(40).optional(),
});

const createPayload = z
  .object({
    quotationId: z.string().uuid(),
    bookingNumber: z.string().trim().min(3).max(50).optional(),
    travelStartDate: z.string().date(),
    travelEndDate: z.string().date(),
    totalAmount: z.coerce.number().nonnegative(),
    costAmount: z.coerce.number().nonnegative(),
    isNonRefundable: z.boolean().optional(),
    advanceRequired: z.coerce.number().nonnegative().optional(),
    clientCurrency: currencyCode.optional(),
    supplierCurrency: currencyCode.optional(),
    exchangeRate: z.coerce.number().positive().optional(),
    exchangeLocked: z.boolean().optional(),
    supplierDetails: supplierDetailsSchema,
    dmcDetails: dmcDetailsSchema,
    hotelSegments: z.array(hotelSegmentSchema).max(50).optional(),
    flightSegments: z.array(flightSegmentSchema).max(50).optional(),
    insuranceDetails: insuranceDetailsSchema,
    otherServices: z.array(otherServiceSchema).max(100).optional(),
    blockingDeadlineAt: dateTimeString.optional(),
    supplierPaymentDeadlineAt: dateTimeString.optional(),
    cancellationDeadlineAt: dateTimeString.optional(),
  })
  .superRefine((value, ctx) => {
    if (value.travelEndDate < value.travelStartDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["travelEndDate"],
        message: "travelEndDate must be on or after travelStartDate",
      });
    }

    if (value.costAmount > value.totalAmount) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["costAmount"],
        message: "costAmount cannot be greater than totalAmount",
      });
    }
  });

const updatePayload = z
  .object({
    travelStartDate: z.string().date().optional(),
    travelEndDate: z.string().date().optional(),
    totalAmount: z.coerce.number().nonnegative().optional(),
    costAmount: z.coerce.number().nonnegative().optional(),
    advanceRequired: z.coerce.number().nonnegative().optional(),
    paymentStatus: paymentStatus.optional(),
    clientCurrency: currencyCode.optional(),
    supplierCurrency: currencyCode.optional(),
    exchangeRate: z.coerce.number().positive().optional(),
    exchangeLocked: z.boolean().optional(),
    cancellationReason: z.string().trim().min(3).max(1000).optional(),
    supplierDetails: supplierDetailsSchema,
    dmcDetails: dmcDetailsSchema,
    hotelSegments: z.array(hotelSegmentSchema).max(50).optional(),
    flightSegments: z.array(flightSegmentSchema).max(50).optional(),
    insuranceDetails: insuranceDetailsSchema,
    otherServices: z.array(otherServiceSchema).max(100).optional(),
    blockingDeadlineAt: dateTimeString.optional(),
    supplierPaymentDeadlineAt: dateTimeString.optional(),
    cancellationDeadlineAt: dateTimeString.optional(),
  })
  .refine(
    (value) => Object.keys(value).length > 0,
    "At least one field is required for update",
  );

const list = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: bookingFilterQuery.optional(),
});

const stats = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: bookingFilterQuery.omit({ page: true, limit: true, sortBy: true }).optional(),
});

const paymentPickerOptions = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z
    .object({
      page: z.coerce.number().int().positive().optional(),
      limit: z.coerce.number().int().positive().max(100).optional(),
      search: z.string().trim().min(2).max(150).optional(),
    })
    .optional(),
});

const runReminders = z.object({
  body: z
    .object({
      referenceDate: z.string().date().optional(),
      preTravelDays: z.coerce.number().int().min(0).max(365).optional(),
      postTravelDays: z.coerce.number().int().min(0).max(365).optional(),
    })
    .optional(),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

const processDeadlineAlerts = z.object({
  body: z
    .object({
      referenceTime: dateTimeString.optional(),
      lookaheadHours: z.coerce.number().int().min(1).max(240).optional(),
      limit: z.coerce.number().int().min(1).max(1000).optional(),
    })
    .optional(),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

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

const transitionStatus = z.object({
  body: z
    .object({
      status: bookingStatus,
      cancellationReason: z.string().trim().min(3).max(1000).optional(),
      changedAt: dateTimeString.optional(),
    })
    .superRefine((value, ctx) => {
      if (value.status === "CANCELLED" && !value.cancellationReason) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["cancellationReason"],
          message: "cancellationReason is required when status is CANCELLED",
        });
      }
    }),
  params: z.object({ id: z.string().uuid() }),
  query: z.object({}).optional(),
});

const generateInvoice = z.object({
  body: z
    .object({
      invoiceNumber: z.string().trim().min(3).max(50).optional(),
      pdfUrl: z.string().url().max(2000).optional(),
    })
    .optional(),
  params: z.object({ id: z.string().uuid() }),
  query: z.object({}).optional(),
});

const BookingsValidation = {
  list,
  paymentPickerOptions,
  stats,
  runReminders,
  processDeadlineAlerts,
  create,
  update,
  byId,
  transitionStatus,
  generateInvoice,
};

export { BookingsValidation };
