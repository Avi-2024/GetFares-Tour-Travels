import assert from "node:assert/strict";
import { createReportsRepository } from "../crm/modules/reports/reports.repository.js";
import { ReportsSchema } from "../crm/modules/reports/reports.schema.js";
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

  const quotation = await repository.getQuotationPerformance({});
  assert.equal(quotation.summary.totalQuotations, 0);
  assert.deepEqual(quotation.byDestination, []);
  assert.deepEqual(quotation.byStatus, []);

  const booking = await repository.getBookingPerformance({});
  assert.equal(booking.summary.totalBookings, 0);
  assert.deepEqual(booking.byMonth, []);

  const finance = await repository.getFinanceSummary({});
  assert.equal(finance.summary.bookedAmount, 0);
  assert.deepEqual(finance.byPaymentMode, []);

  const operations = await repository.getOperationsPerformance({});
  assert.equal(operations.followups.totalFollowups, 0);
  assert.equal(operations.complaints.totalComplaints, 0);
  assert.equal(operations.visa.totalVisaCases, 0);

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
