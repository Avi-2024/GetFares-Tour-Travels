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

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
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

function formatDurationLabel(duration, fallbackNights) {
  const raw = String(duration || "").trim();
  if (raw) {
    return raw;
  }

  const nights = Math.max(0, Number(fallbackNights) || 0);
  if (!nights) {
    return "";
  }

  return `${nights}N/${nights + 1}D`;
}

function addPdfTextSection(doc, title, value) {
  const text = String(value || "").trim();
  if (!text) {
    return false;
  }

  doc.fontSize(13).text(title, { underline: true });
  doc.fontSize(11).text(text);
  doc.moveDown();
  return true;
}

function normalizeText(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const text = String(value).trim();
  return text || null;
}

function toWholeNumber(value, fallback = null) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.max(0, Math.floor(parsed));
}

function buildDurationValue(nights, days) {
  const safeNights = toWholeNumber(nights, null);
  const safeDays = toWholeNumber(days, null);

  if (safeNights !== null && safeDays !== null) {
    return `${safeNights}N/${safeDays}D`;
  }
  if (safeNights !== null) {
    return `${safeNights}N`;
  }
  if (safeDays !== null) {
    return `${safeDays}D`;
  }

  return null;
}

function normalizeItineraryItems(items) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map((item, index) => ({
      id: normalizeText(item?.id) || `day-${index + 1}`,
      day: normalizeText(item?.day) || `Day ${index + 1}`,
      title: normalizeText(item?.title),
      description: normalizeText(item?.description),
    }))
    .filter(
      (item) => item.day || item.title || item.description,
    );
}

  function extractQuotationContentFields(builderSnapshot = null) {
  const builder = isPlainObject(builderSnapshot) ? builderSnapshot : null;
  const content = isPlainObject(builder?.content) ? builder.content : {};
  const lead = isPlainObject(builder?.lead) ? builder.lead : {};
  const packageDetails = isPlainObject(builder?.package) ? builder.package : {};
  const itineraryItems = normalizeItineraryItems(builder?.itineraryItems);
  const durationNights = toWholeNumber(
    builder?.durationNights ?? builder?.nights,
    null,
  );
  const durationDays = toWholeNumber(
    builder?.durationDays,
    itineraryItems.length || null,
  );
  const durationLabel =
    normalizeText(builder?.durationLabel) ||
    normalizeText(packageDetails?.duration) ||
    buildDurationValue(durationNights, durationDays) ||
    formatDurationLabel(null, durationNights);

  return {
    source_package_id: normalizeText(packageDetails?.id),
    quotation_title:
      normalizeText(builder?.quotationTitle) ||
      normalizeText(packageDetails?.name ?? packageDetails?.title),
    trip_destination:
      normalizeText(builder?.destination) ||
      normalizeText(lead.destination ?? lead.destinationName),
    duration_nights: durationNights,
    duration_days: durationDays,
    duration_label: durationLabel || null,
    travel_start_date:
      toDateOnly(builder?.travelStartDate ?? lead.travelDate) || null,
    itinerary: itineraryItems.length ? itineraryItems : null,
    inclusions: normalizeText(content.inclusions),
    exclusions: normalizeText(content.exclusions),
    hotel_details: normalizeText(content.hotelDetails),
    visa_details: normalizeText(content.visaDetails),
    payment_terms: normalizeText(content.paymentTerms),
    cancellation_policy: normalizeText(content.cancellationPolicy),
    };
  }

  function ensureQuotationTravelStartDate(quotationContent = {}, lead = null) {
    const leadTravelDate = toDateOnly(
      lead?.travelDate ?? lead?.travel_date ?? null,
    );
    const resolvedTravelStartDate =
      quotationContent?.travel_start_date || leadTravelDate || null;

    if (!resolvedTravelStartDate) {
      throw new AppError(
        400,
        "travelStartDate is required. Add Travel Date on the lead or quotation.",
        "QUOTATION_TRAVEL_START_DATE_REQUIRED",
      );
    }

    return resolvedTravelStartDate;
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

function createQuotationsService({ repository, leadsRepository, logger, events, config, s3, mailService }) {
  function normalizeRoleToken(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, "_");
  }

  function isManagerRole(value) {
    const role = normalizeRoleToken(value);
    return role === "manager" || role === "department_head" || role === "team_lead";
  }

  function isAgentRole(value) {
    const role = normalizeRoleToken(value);
    return (
      role === "agent" ||
      role === "sales_consultant" ||
      role === "visa_executive" ||
      role === "holiday_consultant"
    );
  }

  function isSuperAdminRole(value) {
    const role = normalizeRoleToken(value);
    return role === "super_admin" || role === "superadmin";
  }

  function isFullAccessRole(value) {
    const role = normalizeRoleToken(value);
    return isSuperAdminRole(role) || role === "admin" || role === "accounts";
  }

  function assertAuthenticatedUser(user) {
    if (!user?.id) {
      throw new AppError(401, "Authentication required", "AUTH_REQUIRED");
    }
  }

  async function canViewQuotation(quotation, lead, context = {}) {
    const userId = context.user?.id || null;
    const userRole = normalizeRoleToken(context.user?.role);
    const leadAssigneeId = lead?.assignedTo || lead?.assigned_to || null;

    if (!userId) {
      return false;
    }

    if (isFullAccessRole(userRole)) {
      return true;
    }

    if (isAgentRole(userRole)) {
      return Boolean(leadAssigneeId && leadAssigneeId === userId);
    }

    if (isManagerRole(userRole)) {
      const managedAgentIds = typeof leadsRepository?.findManagedAgentIds === "function"
        ? await leadsRepository.findManagedAgentIds(userId)
        : [];
      const visibleAssigneeIds = new Set([userId, ...managedAgentIds].filter(Boolean));
      if (!leadAssigneeId) {
        return true;
      }
      return visibleAssigneeIds.has(leadAssigneeId);
    }

    return true;
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

  function resolveDisplayCurrency(quotation, templateSnapshot = null) {
    const snapshotCurrency =
      templateSnapshot?.currency ??
      templateSnapshot?.builderSnapshot?.currency ??
      templateSnapshot?.pricing?.clientCurrency ??
      templateSnapshot?.pricing?.costCurrency ??
      templateSnapshot?.pricing?.supplierCurrency;

    const candidates = [
      quotation?.clientCurrency,
      quotation?.costCurrency,
      quotation?.supplierCurrency,
      quotation?.currency,
      snapshotCurrency,
    ];

    for (const candidate of candidates) {
      const normalized = normalizeCurrency(candidate, "");
      if (/^[A-Z]{3}$/.test(normalized)) {
        return normalized;
      }
    }
    return "INR";
  }

  function formatAmountWithCurrency(amount, currency) {
    return `${currency} ${Number(amount || 0).toFixed(2)}`;
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

    const componentCost = roundCurrency(
      normalizedComponents.reduce(
        (sum, item) => sum + roundCurrency(item.cost),
        0,
      ),
    );
    const totalCost = roundCurrency(
      payload.supplierCost !== undefined ? payload.supplierCost : componentCost,
    );
    if (totalCost < 0) {
      throw new AppError(
        400,
        "supplierCost cannot be negative",
        "QUOTATION_INVALID_SUPPLIER_COST",
      );
    }

    const marginAmount = roundCurrency(
      payload.markupAmount !== undefined
        ? payload.markupAmount
        : (totalCost * marginPercent) / 100,
    );
    if (marginAmount < 0) {
      throw new AppError(
        400,
        "markupAmount cannot be negative",
        "QUOTATION_INVALID_MARKUP_AMOUNT",
      );
    }

    const serviceFeeAmount = roundCurrency(payload.serviceFeeAmount ?? 0);
    if (serviceFeeAmount < 0) {
      throw new AppError(
        400,
        "serviceFeeAmount cannot be negative",
        "QUOTATION_INVALID_SERVICE_FEE",
      );
    }

    const discount = roundCurrency(payload.discount ?? 0);
    if (discount < 0) {
      throw new AppError(
        400,
        "discount cannot be negative",
        "QUOTATION_INVALID_DISCOUNT",
      );
    }

    const subTotal = roundCurrency(
      totalCost + marginAmount + serviceFeeAmount - discount,
    );
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
      serviceFeeAmount,
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
    return buildQuotationSnapshot(template, null);
  }

  function buildQuotationSnapshot(template, builderSnapshot = null) {
    const source = isPlainObject(template) ? template : null;
    const builder = isPlainObject(builderSnapshot) ? builderSnapshot : null;
    const content = isPlainObject(builder?.content) ? builder.content : {};
    const lead = isPlainObject(builder?.lead) ? builder.lead : {};
    const supplierDetails = isPlainObject(builder?.supplierDetails)
      ? builder.supplierDetails
      : null;
    const packageDetails = isPlainObject(builder?.package) ? builder.package : null;
    const quotationContent = extractQuotationContentFields(builderSnapshot);

    const snapshot = {
      id: source?.id ?? null,
      code: source?.code ?? null,
      name: source?.name ?? null,
      templateType: source?.templateType ?? source?.template_type ?? null,
      minMarginPercent:
        source
          ? source.minMarginPercent ?? source.min_margin_percent ?? 0
          : null,
      headerBranding:
        content.headerBranding ??
        source?.headerBranding ??
        source?.header_branding ??
        null,
      inclusions:
        quotationContent.inclusions ??
        content.inclusions ??
        source?.inclusions ??
        null,
      exclusions:
        quotationContent.exclusions ??
        content.exclusions ??
        source?.exclusions ??
        null,
      paymentTerms:
        content.paymentTerms ??
        source?.paymentTerms ??
        source?.payment_terms ??
        null,
      cancellationPolicy:
        content.cancellationPolicy ??
        source?.cancellationPolicy ??
        source?.cancellation_policy ??
        null,
      footerDisclaimer:
        content.footerDisclaimer ??
        source?.footerDisclaimer ??
        source?.footer_disclaimer ??
        null,
      quotationTitle: quotationContent.quotation_title,
      quoteReference: builder?.quoteReference ?? null,
      versionLabel: builder?.versionLabel ?? null,
      customerName:
        builder?.customerName ?? lead.fullName ?? lead.name ?? null,
      customerEmail: builder?.customerEmail ?? lead.email ?? null,
      destination:
        quotationContent.trip_destination ??
        builder?.destination ??
        lead.destination ??
        lead.destinationName ??
        null,
      travelStartDate:
        quotationContent.travel_start_date ??
        builder?.travelStartDate ??
        null,
      travelEndDate: builder?.travelEndDate ?? null,
      nights: builder?.nights ?? null,
      durationNights: quotationContent.duration_nights,
      durationDays: quotationContent.duration_days,
      durationLabel: quotationContent.duration_label,
      adults: builder?.adults ?? null,
      validUntil: builder?.validUntil ?? null,
      packageType: builder?.packageType ?? null,
      currency: builder?.currency ?? null,
      lead: builder ? lead : null,
      sourcePackageId: quotationContent.source_package_id,
      supplierDetails,
      supplier: supplierDetails,
      package: packageDetails,
      hotelDetails: quotationContent.hotel_details,
      visaDetails: quotationContent.visa_details,
      paymentTerms:
        quotationContent.payment_terms ??
        content.paymentTerms ??
        source?.paymentTerms ??
        source?.payment_terms ??
        null,
      cancellationPolicy:
        quotationContent.cancellation_policy ??
        content.cancellationPolicy ??
        source?.cancellationPolicy ??
        source?.cancellation_policy ??
        null,
      enabledServices: Array.isArray(builder?.enabledServices)
        ? builder.enabledServices
        : [],
      serviceRows: Array.isArray(builder?.serviceRows) ? builder.serviceRows : [],
      addOnServices: Array.isArray(builder?.addOnServices)
        ? builder.addOnServices
        : [],
      itineraryItems: quotationContent.itinerary || [],
      pricing: isPlainObject(builder?.pricing) ? builder.pricing : null,
      services: isPlainObject(builder?.services) ? builder.services : null,
      builderSnapshot: builder,
    };

    const hasValues = Object.values(snapshot).some((value) => {
      if (Array.isArray(value)) {
        return value.length > 0;
      }
      if (isPlainObject(value)) {
        return Object.keys(value).length > 0;
      }
      return value !== null && value !== undefined && value !== "";
    });

    return hasValues ? snapshot : null;
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
    toEmail,
    quotation,
    lead,
  }) {
    const customerName = lead?.full_name || lead?.fullName || "Customer";
    const subject = `Quotation ${quotation.quoteNumber || quotation.id} from Get2Vacations`;
    const quotationUrl = quotation.pdfUrl || "";
    const templateSnapshot = quotation.templateSnapshot || quotation.template || null;
    const displayCurrency = resolveDisplayCurrency(quotation, templateSnapshot);
    
    const text = [
      `Hi ${customerName},`,
      "",
      "Your travel quotation is ready.",
      quotationUrl ? `Quotation Link: ${quotationUrl}` : "",
      "",
      `Quote Number: ${quotation.quoteNumber || quotation.id}`,
      `Final Amount: ${formatAmountWithCurrency(quotation.finalPrice, displayCurrency)}`,
      "",
      "Thanks,",
      "Get2Vacations Team",
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
        <p><strong>Final Amount:</strong> ${formatAmountWithCurrency(quotation.finalPrice, displayCurrency)}</p>
        <p>Thanks,<br/>Get2Vacations Team</p>
      </div>
    `;

    const result = await mailService.sendMail({
      to: toEmail,
      subject,
      text,
      html,
    });

    return {
      messageId: result?.messageId || null,
      accepted: [toEmail],
      rejected: [],
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
      const snapshotLead =
        templateSnapshot.lead || templateSnapshot.builderSnapshot?.lead || {};
      const packageSnapshot =
        templateSnapshot.package || templateSnapshot.builderSnapshot?.package || {};
      const quotationTitle =
        quotation.quotationTitle ||
        templateSnapshot.quotationTitle ||
        packageSnapshot.name ||
        packageSnapshot.title ||
        "-";
      const customerName =
        templateSnapshot.customerName ||
        snapshotLead.fullName ||
        snapshotLead.name ||
        lead.fullName ||
        "-";
      const customerPhone = snapshotLead.phone || lead.phone || "-";
      const customerEmail =
        templateSnapshot.customerEmail || snapshotLead.email || lead.email || "-";
      const leadDisplayId =
        normalizeText(snapshotLead.leadCode) ||
        normalizeText(snapshotLead.leadId) ||
        normalizeText(lead.leadCode) ||
        normalizeText(lead.leadId) ||
        "-";
      const destinationName =
        quotation.tripDestination ||
        quotation.destination?.name ||
        templateSnapshot.destination ||
        snapshotLead.destination ||
        "-";
      const packageName =
        packageSnapshot.name || packageSnapshot.title || quotationTitle;
      const packageKind = String(
        packageSnapshot.kind ||
          packageSnapshot.packageKind ||
          templateSnapshot.packageType ||
          "",
      )
        .trim()
        .replace(/_/g, " ");
      const packageDuration =
        quotation.durationLabel ||
        templateSnapshot.durationLabel ||
        formatDurationLabel(
          packageSnapshot.duration,
          quotation.durationNights ?? templateSnapshot.durationNights ?? templateSnapshot.nights,
        ) ||
        "-";
      const travelStartDate =
        quotation.travelStartDate ||
        templateSnapshot.travelStartDate ||
        snapshotLead.travelDate ||
        "-";
      const travelEndDate = templateSnapshot.travelEndDate || "-";
      const validUntil = templateSnapshot.validUntil || quotation.expiresAt || "-";
      const adults = Math.max(0, Number(templateSnapshot.adults || 0));
      const companyName =
        String(templateSnapshot.headerBranding || "").trim() ||
        "GetFares Travel CRM";
      const displayCurrency = resolveDisplayCurrency(quotation, templateSnapshot);

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
      doc.text(`Name: ${customerName}`);
      doc.text(`Lead ID: ${leadDisplayId}`);
      doc.text(`Phone: ${customerPhone}`);
      doc.text(`Email: ${customerEmail}`);
      doc.text(`Destination: ${destinationName}`);
      doc.moveDown();

      const packageLines = [
        quotationTitle !== "-" ? `Quotation Title: ${quotationTitle}` : "",
        quotation.sourcePackageId && packageName && packageName !== quotationTitle
          ? `Source Package: ${packageName}`
          : "",
        packageKind ? `Package Type: ${packageKind}` : "",
        packageDuration !== "-" ? `Duration: ${packageDuration}` : "",
        adults > 0 ? `Travellers: ${adults} ${adults === 1 ? "adult" : "adults"}` : "",
        travelStartDate !== "-" ? `Travel Date: ${travelStartDate}` : "",
        travelEndDate !== "-" ? `Travel End Date: ${travelEndDate}` : "",
        validUntil !== "-" ? `Valid Until: ${validUntil}` : "",
      ].filter(Boolean);

      if (packageLines.length) {
        doc.fontSize(13).text("Trip Details", { underline: true });
        doc.fontSize(11);
        packageLines.forEach((line) => doc.text(line));
        doc.moveDown();
      }

      doc.fontSize(13).text("Items", { underline: true });
      doc.fontSize(11);
      const items = Array.isArray(quotation.items) ? quotation.items : [];
      if (!items.length) {
        doc.text("No line items.");
      } else {
        items.forEach((item, index) => {
          doc.text(
            `${index + 1}. ${item.itemType || "ITEM"} | ${item.description || "-"}`,
          );
        });
      }
      doc.moveDown();

      doc.fontSize(13).text("Quotation Amount", { underline: true });
      doc.fontSize(11);
      doc.text(`Final Amount: ${formatAmountWithCurrency(quotation.finalPrice, displayCurrency)}`);
      doc.moveDown();

      const itineraryItems = Array.isArray(quotation.itinerary)
        ? quotation.itinerary
        : Array.isArray(templateSnapshot.itineraryItems)
          ? templateSnapshot.itineraryItems
        : [];
      if (itineraryItems.length) {
        doc.fontSize(13).text("Itinerary Snapshot", { underline: true });
        doc.fontSize(11);
        itineraryItems.forEach((item, index) => {
          const day = String(item?.day || `Day ${index + 1}`);
          const title = String(item?.title || "").trim();
          const description = String(item?.description || "").trim();
          doc.text(`${day}: ${title || day}`);
          if (description) {
            doc.text(description, {
              indent: 14,
            });
          }
        });
        doc.moveDown();
      }

      addPdfTextSection(
        doc,
        "Hotel Details",
        quotation.hotelDetails ?? templateSnapshot.hotelDetails,
      );
      addPdfTextSection(
        doc,
        "Visa Details",
        quotation.visaDetails ?? templateSnapshot.visaDetails,
      );
      addPdfTextSection(
        doc,
        "Inclusions",
        quotation.inclusions ?? templateSnapshot.inclusions,
      );
      addPdfTextSection(
        doc,
        "Exclusions",
        quotation.exclusions ?? templateSnapshot.exclusions,
      );
      addPdfTextSection(
        doc,
        "Payment Terms",
        quotation.paymentTerms ?? templateSnapshot.paymentTerms,
      );
      addPdfTextSection(
        doc,
        "Cancellation Policy",
        quotation.cancellationPolicy ?? templateSnapshot.cancellationPolicy,
      );

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

    const azureConfigured = Boolean(
      config?.azureBlob?.connectionString && config?.azureBlob?.containerName,
    );

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
        if (azureConfigured) {
          throw new AppError(
            500,
            "Blob upload returned no URL",
            "BLOB_UPLOAD_NO_URL",
          );
        }
      } catch (error) {
        if (azureConfigured) {
          throw error;
        }
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

    const accessLead = response.lead || (response.leadId
      ? await repository.findLeadById(response.leadId)
      : null);
    const allowed = await canViewQuotation(response, accessLead, context);
    if (!allowed) {
      throw new AppError(404, "Quotation not found", "QUOTATION_NOT_FOUND");
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
    const quotationContent = extractQuotationContentFields(payload.builderSnapshot);
    quotationContent.travel_start_date = ensureQuotationTravelStartDate(
      quotationContent,
      lead,
    );

    const created = await repository.create({
      parent_quote_id: payload.parentQuoteId || null,
      lead_id: payload.leadId,
      created_by: context.user.id,
      pricing_id: payload.pricingId || null,
      template_id: template?.id || payload.templateId || null,
      ...quotationContent,
      template_snapshot: buildQuotationSnapshot(
        template,
        payload.builderSnapshot,
      ),
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
    if (current.status === QUOTATION_STATUS.APPROVED) {
      throw new AppError(
        409,
        "Approved quotation cannot be edited",
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
      supplierCost: payload.supplierCost ?? current.supplierCost,
      markupAmount: payload.markupAmount ?? current.markupAmount,
      serviceFeeAmount: payload.serviceFeeAmount ?? current.serviceFeeAmount,
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
    const nextBuilderSnapshot =
      payload.builderSnapshot ??
      current.templateSnapshot?.builderSnapshot ??
      null;
    const quotationContent = extractQuotationContentFields(nextBuilderSnapshot);
    quotationContent.travel_start_date = ensureQuotationTravelStartDate(
      quotationContent,
      current.lead || null,
    );

    const updated = await repository.update(id, {
      pricing_id:
        payload.pricingId !== undefined ? payload.pricingId : current.pricingId,
      template_id: nextTemplateId || null,
      ...quotationContent,
      template_snapshot: buildQuotationSnapshot(
        template || current.templateSnapshot,
        nextBuilderSnapshot,
      ),
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

  async function uploadPdf(id, payload = {}, context = {}) {
    assertAuthenticatedUser(context.user);
    const buffer = payload?.buffer;
    if (!buffer || !Buffer.isBuffer(buffer) || buffer.length === 0) {
      throw new AppError(400, "PDF file is required", "QUOTATION_PDF_REQUIRED");
    }

    const quotation = await getById(id, context, {
      includeItems: true,
      includeRelations: true,
    });

    const pdfUrl = await storeGeneratedPdf({
      quotation,
      pdfBuffer: buffer,
      context,
    });

    const updated = await repository.update(id, {
      pdf_url: pdfUrl,
      pdf_generated_at: new Date().toISOString(),
      pdf_generated_by: context.user.id,
      updated_at: new Date().toISOString(),
    });

    const next = {
      ...quotation,
      pdfUrl: updated.pdfUrl,
      pdfGeneratedAt: updated.pdfGeneratedAt,
      pdfGeneratedBy: updated.pdfGeneratedBy,
    };

    events.emitPdfGenerated({ id: updated.id, pdfUrl: updated.pdfUrl });
    return next;
  }

  async function send(id, payload = {}, context = {}) {
    assertAuthenticatedUser(context.user);

    let quotation = await getById(id, context, { includeItems: true });
    const deliveryChannel = String(payload.channel || "MANUAL").toUpperCase();

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
      emailDelivery = await sendQuotationEmail({
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

      const visibleRows = [];
      for (const row of withUsers) {
        const allowed = await canViewQuotation(row, row.lead, context);
        if (allowed) {
          visibleRows.push(row);
        }
      }

      if (!filters.includeItems) {
        return visibleRows;
      }

      const result = [];
      for (const row of visibleRows) {
        const items = await repository.findItemsByQuotationId(row.id);
        result.push({ ...row, items });
      }
      return result;
    },

    getById,
    create,
    update,
    generatePdf,
    uploadPdf,
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

      const currentStatus = String(quotation.status ?? "")
        .trim()
        .toUpperCase();
      const allowedFrom = new Set([
        QUOTATION_STATUS.DRAFT,
        QUOTATION_STATUS.PENDING,
        QUOTATION_STATUS.SENT,
        QUOTATION_STATUS.VIEWED,
      ]);
      if (!allowedFrom.has(currentStatus)) {
        throw new AppError(
          409,
          `Invalid status transition (current: ${currentStatus || "unknown"})`,
          "QUOTATION_INVALID_STATUS_TRANSITION",
        );
      }

      const sentOrViewed = new Set([
        QUOTATION_STATUS.SENT,
        QUOTATION_STATUS.VIEWED,
      ]);
      if (
        payload.status === QUOTATION_STATUS.APPROVED &&
        quotation.requiresApproval &&
        !sentOrViewed.has(currentStatus)
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

      const fullPayload = {
        code: payload.code,
        name: payload.name,
        template_type: payload.templateType,
        header_branding: payload.headerBranding || null,
        inclusions: payload.inclusions || null,
        exclusions: payload.exclusions || null,
        itinerary: Array.isArray(payload.itinerary) ? payload.itinerary : null,
        hotel_details: payload.hotelDetails || null,
        visa_details: payload.visaDetails || null,
        payment_terms: payload.paymentTerms || null,
        cancellation_policy: payload.cancellationPolicy || null,
        footer_disclaimer: payload.footerDisclaimer || null,
        min_margin_percent: roundCurrency(payload.minMarginPercent ?? 0),
        is_active: payload.isActive ?? true,
        created_by: context.user.id,
        updated_by: context.user.id,
        updated_at: new Date().toISOString(),
      };

      try {
        return await repository.createTemplate(fullPayload);
      } catch (error) {
        const message = String(error?.message || "");
        if (message.includes("Unknown column") && message.includes("itinerary")) {
          logger.warn(
            {
              module: "quotations",
              requestId: context.requestId,
              err: error,
            },
            "Template content columns missing; retry without itinerary fields",
          );
          const fallbackPayload = {
            ...fullPayload,
            itinerary: undefined,
            hotel_details: undefined,
            visa_details: undefined,
          };
          return await repository.createTemplate(fallbackPayload);
        }
        throw error;
      }
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

      const fullPayload = {
        code: payload.code,
        name: payload.name,
        template_type: payload.templateType,
        header_branding: payload.headerBranding,
        inclusions: payload.inclusions,
        exclusions: payload.exclusions,
        itinerary: Array.isArray(payload.itinerary) ? payload.itinerary : undefined,
        hotel_details: payload.hotelDetails,
        visa_details: payload.visaDetails,
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
      };

      try {
        return await repository.updateTemplate(id, fullPayload);
      } catch (error) {
        const message = String(error?.message || "");
        if (message.includes("Unknown column") && message.includes("itinerary")) {
          logger.warn(
            {
              module: "quotations",
              requestId: context.requestId,
              err: error,
              templateId: id,
            },
            "Template content columns missing; retry update without itinerary fields",
          );
          const fallbackPayload = {
            ...fullPayload,
            itinerary: undefined,
            hotel_details: undefined,
            visa_details: undefined,
          };
          return await repository.updateTemplate(id, fallbackPayload);
        }
        throw error;
      }
    },
  });
}

export {
  createQuotationsService,
  QUOTATION_STATUS,
};
