const { z } = require('zod');

const baseDateRangeQuery = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
});

const queryWithOptionalUser = baseDateRangeQuery.extend({
  userId: z.string().uuid().optional(),
});

const bySource = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: baseDateRangeQuery.optional(),
});

const byConsultant = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: queryWithOptionalUser.optional(),
});

const leadAging = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: baseDateRangeQuery.optional(),
});

const lostLeads = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: baseDateRangeQuery.optional(),
});

const monthlyRevenue = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: baseDateRangeQuery.optional(),
});

const byServiceType = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: baseDateRangeQuery.optional(),
});

const byDestination = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: baseDateRangeQuery.optional(),
});

const targetVsAchievement = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: queryWithOptionalUser.optional(),
});

const outstandingPayments = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: baseDateRangeQuery.optional(),
});

const paymentMode = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: baseDateRangeQuery.optional(),
});

const profitMargin = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: baseDateRangeQuery.optional(),
});

const visaSummary = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: baseDateRangeQuery.optional(),
});

const followupsToday = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z
    .object({
      date: z.string().optional(),
    })
    .optional(),
});

const followupsMissed = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z
    .object({
      date: z.string().optional(),
    })
    .optional(),
});

const monthlySummary = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: baseDateRangeQuery.optional(),
});

module.exports = {
  ReportsValidation: {
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
    monthlySummary,
  },
};
