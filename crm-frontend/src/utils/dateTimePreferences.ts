export type DateTimePreferences = {
  timezone: string;
  locale: string;
  dateFormat: string;
};

const DATE_FORMATS = new Set([
  "DD/MM/YYYY",
  "MM/DD/YYYY",
  "YYYY-MM-DD",
  "DD-MM-YYYY",
]);

export const DATE_TIME_PREFERENCES_STORAGE_KEY =
  "crm_system_datetime_preferences_v1";

export const ISO_WITHOUT_TIMEZONE_REGEX =
  /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d{1,6})?)?$/;

function getBrowserTimeZone() {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return zone || "UTC";
  } catch {
    return "UTC";
  }
}

function getBrowserLocale() {
  if (typeof navigator !== "undefined" && navigator.language) {
    return navigator.language;
  }
  return "en-IN";
}

export const DEFAULT_DATE_TIME_PREFERENCES: DateTimePreferences = Object.freeze({
  timezone: getBrowserTimeZone(),
  locale: getBrowserLocale(),
  dateFormat: "DD/MM/YYYY",
});

function isValidTimeZone(value: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

function normalizeLocale(value?: string) {
  const raw = String(value || "").trim();
  if (!raw) {
    return DEFAULT_DATE_TIME_PREFERENCES.locale;
  }
  try {
    const [resolved] = Intl.DateTimeFormat.supportedLocalesOf([raw]);
    return resolved || DEFAULT_DATE_TIME_PREFERENCES.locale;
  } catch {
    return DEFAULT_DATE_TIME_PREFERENCES.locale;
  }
}

function normalizeDateFormat(value?: string) {
  const normalized = String(value || "")
    .trim()
    .toUpperCase();
  if (DATE_FORMATS.has(normalized)) {
    return normalized;
  }
  return DEFAULT_DATE_TIME_PREFERENCES.dateFormat;
}

export function normalizeDateTimePreferences(
  value?: Partial<DateTimePreferences>,
): DateTimePreferences {
  const timezoneRaw = String(value?.timezone || "").trim();
  return {
    timezone:
      timezoneRaw && isValidTimeZone(timezoneRaw) ?
        timezoneRaw
      : DEFAULT_DATE_TIME_PREFERENCES.timezone,
    locale: normalizeLocale(value?.locale),
    dateFormat: normalizeDateFormat(value?.dateFormat),
  };
}

export function loadDateTimePreferencesFromStorage():
  | DateTimePreferences
  | null {
  if (typeof localStorage === "undefined") {
    return null;
  }
  const raw = localStorage.getItem(DATE_TIME_PREFERENCES_STORAGE_KEY);
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<DateTimePreferences>;
    return normalizeDateTimePreferences(parsed);
  } catch {
    return null;
  }
}

export function saveDateTimePreferencesToStorage(
  value: DateTimePreferences,
): void {
  if (typeof localStorage === "undefined") {
    return;
  }
  localStorage.setItem(DATE_TIME_PREFERENCES_STORAGE_KEY, JSON.stringify(value));
}

export function parseApiDateTime(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const raw = String(value).trim();
  if (!raw) return null;

  // Extract just the date part (YYYY-MM-DD) to avoid timezone conversion
  // This ensures we show the exact date from the database
  const dateMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (dateMatch) {
    const [, year, month, day] = dateMatch;
    // Create date in local timezone without time component
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }

  // Fallback for other date formats
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getDateParts(date: Date) {
  // Extract date parts directly from the Date object without timezone conversion
  // This ensures we show the exact date from the backend
  const year = String(date.getFullYear()).padStart(4, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return { year, month, day };
}

export function formatDateWithPreferences(
  value: unknown,
  preferences: DateTimePreferences,
  fallback = "N/A",
) {
  const date = parseApiDateTime(value);
  if (!date) return fallback;

  const { year, month, day } = getDateParts(date);
  switch (preferences.dateFormat) {
    case "MM/DD/YYYY":
      return `${month}/${day}/${year}`;
    case "YYYY-MM-DD":
      return `${year}-${month}-${day}`;
    case "DD-MM-YYYY":
      return `${day}-${month}-${year}`;
    case "DD/MM/YYYY":
    default:
      return `${day}/${month}/${year}`;
  }
}

export function formatDateTimeWithPreferences(
  value: unknown,
  preferences: DateTimePreferences,
  fallback = "N/A",
) {
  const date = parseApiDateTime(value);
  if (!date) return fallback;

  const datePart = formatDateWithPreferences(date, preferences, fallback);
  const timePart = new Intl.DateTimeFormat(preferences.locale, {
    timeZone: preferences.timezone,
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);

  return `${datePart}, ${timePart}`;
}
