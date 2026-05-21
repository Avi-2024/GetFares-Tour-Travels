export type ValidationDetails = {
  formErrors?: string[];
  fieldErrors?: Record<string, string[]>;
  issues?: Array<{
    field?: string;
    path?: Array<string | number>;
    message?: string;
    code?: string;
  }>;
};

const FIELD_LABELS: Record<string, string> = {
  code: "Template code",
  name: "Template name",
  templateType: "Template type",
  minMarginPercent: "Min margin %",
  headerBranding: "Header branding",
  inclusions: "Inclusions",
  exclusions: "Exclusions",
  hotelDetails: "Hotel details",
  visaDetails: "Visa details",
  paymentTerms: "Payment terms",
  cancellationPolicy: "Cancellation policy",
  footerDisclaimer: "Footer disclaimer",
  recipientPhone: "Recipient phone",
  recipientEmail: "Recipient email",
  phone: "Phone",
  email: "Email",
  leadId: "Lead",
};

function labelForField(field: string): string {
  if (FIELD_LABELS[field]) return FIELD_LABELS[field];

  return field
    .replace(/\.\d+\./g, " item ")
    .replace(/\.\d+$/g, "")
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (char) => char.toUpperCase());
}

export function extractValidationDetails(
  source: unknown,
): ValidationDetails | null {
  if (!source || typeof source !== "object") return null;

  const root = source as Record<string, unknown>;
  const errorNode =
    root.error && typeof root.error === "object"
      ? (root.error as Record<string, unknown>)
      : root;
  const details = errorNode.details;

  if (!details || typeof details !== "object") return null;

  const parsed = details as ValidationDetails;
  if (parsed.fieldErrors || parsed.formErrors || parsed.issues) {
    return parsed;
  }

  return null;
}

export function mapValidationFieldErrors(
  details: ValidationDetails | null,
): Record<string, string> {
  if (!details) return {};

  const mapped: Record<string, string> = {};

  if (Array.isArray(details.issues)) {
    for (const issue of details.issues) {
      const field = String(issue.field ?? "").trim();
      const message = String(issue.message ?? "").trim();
      if (!field || !message || mapped[field]) continue;
      mapped[field] = message;
    }
  }

  if (details.fieldErrors) {
    for (const [field, messages] of Object.entries(details.fieldErrors)) {
      if (mapped[field] || !messages?.length) continue;
      mapped[field] = String(messages[0]);
    }
  }

  return mapped;
}

export function formatFieldErrorsForToast(
  errors: Record<string, string>,
): string {
  const entries = Object.entries(errors).filter(([, message]) =>
    String(message ?? "").trim(),
  );

  if (!entries.length) {
    return "Validation failed";
  }

  if (entries.length === 1) {
    return entries[0][1];
  }

  return entries
    .map(([field, message]) => {
      const label = labelForField(field);
      return message.toLowerCase().includes(label.toLowerCase())
        ? message
        : `${label}: ${message}`;
    })
    .join(" • ");
}

export function formatValidationErrorMessage(
  source: unknown,
  fallback = "Validation failed",
): string {
  const details = extractValidationDetails(source);
  const mapped = mapValidationFieldErrors(details);
  const entries = Object.entries(mapped);

  if (entries.length === 1) {
    return entries[0][1];
  }

  if (entries.length > 1) {
    return entries
      .map(([field, message]) => {
        const label = labelForField(field);
        return message.toLowerCase().includes(label.toLowerCase())
          ? message
          : `${label}: ${message}`;
      })
      .join(" • ");
  }

  if (details?.formErrors?.length) {
    return details.formErrors.join(" • ");
  }

  return fallback;
}

export function isValidationErrorPayload(source: unknown): boolean {
  if (!source || typeof source !== "object") return false;
  const root = source as Record<string, unknown>;
  const code =
    (root.error as Record<string, unknown> | undefined)?.code ?? root.code;
  return code === "VALIDATION_ERROR";
}
