function createQuotationsRepository({ db, logger, schema }) {
  function toNumber(value, fallback = null) {
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

  function toQuotation(row) {
    if (!row) {
      return null;
    }

    return {
      id: row.id,
      quoteNumber: row.quote_number ?? row.quoteNumber ?? null,
      parentQuoteId: row.parent_quote_id ?? row.parentQuoteId ?? null,
      leadId: row.lead_id ?? row.leadId ?? null,
      createdBy: row.created_by ?? row.createdBy ?? null,
      pricingId: row.pricing_id ?? row.pricingId ?? null,
      templateId: row.template_id ?? row.templateId ?? null,
      templateSnapshot: row.template_snapshot ?? row.templateSnapshot ?? null,
      totalCost: toNumber(row.total_cost ?? row.totalCost, 0),
      marginPercent: toNumber(row.margin_percent ?? row.marginPercent, 0),
      marginAmount: toNumber(row.margin_amount ?? row.marginAmount, 0),
      discount: toNumber(row.discount, 0),
      discountAmount: toNumber(row.discount_amount ?? row.discountAmount, 0),
      tax: toNumber(row.tax, 0),
      taxAmount: toNumber(row.tax_amount ?? row.taxAmount, 0),
      finalPrice: toNumber(row.final_price ?? row.finalPrice, 0),
      minMarginPercent: toNumber(row.min_margin_percent ?? row.minMarginPercent, 0),
      requiresApproval: toBoolean(row.requires_approval ?? row.requiresApproval, false),
      approvedBy: row.approved_by ?? row.approvedBy ?? null,
      approvedAt: toDate(row.approved_at ?? row.approvedAt),
      approvalNote: row.approval_note ?? row.approvalNote ?? null,
      versionNumber: Number(row.version_number ?? row.versionNumber ?? 1),
      status: row.status,
      pdfUrl: row.pdf_url ?? row.pdfUrl ?? null,
      pdfGeneratedAt: toDate(row.pdf_generated_at ?? row.pdfGeneratedAt),
      pdfGeneratedBy: row.pdf_generated_by ?? row.pdfGeneratedBy ?? null,
      sentAt: toDate(row.sent_at ?? row.sentAt),
      sentBy: row.sent_by ?? row.sentBy ?? null,
      viewCount: Number(row.view_count ?? row.viewCount ?? 0),
      firstViewedAt: toDate(row.first_viewed_at ?? row.firstViewedAt),
      lastViewedAt: toDate(row.last_viewed_at ?? row.lastViewedAt),
      expiresAt: toDate(row.expires_at ?? row.expiresAt),
      lockedAt: toDate(row.locked_at ?? row.lockedAt),
      leadToQuoteMinutes: toNumber(row.lead_to_quote_minutes ?? row.leadToQuoteMinutes, null),
      isDeleted: toBoolean(row.is_deleted ?? row.isDeleted, false),
      createdAt: toDate(row.created_at ?? row.createdAt),
      updatedAt: toDate(row.updated_at ?? row.updatedAt),
    };
  }

  function toItem(row) {
    if (!row) {
      return null;
    }

    return {
      id: row.id,
      quotationId: row.quotation_id ?? row.quotationId,
      itemType: row.item_type ?? row.itemType ?? null,
      description: row.description ?? null,
      cost: toNumber(row.cost, 0),
    };
  }

  function toTemplate(row) {
    if (!row) {
      return null;
    }

    return {
      id: row.id,
      code: row.code,
      name: row.name,
      templateType: row.template_type ?? row.templateType,
      headerBranding: row.header_branding ?? row.headerBranding ?? null,
      inclusions: row.inclusions ?? null,
      exclusions: row.exclusions ?? null,
      paymentTerms: row.payment_terms ?? row.paymentTerms ?? null,
      cancellationPolicy: row.cancellation_policy ?? row.cancellationPolicy ?? null,
      footerDisclaimer: row.footer_disclaimer ?? row.footerDisclaimer ?? null,
      minMarginPercent: toNumber(row.min_margin_percent ?? row.minMarginPercent, 0),
      isActive: toBoolean(row.is_active ?? row.isActive, true),
      createdBy: row.created_by ?? row.createdBy ?? null,
      updatedBy: row.updated_by ?? row.updatedBy ?? null,
      createdAt: toDate(row.created_at ?? row.createdAt),
      updatedAt: toDate(row.updated_at ?? row.updatedAt),
    };
  }

  function toVersionLog(row) {
    if (!row) {
      return null;
    }

    return {
      id: row.id,
      quotationId: row.quotation_id ?? row.quotationId,
      versionNumber: Number(row.version_number ?? row.versionNumber ?? 1),
      editorId: row.editor_id ?? row.editorId ?? null,
      action: row.action ?? null,
      changeLog: row.change_log ?? row.changeLog ?? null,
      snapshot: row.snapshot ?? null,
      createdAt: toDate(row.created_at ?? row.createdAt),
    };
  }

  function toSendLog(row) {
    if (!row) {
      return null;
    }

    return {
      id: row.id,
      quotationId: row.quotation_id ?? row.quotationId,
      sentBy: row.sent_by ?? row.sentBy ?? null,
      deliveryChannel: row.delivery_channel ?? row.deliveryChannel ?? null,
      recipientEmail: row.recipient_email ?? row.recipientEmail ?? null,
      recipientPhone: row.recipient_phone ?? row.recipientPhone ?? null,
      sentAt: toDate(row.sent_at ?? row.sentAt),
      metadata: row.metadata ?? null,
    };
  }

  function toView(row) {
    if (!row) {
      return null;
    }

    return {
      id: row.id,
      quotationId: row.quotation_id ?? row.quotationId,
      viewedAt: toDate(row.viewed_at ?? row.viewedAt),
      ipAddress: row.ip_address ?? row.ipAddress ?? null,
      deviceInfo: row.device_info ?? row.deviceInfo ?? null,
      userAgent: row.user_agent ?? row.userAgent ?? null,
    };
  }

  async function findItemsByQuotationId(quotationId) {
    const rows = await db.findMany(schema.itemsTable, { quotation_id: quotationId });
    return rows.map((row) => toItem(row));
  }

  async function findViewsByQuotationId(quotationId, pagination = {}) {
    const filters = {
      quotation_id: quotationId,
    };

    if (pagination.page) {
      filters.page = pagination.page;
    }

    if (pagination.limit) {
      filters.limit = pagination.limit;
    }

    const rows = await db.findMany(schema.viewsTable, filters);
    const list = rows.map((row) => toView(row));

    return list.sort((a, b) => {
      const left = new Date(a.viewedAt || 0).getTime();
      const right = new Date(b.viewedAt || 0).getTime();
      return right - left;
    });
  }

  async function findVersionLogsByQuotationId(quotationId) {
    const rows = await db.findMany(schema.versionLogsTable, { quotation_id: quotationId });
    const logs = rows.map((row) => toVersionLog(row));

    return logs.sort((a, b) => {
      if (b.versionNumber !== a.versionNumber) {
        return b.versionNumber - a.versionNumber;
      }

      const left = new Date(a.createdAt || 0).getTime();
      const right = new Date(b.createdAt || 0).getTime();
      return right - left;
    });
  }

  async function findSendLogsByQuotationId(quotationId) {
    const rows = await db.findMany(schema.sendLogsTable, { quotation_id: quotationId });
    const list = rows.map((row) => toSendLog(row));

    return list.sort((a, b) => {
      const left = new Date(a.sentAt || 0).getTime();
      const right = new Date(b.sentAt || 0).getTime();
      return right - left;
    });
  }

  return Object.freeze({
    async findAll(filters = {}) {
      const mappedFilters = {};

      if (filters.status) {
        mappedFilters.status = filters.status;
      }

      if (filters.leadId) {
        mappedFilters.lead_id = filters.leadId;
      }

      if (filters.createdBy) {
        mappedFilters.created_by = filters.createdBy;
      }

      if (filters.page) {
        mappedFilters.page = filters.page;
      }

      if (filters.limit) {
        mappedFilters.limit = filters.limit;
      }

      const rows = await db.findMany(schema.tableName, mappedFilters);
      const list = rows.map((row) => toQuotation(row));

      return list.sort((a, b) => {
        const left = new Date(a.createdAt || 0).getTime();
        const right = new Date(b.createdAt || 0).getTime();
        return right - left;
      });
    },

    async findById(id) {
      const row = await db.findById(schema.tableName, id);
      return toQuotation(row);
    },

    findItemsByQuotationId,
    findViewsByQuotationId,
    findVersionLogsByQuotationId,
    findSendLogsByQuotationId,

    async create(payload) {
      logger.debug({ module: 'quotations', payload }, 'Creating quotation');
      const row = await db.insert(schema.tableName, payload);
      return toQuotation(row);
    },

    async update(id, payload) {
      logger.debug({ module: 'quotations', id, payload }, 'Updating quotation');
      const row = await db.update(schema.tableName, id, payload);
      return toQuotation(row);
    },

    async replaceItems(quotationId, components = []) {
      await db.query(`DELETE FROM ${schema.itemsTable} WHERE quotation_id = $1`, [quotationId]);

      for (const item of components) {
        await db.insert(schema.itemsTable, {
          quotation_id: quotationId,
          item_type: item.itemType,
          description: item.description,
          cost: item.cost,
        });
      }

      return findItemsByQuotationId(quotationId);
    },

    async createVersionLog(payload) {
      const row = await db.insert(schema.versionLogsTable, {
        quotation_id: payload.quotationId,
        version_number: payload.versionNumber,
        editor_id: payload.editorId || null,
        action: payload.action,
        change_log: payload.changeLog || null,
        snapshot: payload.snapshot || null,
      });

      return toVersionLog(row);
    },

    async createSendLog(payload) {
      const row = await db.insert(schema.sendLogsTable, {
        quotation_id: payload.quotationId,
        sent_by: payload.sentBy || null,
        delivery_channel: payload.deliveryChannel || 'MANUAL',
        recipient_email: payload.recipientEmail || null,
        recipient_phone: payload.recipientPhone || null,
        metadata: payload.metadata || null,
      });

      return toSendLog(row);
    },

    async createView(payload) {
      const row = await db.insert(schema.viewsTable, {
        quotation_id: payload.quotationId,
        ip_address: payload.ipAddress || null,
        device_info: payload.deviceInfo || null,
        user_agent: payload.userAgent || null,
      });

      return toView(row);
    },

    async findLeadById(id) {
      return db.findById(schema.leadsTable, id);
    },

    async updateLeadStatus(leadId, status) {
      return db.update(schema.leadsTable, leadId, { status });
    },

    async findTemplateById(id) {
      const row = await db.findById(schema.templatesTable, id);
      return toTemplate(row);
    },

    async findTemplateByCode(code) {
      const row = await db.findOne(schema.templatesTable, { code });
      return toTemplate(row);
    },

    async findTemplates(filters = {}) {
      const mappedFilters = {};

      if (filters.isActive !== undefined) {
        mappedFilters.is_active = filters.isActive;
      }

      if (filters.templateType) {
        mappedFilters.template_type = filters.templateType;
      }

      if (filters.page) {
        mappedFilters.page = filters.page;
      }

      if (filters.limit) {
        mappedFilters.limit = filters.limit;
      }

      const rows = await db.findMany(schema.templatesTable, mappedFilters);
      return rows.map((row) => toTemplate(row));
    },

    async createTemplate(payload) {
      const row = await db.insert(schema.templatesTable, payload);
      return toTemplate(row);
    },

    async updateTemplate(id, payload) {
      const row = await db.update(schema.templatesTable, id, payload);
      return toTemplate(row);
    },

    async findBookingByQuotationId(quotationId) {
      return db.findOne(schema.bookingsTable, { quotation_id: quotationId });
    },

    async createBooking(payload) {
      return db.insert(schema.bookingsTable, payload);
    },

    async findReminderLogByType(quotationId, reminderType) {
      return db.findOne(schema.reminderLogsTable, {
        quotation_id: quotationId,
        reminder_type: reminderType,
      });
    },

    async createReminderLog(payload) {
      return db.insert(schema.reminderLogsTable, {
        quotation_id: payload.quotationId,
        reminder_type: payload.reminderType,
        triggered_by: payload.triggeredBy || null,
        metadata: payload.metadata || null,
      });
    },

    async findReminderCandidates({ notOpenedHours = 24, viewedNoActionHours = 48 } = {}) {
      const sql = `
        SELECT q.id AS quotation_id, 'NOT_OPENED_24H'::text AS reminder_type
        FROM quotations q
        WHERE q.status = 'SENT'
          AND q.sent_at IS NOT NULL
          AND q.sent_at <= NOW() - ($1 * INTERVAL '1 hour')
          AND COALESCE(q.view_count, 0) = 0
          AND COALESCE(q.is_deleted, FALSE) = FALSE

        UNION ALL

        SELECT q.id AS quotation_id, 'VIEWED_NO_ACTION_48H'::text AS reminder_type
        FROM quotations q
        WHERE q.status = 'VIEWED'
          AND q.last_viewed_at IS NOT NULL
          AND q.last_viewed_at <= NOW() - ($2 * INTERVAL '1 hour')
          AND COALESCE(q.is_deleted, FALSE) = FALSE
      `;

      const result = await db.query(sql, [notOpenedHours, viewedNoActionHours]);
      return result.rows.map((row) => ({
        quotationId: row.quotation_id,
        reminderType: row.reminder_type,
      }));
    },

    async getLeadToQuoteReport(filters = {}) {
      const where = ['COALESCE(q.is_deleted, FALSE) = FALSE'];
      const params = [];

      if (filters.from) {
        params.push(filters.from);
        where.push(`q.created_at >= $${params.length}`);
      }

      if (filters.to) {
        params.push(filters.to);
        where.push(`q.created_at <= $${params.length}`);
      }

      if (filters.createdBy) {
        params.push(filters.createdBy);
        where.push(`q.created_by = $${params.length}`);
      }

      const whereSql = where.join(' AND ');

      const consultantSql = `
        SELECT
          q.created_by,
          u.full_name AS consultant_name,
          COUNT(*)::int AS total_quotes,
          SUM(CASE WHEN q.status = 'APPROVED' THEN 1 ELSE 0 END)::int AS approved_quotes,
          SUM(CASE WHEN q.status = 'REJECTED' THEN 1 ELSE 0 END)::int AS rejected_quotes,
          AVG(q.lead_to_quote_minutes)::numeric(10,2) AS avg_lead_to_quote_minutes,
          AVG(q.final_price)::numeric(12,2) AS avg_quote_value,
          AVG(q.margin_percent)::numeric(8,2) AS avg_margin_percent
        FROM quotations q
        LEFT JOIN users u ON u.id = q.created_by
        WHERE ${whereSql}
        GROUP BY q.created_by, u.full_name
        ORDER BY total_quotes DESC
      `;

      const overallSql = `
        SELECT
          COUNT(*)::int AS total_quotes,
          SUM(CASE WHEN q.status = 'APPROVED' THEN 1 ELSE 0 END)::int AS approved_quotes,
          SUM(CASE WHEN q.status = 'REJECTED' THEN 1 ELSE 0 END)::int AS rejected_quotes,
          AVG(q.lead_to_quote_minutes)::numeric(10,2) AS avg_lead_to_quote_minutes,
          AVG(q.final_price)::numeric(12,2) AS avg_quote_value,
          AVG(q.margin_percent)::numeric(8,2) AS avg_margin_percent
        FROM quotations q
        WHERE ${whereSql}
      `;

      const [consultantResult, overallResult] = await Promise.all([
        db.query(consultantSql, params),
        db.query(overallSql, params),
      ]);

      const byConsultant = consultantResult.rows.map((row) => {
        const total = Number(row.total_quotes || 0);
        const approved = Number(row.approved_quotes || 0);
        const rejected = Number(row.rejected_quotes || 0);
        const approvalRatePercent = total > 0 ? Number(((approved / total) * 100).toFixed(2)) : 0;

        return {
          createdBy: row.created_by,
          consultantName: row.consultant_name || null,
          totalQuotes: total,
          approvedQuotes: approved,
          rejectedQuotes: rejected,
          approvalRatePercent,
          avgLeadToQuoteMinutes: toNumber(row.avg_lead_to_quote_minutes, 0),
          avgQuoteValue: toNumber(row.avg_quote_value, 0),
          avgMarginPercent: toNumber(row.avg_margin_percent, 0),
        };
      });

      const overallRow = overallResult.rows[0] || {};
      const overallTotal = Number(overallRow.total_quotes || 0);
      const overallApproved = Number(overallRow.approved_quotes || 0);

      return {
        overall: {
          totalQuotes: overallTotal,
          approvedQuotes: overallApproved,
          rejectedQuotes: Number(overallRow.rejected_quotes || 0),
          approvalRatePercent: overallTotal > 0 ? Number(((overallApproved / overallTotal) * 100).toFixed(2)) : 0,
          avgLeadToQuoteMinutes: toNumber(overallRow.avg_lead_to_quote_minutes, 0),
          avgQuoteValue: toNumber(overallRow.avg_quote_value, 0),
          avgMarginPercent: toNumber(overallRow.avg_margin_percent, 0),
        },
        byConsultant,
      };
    },
  });
}

module.exports = { createQuotationsRepository };
