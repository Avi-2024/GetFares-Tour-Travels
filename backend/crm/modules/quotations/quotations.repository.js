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

    if (typeof Buffer !== "undefined" && Buffer.isBuffer?.(value)) {
      if (value.length === 0) {
        return fallback;
      }
      return value[0] === 1;
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

  function toJson(value, fallback = null) {
    if (value === null || value === undefined) {
      return fallback;
    }

    if (typeof value === "object") {
      return value;
    }

    if (typeof value === "string") {
      try {
        return JSON.parse(value);
      } catch (_error) {
        return fallback;
      }
    }

    return fallback;
  }

  function toJsonString(value, fallback = null) {
    if (value === null || value === undefined) {
      return fallback;
    }

    return typeof value === "string" ? value : JSON.stringify(value);
  }

  function canUseRawQuery() {
    return (
      typeof db.query === "function" &&
      (db.adapter === "mysql" || db.adapter === "mssql")
    );
  }

  function toQuotation(row) {
    if (!row) {
      return null;
    }

    return {
      id: row.id,
      parentQuoteId: row.parent_quote_id ?? row.parentQuoteId ?? null,
      leadId: row.lead_id ?? row.leadId ?? null,
      createdBy: row.created_by ?? row.createdBy ?? null,
      pricingId: row.pricing_id ?? row.pricingId ?? null,
      templateId: row.template_id ?? row.templateId ?? null,
      templateSnapshot: toJson(
        row.template_snapshot ?? row.templateSnapshot,
        null,
      ),
      sourcePackageId:
        row.source_package_id ?? row.sourcePackageId ?? null,
      quotationTitle:
        row.quotation_title ?? row.quotationTitle ?? null,
      tripDestination:
        row.trip_destination ?? row.tripDestination ?? null,
      durationNights: toNumber(
        row.duration_nights ?? row.durationNights,
        null,
      ),
      durationDays: toNumber(
        row.duration_days ?? row.durationDays,
        null,
      ),
      durationLabel:
        row.duration_label ?? row.durationLabel ?? null,
      travelStartDate: toDate(
        row.travel_start_date ?? row.travelStartDate,
      ),
      itinerary: toJson(row.itinerary, null),
      inclusions: row.inclusions ?? null,
      exclusions: row.exclusions ?? null,
      hotelDetails:
        row.hotel_details ?? row.hotelDetails ?? null,
      visaDetails:
        row.visa_details ?? row.visaDetails ?? null,
      paymentTerms:
        row.payment_terms ?? row.paymentTerms ?? null,
      cancellationPolicy:
        row.cancellation_policy ?? row.cancellationPolicy ?? null,
      leadCountry: row.lead_country ?? row.leadCountry ?? null,
      addressLine: row.address_line ?? row.addressLine ?? null,
      budget: toNumber(row.budget, null),
      travelPurpose: row.travel_purpose ?? row.travelPurpose ?? null,
      leadSource: row.lead_source ?? row.leadSource ?? null,
      quoteNumber: row.quote_number ?? row.quoteNumber ?? null,
      totalCost: toNumber(row.total_cost ?? row.totalCost, 0),
      marginPercent: toNumber(row.margin_percent ?? row.marginPercent, 0),
      discount: toNumber(row.discount, 0),
      tax: toNumber(row.tax, 0),
      finalPrice: toNumber(row.final_price ?? row.finalPrice, 0),
      supplierCost: toNumber(row.supplier_cost ?? row.supplierCost, 0),
      supplierTaxAmount: toNumber(
        row.supplier_tax_amount ?? row.supplierTaxAmount,
        0,
      ),
      markupAmount: toNumber(row.markup_amount ?? row.markupAmount, 0),
      serviceFeeAmount: toNumber(
        row.service_fee_amount ?? row.serviceFeeAmount,
        0,
      ),
      gstAmount: toNumber(row.gst_amount ?? row.gstAmount, 0),
      tcsAmount: toNumber(row.tcs_amount ?? row.tcsAmount, 0),
      totalSaleValue: toNumber(row.total_sale_value ?? row.totalSaleValue, 0),
      costCurrency: row.cost_currency ?? row.costCurrency ?? "INR",
      clientCurrency: row.client_currency ?? row.clientCurrency ?? "INR",
      supplierCurrency: row.supplier_currency ?? row.supplierCurrency ?? "INR",
      minMarginPercent: toNumber(
        row.min_margin_percent ?? row.minMarginPercent,
        0,
      ),
      requiresApproval: toBoolean(
        row.requires_approval ?? row.requiresApproval,
        false,
      ),
      approvedBy: row.approved_by ?? row.approvedBy ?? null,
      approvedAt: toDate(row.approved_at ?? row.approvedAt),
      approvalNote: row.approval_note ?? row.approvalNote ?? null,
      importantNotes: row.important_notes ?? row.importantNotes ?? null,
      versionNumber: Number(row.version_number ?? row.versionNumber ?? 1),
      status:
        row.status === null || row.status === undefined ?
          null
        : String(row.status).trim(),
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
      leadToQuoteMinutes: toNumber(
        row.lead_to_quote_minutes ?? row.leadToQuoteMinutes,
        null,
      ),
      leadToQuoteSentMinutes: toNumber(
        row.lead_to_quote_sent_minutes ?? row.leadToQuoteSentMinutes,
        null,
      ),
      responseCategory: row.response_category ?? row.responseCategory ?? null,
      responseSlaMinutes: toNumber(
        row.response_sla_minutes ?? row.responseSlaMinutes,
        null,
      ),
      responseSlaBreached: toBoolean(
        row.response_sla_breached ?? row.responseSlaBreached,
        false,
      ),
      isDeleted: Boolean(row.is_deleted ?? row.isDeleted ?? false),
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

  function toView(row) {
    if (!row) {
      return null;
    }

    return {
      id: row.id,
      quotationId: row.quotation_id ?? row.quotationId,
      viewedAt: toDate(row.viewed_at ?? row.viewedAt),
      ipAddress: row.ip_address ?? row.ipAddress ?? null,
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
      cancellationPolicy:
        row.cancellation_policy ?? row.cancellationPolicy ?? null,
      footerDisclaimer: row.footer_disclaimer ?? row.footerDisclaimer ?? null,
      minMarginPercent: toNumber(
        row.min_margin_percent ?? row.minMarginPercent,
        0,
      ),
      isActive: toBoolean(row.is_active ?? row.isActive, true),
      createdBy: row.created_by ?? row.createdBy ?? null,
      updatedBy: row.updated_by ?? row.updatedBy ?? null,
      createdAt: toDate(row.created_at ?? row.createdAt),
      updatedAt: toDate(row.updated_at ?? row.updatedAt),
    };
  }

  function toUser(row) {
    if (!row) {
      return null;
    }

    return {
      id: row.id,
      fullName: row.full_name ?? row.fullName ?? null,
      email: row.email ?? null,
      phone: row.phone ?? null,
      roleId: row.role_id ?? row.roleId ?? null,
      isActive: toBoolean(row.is_active ?? row.isActive, true),
      isOnLeave: toBoolean(row.is_on_leave ?? row.isOnLeave, false),
    };
  }

  async function findUsersByIds(userIds = []) {
    const ids = [...new Set(userIds.filter(Boolean))];
    if (!ids.length) {
      return new Map();
    }

    const rows = await Promise.all(ids.map((id) => db.findById(schema.usersTable, id)));
    const userMap = new Map();

    rows.filter(Boolean).forEach((row) => {
      userMap.set(row.id, toUser(row));
    });

    return userMap;
  }

  function toLead(row) {
    if (!row) {
      return null;
    }

    return {
      id: row.id,
      leadCode: row.lead_code ?? row.leadCode ?? null,
      leadId:
        row.lead_code ??
        row.leadCode ??
        row.meta_lead_id ??
        row.metaLeadId ??
        null,
      metaLeadId: row.meta_lead_id ?? row.metaLeadId ?? null,
      fullName: row.full_name ?? row.fullName ?? null,
      phone: row.phone ?? null,
      email: row.email ?? null,
      destinationId: row.destination_id ?? row.destinationId ?? null,
      nationality: row.nationality ?? null,
      travelDate: row.travel_date ?? row.travelDate ?? null,
      adultsCount: Number(row.adults_count ?? row.adultsCount ?? 1),
      childrenCount: Number(row.children_count ?? row.childrenCount ?? 0),
      leadType: row.lead_type ?? row.leadType ?? "HOLIDAY",
      source: row.source ?? null,
      status: row.status ?? null,
      assignedTo: row.assigned_to ?? row.assignedTo ?? null,
      createdAt: toDate(row.created_at ?? row.createdAt),
      // Additional fields needed for quotation prefilling
      leadCountry: row.lead_country ?? row.leadCountry ?? row.country ?? null,
      addressLine: row.address_line ?? row.addressLine ?? null,
      budget: row.budget ?? null,
      travelPurpose: row.travel_purpose ?? row.travelPurpose ?? null,
      source: row.source ?? null,
    };
  }

  function toDestination(row) {
    if (!row) {
      return null;
    }

    return {
      id: row.id,
      name: row.name ?? null,
      country: row.country ?? null,
      isActive: toBoolean(row.is_active ?? row.isActive, true),
      createdAt: toDate(row.created_at ?? row.createdAt),
    };
  }

  async function findLeadsByIds(leadIds = []) {
    const ids = [...new Set(leadIds.filter(Boolean))];
    if (!ids.length) {
      return new Map();
    }

    const rows = await Promise.all(ids.map((id) => db.findById(schema.leadsTable, id)));
    const leadMap = new Map();

    rows.filter(Boolean).forEach((row) => {
      leadMap.set(row.id, toLead(row));
    });

    return leadMap;
  }

  async function findDestinationsByIds(destinationIds = []) {
    const ids = [...new Set(destinationIds.filter(Boolean))];
    if (!ids.length || !schema.destinationsTable) {
      return new Map();
    }

    const rows = await Promise.all(
      ids.map((id) => db.findById(schema.destinationsTable, id)),
    );
    const destinationMap = new Map();

    rows.filter(Boolean).forEach((row) => {
      destinationMap.set(row.id, toDestination(row));
    });

    return destinationMap;
  }

  function toPricing(row) {
    if (!row) {
      return null;
    }

    return {
      id: row.id,
      destinationId: row.destination_id ?? row.destinationId ?? null,
      baseCost: toNumber(row.base_cost ?? row.baseCost, 0),
      minProfitPercent: toNumber(
        row.min_profit_percent ?? row.minProfitPercent,
        0,
      ),
      recommendedProfitPercent: toNumber(
        row.recommended_profit_percent ?? row.recommendedProfitPercent,
        null,
      ),
      taxPercent: toNumber(row.tax_percent ?? row.taxPercent, 0),
      validFrom: row.valid_from ?? row.validFrom ?? null,
      validTo: row.valid_to ?? row.validTo ?? null,
      createdBy: row.created_by ?? row.createdBy ?? null,
      createdAt: toDate(row.created_at ?? row.createdAt),
    };
  }

  function toQuotationSummary(row) {
    if (!row) {
      return null;
    }

    return {
      id: row.id,
      quoteNumber: row.quote_number ?? row.quoteNumber ?? null,
      status: row.status ?? null,
      finalPrice: toNumber(row.final_price ?? row.finalPrice, 0),
      createdAt: toDate(row.created_at ?? row.createdAt),
    };
  }

  function toBookingSummary(row) {
    if (!row) {
      return null;
    }

    return {
      id: row.id,
      bookingNumber: row.booking_number ?? row.bookingNumber ?? null,
      status: row.status ?? null,
      paymentStatus: row.payment_status ?? row.paymentStatus ?? null,
      totalAmount: toNumber(row.total_amount ?? row.totalAmount, 0),
      travelStartDate: row.travel_start_date ?? row.travelStartDate ?? null,
      travelEndDate: row.travel_end_date ?? row.travelEndDate ?? null,
      createdAt: toDate(row.created_at ?? row.createdAt),
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
      action: row.action,
      changeLog: toJson(row.change_log ?? row.changeLog, {}),
      snapshot: toJson(row.snapshot, null),
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
      deliveryChannel: row.delivery_channel ?? row.deliveryChannel ?? "MANUAL",
      recipientEmail: row.recipient_email ?? row.recipientEmail ?? null,
      recipientPhone: row.recipient_phone ?? row.recipientPhone ?? null,
      sentAt: toDate(row.sent_at ?? row.sentAt),
      metadata: toJson(row.metadata, {}),
    };
  }

  function toReminderLog(row) {
    if (!row) {
      return null;
    }

    return {
      id: row.id,
      quotationId: row.quotation_id ?? row.quotationId,
      reminderType: row.reminder_type ?? row.reminderType,
      triggeredBy: row.triggered_by ?? row.triggeredBy ?? null,
      triggeredAt: toDate(row.triggered_at ?? row.triggeredAt),
      metadata: toJson(row.metadata, {}),
    };
  }

  async function findItemsByQuotationId(quotationId) {
    const rows = await db.findMany(schema.itemsTable, {
      quotation_id: quotationId,
    });
    return rows.map((row) => toItem(row));
  }

  async function findViewsByQuotationId(quotationId, pagination = {}) {
    const filters = { quotation_id: quotationId };
    if (pagination.page) {
      filters.page = pagination.page;
    }
    if (pagination.limit) {
      filters.limit = pagination.limit;
    }

    const rows = await db.findMany(schema.viewsTable, filters);
    return rows
      .map((row) => toView(row))
      .sort((a, b) => {
        const left = new Date(a.viewedAt || 0).getTime();
        const right = new Date(b.viewedAt || 0).getTime();
        return right - left;
      });
  }

  async function findVersionLogsByQuotationId(quotationId) {
    const rows = await db.findMany(schema.versionLogsTable, {
      quotation_id: quotationId,
    });
    return rows
      .map((row) => toVersionLog(row))
      .sort((a, b) => {
        const leftVersion = Number(a.versionNumber || 0);
        const rightVersion = Number(b.versionNumber || 0);
        if (leftVersion !== rightVersion) {
          return rightVersion - leftVersion;
        }

        const leftTime = new Date(a.createdAt || 0).getTime();
        const rightTime = new Date(b.createdAt || 0).getTime();
        return rightTime - leftTime;
      });
  }

  async function findSendLogsByQuotationId(quotationId) {
    const rows = await db.findMany(schema.sendLogsTable, {
      quotation_id: quotationId,
    });
    return rows
      .map((row) => toSendLog(row))
      .sort((a, b) => {
        const left = new Date(a.sentAt || 0).getTime();
        const right = new Date(b.sentAt || 0).getTime();
        return right - left;
      });
  }

  function buildTemplateFilters(filters = {}) {
    const mapped = {};

    if (filters.isActive !== undefined) {
      mapped.is_active = filters.isActive;
    }

    if (filters.templateType) {
      mapped.template_type = filters.templateType;
    }

    if (filters.page) {
      mapped.page = filters.page;
    }

    if (filters.limit) {
      mapped.limit = filters.limit;
    }

    return mapped;
  }

  async function findReminderCandidates({
    notOpenedBefore,
    viewedNoActionBefore,
  }) {
    if (canUseRawQuery()) {
      const notOpenedSql = `
        SELECT *
        FROM ${schema.tableName}
        WHERE COALESCE(is_deleted, 0) = 0
          AND status NOT IN ('APPROVED', 'REJECTED')
          AND sent_at IS NOT NULL
          AND sent_at <= ?
          AND COALESCE(view_count, 0) = 0
          AND NOT EXISTS (
            SELECT 1
            FROM ${schema.reminderLogsTable} rl
            WHERE rl.quotation_id = ${schema.tableName}.id
              AND rl.reminder_type = 'NOT_OPENED_24H'
          )
      `;

      const viewedNoActionSql = `
        SELECT *
        FROM ${schema.tableName}
        WHERE COALESCE(is_deleted, 0) = 0
          AND status NOT IN ('APPROVED', 'REJECTED')
          AND sent_at IS NOT NULL
          AND last_viewed_at IS NOT NULL
          AND last_viewed_at <= ?
          AND COALESCE(view_count, 0) > 0
          AND NOT EXISTS (
            SELECT 1
            FROM ${schema.reminderLogsTable} rl
            WHERE rl.quotation_id = ${schema.tableName}.id
              AND rl.reminder_type = 'VIEWED_NO_ACTION_48H'
          )
      `;

      const [notOpenedResult, viewedResult] = await Promise.all([
        db.query(notOpenedSql, [notOpenedBefore]),
        db.query(viewedNoActionSql, [viewedNoActionBefore]),
      ]);

      const notOpened = notOpenedResult.rows.map((row) => ({
        quotation: toQuotation(row),
        reminderType: "NOT_OPENED_24H",
      }));

      const viewedNoAction = viewedResult.rows.map((row) => ({
        quotation: toQuotation(row),
        reminderType: "VIEWED_NO_ACTION_48H",
      }));

      return [...notOpened, ...viewedNoAction];
    }

    const rows = await db.findMany(schema.tableName, {});
    const reminderRows = await db.findMany(schema.reminderLogsTable, {});
    const loggedByQuotation = new Map();
    reminderRows.forEach((row) => {
      const quotationId = row.quotation_id ?? row.quotationId;
      if (!quotationId) {
        return;
      }
      const current = loggedByQuotation.get(quotationId) || new Set();
      current.add(String(row.reminder_type ?? row.reminderType ?? "").toUpperCase());
      loggedByQuotation.set(quotationId, current);
    });
    const notOpenedCutoff = new Date(notOpenedBefore).getTime();
    const viewedCutoff = new Date(viewedNoActionBefore).getTime();

    const isFinalStatus = new Set(["APPROVED", "REJECTED"]);
    const candidates = [];

    rows.forEach((row) => {
      const domain = toQuotation(row);
      if (!domain || isFinalStatus.has(domain.status) || domain.isDeleted) {
        return;
      }
      const loggedTypes = loggedByQuotation.get(domain.id) || new Set();

      const sentAt = domain.sentAt ? new Date(domain.sentAt).getTime() : null;
      const lastViewedAt = domain.lastViewedAt
        ? new Date(domain.lastViewedAt).getTime()
        : null;

      if (
        sentAt &&
        domain.viewCount === 0 &&
        sentAt <= notOpenedCutoff &&
        !loggedTypes.has("NOT_OPENED_24H")
      ) {
        candidates.push({ quotation: domain, reminderType: "NOT_OPENED_24H" });
        return;
      }

      if (
        lastViewedAt &&
        domain.viewCount > 0 &&
        lastViewedAt <= viewedCutoff &&
        !loggedTypes.has("VIEWED_NO_ACTION_48H")
      ) {
        candidates.push({
          quotation: domain,
          reminderType: "VIEWED_NO_ACTION_48H",
        });
      }
    });

    return candidates;
  }

  return Object.freeze({
    async findAll(filters = {}) {
      if (filters.availableForBooking) {
        const requestedStatus =
          filters.status ? String(filters.status).trim().toUpperCase() : null;
        if (requestedStatus && requestedStatus !== "APPROVED") {
          return [];
        }

        const limit =
          Number.isFinite(filters.limit) && Number(filters.limit) > 0 ?
            Math.floor(Number(filters.limit))
          : null;
        const page =
          Number.isFinite(filters.page) && Number(filters.page) > 0 ?
            Math.floor(Number(filters.page))
          : null;
        const offset = limit && page ? (page - 1) * limit : null;

        if (canUseRawQuery()) {
          const values = ["APPROVED"];
          const clauses = [
            "q.status = ?",
            "q.is_deleted = 0",
            "b.id IS NULL",
          ];

          if (filters.leadId) {
            values.push(filters.leadId);
            clauses.push(`q.lead_id = ?`);
          }
          if (filters.createdBy) {
            values.push(filters.createdBy);
            clauses.push(`q.created_by = ?`);
          }
          if (filters.templateId) {
            values.push(filters.templateId);
            clauses.push(`q.template_id = ?`);
          }
          if (filters.sourcePackageId) {
            values.push(filters.sourcePackageId);
            clauses.push(`q.source_package_id = ?`);
          }
          if (filters.quotationTitle) {
            values.push(`%${String(filters.quotationTitle).trim()}%`);
            clauses.push(`LOWER(COALESCE(q.quotation_title, '')) LIKE LOWER(?)`);
          }
          if (filters.tripDestination) {
            values.push(`%${String(filters.tripDestination).trim()}%`);
            clauses.push(`LOWER(COALESCE(q.trip_destination, '')) LIKE LOWER(?)`);
          }
          if (filters.durationNights !== undefined) {
            values.push(Number(filters.durationNights));
            clauses.push(`q.duration_nights = ?`);
          }
          if (filters.durationDays !== undefined) {
            values.push(Number(filters.durationDays));
            clauses.push(`q.duration_days = ?`);
          }
          if (filters.travelStartDate) {
            values.push(filters.travelStartDate);
            clauses.push(`q.travel_start_date = ?`);
          }
          if (filters.requiresApproval !== undefined) {
            values.push(toBoolean(filters.requiresApproval));
            clauses.push(`q.requires_approval = ?`);
          }

          let query = `
            SELECT q.*
            FROM ${schema.tableName} q
            LEFT JOIN ${schema.bookingsTable} b
              ON b.quotation_id = q.id
             AND b.is_deleted = 0
            WHERE ${clauses.join(" AND ")}
            ORDER BY q.created_at DESC
          `;

          if (limit) {
            values.push(limit);
            query += ` LIMIT ?`;
          }
          if (offset !== null) {
            values.push(offset);
            query += ` OFFSET ?`;
          }

          const result = await db.query(query, values);
          return result.rows.map((row) => toQuotation(row));
        }

        const mappedFilters = {
          status: "APPROVED",
          is_deleted: false,
        };
        if (filters.leadId) {
          mappedFilters.lead_id = filters.leadId;
        }
        if (filters.createdBy) {
          mappedFilters.created_by = filters.createdBy;
        }
        if (filters.templateId) {
          mappedFilters.template_id = filters.templateId;
        }
        if (filters.sourcePackageId) {
          mappedFilters.source_package_id = filters.sourcePackageId;
        }
        if (filters.quotationTitle) {
          mappedFilters.quotation_title = filters.quotationTitle;
        }
        if (filters.tripDestination) {
          mappedFilters.trip_destination = filters.tripDestination;
        }
        if (filters.durationNights !== undefined) {
          mappedFilters.duration_nights = Number(filters.durationNights);
        }
        if (filters.durationDays !== undefined) {
          mappedFilters.duration_days = Number(filters.durationDays);
        }
        if (filters.travelStartDate) {
          mappedFilters.travel_start_date = filters.travelStartDate;
        }
        if (filters.requiresApproval !== undefined) {
          mappedFilters.requires_approval = toBoolean(filters.requiresApproval);
        }
        if (limit) {
          mappedFilters.limit = limit;
        }
        if (offset !== null) {
          mappedFilters.offset = offset;
        }

        const rows = await db.findMany(schema.tableName, mappedFilters);
        const bookings = await db.findMany(schema.bookingsTable, {});
        const bookedIds = new Set(
          bookings
            .filter((row) => !(row.is_deleted ?? row.isDeleted))
            .map((row) => row.quotation_id ?? row.quotationId)
            .filter(Boolean),
        );
        const list = rows
          .filter((row) => !bookedIds.has(row.id))
          .map((row) => toQuotation(row));

        return list.sort((a, b) => {
          const left = new Date(a.createdAt || 0).getTime();
          const right = new Date(b.createdAt || 0).getTime();
          return right - left;
        });
      }

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
      if (filters.sourcePackageId) {
        mappedFilters.source_package_id = filters.sourcePackageId;
      }
      if (filters.quotationTitle) {
        mappedFilters.quotation_title = filters.quotationTitle;
      }
      if (filters.tripDestination) {
        mappedFilters.trip_destination = filters.tripDestination;
      }
      if (filters.durationNights !== undefined) {
        mappedFilters.duration_nights = Number(filters.durationNights);
      }
      if (filters.durationDays !== undefined) {
        mappedFilters.duration_days = Number(filters.durationDays);
      }
      if (filters.travelStartDate) {
        mappedFilters.travel_start_date = filters.travelStartDate;
      }
      if (filters.templateId) {
        mappedFilters.template_id = filters.templateId;
      }
      if (filters.requiresApproval !== undefined) {
        mappedFilters.requires_approval = filters.requiresApproval;
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

    async create(payload) {
      logger.debug({ module: "quotations", payload }, "Creating quotation");
      const row = await db.insert(schema.tableName, {
        ...payload,
        template_snapshot: toJsonString(payload.template_snapshot),
        itinerary: toJsonString(payload.itinerary),
      });
      return toQuotation(row);
    },

    async update(id, payload) {
      logger.debug({ module: "quotations", id, payload }, "Updating quotation");
      const row = await db.update(schema.tableName, id, {
        ...payload,
        template_snapshot:
          payload.template_snapshot !== undefined
            ? toJsonString(payload.template_snapshot)
            : undefined,
        itinerary:
          payload.itinerary !== undefined
            ? toJsonString(payload.itinerary)
            : undefined,
      });
      return toQuotation(row);
    },

    async replaceItems(quotationId, components = []) {
      await db.query("DELETE FROM quotation_items WHERE quotation_id = ?", [
        quotationId,
      ]);

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

    async createView(payload) {
      const row = await db.insert(schema.viewsTable, {
        quotation_id: payload.quotationId,
        ip_address: payload.ipAddress || null,
      });
      return toView(row);
    },

    async incrementViewStats(quotationId) {
      if (canUseRawQuery()) {
        await db.query(
          `
            UPDATE ${schema.tableName}
            SET
              view_count = COALESCE(view_count, 0) + 1,
              first_viewed_at = COALESCE(first_viewed_at, CURRENT_TIMESTAMP),
              last_viewed_at = CURRENT_TIMESTAMP,
              updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `,
          [quotationId],
        );
        const fetchResult = await db.query(
          `SELECT * FROM ${schema.tableName} WHERE id = ? LIMIT 1`,
          [quotationId],
        );
        return toQuotation(fetchResult.rows[0]);
      }

      const current = await db.findById(schema.tableName, quotationId);
      if (!current) {
        return null;
      }

      const nowIso = new Date().toISOString();
      const next = await db.update(schema.tableName, quotationId, {
        view_count: Number(current.view_count || 0) + 1,
        first_viewed_at: current.first_viewed_at || nowIso,
        last_viewed_at: nowIso,
        updated_at: nowIso,
      });

      return toQuotation(next);
    },

    async findLeadById(id) {
      return db.findById(schema.leadsTable, id);
    },

    async findLeadDetailsById(id) {
      if (!id) {
        return null;
      }
      const row = await db.findById(schema.leadsTable, id);
      return toLead(row);
    },

    async updateLeadStatus(leadId, status) {
      return db.update(schema.leadsTable, leadId, { status });
    },

    async findBookingByQuotationId(quotationId) {
      return db.findOne(schema.bookingsTable, { quotation_id: quotationId });
    },

    async createBooking(payload) {
      return db.insert(schema.bookingsTable, payload);
    },

    async findBookingSummaryByQuotationId(quotationId) {
      if (!quotationId) {
        return null;
      }
      const row = await db.findOne(schema.bookingsTable, {
        quotation_id: quotationId,
      });
      return toBookingSummary(row);
    },

    async findUserById(id) {
      if (!id) {
        return null;
      }
      const row = await db.findById(schema.usersTable, id);
      return toUser(row);
    },

    findUsersByIds,

    async findTemplateById(id) {
      const row = await db.findById(schema.templatesTable, id);
      return toTemplate(row);
    },

    async findPricingById(id) {
      if (!id || !schema.pricingTable) {
        return null;
      }
      const row = await db.findById(schema.pricingTable, id);
      return toPricing(row);
    },

    async findDestinationById(id) {
      if (!id || !schema.destinationsTable) {
        return null;
      }
      const row = await db.findById(schema.destinationsTable, id);
      return toDestination(row);
    },

    async findIntegrationSettings() {
      if (!schema.appSettingsTable) {
        return {};
      }

      try {
        const row = await db.findOne(schema.appSettingsTable, {
          key: "integrations",
        });
        return toJson(row?.value, {}) || {};
      } catch (error) {
        logger.warn(
          { err: error, module: "quotations" },
          "Unable to load integration settings from app_settings",
        );
        return {};
      }
    },

    findLeadsByIds,
    findDestinationsByIds,

    async findQuotationSummaryById(id) {
      if (!id) {
        return null;
      }
      const row = await db.findById(schema.tableName, id);
      return toQuotationSummary(row);
    },

    async findTemplateByCode(code) {
      const row = await db.findOne(schema.templatesTable, { code });
      return toTemplate(row);
    },

    async findTemplates(filters = {}) {
      const rows = await db.findMany(
        schema.templatesTable,
        buildTemplateFilters(filters),
      );
      return rows
        .map((row) => toTemplate(row))
        .sort((a, b) => {
          const left = new Date(a.createdAt || 0).getTime();
          const right = new Date(b.createdAt || 0).getTime();
          return right - left;
        });
    },

    async createTemplate(payload) {
      const row = await db.insert(schema.templatesTable, payload);
      return toTemplate(row);
    },

    async updateTemplate(id, payload) {
      const row = await db.update(schema.templatesTable, id, payload);
      return toTemplate(row);
    },

    async createVersionLog(payload) {
      const row = await db.insert(schema.versionLogsTable, {
        quotation_id: payload.quotationId,
        version_number: payload.versionNumber,
        editor_id: payload.editorId || null,
        action: payload.action,
        change_log: toJsonString(payload.changeLog || {}),
        snapshot: toJsonString(payload.snapshot || null),
      });

      return toVersionLog(row);
    },

    findVersionLogsByQuotationId,

    async createSendLog(payload) {
      const row = await db.insert(schema.sendLogsTable, {
        quotation_id: payload.quotationId,
        sent_by: payload.sentBy || null,
        delivery_channel: payload.deliveryChannel || "MANUAL",
        recipient_email: payload.recipientEmail || null,
        recipient_phone: payload.recipientPhone || null,
        metadata: toJsonString(payload.metadata || {}),
      });

      return toSendLog(row);
    },

    findSendLogsByQuotationId,

    async createReminderLog(payload) {
      const row = await db.insert(schema.reminderLogsTable, {
        quotation_id: payload.quotationId,
        reminder_type: payload.reminderType,
        triggered_by: payload.triggeredBy || null,
        metadata: toJsonString(payload.metadata || {}),
      });

      return toReminderLog(row);
    },

    findReminderCandidates,

    async getLeadToQuoteReport(filters = {}) {
      const where = ["COALESCE(q.is_deleted, 0) = 0"];
      const params = [];

      if (filters.from) {
        params.push(filters.from);
        where.push(`q.created_at >= ?`);
      }

      if (filters.to) {
        params.push(filters.to);
        where.push(`q.created_at <= ?`);
      }

      if (filters.createdBy) {
        params.push(filters.createdBy);
        where.push(`q.created_by = ?`);
      }
      if (filters.sourcePackageId) {
        params.push(filters.sourcePackageId);
        where.push(`q.source_package_id = ?`);
      }
      if (filters.quotationTitle) {
        params.push(`%${String(filters.quotationTitle).trim()}%`);
        where.push(`LOWER(COALESCE(q.quotation_title, '')) LIKE LOWER(?)`);
      }
      if (filters.tripDestination) {
        params.push(`%${String(filters.tripDestination).trim()}%`);
        where.push(`LOWER(COALESCE(q.trip_destination, '')) LIKE LOWER(?)`);
      }
      if (filters.durationNights !== undefined) {
        params.push(Number(filters.durationNights));
        where.push(`q.duration_nights = ?`);
      }
      if (filters.durationDays !== undefined) {
        params.push(Number(filters.durationDays));
        where.push(`q.duration_days = ?`);
      }
      if (filters.travelStartDate) {
        params.push(filters.travelStartDate);
        where.push(`q.travel_start_date = ?`);
      }

      const whereSql = where.join(" AND ");

      const consultantSql = `
        SELECT
          q.created_by,
          u.full_name AS consultant_name,
          COUNT(*) AS total_quotes,
          SUM(CASE WHEN q.status = 'APPROVED' THEN 1 ELSE 0 END) AS approved_quotes,
          SUM(CASE WHEN q.status = 'REJECTED' THEN 1 ELSE 0 END) AS rejected_quotes,
          ROUND(AVG(TIMESTAMPDIFF(SECOND, l.created_at, q.created_at) / 60.0), 2) AS avg_lead_to_quote_created_minutes,
          ROUND(AVG(
            CASE
              WHEN q.sent_at IS NOT NULL
              THEN TIMESTAMPDIFF(SECOND, l.created_at, q.sent_at) / 60.0
              ELSE NULL
            END
          ), 2) AS avg_lead_to_quote_sent_minutes,
          ROUND(AVG(q.final_price), 2) AS avg_quote_value,
          ROUND(AVG(q.margin_percent), 2) AS avg_margin_percent,
          SUM(CASE WHEN q.response_sla_breached = 1 THEN 1 ELSE 0 END) AS sla_breached_quotes
        FROM quotations q
        LEFT JOIN users u ON u.id = q.created_by
        LEFT JOIN leads l ON l.id = q.lead_id
        WHERE ${whereSql}
        GROUP BY q.created_by, u.full_name
        ORDER BY total_quotes DESC
      `;

      const overallSql = `
        SELECT
          COUNT(*) AS total_quotes,
          SUM(CASE WHEN q.status = 'APPROVED' THEN 1 ELSE 0 END) AS approved_quotes,
          SUM(CASE WHEN q.status = 'REJECTED' THEN 1 ELSE 0 END) AS rejected_quotes,
          ROUND(AVG(TIMESTAMPDIFF(SECOND, l.created_at, q.created_at) / 60.0), 2) AS avg_lead_to_quote_created_minutes,
          ROUND(AVG(
            CASE
              WHEN q.sent_at IS NOT NULL
              THEN TIMESTAMPDIFF(SECOND, l.created_at, q.sent_at) / 60.0
              ELSE NULL
            END
          ), 2) AS avg_lead_to_quote_sent_minutes,
          ROUND(AVG(q.final_price), 2) AS avg_quote_value,
          ROUND(AVG(q.margin_percent), 2) AS avg_margin_percent,
          SUM(CASE WHEN q.response_sla_breached = 1 THEN 1 ELSE 0 END) AS sla_breached_quotes
        FROM quotations q
        LEFT JOIN leads l ON l.id = q.lead_id
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
        const approvalRatePercent =
          total > 0 ? Number(((approved / total) * 100).toFixed(2)) : 0;

        return {
          createdBy: row.created_by,
          consultantName: row.consultant_name || null,
          totalQuotes: total,
          approvedQuotes: approved,
          rejectedQuotes: rejected,
          slaBreachedQuotes: Number(row.sla_breached_quotes || 0),
          approvalRatePercent,
          avgLeadToQuoteMinutes: toNumber(
            row.avg_lead_to_quote_sent_minutes,
            0,
          ),
          avgLeadToQuoteCreatedMinutes: toNumber(
            row.avg_lead_to_quote_created_minutes,
            0,
          ),
          avgLeadToQuoteSentMinutes: toNumber(
            row.avg_lead_to_quote_sent_minutes,
            0,
          ),
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
          slaBreachedQuotes: Number(overallRow.sla_breached_quotes || 0),
          approvalRatePercent:
            overallTotal > 0
              ? Number(((overallApproved / overallTotal) * 100).toFixed(2))
              : 0,
          avgLeadToQuoteMinutes: toNumber(
            overallRow.avg_lead_to_quote_sent_minutes,
            0,
          ),
          avgLeadToQuoteCreatedMinutes: toNumber(
            overallRow.avg_lead_to_quote_created_minutes,
            0,
          ),
          avgLeadToQuoteSentMinutes: toNumber(
            overallRow.avg_lead_to_quote_sent_minutes,
            0,
          ),
          avgQuoteValue: toNumber(overallRow.avg_quote_value, 0),
          avgMarginPercent: toNumber(overallRow.avg_margin_percent, 0),
        },
        byConsultant,
      };
    },
  });
}

export { createQuotationsRepository };

