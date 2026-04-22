import {
  Component,
  createRef,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { Search, X } from "lucide-react";
import SurfaceCardComponent from "../../../shared/components/cards/surface-card.component";
import type {
  UniversalFilterColumn,
  UniversalFilterIndex,
  UniversalFilterSuggestion,
  UniversalFilterToken,
} from "../models/cms-column-filter.model";

interface CmsSectionFiltersProps {
  sectionTitle: string;
  columns: UniversalFilterColumn[];
  filterIndex: UniversalFilterIndex;
  activeFilters: UniversalFilterToken[];
  hasActiveFilters: boolean;
  onFilterChange: (filters: UniversalFilterToken[]) => void;
  onClearFilters: () => void;
  getSuggestions: (
    inputValue: string,
    columns: UniversalFilterColumn[],
    index: UniversalFilterIndex,
    activeFilters: UniversalFilterToken[],
    limit?: number,
  ) => UniversalFilterSuggestion[];
  createToken: (
    inputValue: string,
    columns: UniversalFilterColumn[],
    index: UniversalFilterIndex,
  ) => UniversalFilterToken | null;
}

interface CmsSectionFiltersState {
  inputValue: string;
  debouncedValue: string;
  isInputFocused: boolean;
  activeSuggestionIndex: number;
}

class CmsSectionFiltersComponent extends Component<
  CmsSectionFiltersProps,
  CmsSectionFiltersState
> {
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly rootRef = createRef<HTMLDivElement>();
  private readonly inputRef = createRef<HTMLInputElement>();

  state: CmsSectionFiltersState = {
    inputValue: "",
    debouncedValue: "",
    isInputFocused: false,
    activeSuggestionIndex: 0,
  };

  componentDidMount(): void {
    document.addEventListener("mousedown", this.handleOutsideClick);
  }

  componentWillUnmount(): void {
    document.removeEventListener("mousedown", this.handleOutsideClick);
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
  }

  private handleOutsideClick = (event: MouseEvent): void => {
    if (!this.rootRef.current) {
      return;
    }
    if (this.rootRef.current.contains(event.target as Node)) {
      return;
    }
    this.setState({
      isInputFocused: false,
      activeSuggestionIndex: 0,
    });
  };

  private scheduleDebounce(value: string): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(() => {
      this.setState({
        debouncedValue: value,
        activeSuggestionIndex: 0,
      });
    }, 180);
  }

  private onInputChange = (value: string): void => {
    let nextValue = value;
    const normalized = value.trim().toLowerCase();
    const hasColon = normalized.includes(":");
    if (!hasColon && normalized.length >= 3) {
      const matches = this.props.columns.filter((column) => {
        const key = column.key.toLowerCase();
        const label = column.label.toLowerCase();
        return key.startsWith(normalized) || label.startsWith(normalized);
      });
      if (matches.length === 1) {
        nextValue = `${matches[0].key}: `;
      }
    }
    this.setState({
      inputValue: nextValue,
    });
    this.scheduleDebounce(nextValue);
  };

  private addFilterToken = (token: UniversalFilterToken): void => {
    if (!token.value || !token.value.trim()) {
      this.setState({
        inputValue: `${token.key}: `,
        debouncedValue: `${token.key}: `,
        isInputFocused: true,
        activeSuggestionIndex: 0,
      });
      return;
    }
    const normalizedTokenKey = `${token.key}:${token.value.trim().toLowerCase()}`;
    const alreadyAdded = this.props.activeFilters.some(
      (existing) =>
        `${existing.key}:${existing.value.trim().toLowerCase()}` ===
        normalizedTokenKey,
    );
    if (alreadyAdded) {
      this.setState({
        inputValue: "",
        debouncedValue: "",
        activeSuggestionIndex: 0,
      });
      return;
    }

    this.props.onFilterChange([...this.props.activeFilters, token]);
    this.setState({
      inputValue: "",
      debouncedValue: "",
      activeSuggestionIndex: 0,
    });
  };

  private removeFilterToken = (index: number): void => {
    this.props.onFilterChange(
      this.props.activeFilters.filter((_, tokenIndex) => tokenIndex !== index),
    );
  };

  private onInputKeyDown = (
    event: ReactKeyboardEvent<HTMLInputElement>,
  ): void => {
    const suggestions = this.getVisibleSuggestions();
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (suggestions.length === 0) {
        return;
      }
      this.setState((prevState) => ({
        activeSuggestionIndex:
          (prevState.activeSuggestionIndex + 1) % suggestions.length,
      }));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (suggestions.length === 0) {
        return;
      }
      this.setState((prevState) => ({
        activeSuggestionIndex:
          (prevState.activeSuggestionIndex - 1 + suggestions.length) %
          suggestions.length,
      }));
      return;
    }

    if (event.key === "Escape") {
      this.setState({ isInputFocused: false, activeSuggestionIndex: 0 });
      return;
    }

    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    if (suggestions.length > 0) {
      this.addFilterToken({
        key: suggestions[this.state.activeSuggestionIndex].key,
        value: suggestions[this.state.activeSuggestionIndex].value,
      });
      return;
    }

    const createdToken = this.props.createToken(
      this.state.inputValue,
      this.props.columns,
      this.props.filterIndex,
    );
    if (createdToken) {
      this.addFilterToken(createdToken);
    }
  };

  private getVisibleSuggestions(): UniversalFilterSuggestion[] {
    if (!this.state.isInputFocused) {
      return [];
    }
    return this.props.getSuggestions(
      this.state.debouncedValue,
      this.props.columns,
      this.props.filterIndex,
      this.props.activeFilters,
      10,
    );
  }

  render() {
    const suggestions = this.getVisibleSuggestions();
    const listboxId = `${this.props.sectionTitle.replaceAll(/\s+/g, "-").toLowerCase()}-filter-suggestions`;

    return (
      <SurfaceCardComponent>
        <div className="space-y-3" ref={this.rootRef}>
          <div className="relative">
            <Search
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]"
            />
            <input
              ref={this.inputRef}
              type="text"
              value={this.state.inputValue}
              onChange={(event) => this.onInputChange(event.target.value)}
              onFocus={() => this.setState({ isInputFocused: true })}
              onKeyDown={this.onInputKeyDown}
              placeholder="Filter (e.g. category:honeymoon, status:active)"
              className="h-10 w-full rounded-xl border border-[var(--border)] bg-(--surface) pl-9 pr-10 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--ring)] sm:h-11"
              role="combobox"
              aria-expanded={suggestions.length > 0}
              aria-controls={listboxId}
              aria-autocomplete="list"
              aria-activedescendant={
                suggestions.length > 0 ?
                  `${listboxId}-${this.state.activeSuggestionIndex}`
                : undefined
              }
            />
            {this.state.inputValue.trim().length > 0 && (
              <button
                type="button"
                onClick={() =>
                  this.setState({ inputValue: "", debouncedValue: "" })
                }
                className="absolute right-2 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-[var(--text-secondary)] transition hover:bg-[var(--background-soft)]"
                aria-label="Clear filter input"
              >
                <X size={14} />
              </button>
            )}

            {suggestions.length > 0 && (
              <div
                id={listboxId}
                role="listbox"
                className="absolute z-30 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-[var(--border)] bg-(--surface) p-1 shadow-lg"
              >
                {suggestions.map((suggestion, index) => (
                  <button
                    key={`${suggestion.key}-${suggestion.value}-${index}`}
                    id={`${listboxId}-${index}`}
                    role="option"
                    aria-selected={index === this.state.activeSuggestionIndex}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() =>
                      this.addFilterToken({
                        key: suggestion.key,
                        value: suggestion.value,
                      })
                    }
                    className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                      index === this.state.activeSuggestionIndex ?
                        "bg-[color-mix(in_srgb,var(--primary)_16%,transparent)] text-[var(--text-primary)]"
                      : "text-[var(--text-secondary)] hover:bg-[var(--background-soft)]"
                    }`}
                  >
                    {suggestion.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-start gap-2 overflow-y-auto rounded-xl border border-[var(--border)] bg-(--surface) p-2 max-h-[84px]">
            {this.props.activeFilters.length === 0 && (
              <span className="px-2 py-1 text-xs text-[var(--text-secondary)]">
                No active filters.
              </span>
            )}
            {this.props.activeFilters.map((filter, index) => (
              <span
                key={`${filter.key}:${filter.value}:${index}`}
                className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--background-soft)] px-2.5 py-1 text-xs font-medium text-[var(--text-primary)]"
              >
                {filter.key}: {filter.value}
                <button
                  type="button"
                  onClick={() => this.removeFilterToken(index)}
                  className="inline-flex h-4 w-4 items-center justify-center rounded-full text-[var(--text-secondary)] transition hover:bg-[var(--surface)]"
                  aria-label={`Remove filter ${filter.key}:${filter.value}`}
                >
                  <X size={11} />
                </button>
              </span>
            ))}
          </div>

          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={this.props.onClearFilters}
              disabled={!this.props.hasActiveFilters}
              className="inline-flex h-9 items-center justify-center rounded-lg border border-[var(--border)] bg-(--surface) px-3 text-xs font-semibold text-[var(--text-secondary)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Clear All Filters
            </button>
          </div>
        </div>
      </SurfaceCardComponent>
    );
  }
}

export default CmsSectionFiltersComponent;
