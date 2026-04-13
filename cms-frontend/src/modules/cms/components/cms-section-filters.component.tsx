import { Component, type ChangeEvent } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import SearchDropDown from "../../../shared/components/search-dropdown.component";
import SurfaceCardComponent from "../../../shared/components/cards/surface-card.component";
import type {
  ColumnFilterDefinition,
  DateRangeFilter,
} from "../models/cms-column-filter.model";

interface CmsSectionFiltersProps {
  sectionTitle: string;
  searchQuery: string;
  showAdvancedFilters: boolean;
  columnFilterDefinitions: ColumnFilterDefinition[];
  columnFilters: Record<string, string>;
  dateColumnFilters: Record<string, DateRangeFilter>;
  hasActiveFilters: boolean;
  onSearchChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onToggleAdvancedFilters: () => void;
  onColumnFilterChange: (columnKey: string, value: string) => void;
  onDateColumnFilterChange: (
    columnKey: string,
    boundary: "from" | "to",
    value: string,
  ) => void;
  onDateInputBlur: (
    columnKey: string,
    boundary: "from" | "to",
    value: string,
  ) => void;
  onClearFilters: () => void;
}

class CmsSectionFiltersComponent extends Component<CmsSectionFiltersProps> {
  render() {
    const {
      sectionTitle,
      searchQuery,
      showAdvancedFilters,
      columnFilterDefinitions,
      columnFilters,
      dateColumnFilters,
      hasActiveFilters,
      onSearchChange,
      onToggleAdvancedFilters,
      onColumnFilterChange,
      onDateColumnFilterChange,
      onDateInputBlur,
      onClearFilters,
    } = this.props;

    return (
      <SurfaceCardComponent>
        <div className="grid gap-3 lg:grid-cols-[1.4fr_auto]">
          <label className="relative">
            <Search
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={onSearchChange}
              placeholder={`Search in ${sectionTitle.toLowerCase()}...`}
              className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] pl-9 pr-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--ring)]"
            />
          </label>
          <button
            type="button"
            onClick={onToggleAdvancedFilters}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text-secondary)]"
          >
            <SlidersHorizontal size={14} />
            Filters
          </button>
        </div>

        {showAdvancedFilters && (
          <div className="mt-3 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {columnFilterDefinitions.map((definition) => (
                <label
                  key={definition.key}
                  className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-secondary)]"
                >
                  {definition.label}
                  {definition.type === "dropdown" && (
                    <div className="mt-1.5">
                      <SearchDropDown
                        value={columnFilters[definition.key] ?? ""}
                        options={definition.options.map((option) => ({
                          label: option,
                          value: option,
                        }))}
                        placeholder="All"
                        onChange={(nextValue) =>
                          onColumnFilterChange(definition.key, nextValue)
                        }
                      />
                    </div>
                  )}
                  {definition.type === "text" && (
                    <input
                      type="text"
                      value={columnFilters[definition.key] ?? ""}
                      onChange={(event) =>
                        onColumnFilterChange(definition.key, event.target.value)
                      }
                      placeholder={`Filter ${definition.label.toLowerCase()}...`}
                      className="mt-1.5 h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 text-sm normal-case tracking-normal text-[var(--text-primary)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--ring)]"
                    />
                  )}
                  {definition.type === "date" && (
                    <div className="mt-1.5 grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={dateColumnFilters[definition.key]?.from ?? ""}
                        onChange={(event) =>
                          onDateColumnFilterChange(
                            definition.key,
                            "from",
                            event.target.value,
                          )
                        }
                        onBlur={(event) =>
                          onDateInputBlur(definition.key, "from", event.target.value)
                        }
                        placeholder="dd/mm/yyyy"
                        className="h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 text-sm normal-case tracking-normal text-[var(--text-primary)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--ring)]"
                      />
                      <input
                        type="text"
                        value={dateColumnFilters[definition.key]?.to ?? ""}
                        onChange={(event) =>
                          onDateColumnFilterChange(
                            definition.key,
                            "to",
                            event.target.value,
                          )
                        }
                        onBlur={(event) =>
                          onDateInputBlur(definition.key, "to", event.target.value)
                        }
                        placeholder="dd/mm/yyyy"
                        className="h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 text-sm normal-case tracking-normal text-[var(--text-primary)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--ring)]"
                      />
                    </div>
                  )}
                </label>
              ))}
            </div>

            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={onClearFilters}
                disabled={!hasActiveFilters}
                className="inline-flex h-9 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-xs font-semibold text-[var(--text-secondary)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Clear Filters
              </button>
            </div>
          </div>
        )}
      </SurfaceCardComponent>
    );
  }
}

export default CmsSectionFiltersComponent;
