import { AppError } from "../../core/errors/index.js";
import fs from "node:fs/promises";
import path from "node:path";

const QUOTATION_STATUS = Object.freeze({
  DRAFT: "DRAFT",
  PENDING: "PENDING",
  SENT: "SENT",
  VIEWED: "VIEWED",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  EXPIRED: "EXPIRED",
});

const RESPONSE_CATEGORY = Object.freeze({
  READY_PACKAGE: "READY_PACKAGE",
  CUSTOMIZED: "CUSTOMIZED",
  COMPLEX_ITINERARY: "COMPLEX_ITINERARY",
});

const RESPONSE_SLA_MINUTES = Object.freeze({
  [RESPONSE_CATEGORY.READY_PACKAGE]: 30,
  [RESPONSE_CATEGORY.CUSTOMIZED]: 120,
  [RESPONSE_CATEGORY.COMPLEX_ITINERARY]: 360,
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
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomPart = Math.floor(1000 + Math.random() * 9000);
  return `BK-${stamp}-${randomPart}`;
}

function buildQuoteNumber() {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomPart = Math.floor(100000 + Math.random() * 900000);
  return `QT-${stamp}-${randomPart}`;
}

function createQuotationsService({ repository, logger, events, s3 }) {
  function assertAuthenticatedUser(user) {
    if (!user?.id) {
      throw new AppError(401, "Authentication required", "AUTH_REQUIRED");
    }
  }

  function toHours(value, fallback) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return fallback;
    }
    return Math.min(Math.floor(parsed), 720);
  }

  function normalizeCurrency(value, fallback = "INR") {
    if (!value) {
      return fallback;
    }
    return String(value).trim().toUpperCase();
  }

  function normalizeResponseCategory(value) {
    if (!value) return null;
    const normalized = String(value).trim().toUpperCase();
    if (Object.values(RESPONSE_CATEGORY).includes(normalized)) {
      return normalized;
    }
    return null;
  }

  function inferResponseCategory({
    requestedCategory,
    existingCategory,
    templateType,
    itemCount,
  }) {
    const requested = normalizeResponseCategory(requestedCategory);
    if (requested) return requested;

    const existing = normalizeResponseCategory(existingCategory);
    if (existing) return existing;

    if (templateType === "READY_PACKAGE") {
      return RESPONSE_CATEGORY.READY_PACKAGE;
    }

    if (templateType === "CUSTOM_ITINERARY" && Number(itemCount || 0) >= 8) {
      return RESPONSE_CATEGORY.COMPLEX_ITINERARY;
    }

    return RESPONSE_CATEGORY.CUSTOMIZED;
  }

  function getSlaTargetMinutes(responseCategory) {
    return RESPONSE_SLA_MINUTES[responseCategory] || RESPONSE_SLA_MINUTES.CUSTOMIZED;
  }

  function calculatePricing(payload) {
    const components = Array.isArray(payload.components)
      ? payload.components
      : [];
    if (!components.length) {
      throw new AppError(
        400,
        "At least one component is required",
        "QUOTATION_COMPONENT_REQUIRED",
      );
    }

    const normalizedComponents = components.map((component) => ({
      itemType: component.itemType,
      description: component.description,
      cost: roundCurrency(component.cost),
    }));

    const totalCost = roundCurrency(
      normalizedComponents.reduce(
        (sum, item) => sum + roundCurrency(item.cost),
        0,
      ),
    );

    const marginPercent = Number(payload.marginPercent ?? 0);
    if (
      !Number.isFinite(marginPercent) ||
      marginPercent < 0 ||
      marginPercent > 100
    ) {
      throw new AppError(
        400,
        "marginPercent must be between 0 and 100",
        "QUOTATION_INVALID_MARGIN_PERCENT",
      );
    }

    const marginAmount = roundCurrency((totalCost * marginPercent) / 100);
    const discount = roundCurrency(payload.discount ?? 0);
    if (discount < 0) {
      throw new AppError(
        400,
        "discount cannot be negative",
        "QUOTATION_INVALID_DISCOUNT",
      );
    }

    const subTotal = roundCurrency(totalCost + marginAmount - discount);
    if (subTotal < 0) {
      throw new AppError(
        400,
        "Subtotal cannot be negative",
        "QUOTATION_INVALID_SUBTOTAL",
      );
    }

    const taxPercent =
      payload.taxPercent !== undefined ? Number(payload.taxPercent) : null;
    if (
      taxPercent !== null &&
      (!Number.isFinite(taxPercent) || taxPercent < 0 || taxPercent > 100)
    ) {
      throw new AppError(
        400,
        "taxPercent must be between 0 and 100",
        "QUOTATION_INVALID_TAX_PERCENT",
      );
    }

    const taxAmount =
      payload.taxAmount !== undefined
        ? roundCurrency(payload.taxAmount)
        : taxPercent !== null
          ? roundCurrency((subTotal * taxPercent) / 100)
          : roundCurrency(payload.tax ?? 0);

    if (taxAmount < 0) {
      throw new AppError(
        400,
        "tax cannot be negative",
        "QUOTATION_INVALID_TAX",
      );
    }

    const finalPrice = roundCurrency(subTotal + taxAmount);
    if (finalPrice < 0) {
      throw new AppError(
        400,
        "Final price cannot be negative",
        "QUOTATION_INVALID_FINAL_PRICE",
      );
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
    const supplierCost = roundCurrency(
      payload.supplierCost ?? pricing.totalCost,
    );
    const supplierTaxAmount = roundCurrency(payload.supplierTaxAmount ?? 0);
    const markupAmount = roundCurrency(
      payload.markupAmount ?? pricing.marginAmount,
    );
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
      costCurrency: normalizeCurrency(payload.costCurrency, "INR"),
      clientCurrency: normalizeCurrency(payload.clientCurrency, "INR"),
      supplierCurrency: normalizeCurrency(payload.supplierCurrency, "INR"),
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

  async function resolvePdfDocumentConstructor() {
    try {
      const imported = await import("pdfkit");
      return imported.default || imported;
    } catch (_error) {
      throw new AppError(
        500,
        "PDF engine is not configured. Install backend dependency: pdfkit",
        "QUOTATION_PDF_ENGINE_MISSING",
      );
    }
  }

  async function resolveMailerLibrary() {
    try {
      const imported = await import("nodemailer");
      return imported.default || imported;
    } catch (_error) {
      throw new AppError(
        500,
        "Email engine is not configured. Install backend dependency: nodemailer",
        "QUOTATION_EMAIL_ENGINE_MISSING",
      );
    }
  }

  function normalizeEmail(value) {
    if (!value) return null;
    const normalized = String(value).trim().toLowerCase();
    return normalized || null;
  }

  async function sendQuotationEmail({
    smtpSettings,
    toEmail,
    quotation,
    lead,
  }) {
    const smtpHost = String(smtpSettings?.smtpHost || "").trim();
    const smtpPort = Number(smtpSettings?.smtpPort || 587);
    const smtpUser = String(smtpSettings?.smtpUser || "").trim();
    const smtpPassword = String(smtpSettings?.smtpPassword || "").trim();
    const smtpFromEmail = String(smtpSettings?.smtpFromEmail || "").trim();

    if (!smtpHost || !smtpPort || !smtpFromEmail) {
      throw new AppError(
        500,
        "SMTP is not configured in Settings > Integrations",
        "QUOTATION_SMTP_NOT_CONFIGURED",
      );
    }

    const nodemailer = await resolveMailerLibrary();
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth:
        smtpUser && smtpPassword
          ? {
              user: smtpUser,
              pass: smtpPassword,
            }
          : undefined,
    });

    const customerName = lead?.full_name || lead?.fullName || "Customer";
    const subject = `Quotation ${quotation.quoteNumber || quotation.id} from GetFares`;
    const quotationUrl = quotation.pdfUrl || "";
    const text = [
      `Hi ${customerName},`,
      "",
      "Your travel quotation is ready.",
      quotationUrl ? `Quotation Link: ${quotationUrl}` : "",
      "",
      `Quote Number: ${quotation.quoteNumber || quotation.id}`,
      `Final Amount: INR ${Number(quotation.finalPrice || 0).toFixed(2)}`,
      "",
      "Thanks,",
      "GetFares Team",
    ]
      .filter(Boolean)
      .join("\n");
    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.5;">
        <p>Hi ${customerName},</p>
        <p>Your travel quotation is ready.</p>
        ${
          quotationUrl
            ? `<p><a href="${quotationUrl}" target="_blank" rel="noopener noreferrer">View Quotation PDF</a></p>`
            : ""
        }
        <p><strong>Quote Number:</strong> ${quotation.quoteNumber || quotation.id}</p>
        <p><strong>Final Amount:</strong> INR ${Number(quotation.finalPrice || 0).toFixed(2)}</p>
        <p>Thanks,<br/>GetFares Team</p>
      </div>
    `;

    const info = await transporter.sendMail({
      from: smtpFromEmail,
      to: toEmail,
      subject,
      text,
      html,
    });

    return {
      messageId: info?.messageId || null,
      accepted: Array.isArray(info?.accepted) ? info.accepted : [],
      rejected: Array.isArray(info?.rejected) ? info.rejected : [],
    };
  }

  function createPdfBufferFromDocument(PDFDocument, quotation) {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: "A4", margin: 50 });
      const chunks = [];
      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("error", reject);
      doc.on("end", () => resolve(Buffer.concat(chunks)));

      const lead = quotation.lead || {};
      const templateSnapshot = quotation.templateSnapshot || quotation.template || {};
      const companyName =
        String(templateSnapshot.headerBranding || "").trim() ||
        "GetFares Travel CRM";

      doc.fontSize(20).text(companyName, { align: "left" });
      doc.moveDown(0.5);
      doc.fontSize(10).fillColor("gray").text("Travel Quotation", { align: "left" });
      doc.fillColor("black");
      doc.moveDown();

      doc.fontSize(12).text(`Quote Number: ${quotation.quoteNumber || quotation.id}`);
      doc.text(`Status: ${quotation.status || "-"}`);
      doc.text(`Created At: ${quotation.createdAt || "-"}`);
      doc.text(`Expiry: ${quotation.expiresAt || "-"}`);
      doc.moveDown();

      doc.fontSize(13).text("Customer Details", { underline: true });
      doc.fontSize(11);
      doc.text(`Name: ${lead.fullName || "-"}`);
      doc.text(`Phone: ${lead.phone || "-"}`);
      doc.text(`Email: ${lead.email || "-"}`);
      doc.text(`Destination: ${quotation.destination?.name || "-"}`);
      doc.moveDown();

      doc.fontSize(13).text("Items", { underline: true });
      doc.fontSize(11);
      const items = Array.isArray(quotation.items) ? quotation.items : [];
      if (!items.length) {
        doc.text("No line items.");
      } else {
        items.forEach((item, index) => {
          doc.text(
            `${index + 1}. ${item.itemType || "ITEM"} | ${item.description || "-"} | INR ${Number(item.cost || 0).toFixed(2)}`,
          );
        });
      }
      doc.moveDown();

      doc.fontSize(13).text("Pricing Summary", { underline: true });
      doc.fontSize(11);
      doc.text(`Total Cost: INR ${Number(quotation.totalCost || 0).toFixed(2)}`);
      doc.text(`Margin %: ${Number(quotation.marginPercent || 0).toFixed(2)}`);
      doc.text(`Markup Amount: INR ${Number(quotation.markupAmount || 0).toFixed(2)}`);
      doc.text(`Tax: INR ${Number(quotation.taxAmount || quotation.tax || 0).toFixed(2)}`);
      doc.text(`Final Price: INR ${Number(quotation.finalPrice || 0).toFixed(2)}`);
      doc.moveDown();

      if (templateSnapshot.inclusions) {
        doc.fontSize(13).text("Inclusions", { underline: true });
        doc.fontSize(11).text(String(templateSnapshot.inclusions));
        doc.moveDown();
      }

      if (templateSnapshot.exclusions) {
        doc.fontSize(13).text("Exclusions", { underline: true });
        doc.fontSize(11).text(String(templateSnapshot.exclusions));
        doc.moveDown();
      }

      if (templateSnapshot.cancellationPolicy) {
        doc.fontSize(13).text("Cancellation Policy", { underline: true });
        doc.fontSize(11).text(String(templateSnapshot.cancellationPolicy));
        doc.moveDown();
      }

      if (quotation.importantNotes) {
        doc.fontSize(13).text("Important Notes", { underline: true });
        doc.fontSize(11).text(String(quotation.importantNotes));
        doc.moveDown();
      }

      doc.fontSize(10).fillColor("gray").text("Generated by GetFares CRM");
      doc.end();
    });
  }

  async function storeGeneratedPdf({ quotation, pdfBuffer, context }) {
    const fileSafeQuoteNumber = String(quotation.quoteNumber || quotation.id || "quote")
      .replace(/[^a-zA-Z0-9-_]/g, "_")
      .slice(0, 100);
    const fileName = `${fileSafeQuoteNumber}.pdf`;

    if (s3?.uploadBuffer) {
      try {
        const upload = await s3.uploadBuffer({
          buffer: pdfBuffer,
          contentType: "application/pdf",
          originalName: fileName,
          prefix: "quotations",
        });
        if (upload?.url) {
          return upload.url;
        }
      } catch (error) {
        logger.warn(
          { err: error, quotationId: quotation.id },
          "S3 upload failed for quotation PDF. Falling back to local uploads",
        );
      }
    }

    const uploadsDir = path.join(process.cwd(), "uploads", "quotations");
    await fs.mkdir(uploadsDir, { recursive: true });

    const fullPath = path.join(uploadsDir, fileName);
    await fs.writeFile(fullPath, pdfBuffer);

    const relativeUrl = `/uploads/quotations/${fileName}`;
    const requestBaseUrl = String(context?.requestBaseUrl || "").replace(/\/+$/g, "");
    return requestBaseUrl ? `${requestBaseUrl}${relativeUrl}` : relativeUrl;
  }

  async function attachRelations(quotation) {
    if (!quotation) {
      return quotation;
    }

    const [
      lead,
      template,
      pricing,
      createdByUser,
      approvedByUser,
      sentByUser,
      pdfGeneratedByUser,
      parentQuotation,
      booking,
    ] = await Promise.all([
      repository.findLeadDetailsById(quotation.leadId),
      repository.findTemplateById(quotation.templateId),
      repository.findPricingById(quotation.pricingId),
      repository.findUserById(quotation.createdBy),
      repository.findUserById(quotation.approvedBy),
      repository.findUserById(quotation.sentBy),
      repository.findUserById(quotation.pdfGeneratedBy),
      repository.findQuotationSummaryById(quotation.parentQuoteId),
      repository.findBookingSummaryByQuotationId(quotation.id),
    ]);

    const destinationId =
      lead?.destinationId || pricing?.destinationId || null;
    const destination = destinationId
      ? await repository.findDestinationById(destinationId)
      : null;

    return {
      ...quotation,
      lead: lead || null,
      template: template || null,
      pricing: pricing || null,
      destination: destination || null,
      createdByUser: createdByUser || null,
      approvedByUser: approvedByUser || null,
      sentByUser: sentByUser || null,
      pdfGeneratedByUser: pdfGeneratedByUser || null,
      parentQuotation: parentQuotation || null,
      booking: booking || null,
    };
  }

  async function getById(id, context = {}, options = {}) {
    logger.debug(
      { module: "quotations", requestId: context.requestId, id },
      "Get quotation by id",
    );
    const quotation = await repository.findById(id);

    if (!quotation) {
      throw new AppError(404, "Quotation not found", "QUOTATION_NOT_FOUND");
    }

    let response = quotation;

    if (options.includeItems !== false) {
      const items = await repository.findItemsByQuotationId(id);
      response = { ...response, items };
    }

    if (options.includeRelations) {
      response = await attachRelations(response);
    }

    return response;
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
      logger.error(
        { err: error, quotationId: quotation.id, action },
        "Failed to write quotation version log",
      );
    }
  }

  async function create(payload, context = {}) {
    assertAuthenticatedUser(context.user);

    const lead = await repository.findLeadById(payload.leadId);
    if (!lead) {
      throw new AppError(404, "Lead not found", "LEAD_NOT_FOUND");
    }

    let template = null;
    if (payload.templateId) {
      template = await repository.findTemplateById(payload.templateId);
      if (!template) {
        throw new AppError(
          404,
          "Quotation template not found",
          "QUOTATION_TEMPLATE_NOT_FOUND",
        );
      }
    }

    const pricing = calculatePricing(payload);
    const finance = calculateFinanceBreakdown(payload, pricing);
    const responseCategory = inferResponseCategory({
      requestedCategory: payload.responseCategory,
      templateType: template?.templateType,
      itemCount: pricing.components.length,
    });
    const responseSlaMinutes = getSlaTargetMinutes(responseCategory);
    const minMarginPercent = roundCurrency(
      payload.minMarginPercent ?? template?.minMarginPercent ?? 0,
    );
    const requiresApproval = pricing.marginPercent < minMarginPercent;

    const now = new Date();
    const expiresInHours = payload.expiresInHours
      ? toHours(payload.expiresInHours, null)
      : null;
    const expiresAt = expiresInHours
      ? addHours(now, expiresInHours).toISOString()
      : null;

    const leadCreatedAt = lead.created_at || lead.createdAt;
    const leadCreatedTs = leadCreatedAt
      ? new Date(leadCreatedAt).getTime()
      : null;
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
      lead_to_quote_sent_minutes: null,
      response_category: responseCategory,
      response_sla_minutes: responseSlaMinutes,
      response_sla_breached: false,
      expires_at: expiresAt,
      view_count: 0,
      version_number: 1,
      important_notes: payload.importantNotes || null,
      status: QUOTATION_STATUS.DRAFT,
      is_deleted: false,
      updated_at: now.toISOString(),
    });

    const items = await repository.replaceItems(created.id, pricing.components);
    let quotation = { ...created, items };

    await logVersion({
      quotation,
      action: "CREATED",
      editorId: context.user.id,
      changeLog: {
        createdBy: context.user.id,
        requiresApproval,
        responseCategory,
        responseSlaMinutes,
      },
    });

    quotation = await attachRelations(quotation);

    events.emitCreated(quotation);
    return quotation;
  }

  async function update(id, payload, context = {}) {
    assertAuthenticatedUser(context.user);

    const current = await getById(id, context, { includeItems: true });
    if (current.status !== QUOTATION_STATUS.DRAFT) {
      throw new AppError(
        409,
        "Only DRAFT quotation can be edited",
        "QUOTATION_LOCKED",
      );
    }

    let template = null;
    const nextTemplateId =
      payload.templateId !== undefined
        ? payload.templateId
        : current.templateId;
    if (nextTemplateId) {
      template = await repository.findTemplateById(nextTemplateId);
      if (!template) {
        throw new AppError(
          404,
          "Quotation template not found",
          "QUOTATION_TEMPLATE_NOT_FOUND",
        );
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
    const responseCategory = inferResponseCategory({
      requestedCategory: payload.responseCategory,
      existingCategory: current.responseCategory,
      templateType:
        template?.templateType || current.templateSnapshot?.templateType,
      itemCount: pricing.components.length,
    });
    const responseSlaMinutes = getSlaTargetMinutes(responseCategory);

    const minMarginPercent = roundCurrency(
      payload.minMarginPercent ??
        current.minMarginPercent ??
        template?.minMarginPercent ??
        0,
    );
    const requiresApproval = pricing.marginPercent < minMarginPercent;

    const updated = await repository.update(id, {
      pricing_id:
        payload.pricingId !== undefined ? payload.pricingId : current.pricingId,
      template_id: nextTemplateId || null,
      template_snapshot: template
        ? buildTemplateSnapshot(template)
        : current.templateSnapshot,
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
      response_category: responseCategory,
      response_sla_minutes: responseSlaMinutes,
      version_number: Number(current.versionNumber || 1) + 1,
      important_notes:
        payload.importantNotes !== undefined || payload.notes !== undefined
          ? payload.importantNotes || payload.notes || null
          : undefined,
    });

    const items = payload.components
      ? await repository.replaceItems(id, pricing.components)
      : current.items;

    let quotation = { ...updated, items };

    await logVersion({
      quotation,
      action: "UPDATED",
      editorId: context.user.id,
      changeLog: {
        fields: Object.keys(payload || {}),
        requiresApproval,
        responseCategory,
        responseSlaMinutes,
      },
    });

    quotation = await attachRelations(quotation);

    events.emitUpdated(quotation);
    return quotation;
  }

  async function generatePdf(id, payload = {}, context = {}) {
    assertAuthenticatedUser(context.user);
    let quotation = await getById(id, context, {
      includeItems: true,
      includeRelations: true,
    });

    let pdfUrl = payload.pdfUrl || null;
    if (!pdfUrl) {
      const PDFDocument = await resolvePdfDocumentConstructor();
      const pdfBuffer = await createPdfBufferFromDocument(PDFDocument, quotation);
      pdfUrl = await storeGeneratedPdf({
        quotation,
        pdfBuffer,
        context,
      });
    }

    const updated = await repository.update(id, {
      pdf_url: pdfUrl,
      pdf_generated_at: new Date().toISOString(),
      pdf_generated_by: context.user.id,
      updated_at: new Date().toISOString(),
    });

    quotation = {
      ...quotation,
      pdfUrl: updated.pdfUrl,
      pdfGeneratedAt: updated.pdfGeneratedAt,
      pdfGeneratedBy: updated.pdfGeneratedBy,
    };

    events.emitPdfGenerated({ id: updated.id, pdfUrl: updated.pdfUrl });
    return quotation;
  }

  async function send(id, payload = {}, context = {}) {
    assertAuthenticatedUser(context.user);

    let quotation = await getById(id, context, { includeItems: true });
    const deliveryChannel = String(payload.channel || "MANUAL").toUpperCase();

    if (
      [
        QUOTATION_STATUS.APPROVED,
        QUOTATION_STATUS.REJECTED,
        QUOTATION_STATUS.EXPIRED,
      ].includes(quotation.status)
    ) {
      throw new AppError(
        409,
        "Finalized quotation cannot be sent",
        "QUOTATION_FINALIZED",
      );
    }

    if (quotation.requiresApproval) {
      throw new AppError(
        409,
        "Margin approval is required before sending",
        "QUOTATION_MARGIN_APPROVAL_REQUIRED",
      );
    }

    const lead = quotation.leadId
      ? await repository.findLeadById(quotation.leadId)
      : null;
    const recipientEmail =
      normalizeEmail(payload.recipientEmail) ||
      normalizeEmail(lead?.email || lead?.email_address || null);
    if (deliveryChannel === "EMAIL" && !recipientEmail) {
      throw new AppError(
        400,
        "recipientEmail is required to send quotation via EMAIL",
        "QUOTATION_EMAIL_RECIPIENT_REQUIRED",
      );
    }

    const now = new Date();
    const expiresInHours = payload.expiresInHours
      ? toHours(payload.expiresInHours, null)
      : null;
    const nextExpiresAt = expiresInHours
      ? addHours(now, expiresInHours).toISOString()
      : quotation.expiresAt || null;
    const leadCreatedAt = lead?.created_at || lead?.createdAt || null;
    const leadCreatedTs = leadCreatedAt ? new Date(leadCreatedAt).getTime() : null;
    const leadToQuoteSentMinutes =
      leadCreatedTs !== null && Number.isFinite(leadCreatedTs)
        ? Math.max(0, Math.round((now.getTime() - leadCreatedTs) / 60000))
        : null;
    const responseCategory = inferResponseCategory({
      requestedCategory: payload.responseCategory,
      existingCategory: quotation.responseCategory,
      templateType: quotation.templateSnapshot?.templateType,
      itemCount: quotation.items?.length || 0,
    });
    const responseSlaMinutes =
      quotation.responseSlaMinutes || getSlaTargetMinutes(responseCategory);
    const responseSlaBreached =
      leadToQuoteSentMinutes !== null
        ? leadToQuoteSentMinutes > responseSlaMinutes
        : false;
    let pdfUrl = quotation.pdfUrl;
    if (!pdfUrl) {
      const PDFDocument = await resolvePdfDocumentConstructor();
      const pdfBuffer = await createPdfBufferFromDocument(PDFDocument, quotation);
      pdfUrl = await storeGeneratedPdf({
        quotation,
        pdfBuffer,
        context,
      });
    }

    let emailDelivery = null;
    if (deliveryChannel === "EMAIL") {
      const integrationSettings = await repository.findIntegrationSettings();
      emailDelivery = await sendQuotationEmail({
        smtpSettings: integrationSettings,
        toEmail: recipientEmail,
        quotation: {
          ...quotation,
          pdfUrl,
        },
        lead,
      });
    }

    const updated = await repository.update(id, {
      status: QUOTATION_STATUS.SENT,
      sent_at: now.toISOString(),
      sent_by: context.user.id,
      pdf_url: pdfUrl,
      expires_at: nextExpiresAt,
      response_category: responseCategory,
      response_sla_minutes: responseSlaMinutes,
      lead_to_quote_sent_minutes: leadToQuoteSentMinutes,
      response_sla_breached: responseSlaBreached,
      updated_at: now.toISOString(),
    });

    if (updated.leadId) {
      await repository.updateLeadStatus(updated.leadId, "QUOTED");
    }

    await repository.createSendLog({
      quotationId: id,
      sentBy: context.user.id,
      deliveryChannel,
      recipientEmail: recipientEmail || null,
      recipientPhone: payload.recipientPhone || null,
      metadata: {
        message: payload.message || null,
        emailDelivery,
      },
    });

    await logVersion({
      quotation: { ...updated, items: quotation.items },
      action: "SENT",
      editorId: context.user.id,
      changeLog: {
        channel: deliveryChannel,
        recipientEmail: recipientEmail || null,
        recipientPhone: payload.recipientPhone || null,
        responseCategory,
        responseSlaMinutes,
        leadToQuoteSentMinutes,
        responseSlaBreached,
        emailDelivery,
      },
    });

    events.emitSent({
      id: updated.id,
      sentBy: context.user.id,
      channel: deliveryChannel,
    });
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
    const existing = await repository.findBookingByQuotationId(quotation.id);
    if (existing) {
      return existing;
    }

    const lead = quotation.leadId
      ? await repository.findLeadById(quotation.leadId)
      : null;

    const travelStartDate =
      toDateOnly(payload.travelStartDate) ||
      toDateOnly(lead?.travel_date || lead?.travelDate) ||
      new Date().toISOString().slice(0, 10);
    const travelEndDate = toDateOnly(payload.travelEndDate) || travelStartDate;

    if (travelEndDate < travelStartDate) {
      throw new AppError(
        400,
        "travelEndDate cannot be before travelStartDate",
        "QUOTATION_INVALID_TRAVEL_DATES",
      );
    }

    return repository.createBooking({
      quotation_id: quotation.id,
      booking_number: buildBookingNumber(),
      travel_start_date: travelStartDate,
      travel_end_date: travelEndDate,
      total_amount: roundCurrency(quotation.finalPrice),
      cost_amount: roundCurrency(quotation.totalCost),
      advance_required: roundCurrency(quotation.finalPrice * 0.5),
      advance_received: 0,
      status: "PENDING",
      payment_status: "PENDING",
      created_by: context.user?.id || null,
    });
  }

  return Object.freeze({
    async list(filters = {}, context = {}) {
      logger.debug(
        { module: "quotations", requestId: context.requestId, filters },
        "List quotations",
      );
      const rows = await repository.findAll(filters);

      if (!rows.length) {
        return rows;
      }

      const [userMap, leadMap] = await Promise.all([
        repository.findUsersByIds(rows.map((row) => row.createdBy)),
        repository.findLeadsByIds(rows.map((row) => row.leadId)),
      ]);

      const destinationMap = await repository.findDestinationsByIds(
        [...leadMap.values()].map((lead) => lead?.destinationId),
      );

      const withUsers = rows.map((row) => {
        const lead = leadMap.get(row.leadId) || null;
        const destination = lead?.destinationId
          ? destinationMap.get(lead.destinationId) || null
          : null;

        return {
          ...row,
          lead,
          destination,
          createdByUser: userMap.get(row.createdBy) || null,
        };
      });

      if (!filters.includeItems) {
        return withUsers;
      }

      const result = [];
      for (const row of withUsers) {
        const items = await repository.findItemsByQuotationId(row.id);
        result.push({ ...row, items });
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
        action: "MARGIN_APPROVED",
        editorId: context.user.id,
        changeLog: {
          note: payload.note || null,
        },
      });

      events.emitMarginApproved({
        id: updated.id,
        approvedBy: context.user.id,
      });
      return updated;
    },

    async transitionStatus(id, payload, context = {}) {
      assertAuthenticatedUser(context.user);
      const quotation = await getById(id, context, { includeItems: true });

      if (
        ![QUOTATION_STATUS.APPROVED, QUOTATION_STATUS.REJECTED].includes(
          payload.status,
        )
      ) {
        throw new AppError(
          400,
          "Only APPROVED/REJECTED transitions are supported",
          "QUOTATION_STATUS_UNSUPPORTED",
        );
      }

      if (
        ![
          QUOTATION_STATUS.DRAFT,
          QUOTATION_STATUS.SENT,
          QUOTATION_STATUS.VIEWED,
        ].includes(quotation.status)
      ) {
        throw new AppError(
          409,
          "Invalid status transition",
          "QUOTATION_INVALID_STATUS_TRANSITION",
        );
      }

      if (
        payload.status === QUOTATION_STATUS.APPROVED &&
        quotation.requiresApproval
      ) {
        throw new AppError(
          409,
          "Margin approval is required before approval",
          "QUOTATION_MARGIN_APPROVAL_REQUIRED",
        );
      }

      const updated = await repository.update(id, {
        status: payload.status,
        approval_note: payload.reason || quotation.approvalNote || null,
        locked_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const booking = null;
      if (payload.status === QUOTATION_STATUS.APPROVED && updated.leadId) {
        await repository.updateLeadStatus(updated.leadId, "CONVERTED");
      }

      if (payload.status === QUOTATION_STATUS.REJECTED && updated.leadId) {
        await repository.updateLeadStatus(updated.leadId, "LOST");
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
      const viewedNoActionBefore = addHours(
        now,
        -viewedNoActionHours,
      ).toISOString();

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
      logger.debug(
        { module: "quotations", requestId: context.requestId, filters },
        "Lead-to-quote report",
      );
      return repository.getLeadToQuoteReport(filters);
    },

    async listTemplates(filters = {}, context = {}) {
      logger.debug(
        { module: "quotations", requestId: context.requestId, filters },
        "List quotation templates",
      );
      return repository.findTemplates(filters);
    },

    async createTemplate(payload, context = {}) {
      assertAuthenticatedUser(context.user);

      const existing = await repository.findTemplateByCode(payload.code);
      if (existing) {
        throw new AppError(
          409,
          "Template code already exists",
          "QUOTATION_TEMPLATE_DUPLICATE_CODE",
        );
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
        throw new AppError(
          404,
          "Quotation template not found",
          "QUOTATION_TEMPLATE_NOT_FOUND",
        );
      }

      if (payload.code && payload.code !== existing.code) {
        const duplicate = await repository.findTemplateByCode(payload.code);
        if (duplicate && duplicate.id !== id) {
          throw new AppError(
            409,
            "Template code already exists",
            "QUOTATION_TEMPLATE_DUPLICATE_CODE",
          );
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
        min_margin_percent:
          payload.minMarginPercent !== undefined
            ? roundCurrency(payload.minMarginPercent)
            : undefined,
        is_active: payload.isActive,
        updated_by: context.user.id,
        updated_at: new Date().toISOString(),
      });
    },
  });
}

export {
  createQuotationsService,
  QUOTATION_STATUS,
};
