// Converts date-like values into Breezer's YYYY-MM-DD format.
function toDateOnly(value) {
  if (!value) return null;

  const text = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;

  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

// Safely parses numeric values with a fallback.
function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

// Returns a positive number or null for optional Breezer finance fields.
function toOptionalNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

// Returns trimmed text or a safe fallback.
function textOrNull(value, fallback = null) {
  const text = String(value ?? "").trim();
  return text || fallback;
}

// Builds the exact booking.created payload required by Breezer CRM.
function mapBookingCreatedPayload(booking = {}) {
  const bookingNumber = textOrNull(booking.bookingNumber, booking.id);
  const customerName = textOrNull(booking.leadName, "Unknown Customer");
  const salesPerson = textOrNull(
    booking.consultantName,
    booking.createdByUser?.fullName || null,
  );
  const leadType = textOrNull(booking.leadType, "Retail");
  const clientCurrency = String(
    booking.clientCurrency || booking.currency || "AED",
  ).toUpperCase();

  const visaPayload = isVisaBooking(booking)
    ? mapVisaCreatedPayloadFromBooking(booking).visa
    : null;

  return {
    eventType: "booking.created",
    bookingId: bookingNumber,
    booking: {
      city: textOrNull(booking.city, booking.destinationName || null),
      client_type: leadType,
      client_name: customerName,
      client_email: textOrNull(booking.leadEmail),
      query_on: toDateOnly(booking.createdAt),
      confirmed_on: toDateOnly(booking.updatedAt || booking.createdAt),
      sales_rep: salesPerson,
      approved_by: booking.isApproved
        ? textOrNull(booking.createdByUser?.fullName)
        : null,
      employee_name: salesPerson,
      pax_name: customerName,
      adult: toNumber(booking.adultsCount, 1),
      child: toNumber(booking.childrenCount, 0),
      infant: 0,
      client_currency: clientCurrency,
      promo_code: null,
      comment: textOrNull(
        booking.destinationName,
        booking.leadCountry || "Booking created from Get2Vacations CRM",
      ),
      attachmentsr: "",
    },
    visas: visaPayload ? [visaPayload] : [],
    excursions: [],
    payments: [],
  };
}

function isVisaBooking(booking = {}) {
  const leadType = String(booking.leadType || "").trim().toUpperCase();
  return leadType === "VISA" || booking.visaRequired === true;
}

function readSupplierDetails(booking = {}) {
  const details =
    booking.supplierDetails && typeof booking.supplierDetails === "object"
      ? booking.supplierDetails
      : {};
  return details || {};
}

// Builds Breezer's separate visa.created payload from the CRM booking.
function mapVisaCreatedPayloadFromBooking(booking = {}) {
  const supplier = readSupplierDetails(booking);
  const bookingNumber = textOrNull(booking.bookingNumber, booking.id);
  const clientCurrency = String(
    booking.clientCurrency || booking.currency || "AED",
  ).toUpperCase();
  const supplierCurrency = String(
    booking.supplierCurrency || supplier.currency || clientCurrency,
  ).toUpperCase();
  const destination = textOrNull(
    booking.destinationName,
    booking.leadCountry || booking.city || "Visa",
  );
  const paxCount = Math.max(
    1,
    toNumber(booking.adultsCount, 1) + toNumber(booking.childrenCount, 0),
  );

  return {
    eventType: "visa.created",
    bookingId: bookingNumber,
    visa: {
      visaId: textOrNull(
        supplier.visaId || supplier.visa_id,
        `${bookingNumber}-VISA`,
      ),
      supp_name: textOrNull(
        supplier.supplierName || supplier.supplier_name || supplier.name,
        "Not Assigned",
      ),
      visa_date: toDateOnly(
        supplier.visaDate || supplier.visa_date || booking.travelStartDate,
      ),
      desc: textOrNull(
        supplier.description || supplier.desc || booking.visaDetails,
        `${destination} Visa`,
      ),
      noOfPax: paxCount,
      supplierCurrency,
      supplierAmount: toNumber(
        supplier.supplierAmount || supplier.supplier_amount,
        toNumber(booking.costAmount, toNumber(booking.totalAmount, 0)),
      ),
      supplierPaymentMode: textOrNull(
        supplier.supplierPaymentMode ||
          supplier.supplier_payment_mode ||
          supplier.paymentMode,
      ),
      supplierInvoiceNo: textOrNull(
        supplier.supplierInvoiceNo ||
          supplier.supplier_invoice_no ||
          supplier.invoiceNumber ||
          supplier.invoiceNo,
      ),
      paymentDueDate: toDateOnly(
        supplier.paymentDueDate ||
          supplier.payment_due_date ||
          booking.supplierPaymentDeadlineAt,
      ),
      paymentMadeDate: toDateOnly(
        supplier.paymentMadeDate || supplier.payment_made_date,
      ),
      ROEsupplierToUSD: toOptionalNumber(
        supplier.ROEsupplierToUSD || supplier.roeSupplierToUsd,
      ),
      ROEsupplierToINR: toOptionalNumber(
        supplier.ROEsupplierToINR || supplier.roeSupplierToInr,
      ),
      ROEsupplieToClient: toOptionalNumber(
        supplier.ROEsupplieToClient ||
          supplier.roeSupplierToClient ||
          booking.exchangeRate,
      ),
    },
  };
}

function paymentType(payment = {}, booking = {}) {
  const status = String(payment.status || "").trim().toUpperCase();
  const amount = toNumber(payment.amount, 0);
  const total = toNumber(booking.totalAmount, 0);
  if (status === "FULL" || (total > 0 && amount >= total)) {
    return "Full Payment";
  }
  if (status === "REFUNDED") {
    return "Refunded Payment";
  }
  return "Partial Payment";
}

// Builds Breezer's separate payment.created/payment.updated payload.
function mapPaymentPayload({ payment = {}, booking = {}, eventType = "payment.created" } = {}) {
  const bookingNumber = textOrNull(booking.bookingNumber, payment.bookingNumber || booking.id);
  const currency = String(
    payment.currency || booking.clientCurrency || booking.currency || "AED",
  ).toUpperCase();

  return {
    eventType,
    bookingId: bookingNumber,
    payment: {
      g2vPaymentId: textOrNull(payment.paymentReference, payment.id),
      paymentId: textOrNull(payment.id, payment.paymentReference),
      paymentType: paymentType(payment, booking),
      paymentMode: textOrNull(payment.paymentMode, "bank"),
      paymentCurrency: currency,
      paymentAmount: toNumber(payment.amount, 0),
      paymentDate: toDateOnly(payment.paidAt || payment.createdAt),
      INRRoe: toOptionalNumber(payment.INRRoe || payment.inrRoe),
      USDRoe: toOptionalNumber(payment.USDRoe || payment.usdRoe),
    },
  };
}

// Builds a separate refund payload. Breezer has not provided an exact refund sample yet.
function mapRefundPayload({
  refund = {},
  payment = {},
  booking = {},
  eventType = "refund.created",
} = {}) {
  const bookingNumber = textOrNull(booking.bookingNumber, refund.bookingNumber || booking.id);
  const currency = String(
    payment.currency || booking.clientCurrency || booking.currency || "AED",
  ).toUpperCase();

  return {
    eventType,
    bookingId: bookingNumber,
    refund: {
      g2vRefundId: textOrNull(refund.id),
      refundId: textOrNull(refund.gatewayRefundId, refund.id),
      g2vPaymentId: textOrNull(payment.paymentReference, refund.paymentId),
      paymentId: textOrNull(refund.paymentId, payment.id),
      refundCurrency: currency,
      refundAmount: toNumber(refund.refundAmount, 0),
      refundDate: toDateOnly(refund.processedAt || refund.approvedAt || refund.createdAt),
      refundStatus: textOrNull(refund.status, "INITIATED"),
      supplierPenalty: toNumber(refund.supplierPenalty, 0),
      serviceCharge: toNumber(refund.serviceCharge, 0),
      reason: textOrNull(refund.rejectedReason || refund.notes),
      gatewayRefundId: textOrNull(refund.gatewayRefundId),
    },
  };
}

export {
  isVisaBooking,
  mapBookingCreatedPayload,
  mapPaymentPayload,
  mapRefundPayload,
  mapVisaCreatedPayloadFromBooking,
};
