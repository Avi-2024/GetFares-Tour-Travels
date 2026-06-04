import { useCallback, useEffect, useMemo, useState } from "react";
import { FaRotate, FaTriangleExclamation } from "react-icons/fa6";

import SurfaceCard from "../../components/ui/SurfaceCard";
import { reportsApi } from "../../api/reports";
import { useCurrency } from "../../hooks/useCurrency";
import { notify, reportApiError } from "../../lib/notify";

type QueryParams = Record<string, string | number | boolean>;
type ReportRow = Record<string, unknown>;
type ReportPayload = unknown;

type ReportColumn = {
  key: string;
  label: string;
  type?: "amount" | "number" | "percent" | "date" | "dateOnly" | "time" | "text";
  currencyKey?: string;
  width?: string;
  wrap?: boolean;
  truncate?: boolean;
};

type SummaryMetric = {
  label: string;
  value: unknown;
  type?: ReportColumn["type"];
  currency?: string;
  currencyKey?: string;
};

type ReportDefinition = {
  id: string;
  group: string;
  title: string;
  request: (params: QueryParams) => Promise<unknown>;
  columns: ReportColumn[];
  rows: (payload: ReportPayload) => ReportRow[];
  summary?: (payload: ReportPayload) => SummaryMetric[];
  serverPaginated?: boolean;
};

type ReportResult = {
  loading: boolean;
  ok: boolean;
  data: ReportPayload;
  error: string | null;
};

type LeadFilterOptions = {
  countries: string[];
  sources: string[];
};

type ReportPagination = {
  page: number;
  pageSize: number;
  totalRows: number;
  totalPages: number;
};

type ExportFormat = "csv" | "xlsx";

type ExecutiveKpis = {
  totalLeads?: number;
  convertedLeads?: number;
  totalBookings?: number;
  revenue?: number;
  profit?: number;
  pendingFollowups?: number;
  overdueFollowups?: number;
  currency?: string;
};

const toDateInput = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const getMonthStart = () => {
  const now = new Date();
  return toDateInput(new Date(now.getFullYear(), now.getMonth(), 1));
};

const getToday = () => toDateInput(new Date());

const unwrapData = (response: unknown) =>
  (response as { data?: unknown })?.data ?? response;

const asObject = (value: unknown): ReportRow =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as ReportRow)
    : {};

const asArray = (value: unknown): ReportRow[] =>
  Array.isArray(value) ? (value as ReportRow[]) : [];

const nestedArray = (path: string) => (payload: ReportPayload) => {
  const parts = path.split(".");
  let current: unknown = unwrapData(payload);
  for (const part of parts) {
    current = asObject(current)[part];
  }
  return asArray(current);
};

const dataArray = (payload: ReportPayload) => {
  const data = unwrapData(payload);
  return Array.isArray(data) ? asArray(data) : asArray(asObject(data).rows);
};
const dataAsRow = (payload: ReportPayload) => {
  const row = asObject(unwrapData(payload));
  return Object.keys(row).length ? [row] : [];
};

const nestedSummary =
  (path: string, metrics: Array<Omit<SummaryMetric, "value"> & { key: string }>) =>
  (payload: ReportPayload) => {
    const parts = path.split(".");
    let current: unknown = unwrapData(payload);
    for (const part of parts) {
      current = asObject(current)[part];
    }
    const source = asObject(current);
    return metrics.map((metric) => ({
      label: metric.label,
      type: metric.type,
      currency: metric.currencyKey
        ? String(source[metric.currencyKey] || "")
        : metric.currency,
      value: source[metric.key],
    }));
  };

const objectSummary =
  (metrics: Array<Omit<SummaryMetric, "value"> & { key: string }>) =>
  (payload: ReportPayload) => {
    const source = asObject(unwrapData(payload));
    return metrics.map((metric) => ({
      label: metric.label,
      type: metric.type,
      currency: metric.currency,
      value: source[metric.key],
    }));
  };

const toNumber = (value: unknown) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeReportDateTime = (value: unknown) => {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const match =
    /^(\d{4}-\d{2}-\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?/.exec(raw);
  if (!match) return raw;
  return `${match[1]} ${String(match[2] || "00").padStart(2, "0")}:${String(
    match[3] || "00",
  ).padStart(2, "0")}:${String(match[4] || "00").padStart(2, "0")}`;
};

const buildTimestampWithTimezone = (value: unknown, timezone: unknown) => {
  const normalized = normalizeReportDateTime(value);
  const tz = String(timezone ?? "").trim();
  return normalized && tz ? `${normalized} ${tz}` : normalized || tz;
};

const getReportPagination = (payload: ReportPayload): ReportPagination | null => {
  const pagination = asObject(asObject(unwrapData(payload)).pagination);
  const totalRows = toNumber(pagination.totalRows);
  if (!totalRows) return null;
  const pageSize = Math.max(toNumber(pagination.pageSize), 1);
  return {
    page: Math.max(toNumber(pagination.page), 1),
    pageSize,
    totalRows,
    totalPages: Math.max(toNumber(pagination.totalPages), 1),
  };
};

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Request failed.";

const REPORT_FILTERS_STORAGE_KEY = "reports.activeFilters.v1";

const safeFilePart = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "report";

const escapeCsv = (value: unknown) => {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const escapeXml = (value: unknown) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const downloadBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

const buildFileName = (title: string, format: ExportFormat) => {
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  return `${safeFilePart(title)}-${stamp}.${format}`;
};

const crcTable = (() => {
  const table: number[] = [];
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

const crc32 = (bytes: Uint8Array) => {
  let crc = 0xffffffff;
  bytes.forEach((byte) => {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  });
  return (crc ^ 0xffffffff) >>> 0;
};

const writeUint16 = (target: number[], value: number) => {
  target.push(value & 0xff, (value >>> 8) & 0xff);
};

const writeUint32 = (target: number[], value: number) => {
  target.push(
    value & 0xff,
    (value >>> 8) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 24) & 0xff,
  );
};

const createZip = (files: Array<{ name: string; content: string }>) => {
  const encoder = new TextEncoder();
  const output: number[] = [];
  const central: number[] = [];
  const entries = files.map((file) => ({
    ...file,
    nameBytes: encoder.encode(file.name),
    contentBytes: encoder.encode(file.content),
  }));

  entries.forEach((file) => {
    const offset = output.length;
    const crc = crc32(file.contentBytes);
    writeUint32(output, 0x04034b50);
    writeUint16(output, 20);
    writeUint16(output, 0);
    writeUint16(output, 0);
    writeUint16(output, 0);
    writeUint16(output, 0);
    writeUint32(output, crc);
    writeUint32(output, file.contentBytes.length);
    writeUint32(output, file.contentBytes.length);
    writeUint16(output, file.nameBytes.length);
    writeUint16(output, 0);
    output.push(...file.nameBytes, ...file.contentBytes);

    writeUint32(central, 0x02014b50);
    writeUint16(central, 20);
    writeUint16(central, 20);
    writeUint16(central, 0);
    writeUint16(central, 0);
    writeUint16(central, 0);
    writeUint16(central, 0);
    writeUint32(central, crc);
    writeUint32(central, file.contentBytes.length);
    writeUint32(central, file.contentBytes.length);
    writeUint16(central, file.nameBytes.length);
    writeUint16(central, 0);
    writeUint16(central, 0);
    writeUint16(central, 0);
    writeUint16(central, 0);
    writeUint32(central, 0);
    writeUint32(central, offset);
    central.push(...file.nameBytes);
  });

  const centralOffset = output.length;
  output.push(...central);
  writeUint32(output, 0x06054b50);
  writeUint16(output, 0);
  writeUint16(output, 0);
  writeUint16(output, entries.length);
  writeUint16(output, entries.length);
  writeUint32(output, central.length);
  writeUint32(output, centralOffset);
  writeUint16(output, 0);
  return new Uint8Array(output);
};

const columnName = (index: number) => {
  let name = "";
  let current = index + 1;
  while (current > 0) {
    const mod = (current - 1) % 26;
    name = String.fromCharCode(65 + mod) + name;
    current = Math.floor((current - mod) / 26);
  }
  return name;
};

const buildXlsxBlob = (title: string, rows: string[][]) => {
  const sheetRows = rows
    .map(
      (row, rowIndex) =>
        `<row r="${rowIndex + 1}">${row
          .map(
            (cell, cellIndex) =>
              `<c r="${columnName(cellIndex)}${rowIndex + 1}" t="inlineStr"><is><t>${escapeXml(cell)}</t></is></c>`,
          )
          .join("")}</row>`,
    )
    .join("");
  const sheetName = escapeXml(title).slice(0, 31) || "Report";
  const bytes = createZip([
    {
      name: "[Content_Types].xml",
      content:
        '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>',
    },
    {
      name: "_rels/.rels",
      content:
        '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
    },
    {
      name: "xl/workbook.xml",
      content: `<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${sheetName}" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    },
    {
      name: "xl/_rels/workbook.xml.rels",
      content:
        '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>',
    },
    {
      name: "xl/worksheets/sheet1.xml",
      content: `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${sheetRows}</sheetData></worksheet>`,
    },
  ]);
  return new Blob([bytes], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
};

const exportRows = ({
  title,
  rows,
  columns,
  format,
  formatValue,
}: {
  title: string;
  rows: ReportRow[];
  columns: ReportColumn[];
  format: ExportFormat;
  formatValue: (value: unknown, column?: ReportColumn, row?: ReportRow) => string;
}) => {
  const headers = columns.map((column) => column.label);
  const body = rows.map((row) =>
    columns.map((column) => formatValue(row[column.key], column, row)),
  );

  if (format === "csv") {
    const csv = [headers, ...body].map((line) => line.map(escapeCsv).join(",")).join("\r\n");
    downloadBlob(
      new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }),
      buildFileName(title, format),
    );
    return;
  }

  downloadBlob(buildXlsxBlob(title, [headers, ...body]), buildFileName(title, format));
};

const loadStoredFilters = () => {
  if (typeof localStorage === "undefined") {
    return { country: "", source: "" };
  }
  try {
    const parsed = JSON.parse(localStorage.getItem(REPORT_FILTERS_STORAGE_KEY) || "{}");
    return {
      country: typeof parsed.country === "string" ? parsed.country : "",
      source: typeof parsed.source === "string" ? parsed.source : "",
    };
  } catch {
    return { country: "", source: "" };
  }
};

const makeInitialResults = (defs: ReportDefinition[]) =>
  Object.fromEntries(
    defs.map((def) => [
      def.id,
      { loading: false, ok: false, data: null, error: null } satisfies ReportResult,
    ]),
  ) as Record<string, ReportResult>;

const setReportLoading = (
  current: Record<string, ReportResult>,
  id: string,
) => ({
  ...current,
  [id]: { loading: true, ok: false, data: null, error: null },
});

const reportDefinitions: ReportDefinition[] = [
  {
    id: "executive",
    group: "Overview",
    title: "Executive KPIs",
    request: reportsApi.dashboardExecutiveKpis,
    rows: dataAsRow,
    columns: [
      { key: "totalLeads", label: "Leads", type: "number" },
      { key: "convertedLeads", label: "Converted", type: "number" },
      { key: "totalBookings", label: "Bookings", type: "number" },
      { key: "revenue", label: "Revenue", type: "amount", currencyKey: "currency" },
      { key: "profit", label: "Profit", type: "amount", currencyKey: "currency" },
      { key: "pendingFollowups", label: "Pending Follow-ups", type: "number" },
      { key: "overdueFollowups", label: "Overdue Follow-ups", type: "number" },
    ],
    summary: objectSummary([
      { key: "totalLeads", label: "Total Leads", type: "number" },
      { key: "convertedLeads", label: "Converted Leads", type: "number" },
      { key: "totalBookings", label: "Bookings", type: "number" },
      { key: "revenue", label: "Revenue", type: "amount", currency: "row" },
      { key: "profit", label: "Profit", type: "amount", currency: "row" },
      { key: "avgMarginPercent", label: "Margin", type: "percent" },
    ]),
  },
  {
    id: "monthly-summary",
    group: "Overview",
    title: "Monthly Summary",
    request: reportsApi.monthlySummary,
    rows: dataArray,
    columns: [
      { key: "month", label: "Month" },
      { key: "totalLeads", label: "Leads", type: "number" },
      { key: "convertedLeads", label: "Converted", type: "number" },
      { key: "conversionRatePercent", label: "Conversion", type: "percent" },
      { key: "totalBookings", label: "Bookings", type: "number" },
      { key: "revenue", label: "Revenue", type: "amount", currencyKey: "currency" },
      { key: "profit", label: "Profit", type: "amount", currencyKey: "currency" },
    ],
    summary: (payload) => {
      const rows = dataArray(payload);
      const totals = rows.reduce<{ totalLeads: number; convertedLeads: number; totalBookings: number; revenue: number; profit: number }>(
        (accumulator, row) => ({
          totalLeads: accumulator.totalLeads + toNumber(row.totalLeads),
          convertedLeads: accumulator.convertedLeads + toNumber(row.convertedLeads),
          totalBookings: accumulator.totalBookings + toNumber(row.totalBookings),
          revenue: accumulator.revenue + toNumber(row.revenue),
          profit: accumulator.profit + toNumber(row.profit),
        }),
        { totalLeads: 0, convertedLeads: 0, totalBookings: 0, revenue: 0, profit: 0 },
      );
      return [
        { label: "Months", value: rows.length, type: "number" },
        { label: "Leads", value: totals.totalLeads, type: "number" },
        { label: "Converted", value: totals.convertedLeads, type: "number" },
        { label: "Bookings", value: totals.totalBookings, type: "number" },
        {
          label: "Revenue",
          value: totals.revenue,
          type: "amount",
          currency: String(rows[0]?.currency || ""),
        },
        {
          label: "Profit",
          value: totals.profit,
          type: "amount",
          currency: String(rows[0]?.currency || ""),
        },
      ];
    },
  },
  {
    id: "conversion-funnel",
    group: "Overview",
    title: "Conversion Funnel",
    request: reportsApi.funnelConversion,
    rows: nestedArray("funnel"),
    columns: [
      { key: "stage", label: "Stage" },
      { key: "count", label: "Count", type: "number" },
      { key: "sharePercent", label: "Share", type: "percent" },
    ],
    summary: objectSummary([
      { key: "totalLeads", label: "Total Leads", type: "number" },
      { key: "convertedLeads", label: "Converted", type: "number" },
      { key: "lostLeads", label: "Lost", type: "number" },
      { key: "conversionRatePercent", label: "Conversion", type: "percent" },
    ]),
  },
  {
    id: "leads-by-source",
    group: "Leads",
    title: "Leads By Source",
    request: reportsApi.leadsBySource,
    rows: dataArray,
    columns: [
      { key: "source", label: "Source" },
      { key: "totalLeads", label: "Leads", type: "number" },
      { key: "convertedLeads", label: "Converted", type: "number" },
      { key: "conversionRatePercent", label: "Conversion", type: "percent" },
    ],
  },
  {
    id: "leads-by-consultant",
    group: "Leads",
    title: "Leads By Consultant",
    request: reportsApi.leadsByConsultant,
    rows: dataArray,
    columns: [
      { key: "consultantName", label: "Consultant" },
      { key: "totalLeads", label: "Leads", type: "number" },
      { key: "convertedLeads", label: "Converted", type: "number" },
      { key: "conversionRatePercent", label: "Conversion", type: "percent" },
    ],
  },
  {
    id: "lead-aging",
    group: "Leads",
    title: "Lead Aging",
    request: reportsApi.getLeadsAging,
    rows: (payload) =>
      dataArray(payload).map((row, index) => ({
        ...row,
        rowNumber: index + 1,
      })),
    columns: [
      { key: "rowNumber", label: "S.No.", type: "number" },
      { key: "fullName", label: "Lead" },
      { key: "consultantName", label: "Consultant" },
      { key: "stage", label: "Stage" },
      { key: "source", label: "Source" },
      { key: "leadCountry", label: "Lead Country" },
      { key: "ageHours", label: "Age Hours", type: "number" },
    ],
  },
  {
    id: "lost-leads",
    group: "Leads",
    title: "Lost Leads",
    request: reportsApi.getLeadsLost,
    rows: (payload) =>
      dataArray(payload).map((row, index) => ({
        ...row,
        rowNumber: index + 1,
      })),
    columns: [
      { key: "rowNumber", label: "S.No.", type: "number" },
      { key: "fullName", label: "Lead" },
      { key: "source", label: "Source" },
      { key: "closedReason", label: "Reason" },
      { key: "lostAt", label: "Lost At", type: "dateOnly" },
    ],
  },
  {
    id: "deal-lines",
    group: "Leads",
    title: "Lead Deal Lines",
    request: reportsApi.leadsDealLines,
    serverPaginated: true,
    rows: (payload) => {
      const pagination = getReportPagination(payload);
      const offset = pagination ? (pagination.page - 1) * pagination.pageSize : 0;
      return dataArray(payload).map((row, index) => ({
        ...row,
        rowNumber: offset + index + 1,
      }));
    },
    columns: [
      { key: "rowNumber", label: "S.No.", type: "number" },
      { key: "leadName", label: "Lead" },
      { key: "source", label: "Source" },
      { key: "leadCountry", label: "Lead Country" },
      { key: "status", label: "Status" },
      { key: "assignedUser", label: "Consultant" },
      { key: "clientCurrency", label: "Client Currency" },
      {
        key: "dealAmount",
        label: "Deal Amount",
        type: "amount",
        currencyKey: "clientCurrency",
      },
      { key: "bookingCount", label: "Bookings", type: "number" },
    ],
  },
  {
    id: "people-performance",
    group: "Sales",
    title: "People Performance",
    request: reportsApi.peoplePerformance,
    rows: dataArray,
    columns: [
      { key: "name", label: "Name", width: "180px", truncate: true },
      { key: "role", label: "Role", width: "150px", truncate: true },
      { key: "assignedLeads", label: "Leads", type: "number", width: "80px" },
      { key: "openLeads", label: "Open", type: "number", width: "80px" },
      { key: "convertedLeads", label: "Converted", type: "number", width: "105px" },
      { key: "lostLeads", label: "Lost", type: "number", width: "80px" },
      { key: "slaBreachedLeads", label: "SLA", type: "number", width: "80px" },
      { key: "conversionRatePercent", label: "Conv. %", type: "percent", width: "90px" },
      { key: "quotationsCreated", label: "Quotes", type: "number", width: "90px" },
      {
        key: "quotationValue",
        label: "Quote Value",
        type: "amount",
        currencyKey: "currency",
        width: "140px",
      },
      { key: "bookings", label: "Bookings", type: "number", width: "95px" },
      { key: "currency", label: "Currency", width: "90px" },
      {
        key: "bookingValue",
        label: "Booking Value",
        type: "amount",
        currencyKey: "currency",
        width: "150px",
      },
      {
        key: "averageBookingValue",
        label: "Avg Booking",
        type: "amount",
        currencyKey: "currency",
        width: "145px",
      },
      {
        key: "collectedAmount",
        label: "Collected",
        type: "amount",
        currencyKey: "currency",
        width: "140px",
      },
      {
        key: "outstandingAmount",
        label: "Outstanding",
        type: "amount",
        currencyKey: "currency",
        width: "145px",
      },
      { key: "profit", label: "Profit", type: "amount", currencyKey: "currency", width: "135px" },
      { key: "averageMarginPercent", label: "Margin", type: "percent", width: "90px" },
      { key: "followupsCreated", label: "Follow-ups", type: "number", width: "105px" },
      { key: "missedFollowups", label: "Missed", type: "number", width: "85px" },
      { key: "callsDone", label: "Calls", type: "number", width: "80px" },
      { key: "whatsappDone", label: "WhatsApp", type: "number", width: "95px" },
    ],
  },

  {
    id: "booking-performance",
    group: "Sales",
    title: "Booking Performance",
    request: reportsApi.bookingPerformance,
    rows: nestedArray("byMonth"),
    columns: [
      { key: "month", label: "Month" },
      { key: "bookings", label: "Bookings", type: "number" },
      { key: "value", label: "Value", type: "amount", currencyKey: "currency" },
      { key: "cost", label: "Cost", type: "amount", currencyKey: "currency" },
      { key: "profit", label: "Profit", type: "amount", currencyKey: "currency" },
    ],
    summary: nestedSummary("summary", [
      { key: "totalBookings", label: "Bookings", type: "number" },
      { key: "confirmedBookings", label: "Confirmed", type: "number" },
      { key: "bookingValue", label: "Value", type: "amount", currencyKey: "currency" },
      { key: "profit", label: "Profit", type: "amount", currencyKey: "currency" },
      { key: "marginPercent", label: "Margin", type: "percent" },
    ]),
  },
  {
    id: "revenue-monthly",
    group: "Revenue",
    title: "Revenue By Month",
    request: reportsApi.revenueMonthly,
    rows: dataArray,
    columns: [
      { key: "month", label: "Month" },
      { key: "revenue", label: "Revenue", type: "amount", currencyKey: "currency" },
      { key: "cost", label: "Cost", type: "amount", currencyKey: "currency" },
      { key: "profit", label: "Profit", type: "amount", currencyKey: "currency" },
    ],
  },
  {
    id: "revenue-service",
    group: "Revenue",
    title: "Revenue By Service",
    request: reportsApi.revenueByServiceType,
    rows: dataArray,
    columns: [
      { key: "serviceType", label: "Service" },
      { key: "totalBookings", label: "Bookings", type: "number" },
      { key: "revenue", label: "Revenue", type: "amount", currencyKey: "currency" },
    ],
  },
  {
    id: "revenue-destination",
    group: "Revenue",
    title: "Revenue By Destination",
    request: reportsApi.revenueByDestination,
    rows: dataArray,
    columns: [
      { key: "destination", label: "Destination" },
      { key: "totalBookings", label: "Bookings", type: "number" },
      { key: "revenue", label: "Revenue", type: "amount", currencyKey: "currency" },
    ],
  },
  // {
  //   id: "finance-summary",
  //   group: "Finance",
  //   title: "Finance Summary",
  //   request: reportsApi.financeSummary,
  //   rows: nestedArray("byPaymentMode"),
  //   columns: [
  //     { key: "paymentMode", label: "Payment Mode" },
  //     { key: "payments", label: "Payments", type: "number" },
  //     { key: "amount", label: "Amount", type: "amount" },
  //   ],
  //   summary: nestedSummary("summary", [
  //     { key: "bookedAmount", label: "Booked", type: "amount" },
  //     { key: "collectedAmount", label: "Collected", type: "amount" },
  //     { key: "outstandingAmount", label: "Outstanding", type: "amount" },
  //     { key: "refundAmount", label: "Refunds", type: "amount" },
  //     { key: "profit", label: "Profit", type: "amount" },
  //   ]),
  // },
  // {
  //   id: "finance-cost-breakup",
  //   group: "Finance",
  //   title: "Finance Cost Breakup",
  //   request: reportsApi.financeCostBreakup,
  //   rows: nestedArray("rows"),
  //   columns: [
  //     { key: "quoteNumber", label: "Quote" },
  //     { key: "leadName", label: "Lead" },
  //     { key: "status", label: "Status" },
  //     { key: "supplierCost", label: "Supplier Cost", type: "amount" },
  //     { key: "markupAmount", label: "Markup", type: "amount" },
  //     { key: "totalSaleValue", label: "Sale Value", type: "amount" },
  //     { key: "effectiveCurrency", label: "Currency" },
  //   ],
  //   summary: nestedSummary("summary", [
  //     { key: "totalQuotes", label: "Quotes", type: "number" },
  //     { key: "supplierCost", label: "Supplier Cost", type: "amount" },
  //     { key: "markupAmount", label: "Markup", type: "amount" },
  //     { key: "totalSaleValue", label: "Sale Value", type: "amount" },
  //   ]),
  // },
  // {
  //   id: "supplier-services",
  //   group: "Finance",
  //   title: "Supplier Services",
  //   request: reportsApi.financeSupplierServices,
  //   rows: nestedArray("rows"),
  //   columns: [
  //     { key: "quoteNumber", label: "Quote" },
  //     { key: "bookingNumber", label: "Booking" },
  //     { key: "customerName", label: "Customer" },
  //     { key: "serviceLabel", label: "Service" },
  //     { key: "supplierName", label: "Supplier" },
  //     { key: "basePrice", label: "Base Price", type: "amount" },
  //     { key: "currency", label: "Currency" },
  //   ],
  // },
  // {
  //   id: "outstanding-payments",
  //   group: "Finance",
  //   title: "Outstanding Payments",
  //   request: reportsApi.outstandingPayments,
  //   rows: dataArray,
  //   columns: [
  //     { key: "bookingNumber", label: "Booking" },
  //     { key: "totalAmount", label: "Total", type: "amount" },
  //     { key: "advanceReceived", label: "Advance", type: "amount" },
  //     { key: "outstandingAmount", label: "Outstanding", type: "amount" },
  //     { key: "paymentStatus", label: "Status" },
  //   ],
  // },
  // {
  //   id: "payment-mode",
  //   group: "Finance",
  //   title: "Payment Mode",
  //   request: reportsApi.paymentMode,
  //   rows: dataArray,
  //   columns: [
  //     { key: "paymentMode", label: "Mode" },
  //     { key: "totalPayments", label: "Payments", type: "number" },
  //     { key: "totalAmount", label: "Amount", type: "amount" },
  //   ],
  // },
  // {
  //   id: "profit-margin",
  //   group: "Finance",
  //   title: "Profit Margin",
  //   request: reportsApi.profitMargin,
  //   rows: dataAsRow,
  //   columns: [
  //     { key: "totalBookings", label: "Bookings", type: "number" },
  //     { key: "totalRevenue", label: "Revenue", type: "amount" },
  //     { key: "totalCost", label: "Cost", type: "amount" },
  //     { key: "totalProfit", label: "Profit", type: "amount" },
  //     { key: "marginPercent", label: "Margin", type: "percent" },
  //   ],
  // },
  {
    id: "operations",
    group: "Operations",
    title: "Operations Performance",
    request: reportsApi.operationsPerformance,
    rows: (payload) => {
      const data = asObject(unwrapData(payload));
      return [
        { area: "Follow-ups", ...asObject(data.followups) },
        { area: "Complaints", ...asObject(data.complaints) },
        { area: "Visa", ...asObject(data.visa) },
      ];
    },
    columns: [
      { key: "area", label: "Area" },
      { key: "totalFollowups", label: "Follow-ups", type: "number" },
      { key: "totalComplaints", label: "Complaints", type: "number" },
      { key: "totalVisaCases", label: "Visa Cases", type: "number" },
      { key: "completionRatePercent", label: "Completion", type: "percent" },
      { key: "resolutionRatePercent", label: "Resolution", type: "percent" },
      { key: "approvalRatePercent", label: "Approval", type: "percent" },
    ],
  },
  {
    id: "visa-summary",
    group: "Operations",
    title: "Visa Summary",
    request: reportsApi.visaSummary,
    rows: dataAsRow,
    columns: [
      { key: "totalCases", label: "Cases", type: "number" },
      { key: "approvedCases", label: "Approved", type: "number" },
      { key: "rejectedCases", label: "Rejected", type: "number" },
      { key: "pendingDocumentCases", label: "Document Pending", type: "number" },
      { key: "successRatePercent", label: "Success", type: "percent" },
    ],
  },
  {
    id: "followups-today",
    group: "Operations",
    title: "Today Follow-ups",
    request: reportsApi.followupsToday,
    rows: dataArray,
    columns: [
      { key: "fullName", label: "Lead" },
      { key: "followupType", label: "Type" },
      { key: "isCompleted", label: "Done" },
    ],
  },
  {
    id: "followups-missed",
    group: "Operations",
    title: "Missed Follow-ups",
    request: reportsApi.followupsMissed,
    rows: (payload) =>
      dataArray(payload).map((row) => ({
        ...row,
        followupDisplayAt: row.followupLocalAt || row.followupDate,
        followupTime: row.followupLocalAt || row.followupDate,
        followupTimezone: row.clientTimezone,
        followupTimestamp: buildTimestampWithTimezone(
          row.followupLocalAt || row.followupDate,
          row.clientTimezone,
        ),
      })),
    columns: [
      { key: "fullName", label: "Lead" },
      { key: "followupType", label: "Type" },
      { key: "followupTimestamp", label: "Timestamp", type: "date" },
    ],
  },
  {
    id: "call-log",
    group: "Operations",
    title: "Call Log",
    request: reportsApi.callLog,
    rows: dataArray,
    columns: [
      { key: "consultantName", label: "Consultant" },
      { key: "activityType", label: "Activity" },
      { key: "notes", label: "Notes" },
      { key: "createdAt", label: "Created", type: "date" },
    ],
  },
  {
    id: "activity-feed",
    group: "Operations",
    title: "Activity Feed",
    request: reportsApi.activityFeed,
    serverPaginated: true,
    rows: nestedArray("items"),
    columns: [
      { key: "leadName", label: "Lead", width: "180px", truncate: true },
      { key: "consultantName", label: "Consultant", width: "140px", truncate: true },
      { key: "activityType", label: "Activity", width: "170px", truncate: true },
      { key: "notes", label: "Notes", width: "420px", wrap: true },
      { key: "createdAt", label: "Created", type: "date", width: "180px" },
    ],
    summary: (payload) =>
      nestedArray("byType")(payload).slice(0, 4).map((row) => ({
        label: String(row.activityType || "Activity"),
        value: row.total,
        type: "number",
      })),
  },
  {
    id: "marketing",
    group: "Marketing",
    title: "Marketing Performance",
    request: reportsApi.marketingPerformance,
    rows: dataArray,
    columns: [
      { key: "name", label: "Campaign" },
      { key: "source", label: "Source" },
      { key: "actualSpend", label: "Spend", type: "amount" },
      { key: "totalLeads", label: "Leads", type: "number" },
      { key: "totalBookings", label: "Bookings", type: "number" },
      { key: "revenue", label: "Revenue", type: "amount" },
      { key: "roiPercent", label: "ROI", type: "percent" },
    ],
  },
  {
    id: "supplier-performance",
    group: "Marketing",
    title: "Supplier Performance",
    request: reportsApi.supplierPerformance,
    rows: dataArray,
    columns: [
      { key: "name", label: "Supplier" },
      { key: "totalCases", label: "Cases", type: "number" },
      { key: "approvedCases", label: "Approved", type: "number" },
      { key: "rejectedCases", label: "Rejected", type: "number" },
      { key: "successRatePercent", label: "Success", type: "percent" },
      { key: "averageVisaFee", label: "Avg Fee", type: "amount" },
    ],
  },
  // {
  //   id: "pipeline-forecast",
  //   group: "Marketing",
  //   title: "Pipeline Forecast",
  //   request: reportsApi.pipelineForecast,
  //   rows: (payload) => {
  //     const data = asObject(unwrapData(payload));
  //     return [
  //       { bucket: "Open Pipeline", ...asObject(data.openPipeline) },
  //       ...asArray(data.forecastByMonth),
  //     ];
  //   },
  //   columns: [
  //     { key: "bucket", label: "Bucket" },
  //     { key: "month", label: "Month" },
  //     { key: "leadCount", label: "Leads", type: "number" },
  //     { key: "estimatedRevenue", label: "Estimated Revenue", type: "amount" },
  //     { key: "weightedRevenue", label: "Weighted Revenue", type: "amount" },
  //   ],
  //   summary: nestedSummary("summary", [
  //     { key: "openLeads", label: "Open Leads", type: "number" },
  //     { key: "quotedLeads", label: "Quoted Leads", type: "number" },
  //     { key: "forecastRevenue", label: "Forecast", type: "amount" },
  //     { key: "weightedForecastRevenue", label: "Weighted", type: "amount" },
  //   ]),
  // },
];

const REPORT_ROW_LIMITS: Record<string, number> = {
  "lead-aging": 2500,
};

const REPORT_CURRENCY_IDS = new Set([
  "executive",
  "monthly-summary",
  "people-performance",
  "booking-performance",
  "revenue-monthly",
  "revenue-service",
  "revenue-destination",
]);

const ReportsPage = () => {
  const [from, setFrom] = useState(getMonthStart);
  const [to, setTo] = useState(getToday);
  const [selectedCurrency] = useState("AED");
  const [activeId, setActiveId] = useState(reportDefinitions[0].id);
  const [tablePage, setTablePage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [filters, setFilters] = useState(loadStoredFilters);
  const [filterOptions, setFilterOptions] = useState<LeadFilterOptions>({
    countries: [],
    sources: [],
  });
  const [filterOptionsLoading, setFilterOptionsLoading] = useState(true);
  const [exporting, setExporting] = useState<ExportFormat | null>(null);
  const [results, setResults] = useState(() => makeInitialResults(reportDefinitions));
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const { formatAmount } = useCurrency();

  const activeReport =
    reportDefinitions.find((report) => report.id === activeId) ||
    reportDefinitions[0];
  const activeResult = results[activeReport.id];
  const activePagination =
    activeReport.serverPaginated && activeResult?.ok ?
      getReportPagination(activeResult.data)
    : null;

  const groups = useMemo(
    () => Array.from(new Set(reportDefinitions.map((report) => report.group))),
    [],
  );

  const loadReports = useCallback(async () => {
    const params = {
      from,
      to,
      limit: activeReport.serverPaginated ?
        pageSize
      : REPORT_ROW_LIMITS[activeReport.id] ?? 100,
      ...(activeReport.serverPaginated ? { page: tablePage } : {}),
      ...(REPORT_CURRENCY_IDS.has(activeReport.id) ?
        { currency: selectedCurrency }
      : {}),
      ...(filters.country ? { country: filters.country } : {}),
      ...(filters.source ? { source: filters.source } : {}),
    };
    setResults((current) => setReportLoading(current, activeReport.id));
    try {
      const data = unwrapData(await activeReport.request(params));
      setResults((current) => ({
        ...current,
        [activeReport.id]: { loading: false, ok: true, data, error: null },
      }));
    } catch (error) {
      setResults((current) => ({
        ...current,
        [activeReport.id]: {
          loading: false,
          ok: false,
          data: null,
          error: getErrorMessage(error),
        },
      }));
    }
    setLastUpdated(new Date().toLocaleString("en-IN"));
  }, [activeReport, filters.country, filters.source, from, pageSize, selectedCurrency, tablePage, to]);

  const loadFilterOptions = useCallback(async () => {
    setFilterOptionsLoading(true);
    try {
      const response = await reportsApi.leadFilterOptions({ from, to });
      const payload = asObject(unwrapData(response));
      setFilterOptions({
        countries: asArray(payload.countries).map(String).filter(Boolean),
        sources: asArray(payload.sources).map(String).filter(Boolean),
      });
    } catch (error) {
      reportApiError(error, "Failed to load report filters.");
    } finally {
      setFilterOptionsLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  useEffect(() => {
    void loadFilterOptions();
  }, [loadFilterOptions]);

  useEffect(() => {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(REPORT_FILTERS_STORAGE_KEY, JSON.stringify(filters));
  }, [filters]);

  useEffect(() => {
    setTablePage(1);
  }, [activeId, filters.country, filters.source, from, to, pageSize]);

  const health = useMemo(() => {
    const values = Object.values(results);
    return {
      loading: values.filter((item) => item.loading).length,
      ok: values.filter((item) => item.ok).length,
      failed: values.filter((item) => Boolean(item.error)).length,
      total: values.length,
    };
  }, [results]);

  const baseCurrency = String(
    (results.executive?.data as ExecutiveKpis | null)?.currency || "AED",
  ).toUpperCase();

  const formatValue = (
    value: unknown,
    column?: ReportColumn | SummaryMetric,
    row?: ReportRow,
  ) => {
    if (value === null || value === undefined || value === "") return "-";
    if (column?.type === "amount") {
      const rowCurrency =
        "currencyKey" in column && column.currencyKey && row ?
          String(row[column.currencyKey] || "").trim()
        : "";
      const metricCurrency =
        "currency" in column && column.currency && column.currency !== "row" ?
          String(column.currency).trim()
        : "";
      return formatAmount(
        toNumber(value),
        rowCurrency || metricCurrency || baseCurrency || selectedCurrency,
      );
    }
    if (column?.type === "number") {
      return toNumber(value).toLocaleString("en-IN", { maximumFractionDigits: 2 });
    }
    if (column?.type === "percent") {
      return `${toNumber(value).toLocaleString("en-IN", { maximumFractionDigits: 2 })}%`;
    }
    if (column?.type === "date") {
      const date = new Date(String(value));
      return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString("en-IN");
    }
    if (column?.type === "dateOnly") {
      const normalized = normalizeReportDateTime(value);
      if (/^\d{4}-\d{2}-\d{2}/.test(normalized)) {
        return normalized.slice(0, 10);
      }
      const date = new Date(String(value));
      return Number.isNaN(date.getTime()) ?
          String(value).slice(0, 10)
        : date.toLocaleDateString("en-IN");
    }
    if (column?.type === "time") {
      const normalized = normalizeReportDateTime(value);
      const match = /\d{4}-\d{2}-\d{2} (\d{2}:\d{2}:\d{2})/.exec(normalized);
      if (match) return match[1];
      const date = new Date(String(value));
      return Number.isNaN(date.getTime()) ?
          String(value)
        : date.toLocaleTimeString("en-IN");
    }
    return String(value);
  };

  const activeRows = activeResult?.ok ? activeReport.rows(activeResult.data) : [];
  const summaryRows =
    activeResult?.ok && activeReport.summary ? activeReport.summary(activeResult.data) : [];

  const handleExport = async (format: ExportFormat) => {
    if (!activeRows.length) {
      notify.warning("No report rows to export.");
      return;
    }
    setExporting(format);
    try {
      await new Promise((resolve) => window.setTimeout(resolve, 0));
      exportRows({
        title: activeReport.title,
        rows: activeRows,
        columns: activeReport.columns,
        format,
        formatValue,
      });
      notify.success(`${activeReport.title} export ready.`);
    } catch (error) {
      reportApiError(error, "Report export failed.");
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-950 dark:text-gray-50">
            Reports
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {health.ok}/{health.total} reports loaded
            {health.failed ? `, ${health.failed} failed` : ""}
          </p>
          {lastUpdated ? (
            <p className="mt-1 text-xs text-gray-400">
              Last updated: {lastUpdated}
            </p>
          ) : null}
        </div>
        <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-3 shadow-sm sm:flex-row sm:items-end dark:border-gray-800 dark:bg-gray-950">
          <label className="text-xs font-medium text-gray-600 dark:text-gray-300">
            From
            <input
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              className="mt-1 h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900"
            />
          </label>
          <label className="text-xs font-medium text-gray-600 dark:text-gray-300">
            To
            <input
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              className="mt-1 h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900"
            />
          </label>
          {/* <label className="text-xs font-medium text-gray-600 dark:text-gray-300">
            Lead Country
            <select
              value={filters.country}
              onChange={(event) =>
                setFilters((current) => ({ ...current, country: event.target.value }))
              }
              disabled={filterOptionsLoading}
              className="mt-1 h-10 min-w-[150px] rounded-lg border border-gray-200 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900"
            >
              <option value="">All countries</option>
              {filterOptions.countries.map((country) => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-medium text-gray-600 dark:text-gray-300">
            Lead Source
            <select
              value={filters.source}
              onChange={(event) =>
                setFilters((current) => ({ ...current, source: event.target.value }))
              }
              disabled={filterOptionsLoading}
              className="mt-1 h-10 min-w-[150px] rounded-lg border border-gray-200 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900"
            >
              <option value="">All sources</option>
              {filterOptions.sources.map((source) => (
                <option key={source} value={source}>
                  {source}
                </option>
              ))}
            </select>
          </label> */}

          <button
            type="button"
            onClick={() => void loadReports()}
            disabled={health.loading > 0}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white disabled:opacity-60"
          >
            <FaRotate className={health.loading ? "animate-spin" : ""} />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => setFilters({ country: "", source: "" })}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-gray-200 px-4 text-sm font-semibold text-gray-700 dark:border-gray-700 dark:text-gray-200"
          >
            Reset
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[290px_minmax(0,1fr)]">
        <SurfaceCard className="border border-gray-200 p-3 dark:border-gray-800">
          <div className="space-y-4">
            {groups.map((group) => (
              <div key={group}>
                <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  {group}
                </p>
                <div className="space-y-1">
                  {reportDefinitions
                    .filter((report) => report.group === group)
                    .map((report) => {
                      const result = results[report.id];
                      const active = report.id === activeId;
                      return (
                        <button
                          key={report.id}
                          type="button"
                          onClick={() => setActiveId(report.id)}
                          className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm ${
                            active
                              ? "bg-blue-50 font-semibold text-blue-700 dark:bg-blue-950/50 dark:text-blue-200"
                              : "text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-900"
                          }`}
                        >
                          <span className="truncate">{report.title}</span>
                          <span
                            className={`ml-2 h-2 w-2 rounded-full ${
                              result?.loading
                                ? "bg-amber-400"
                                : result?.ok
                                  ? "bg-emerald-500"
                                  : result?.error
                                    ? "bg-red-500"
                                    : "bg-gray-300"
                            }`}
                          />
                        </button>
                      );
                    })}
                </div>
              </div>
            ))}
          </div>
        </SurfaceCard>

        <div className="space-y-4">
          <SurfaceCard className="border border-gray-200 p-4 dark:border-gray-800">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  {activeReport.group}
                </p>
                <h2 className="mt-1 text-lg font-semibold text-gray-950 dark:text-gray-50">
                  {activeReport.title}
                </h2>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => void handleExport("csv")}
                  disabled={Boolean(exporting) || !activeRows.length || Boolean(activeResult?.loading)}
                  className="h-9 rounded-lg border border-gray-200 px-3 text-sm font-semibold text-gray-700 disabled:opacity-50 dark:border-gray-700 dark:text-gray-200"
                >
                  {exporting === "csv" ? "Exporting..." : "CSV"}
                </button>
                <button
                  type="button"
                  onClick={() => void handleExport("xlsx")}
                  disabled={Boolean(exporting) || !activeRows.length || Boolean(activeResult?.loading)}
                  className="h-9 rounded-lg border border-gray-200 px-3 text-sm font-semibold text-gray-700 disabled:opacity-50 dark:border-gray-700 dark:text-gray-200"
                >
                  {exporting === "xlsx" ? "Exporting..." : "XLSX"}
                </button>
                <span
                  className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${
                    activeResult?.loading
                      ? "bg-amber-50 text-amber-700"
                      : activeResult?.ok
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-red-50 text-red-700"
                  }`}
                >
                  {activeResult?.loading ? "Loading" : activeResult?.ok ? "Connected" : "Failed"}
                </span>
              </div>
            </div>
          </SurfaceCard>

          {activeResult?.error ? (
            <SurfaceCard className="border border-red-200 bg-red-50 p-4 text-red-700">
              <div className="flex items-start gap-3">
                <FaTriangleExclamation className="mt-1" />
                <div>
                  <p className="font-semibold">Report failed.</p>
                  <p className="mt-1 text-sm">{activeResult.error}</p>
                </div>
              </div>
            </SurfaceCard>
          ) : null}

          {summaryRows.length ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              {summaryRows.map((metric) => (
                <SurfaceCard
                  key={metric.label}
                  className="border border-gray-200 p-4 dark:border-gray-800"
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {metric.label}
                  </p>
                  <p className="mt-3 text-2xl font-semibold leading-tight text-gray-950 dark:text-gray-50">
                    {formatValue(metric.value, metric)}
                  </p>
                </SurfaceCard>
              ))}
            </div>
          ) : null}

          <ReportTable
            columns={activeReport.columns}
            rows={activeRows}
            loading={Boolean(activeResult?.loading)}
            formatValue={formatValue}
            page={tablePage}
            pageSize={pageSize}
            serverPagination={activePagination}
            onPageChange={setTablePage}
            onPageSizeChange={setPageSize}
          />
        </div>
      </div>
    </div>
  );
};

const ReportTable = ({
  columns,
  rows,
  loading,
  formatValue,
  page,
  pageSize,
  serverPagination,
  onPageChange,
  onPageSizeChange,
}: {
  columns: ReportColumn[];
  rows: ReportRow[];
  loading: boolean;
  formatValue: (value: unknown, column?: ReportColumn, row?: ReportRow) => string;
  page: number;
  pageSize: number;
  serverPagination?: ReportPagination | null;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}) => {
  const isServerPaginated = Boolean(serverPagination);
  const totalRows = serverPagination?.totalRows ?? rows.length;
  const totalPages =
    serverPagination?.totalPages ?? Math.max(1, Math.ceil(totalRows / pageSize));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const activePageSize = serverPagination?.pageSize ?? pageSize;
  const start = (safePage - 1) * activePageSize;
  const visibleRows =
    isServerPaginated ? rows : rows.slice(start, start + activePageSize);
  const firstRow = totalRows ? start + 1 : 0;
  const lastRow = Math.min(start + visibleRows.length, totalRows);
  const hasSerialColumn = columns.some((column) => column.key === "rowNumber");
  const tableMinWidth = columns.reduce((total, column) => {
    const width = column.width ? Number.parseInt(column.width, 10) : 120;
    return total + (Number.isFinite(width) ? width : 120);
  }, hasSerialColumn ? 0 : 64);

  useEffect(() => {
    if (!loading && safePage !== page) {
      onPageChange(safePage);
    }
  }, [loading, onPageChange, page, safePage]);

  return (
    <SurfaceCard className="overflow-hidden border border-gray-200 p-0 dark:border-gray-800">
      {loading ? (
        <div className="p-5 text-sm text-gray-500">Loading...</div>
      ) : rows.length ? (
        <>
          <div className="flex flex-col gap-3 border-b border-gray-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-gray-800">
            <p className="text-sm text-gray-500">
              Showing {firstRow}-{lastRow} of {totalRows}
            </p>
            <div className="flex items-center gap-2">
              <select
                value={pageSize}
                onChange={(event) => onPageSizeChange(Number(event.target.value))}
                className="h-9 rounded-lg border border-gray-200 bg-white px-2 text-sm dark:border-gray-700 dark:bg-gray-900"
              >
                {[10, 25, 50, 100].map((size) => (
                  <option key={size} value={size}>
                    {size} rows
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => onPageChange(safePage - 1)}
                disabled={safePage <= 1}
                className="h-9 rounded-lg border border-gray-200 px-3 text-sm font-medium disabled:opacity-50 dark:border-gray-700"
              >
                Prev
              </button>
              <span className="text-sm text-gray-500">
                {safePage}/{totalPages}
              </span>
              <button
                type="button"
                onClick={() => onPageChange(safePage + 1)}
                disabled={safePage >= totalPages}
                className="h-9 rounded-lg border border-gray-200 px-3 text-sm font-medium disabled:opacity-50 dark:border-gray-700"
              >
                Next
              </button>
            </div>
          </div>
          <div className="max-h-[62vh] overflow-auto">
            <table
              className="w-full table-fixed"
              style={{ minWidth: `${Math.max(tableMinWidth, 920)}px` }}
            >
              <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-900">
                <tr>
                  {!hasSerialColumn ? (
                    <th className="w-16 px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      S.No.
                    </th>
                  ) : null}
                  {columns.map((column) => (
                    <th
                      key={column.key}
                      style={column.width ? { width: column.width } : undefined}
                      className="whitespace-nowrap px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500"
                    >
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((row, index) => (
                  <tr
                    key={String(row.id || row.userId || row.bookingId || start + index)}
                    className="border-b border-gray-100 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900/60"
                  >
                    {!hasSerialColumn ? (
                      <td className="px-3 py-2.5 text-sm text-gray-800 dark:text-gray-200">
                        {start + index + 1}
                      </td>
                    ) : null}
                    {columns.map((column) => {
                      const value = row[column.key];
                      const textClass =
                        column.wrap
                          ? "whitespace-normal break-words leading-snug"
                          : column.truncate
                            ? "truncate whitespace-nowrap"
                            : "truncate whitespace-nowrap";
                      return (
                        <td
                          key={column.key}
                          className="px-3 py-2.5 align-top text-sm text-gray-800 dark:text-gray-200"
                          title={String(value ?? "")}
                        >
                          <div className={textClass}>
                            {formatValue(value, column, row)}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="p-5 text-sm text-gray-500">No data found for selected filters.</div>
      )}
    </SurfaceCard>
  );
};

export default ReportsPage;
