function createSuppliersRepository({ db, logger, schema }) {
  const tableColumnsCache = new Map();
  const tableExistsCache = new Map();

  function getAdapterName() {
    return String(db.adapter || "").toLowerCase();
  }

  function isPostgresAdapter() {
    return getAdapterName() === "postgres";
  }

  function toNumber(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function derivePayableStatus(payableAmount, paidAmount) {
    const total = toNumber(payableAmount, 0);
    const paid = toNumber(paidAmount, 0);
    if (paid <= 0) {
      return "PENDING";
    }
    if (paid >= total) {
      return "PAID";
    }
    return "PARTIAL";
  }

  function canUseRawQuery() {
    const adapter = getAdapterName();
    return (
      typeof db.query === "function" &&
      db.pool &&
      (adapter === "postgres")
    );
  }

  function parseObject(value, fallback = {}) {
    if (value === null || value === undefined) {
      return fallback;
    }
    if (typeof value === "object") {
      return value;
    }
    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        return parsed && typeof parsed === "object" ? parsed : fallback;
      } catch (_error) {
        return fallback;
      }
    }
    return fallback;
  }

  async function hasTable(tableName) {
    if (!canUseRawQuery()) {
      return true;
    }
    if (tableExistsCache.has(tableName)) {
      return tableExistsCache.get(tableName);
    }

    try {
      const result = await db.query(
        `SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name=? LIMIT 1`,
        [tableName],
      );
      const exists = result.rowCount > 0;
      tableExistsCache.set(tableName, exists);
      return exists;
    } catch (_error) {
      tableExistsCache.set(tableName, false);
      return false;
    }
  }

  async function getTableColumns(tableName) {
    if (!canUseRawQuery()) {
      return null;
    }

    if (tableColumnsCache.has(tableName)) {
      return tableColumnsCache.get(tableName);
    }

    const result = await db.query(
      `SELECT column_name FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name=?`,
      [tableName],
    );

    const columns = new Set(result.rows.map((row) => row.column_name));
    tableColumnsCache.set(tableName, columns);
    return columns;
  }

  async function sanitizeForTable(tableName, payload = {}) {
    const entries = Object.entries(payload).filter(
      ([, value]) => value !== undefined,
    );
    if (!entries.length) {
      return {};
    }

    const columns = await getTableColumns(tableName);
    if (columns === null) {
      return Object.fromEntries(entries);
    }

    return Object.fromEntries(entries.filter(([key]) => columns.has(key)));
  }

  async function findAll(filters = {}) {
    const sanitized = await sanitizeForTable(schema.tableName, filters);
    return db.findMany(schema.tableName, sanitized);
  }

  async function findById(id) {
    return db.findById(schema.tableName, id);
  }

  async function create(payload) {
    logger.debug({ module: "suppliers", payload }, "Creating supplier");
    const sanitized = await sanitizeForTable(schema.tableName, payload);
    return db.insert(schema.tableName, sanitized);
  }

  async function update(id, payload) {
    logger.debug({ module: "suppliers", id, payload }, "Updating supplier");
    const sanitized = await sanitizeForTable(schema.tableName, payload);
    return db.update(schema.tableName, id, sanitized);
  }

  async function findBookingById(bookingId) {
    if (!bookingId) {
      return null;
    }
    return db.findById(schema.bookingsTable, bookingId);
  }

  async function findBookingsBySupplierId(supplierId, filters = {}) {
    if (!supplierId) {
      return [];
    }

    if (canUseRawQuery() && isPostgresAdapter()) {
      const params = [supplierId];
      let sql = `
        SELECT 
          b.*,
          q.trip_destination AS quotation_destination,
          l.full_name AS customer_name,
          l.email AS customer_email,
          l.phone AS customer_phone,
          c.full_name AS customer_full_name,
          d.name AS destination_name,
          COALESCE(
            service_agg.service_names,
            NULLIF(TRIM(b.supplier_details->>'serviceName'), ''),
            NULLIF(TRIM(b.supplier_details->>'serviceLabel'), ''),
            NULLIF(TRIM(b.supplier_details->>'serviceType'), ''),
            'Other'
          ) AS service_names
        FROM ${schema.bookingsTable} b
        LEFT JOIN ${schema.quotationsTable || 'quotations'} q ON q.id = b.quotation_id
        LEFT JOIN ${schema.leadsTable || 'leads'} l ON l.id = q.lead_id
        LEFT JOIN ${schema.customersTable || 'customers'} c ON c.id = l.customer_id
        LEFT JOIN ${schema.destinationsTable || 'destinations'} d ON d.id = l.destination_id
        LEFT JOIN LATERAL (
          SELECT STRING_AGG(DISTINCT mapped.service_name, ', ' ORDER BY mapped.service_name) AS service_names
          FROM (
            SELECT
              COALESCE(
                NULLIF(TRIM(srv.item ->> 'label'), ''),
                NULLIF(TRIM(srv.item ->> 'serviceName'), ''),
                CASE LOWER(COALESCE(NULLIF(TRIM(srv.item ->> 'key'), ''), ''))
                  WHEN 'hotel' THEN 'Accommodation'
                  WHEN 'flights' THEN 'Flights'
                  WHEN 'tours' THEN 'Tours & Activities'
                  WHEN 'visa' THEN 'Visa Services'
                  WHEN 'insurance' THEN 'Insurance'
                  WHEN 'insurance2' THEN 'Land Arrangement'
                  ELSE NULL
                END,
                CASE UPPER(COALESCE(NULLIF(TRIM(srv.item ->> 'itemType'), ''), ''))
                  WHEN 'HOTEL' THEN 'Accommodation'
                  WHEN 'FLIGHT' THEN 'Flights'
                  WHEN 'TRANSFER' THEN 'Land Arrangement'
                  WHEN 'VISA' THEN 'Visa Services'
                  WHEN 'INSURANCE' THEN 'Insurance'
                  WHEN 'OTHER' THEN 'Other'
                  ELSE NULL
                END,
                NULLIF(TRIM(srv.item ->> 'itemType'), ''),
                NULLIF(TRIM(srv.item ->> 'key'), ''),
                'Other'
              ) AS service_name
            FROM jsonb_array_elements(
              CASE
                WHEN jsonb_typeof(COALESCE(q.template_snapshot::jsonb, '{}'::jsonb) -> 'serviceRows') = 'array'
                  THEN COALESCE(q.template_snapshot::jsonb, '{}'::jsonb) -> 'serviceRows'
                WHEN jsonb_typeof(COALESCE(q.template_snapshot::jsonb, '{}'::jsonb) -> 'builderSnapshot' -> 'serviceRows') = 'array'
                  THEN COALESCE(q.template_snapshot::jsonb, '{}'::jsonb) -> 'builderSnapshot' -> 'serviceRows'
                ELSE '[]'::jsonb
              END
            ) AS srv(item)
            WHERE COALESCE(
              NULLIF(TRIM(srv.item ->> 'supplierId'), ''),
              NULLIF(TRIM(srv.item ->> 'supplier_id'), ''),
              NULLIF(TRIM(COALESCE(q.template_snapshot::jsonb, '{}'::jsonb) -> 'supplierDetails' ->> 'supplierId'), ''),
              NULLIF(TRIM(COALESCE(q.template_snapshot::jsonb, '{}'::jsonb) -> 'supplierDetails' ->> 'supplier_id'), '')
            ) = ?
          ) mapped
        ) service_agg ON TRUE
        WHERE b.supplier_details->>'supplierId' = ?
           OR b.supplier_details->>'supplier_id' = ?
        ORDER BY b.created_at DESC
      `;
      
      if (filters.limit) {
        params.push(filters.limit);
        sql += ` LIMIT ?`;
      }
      
      const result = await db.query(sql, params);
      return result.rows || [];
    }

    const rows = await db.findMany(schema.bookingsTable, {});
    return rows
      .filter((row) => {
        const supplierDetails = row.supplier_details ?? row.supplierDetails ?? {};
        const details = parseObject(supplierDetails, {});
        const rowSupplierId = details?.supplierId ?? details?.supplier_id ?? "";
        return String(rowSupplierId) === String(supplierId);
      })
      .sort((a, b) => {
        const aTime = new Date(a.created_at ?? a.createdAt ?? 0).getTime();
        const bTime = new Date(b.created_at ?? b.createdAt ?? 0).getTime();
        return bTime - aTime;
      })
      .slice(0, filters.limit || 500)
      .map((row) => {
        const supplierDetails = row.supplier_details ?? row.supplierDetails ?? {};
        const details = parseObject(supplierDetails, {});
        return {
          ...row,
          service_names:
            details?.serviceName ??
            details?.serviceLabel ??
            details?.serviceType ??
            details?.itemType ??
            details?.key ??
            "Other",
        };
      });
  }

  async function findPayableById(id) {
    return db.findById(schema.payablesTable, id);
  }

  async function findPayableBySupplierAndBooking(supplierId, bookingId) {
    if (!supplierId || !bookingId) {
      return null;
    }

    if (canUseRawQuery()) {
      const result = await db.query(
        `
          SELECT *
          FROM ${schema.payablesTable}
          WHERE supplier_id = ?
            AND booking_id = ?
          ORDER BY created_at DESC
          LIMIT 1
        `,
        [supplierId, bookingId],
      );
      return result.rows?.[0] || null;
    }

    const rows = await db.findMany(schema.payablesTable, {
      supplier_id: supplierId,
      booking_id: bookingId,
    });
    return (
      rows
        .slice()
        .sort((left, right) => {
          const leftTs = Date.parse(left.created_at ?? left.createdAt ?? 0);
          const rightTs = Date.parse(right.created_at ?? right.createdAt ?? 0);
          return rightTs - leftTs;
        })[0] || null
    );
  }

  async function findPayablesBySupplierId(supplierId, filters = {}) {
    const sanitized = await sanitizeForTable(schema.payablesTable, {
      supplier_id: supplierId,
      status: filters.status,
      booking_id: filters.bookingId,
      page: filters.page,
      limit: filters.limit,
    });
    sanitized.supplier_id = supplierId;
    return db.findMany(schema.payablesTable, sanitized);
  }

  async function findPayableDeadlineCandidates({
    limit = 200,
    includeStatuses = ["PENDING", "PARTIAL"],
  } = {}) {
    if (canUseRawQuery()) {
      const placeholders = includeStatuses.map(() => '?').join(','); const params = [...includeStatuses]; let sql = `SELECT p.*, s.name AS supplier_name FROM ${schema.payablesTable} p INNER JOIN ${schema.tableName} s ON s.id = p.supplier_id WHERE p.due_date IS NOT NULL AND p.status IN (${placeholders})
        ORDER BY p.due_date ASC
      `;
      if (limit) {
        params.push(limit);
        sql += ` LIMIT ?`;
      }
      const result = await db.query(sql, params);
      return result.rows || [];
    }

    const rows = await db.findMany(schema.payablesTable, {});
    const filtered = rows
      .filter((row) => Boolean(row.due_date ?? row.dueDate))
      .filter((row) =>
        includeStatuses.includes(
          String(row.status || "PENDING").toUpperCase(),
        ),
      )
      .sort((left, right) => {
        const leftDate = Date.parse(left.due_date ?? left.dueDate ?? 0);
        const rightDate = Date.parse(right.due_date ?? right.dueDate ?? 0);
        return leftDate - rightDate;
      });
    return filtered.slice(0, limit);
  }

  async function createPayable(payload) {
    logger.debug({ module: "suppliers", payload }, "Creating supplier payable");
    const sanitized = await sanitizeForTable(schema.payablesTable, payload);
    return db.insert(schema.payablesTable, sanitized);
  }

  async function updatePayable(id, payload) {
    logger.debug(
      { module: "suppliers", id, payload },
      "Updating supplier payable",
    );
    const sanitized = await sanitizeForTable(schema.payablesTable, payload);
    return db.update(schema.payablesTable, id, sanitized);
  }

  async function createSettlement(payload = {}) {
    const tableExists = await hasTable(schema.settlementsTable);
    if (!tableExists) {
      return null;
    }

    const sanitized = await sanitizeForTable(schema.settlementsTable, {
      payable_id: payload.payableId,
      supplier_id: payload.supplierId,
      booking_id: payload.bookingId,
      settlement_amount: payload.settlementAmount,
      payment_mode: payload.paymentMode,
      settlement_date: payload.settlementDate,
      reference: payload.reference,
      notes: payload.notes,
      created_by: payload.createdBy,
      created_at: payload.createdAt,
    });
    if (!Object.keys(sanitized).length) {
      return null;
    }

    return db.insert(schema.settlementsTable, sanitized);
  }

  async function findSettlementsByPayableId(payableId, filters = {}) {
    const page = Math.max(Number(filters.page) || 1, 1);
    const limit = Math.min(Math.max(Number(filters.limit) || 25, 1), 200);
    const offset = (page - 1) * limit;
    const tableExists = await hasTable(schema.settlementsTable);

    if (!tableExists) {
      return {
        rows: [],
        pagination: { page, limit, totalItems: 0, totalPages: 1 },
      };
    }

    if (canUseRawQuery()) {
      const countResult = await db.query(
        `
          SELECT COUNT(*) AS total
          FROM ${schema.settlementsTable} s
          WHERE s.payable_id = ?
        `,
        [payableId],
      );
      const totalItems = toNumber(countResult.rows?.[0]?.total, 0);

      const rowsResult = await db.query(
        `
          SELECT
            s.*,
            b.booking_number,
            u.full_name AS created_by_name
          FROM ${schema.settlementsTable} s
          LEFT JOIN ${schema.bookingsTable} b ON b.id = s.booking_id
          LEFT JOIN ${schema.usersTable} u ON u.id = s.created_by
          WHERE s.payable_id = ?
          ORDER BY s.settlement_date DESC, s.created_at DESC
          LIMIT ? OFFSET ?
        `,
        [payableId, limit, offset],
      );

      return {
        rows: rowsResult.rows || [],
        pagination: {
          page,
          limit,
          totalItems,
          totalPages: Math.max(1, Math.ceil(totalItems / limit)),
        },
      };
    }

    const rows = await db.findMany(schema.settlementsTable, {
      payable_id: payableId,
    });
    const sorted = rows.slice().sort((left, right) => {
      const leftTs = Date.parse(
        left.settlement_date ?? left.settlementDate ?? left.created_at ?? 0,
      );
      const rightTs = Date.parse(
        right.settlement_date ?? right.settlementDate ?? right.created_at ?? 0,
      );
      return rightTs - leftTs;
    });

    const sliced = sorted.slice(offset, offset + limit);
    return {
      rows: sliced,
      pagination: {
        page,
        limit,
        totalItems: sorted.length,
        totalPages: Math.max(1, Math.ceil(sorted.length / limit)),
      },
    };
  }

  async function findSettlementsBySupplierId(supplierId, filters = {}) {
    const page = Math.max(Number(filters.page) || 1, 1);
    const limit = Math.min(Math.max(Number(filters.limit) || 25, 1), 200);
    const offset = (page - 1) * limit;
    const tableExists = await hasTable(schema.settlementsTable);

    if (!tableExists) {
      return {
        rows: [],
        pagination: { page, limit, totalItems: 0, totalPages: 1 },
      };
    }

    const params = [supplierId];
    const where = [`s.supplier_id = ?`];

    if (filters.bookingId) {
      params.push(filters.bookingId);
      where.push(`s.booking_id = $${params.length}`);
    }
    if (filters.payableId) {
      params.push(filters.payableId);
      where.push(`s.payable_id = $${params.length}`);
    }
    if (filters.from) {
      params.push(filters.from);
      where.push(`s.settlement_date >= $${params.length}`);
    }
    if (filters.to) {
      params.push(filters.to);
      where.push(`s.settlement_date <= $${params.length}`);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    if (canUseRawQuery()) {
      const countResult = await db.query(
        `
          SELECT COUNT(*) AS total
          FROM ${schema.settlementsTable} s
          ${whereSql}
        `,
        params,
      );
      const totalItems = toNumber(countResult.rows?.[0]?.total, 0);

      const rowParams = [...params, limit, offset];
      const rowsResult = await db.query(
        `
          SELECT
            s.*,
            b.booking_number,
            p.payable_amount,
            p.paid_amount,
            p.status AS payable_status,
            u.full_name AS created_by_name
          FROM ${schema.settlementsTable} s
          LEFT JOIN ${schema.bookingsTable} b ON b.id = s.booking_id
          LEFT JOIN ${schema.payablesTable} p ON p.id = s.payable_id
          LEFT JOIN ${schema.usersTable} u ON u.id = s.created_by
          ${whereSql}
          ORDER BY s.settlement_date DESC, s.created_at DESC
          LIMIT $${rowParams.length - 1}
          OFFSET $${rowParams.length}
        `,
        rowParams,
      );

      return {
        rows: rowsResult.rows || [],
        pagination: {
          page,
          limit,
          totalItems,
          totalPages: Math.max(1, Math.ceil(totalItems / limit)),
        },
      };
    }

    const rows = await db.findMany(schema.settlementsTable, {
      supplier_id: supplierId,
    });
    const filtered = rows.filter((row) => {
      if (filters.bookingId && row.booking_id !== filters.bookingId) {
        return false;
      }
      if (filters.payableId && row.payable_id !== filters.payableId) {
        return false;
      }
      if (
        filters.from &&
        Date.parse(row.settlement_date ?? row.settlementDate ?? 0) <
          Date.parse(filters.from)
      ) {
        return false;
      }
      if (
        filters.to &&
        Date.parse(row.settlement_date ?? row.settlementDate ?? 0) >
          Date.parse(filters.to)
      ) {
        return false;
      }
      return true;
    });

    const sorted = filtered.slice().sort((left, right) => {
      const leftTs = Date.parse(
        left.settlement_date ?? left.settlementDate ?? left.created_at ?? 0,
      );
      const rightTs = Date.parse(
        right.settlement_date ?? right.settlementDate ?? right.created_at ?? 0,
      );
      return rightTs - leftTs;
    });
    const sliced = sorted.slice(offset, offset + limit);
    return {
      rows: sliced,
      pagination: {
        page,
        limit,
        totalItems: sorted.length,
        totalPages: Math.max(1, Math.ceil(sorted.length / limit)),
      },
    };
  }

  async function applySettlement({
    payableId,
    settlementAmount,
    paymentMode,
    settlementDate,
    reference,
    notes,
    createdBy,
  } = {}) {
    const amount = toNumber(settlementAmount, 0);
    const tableExists = await hasTable(schema.settlementsTable);
    const when = settlementDate || new Date().toISOString();
    const mode = String(paymentMode || "BANK_TRANSFER")
      .trim()
      .toUpperCase();

    if (canUseRawQuery()) {
      const client = await db.pool.connect();
      try {
        await client.query("BEGIN");

        const payableResult = await client.query(
          `
            SELECT p.*
            FROM ${schema.payablesTable} p
            WHERE p.id = ?
            FOR UPDATE
          `,
          [payableId],
        );
        const payable = payableResult.rows?.[0] || null;
        if (!payable) {
          const notFoundError = new Error("Supplier payable not found");
          notFoundError.code = "SUPPLIER_PAYABLE_NOT_FOUND";
          throw notFoundError;
        }

        const payableAmount = toNumber(payable.payable_amount, 0);
        const paidAmount = toNumber(payable.paid_amount, 0);
        const pendingAmount = Number((payableAmount - paidAmount).toFixed(2));

        if (amount <= 0) {
          const invalidError = new Error("Settlement amount must be positive");
          invalidError.code = "SUPPLIER_PAYABLE_INVALID_SETTLEMENT_AMOUNT";
          throw invalidError;
        }

        if (amount > pendingAmount) {
          const exceedsError = new Error(
            "Settlement amount cannot exceed pending amount",
          );
          exceedsError.code = "SUPPLIER_PAYABLE_SETTLEMENT_EXCEEDS_PENDING";
          exceedsError.meta = {
            payableAmount,
            paidAmount,
            pendingAmount,
            settlementAmount: amount,
          };
          throw exceedsError;
        }

        const nextPaidAmount = Number((paidAmount + amount).toFixed(2));
        const nextStatus = derivePayableStatus(payableAmount, nextPaidAmount);

        const payableUpdateResult = await client.query(
          `
            UPDATE ${schema.payablesTable}
            SET
              paid_amount = ?,
              status = ?,
              payment_reference = COALESCE(?, payment_reference),
              last_paid_at = ?
            WHERE id = ?
            RETURNING *
          `,
          [nextPaidAmount, nextStatus, reference || null, when, payableId],
        );

        let settlement = null;
        if (tableExists) {
          const settlementResult = await client.query(
            `
              INSERT INTO ${schema.settlementsTable} (
                payable_id,
                supplier_id,
                booking_id,
                settlement_amount,
                payment_mode,
                settlement_date,
                reference,
                notes,
                created_by,
                created_at
              )
              VALUES (?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)
              RETURNING *
            `,
            [
              payable.id,
              payable.supplier_id,
              payable.booking_id,
              amount,
              mode,
              when,
              reference || null,
              notes || null,
              createdBy || null,
            ],
          );
          settlement = settlementResult.rows?.[0] || null;
        }

        await client.query("COMMIT");
        return {
          payable: payableUpdateResult.rows?.[0] || null,
          settlement,
        };
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    }

    const payable = await findPayableById(payableId);
    if (!payable) {
      const notFoundError = new Error("Supplier payable not found");
      notFoundError.code = "SUPPLIER_PAYABLE_NOT_FOUND";
      throw notFoundError;
    }
    const payableAmount = toNumber(payable.payable_amount, 0);
    const paidAmount = toNumber(payable.paid_amount, 0);
    const pendingAmount = Number((payableAmount - paidAmount).toFixed(2));

    if (amount > pendingAmount) {
      const exceedsError = new Error(
        "Settlement amount cannot exceed pending amount",
      );
      exceedsError.code = "SUPPLIER_PAYABLE_SETTLEMENT_EXCEEDS_PENDING";
      exceedsError.meta = {
        payableAmount,
        paidAmount,
        pendingAmount,
        settlementAmount: amount,
      };
      throw exceedsError;
    }

    const nextPaidAmount = Number((paidAmount + amount).toFixed(2));
    const nextStatus = derivePayableStatus(payableAmount, nextPaidAmount);

    const updatedPayable = await updatePayable(payable.id, {
      paid_amount: nextPaidAmount,
      status: nextStatus,
      payment_reference: reference || payable.payment_reference || null,
      last_paid_at: when,
    });

    const settlement = tableExists
      ? await createSettlement({
          payableId: payable.id,
          supplierId: payable.supplier_id,
          bookingId: payable.booking_id,
          settlementAmount: amount,
          paymentMode: mode,
          settlementDate: when,
          reference: reference || null,
          notes: notes || null,
          createdBy: createdBy || null,
        })
      : null;

    return { payable: updatedPayable, settlement };
  }

  async function findPayableAlertLog({ payableId, alertType, alertDate } = {}) {
    const tableExists = await hasTable(schema.payableAlertLogsTable);
    if (!tableExists || !payableId || !alertType || !alertDate) {
      return null;
    }
    return db.findOne(schema.payableAlertLogsTable, {
      payable_id: payableId,
      alert_type: alertType,
      alert_date: alertDate,
    });
  }

  async function createPayableAlertLog(payload = {}) {
    const tableExists = await hasTable(schema.payableAlertLogsTable);
    if (!tableExists) {
      return null;
    }
    const sanitized = await sanitizeForTable(schema.payableAlertLogsTable, {
      payable_id: payload.payableId,
      alert_type: payload.alertType,
      alert_date: payload.alertDate,
      triggered_at: payload.triggeredAt || new Date().toISOString(),
      metadata: payload.metadata || {},
    });
    if (!Object.keys(sanitized).length) {
      return null;
    }
    return db.insert(schema.payableAlertLogsTable, sanitized);
  }

  return Object.freeze({
    findAll,
    findById,
    create,
    update,
    findBookingById,
    findBookingsBySupplierId,
    findPayableById,
    findPayableBySupplierAndBooking,
    findPayablesBySupplierId,
    findPayableDeadlineCandidates,
    createPayable,
    updatePayable,
    createSettlement,
    findSettlementsByPayableId,
    findSettlementsBySupplierId,
    applySettlement,
    findPayableAlertLog,
    createPayableAlertLog,
  });
}

export { createSuppliersRepository };










