import type { JsonRecord } from "../types/json-record.type";

class CmsRecordAccessor {
  public unwrapPayload(payload: unknown): unknown {
    if (!payload || typeof payload !== "object") {
      return payload;
    }

    const wrapped = payload as { data?: unknown };
    if ("data" in wrapped) {
      return wrapped.data;
    }
    return payload;
  }

  public toArray(payload: unknown): JsonRecord[] {
    const unwrapped = this.unwrapPayload(payload);
    if (Array.isArray(unwrapped)) {
      return unwrapped.filter(
        (item): item is JsonRecord =>
          typeof item === "object" && item !== null,
      );
    }
    return [];
  }

  public toRecord(payload: unknown): JsonRecord | null {
    const unwrapped = this.unwrapPayload(payload);
    if (unwrapped && typeof unwrapped === "object" && !Array.isArray(unwrapped)) {
      return unwrapped as JsonRecord;
    }
    return null;
  }

  public getText(record: JsonRecord, ...keys: string[]): string {
    for (const key of keys) {
      const value = record[key];
      if (value === null || value === undefined) {
        continue;
      }
      return String(value);
    }
    return "--";
  }

  public getNumber(record: JsonRecord, ...keys: string[]): number | null {
    for (const key of keys) {
      const value = record[key];
      if (typeof value === "number") {
        return value;
      }
      if (typeof value === "string" && value.trim()) {
        const parsed = Number(value);
        if (!Number.isNaN(parsed)) {
          return parsed;
        }
      }
    }
    return null;
  }

  public getBoolean(record: JsonRecord, ...keys: string[]): boolean {
    for (const key of keys) {
      const value = record[key];
      if (typeof value === "boolean") {
        return value;
      }
      if (typeof value === "string") {
        if (value.toLowerCase() === "true") {
          return true;
        }
        if (value.toLowerCase() === "false") {
          return false;
        }
      }
    }
    return false;
  }

  public getId(record: JsonRecord): string | null {
    const id = record.id;
    if (typeof id === "string" && id.length > 0) {
      return id;
    }
    return null;
  }
}

export { CmsRecordAccessor };
