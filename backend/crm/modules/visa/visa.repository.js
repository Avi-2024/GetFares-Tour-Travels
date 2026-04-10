function createVisaRepository({ db, logger, schema }) {
  const tableCache = new Map();
  const columnsCache = new Map();

  function canIntrospect() {
    return typeof db.query === "function" && Boolean(db.pool);
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

  function toNumber(value, fallback = 0) {
    if (value === null || value === undefined) {
      return fallback;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
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
    if (!canIntrospect()) {
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
    if (!canIntrospect()) {
      return null;
    }

    if (columnsCache.has(tableName)) {
      return columnsCache.get(tableName);
    }

    const tableExists = await hasTable(tableName);
    if (!tableExists) {
      const empty = new Set();
      columnsCache.set(tableName, empty);
      return empty;
    }

    const result = await db.query(
      `SELECT column_name FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name=?`,
      [tableName],
    );
    const columns = new Set(result.rows.map((row) => row.column_name));
    columnsCache.set(tableName, columns);
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

  function toVisaCase(row) {
    if (!row) {
      return null;
    }

    return {
      id: row.id,
      bookingId: row.booking_id ?? row.bookingId ?? null,
      supplierId: row.supplier_id ?? row.supplierId ?? null,
      country: row.country ?? null,
      visaType: row.visa_type ?? row.visaType ?? null,
      visaNumber: row.visa_number ?? row.visaNumber ?? null,
      fees: toNumber(row.fees, 0),
      appointmentDate: row.appointment_date ?? row.appointmentDate ?? null,
      submissionDate: row.submission_date ?? row.submissionDate ?? null,
      status: row.status ?? "DOCUMENT_PENDING",
      workflowStage:
        row.workflow_stage ?? row.workflowStage ?? "DOCUMENT_COLLECTION",
      rejectionReason: row.rejection_reason ?? row.rejectionReason ?? null,
      visaValidUntil: row.visa_valid_until ?? row.visaValidUntil ?? null,
      deliveredAt: row.delivered_at ?? row.deliveredAt ?? null,
      createdAt: toDate(row.created_at ?? row.createdAt),
      updatedAt: toDate(row.updated_at ?? row.updatedAt),
    };
  }

  function toVisaDocument(row) {
    if (!row) {
      return null;
    }

    return {
      id: row.id,
      visaCaseId: row.visa_case_id ?? row.visaCaseId,
      documentType: row.document_type ?? row.documentType ?? null,
      fileUrl: row.file_url ?? row.fileUrl ?? null,
      isVerified: toBoolean(row.is_verified ?? row.isVerified, false),
      uploadedAt: toDate(row.uploaded_at ?? row.uploadedAt),
    };
  }

  function toChecklist(row) {
    if (!row) {
      return null;
    }

    return {
      id: row.id,
      bookingId: row.booking_id ?? row.bookingId ?? null,
      passportVerified: toBoolean(
        row.passport_verified ?? row.passportVerified,
        false,
      ),
      visaVerified: toBoolean(row.visa_verified ?? row.visaVerified, false),
      insuranceVerified: toBoolean(
        row.insurance_verified ?? row.insuranceVerified,
        false,
      ),
      ticketVerified: toBoolean(
        row.ticket_verified ?? row.ticketVerified,
        false,
      ),
      hotelVerified: toBoolean(row.hotel_verified ?? row.hotelVerified, false),
      transferVerified: toBoolean(
        row.transfer_verified ?? row.transferVerified,
        false,
      ),
      tourVerified: toBoolean(row.tour_verified ?? row.tourVerified, false),
      finalItineraryUploaded: toBoolean(
        row.final_itinerary_uploaded ?? row.finalItineraryUploaded,
        false,
      ),
      travelReady: toBoolean(row.travel_ready ?? row.travelReady, false),
      verifiedBy: row.verified_by ?? row.verifiedBy ?? null,
      verifiedAt: toDate(row.verified_at ?? row.verifiedAt),
      completedAt: toDate(row.completed_at ?? row.completedAt),
    };
  }

  function mapListFilters(filters = {}) {
    const mapped = {};
    if (filters.status) {
      mapped.status = filters.status;
    }
    if (filters.workflowStage) {
      mapped.workflow_stage = filters.workflowStage;
    }
    if (filters.country) {
      mapped.country = filters.country;
    }
    if (filters.bookingId) {
      mapped.booking_id = filters.bookingId;
    }
    if (filters.supplierId) {
      mapped.supplier_id = filters.supplierId;
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
        .map((row) => toVisaCase(row))
        .sort((a, b) => {
          const left = new Date(a.createdAt || 0).getTime();
          const right = new Date(b.createdAt || 0).getTime();
          return right - left;
        });
    },

    async findById(id) {
      const row = await db.findById(schema.tableName, id);
      return toVisaCase(row);
    },

    async create(payload) {
      logger.debug({ module: "visa", payload }, "Creating visa case");
      const sanitized = await sanitizeForTable(schema.tableName, payload);
      const row = await db.insert(schema.tableName, sanitized);
      return toVisaCase(row);
    },

    async update(id, payload) {
      logger.debug({ module: "visa", id, payload }, "Updating visa case");
      const sanitized = await sanitizeForTable(schema.tableName, payload);
      const row = await db.update(schema.tableName, id, sanitized);
      return toVisaCase(row);
    },

    async findBookingById(id) {
      const row = await db.findById(schema.bookingsTable, id);
      if (!row) {
        return null;
      }
      return {
        id: row.id,
        status: row.status ?? "PENDING",
        bookingNumber: row.booking_number ?? row.bookingNumber ?? null,
      };
    },

    async findSupplierById(id) {
      const row = await db.findById(schema.suppliersTable, id);
      if (!row) {
        return null;
      }
      return {
        id: row.id,
        name: row.name ?? null,
        isActive: row.is_active ?? row.isActive ?? true,
      };
    },

    async createDocument(payload) {
      const sanitized = await sanitizeForTable(schema.documentsTable, {
        visa_case_id: payload.visaCaseId,
        document_type: payload.documentType,
        file_url: payload.fileUrl,
        is_verified: payload.isVerified ?? false,
        uploaded_at: payload.uploadedAt || new Date().toISOString(),
      });
      const row = await db.insert(schema.documentsTable, sanitized);
      return toVisaDocument(row);
    },

    async listDocuments(visaCaseId, filters = {}) {
      const mapped = { visa_case_id: visaCaseId };
      if (filters.page) {
        mapped.page = filters.page;
      }
      if (filters.limit) {
        mapped.limit = filters.limit;
      }
      const rows = await db.findMany(schema.documentsTable, mapped);
      let list = rows.map((row) => toVisaDocument(row));
      if (filters.isVerified !== undefined) {
        list = list.filter((item) => item.isVerified === filters.isVerified);
      }
      return list.sort((a, b) => {
        const left = new Date(a.uploadedAt || 0).getTime();
        const right = new Date(b.uploadedAt || 0).getTime();
        return right - left;
      });
    },

    async findDocumentById(id) {
      const row = await db.findById(schema.documentsTable, id);
      return toVisaDocument(row);
    },

    async updateDocument(id, payload) {
      const sanitized = await sanitizeForTable(schema.documentsTable, payload);
      const row = await db.update(schema.documentsTable, id, sanitized);
      return toVisaDocument(row);
    },

    async getChecklistByBookingId(bookingId) {
      const row = await db.findOne(schema.checklistTable, {
        booking_id: bookingId,
      });
      return toChecklist(row);
    },

    async upsertChecklist(bookingId, payload = {}) {
      const existing = await db.findOne(schema.checklistTable, {
        booking_id: bookingId,
      });

      if (!existing) {
        const sanitized = await sanitizeForTable(schema.checklistTable, {
          booking_id: bookingId,
          ...payload,
        });
        const row = await db.insert(schema.checklistTable, sanitized);
        return toChecklist(row);
      }

      const sanitized = await sanitizeForTable(schema.checklistTable, payload);
      const row = await db.update(
        schema.checklistTable,
        existing.id,
        sanitized,
      );
      return toChecklist(row);
    },

    async getSummaryReport(filters = {}) {
      if (!canIntrospect()) {
        const all = await db.findMany(schema.tableName, {});
        const summary = {
          totalCases: all.length,
          byStatus: {
            DOCUMENT_PENDING: 0,
            SUBMITTED: 0,
            APPROVED: 0,
            REJECTED: 0,
          },
          byStage: {
            DOCUMENT_COLLECTION: 0,
            APPLICATION_SUBMITTED: 0,
            BIOMETRICS_SCHEDULED: 0,
            UNDER_PROCESS: 0,
            APPROVED: 0,
            REJECTED: 0,
            DELIVERED: 0,
          },
          approvalRatePercent: 0,
          rejectionRatePercent: 0,
          averageProcessingDays: 0,
          pendingDocumentCount: 0,
          expiringSoonCount: 0,
        };

        for (const row of all) {
          const status = row.status || "DOCUMENT_PENDING";
          const workflowStage =
            row.workflow_stage || row.workflowStage || "DOCUMENT_COLLECTION";
          summary.byStatus[status] = (summary.byStatus[status] || 0) + 1;
          summary.byStage[workflowStage] =
            (summary.byStage[workflowStage] || 0) + 1;

          if (row.visa_valid_until) {
            const daysToExpiry = Math.ceil(
              (new Date(row.visa_valid_until).getTime() - Date.now()) /
                (1000 * 60 * 60 * 24),
            );
            if (daysToExpiry >= 0 && daysToExpiry <= 14) {
              summary.expiringSoonCount += 1;
            }
          }
        }

        if (summary.totalCases > 0) {
          summary.approvalRatePercent = Number(
            ((summary.byStatus.APPROVED / summary.totalCases) * 100).toFixed(2),
          );
          summary.rejectionRatePercent = Number(
            ((summary.byStatus.REJECTED / summary.totalCases) * 100).toFixed(2),
          );
        }

        return summary;
      }

      const where = [];
      const params = [];

      if (filters.from) {
        params.push(filters.from);
        where.push(`vc.created_at >= $${params.length}`);
      }
      if (filters.to) {
        params.push(filters.to);
        where.push(`vc.created_at <= $${params.length}`);
      }

      const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

      const summarySql = `
        SELECT
          COUNT(*) AS total_cases,
          SUM(CASE WHEN vc.status = 'DOCUMENT_PENDING' THEN 1 ELSE 0 END) AS document_pending,
          SUM(CASE WHEN vc.status = 'SUBMITTED' THEN 1 ELSE 0 END) AS submitted,
          SUM(CASE WHEN vc.status = 'APPROVED' THEN 1 ELSE 0 END) AS approved,
          SUM(CASE WHEN vc.status = 'REJECTED' THEN 1 ELSE 0 END) AS rejected,
          SUM(CASE WHEN COALESCE(vc.workflow_stage, 'DOCUMENT_COLLECTION') = 'DOCUMENT_COLLECTION' THEN 1 ELSE 0 END) AS document_collection,
          SUM(CASE WHEN COALESCE(vc.workflow_stage, 'DOCUMENT_COLLECTION') = 'APPLICATION_SUBMITTED' THEN 1 ELSE 0 END) AS application_submitted,
          SUM(CASE WHEN COALESCE(vc.workflow_stage, 'DOCUMENT_COLLECTION') = 'BIOMETRICS_SCHEDULED' THEN 1 ELSE 0 END) AS biometrics_scheduled,
          SUM(CASE WHEN COALESCE(vc.workflow_stage, 'DOCUMENT_COLLECTION') = 'UNDER_PROCESS' THEN 1 ELSE 0 END) AS under_process,
          SUM(CASE WHEN COALESCE(vc.workflow_stage, 'DOCUMENT_COLLECTION') = 'DELIVERED' THEN 1 ELSE 0 END) AS delivered,
          SUM(CASE WHEN vc.visa_valid_until IS NOT NULL AND vc.visa_valid_until BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '14 days' THEN 1 ELSE 0 END) AS expiring_soon_count,
          AVG(
            CASE
              WHEN vc.submission_date IS NOT NULL AND vc.visa_valid_until IS NOT NULL
              THEN (vc.visa_valid_until - vc.submission_date)
              ELSE NULL
            END
          )::numeric(10,2) AS avg_processing_days
        FROM ${schema.tableName} vc
        ${whereSql}
      `;

      const pendingDocsSql = `
        SELECT COUNT(*) AS pending_document_count
        FROM ${schema.documentsTable} vd
        INNER JOIN ${schema.tableName} vc ON vc.id = vd.visa_case_id
        ${whereSql ? `${whereSql} AND` : "WHERE"} COALESCE(vd.is_verified, FALSE) = FALSE
      `;

      const [summaryResult, pendingDocsResult] = await Promise.all([
        db.query(summarySql, params),
        db.query(pendingDocsSql, params),
      ]);

      const row = summaryResult.rows[0] || {};
      const totalCases = toNumber(row.total_cases, 0);
      const approved = toNumber(row.approved, 0);
      const rejected = toNumber(row.rejected, 0);

      return {
        totalCases,
        byStatus: {
          DOCUMENT_PENDING: toNumber(row.document_pending, 0),
          SUBMITTED: toNumber(row.submitted, 0),
          APPROVED: approved,
          REJECTED: rejected,
        },
        byStage: {
          DOCUMENT_COLLECTION: toNumber(row.document_collection, 0),
          APPLICATION_SUBMITTED: toNumber(row.application_submitted, 0),
          BIOMETRICS_SCHEDULED: toNumber(row.biometrics_scheduled, 0),
          UNDER_PROCESS: toNumber(row.under_process, 0),
          APPROVED: approved,
          REJECTED: rejected,
          DELIVERED: toNumber(row.delivered, 0),
        },
        approvalRatePercent:
          totalCases > 0
            ? Number(((approved / totalCases) * 100).toFixed(2))
            : 0,
        rejectionRatePercent:
          totalCases > 0
            ? Number(((rejected / totalCases) * 100).toFixed(2))
            : 0,
        averageProcessingDays: toNumber(row.avg_processing_days, 0),
        pendingDocumentCount: toNumber(
          pendingDocsResult.rows[0]?.pending_document_count,
          0,
        ),
        expiringSoonCount: toNumber(row.expiring_soon_count, 0),
      };
    },
  });
}

export { createVisaRepository };

