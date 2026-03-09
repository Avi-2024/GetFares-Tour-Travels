function createPaymentsRepository({ db, logger, schema }) {
  const tableCache = new Map();

  function canUseRawQuery() {
    return typeof db.query === 'function' && Boolean(db.pool);
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

    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'number') {
      return value === 1;
    }

    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (normalized === 'true' || normalized === '1' || normalized === 'yes') {
        return true;
      }
      if (normalized === 'false' || normalized === '0' || normalized === 'no') {
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
      currency: row.currency ?? 'INR',
      paymentMode: row.payment_mode ?? row.paymentMode ?? null,
      gatewayProvider: row.gateway_provider ?? row.gatewayProvider ?? null,
      gatewayOrderId: row.gateway_order_id ?? row.gatewayOrderId ?? null,
      gatewayPaymentId: row.gateway_payment_id ?? row.gatewayPaymentId ?? null,
      gatewaySignature: row.gateway_signature ?? row.gatewaySignature ?? null,
      paymentReference: row.payment_reference ?? row.paymentReference ?? null,
      proofUrl: row.proof_url ?? row.proofUrl ?? null,
      status: row.status ?? 'PENDING',
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
      status: row.status ?? 'PENDING',
      paymentStatus: row.payment_status ?? row.paymentStatus ?? 'PENDING',
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
        `SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=$1 LIMIT 1`,
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
          WHERE booking_id = $1
            AND status = 'PROCESSED'
        `,
        [bookingId],
      );

      return toNumber(result.rows[0]?.refund_amount, 0);
    }

    const rows = await db.findMany(schema.refundsTable, { booking_id: bookingId });
    return rows
      .filter((row) => (row.status ?? 'INITIATED') === 'PROCESSED')
      .reduce((sum, row) => sum + toNumber(row.refund_amount ?? row.refundAmount, 0), 0);
  }

  return Object.freeze({
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
      logger.debug({ module: 'payments', payload }, 'Creating payment');
      const row = await db.insert(schema.tableName, payload);
      return toPayment(row);
    },

    async update(id, payload) {
      logger.debug({ module: 'payments', id, payload }, 'Updating payment');
      const row = await db.update(schema.tableName, id, payload);
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
            WHERE booking_id = $1
              AND COALESCE(is_verified, FALSE) = TRUE
              AND COALESCE(status, 'PENDING') <> 'REFUNDED'
          `,
          [bookingId],
        );

        return toNumber(result.rows[0]?.paid_amount, 0);
      }

      const rows = await db.findMany(schema.tableName, { booking_id: bookingId });
      return rows
        .filter((row) => toBoolean(row.is_verified ?? row.isVerified, false))
        .filter((row) => (row.status ?? 'PENDING') !== 'REFUNDED')
        .reduce((sum, row) => sum + toNumber(row.amount, 0), 0);
    },

    getProcessedRefundAmount,
  });
}

module.exports = { createPaymentsRepository };
