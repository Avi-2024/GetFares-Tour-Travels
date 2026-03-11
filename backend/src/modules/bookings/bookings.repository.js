function createBookingsRepository({ db, logger, schema }) {
  const tableCache = new Map();
  const columnCache = new Map();

  function canIntrospect() {
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

  function toBooking(row) {
    if (!row) {
      return null;
    }

    return {
      id: row.id,
      quotationId: row.quotation_id ?? row.quotationId ?? null,
      bookingNumber: row.booking_number ?? row.bookingNumber ?? null,
      travelStartDate: row.travel_start_date ?? row.travelStartDate ?? null,
      travelEndDate: row.travel_end_date ?? row.travelEndDate ?? null,
      totalAmount: toNumber(row.total_amount ?? row.totalAmount, 0),
      costAmount: toNumber(row.cost_amount ?? row.costAmount, 0),
      profitAmount: toNumber(row.profit_amount ?? row.profitAmount, 0),
      status: row.status ?? 'PENDING',
      paymentStatus: row.payment_status ?? row.paymentStatus ?? 'PENDING',
      advanceRequired: toNumber(row.advance_required ?? row.advanceRequired, 0),
      advanceReceived: toNumber(row.advance_received ?? row.advanceReceived, 0),
      clientCurrency: row.client_currency ?? row.clientCurrency ?? null,
      supplierCurrency: row.supplier_currency ?? row.supplierCurrency ?? null,
      exchangeRate: row.exchange_rate !== undefined ? toNumber(row.exchange_rate ?? row.exchangeRate, null) : null,
      exchangeLocked: toBoolean(row.exchange_locked ?? row.exchangeLocked, false),
      cancellationReason: row.cancellation_reason ?? row.cancellationReason ?? null,
      cancelledAt: toDate(row.cancelled_at ?? row.cancelledAt),
      createdBy: row.created_by ?? row.createdBy ?? null,
      isDeleted: toBoolean(row.is_deleted ?? row.isDeleted, false),
      createdAt: toDate(row.created_at ?? row.createdAt),
      updatedAt: toDate(row.updated_at ?? row.updatedAt),
    };
  }

  function toInvoice(row) {
    if (!row) {
      return null;
    }

    return {
      id: row.id,
      bookingId: row.booking_id ?? row.bookingId,
      invoiceNumber: row.invoice_number ?? row.invoiceNumber ?? null,
      pdfUrl: row.pdf_url ?? row.pdfUrl ?? null,
      generatedAt: toDate(row.generated_at ?? row.generatedAt),
    };
  }

  function toStatusHistory(row) {
    if (!row) {
      return null;
    }

    return {
      id: row.id,
      bookingId: row.booking_id ?? row.bookingId,
      oldStatus: row.old_status ?? row.oldStatus ?? null,
      newStatus: row.new_status ?? row.newStatus ?? null,
      changedBy: row.changed_by ?? row.changedBy ?? null,
      changedAt: toDate(row.changed_at ?? row.changedAt),
    };
  }

  async function hasTable(tableName) {
    if (!canIntrospect()) {
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

  async function getTableColumns(tableName) {
    if (!canIntrospect()) {
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
      `SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=$1`,
      [tableName],
    );

    const columns = new Set(result.rows.map((row) => row.column_name));
    columnCache.set(tableName, columns);
    return columns;
  }

  async function hasColumn(tableName, columnName) {
    const columns = await getTableColumns(tableName);
    if (columns === null) {
      return true;
    }

    return columns.has(columnName);
  }

  async function sanitizeForTable(tableName, payload = {}) {
    const entries = Object.entries(payload).filter(([, value]) => value !== undefined);
    if (!entries.length) {
      return {};
    }

    const columns = await getTableColumns(tableName);
    if (columns === null) {
      return Object.fromEntries(entries);
    }

    return Object.fromEntries(entries.filter(([key]) => columns.has(key)));
  }

  function mapListFilters(filters = {}) {
    const mapped = {};

    if (filters.status) {
      mapped.status = filters.status;
    }
    if (filters.paymentStatus) {
      mapped.payment_status = filters.paymentStatus;
    }
    if (filters.quotationId) {
      mapped.quotation_id = filters.quotationId;
    }
    if (filters.createdBy) {
      mapped.created_by = filters.createdBy;
    }
    if (filters.page) {
      mapped.page = filters.page;
    }
    if (filters.limit) {
      mapped.limit = filters.limit;
    }

    return mapped;
  }

  async function getVerifiedPayments(bookingId) {
    const rows = await db.findMany(schema.paymentsTable, { booking_id: bookingId });

    return rows.filter((row) => {
      const isVerified = toBoolean(row.is_verified ?? row.isVerified, false);
      const status = row.status ?? 'PENDING';
      return isVerified && status !== 'REFUNDED';
    });
  }

  async function getProcessedRefundRows(bookingId) {
    const tableExists = await hasTable(schema.refundsTable);
    if (!tableExists) {
      return [];
    }

    const rows = await db.findMany(schema.refundsTable, { booking_id: bookingId });
    return rows.filter((row) => (row.status ?? 'INITIATED') === 'PROCESSED');
  }

  return Object.freeze({
    async findAll(filters = {}) {
      const rows = await db.findMany(schema.tableName, mapListFilters(filters));
      let list = rows.map((row) => toBooking(row));

      if (!filters.includeDeleted) {
        list = list.filter((item) => !item.isDeleted);
      }

      return list.sort((a, b) => {
        const left = new Date(a.createdAt || 0).getTime();
        const right = new Date(b.createdAt || 0).getTime();
        return right - left;
      });
    },

    async findById(id) {
      const row = await db.findById(schema.tableName, id);
      return toBooking(row);
    },

    async findByQuotationId(quotationId) {
      const row = await db.findOne(schema.tableName, { quotation_id: quotationId });
      return toBooking(row);
    },

    async findByBookingNumber(bookingNumber) {
      const row = await db.findOne(schema.tableName, { booking_number: bookingNumber });
      return toBooking(row);
    },

    async findQuotationById(id) {
      if (!id) {
        return null;
      }

      const row = await db.findById(schema.quotationsTable, id);
      if (!row) {
        return null;
      }

      return {
        id: row.id,
        status: row.status,
        leadId: row.lead_id ?? row.leadId ?? null,
      };
    },

    async create(payload) {
      logger.debug({ module: 'bookings', payload }, 'Creating booking');
      const sanitized = await sanitizeForTable(schema.tableName, payload);
      const row = await db.insert(schema.tableName, sanitized);
      return toBooking(row);
    },

    async update(id, payload) {
      logger.debug({ module: 'bookings', id, payload }, 'Updating booking');
      const sanitized = await sanitizeForTable(schema.tableName, payload);
      const row = await db.update(schema.tableName, id, sanitized);
      return toBooking(row);
    },

    async createStatusHistory(payload) {
      const tableExists = await hasTable(schema.statusHistoryTable);
      if (!tableExists) {
        return null;
      }

      const row = await db.insert(schema.statusHistoryTable, {
        booking_id: payload.bookingId,
        old_status: payload.oldStatus || null,
        new_status: payload.newStatus,
        changed_by: payload.changedBy || null,
        changed_at: payload.changedAt || new Date().toISOString(),
      });

      return toStatusHistory(row);
    },

    async listStatusHistory(bookingId) {
      const tableExists = await hasTable(schema.statusHistoryTable);
      if (!tableExists) {
        return [];
      }

      const rows = await db.findMany(schema.statusHistoryTable, { booking_id: bookingId });
      return rows
        .map((row) => toStatusHistory(row))
        .sort((a, b) => {
          const left = new Date(a.changedAt || 0).getTime();
          const right = new Date(b.changedAt || 0).getTime();
          return right - left;
        });
    },

    async createInvoice(payload) {
      const row = await db.insert(schema.invoicesTable, {
        booking_id: payload.bookingId,
        invoice_number: payload.invoiceNumber,
        pdf_url: payload.pdfUrl || null,
        generated_at: payload.generatedAt || new Date().toISOString(),
      });

      return toInvoice(row);
    },

    async findInvoicesByBookingId(bookingId) {
      const rows = await db.findMany(schema.invoicesTable, { booking_id: bookingId });
      return rows
        .map((row) => toInvoice(row))
        .sort((a, b) => {
          const left = new Date(a.generatedAt || 0).getTime();
          const right = new Date(b.generatedAt || 0).getTime();
          return right - left;
        });
    },

    async findInvoiceByNumber(invoiceNumber) {
      const row = await db.findOne(schema.invoicesTable, { invoice_number: invoiceNumber });
      return toInvoice(row);
    },

    async getPaymentPolicySnapshot(bookingId, advanceRequired = 0) {
      if (canIntrospect()) {
        const paidResult = await db.query(
          `
            SELECT COALESCE(SUM(amount), 0) AS paid_amount
            FROM ${schema.paymentsTable}
            WHERE booking_id = $1
              AND COALESCE(is_verified, FALSE) = TRUE
              AND COALESCE(status, 'PENDING') <> 'REFUNDED'
          `,
          [bookingId],
        );

        const proofResult = await db.query(
          `
            SELECT COUNT(*)::int AS proof_count
            FROM ${schema.paymentsTable}
            WHERE booking_id = $1
              AND COALESCE(is_verified, FALSE) = TRUE
              AND (
                proof_url IS NOT NULL
                OR gateway_payment_id IS NOT NULL
                OR payment_reference IS NOT NULL
              )
          `,
          [bookingId],
        );

        const paidAmount = toNumber(paidResult.rows[0]?.paid_amount, 0);
        const proofCount = toNumber(proofResult.rows[0]?.proof_count, 0);

        return {
          paidAmount,
          hasProof: proofCount > 0,
          meetsAdvance: paidAmount >= toNumber(advanceRequired, 0),
        };
      }

      const verifiedPayments = await getVerifiedPayments(bookingId);
      const paidAmount = verifiedPayments.reduce((sum, row) => sum + toNumber(row.amount, 0), 0);
      const hasProof = verifiedPayments.some((row) => {
        return Boolean(row.proof_url || row.proofUrl || row.gateway_payment_id || row.payment_reference);
      });

      return {
        paidAmount,
        hasProof,
        meetsAdvance: paidAmount >= toNumber(advanceRequired, 0),
      };
    },

    async getVerifiedPaidAmount(bookingId) {
      if (canIntrospect()) {
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

      const verifiedPayments = await getVerifiedPayments(bookingId);
      return verifiedPayments.reduce((sum, payment) => sum + toNumber(payment.amount, 0), 0);
    },

    async getProcessedRefundAmount(bookingId) {
      if (canIntrospect()) {
        const tableExists = await hasTable(schema.refundsTable);
        if (!tableExists) {
          return 0;
        }

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

      const rows = await getProcessedRefundRows(bookingId);
      return rows.reduce((sum, row) => sum + toNumber(row.refund_amount ?? row.refundAmount, 0), 0);
    },

    async hasColumn(tableName, columnName) {
      return hasColumn(tableName, columnName);
    },
  });
}

module.exports = { createBookingsRepository };
