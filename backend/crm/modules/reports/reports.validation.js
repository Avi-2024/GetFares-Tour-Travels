import { z } from "zod";

const baseDateRangeQuery = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
});

const queryWithOptionalUser = baseDateRangeQuery.extend({
  userId: z.string().uuid().optional(),
  role: z.string().trim().min(1).max(80).optional(),
  supplierId: z.string().uuid().optional(),
  destination: z.string().trim().min(1).optional(),
  country: z.string().trim().min(1).max(160).optional(),
  status: z.string().trim().min(1).max(40).optional(),
  source: z.string().trim().min(1).max(120).optional(),
  leadSource: z.string().trim().min(1).max(120).optional(),
  currency: z.string().trim().min(3).max(10).optional(),
});

const bySource = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: queryWithOptionalUser.optional(),
});

const leadFilterOptions = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: baseDateRangeQuery.optional(),
});

const byConsultant = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: queryWithOptionalUser.optional(),
});

const peoplePerformance = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: queryWithOptionalUser
    .extend({
      currency: z.string().trim().min(3).max(10).optional(),
    })
    .optional(),
});

const quotationPerformance = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: queryWithOptionalUser.optional(),
});

const bookingPerformance = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: queryWithOptionalUser.optional(),
});

const financeSummary = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: queryWithOptionalUser
    .extend({
      currency: z.string().trim().min(3).max(10).optional(),
    })
    .optional(),
});

const operationsPerformance = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: queryWithOptionalUser.optional(),
});

const dealLines = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: queryWithOptionalUser
    .extend({
      limit: z.coerce.number().int().min(1).max(2500).optional(),
      page: z.coerce.number().int().min(1).optional(),
    })
    .optional(),
});

const leadAging = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: queryWithOptionalUser
    .extend({
      limit: z.coerce.number().int().min(1).max(2500).optional(),
    })
    .optional(),
});

const lostLeads = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: queryWithOptionalUser.optional(),
});

const monthlyRevenue = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: queryWithOptionalUser
    .extend({
      currency: z.string().trim().min(3).max(10).optional(),
    })
    .optional(),
});

const byServiceType = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: queryWithOptionalUser
    .extend({
      currency: z.string().trim().min(3).max(10).optional(),
    })
    .optional(),
});

const byDestination = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: queryWithOptionalUser
    .extend({
      currency: z.string().trim().min(3).max(10).optional(),
    })
    .optional(),
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
  query: queryWithOptionalUser
    .extend({
      date: z.string().optional(),
    })
    .optional(),
});

const followupsMissed = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: queryWithOptionalUser
    .extend({
      date: z.string().optional(),
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
  query: queryWithOptionalUser
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

const activityFeed = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: queryWithOptionalUser
    .extend({
      limit: z.coerce.number().int().min(1).max(2500).optional(),
    })
    .optional(),
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
      limit: z.coerce.number().int().min(1).max(2000).optional(),
    })
    .optional(),
});

const ReportsValidation = {
  leadFilterOptions,
  bySource,
  byConsultant,
  peoplePerformance,
  quotationPerformance,
  bookingPerformance,
  financeSummary,
  operationsPerformance,
  dealLines,
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
  activityFeed,
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
