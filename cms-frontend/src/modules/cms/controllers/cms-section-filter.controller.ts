import type { CmsTableEntry } from "../types/cms-table-entry.type";
import type {
  UniversalFilterColumn,
  UniversalFilterIndex,
  UniversalFilterSuggestion,
  UniversalFilterToken,
} from "../models/cms-column-filter.model";

class CmsSectionFilterController {
  public buildFilterColumns(
    rows: CmsTableEntry[],
    sectionColumns: { key: string; label: string }[],
  ): UniversalFilterColumn[] {
    return sectionColumns.map((column) => {
      const values = rows
        .map((entry) => entry.row.cells[column.key]?.value ?? "")
        .map((value) => this.normalizeText(value))
        .filter((value) => value.length > 0 && value !== "--");
      const uniqueValues = new Set(values);
      const type =
        uniqueValues.size > 1 && uniqueValues.size <= 12 ? "enum" : "string";
      return {
        key: column.key,
        label: column.label,
        type,
      };
    });
  }

  public buildFilterIndex(
    rows: CmsTableEntry[],
    columns: UniversalFilterColumn[],
  ): UniversalFilterIndex {
    const index: UniversalFilterIndex = {};
    for (const column of columns) {
      const seen = new Set<string>();
      const values: string[] = [];
      for (const row of rows) {
        const rawValue = row.row.cells[column.key]?.value ?? "";
        const normalized = this.normalizeText(rawValue);
        if (!normalized || normalized === "--" || seen.has(normalized)) {
          continue;
        }
        seen.add(normalized);
        values.push(rawValue.trim());
      }
      values.sort((first, second) => first.localeCompare(second));
      index[column.key] = values;
    }
    return index;
  }

  public createToken(
    rawInput: string,
    columns: UniversalFilterColumn[],
    index: UniversalFilterIndex,
  ): UniversalFilterToken | null {
    const trimmedInput = rawInput.trim();
    if (!trimmedInput) {
      return null;
    }

    const colonIndex = trimmedInput.indexOf(":");
    if (colonIndex > -1) {
      const keyPart = trimmedInput.slice(0, colonIndex);
      const valuePart = trimmedInput.slice(colonIndex + 1);
      const resolvedKey = this.resolveColumnKey(keyPart, columns);
      const normalizedValue = this.normalizeText(valuePart);
      if (!resolvedKey || !normalizedValue) {
        return null;
      }
      return {
        key: resolvedKey,
        value: valuePart.trim(),
      };
    }

    const normalizedInput = this.normalizeText(trimmedInput);
    if (!normalizedInput) {
      return null;
    }

    for (const column of columns) {
      const matched = (index[column.key] ?? []).find((value) =>
        this.normalizeText(value).includes(normalizedInput),
      );
      if (matched) {
        return {
          key: column.key,
          value: matched,
        };
      }
    }

    return null;
  }

  public getSuggestions(
    rawInput: string,
    columns: UniversalFilterColumn[],
    index: UniversalFilterIndex,
    activeFilters: UniversalFilterToken[],
    limit = 10,
  ): UniversalFilterSuggestion[] {
    const trimmedInput = rawInput.trim();
    if (!trimmedInput) {
      return [];
    }

    const suggestions: UniversalFilterSuggestion[] = [];
    const dedupe = new Set<string>();
    const activeSet = new Set(
      activeFilters.map(
        (filter) =>
          `${filter.key}:${this.normalizeText(filter.value)}`,
      ),
    );

    const pushSuggestion = (
      key: string,
      value: string,
      label?: string,
    ): void => {
      const normalized = this.normalizeText(value);
      if (!normalized) {
        return;
      }
      const dedupeKey = `${key}:${normalized}`;
      if (dedupe.has(dedupeKey) || activeSet.has(dedupeKey)) {
        return;
      }
      dedupe.add(dedupeKey);
      suggestions.push({
        key,
        value,
        label: label ?? `${key}: ${value}`,
      });
    };

    const colonIndex = trimmedInput.indexOf(":");
    if (colonIndex > -1) {
      const keyQuery = this.normalizeText(trimmedInput.slice(0, colonIndex));
      const valueQuery = this.normalizeText(trimmedInput.slice(colonIndex + 1));
      const matchingColumns = columns.filter((column) => {
        const normalizedKey = this.normalizeText(column.key);
        const normalizedLabel = this.normalizeText(column.label);
        if (!keyQuery) {
          return true;
        }
        return (
          normalizedKey.includes(keyQuery) || normalizedLabel.includes(keyQuery)
        );
      });

      for (const column of matchingColumns) {
        const values = index[column.key] ?? [];
        for (const value of values) {
          const normalizedValue = this.normalizeText(value);
          if (valueQuery && !normalizedValue.includes(valueQuery)) {
            continue;
          }
          pushSuggestion(
            column.key,
            value,
            `${column.key}: ${value}`,
          );
          if (suggestions.length >= limit) {
            return suggestions;
          }
        }
      }

      return suggestions;
    }

    const normalizedInput = this.normalizeText(trimmedInput);
    const matchingColumns = columns.filter((column) => {
      const normalizedKey = this.normalizeText(column.key);
      const normalizedLabel = this.normalizeText(column.label);
      return (
        normalizedKey.includes(normalizedInput) ||
        normalizedLabel.includes(normalizedInput)
      );
    });

    for (const column of matchingColumns) {
      for (const value of index[column.key] ?? []) {
        pushSuggestion(column.key, value, `${column.key}: ${value}`);
        if (suggestions.length >= limit) {
          return suggestions;
        }
      }
    }

    for (const column of columns) {
      for (const value of index[column.key] ?? []) {
        if (!this.normalizeText(value).includes(normalizedInput)) {
          continue;
        }
        pushSuggestion(column.key, value, `${column.key}: ${value}`);
        if (suggestions.length >= limit) {
          return suggestions;
        }
      }
    }

    return suggestions;
  }

  public matchesFilters(
    entry: CmsTableEntry,
    activeFilters: UniversalFilterToken[],
  ): boolean {
    if (activeFilters.length === 0) {
      return true;
    }

    for (const filter of activeFilters) {
      const cellValue = entry.row.cells[filter.key]?.value ?? "";
      const normalizedCell = this.normalizeText(cellValue);
      const normalizedFilter = this.normalizeText(filter.value);
      if (!normalizedFilter) {
        continue;
      }

      if (normalizedFilter === "missing") {
        const isMissing =
          !normalizedCell || normalizedCell === "--" || normalizedCell === "n/a";
        if (!isMissing) {
          return false;
        }
        continue;
      }

      if (!normalizedCell.includes(normalizedFilter)) {
        return false;
      }
    }

    return true;
  }

  public hasAnyActiveFilters(activeFilters: UniversalFilterToken[]): boolean {
    return activeFilters.length > 0;
  }

  public toDDMMYYYY(value: string): string {
    const date = this.parseDateValue(value);
    if (!date) {
      return value;
    }
    return this.formatDateDDMMYYYY(date);
  }

  private resolveColumnKey(
    keyPart: string,
    columns: UniversalFilterColumn[],
  ): string | null {
    const normalizedQuery = this.normalizeText(keyPart);
    if (!normalizedQuery) {
      return null;
    }

    const exact = columns.find(
      (column) =>
        this.normalizeText(column.key) === normalizedQuery ||
        this.normalizeText(column.label) === normalizedQuery,
    );
    if (exact) {
      return exact.key;
    }

    const partial = columns.find((column) => {
      const normalizedKey = this.normalizeText(column.key);
      const normalizedLabel = this.normalizeText(column.label);
      return (
        normalizedKey.includes(normalizedQuery) ||
        normalizedLabel.includes(normalizedQuery)
      );
    });

    return partial?.key ?? null;
  }

  private normalizeText(value: string): string {
    return value.trim().toLowerCase();
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

  private formatDateDDMMYYYY(value: Date): string {
    const day = String(value.getDate()).padStart(2, "0");
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const year = value.getFullYear();
    return `${day}/${month}/${year}`;
  }
}

export { CmsSectionFilterController };
