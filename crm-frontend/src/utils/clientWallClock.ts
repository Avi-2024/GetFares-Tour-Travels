/** Wall-clock strings: `YYYY-MM-DD HH:mm:ss` in the user's locale — no UTC conversion. */

export function wallClockFromDatetimeLocal(value: string): string {
  const v = value.trim();
  if (!v) return "";
  const normalized = v.includes("T") ? v : v.replace(" ", "T");
  const [datePart, timePartRaw] = normalized.split("T");
  if (!datePart) return "";
  const timePart = timePartRaw || "00:00";
  const [hh, mm, ssRaw] = timePart.split(":");
  const ss = (ssRaw || "00").split(".")[0];
  const hhP = String(hh || "0").padStart(2, "0");
  const mmP = String(mm || "0").padStart(2, "0");
  const ssP = String(ss || "0").padStart(2, "0");
  return `${datePart} ${hhP}:${mmP}:${ssP}`;
}

export function parseWallClockLocal(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/.exec(
    value.trim(),
  );
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  const h = Number(m[4]);
  const mi = Number(m[5]);
  const s = Number(m[6]);
  const dt = new Date(y, mo, d, h, mi, s);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

export function formatWallClockLabel(
  localAt: string | null | undefined,
  tz: string | null | undefined,
): string {
  if (!localAt || !String(localAt).trim()) return "";
  const t =
    tz && String(tz).trim() ? ` (${String(tz).trim()})` : "";
  return `${String(localAt).trim()}${t}`;
}

export function nowWallClockString(): string {
  const n = new Date();
  const pad = (x: number) => String(x).padStart(2, "0");
  return `${n.getFullYear()}-${pad(n.getMonth() + 1)}-${pad(n.getDate())} ${pad(n.getHours())}:${pad(n.getMinutes())}:${pad(n.getSeconds())}`;
}

/** Returns current time as UTC ISO string so backend stores the correct instant. */
export function nowUtcIsoString(): string {
  return new Date().toISOString();
}
