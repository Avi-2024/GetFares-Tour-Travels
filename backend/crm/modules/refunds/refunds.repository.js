function createRefundsRepository({ db, logger, schema }) {
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

  async function hasColumn(tableName, columnName) {
    if (!canUseRawQuery()) {
      return true;
    }

    const cacheKey = `${tableName}.${columnName}`;
    if (columnCache.has(cacheKey)) {
      return columnCache.get(cacheKey);
    }

    try {
      const exists = await hasTable(tableName);
      if (!exists) {
        columnCache.set(cacheKey, false);
        return false;
      }
      const result = await db.query(
        `SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name=? AND column_name=? LIMIT 1`,
        [tableName, columnName],
      );
      const columnExists = result.rowCount > 0;
      columnCache.set(cacheKey, columnExists);
      return columnExists;
    } catch (_error) {
      columnCache.set(cacheKey, true);
      return true;
    }
  }

  async function normalizePayloadColumns(payload) {
    const normalized = { ...payload };
    const optionalColumns = [
      "proof_url",
      "notes",
      "assigned_to",
      "raised_by_name",
      "created_by",
      "approved_at",
      "rejected_at",
      "rejected_by",
      "rejected_reason",
      "processed_by",
    ];
    await Promise.all(
      optionalColumns.map(async (column) => {
        const exists = await hasColumn(schema.tableName, column);
        if (!exists) {
          delete normalized[column];
        }
      }),
    );
    return normalized;
  }

  function toUserSummary(row) {
    if (!row) {
      return null;
    }

    return {
      id: row.id,
      fullName: row.full_name ?? row.fullName ?? null,
      email: row.email ?? null,
      roleId: row.role_id ?? row.roleId ?? null,
      isActive: toBoolean(row.is_active ?? row.isActive, true),
    };
  }

  function toRoleSummary(row) {
    if (!row) {
      return null;
    }

    return {
      id: row.id,
      name: row.name ?? null,
    };
  }

  function toRefund(row, userLookup = new Map()) {
    if (!row) {
      return null;
    }

    const createdById = row.created_by ?? row.createdBy ?? null;
    const approvedById = row.approved_by ?? row.approvedBy ?? null;
    const rejectedById = row.rejected_by ?? row.rejectedBy ?? null;
    const processedById = row.processed_by ?? row.processedBy ?? null;
    const assignedToId = row.assigned_to ?? row.assignedTo ?? null;

    const createdByUser = createdById ? userLookup.get(String(createdById)) : null;
    const approvedByUser = approvedById ? userLookup.get(String(approvedById)) : null;
    const rejectedByUser = rejectedById ? userLookup.get(String(rejectedById)) : null;
    const processedByUser = processedById ? userLookup.get(String(processedById)) : null;
    const assignedToUser = assignedToId ? userLookup.get(String(assignedToId)) : null;

    return {
      id: row.id,
      bookingId: row.booking_id ?? row.bookingId ?? null,
      paymentId: row.payment_id ?? row.paymentId ?? null,
      assignedTo: assignedToId,
      assignedToName: assignedToUser?.fullName ?? null,
      raisedByName: row.raised_by_name ?? row.raisedByName ?? null,
      refundAmount: toNumber(row.refund_amount ?? row.refundAmount, 0),
      gatewayRefundId: row.gateway_refund_id ?? row.gatewayRefundId ?? null,
      proofUrl: row.proof_url ?? row.proofUrl ?? null,
      notes: row.notes ?? null,
      supplierPenalty: toNumber(row.supplier_penalty ?? row.supplierPenalty, 0),
      serviceCharge: toNumber(row.service_charge ?? row.serviceCharge, 0),
      status: row.status ?? "INITIATED",
      createdById,
      createdBy: createdByUser?.fullName ?? row.created_by_name ?? "System",
      approvedAt: toDate(row.approved_at ?? row.approvedAt),
      approvedById,
      approvedBy: approvedByUser?.fullName ?? null,
      rejectedAt: toDate(row.rejected_at ?? row.rejectedAt),
      rejectedById,
      rejectedBy: rejectedByUser?.fullName ?? null,
      rejectedReason: row.rejected_reason ?? row.rejectedReason ?? null,
      processedAt: toDate(row.processed_at ?? row.processedAt),
      processedById,
      processedBy: processedByUser?.fullName ?? null,
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
      paymentStatus: row.payment_status ?? row.paymentStatus ?? "PENDING",
      status: row.status ?? "PENDING",
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
      status: row.status ?? "PENDING",
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

  async function buildUserLookup(rows = []) {
    const ids = [...new Set(
      rows
        .flatMap((row) => [
          row?.created_by ?? row?.createdBy ?? null,
          row?.approved_by ?? row?.approvedBy ?? null,
          row?.rejected_by ?? row?.rejectedBy ?? null,
          row?.processed_by ?? row?.processedBy ?? null,
          row?.assigned_to ?? row?.assignedTo ?? null,
        ])
        .filter(Boolean)
        .map((value) => String(value)),
    )];

    if (!ids.length) {
      return new Map();
    }

    const users = await Promise.all(
      ids.map((id) => db.findById(schema.usersTable, id)),
    );

    return new Map(
      users
        .map((row) => toUserSummary(row))
        .filter(Boolean)
        .map((user) => [String(user.id), user]),
    );
  }

  return Object.freeze({
    async findAll(filters = {}) {
      const rows = await db.findMany(schema.tableName, mapListFilters(filters));
      const userLookup = await buildUserLookup(rows);
      return rows
        .map((row) => toRefund(row, userLookup))
        .sort((a, b) => {
          const left = new Date(a.createdAt || 0).getTime();
          const right = new Date(b.createdAt || 0).getTime();
          return right - left;
        });
    },

    async findById(id) {
      const row = await db.findById(schema.tableName, id);
      const userLookup = await buildUserLookup(row ? [row] : []);
      return toRefund(row, userLookup);
    },

    async create(payload) {
      logger.debug({ module: "refunds", payload }, "Creating refund");
      const row = await db.insert(
        schema.tableName,
        await normalizePayloadColumns(payload),
      );
      const userLookup = await buildUserLookup(row ? [row] : []);
      return toRefund(row, userLookup);
    },

    async update(id, payload) {
      logger.debug({ module: "refunds", id, payload }, "Updating refund");
      const row = await db.update(
        schema.tableName,
        id,
        await normalizePayloadColumns(payload),
      );
      const userLookup = await buildUserLookup(row ? [row] : []);
      return toRefund(row, userLookup);
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

    async findUserById(id) {
      const row = await db.findById(schema.usersTable, id);
      return toUserSummary(row);
    },

    async findRoleById(id) {
      const row = await db.findById(schema.rolesTable, id);
      return toRoleSummary(row);
    },

    async findAssignableAccountsUsers() {
      if (canUseRawQuery()) {
        const rows = await db.query(
          `
            SELECT
              u.id,
              u.full_name,
              u.email,
              u.role_id,
              u.is_active
            FROM ${schema.usersTable} u
            INNER JOIN ${schema.rolesTable} r ON r.id = u.role_id
            WHERE LOWER(TRIM(r.name)) = 'accounts'
              AND COALESCE(u.is_active, 1) = 1
            ORDER BY u.full_name ASC, u.email ASC
          `,
        );
        return (Array.isArray(rows.rows) ? rows.rows : [])
          .map((row) => toUserSummary(row))
          .filter((row) => row?.id);
      }

      const [users, roles] = await Promise.all([
        db.findMany(schema.usersTable, {}),
        db.findMany(schema.rolesTable, {}),
      ]);
      const roleLookup = new Map(
        (Array.isArray(roles) ? roles : []).map((role) => [
          String(role.id),
          String(role.name || "").trim().toLowerCase(),
        ]),
      );

      return (Array.isArray(users) ? users : [])
        .map((row) => toUserSummary(row))
        .filter((user) => user?.id && user.isActive)
        .filter((user) => roleLookup.get(String(user.roleId || "")) === "accounts")
        .sort((left, right) =>
          String(left.fullName || "").localeCompare(String(right.fullName || "")),
        );
    },

    async getVerifiedPaidAmount(bookingId) {
      if (canUseRawQuery()) {
        const result = await db.query(
          `
            SELECT COALESCE(SUM(amount), 0) AS paid_amount
            FROM ${schema.paymentsTable}
            WHERE booking_id = ?
              AND COALESCE(is_verified, FALSE) = TRUE
              AND COALESCE(status, 'PENDING') <> 'REFUNDED'
          `,
          [bookingId],
        );

        return toNumber(result.rows[0]?.paid_amount, 0);
      }

      const rows = await db.findMany(schema.paymentsTable, {
        booking_id: bookingId,
      });
      return rows
        .filter((row) => toBoolean(row.is_verified ?? row.isVerified, false))
        .filter((row) => (row.status ?? "PENDING") !== "REFUNDED")
        .reduce((sum, row) => sum + toNumber(row.amount, 0), 0);
    },

    async getProcessedRefundAmount(bookingId) {
      if (canUseRawQuery()) {
        const result = await db.query(
          `
            SELECT COALESCE(SUM(refund_amount), 0) AS refund_amount
            FROM ${schema.tableName}
            WHERE booking_id = ?
              AND status = 'PROCESSED'
          `,
          [bookingId],
        );

        return toNumber(result.rows[0]?.refund_amount, 0);
      }

      const rows = await db.findMany(schema.tableName, {
        booking_id: bookingId,
      });
      return rows
        .filter((row) => (row.status ?? "INITIATED") === "PROCESSED")
        .reduce(
          (sum, row) =>
            sum + toNumber(row.refund_amount ?? row.refundAmount, 0),
          0,
        );
    },

    /** Refunds reserved against a specific payment (initiated + approved + processed). */
    async getRefundReservationForPayment(paymentId, excludeRefundId = null) {
      if (!paymentId) {
        return 0;
      }

      if (canUseRawQuery()) {
        const params = [paymentId];
        let sql = `
            SELECT COALESCE(SUM(refund_amount), 0) AS reservation
            FROM ${schema.tableName}
            WHERE payment_id = ?
              AND status IN ('INITIATED', 'APPROVED', 'PROCESSED')
          `;
        if (excludeRefundId) {
          sql += ` AND id <> ?`;
          params.push(excludeRefundId);
        }
        const result = await db.query(sql, params);
        return toNumber(result.rows[0]?.reservation, 0);
      }

      const rows = await db.findMany(schema.tableName, {
        payment_id: paymentId,
      });
      const statuses = new Set(["INITIATED", "APPROVED", "PROCESSED"]);
      return rows
        .filter((row) =>
          statuses.has(String(row.status ?? "INITIATED").toUpperCase()),
        )
        .filter(
          (row) => !excludeRefundId || String(row.id) !== String(excludeRefundId),
        )
        .reduce(
          (sum, row) =>
            sum + toNumber(row.refund_amount ?? row.refundAmount, 0),
          0,
        );
    },

    /** Sums refunds not yet processed (counts against available refund capacity). */
    async getPendingRefundReservationAmount(bookingId, excludeRefundId = null) {
      if (canUseRawQuery()) {
        const params = [bookingId];
        let sql = `
            SELECT COALESCE(SUM(refund_amount), 0) AS reservation
            FROM ${schema.tableName}
            WHERE booking_id = ?
              AND status IN ('INITIATED', 'APPROVED')
          `;
        if (excludeRefundId) {
          sql += ` AND id <> ?`;
          params.push(excludeRefundId);
        }
        const result = await db.query(sql, params);
        return toNumber(result.rows[0]?.reservation, 0);
      }

      const rows = await db.findMany(schema.tableName, {
        booking_id: bookingId,
      });
      const pending = ["INITIATED", "APPROVED"];
      return rows
        .filter((row) => pending.includes(String(row.status ?? "INITIATED")))
        .filter((row) => !excludeRefundId || String(row.id) !== String(excludeRefundId))
        .reduce(
          (sum, row) =>
            sum + toNumber(row.refund_amount ?? row.refundAmount, 0),
          0,
        );
    },
  });
}

export { createRefundsRepository };
