/**
 * Human-readable one-line summary for lead assignment notifications (push + in-app).
 * Avoids exposing raw UUIDs when name/contact/destination exist.
 */
export function buildLeadAssignmentSummary(payload = {}, { maxLen = 200 } = {}) {
  const name = String(
    payload.fullName || payload.leadName || payload.name || "",
  ).trim();
  const phone = String(payload.phone || "").trim();
  const email = String(payload.email || "").trim();
  const dest = String(
    payload.destinationName ||
      payload.travelTo ||
      payload.travel_to ||
      "",
  ).trim();
  const city = String(payload.city || "").trim();
  const code = String(payload.leadCode || payload.lead_code || "").trim();

  const parts = [];
  if (name) parts.push(name);
  if (phone) parts.push(phone);
  if (email) {
    parts.push(email.length > 44 ? `${email.slice(0, 41)}…` : email);
  }
  if (dest) parts.push(dest);
  else if (city) parts.push(city);

  let line = parts.join(" · ").trim();
  if (line.length > maxLen) {
    line = `${line.slice(0, Math.max(0, maxLen - 1))}…`;
  }
  if (line) return line;
  if (code) return `Lead ${code}`;
  return "";
}
