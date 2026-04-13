function createPaymentsRepository({ db, logger, schema }) {
  const tableCache = new Map();
  const columnCache = new Map();

  function canUseRawQuery() {
    return (
      typeof db.query === "function" &&
      (db.adapter === "mysql" || db.adapter === "mssql")
    );
  }

  function toNumber(value, fallback = 0) {
    if (value === null || value === undefined) {
      return fallback;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function toBoolean(value, fallback = false) {
    if (value === null || value === undefined) {
      return fallback;
    }

    if (typeof value === "boolean") {
      return value;
    }

    if (typeof value === "number") {
      return value === 1;
    }

    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (normalized === "true" || normalized === "1" || normalized === "yes") {
        return true;
      }
      if (normalized === "false" || normalized === "0" || normalized === "no") {
        return false;
      }
    }

    return Boolean(value);
  }

  function toDate(value) {
    if (!value) {
      return null;
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return null;
    }

    return date.toISOString();
  }

  function toPayment(row) {
    if (!row) {
      return null;
    }

    return {
      id: row.id,
      bookingId: row.booking_id ?? row.bookingId ?? null,
      amount: toNumber(row.amount, 0),
      currency: row.currency ?? "INR",
      paymentMode: row.payment_mode ?? row.paymentMode ?? null,
      gatewayProvider: row.gateway_provider ?? row.gatewayProvider ?? null,
      gatewayOrderId: row.gateway_order_id ?? row.gatewayOrderId ?? null,
      gatewayPaymentId: row.gateway_payment_id ?? row.gatewayPaymentId ?? null,
      gatewaySignature: row.gateway_signature ?? row.gatewaySignature ?? null,
      paymentReference: row.payment_reference ?? row.paymentReference ?? null,
      proofUrl: row.proof_url ?? row.proofUrl ?? null,
      invoiceUrl: row.invoice_url ?? row.invoiceUrl ?? null,
      status: row.status ?? "PENDING",
      isVerified: toBoolean(row.is_verified ?? row.isVerified, false),
      verifiedBy: row.verified_by ?? row.verifiedBy ?? null,
      verifiedAt: toDate(row.verified_at ?? row.verifiedAt),
      paidAt: toDate(row.paid_at ?? row.paidAt),
      createdAt: toDate(row.created_at ?? row.createdAt),
      updatedAt: toDate(row.updated_at ?? row.updatedAt),
    };
  }

  function toBooking(row) {
    if (!row) {
      return null;
    }

    return {
      id: row.id,
      totalAmount: toNumber(row.total_amount ?? row.totalAmount, 0),
      advanceRequired: toNumber(row.advance_required ?? row.advanceRequired, 0),
      advanceReceived: toNumber(row.advance_received ?? row.advanceReceived, 0),
      status: row.status ?? "PENDING",
      paymentStatus: row.payment_status ?? row.paymentStatus ?? "PENDING",
      isDeleted: toBoolean(row.is_deleted ?? row.isDeleted, false),
    };
  }

  async function hasTable(tableName) {
    if (!canUseRawQuery()) {
      return true;
    }

    if (tableCache.has(tableName)) {
      return tableCache.get(tableName);
    }

    try {
      const result = await db.query(
        `SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name=? LIMIT 1`,
        [tableName],
      );
      const exists = result.rowCount > 0;
      tableCache.set(tableName, exists);
      return exists;
    } catch (_error) {
      tableCache.set(tableName, false);
      return false;
    }
  }

  async function getTableColumns(tableName) {
    if (!canUseRawQuery()) {
      return null;
    }

    if (columnCache.has(tableName)) {
      return columnCache.get(tableName);
    }

    const exists = await hasTable(tableName);
    if (!exists) {
      const empty = new Set();
      columnCache.set(tableName, empty);
      return empty;
    }

    const result = await db.query(
      `SELECT COLUMN_NAME AS column_name FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name=?`,
      [tableName],
    );

    const columns = new Set(
      result.rows
        .map((row) => row.column_name ?? row.COLUMN_NAME ?? null)
        .filter(Boolean)
        .map((column) => String(column).toLowerCase()),
    );
    columnCache.set(tableName, columns);
    return columns;
  }

  async function hasColumn(tableName, columnName) {
    const columns = await getTableColumns(tableName);
    if (columns === null) {
      return true;
    }

    return columns.has(String(columnName).toLowerCase());
  }

  async function hasColumnFresh(tableName, columnName) {
    let exists = await hasColumn(tableName, columnName);
    if (exists) {
      return true;
    }

    if (!canUseRawQuery()) {
      return exists;
    }

    // Column metadata can become stale when migrations run while server is live.
    columnCache.delete(tableName);
    exists = await hasColumn(tableName, columnName);
    return exists;
  }

  function mapListFilters(filters = {}) {
    const mapped = {};

    if (filters.bookingId) {
      mapped.booking_id = filters.bookingId;
    }
    if (filters.status) {
      mapped.status = filters.status;
    }
    if (filters.paymentMode) {
      mapped.payment_mode = filters.paymentMode;
    }
    if (filters.isVerified !== undefined) {
      mapped.is_verified = filters.isVerified;
    }
    if (filters.page) {
      mapped.page = filters.page;
    }
    if (filters.limit) {
      mapped.limit = filters.limit;
    }

    return mapped;
  }

  async function getProcessedRefundAmount(bookingId) {
    const tableExists = await hasTable(schema.refundsTable);
    if (!tableExists) {
      return 0;
    }

    if (canUseRawQuery()) {
      const result = await db.query(
        `
          SELECT COALESCE(SUM(refund_amount), 0) AS refund_amount
          FROM ${schema.refundsTable}
          WHERE booking_id = ?
            AND status = 'PROCESSED'
        `,
        [bookingId],
      );

      return toNumber(result.rows[0]?.refund_amount, 0);
    }

    const rows = await db.findMany(schema.refundsTable, {
      booking_id: bookingId,
    });
    return rows
      .filter((row) => (row.status ?? "INITIATED") === "PROCESSED")
      .reduce(
        (sum, row) => sum + toNumber(row.refund_amount ?? row.refundAmount, 0),
        0,
      );
  }

  return Object.freeze({
    async getStats() {
      const [paymentsTableExists, bookingsTableExists, refundsTableExists] =
        await Promise.all([
          hasTable(schema.tableName),
          hasTable(schema.bookingsTable),
          hasTable(schema.refundsTable),
        ]);

      const empty = {
        collectedAmount: 0,
        collectedCount: 0,
        outstandingAmount: 0,
        outstandingCount: 0,
        overdueAmount: 0,
        overdueCount: 0,
        refundsAmount: 0,
        refundsCount: 0,
      };

      if (!paymentsTableExists && !bookingsTableExists && !refundsTableExists) {
        return empty;
      }

      if (canUseRawQuery()) {
        const paymentsQuery = `
          SELECT
            COALESCE(SUM(CASE WHEN COALESCE(is_verified, FALSE) = TRUE
              AND COALESCE(status, 'PENDING') <> 'REFUNDED'
              THEN amount ELSE 0 END), 0) AS collected_amount,
            SUM(CASE WHEN COALESCE(is_verified, FALSE) = TRUE
              AND COALESCE(status, 'PENDING') <> 'REFUNDED'
              THEN 1 ELSE 0 END) AS collected_count
          FROM ${schema.tableName}
        `;

        let bookingStats = {
          outstanding_amount: 0,
          outstanding_count: 0,
          overdue_amount: 0,
          overdue_count: 0,
        };

        if (bookingsTableExists) {
          let hasSoftDelete = false;
          let hasTravelStartDate = true;

          try {
            hasSoftDelete = await hasColumn(schema.bookingsTable, "is_deleted");
            hasTravelStartDate = await hasColumn(
              schema.bookingsTable,
              "travel_start_date",
            );
          } catch (error) {
            logger?.warn?.(
              { err: error, table: schema.bookingsTable },
              "Unable to inspect bookings table columns for payment stats",
            );
          }

          let notDeletedPredicate = hasSoftDelete
            ? "COALESCE(b.is_deleted, FALSE) = FALSE"
            : "TRUE";
          let overdueDatePredicate = hasTravelStartDate
            ? "b.travel_start_date < CURRENT_DATE"
            : "FALSE";

          const buildBookingsQuery = (notDeleted, overdueDate) => `
            SELECT
              COALESCE(SUM(CASE WHEN b.status <> 'CANCELLED' AND ${notDeleted}
                THEN GREATEST(COALESCE(b.total_amount, 0) - COALESCE(b.advance_received, 0), 0)
                ELSE 0 END), 0) AS outstanding_amount,
              SUM(CASE WHEN b.status <> 'CANCELLED' AND ${notDeleted}
                AND COALESCE(b.advance_received, 0) < COALESCE(b.total_amount, 0)
                THEN 1 ELSE 0 END) AS outstanding_count,
              COALESCE(SUM(CASE WHEN b.status <> 'CANCELLED' AND ${notDeleted}
                AND ${overdueDate}
                AND COALESCE(b.advance_received, 0) < COALESCE(b.total_amount, 0)
                THEN GREATEST(COALESCE(b.total_amount, 0) - COALESCE(b.advance_received, 0), 0)
                ELSE 0 END), 0) AS overdue_amount,
              SUM(CASE WHEN b.status <> 'CANCELLED' AND ${notDeleted}
                AND ${overdueDate}
                AND COALESCE(b.advance_received, 0) < COALESCE(b.total_amount, 0)
                THEN 1 ELSE 0 END) AS overdue_count
            FROM ${schema.bookingsTable} b
          `;

          try {
            const result = await db.query(
              buildBookingsQuery(notDeletedPredicate, overdueDatePredicate),
            );
            bookingStats = result.rows[0] || bookingStats;
          } catch (error) {
            const message = String(error?.message || "");
            const code = error?.code;
            const missingColumn =
              code === "42703" ||
              message.includes("is_deleted") ||
              message.includes("travel_start_date");

            if (missingColumn) {
              if (message.includes("is_deleted")) {
                notDeletedPredicate = "TRUE";
              }
              if (message.includes("travel_start_date")) {
                overdueDatePredicate = "FALSE";
              }

              const result = await db.query(
                buildBookingsQuery(notDeletedPredicate, overdueDatePredicate),
              );
              bookingStats = result.rows[0] || bookingStats;
            } else {
              throw error;
            }
          }
        }

        let refundStats = { refunds_amount: 0, refunds_count: 0 };
        if (refundsTableExists) {
          const refundResult = await db.query(
            `
              SELECT
                COALESCE(SUM(refund_amount), 0) AS refunds_amount,
                COUNT(*) AS refunds_count
              FROM ${schema.refundsTable}
              WHERE status = 'PROCESSED'
            `,
          );
          refundStats = refundResult.rows[0] || refundStats;
        }

        const paymentsResult = paymentsTableExists
          ? await db.query(paymentsQuery)
          : { rows: [{}] };
        const paymentStats = paymentsResult.rows[0] || {};

        return {
          collectedAmount: toNumber(paymentStats.collected_amount, 0),
          collectedCount: toNumber(paymentStats.collected_count, 0),
          outstandingAmount: toNumber(bookingStats.outstanding_amount, 0),
          outstandingCount: toNumber(bookingStats.outstanding_count, 0),
          overdueAmount: toNumber(bookingStats.overdue_amount, 0),
          overdueCount: toNumber(bookingStats.overdue_count, 0),
          refundsAmount: toNumber(refundStats.refunds_amount, 0),
          refundsCount: toNumber(refundStats.refunds_count, 0),
        };
      }

      const payments = paymentsTableExists
        ? await db.findMany(schema.tableName, {})
        : [];
      const collectedPayments = payments
        .filter((row) => toBoolean(row.is_verified ?? row.isVerified, false))
        .filter((row) => (row.status ?? "PENDING") !== "REFUNDED");
      const collectedAmount = collectedPayments.reduce(
        (sum, row) => sum + toNumber(row.amount, 0),
        0,
      );

      const bookings = bookingsTableExists
        ? await db.findMany(schema.bookingsTable, {})
        : [];
      const today = new Date();
      const bookingStats = bookings.reduce(
        (acc, row) => {
          const isDeleted = toBoolean(row.is_deleted ?? row.isDeleted, false);
          const status = row.status ?? "PENDING";
          if (isDeleted || status === "CANCELLED") {
            return acc;
          }
          const total = toNumber(row.total_amount ?? row.totalAmount, 0);
          const received = toNumber(
            row.advance_received ?? row.advanceReceived,
            0,
          );
          const outstanding = Math.max(total - received, 0);
          if (outstanding > 0) {
            acc.outstandingAmount += outstanding;
            acc.outstandingCount += 1;

            const travelStart = row.travel_start_date ?? row.travelStartDate;
            if (travelStart) {
              const travelDate = new Date(travelStart);
              if (!Number.isNaN(travelDate.getTime()) && travelDate < today) {
                acc.overdueAmount += outstanding;
                acc.overdueCount += 1;
              }
            }
          }
          return acc;
        },
        {
          outstandingAmount: 0,
          outstandingCount: 0,
          overdueAmount: 0,
          overdueCount: 0,
        },
      );

      const refunds = refundsTableExists
        ? await db.findMany(schema.refundsTable, {})
        : [];
      const processedRefunds = refunds.filter(
        (row) => (row.status ?? "INITIATED") === "PROCESSED",
      );
      const refundsAmount = processedRefunds.reduce(
        (sum, row) => sum + toNumber(row.refund_amount ?? row.refundAmount, 0),
        0,
      );

      return {
        collectedAmount,
        collectedCount: collectedPayments.length,
        outstandingAmount: bookingStats.outstandingAmount,
        outstandingCount: bookingStats.outstandingCount,
        overdueAmount: bookingStats.overdueAmount,
        overdueCount: bookingStats.overdueCount,
        refundsAmount,
        refundsCount: processedRefunds.length,
      };
    },
    async findAll(filters = {}) {
      const rows = await db.findMany(schema.tableName, mapListFilters(filters));
      return rows
        .map((row) => toPayment(row))
        .sort((a, b) => {
          const left = new Date(a.createdAt || 0).getTime();
          const right = new Date(b.createdAt || 0).getTime();
          return right - left;
        });
    },

    async findById(id) {
      const row = await db.findById(schema.tableName, id);
      return toPayment(row);
    },

    async create(payload) {
      logger.debug({ module: "payments", payload }, "Creating payment");
      const normalizedPayload = { ...payload };
      let hasInvoiceUrlColumn = true;
      try {
        hasInvoiceUrlColumn = await hasColumnFresh(
          schema.tableName,
          "invoice_url",
        );
      } catch (_error) {
        hasInvoiceUrlColumn = true;
      }
      if (!hasInvoiceUrlColumn) {
        delete normalizedPayload.invoice_url;
      }
      const row = await db.insert(schema.tableName, normalizedPayload);
      return toPayment(row);
    },

    async update(id, payload) {
      logger.debug({ module: "payments", id, payload }, "Updating payment");
      const normalizedPayload = { ...payload };
      let hasInvoiceUrlColumn = true;
      try {
        hasInvoiceUrlColumn = await hasColumnFresh(
          schema.tableName,
          "invoice_url",
        );
      } catch (_error) {
        hasInvoiceUrlColumn = true;
      }
      if (!hasInvoiceUrlColumn) {
        delete normalizedPayload.invoice_url;
      }
      const row = await db.update(schema.tableName, id, normalizedPayload);
      return toPayment(row);
    },

    async findBookingById(id) {
      const row = await db.findById(schema.bookingsTable, id);
      return toBooking(row);
    },

    async updateBooking(id, payload) {
      const row = await db.update(schema.bookingsTable, id, payload);
      return toBooking(row);
    },

    async getVerifiedPaidAmount(bookingId) {
      if (canUseRawQuery()) {
        const result = await db.query(
          `
            SELECT COALESCE(SUM(amount), 0) AS paid_amount
            FROM ${schema.tableName}
            WHERE booking_id = ?
              AND COALESCE(is_verified, FALSE) = TRUE
              AND COALESCE(status, 'PENDING') <> 'REFUNDED'
          `,
          [bookingId],
        );

        return toNumber(result.rows[0]?.paid_amount, 0);
      }

      const rows = await db.findMany(schema.tableName, {
        booking_id: bookingId,
      });
      return rows
        .filter((row) => toBoolean(row.is_verified ?? row.isVerified, false))
        .filter((row) => (row.status ?? "PENDING") !== "REFUNDED")
        .reduce((sum, row) => sum + toNumber(row.amount, 0), 0);
    },

    getProcessedRefundAmount,
  });
}

export { createPaymentsRepository };
