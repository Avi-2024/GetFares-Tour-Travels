const { AppError } = require('../../core/errors');

const QUOTATION_STATUS = Object.freeze({
  DRAFT: 'DRAFT',
  SENT: 'SENT',
  VIEWED: 'VIEWED',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  EXPIRED: 'EXPIRED',
});

const QUOTE_REMINDER_TYPES = Object.freeze({
  NOT_OPENED_24H: 'NOT_OPENED_24H',
  VIEWED_NO_ACTION_48H: 'VIEWED_NO_ACTION_48H',
});

const TEMPLATE_ADMIN_ROLES = new Set(['admin', 'super_admin']);
const MARGIN_APPROVER_ROLES = new Set(['manager', 'admin', 'super_admin']);

const DEFAULT_MIN_MARGIN_PERCENT = 10;
const DEFAULT_EXPIRY_HOURS = 72;

const ALLOWED_TRANSITIONS = Object.freeze({
  DRAFT: new Set([QUOTATION_STATUS.SENT, QUOTATION_STATUS.EXPIRED]),
  SENT: new Set([QUOTATION_STATUS.VIEWED, QUOTATION_STATUS.APPROVED, QUOTATION_STATUS.REJECTED, QUOTATION_STATUS.EXPIRED]),
  VIEWED: new Set([QUOTATION_STATUS.APPROVED, QUOTATION_STATUS.REJECTED, QUOTATION_STATUS.EXPIRED]),
  APPROVED: new Set(),
  REJECTED: new Set(),
  EXPIRED: new Set(),
});

function roundCurrency(value) {
  const parsed = Number(value || 0);
  if (!Number.isFinite(parsed)) {
    return 0;
  }
  return Number(parsed.toFixed(2));
}

function toDateOnly(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString().slice(0, 10);
}

function buildQuoteNumber() {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomPart = Math.floor(1000 + Math.random() * 9000);
  return `QT-${stamp}-${randomPart}`;
}

function buildBookingNumber() {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomPart = Math.floor(1000 + Math.random() * 9000);
  return `BK-${stamp}-${randomPart}`;
}

function createQuotationsService({ repository, logger, events }) {
  function assertAuthenticatedUser(user) {
    if (!user?.id) {
      throw new AppError(401, 'Authentication required', 'AUTH_REQUIRED');
    }
  }

  function assertTemplateAdmin(user) {
    assertAuthenticatedUser(user);
    const role = String(user.role || '').toLowerCase();
    if (!TEMPLATE_ADMIN_ROLES.has(role)) {
      throw new AppError(403, 'Only Admin can manage templates', 'QUOTATION_TEMPLATE_FORBIDDEN');
    }
  }

  function assertMarginApprover(user) {
    assertAuthenticatedUser(user);
    const role = String(user.role || '').toLowerCase();
    if (!MARGIN_APPROVER_ROLES.has(role)) {
      throw new AppError(403, 'Only Manager/Admin can approve margin', 'QUOTATION_MARGIN_APPROVAL_FORBIDDEN');
    }
  }

  function ensureTransitionAllowed(fromStatus, toStatus) {
    if (fromStatus === toStatus) {
      return;
    }

    const allowed = ALLOWED_TRANSITIONS[fromStatus];
    if (!allowed || !allowed.has(toStatus)) {
      throw new AppError(
        409,
        `Invalid status transition: ${fromStatus} -> ${toStatus}`,
        'QUOTATION_INVALID_STATUS_TRANSITION',
      );
    }
  }

  function ensureDraftEditable(quotation) {
    if (quotation.status !== QUOTATION_STATUS.DRAFT) {
      throw new AppError(409, 'Only DRAFT quotation can be edited', 'QUOTATION_LOCKED');
    }
  }

  function normalizeTemplateCode(code) {
    return String(code || '')
      .trim()
      .toUpperCase()
      .replace(/\s+/g, '_');
  }

  function calculatePricing(payload) {
    const components = Array.isArray(payload.components) ? payload.components : [];
    if (!components.length) {
      throw new AppError(400, 'At least one component is required', 'QUOTATION_COMPONENT_REQUIRED');
    }

    const normalizedComponents = components.map((component) => ({
      itemType: component.itemType,
      description: component.description,
      cost: roundCurrency(component.cost),
    }));

    const totalCost = roundCurrency(
      normalizedComponents.reduce((sum, item) => sum + roundCurrency(item.cost), 0),
    );

    const marginPercent = Number(payload.marginPercent ?? 0);
    if (!Number.isFinite(marginPercent) || marginPercent < 0 || marginPercent > 100) {
      throw new AppError(400, 'marginPercent must be between 0 and 100', 'QUOTATION_INVALID_MARGIN_PERCENT');
    }

    const marginAmount = roundCurrency((totalCost * marginPercent) / 100);

    const discountAmount = roundCurrency(payload.discount ?? 0);
    if (discountAmount < 0) {
      throw new AppError(400, 'discount cannot be negative', 'QUOTATION_INVALID_DISCOUNT');
    }

    const taxableBase = roundCurrency(totalCost + marginAmount - discountAmount);
    if (taxableBase < 0) {
      throw new AppError(400, 'Discount cannot exceed subtotal', 'QUOTATION_INVALID_DISCOUNT_RANGE');
    }

    let taxAmount = 0;
    if (payload.taxAmount !== undefined && payload.taxAmount !== null) {
      taxAmount = roundCurrency(payload.taxAmount);
    } else {
      const taxPercent = Number(payload.taxPercent ?? 0);
      if (!Number.isFinite(taxPercent) || taxPercent < 0 || taxPercent > 100) {
        throw new AppError(400, 'taxPercent must be between 0 and 100', 'QUOTATION_INVALID_TAX_PERCENT');
      }
      taxAmount = roundCurrency((taxableBase * taxPercent) / 100);
    }

    if (taxAmount < 0) {
      throw new AppError(400, 'taxAmount cannot be negative', 'QUOTATION_INVALID_TAX_AMOUNT');
    }

    const finalPrice = roundCurrency(taxableBase + taxAmount);

    return {
      components: normalizedComponents,
      totalCost,
      marginPercent: roundCurrency(marginPercent),
      marginAmount,
      discountAmount,
      taxAmount,
      finalPrice,
    };
  }

  function computeLeadToQuoteMinutes(leadCreatedAt, quoteCreatedAt) {
    if (!leadCreatedAt || !quoteCreatedAt) {
      return null;
    }

    const leadDate = new Date(leadCreatedAt);
    const quoteDate = new Date(quoteCreatedAt);
    if (Number.isNaN(leadDate.getTime()) || Number.isNaN(quoteDate.getTime())) {
      return null;
    }

    const minutes = Math.floor((quoteDate.getTime() - leadDate.getTime()) / 60000);
    return minutes >= 0 ? minutes : null;
  }

  function buildTemplateSnapshot(template) {
    if (!template) {
      return null;
    }

    return {
      id: template.id,
      code: template.code,
      name: template.name,
      templateType: template.templateType,
      headerBranding: template.headerBranding,
      inclusions: template.inclusions,
      exclusions: template.exclusions,
      paymentTerms: template.paymentTerms,
      cancellationPolicy: template.cancellationPolicy,
      footerDisclaimer: template.footerDisclaimer,
      minMarginPercent: template.minMarginPercent,
    };
  }

  async function getById(id, context = {}, options = {}) {
    logger.debug({ module: 'quotations', requestId: context.requestId, id }, 'Get quotation by id');

    const quotation = await repository.findById(id);
    if (!quotation) {
      throw new AppError(404, 'Quotation not found', 'QUOTATION_NOT_FOUND');
    }

    const includeItems = options.includeItems !== false;
    if (!includeItems) {
      return quotation;
    }

    const items = await repository.findItemsByQuotationId(id);
    return { ...quotation, items };
  }

  async function createVersionLog(quotation, action, changeLog, context) {
    return repository.createVersionLog({
      quotationId: quotation.id,
      versionNumber: quotation.versionNumber,
      editorId: context.user?.id || null,
      action,
      changeLog,
      snapshot: quotation,
    });
  }

  async function create(payload, context = {}) {
    assertAuthenticatedUser(context.user);

    const lead = await repository.findLeadById(payload.leadId);
    if (!lead) {
      throw new AppError(404, 'Lead not found', 'LEAD_NOT_FOUND');
    }

    let template = null;
    if (payload.templateId) {
      template = await repository.findTemplateById(payload.templateId);
      if (!template || !template.isActive) {
        throw new AppError(404, 'Template not found or inactive', 'QUOTATION_TEMPLATE_NOT_FOUND');
      }
    }

    const pricing = calculatePricing(payload);

    const minMarginPercent = Number(payload.minMarginPercent ?? template?.minMarginPercent ?? DEFAULT_MIN_MARGIN_PERCENT);
    const requiresApproval = pricing.marginPercent < minMarginPercent;

    const now = new Date();
    const nowIso = now.toISOString();
    const expiresInHours = Number(payload.expiresInHours ?? DEFAULT_EXPIRY_HOURS);
    const expiresAt = new Date(now.getTime() + Math.max(1, expiresInHours) * 3600 * 1000).toISOString();

    const leadCreatedAt = lead.created_at ?? lead.createdAt ?? null;
    const leadToQuoteMinutes = computeLeadToQuoteMinutes(leadCreatedAt, nowIso);

    let created = null;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        created = await repository.create({
          quote_number: buildQuoteNumber(),
          parent_quote_id: payload.parentQuoteId || null,
          lead_id: payload.leadId,
          created_by: context.user.id,
          pricing_id: payload.pricingId || null,
          template_id: template?.id || null,
          template_snapshot: buildTemplateSnapshot(template),
          total_cost: pricing.totalCost,
          margin_percent: pricing.marginPercent,
          margin_amount: pricing.marginAmount,
          discount: pricing.discountAmount,
          discount_amount: pricing.discountAmount,
          tax: pricing.taxAmount,
          tax_amount: pricing.taxAmount,
          final_price: pricing.finalPrice,
          min_margin_percent: minMarginPercent,
          requires_approval: requiresApproval,
          version_number: 1,
          status: QUOTATION_STATUS.DRAFT,
          expires_at: expiresAt,
          lead_to_quote_minutes: leadToQuoteMinutes,
          created_at: nowIso,
          updated_at: nowIso,
        });
        break;
      } catch (error) {
        if (error?.code !== '23505') {
          throw error;
        }
      }
    }

    if (!created) {
      throw new AppError(500, 'Unable to generate unique quote number', 'QUOTATION_NUMBER_GENERATION_FAILED');
    }

    const items = await repository.replaceItems(created.id, pricing.components);
    const quotation = { ...created, items };

    await createVersionLog(
      quotation,
      'CREATE',
      { message: 'Quotation created', requiresApproval },
      context,
    );

    events.emitCreated(quotation);
    return quotation;
  }

  async function update(id, payload, context = {}) {
    assertAuthenticatedUser(context.user);

    const current = await getById(id, context, { includeItems: true });
    ensureDraftEditable(current);

    let template = null;
    if (payload.templateId) {
      template = await repository.findTemplateById(payload.templateId);
      if (!template || !template.isActive) {
        throw new AppError(404, 'Template not found or inactive', 'QUOTATION_TEMPLATE_NOT_FOUND');
      }
    } else if (current.templateId) {
      template = await repository.findTemplateById(current.templateId);
    }

    const nextComponents = payload.components || current.items || [];
    const nextPricing = calculatePricing({
      components: nextComponents,
      marginPercent: payload.marginPercent ?? current.marginPercent,
      discount: payload.discount ?? current.discountAmount ?? current.discount ?? 0,
      taxAmount: payload.taxAmount ?? current.taxAmount ?? current.tax ?? 0,
      taxPercent: payload.taxPercent,
    });

    const minMarginPercent = Number(
      payload.minMarginPercent ?? current.minMarginPercent ?? template?.minMarginPercent ?? DEFAULT_MIN_MARGIN_PERCENT,
    );
    const requiresApproval = nextPricing.marginPercent < minMarginPercent;

    const updated = await repository.update(id, {
      template_id: payload.templateId !== undefined ? payload.templateId : current.templateId,
      template_snapshot: payload.templateId ? buildTemplateSnapshot(template) : current.templateSnapshot,
      total_cost: nextPricing.totalCost,
      margin_percent: nextPricing.marginPercent,
      margin_amount: nextPricing.marginAmount,
      discount: nextPricing.discountAmount,
      discount_amount: nextPricing.discountAmount,
      tax: nextPricing.taxAmount,
      tax_amount: nextPricing.taxAmount,
      final_price: nextPricing.finalPrice,
      min_margin_percent: minMarginPercent,
      requires_approval: requiresApproval,
      approval_note: payload.notes || current.approvalNote || null,
      version_number: Number(current.versionNumber || 1) + 1,
      updated_at: new Date().toISOString(),
    });

    const items = payload.components
      ? await repository.replaceItems(id, nextPricing.components)
      : current.items;

    const quotation = { ...updated, items };

    await createVersionLog(
      quotation,
      'UPDATE',
      { message: 'Quotation updated', fields: Object.keys(payload || {}) },
      context,
    );

    events.emitUpdated(quotation);
    return quotation;
  }

  async function generatePdf(id, payload = {}, context = {}) {
    const quotation = await getById(id, context, { includeItems: false });

    const pdfUrl = payload.pdfUrl || `https://crm.local/quotations/${quotation.id}/v${quotation.versionNumber}.pdf`;

    const updated = await repository.update(id, {
      pdf_url: pdfUrl,
      pdf_generated_at: new Date().toISOString(),
      pdf_generated_by: context.user?.id || null,
      updated_at: new Date().toISOString(),
    });

    events.emitPdfGenerated({ id: updated.id, pdfUrl: updated.pdfUrl });
    return updated;
  }

  async function send(id, payload = {}, context = {}) {
    assertAuthenticatedUser(context.user);

    let quotation = await getById(id, context, { includeItems: true });

    if (
      quotation.status === QUOTATION_STATUS.APPROVED ||
      quotation.status === QUOTATION_STATUS.REJECTED ||
      quotation.status === QUOTATION_STATUS.EXPIRED
    ) {
      throw new AppError(409, 'Finalized quotation cannot be sent', 'QUOTATION_FINALIZED');
    }

    if (quotation.requiresApproval && !quotation.approvedAt) {
      throw new AppError(409, 'Margin approval required before sending', 'QUOTATION_MARGIN_APPROVAL_REQUIRED');
    }

    if (!quotation.pdfUrl) {
      await generatePdf(id, {}, context);
      quotation = await getById(id, context, { includeItems: true });
    }

    const nowIso = new Date().toISOString();
    const patch = {
      sent_by: context.user.id,
      sent_at: quotation.sentAt || nowIso,
      updated_at: nowIso,
    };

    if (quotation.status === QUOTATION_STATUS.DRAFT) {
      patch.status = QUOTATION_STATUS.SENT;
      patch.locked_at = nowIso;
    }

    if (payload.expiresInHours) {
      patch.expires_at = new Date(Date.now() + Number(payload.expiresInHours) * 3600 * 1000).toISOString();
    }

    const updated = await repository.update(id, patch);

    await repository.createSendLog({
      quotationId: id,
      sentBy: context.user.id,
      deliveryChannel: payload.channel || 'MANUAL',
      recipientEmail: payload.recipientEmail || null,
      recipientPhone: payload.recipientPhone || null,
      metadata: {
        message: payload.message || null,
      },
    });

    if (updated.leadId) {
      await repository.updateLeadStatus(updated.leadId, 'QUOTED');
    }

    events.emitSent({ id: updated.id, sentBy: context.user.id });
    return {
      ...updated,
      items: quotation.items,
    };
  }

  async function trackView(id, payload = {}, context = {}) {
    const quotation = await getById(id, context, { includeItems: false });

    if (![QUOTATION_STATUS.SENT, QUOTATION_STATUS.VIEWED].includes(quotation.status)) {
      throw new AppError(409, 'Quotation cannot be viewed in current status', 'QUOTATION_VIEW_STATUS_INVALID');
    }

    await repository.createView({
      quotationId: id,
      ipAddress: payload.ipAddress || null,
      deviceInfo: payload.deviceInfo || null,
      userAgent: payload.userAgent || null,
    });

    const nextViewCount = Number(quotation.viewCount || 0) + 1;
    const nowIso = new Date().toISOString();

    const patch = {
      view_count: nextViewCount,
      last_viewed_at: nowIso,
      updated_at: nowIso,
    };

    if (!quotation.firstViewedAt) {
      patch.first_viewed_at = nowIso;
    }

    if (quotation.status === QUOTATION_STATUS.SENT) {
      patch.status = QUOTATION_STATUS.VIEWED;
    }

    const updated = await repository.update(id, patch);

    events.emitViewed({ id: updated.id, viewCount: updated.viewCount });
    return updated;
  }

  async function approveMargin(id, payload = {}, context = {}) {
    assertMarginApprover(context.user);

    const quotation = await getById(id, context, { includeItems: false });
    if (!quotation.requiresApproval) {
      return quotation;
    }

    const updated = await repository.update(id, {
      requires_approval: false,
      approved_by: context.user.id,
      approved_at: new Date().toISOString(),
      approval_note: payload.note || null,
      updated_at: new Date().toISOString(),
    });

    await createVersionLog(
      updated,
      'MARGIN_APPROVED',
      { note: payload.note || null },
      context,
    );

    events.emitMarginApproved({ id: updated.id, approvedBy: context.user.id });
    return updated;
  }

  async function ensureBookingForApprovedQuote(quotation, payload, context) {
    const existingBooking = await repository.findBookingByQuotationId(quotation.id);
    if (existingBooking) {
      return existingBooking;
    }

    const lead = quotation.leadId ? await repository.findLeadById(quotation.leadId) : null;

    const travelStartDate =
      toDateOnly(payload.travelStartDate) ||
      toDateOnly(lead?.travel_date || lead?.travelDate) ||
      new Date().toISOString().slice(0, 10);

    const travelEndDate = toDateOnly(payload.travelEndDate) || travelStartDate;

    if (travelEndDate < travelStartDate) {
      throw new AppError(400, 'travelEndDate cannot be before travelStartDate', 'QUOTATION_INVALID_TRAVEL_DATES');
    }

    const totalAmount = roundCurrency(quotation.finalPrice);
    const costAmount = roundCurrency(quotation.totalCost);

    return repository.createBooking({
      quotation_id: quotation.id,
      booking_number: buildBookingNumber(),
      travel_start_date: travelStartDate,
      travel_end_date: travelEndDate,
      total_amount: totalAmount,
      cost_amount: costAmount,
      advance_required: roundCurrency(totalAmount * 0.5),
      advance_received: 0,
      status: 'PENDING',
      payment_status: 'PENDING',
      created_by: context.user?.id || null,
    });
  }

  async function transitionStatus(id, payload, context = {}) {
    assertAuthenticatedUser(context.user);

    const targetStatus = payload.status;
    const quotation = await getById(id, context, { includeItems: true });

    ensureTransitionAllowed(quotation.status, targetStatus);

    if (targetStatus === QUOTATION_STATUS.APPROVED && quotation.requiresApproval) {
      throw new AppError(409, 'Margin approval required before approval', 'QUOTATION_MARGIN_APPROVAL_REQUIRED');
    }

    let booking = null;
    if (targetStatus === QUOTATION_STATUS.APPROVED) {
      booking = await ensureBookingForApprovedQuote(quotation, payload, context);
    }

    const patch = {
      status: targetStatus,
      updated_at: new Date().toISOString(),
    };

    if (targetStatus === QUOTATION_STATUS.EXPIRED) {
      patch.expires_at = new Date().toISOString();
    }

    if (targetStatus === QUOTATION_STATUS.REJECTED) {
      patch.approval_note = payload.reason || null;
    }

    const updated = await repository.update(id, patch);

    if (updated.leadId) {
      if (targetStatus === QUOTATION_STATUS.APPROVED) {
        await repository.updateLeadStatus(updated.leadId, 'CONVERTED');
      }

      if (targetStatus === QUOTATION_STATUS.REJECTED) {
        await repository.updateLeadStatus(updated.leadId, 'LOST');
      }
    }

    await createVersionLog(
      updated,
      'STATUS_CHANGED',
      {
        from: quotation.status,
        to: targetStatus,
        reason: payload.reason || null,
      },
      context,
    );

    events.emitStatusChanged({ id: updated.id, status: updated.status });

    return {
      quotation: {
        ...updated,
        items: quotation.items,
      },
      booking,
    };
  }

  async function runReminderAutomation(payload = {}, context = {}) {
    const notOpenedHours = Number(payload.notOpenedHours || 24);
    const viewedNoActionHours = Number(payload.viewedNoActionHours || 48);

    const candidates = await repository.findReminderCandidates({
      notOpenedHours,
      viewedNoActionHours,
    });

    const summary = {
      processed: candidates.length,
      triggered: 0,
      skipped: 0,
      reminders: [],
    };

    for (const candidate of candidates) {
      const exists = await repository.findReminderLogByType(candidate.quotationId, candidate.reminderType);
      if (exists) {
        summary.skipped += 1;
        continue;
      }

      await repository.createReminderLog({
        quotationId: candidate.quotationId,
        reminderType: candidate.reminderType,
        triggeredBy: context.user?.id || null,
        metadata: {
          notOpenedHours,
          viewedNoActionHours,
        },
      });

      summary.triggered += 1;
      summary.reminders.push(candidate);

      events.emitReminderTriggered(candidate);
    }

    return summary;
  }

  return Object.freeze({
    async list(filters = {}, context = {}) {
      logger.debug({ module: 'quotations', requestId: context.requestId, filters }, 'List quotations');
      const quotations = await repository.findAll(filters);

      const includeItems = Boolean(filters.includeItems);
      if (!includeItems) {
        return quotations;
      }

      const result = [];
      for (const quotation of quotations) {
        const items = await repository.findItemsByQuotationId(quotation.id);
        result.push({ ...quotation, items });
      }
      return result;
    },

    getById,
    create,
    update,
    generatePdf,
    send,
    trackView,
    approveMargin,
    transitionStatus,

    async listViews(id, filters = {}, context = {}) {
      await getById(id, context, { includeItems: false });
      return repository.findViewsByQuotationId(id, filters);
    },

    async listVersions(id, context = {}) {
      await getById(id, context, { includeItems: false });
      return repository.findVersionLogsByQuotationId(id);
    },

    async listSendLogs(id, context = {}) {
      await getById(id, context, { includeItems: false });
      return repository.findSendLogsByQuotationId(id);
    },

    runReminderAutomation,

    async getLeadToQuoteReport(filters = {}, context = {}) {
      logger.debug({ module: 'quotations', requestId: context.requestId, filters }, 'Lead-to-quote report');
      return repository.getLeadToQuoteReport(filters);
    },

    async listTemplates(filters = {}) {
      return repository.findTemplates(filters);
    },

    async createTemplate(payload, context = {}) {
      assertTemplateAdmin(context.user);

      const code = normalizeTemplateCode(payload.code);
      if (!code) {
        throw new AppError(400, 'Template code is required', 'QUOTATION_TEMPLATE_CODE_REQUIRED');
      }

      const existing = await repository.findTemplateByCode(code);
      if (existing) {
        throw new AppError(409, 'Template code already exists', 'QUOTATION_TEMPLATE_CODE_EXISTS');
      }

      return repository.createTemplate({
        code,
        name: payload.name,
        template_type: payload.templateType,
        header_branding: payload.headerBranding || null,
        inclusions: payload.inclusions || null,
        exclusions: payload.exclusions || null,
        payment_terms: payload.paymentTerms || null,
        cancellation_policy: payload.cancellationPolicy || null,
        footer_disclaimer: payload.footerDisclaimer || null,
        min_margin_percent: payload.minMarginPercent ?? DEFAULT_MIN_MARGIN_PERCENT,
        is_active: payload.isActive ?? true,
        created_by: context.user.id,
        updated_by: context.user.id,
      });
    },

    async updateTemplate(id, payload, context = {}) {
      assertTemplateAdmin(context.user);

      const current = await repository.findTemplateById(id);
      if (!current) {
        throw new AppError(404, 'Template not found', 'QUOTATION_TEMPLATE_NOT_FOUND');
      }

      if (payload.code) {
        const normalized = normalizeTemplateCode(payload.code);
        const duplicate = await repository.findTemplateByCode(normalized);
        if (duplicate && duplicate.id !== id) {
          throw new AppError(409, 'Template code already exists', 'QUOTATION_TEMPLATE_CODE_EXISTS');
        }
      }

      return repository.updateTemplate(id, {
        code: payload.code ? normalizeTemplateCode(payload.code) : current.code,
        name: payload.name ?? current.name,
        template_type: payload.templateType ?? current.templateType,
        header_branding: payload.headerBranding ?? current.headerBranding,
        inclusions: payload.inclusions ?? current.inclusions,
        exclusions: payload.exclusions ?? current.exclusions,
        payment_terms: payload.paymentTerms ?? current.paymentTerms,
        cancellation_policy: payload.cancellationPolicy ?? current.cancellationPolicy,
        footer_disclaimer: payload.footerDisclaimer ?? current.footerDisclaimer,
        min_margin_percent: payload.minMarginPercent ?? current.minMarginPercent,
        is_active: payload.isActive ?? current.isActive,
        updated_by: context.user.id,
        updated_at: new Date().toISOString(),
      });
    },
  });
}

module.exports = {
  createQuotationsService,
  QUOTATION_STATUS,
  QUOTE_REMINDER_TYPES,
};
