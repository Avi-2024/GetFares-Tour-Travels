import { z } from "zod";

const baseDateRangeQuery = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
});

const queryWithOptionalUser = baseDateRangeQuery.extend({
  userId: z.string().uuid().optional(),
  destination: z.string().trim().min(1).optional(),
});

const bySource = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: queryWithOptionalUser.optional(),
});

const byConsultant = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: queryWithOptionalUser.optional(),
});

const leadAging = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: queryWithOptionalUser.optional(),
});

const lostLeads = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: queryWithOptionalUser.optional(),
});

const monthlyRevenue = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: queryWithOptionalUser.optional(),
});

const byServiceType = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: queryWithOptionalUser.optional(),
});

const byDestination = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: queryWithOptionalUser.optional(),
});

const targetVsAchievement = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: queryWithOptionalUser.optional(),
});

const salesByConsultant = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: queryWithOptionalUser.optional(),
});

const outstandingPayments = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: queryWithOptionalUser.optional(),
});

const paymentMode = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: queryWithOptionalUser.optional(),
});

const profitMargin = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: queryWithOptionalUser.optional(),
});

const visaSummary = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: queryWithOptionalUser.optional(),
});

const followupsToday = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z
    .object({
      date: z.string().optional(),
      userId: z.string().uuid().optional(),
    })
    .optional(),
});

const followupsMissed = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z
    .object({
      date: z.string().optional(),
      userId: z.string().uuid().optional(),
    })
    .optional(),
});

const monthlySummary = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: queryWithOptionalUser.optional(),
});

const executiveKpis = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: queryWithOptionalUser.optional(),
});

const conversionFunnel = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: queryWithOptionalUser.optional(),
});

const marketingPerformance = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: queryWithOptionalUser.optional(),
});

const supplierPerformance = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: baseDateRangeQuery
    .extend({
      supplierId: z.string().uuid().optional(),
    })
    .optional(),
});

const callLog = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: queryWithOptionalUser.optional(),
});

const pipelineForecast = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: queryWithOptionalUser
    .extend({
      periodMonths: z.coerce.number().int().min(1).max(12).optional(),
    })
    .optional(),
});

const financeCostBreakup = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: queryWithOptionalUser
    .extend({
      currency: z.string().trim().min(3).max(10).optional(),
      page: z.coerce.number().int().min(1).optional(),
      limit: z.coerce.number().int().min(1).max(200).optional(),
    })
    .optional(),
});

const financeSupplierServices = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: queryWithOptionalUser
    .extend({
      supplierId: z.string().uuid().optional(),
      page: z.coerce.number().int().min(1).optional(),
      limit: z.coerce.number().int().min(1).max(200).optional(),
    })
    .optional(),
});

const ReportsValidation = {
  bySource,
  byConsultant,
  leadAging,
  lostLeads,
  monthlyRevenue,
  byServiceType,
  byDestination,
  targetVsAchievement,
  outstandingPayments,
  paymentMode,
  profitMargin,
  visaSummary,
  followupsToday,
  followupsMissed,
  callLog,
  monthlySummary,
  executiveKpis,
  conversionFunnel,
  marketingPerformance,
  supplierPerformance,
  pipelineForecast,
  financeCostBreakup,
  financeSupplierServices,
};

export { ReportsValidation };
