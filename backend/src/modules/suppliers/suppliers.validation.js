const { z } = require("zod");

const uuid = z.string().uuid();
const payableStatus = z.enum(["PENDING", "PARTIAL", "PAID"]);

const supplierPayload = z.object({
  name: z.string().trim().min(2).max(150),
  contactPerson: z.string().trim().min(2).max(150).optional(),
  phone: z.string().trim().min(6).max(20).optional(),
  email: z.string().email().max(150).optional(),
  panNumber: z.string().trim().min(8).max(20).optional(),
  gstNumber: z.string().trim().min(5).max(30).optional(),
  address: z.string().trim().max(2000).optional(),
  addressLine: z.string().trim().max(2000).optional(),
  country: z.string().trim().min(2).max(100).optional(),
  invoiceBeneficiaryName: z.string().trim().max(200).optional(),
  invoiceBankName: z.string().trim().max(200).optional(),
  invoiceAccountNumber: z.string().trim().max(100).optional(),
  invoiceIfscSwift: z.string().trim().max(40).optional(),
  invoiceUpiId: z.string().trim().max(100).optional(),
  bankName: z.string().trim().max(150).optional(),
  bankAccountNumber: z.string().trim().max(50).optional(),
  ifscCode: z.string().trim().max(20).optional(),
  supplierCurrency: z.string().trim().min(3).max(10).optional(),
  contractUrl: z.string().trim().max(2000).optional(),
  rateValidUntil: z.string().date().optional(),
  productionCommitment: z.string().trim().max(2000).optional(),
  paymentDeadlineDate: z.string().date().optional(),
  isActive: z.boolean().optional(),
});

const create = z.object({
  body: supplierPayload,
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

const update = z.object({
  body: supplierPayload
    .partial()
    .refine(
      (value) => Object.keys(value).length > 0,
      "At least one field is required",
    ),
  params: z.object({ id: uuid }),
  query: z.object({}).optional(),
});

const byId = z.object({
  body: z.object({}).optional(),
  params: z.object({ id: uuid }),
  query: z.object({}).optional(),
});

const list = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z
    .object({
      page: z.coerce.number().int().positive().optional(),
      limit: z.coerce.number().int().positive().optional(),
      name: z.string().trim().optional(),
      country: z.string().trim().optional(),
      supplierCurrency: z.string().trim().optional(),
      isActive: z.coerce.boolean().optional(),
    })
    .optional(),
});

const createPayable = z.object({
  body: z.object({
    bookingId: uuid,
    payableAmount: z.coerce.number().positive(),
    paidAmount: z.coerce.number().nonnegative().optional(),
    dueDate: z.string().date().optional(),
    status: payableStatus.optional(),
    paymentReference: z.string().trim().max(100).optional(),
  }),
  params: z.object({ id: uuid }),
  query: z.object({}).optional(),
});

const updatePayable = z.object({
  body: z
    .object({
      payableAmount: z.coerce.number().positive().optional(),
      paidAmount: z.coerce.number().nonnegative().optional(),
      dueDate: z.string().date().optional(),
      status: payableStatus.optional(),
      paymentReference: z.string().trim().max(100).optional(),
    })
    .refine(
      (value) => Object.keys(value).length > 0,
      "At least one field is required",
    ),
  params: z.object({ payableId: uuid }),
  query: z.object({}).optional(),
});

const listPayables = z.object({
  body: z.object({}).optional(),
  params: z.object({ id: uuid }),
  query: z
    .object({
      page: z.coerce.number().int().positive().optional(),
      limit: z.coerce.number().int().positive().optional(),
      bookingId: uuid.optional(),
      status: payableStatus.optional(),
    })
    .optional(),
});

module.exports = {
  SuppliersValidation: {
    create,
    update,
    byId,
    list,
    createPayable,
    updatePayable,
    listPayables,
  },
};
