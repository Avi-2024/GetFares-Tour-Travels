const REQUEST_PARTS = new Set(["body", "params", "query"]);

function resolveFieldKey(path = []) {
  const segments = path.filter(
    (segment) => segment !== undefined && segment !== null && segment !== "",
  );

  if (!segments.length) {
    return "request";
  }

  if (REQUEST_PARTS.has(String(segments[0])) && segments.length > 1) {
    return segments.slice(1).map(String).join(".");
  }

  return segments.map(String).join(".");
}

function humanizeField(field) {
  const labels = {
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

  if (labels[field]) {
    return labels[field];
  }

  return field
    .replace(/\.\d+\./g, " item ")
    .replace(/\.\d+$/g, "")
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (char) => char.toUpperCase());
}

function formatIssueMessage(field, message) {
  const label = humanizeField(field);
  const normalized = String(message || "Invalid value").trim();

  if (!field || field === "request" || field === "body") {
    return normalized;
  }

  if (normalized.toLowerCase().includes(label.toLowerCase())) {
    return normalized;
  }

  return `${label}: ${normalized}`;
}

function formatZodValidationDetails(zodError) {
  const flattened = zodError.flatten();
  const fieldErrors = {};
  const issues = [];

  for (const issue of zodError.issues) {
    const field = resolveFieldKey(issue.path);
    const message = formatIssueMessage(field, issue.message);

    if (!fieldErrors[field]) {
      fieldErrors[field] = [];
    }
    fieldErrors[field].push(message);

    issues.push({
      field,
      path: issue.path,
      message,
      code: issue.code,
    });
  }

  return {
    formErrors: flattened.formErrors,
    fieldErrors,
    issues,
  };
}

export { formatZodValidationDetails, humanizeField, resolveFieldKey };
