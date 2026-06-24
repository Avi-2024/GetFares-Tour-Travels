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
  const clientCurrency = String(
    booking.clientCurrency || booking.currency || "AED",
  ).toUpperCase();

  return {
    eventType: "booking.created",
    bookingId: bookingNumber,
    booking: {
      city: textOrNull(booking.city, booking.destinationName || null),
      client_type: "Retail",
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
    visas: [],
    excursions: [],
    payments: [],
  };
}

export { mapBookingCreatedPayload };
