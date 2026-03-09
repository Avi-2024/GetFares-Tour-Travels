function createRefundsRepository({ db, logger, schema }) {
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

  function toRefund(row) {
    if (!row) {
      return null;
    }

    return {
      id: row.id,
      bookingId: row.booking_id ?? row.bookingId ?? null,
      paymentId: row.payment_id ?? row.paymentId ?? null,
      refundAmount: toNumber(row.refund_amount ?? row.refundAmount, 0),
      gatewayRefundId: row.gateway_refund_id ?? row.gatewayRefundId ?? null,
      supplierPenalty: toNumber(row.supplier_penalty ?? row.supplierPenalty, 0),
      serviceCharge: toNumber(row.service_charge ?? row.serviceCharge, 0),
      status: row.status ?? 'INITIATED',
      approvedBy: row.approved_by ?? row.approvedBy ?? null,
      processedAt: toDate(row.processed_at ?? row.processedAt),
      createdAt: toDate(row.created_at ?? row.createdAt),
    };
  }

  function toBooking(row) {
    if (!row) {
      return null;
    }

    return {
      id: row.id,
      totalAmount: toNumber(row.total_amount ?? row.totalAmount, 0),
      advanceReceived: toNumber(row.advance_received ?? row.advanceReceived, 0),
      paymentStatus: row.payment_status ?? row.paymentStatus ?? 'PENDING',
      status: row.status ?? 'PENDING',
      isDeleted: toBoolean(row.is_deleted ?? row.isDeleted, false),
    };
  }

  function toPayment(row) {
    if (!row) {
      return null;
    }

    return {
      id: row.id,
      bookingId: row.booking_id ?? row.bookingId ?? null,
      amount: toNumber(row.amount, 0),
      status: row.status ?? 'PENDING',
      isVerified: toBoolean(row.is_verified ?? row.isVerified, false),
    };
  }

  function mapListFilters(filters = {}) {
    const mapped = {};

    if (filters.bookingId) {
      mapped.booking_id = filters.bookingId;
    }
    if (filters.paymentId) {
      mapped.payment_id = filters.paymentId;
    }
    if (filters.status) {
      mapped.status = filters.status;
    }
    if (filters.approvedBy) {
      mapped.approved_by = filters.approvedBy;
    }
    if (filters.page) {
      mapped.page = filters.page;
    }
    if (filters.limit) {
      mapped.limit = filters.limit;
    }

    return mapped;
  }

  return Object.freeze({
    async findAll(filters = {}) {
      const rows = await db.findMany(schema.tableName, mapListFilters(filters));
      return rows
        .map((row) => toRefund(row))
        .sort((a, b) => {
          const left = new Date(a.createdAt || 0).getTime();
          const right = new Date(b.createdAt || 0).getTime();
          return right - left;
        });
    },

    async findById(id) {
      const row = await db.findById(schema.tableName, id);
      return toRefund(row);
    },

    async create(payload) {
      logger.debug({ module: 'refunds', payload }, 'Creating refund');
      const row = await db.insert(schema.tableName, payload);
      return toRefund(row);
    },

    async update(id, payload) {
      logger.debug({ module: 'refunds', id, payload }, 'Updating refund');
      const row = await db.update(schema.tableName, id, payload);
      return toRefund(row);
    },

    async findBookingById(id) {
      const row = await db.findById(schema.bookingsTable, id);
      return toBooking(row);
    },

    async updateBooking(id, payload) {
      const row = await db.update(schema.bookingsTable, id, payload);
      return toBooking(row);
    },

    async findPaymentById(id) {
      const row = await db.findById(schema.paymentsTable, id);
      return toPayment(row);
    },

    async updatePayment(id, payload) {
      const row = await db.update(schema.paymentsTable, id, payload);
      return toPayment(row);
    },

    async getVerifiedPaidAmount(bookingId) {
      if (canUseRawQuery()) {
        const result = await db.query(
          `
            SELECT COALESCE(SUM(amount), 0) AS paid_amount
            FROM ${schema.paymentsTable}
            WHERE booking_id = $1
              AND COALESCE(is_verified, FALSE) = TRUE
              AND COALESCE(status, 'PENDING') <> 'REFUNDED'
          `,
          [bookingId],
        );

        return toNumber(result.rows[0]?.paid_amount, 0);
      }

      const rows = await db.findMany(schema.paymentsTable, { booking_id: bookingId });
      return rows
        .filter((row) => toBoolean(row.is_verified ?? row.isVerified, false))
        .filter((row) => (row.status ?? 'PENDING') !== 'REFUNDED')
        .reduce((sum, row) => sum + toNumber(row.amount, 0), 0);
    },

    async getProcessedRefundAmount(bookingId) {
      if (canUseRawQuery()) {
        const result = await db.query(
          `
            SELECT COALESCE(SUM(refund_amount), 0) AS refund_amount
            FROM ${schema.tableName}
            WHERE booking_id = $1
              AND status = 'PROCESSED'
          `,
          [bookingId],
        );

        return toNumber(result.rows[0]?.refund_amount, 0);
      }

      const rows = await db.findMany(schema.tableName, { booking_id: bookingId });
      return rows
        .filter((row) => (row.status ?? 'INITIATED') === 'PROCESSED')
        .reduce((sum, row) => sum + toNumber(row.refund_amount ?? row.refundAmount, 0), 0);
    },
  });
}

module.exports = { createRefundsRepository };
