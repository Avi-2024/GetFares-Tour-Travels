const { AppError } = require('../../core/errors');

const QUOTATION_STATUS = Object.freeze({
  DRAFT: 'DRAFT',
  SENT: 'SENT',
  VIEWED: 'VIEWED',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  EXPIRED: 'EXPIRED',
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

function addHours(date, hours) {
  const base = new Date(date);
  base.setHours(base.getHours() + Number(hours || 0));
  return base;
}

function buildBookingNumber() {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomPart = Math.floor(1000 + Math.random() * 9000);
  return `BK-${stamp}-${randomPart}`;
}

function buildQuoteNumber() {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomPart = Math.floor(100000 + Math.random() * 900000);
  return `QT-${stamp}-${randomPart}`;
}

function createQuotationsService({ repository, logger, events }) {
  function assertAuthenticatedUser(user) {
    if (!user?.id) {
      throw new AppError(401, 'Authentication required', 'AUTH_REQUIRED');
    }
  }

  function toHours(value, fallback) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return fallback;
    }
    return Math.min(Math.floor(parsed), 720);
  }

  function normalizeCurrency(value, fallback = 'INR') {
    if (!value) {
      return fallback;
    }
    return String(value).trim().toUpperCase();
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
    const discount = roundCurrency(payload.discount ?? 0);
    if (discount < 0) {
      throw new AppError(400, 'discount cannot be negative', 'QUOTATION_INVALID_DISCOUNT');
    }

    const subTotal = roundCurrency(totalCost + marginAmount - discount);
    if (subTotal < 0) {
      throw new AppError(400, 'Subtotal cannot be negative', 'QUOTATION_INVALID_SUBTOTAL');
    }

    const taxPercent = payload.taxPercent !== undefined ? Number(payload.taxPercent) : null;
    if (taxPercent !== null && (!Number.isFinite(taxPercent) || taxPercent < 0 || taxPercent > 100)) {
      throw new AppError(400, 'taxPercent must be between 0 and 100', 'QUOTATION_INVALID_TAX_PERCENT');
    }

    const taxAmount = payload.taxAmount !== undefined
      ? roundCurrency(payload.taxAmount)
      : taxPercent !== null
        ? roundCurrency((subTotal * taxPercent) / 100)
        : roundCurrency(payload.tax ?? 0);

    if (taxAmount < 0) {
      throw new AppError(400, 'tax cannot be negative', 'QUOTATION_INVALID_TAX');
    }

    const finalPrice = roundCurrency(subTotal + taxAmount);
    if (finalPrice < 0) {
      throw new AppError(400, 'Final price cannot be negative', 'QUOTATION_INVALID_FINAL_PRICE');
    }

    return {
      components: normalizedComponents,
      totalCost,
      marginPercent: roundCurrency(marginPercent),
      marginAmount,
      discount,
      discountAmount: discount,
      tax: taxAmount,
      taxAmount,
      finalPrice,
    };
  }

  function calculateFinanceBreakdown(payload, pricing) {
    const supplierCost = roundCurrency(payload.supplierCost ?? pricing.totalCost);
    const supplierTaxAmount = roundCurrency(payload.supplierTaxAmount ?? 0);
    const markupAmount = roundCurrency(payload.markupAmount ?? pricing.marginAmount);
    const serviceFeeAmount = roundCurrency(payload.serviceFeeAmount ?? 0);
    const gstAmount = roundCurrency(payload.gstAmount ?? pricing.taxAmount);
    const tcsAmount = roundCurrency(payload.tcsAmount ?? 0);

    const totalSaleValue = roundCurrency(
      supplierCost +
      supplierTaxAmount +
      markupAmount +
      serviceFeeAmount +
      gstAmount +
      tcsAmount -
      roundCurrency(payload.discount ?? pricing.discountAmount),
    );

    return {
      supplierCost,
      supplierTaxAmount,
      markupAmount,
      serviceFeeAmount,
      gstAmount,
      tcsAmount,
      totalSaleValue: totalSaleValue < 0 ? 0 : totalSaleValue,
      costCurrency: normalizeCurrency(payload.costCurrency, 'INR'),
      clientCurrency: normalizeCurrency(payload.clientCurrency, 'INR'),
      supplierCurrency: normalizeCurrency(payload.supplierCurrency, 'INR'),
    };
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
      minMarginPercent: template.minMarginPercent,
      headerBranding: template.headerBranding,
      inclusions: template.inclusions,
      exclusions: template.exclusions,
      paymentTerms: template.paymentTerms,
      cancellationPolicy: template.cancellationPolicy,
      footerDisclaimer: template.footerDisclaimer,
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

  async function logVersion({ quotation, action, changeLog, editorId }) {
    try {
      await repository.createVersionLog({
        quotationId: quotation.id,
        versionNumber: quotation.versionNumber,
        editorId: editorId || null,
        action,
        changeLog: changeLog || {},
        snapshot: quotation,
      });
    } catch (error) {
      logger.error({ err: error, quotationId: quotation.id, action }, 'Failed to write quotation version log');
    }
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
      if (!template) {
        throw new AppError(404, 'Quotation template not found', 'QUOTATION_TEMPLATE_NOT_FOUND');
      }
    }

    const pricing = calculatePricing(payload);
    const finance = calculateFinanceBreakdown(payload, pricing);
    const minMarginPercent = roundCurrency(
      payload.minMarginPercent ?? template?.minMarginPercent ?? 0,
    );
    const requiresApproval = pricing.marginPercent < minMarginPercent;

    const now = new Date();
    const expiresInHours = payload.expiresInHours ? toHours(payload.expiresInHours, null) : null;
    const expiresAt = expiresInHours ? addHours(now, expiresInHours).toISOString() : null;

    const leadCreatedAt = lead.created_at || lead.createdAt;
    const leadCreatedTs = leadCreatedAt ? new Date(leadCreatedAt).getTime() : null;
    const leadToQuoteMinutes = leadCreatedTs
      ? Math.max(0, Math.round((now.getTime() - leadCreatedTs) / (60 * 1000)))
      : null;

    const created = await repository.create({
      parent_quote_id: payload.parentQuoteId || null,
      lead_id: payload.leadId,
      created_by: context.user.id,
      pricing_id: payload.pricingId || null,
      template_id: template?.id || payload.templateId || null,
      template_snapshot: buildTemplateSnapshot(template),
      quote_number: buildQuoteNumber(),
      total_cost: pricing.totalCost,
      margin_percent: pricing.marginPercent,
      margin_amount: pricing.marginAmount,
      discount: pricing.discount,
      discount_amount: pricing.discountAmount,
      tax: pricing.tax,
      tax_amount: pricing.taxAmount,
      final_price: pricing.finalPrice,
      supplier_cost: finance.supplierCost,
      supplier_tax_amount: finance.supplierTaxAmount,
      markup_amount: finance.markupAmount,
      service_fee_amount: finance.serviceFeeAmount,
      gst_amount: finance.gstAmount,
      tcs_amount: finance.tcsAmount,
      total_sale_value: finance.totalSaleValue,
      cost_currency: finance.costCurrency,
      client_currency: finance.clientCurrency,
      supplier_currency: finance.supplierCurrency,
      min_margin_percent: minMarginPercent,
      requires_approval: requiresApproval,
      lead_to_quote_minutes: leadToQuoteMinutes,
      expires_at: expiresAt,
      view_count: 0,
      version_number: 1,
      status: QUOTATION_STATUS.DRAFT,
      is_deleted: false,
      updated_at: now.toISOString(),
    });

    const items = await repository.replaceItems(created.id, pricing.components);
    const quotation = { ...created, items };

    await logVersion({
      quotation,
      action: 'CREATED',
      editorId: context.user.id,
      changeLog: {
        createdBy: context.user.id,
        requiresApproval,
      },
    });

    events.emitCreated(quotation);
    return quotation;
  }

  async function update(id, payload, context = {}) {
    assertAuthenticatedUser(context.user);

    const current = await getById(id, context, { includeItems: true });
    if (current.status !== QUOTATION_STATUS.DRAFT) {
      throw new AppError(409, 'Only DRAFT quotation can be edited', 'QUOTATION_LOCKED');
    }

    let template = null;
    const nextTemplateId = payload.templateId !== undefined ? payload.templateId : current.templateId;
    if (nextTemplateId) {
      template = await repository.findTemplateById(nextTemplateId);
      if (!template) {
        throw new AppError(404, 'Quotation template not found', 'QUOTATION_TEMPLATE_NOT_FOUND');
      }
    }

    const pricing = calculatePricing({
      components: payload.components || current.items || [],
      marginPercent: payload.marginPercent ?? current.marginPercent,
      discount: payload.discount ?? current.discount,
      taxAmount: payload.taxAmount,
      taxPercent: payload.taxPercent,
      tax: payload.tax,
    });
    const finance = calculateFinanceBreakdown(
      {
        ...current,
        ...payload,
        discount: payload.discount ?? current.discount,
      },
      pricing,
    );

    const minMarginPercent = roundCurrency(
      payload.minMarginPercent ?? current.minMarginPercent ?? template?.minMarginPercent ?? 0,
    );
    const requiresApproval = pricing.marginPercent < minMarginPercent;

    const updated = await repository.update(id, {
      pricing_id: payload.pricingId !== undefined ? payload.pricingId : current.pricingId,
      template_id: nextTemplateId || null,
      template_snapshot: template ? buildTemplateSnapshot(template) : current.templateSnapshot,
      total_cost: pricing.totalCost,
      margin_percent: pricing.marginPercent,
      margin_amount: pricing.marginAmount,
      discount: pricing.discount,
      discount_amount: pricing.discountAmount,
      tax: pricing.tax,
      tax_amount: pricing.taxAmount,
      final_price: pricing.finalPrice,
      supplier_cost: finance.supplierCost,
      supplier_tax_amount: finance.supplierTaxAmount,
      markup_amount: finance.markupAmount,
      service_fee_amount: finance.serviceFeeAmount,
      gst_amount: finance.gstAmount,
      tcs_amount: finance.tcsAmount,
      total_sale_value: finance.totalSaleValue,
      cost_currency: finance.costCurrency,
      client_currency: finance.clientCurrency,
      supplier_currency: finance.supplierCurrency,
      min_margin_percent: minMarginPercent,
      requires_approval: requiresApproval,
      version_number: Number(current.versionNumber || 1) + 1,
      updated_at: new Date().toISOString(),
    });

    const items = payload.components
      ? await repository.replaceItems(id, pricing.components)
      : current.items;

    const quotation = { ...updated, items };

    await logVersion({
      quotation,
      action: 'UPDATED',
      editorId: context.user.id,
      changeLog: {
        fields: Object.keys(payload || {}),
        requiresApproval,
      },
    });

    events.emitUpdated(quotation);
    return quotation;
  }

  async function generatePdf(id, payload = {}, context = {}) {
    assertAuthenticatedUser(context.user);
    await getById(id, context, { includeItems: false });

    const pdfUrl = payload.pdfUrl || `https://crm.local/quotations/${id}.pdf`;
    const updated = await repository.update(id, {
      pdf_url: pdfUrl,
      pdf_generated_at: new Date().toISOString(),
      pdf_generated_by: context.user.id,
      updated_at: new Date().toISOString(),
    });

    events.emitPdfGenerated({ id: updated.id, pdfUrl: updated.pdfUrl });
    return updated;
  }

  async function send(id, payload = {}, context = {}) {
    assertAuthenticatedUser(context.user);

    let quotation = await getById(id, context, { includeItems: true });

    if ([QUOTATION_STATUS.APPROVED, QUOTATION_STATUS.REJECTED, QUOTATION_STATUS.EXPIRED].includes(quotation.status)) {
      throw new AppError(409, 'Finalized quotation cannot be sent', 'QUOTATION_FINALIZED');
    }

    if (quotation.requiresApproval) {
      throw new AppError(409, 'Margin approval is required before sending', 'QUOTATION_MARGIN_APPROVAL_REQUIRED');
    }

    const now = new Date();
    const expiresInHours = payload.expiresInHours ? toHours(payload.expiresInHours, null) : null;
    const nextExpiresAt = expiresInHours
      ? addHours(now, expiresInHours).toISOString()
      : quotation.expiresAt || null;

    const updated = await repository.update(id, {
      status: QUOTATION_STATUS.SENT,
      sent_at: now.toISOString(),
      sent_by: context.user.id,
      pdf_url: quotation.pdfUrl || `https://crm.local/quotations/${id}.pdf`,
      expires_at: nextExpiresAt,
      updated_at: now.toISOString(),
    });

    if (updated.leadId) {
      await repository.updateLeadStatus(updated.leadId, 'QUOTED');
    }

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

    await logVersion({
      quotation: { ...updated, items: quotation.items },
      action: 'SENT',
      editorId: context.user.id,
      changeLog: {
        channel: payload.channel || 'MANUAL',
        recipientEmail: payload.recipientEmail || null,
        recipientPhone: payload.recipientPhone || null,
      },
    });

    events.emitSent({ id: updated.id, sentBy: context.user.id });
    return {
      ...updated,
      items: quotation.items,
    };
  }

  async function trackView(id, payload = {}, context = {}) {
    await getById(id, context, { includeItems: false });

    const view = await repository.createView({
      quotationId: id,
      ipAddress: payload.ipAddress || null,
      deviceInfo: payload.deviceInfo || null,
      userAgent: payload.userAgent || null,
    });

    const updated = await repository.incrementViewStats(id);

    events.emitViewed({
      id,
      viewedAt: view.viewedAt,
      viewCount: updated?.viewCount || 1,
    });

    return {
      quotationId: id,
      status: QUOTATION_STATUS.VIEWED,
      viewCount: updated?.viewCount || 1,
      lastViewedAt: updated?.lastViewedAt || view.viewedAt,
      viewedAt: view.viewedAt,
      ipAddress: view.ipAddress,
      deviceInfo: view.deviceInfo,
      userAgent: view.userAgent,
    };
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

    async approveMargin(id, payload = {}, context = {}) {
      assertAuthenticatedUser(context.user);
      await getById(id, context, { includeItems: false });

      const updated = await repository.update(id, {
        requires_approval: false,
        approved_by: context.user.id,
        approved_at: new Date().toISOString(),
        approval_note: payload.note || null,
        updated_at: new Date().toISOString(),
      });

      await logVersion({
        quotation: updated,
        action: 'MARGIN_APPROVED',
        editorId: context.user.id,
        changeLog: {
          note: payload.note || null,
        },
      });

      events.emitMarginApproved({ id: updated.id, approvedBy: context.user.id });
      return updated;
    },

    async transitionStatus(id, payload, context = {}) {
      assertAuthenticatedUser(context.user);
      const quotation = await getById(id, context, { includeItems: true });

      if (![QUOTATION_STATUS.APPROVED, QUOTATION_STATUS.REJECTED].includes(payload.status)) {
        throw new AppError(400, 'Only APPROVED/REJECTED transitions are supported', 'QUOTATION_STATUS_UNSUPPORTED');
      }

      if (![QUOTATION_STATUS.DRAFT, QUOTATION_STATUS.SENT, QUOTATION_STATUS.VIEWED].includes(quotation.status)) {
        throw new AppError(409, 'Invalid status transition', 'QUOTATION_INVALID_STATUS_TRANSITION');
      }

      if (payload.status === QUOTATION_STATUS.APPROVED && quotation.requiresApproval) {
        throw new AppError(409, 'Margin approval is required before approval', 'QUOTATION_MARGIN_APPROVAL_REQUIRED');
      }

      const updated = await repository.update(id, {
        status: payload.status,
        approval_note: payload.reason || quotation.approvalNote || null,
        locked_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      let booking = null;
      if (payload.status === QUOTATION_STATUS.APPROVED) {
        booking = await ensureBookingForApprovedQuote(updated, payload, context);
        if (updated.leadId) {
          await repository.updateLeadStatus(updated.leadId, 'CONVERTED');
        }
      }

      if (payload.status === QUOTATION_STATUS.REJECTED && updated.leadId) {
        await repository.updateLeadStatus(updated.leadId, 'LOST');
      }

      await logVersion({
        quotation: { ...updated, items: quotation.items },
        action: `STATUS_${payload.status}`,
        editorId: context.user.id,
        changeLog: {
          from: quotation.status,
          to: payload.status,
          reason: payload.reason || null,
        },
      });

      events.emitStatusChanged({ id: updated.id, status: updated.status });
      return {
        quotation: {
          ...updated,
          items: quotation.items,
        },
        booking,
      };
    },

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

    async runReminderAutomation(payload = {}, context = {}) {
      const notOpenedHours = toHours(payload.notOpenedHours, 24);
      const viewedNoActionHours = toHours(payload.viewedNoActionHours, 48);

      const now = new Date();
      const notOpenedBefore = addHours(now, -notOpenedHours).toISOString();
      const viewedNoActionBefore = addHours(now, -viewedNoActionHours).toISOString();

      const candidates = await repository.findReminderCandidates({
        notOpenedBefore,
        viewedNoActionBefore,
      });

      const reminders = [];
      let triggered = 0;
      let skipped = 0;

      for (const candidate of candidates) {
        if (!candidate.quotation?.id) {
          skipped += 1;
          continue;
        }

        await repository.createReminderLog({
          quotationId: candidate.quotation.id,
          reminderType: candidate.reminderType,
          triggeredBy: context.user?.id || null,
          metadata: {
            notOpenedHours,
            viewedNoActionHours,
          },
        });

        reminders.push({
          quotationId: candidate.quotation.id,
          reminderType: candidate.reminderType,
        });
        triggered += 1;

        events.emitReminderTriggered({
          quotationId: candidate.quotation.id,
          reminderType: candidate.reminderType,
          triggeredBy: context.user?.id || null,
        });
      }

      return {
        processed: candidates.length,
        triggered,
        skipped,
        reminders,
      };
    },

    async getLeadToQuoteReport(filters = {}, context = {}) {
      logger.debug({ module: 'quotations', requestId: context.requestId, filters }, 'Lead-to-quote report');
      return repository.getLeadToQuoteReport(filters);
    },

    async listTemplates(filters = {}) {
      return repository.findTemplates(filters);
    },

    async createTemplate(payload, context = {}) {
      assertAuthenticatedUser(context.user);

      const existing = await repository.findTemplateByCode(payload.code);
      if (existing) {
        throw new AppError(409, 'Template code already exists', 'QUOTATION_TEMPLATE_DUPLICATE_CODE');
      }

      return repository.createTemplate({
        code: payload.code,
        name: payload.name,
        template_type: payload.templateType,
        header_branding: payload.headerBranding || null,
        inclusions: payload.inclusions || null,
        exclusions: payload.exclusions || null,
        payment_terms: payload.paymentTerms || null,
        cancellation_policy: payload.cancellationPolicy || null,
        footer_disclaimer: payload.footerDisclaimer || null,
        min_margin_percent: roundCurrency(payload.minMarginPercent ?? 0),
        is_active: payload.isActive ?? true,
        created_by: context.user.id,
        updated_by: context.user.id,
        updated_at: new Date().toISOString(),
      });
    },

    async updateTemplate(id, payload, context = {}) {
      assertAuthenticatedUser(context.user);

      const existing = await repository.findTemplateById(id);
      if (!existing) {
        throw new AppError(404, 'Quotation template not found', 'QUOTATION_TEMPLATE_NOT_FOUND');
      }

      if (payload.code && payload.code !== existing.code) {
        const duplicate = await repository.findTemplateByCode(payload.code);
        if (duplicate && duplicate.id !== id) {
          throw new AppError(409, 'Template code already exists', 'QUOTATION_TEMPLATE_DUPLICATE_CODE');
        }
      }

      return repository.updateTemplate(id, {
        code: payload.code,
        name: payload.name,
        template_type: payload.templateType,
        header_branding: payload.headerBranding,
        inclusions: payload.inclusions,
        exclusions: payload.exclusions,
        payment_terms: payload.paymentTerms,
        cancellation_policy: payload.cancellationPolicy,
        footer_disclaimer: payload.footerDisclaimer,
        min_margin_percent: payload.minMarginPercent !== undefined
          ? roundCurrency(payload.minMarginPercent)
          : undefined,
        is_active: payload.isActive,
        updated_by: context.user.id,
        updated_at: new Date().toISOString(),
      });
    },
  });
}

module.exports = {
  createQuotationsService,
  QUOTATION_STATUS,
};
