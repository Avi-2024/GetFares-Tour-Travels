import assert from "node:assert/strict";
import { createReportsRepository } from "../crm/modules/reports/reports.repository.js";
import { ReportsSchema } from "../crm/modules/reports/reports.schema.js";
import { createReportsService } from "../crm/modules/reports/reports.service.js";
import {
  percentage,
  roundAmount,
  toReportNumber,
} from "../crm/modules/reports/reporting.metrics.js";

const logger = {
  error() {},
  warn() {},
  debug() {},
};

async function main() {
  assert.equal(toReportNumber("12.5"), 12.5);
  assert.equal(toReportNumber("bad", 7), 7);
  assert.equal(roundAmount(10.555), 10.55);
  assert.equal(percentage(2, 5), 40);
  assert.equal(percentage(2, 0), 0);

  const emptyDb = {
    adapter: "mysql",
    async query() {
      return { rows: [] };
    },
  };

  const repository = createReportsRepository({
    db: emptyDb,
    schema: ReportsSchema,
    logger,
  });

  assert.deepEqual(await repository.getLeadFilterOptions({}), {
    countries: [],
    sources: [],
  });
  assert.deepEqual(await repository.getPeoplePerformance({}), []);
  assert.deepEqual(await repository.getExecutiveBookingCostByCurrency({}), []);

  const peopleService = createReportsService({
    repository: {
      async getPeoplePerformance() {
        return [
          {
            userId: "user-1",
            name: "Consultant One",
            bookings: 2,
            assignedLeads: 0,
            convertedLeads: 0,
            bookingValue: 0,
            bookingCost: 0,
            collectedAmount: 0,
            refundAmount: 0,
            quotationValue: 0,
            profit: 0,
          },
          {
            userId: "user-2",
            name: "Consultant Two",
            bookings: 2,
            assignedLeads: 0,
            convertedLeads: 0,
            bookingValue: 0,
            bookingCost: 0,
            collectedAmount: 0,
            refundAmount: 0,
            quotationValue: 0,
            profit: 0,
          },
        ];
      },
      async getPeoplePerformanceMoneyByCurrency() {
        return [
          { user_id: "user-1", metric: "assignedLeads", currency: "INR", amount_currency: "INR", amount: 5 },
          { user_id: "user-1", metric: "convertedLeads", currency: "INR", amount_currency: "INR", amount: 2 },
          { user_id: "user-1", metric: "bookings", currency: "INR", amount_currency: "INR", amount: 2 },
          { user_id: "user-1", metric: "bookingValue", currency: "INR", amount_currency: "INR", amount: 8300 },
          { user_id: "user-1", metric: "bookingCost", currency: "INR", amount_currency: "INR", amount: 4150 },
          { user_id: "user-1", metric: "refundAmount", currency: "INR", amount_currency: "INR", amount: 830 },
          { user_id: "user-1", metric: "collectedAmount", currency: "INR", amount_currency: "INR", amount: 5000 },
          { user_id: "user-1", metric: "quotationValue", currency: "INR", amount_currency: "AED", amount: 100 },
          { user_id: "user-2", metric: "bookings", currency: "INR", amount_currency: "INR", amount: 1 },
          { user_id: "user-2", metric: "bookingValue", currency: "INR", amount_currency: "INR", amount: 8300 },
          { user_id: "user-2", metric: "bookingCost", currency: "INR", amount_currency: "INR", amount: 4150 },
          { user_id: "user-2", metric: "bookings", currency: "AED", amount_currency: "AED", amount: 1 },
          { user_id: "user-2", metric: "bookingValue", currency: "AED", amount_currency: "AED", amount: 100 },
          { user_id: "user-2", metric: "refundAmount", currency: "AED", amount_currency: "AED", amount: 10 },
        ];
      },
    },
    logger,
    currencyService: {
      baseCurrency: "AED",
      async convert(amount, from, to) {
        if (from === "INR" && to === "AED") return Number(amount) / 83;
        if (from === "AED" && to === "INR") return Number(amount) * 83;
        throw new Error(`Unexpected conversion ${from} to ${to}`);
      },
    },
  });
  const convertedPeople = await peopleService.peoplePerformance(
    { currency: "AED" },
    { user: { role: "SUPER_ADMIN" } },
  );
  const singleCurrencyPerson = convertedPeople.find((row) => row.userId === "user-1");
  const mixedCurrencyAedPerson = convertedPeople.find(
    (row) => row.userId === "user-2" && row.currency === "AED",
  );
  const mixedCurrencyInrPerson = convertedPeople.find(
    (row) => row.userId === "user-2" && row.currency === "INR",
  );
  assert.equal(singleCurrencyPerson.currency, "INR");
  assert.equal(singleCurrencyPerson.assignedLeads, 5);
  assert.equal(singleCurrencyPerson.convertedLeads, 2);
  assert.equal(singleCurrencyPerson.bookingValue, 8300);
  assert.equal(singleCurrencyPerson.bookingCost, 4150);
  assert.equal(singleCurrencyPerson.refundAmount, 830);
  assert.equal(singleCurrencyPerson.quotationValue, 8300);
  assert.equal(singleCurrencyPerson.profit, 3320);
  assert.equal(singleCurrencyPerson.averageBookingValue, 4150);
  assert.equal(singleCurrencyPerson.bookingValueReporting, 100);
  assert.equal(mixedCurrencyAedPerson.bookingValue, 100);
  assert.equal(mixedCurrencyAedPerson.bookings, 1);
  assert.equal(mixedCurrencyAedPerson.refundAmount, 10);
  assert.equal(mixedCurrencyAedPerson.profit, 90);
  assert.equal(mixedCurrencyInrPerson.bookingValue, 8300);
  assert.equal(mixedCurrencyInrPerson.bookings, 1);
  assert.equal(mixedCurrencyInrPerson.bookingCost, 4150);
  assert.equal(mixedCurrencyInrPerson.profit, 4150);

  const revenueService = createReportsService({
    repository: {
      async getRevenueByMonth() {
        return [];
      },
      async getRevenueByMonthByCurrency() {
        return [
          { month: "2026-05", metric: "revenue", currency: "AED", amount: 100 },
          { month: "2026-05", metric: "revenue", currency: "INR", amount: 8300 },
          { month: "2026-05", metric: "cost", currency: "INR", amount: 4150 },
          { month: "2026-06", metric: "revenue", currency: "INR", amount: 8300 },
          { month: "2026-06", metric: "cost", currency: "AED", amount: 25 },
        ];
      },
      async getRevenueByServiceType() {
        return [];
      },
      async getRevenueByServiceTypeByCurrency() {
        return [
          { serviceType: "HOLIDAY", currency: "AED", totalBookings: 1, revenue: 100 },
          { serviceType: "HOLIDAY", currency: "INR", totalBookings: 2, revenue: 8300 },
          { serviceType: "VISA", currency: "INR", totalBookings: 1, revenue: 4150 },
        ];
      },
      async getRevenueByDestination() {
        return [];
      },
      async getRevenueByDestinationByCurrency() {
        return [
          { destination: "Maldives", currency: "AED", totalBookings: 1, revenue: 100 },
          { destination: "Maldives", currency: "INR", totalBookings: 1, revenue: 8300 },
          { destination: "Bali", currency: "INR", totalBookings: 2, revenue: 4150 },
        ];
      },
    },
    logger,
    currencyService: {
      baseCurrency: "AED",
      async convert(amount, from, to) {
        if (from === to) return Number(amount);
        if (from === "INR" && to === "AED") return Number(amount) / 83;
        throw new Error(`Unexpected conversion ${from} to ${to}`);
      },
    },
  });
  const convertedRevenueByMonth = await revenueService.revenueByMonth(
    { currency: "AED" },
    { user: { role: "SUPER_ADMIN" } },
  );
  assert.deepEqual(convertedRevenueByMonth, [
    { month: "2026-05", currency: "AED", revenue: 200, cost: 50, profit: 150 },
    { month: "2026-06", currency: "AED", revenue: 100, cost: 25, profit: 75 },
  ]);
  const convertedRevenueByService = await revenueService.revenueByServiceType(
    { currency: "AED" },
    { user: { role: "SUPER_ADMIN" } },
  );
  assert.deepEqual(convertedRevenueByService, [
    { serviceType: "HOLIDAY", currency: "AED", totalBookings: 3, revenue: 200 },
    { serviceType: "VISA", currency: "AED", totalBookings: 1, revenue: 50 },
  ]);
  const convertedRevenueByDestination = await revenueService.revenueByDestination(
    { currency: "AED" },
    { user: { role: "SUPER_ADMIN" } },
  );
  assert.deepEqual(convertedRevenueByDestination, [
    { destination: "Maldives", currency: "AED", totalBookings: 2, revenue: 200 },
    { destination: "Bali", currency: "AED", totalBookings: 2, revenue: 50 },
  ]);

  const peopleMoneyQueries = [];
  const peopleMoneyRepository = createReportsRepository({
    db: {
      adapter: "mysql",
      async query(sql, params) {
        peopleMoneyQueries.push({ sql, params });
        return { rows: [] };
      },
    },
    schema: ReportsSchema,
    logger,
  });
  await peopleMoneyRepository.getPeoplePerformanceMoneyByCurrency({
    from: "2026-06-01",
    to: "2026-06-03",
  });
  const peopleMoneySql = peopleMoneyQueries[0].sql;
  assert.match(
    peopleMoneySql,
    /NULLIF\(TRIM\(l\.client_currency\), ''\),\s+NULLIF\(TRIM\(q\.client_currency\), ''\)/,
  );

  const quotation = await repository.getQuotationPerformance({});
  assert.equal(quotation.summary.totalQuotations, 0);
  assert.deepEqual(quotation.byDestination, []);
  assert.deepEqual(quotation.byStatus, []);

  const booking = await repository.getBookingPerformance({});
  assert.equal(booking.summary.totalBookings, 0);
  assert.deepEqual(booking.byMonth, []);

  const bookingQueries = [];
  const bookingRepository = createReportsRepository({
    db: {
      adapter: "mysql",
      async query(sql, params) {
        bookingQueries.push({ sql, params });
        return { rows: [] };
      },
    },
    schema: ReportsSchema,
    logger,
  });
  await bookingRepository.getBookingPerformance({
    from: "2026-06-01",
    to: "2026-06-03",
  });
  const bookingSql = bookingQueries.map((query) => query.sql).join("\n");
  assert.doesNotMatch(bookingSql, /l\.destination\b/);
  assert.match(bookingSql, /l\.travel_to/);

  const followupRepository = createReportsRepository({
    db: {
      adapter: "mysql",
      async query() {
        return {
          rows: [
            {
              id: "followup-1",
              lead_id: "lead-1",
              full_name: "Lead One",
              followup_type: 2,
              followup_date: "2026-06-03 10:30:00",
              followup_local_at: "2026-06-03 16:00:00",
              client_timezone: "Asia/Calcutta",
              is_completed: 1,
            },
          ],
        };
      },
    },
    schema: ReportsSchema,
    logger,
  });
  const todayFollowups = await followupRepository.getTodayFollowups({
    date: "2026-06-03",
  });
  assert.equal(todayFollowups[0].followupType, "WhatsApp");
  assert.equal(todayFollowups[0].followupLocalAt, "2026-06-03 16:00:00");
  assert.equal(todayFollowups[0].clientTimezone, "Asia/Kolkata");
  assert.equal(todayFollowups[0].isCompleted, "Yes");

  const finance = await repository.getFinanceSummary({});
  assert.equal(finance.summary.bookedAmount, 0);
  assert.deepEqual(finance.byPaymentMode, []);

  const operations = await repository.getOperationsPerformance({});
  assert.equal(operations.followups.totalFollowups, 0);
  assert.equal(operations.complaints.totalComplaints, 0);
  assert.equal(operations.visa.totalVisaCases, 0);
  assert.deepEqual(await repository.getMonthlySummary({}), []);
  assert.equal((await repository.getConversionFunnel({})).totalLeads, 0);
  assert.deepEqual(await repository.getLeadAgingReport({}), []);

  const dealLineQueries = [];
  const dealLineRepository = createReportsRepository({
    db: {
      adapter: "mysql",
      async query(sql, params) {
        dealLineQueries.push({ sql, params });
        if (/COUNT\(\*\) AS total_rows/.test(sql)) {
          return { rows: [{ total_rows: 125 }] };
        }
        return {
          rows: [
            {
              lead_id: "lead-1",
              lead_date: "2026-06-03 10:00:00",
              lead_name: "Lead One",
              source: "Meta UAE Page",
              lead_country: "United Arab Emirates",
              status: "CONVERTED",
              sub_status: "",
              assigned_user: "Consultant One",
              client_currency: "AED",
              deal_amount: 1200,
              booking_count: 1,
            },
          ],
        };
      },
    },
    schema: ReportsSchema,
    logger,
  });
  const dealLineRows = await dealLineRepository.getDealLinesReport({
    from: "2026-06-01",
    to: "2026-06-03",
    page: 2,
    limit: 100,
  });
  const dealLineQuery = dealLineQueries[dealLineQueries.length - 1];
  assert.equal(dealLineRows.rows[0].leadCountry, "United Arab Emirates");
  assert.equal(dealLineRows.rows[0].clientCurrency, "AED");
  assert.equal(dealLineRows.pagination.page, 2);
  assert.equal(dealLineRows.pagination.pageSize, 100);
  assert.equal(dealLineRows.pagination.totalRows, 125);
  assert.match(dealLineQuery.sql, /client_currency/);
  assert.deepEqual(dealLineQuery.params, [
    "2026-06-01",
    "2026-06-04",
    "2026-06-01",
    "2026-06-04",
    100,
    100,
  ]);
  assert.doesNotMatch(dealLineQuery.sql, /b\.client_currency|b\.currency/);

  const agingQueries = [];
  const agingRepository = createReportsRepository({
    db: {
      adapter: "mysql",
      async query(sql, params) {
        agingQueries.push({ sql, params });
        return {
          rows: [
            {
              id: "lead-1",
              full_name: "Lead One",
              status: "FOLLOW_UP",
              sub_status: "FOLLOW_UP_1",
              followup_attempts: 1,
              assigned_to: "user-1",
              consultant_name: "Consultant One",
              source: "Meta UAE Page",
              lead_country: "United Arab Emirates",
              lead_timezone: "Asia/Dubai",
              created_at: "2026-06-03 10:00:00",
              age_hours: 12,
            },
          ],
        };
      },
    },
    schema: ReportsSchema,
    logger,
  });
  const agingRows = await agingRepository.getLeadAgingReport({
    from: "2026-06-01",
    to: "2026-06-03",
    source: "Meta UAE Page",
    limit: 100,
  });
  const agingQuery = agingQueries[agingQueries.length - 1];
  assert.equal(agingRows[0].stage, "FOLLOW_UP_1");
  assert.equal(agingRows[0].source, "Meta UAE Page");
  assert.equal(agingRows[0].leadTimezone, "Asia/Dubai");
  assert.match(agingQuery.sql, /meta_page_configs/);
  assert.match(agingQuery.sql, /status NOT IN/);
  assert.match(agingQuery.sql, /CONVERT_TZ\(UTC_TIMESTAMP\(\), '\+00:00', '\+04:00'\)/);
  assert.match(agingQuery.sql, /CONVERT_TZ\(UTC_TIMESTAMP\(\), '\+00:00', '\+05:30'\)/);
  assert.deepEqual(agingQuery.params, [
    "2026-06-01",
    "2026-06-04",
    "Meta UAE Page",
    100,
  ]);

  const sourceQueries = [];
  const sourceRepository = createReportsRepository({
    db: {
      adapter: "mysql",
      async query(sql, params) {
        sourceQueries.push({ sql, params });
        return {
          rows: [
            {
              source: "Meta UAE Page",
              total_leads: 5,
              converted_leads: 0,
            },
          ],
        };
      },
    },
    schema: ReportsSchema,
    logger,
  });
  const sourceRows = await sourceRepository.getLeadsBySource({
    from: "2026-06-01",
    to: "2026-06-03",
    source: "Meta UAE Page",
  });
  const sourceQuery = sourceQueries[sourceQueries.length - 1];
  assert.equal(sourceRows[0].source, "Meta UAE Page");
  assert.equal(sourceRows[0].totalLeads, 5);
  assert.match(sourceQuery.sql, /meta_page_configs/);
  assert.deepEqual(sourceQuery.params, [
    "2026-06-01",
    "2026-06-04",
    "Meta UAE Page",
  ]);

  const unsupportedRepository = createReportsRepository({
    db: { adapter: "memory" },
    schema: ReportsSchema,
    logger,
  });

  await assert.rejects(
    () => unsupportedRepository.getQuotationPerformance({}),
    /Reports require a SQL database adapter/,
  );

  const failingRepository = createReportsRepository({
    db: {
      adapter: "mysql",
      async query() {
        throw new Error("boom");
      },
    },
    schema: ReportsSchema,
    logger,
  });

  await assert.rejects(
    () => failingRepository.getQuotationPerformance({}),
    (error) => error?.code === "REPORT_QUERY_FAILED",
  );

  console.log("reports backend contract ok");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
