import type { CmsTableEntry } from "../types/cms-table-entry.type";
import type {
  ColumnFilterDefinition,
  DateRangeFilter,
} from "../models/cms-column-filter.model";

class CmsSectionFilterController {
  public matchesSearch(entry: CmsTableEntry, query: string): boolean {
    if (!query.trim()) {
      return true;
    }
    const lowercaseQuery = query.toLowerCase();
    return Object.values(entry.row.cells).some((cell) =>
      cell.value.toLowerCase().includes(lowercaseQuery),
    );
  }

  public buildColumnFilterDefinitions(
    rows: CmsTableEntry[],
    sectionColumns: { key: string; label: string }[],
  ): ColumnFilterDefinition[] {
    return sectionColumns.map((column) => {
      const values = rows
        .map((entry) => entry.row.cells[column.key]?.value ?? "")
        .map((value) => value.trim())
        .filter((value) => value.length > 0 && value !== "--");

      if (this.isDateColumn(values, column.key, column.label)) {
        return {
          key: column.key,
          label: column.label,
          type: "date",
          options: [],
        };
      }

      if (this.shouldUseDropdown(values)) {
        return {
          key: column.key,
          label: column.label,
          type: "dropdown",
          options: Array.from(new Set(values)).sort((first, second) =>
            first.localeCompare(second),
          ),
        };
      }

      return {
        key: column.key,
        label: column.label,
        type: "text",
        options: [],
      };
    });
  }

  public matchesColumnFilters(
    entry: CmsTableEntry,
    definitions: ColumnFilterDefinition[],
    columnFilters: Record<string, string>,
    dateColumnFilters: Record<string, DateRangeFilter>,
  ): boolean {
    for (const definition of definitions) {
      const cellValue = entry.row.cells[definition.key]?.value ?? "";
      if (definition.type === "dropdown") {
        const selected = columnFilters[definition.key] ?? "";
        if (!selected) {
          continue;
        }
        if (cellValue.toLowerCase() !== selected.toLowerCase()) {
          return false;
        }
        continue;
      }

      if (definition.type === "text") {
        const query = (columnFilters[definition.key] ?? "").trim().toLowerCase();
        if (!query) {
          continue;
        }
        if (!cellValue.toLowerCase().includes(query)) {
          return false;
        }
        continue;
      }

      const range = dateColumnFilters[definition.key];
      if (!range || (!range.from && !range.to)) {
        continue;
      }

      const cellDate = this.parseDateValue(cellValue);
      if (!cellDate) {
        return false;
      }

      if (range.from) {
        const fromDate = this.parseDateInputDDMMYYYY(range.from);
        if (!fromDate) {
          return false;
        }
        fromDate.setHours(0, 0, 0, 0);
        if (cellDate < fromDate) {
          return false;
        }
      }

      if (range.to) {
        const toDate = this.parseDateInputDDMMYYYY(range.to);
        if (!toDate) {
          return false;
        }
        toDate.setHours(23, 59, 59, 999);
        if (cellDate > toDate) {
          return false;
        }
      }
    }

    return true;
  }

  public hasAnyActiveFilters(
    definitions: ColumnFilterDefinition[],
    columnFilters: Record<string, string>,
    dateColumnFilters: Record<string, DateRangeFilter>,
  ): boolean {
    for (const definition of definitions) {
      if (definition.type === "date") {
        const range = dateColumnFilters[definition.key];
        if (range && (range.from || range.to)) {
          return true;
        }
        continue;
      }
      if ((columnFilters[definition.key] ?? "").trim()) {
        return true;
      }
    }
    return false;
  }

  public normalizeDateInput(value: string): string {
    const parsedDate = this.parseDateInputDDMMYYYY(value);
    if (!parsedDate) {
      return value.trim();
    }
    return this.formatDateDDMMYYYY(parsedDate);
  }

  public toDDMMYYYY(value: string): string {
    const date = this.parseDateValue(value);
    if (!date) {
      return value;
    }
    return this.formatDateDDMMYYYY(date);
  }

  private parseDateValue(value: string): Date | null {
    const trimmedValue = value.trim();
    if (!trimmedValue || trimmedValue === "--") {
      return null;
    }

    const parsed = Date.parse(trimmedValue);
    if (!Number.isNaN(parsed)) {
      return new Date(parsed);
    }

    const normalized = trimmedValue.toLowerCase();
    if (normalized === "today") {
      return new Date();
    }
    if (normalized === "yesterday") {
      const date = new Date();
      date.setDate(date.getDate() - 1);
      return date;
    }

    const relativeMatch = normalized.match(
      /^(\d+)\s*(min|mins|minute|minutes|hour|hours|day|days|week|weeks)\s*ago$/,
    );
    if (!relativeMatch) {
      return null;
    }

    const amount = Number(relativeMatch[1]);
    const unit = relativeMatch[2];
    if (Number.isNaN(amount)) {
      return null;
    }

    const date = new Date();
    if (unit.startsWith("min")) {
      date.setMinutes(date.getMinutes() - amount);
      return date;
    }
    if (unit.startsWith("hour")) {
      date.setHours(date.getHours() - amount);
      return date;
    }
    if (unit.startsWith("day")) {
      date.setDate(date.getDate() - amount);
      return date;
    }
    date.setDate(date.getDate() - amount * 7);
    return date;
  }

  private parseDateInputDDMMYYYY(value: string): Date | null {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    const match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!match) {
      return null;
    }

    const day = Number(match[1]);
    const month = Number(match[2]);
    const year = Number(match[3]);
    const parsedDate = new Date(year, month - 1, day);

    if (
      parsedDate.getFullYear() !== year ||
      parsedDate.getMonth() !== month - 1 ||
      parsedDate.getDate() !== day
    ) {
      return null;
    }

    return parsedDate;
  }

  private formatDateDDMMYYYY(value: Date): string {
    const day = String(value.getDate()).padStart(2, "0");
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const year = value.getFullYear();
    return `${day}/${month}/${year}`;
  }

  private isDateColumn(values: string[], key: string, label: string): boolean {
    if (values.length === 0) {
      return false;
    }
    const parseableCount = values.filter((value) => this.parseDateValue(value)).length;
    if (parseableCount === 0) {
      return false;
    }

    const reference = `${key} ${label}`.toLowerCase();
    const hasDateToken =
      reference.includes("date") ||
      reference.includes("updated") ||
      reference.includes("created") ||
      reference.includes("time") ||
      reference.includes("sync");

    if (hasDateToken) {
      return true;
    }
    return parseableCount / values.length >= 0.7;
  }

  private isNumericLike(value: string): boolean {
    const normalized = value.replaceAll(",", "").replace(/[^\d.-]/g, "");
    if (!normalized) {
      return false;
    }
    return !Number.isNaN(Number(normalized));
  }

  private shouldUseDropdown(values: string[]): boolean {
    if (values.length === 0) {
      return false;
    }
    const uniqueValues = Array.from(new Set(values));
    if (uniqueValues.length <= 1) {
      return false;
    }
    const uniqueRatio = uniqueValues.length / values.length;
    const numericCount = values.filter((value) => this.isNumericLike(value)).length;
    const numericRatio = numericCount / values.length;
    const allCompact = uniqueValues.every((value) => value.length <= 28);

    return (
      uniqueValues.length <= 8 &&
      uniqueRatio <= 0.6 &&
      numericRatio < 0.5 &&
      allCompact
    );
  }
}

export { CmsSectionFilterController };
