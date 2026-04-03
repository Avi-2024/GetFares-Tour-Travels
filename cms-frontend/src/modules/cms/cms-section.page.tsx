import { Component, type ChangeEvent } from "react";
import { CirclePlus, Eye, PencilLine, Search, SlidersHorizontal, Trash2 } from "lucide-react";
import SurfaceCardComponent from "../../shared/components/cards/surface-card.component";
import ModalComponent from "../../shared/components/modal.component";
import { CmsSectionCatalog } from "./cms-section.catalog";
import { cmsDatasource, type CmsTableEntry } from "./cms.datasource";
import type { CmsSectionKey, CmsTableCellTone } from "./cms-section.models";

type ColumnFilterType = "text" | "dropdown" | "date";
type DateFilterBoundary = "from" | "to";

interface DateRangeFilter {
  from: string;
  to: string;
}

interface ColumnFilterDefinition {
  key: string;
  label: string;
  type: ColumnFilterType;
  options: string[];
}

interface CmsSectionPageProps {
  sectionKey: CmsSectionKey;
}

interface CmsSectionPageState {
  searchQuery: string;
  showAdvancedFilters: boolean;
  columnFilters: Record<string, string>;
  dateColumnFilters: Record<string, DateRangeFilter>;
  isLoading: boolean;
  rows: CmsTableEntry[];
  successMessage: string;
  errorMessage: string;
  modalMode: "create" | "edit" | "delete" | null;
  modalPayloadText: string;
  modalEditValue: string;
  selectedEntry: CmsTableEntry | null;
  modalErrorMessage: string;
  isModalSubmitting: boolean;
  viewEntry: CmsTableEntry | null;
  imagePreviewUrl: string;
  imagePreviewLabel: string;
}

class CmsSectionPage extends Component<CmsSectionPageProps, CmsSectionPageState> {
  state: CmsSectionPageState = {
    searchQuery: "",
    showAdvancedFilters: false,
    columnFilters: {},
    dateColumnFilters: {},
    isLoading: false,
    rows: [],
    successMessage: "",
    errorMessage: "",
    modalMode: null,
    modalPayloadText: "",
    modalEditValue: "",
    selectedEntry: null,
    modalErrorMessage: "",
    isModalSubmitting: false,
    viewEntry: null,
    imagePreviewUrl: "",
    imagePreviewLabel: "",
  };

  componentDidMount(): void {
    void this.loadRows();
  }

  componentDidUpdate(prevProps: CmsSectionPageProps): void {
    if (prevProps.sectionKey !== this.props.sectionKey) {
      this.setState(
        {
          searchQuery: "",
          showAdvancedFilters: false,
          columnFilters: {},
          dateColumnFilters: {},
          successMessage: "",
          errorMessage: "",
          modalMode: null,
          modalPayloadText: "",
          modalEditValue: "",
          selectedEntry: null,
          modalErrorMessage: "",
          isModalSubmitting: false,
          viewEntry: null,
          imagePreviewUrl: "",
          imagePreviewLabel: "",
        },
        () => {
          void this.loadRows();
        },
      );
    }
  }

  private setError(message: string): void {
    this.setState({ errorMessage: message, successMessage: "" });
  }

  private setSuccess(message: string): void {
    this.setState({ successMessage: message, errorMessage: "" });
  }

  private async loadRows(): Promise<void> {
    this.setState({ isLoading: true, errorMessage: "" });
    try {
      const rows = await cmsDatasource.list(this.props.sectionKey);
      this.setState({ rows });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load records.";
      this.setError(message);
    } finally {
      this.setState({ isLoading: false });
    }
  }

  private onSearchChange = (event: ChangeEvent<HTMLInputElement>): void => {
    this.setState({ searchQuery: event.target.value });
  };

  private onToggleAdvancedFilters = (): void => {
    this.setState((prevState) => ({
      showAdvancedFilters: !prevState.showAdvancedFilters,
    }));
  };

  private onColumnFilterChange = (columnKey: string, value: string): void => {
    this.setState((prevState) => ({
      columnFilters: {
        ...prevState.columnFilters,
        [columnKey]: value,
      },
    }));
  };

  private onDateColumnFilterChange = (
    columnKey: string,
    boundary: DateFilterBoundary,
    value: string,
  ): void => {
    this.setState((prevState) => ({
      dateColumnFilters: {
        ...prevState.dateColumnFilters,
        [columnKey]: {
          from: prevState.dateColumnFilters[columnKey]?.from ?? "",
          to: prevState.dateColumnFilters[columnKey]?.to ?? "",
          [boundary]: value,
        },
      },
    }));
  };

  private clearAllColumnFilters = (): void => {
    this.setState({
      columnFilters: {},
      dateColumnFilters: {},
    });
  };

  private matchesSearch(entry: CmsTableEntry, query: string): boolean {
    if (!query.trim()) {
      return true;
    }
    const lowercaseQuery = query.toLowerCase();
    return Object.values(entry.row.cells).some((cell) =>
      cell.value.toLowerCase().includes(lowercaseQuery),
    );
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

  private toDDMMYYYY(value: string): string {
    const date = this.parseDateValue(value);
    if (!date) {
      return value;
    }
    return this.formatDateDDMMYYYY(date);
  }

  private normalizeDateInput(value: string): string {
    const parsedDate = this.parseDateInputDDMMYYYY(value);
    if (!parsedDate) {
      return value.trim();
    }
    return this.formatDateDDMMYYYY(parsedDate);
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

  private buildColumnFilterDefinitions(
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

  private matchesColumnFilters(
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

  private hasAnyActiveFilters(
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

  private onDateInputBlur = (
    columnKey: string,
    boundary: DateFilterBoundary,
    value: string,
  ): void => {
    this.onDateColumnFilterChange(columnKey, boundary, this.normalizeDateInput(value));
  };

  private getImageUrlFromEntry(entry: CmsTableEntry): string | null {
    const preferredKeys = [
      "imageUrl",
      "image_url",
      "heroImageUrl",
      "hero_image_url",
      "thumbnailUrl",
      "thumbnail_url",
      "bannerUrl",
      "banner_url",
      "photoUrl",
      "photo_url",
    ];

    for (const key of preferredKeys) {
      const value = entry.raw[key];
      if (typeof value === "string" && value.trim().length > 0) {
        return value;
      }
    }

    for (const [key, value] of Object.entries(entry.raw)) {
      if (typeof value !== "string") {
        continue;
      }
      const lowerKey = key.toLowerCase();
      const lowerValue = value.toLowerCase();
      const hasImageHint =
        lowerKey.includes("image") ||
        lowerKey.includes("photo") ||
        lowerKey.includes("banner") ||
        lowerKey.includes("thumbnail");
      const hasImageUrlHint =
        lowerValue.includes(".jpg") ||
        lowerValue.includes(".jpeg") ||
        lowerValue.includes(".png") ||
        lowerValue.includes(".webp") ||
        lowerValue.includes(".gif") ||
        lowerValue.includes("cloudinary") ||
        lowerValue.includes("/images/") ||
        lowerValue.startsWith("http");
      if (hasImageHint && hasImageUrlHint) {
        return value;
      }
    }

    return null;
  }

  private openViewModal = (entry: CmsTableEntry): void => {
    this.setState({ viewEntry: entry });
  };

  private closeViewModal = (): void => {
    this.setState({ viewEntry: null });
  };

  private openImagePreview = (url: string, label: string): void => {
    this.setState({
      imagePreviewUrl: url,
      imagePreviewLabel: label,
    });
  };

  private closeImagePreview = (): void => {
    this.setState({
      imagePreviewUrl: "",
      imagePreviewLabel: "",
    });
  };

  private getCellToneClass(tone: CmsTableCellTone): string {
    switch (tone) {
      case "success":
        return "bg-[color-mix(in_srgb,var(--success)_18%,transparent)] text-[var(--success)]";
      case "warning":
        return "bg-[color-mix(in_srgb,var(--warning)_16%,transparent)] text-[var(--warning)]";
      case "info":
        return "bg-[color-mix(in_srgb,var(--primary)_16%,transparent)] text-[var(--primary)]";
      default:
        return "text-[var(--text-secondary)]";
    }
  }

  private getCreateTemplate(sectionKey: CmsSectionKey): string {
    switch (sectionKey) {
      case "landing-places":
        return JSON.stringify(
          {
            name: "New Landing Place",
            description: "Short description",
            tag: "Trending",
            imageUrl: "https://example.com/image.jpg",
            displayOrder: 1,
            isActive: true,
          },
          null,
          2,
        );
      case "destinations":
        return JSON.stringify(
          {
            name: "New Destination",
            description: "Destination description",
            country: "Country",
            region: "Region",
            category: "Category",
            isActive: true,
          },
          null,
          2,
        );
      case "main-packages":
        return JSON.stringify(
          { packageId: "package-uuid", displayOrder: 1, isFeatured: false },
          null,
          2,
        );
      case "sub-packages":
        return JSON.stringify(
          { mainPackageId: "main-package-uuid", packageId: "package-uuid", displayOrder: 1 },
          null,
          2,
        );
      case "visa-destinations":
        return JSON.stringify(
          {
            title: "New Visa Destination",
            imageUrl: "https://example.com/visa.jpg",
            processingTime: "5-7 working days",
            isActive: true,
          },
          null,
          2,
        );
      case "visa-details":
        return JSON.stringify(
          {
            visaDestinationId: "visa-destination-uuid",
            sectionType: "requirement",
            label: "Passport",
            value: "Passport valid for 6 months",
            displayOrder: 1,
          },
          null,
          2,
        );
      default:
        return JSON.stringify({}, null, 2);
    }
  }

  private openCreateModal = (): void => {
    this.setState({
      modalMode: "create",
      modalPayloadText: this.getCreateTemplate(this.props.sectionKey),
      modalEditValue: "",
      selectedEntry: null,
      modalErrorMessage: "",
    });
  };

  private openEditModal = (entry: CmsTableEntry): void => {
    if (entry.readOnly || !entry.editableField) {
      this.setError("This row is read-only and cannot be edited.");
      return;
    }

    const currentValue = entry.raw[entry.editableField];
    this.setState({
      modalMode: "edit",
      modalPayloadText: "",
      modalEditValue:
        currentValue !== undefined && currentValue !== null ?
          String(currentValue)
        : "",
      selectedEntry: entry,
      modalErrorMessage: "",
    });
  };

  private openDeleteModal = (entry: CmsTableEntry): void => {
    if (entry.readOnly) {
      this.setError("This row is read-only and cannot be deleted.");
      return;
    }

    this.setState({
      modalMode: "delete",
      modalPayloadText: "",
      modalEditValue: "",
      selectedEntry: entry,
      modalErrorMessage: "",
    });
  };

  private closeModal = (): void => {
    if (this.state.isModalSubmitting) {
      return;
    }
    this.setState({
      modalMode: null,
      modalPayloadText: "",
      modalEditValue: "",
      selectedEntry: null,
      modalErrorMessage: "",
    });
  };

  private onModalPayloadChange = (
    event: ChangeEvent<HTMLTextAreaElement>,
  ): void => {
    this.setState({
      modalPayloadText: event.target.value,
      modalErrorMessage: "",
    });
  };

  private onModalEditChange = (event: ChangeEvent<HTMLInputElement>): void => {
    this.setState({
      modalEditValue: event.target.value,
      modalErrorMessage: "",
    });
  };

  private getEntryLabel(entry: CmsTableEntry | null): string {
    if (!entry) {
      return "selected record";
    }
    for (const cell of Object.values(entry.row.cells)) {
      if (cell.value && cell.value !== "--") {
        return cell.value;
      }
    }
    return entry.id;
  }

  private getModalTitle(sectionTitle: string): string {
    const { modalMode } = this.state;
    if (modalMode === "create") {
      return `Create ${sectionTitle} Record`;
    }
    if (modalMode === "edit") {
      return `Edit ${sectionTitle} Record`;
    }
    return `Delete ${sectionTitle} Record`;
  }

  private getModalDescription(sectionTitle: string): string {
    const { modalMode, selectedEntry } = this.state;
    if (modalMode === "create") {
      return "Add a new CMS record using JSON payload fields. Keep required IDs and references valid.";
    }
    if (modalMode === "edit") {
      const editableField = selectedEntry?.editableField ?? "value";
      return `Update the "${editableField}" field for this ${sectionTitle.toLowerCase()} record.`;
    }
    return `This action permanently removes "${this.getEntryLabel(selectedEntry)}" from ${sectionTitle.toLowerCase()}.`;
  }

  private async handleModalConfirm(): Promise<void> {
    const {
      modalMode,
      modalPayloadText,
      modalEditValue,
      selectedEntry,
    } = this.state;

    if (!modalMode) {
      return;
    }

    this.setState({ isModalSubmitting: true, modalErrorMessage: "" });

    try {
      if (modalMode === "create") {
        const payload = JSON.parse(modalPayloadText) as Record<string, unknown>;
        await cmsDatasource.create(this.props.sectionKey, payload);
        this.setSuccess("Record created successfully.");
      } else if (modalMode === "edit") {
        if (!selectedEntry) {
          throw new Error("No record selected for edit.");
        }
        const value = modalEditValue.trim();
        if (!value) {
          throw new Error("Value cannot be empty.");
        }
        await cmsDatasource.update(this.props.sectionKey, selectedEntry, value);
        this.setSuccess("Record updated successfully.");
      } else {
        if (!selectedEntry) {
          throw new Error("No record selected for delete.");
        }
        await cmsDatasource.remove(this.props.sectionKey, selectedEntry);
        this.setSuccess("Record deleted successfully.");
      }

      await this.loadRows();
      this.setState({
        modalMode: null,
        modalPayloadText: "",
        modalEditValue: "",
        selectedEntry: null,
        modalErrorMessage: "",
        isModalSubmitting: false,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Action failed.";
      this.setState({
        modalErrorMessage: message,
        isModalSubmitting: false,
      });
    }
  }

  render() {
    const { sectionKey } = this.props;
    const {
      searchQuery,
      showAdvancedFilters,
      columnFilters,
      dateColumnFilters,
      isLoading,
      rows,
      successMessage,
      errorMessage,
      modalMode,
      modalPayloadText,
      modalEditValue,
      selectedEntry,
      modalErrorMessage,
      isModalSubmitting,
      viewEntry,
      imagePreviewUrl,
      imagePreviewLabel,
    } = this.state;
    const section = CmsSectionCatalog.getByKey(sectionKey);
    const columnFilterDefinitions = this.buildColumnFilterDefinitions(
      rows,
      section.columns,
    );
    const filteredRows = rows.filter(
      (entry) =>
        this.matchesSearch(entry, searchQuery) &&
        this.matchesColumnFilters(
          entry,
          columnFilterDefinitions,
          columnFilters,
          dateColumnFilters,
        ),
    );
    const hasActiveFilters = this.hasAnyActiveFilters(
      columnFilterDefinitions,
      columnFilters,
      dateColumnFilters,
    );
    const dateColumnKeys = new Set(
      columnFilterDefinitions
        .filter((definition) => definition.type === "date")
        .map((definition) => definition.key),
    );
    const hasImageColumn = filteredRows.some(
      (entry) => this.getImageUrlFromEntry(entry) !== null,
    );

    return (
      <div className="space-y-4">
        {successMessage && (
          <div className="rounded-xl border border-[color-mix(in_srgb,var(--success)_35%,transparent)] bg-[color-mix(in_srgb,var(--success)_10%,transparent)] px-3 py-2 text-sm text-[var(--success)]">
            {successMessage}
          </div>
        )}
        {errorMessage && (
          <div className="rounded-xl border border-[color-mix(in_srgb,var(--danger)_35%,transparent)] bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] px-3 py-2 text-sm text-[var(--danger)]">
            {errorMessage}
          </div>
        )}

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
                onChange={this.onSearchChange}
                placeholder={`Search in ${section.title.toLowerCase()}...`}
                className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] pl-9 pr-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--ring)]"
              />
            </label>
            <button
              type="button"
              onClick={this.onToggleAdvancedFilters}
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
                      <select
                        value={columnFilters[definition.key] ?? ""}
                        onChange={(event) =>
                          this.onColumnFilterChange(definition.key, event.target.value)
                        }
                        className="mt-1.5 h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 text-sm font-medium normal-case tracking-normal text-[var(--text-primary)]"
                      >
                        <option value="">All</option>
                        {definition.options.map((option) => (
                          <option key={`${definition.key}-${option}`} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    )}
                    {definition.type === "text" && (
                      <input
                        type="text"
                        value={columnFilters[definition.key] ?? ""}
                        onChange={(event) =>
                          this.onColumnFilterChange(definition.key, event.target.value)
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
                            this.onDateColumnFilterChange(
                              definition.key,
                              "from",
                              event.target.value,
                            )
                          }
                          onBlur={(event) =>
                            this.onDateInputBlur(
                              definition.key,
                              "from",
                              event.target.value,
                            )
                          }
                          placeholder="dd/mm/yyyy"
                          className="h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 text-sm normal-case tracking-normal text-[var(--text-primary)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--ring)]"
                        />
                        <input
                          type="text"
                          value={dateColumnFilters[definition.key]?.to ?? ""}
                          onChange={(event) =>
                            this.onDateColumnFilterChange(
                              definition.key,
                              "to",
                              event.target.value,
                            )
                          }
                          onBlur={(event) =>
                            this.onDateInputBlur(
                              definition.key,
                              "to",
                              event.target.value,
                            )
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
                  onClick={this.clearAllColumnFilters}
                  disabled={!hasActiveFilters}
                  className="inline-flex h-9 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-xs font-semibold text-[var(--text-secondary)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          )}
        </SurfaceCardComponent>

        <SurfaceCardComponent
          title={`${section.title} Table`}
          subtitle={`${filteredRows.length} records`}
          rightSlot={
            <button
              type="button"
              onClick={this.openCreateModal}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white"
            >
              <CirclePlus size={13} />
              {section.actionLabel}
            </button>
          }
        >
          <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="sticky top-0 bg-[color-mix(in_srgb,var(--primary)_8%,transparent)] text-xs uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                <tr>
                  {section.columns.map((column) => (
                    <th key={column.key} className="px-4 py-3">
                      {column.label}
                    </th>
                  ))}
                  {hasImageColumn && <th className="px-4 py-3">Image</th>}
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ?
                  <tr>
                    <td
                      colSpan={section.columns.length + (hasImageColumn ? 2 : 1)}
                      className="px-4 py-10 text-center text-sm text-[var(--text-secondary)]"
                    >
                      Loading records...
                    </td>
                  </tr>
                : filteredRows.length > 0 ?
                  filteredRows.map((entry) => {
                    const imageUrl = this.getImageUrlFromEntry(entry);
                    return (
                      <tr
                        key={entry.id}
                        className="border-t border-[var(--border)] hover:bg-[var(--background-soft)]/40"
                      >
                        {section.columns.map((column) => {
                          const cell = entry.row.cells[column.key];
                          const toned = cell && cell.tone !== "default";
                          const rawValue = cell ? cell.value : "--";
                          const value =
                            dateColumnKeys.has(column.key) ?
                              this.toDDMMYYYY(rawValue)
                            : rawValue;

                          return (
                            <td
                              key={`${entry.id}-${column.key}`}
                              className={`px-4 py-3 ${
                                column.isHighlighted ?
                                  "font-semibold text-[var(--text-primary)]"
                                : "text-[var(--text-secondary)]"
                              }`}
                            >
                              {toned ?
                                <span
                                  className={`rounded-full px-2 py-1 text-xs font-semibold ${this.getCellToneClass(cell.tone)}`}
                                >
                                  {value}
                                </span>
                              : value}
                            </td>
                          );
                        })}
                        {hasImageColumn && (
                          <td className="px-4 py-3">
                            {imageUrl ?
                              <button
                                type="button"
                                onClick={() =>
                                  this.openImagePreview(
                                    imageUrl,
                                    this.getEntryLabel(entry),
                                  )
                                }
                                className="group relative overflow-hidden rounded-xl border border-[var(--border)]"
                              >
                                <img
                                  src={imageUrl}
                                  alt={`${this.getEntryLabel(entry)} preview`}
                                  className="h-10 w-16 object-cover transition group-hover:scale-105"
                                />
                              </button>
                            : <span className="text-xs text-[var(--text-secondary)]">--</span>}
                          </td>
                        )}
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => this.openViewModal(entry)}
                              className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--background-soft)]"
                            >
                              <Eye size={12} />
                              View
                            </button>
                            <button
                              type="button"
                              onClick={() => this.openEditModal(entry)}
                              disabled={entry.readOnly}
                              className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--background-soft)] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <PencilLine size={12} />
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => this.openDeleteModal(entry)}
                              disabled={entry.readOnly}
                              className="inline-flex items-center gap-1 rounded-lg border border-[color-mix(in_srgb,var(--danger)_35%,transparent)] bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] px-2.5 py-1.5 text-xs font-semibold text-[var(--danger)] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <Trash2 size={12} />
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                : <tr>
                    <td
                      colSpan={section.columns.length + (hasImageColumn ? 2 : 1)}
                      className="px-4 py-10 text-center text-sm text-[var(--text-secondary)]"
                    >
                      No records found for the selected filters.
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </SurfaceCardComponent>

        <ModalComponent
          isOpen={modalMode !== null}
          title={this.getModalTitle(section.title)}
          description={this.getModalDescription(section.title)}
          confirmLabel={
            modalMode === "create" ? "Create Record"
            : modalMode === "edit" ? "Save Changes"
            : "Delete Record"
          }
          confirmTone={modalMode === "delete" ? "danger" : "primary"}
          isSubmitting={isModalSubmitting}
          onConfirm={() => void this.handleModalConfirm()}
          onCancel={this.closeModal}
          width={modalMode === "create" ? "lg" : "md"}
        >
          {modalMode === "create" && (
            <div className="space-y-3">
              <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                JSON Payload
              </label>
              <textarea
                value={modalPayloadText}
                onChange={this.onModalPayloadChange}
                rows={11}
                className="w-full rounded-2xl border border-[color-mix(in_srgb,var(--primary)_22%,var(--border))] bg-[var(--surface)] px-3 py-3 font-mono text-xs leading-6 text-[var(--text-primary)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--ring)]"
              />
              <p className="text-xs text-[var(--text-secondary)]">
                Tip: keep IDs and relation keys in valid format to avoid backend validation errors.
              </p>
            </div>
          )}

          {modalMode === "edit" && (
            <div className="space-y-3">
              <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                {selectedEntry?.editableField ?? "Value"}
              </label>
              <input
                type="text"
                value={modalEditValue}
                onChange={this.onModalEditChange}
                className="h-11 w-full rounded-2xl border border-[color-mix(in_srgb,var(--primary)_22%,var(--border))] bg-[var(--surface)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--ring)]"
              />
            </div>
          )}

          {modalMode === "delete" && (
            <div className="rounded-2xl border border-[color-mix(in_srgb,var(--danger)_28%,var(--border))] bg-[color-mix(in_srgb,var(--danger)_9%,transparent)] px-4 py-3 text-sm text-[var(--text-secondary)]">
              This action cannot be undone. The selected item will be removed from the CMS listing.
            </div>
          )}

          {modalErrorMessage && (
            <div className="mt-3 rounded-xl border border-[color-mix(in_srgb,var(--danger)_35%,transparent)] bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] px-3 py-2 text-sm text-[var(--danger)]">
              {modalErrorMessage}
            </div>
          )}
        </ModalComponent>

        <ModalComponent
          isOpen={viewEntry !== null}
          title={viewEntry ? this.getEntryLabel(viewEntry) : "Record View"}
          description="Review complete row details from the selected CMS record."
          confirmLabel="Close"
          onConfirm={this.closeViewModal}
          onCancel={this.closeViewModal}
          showCancelButton={false}
        >
          {viewEntry && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                {section.columns.map((column) => {
                  const rawValue = viewEntry.row.cells[column.key]?.value ?? "--";
                  const value =
                    dateColumnKeys.has(column.key) ?
                      this.toDDMMYYYY(rawValue)
                    : rawValue;
                  return (
                    <div
                      key={`view-${viewEntry.id}-${column.key}`}
                      className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2"
                    >
                      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-secondary)]">
                        {column.label}
                      </p>
                      <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">
                        {value}
                      </p>
                    </div>
                  );
                })}
              </div>
              {this.getImageUrlFromEntry(viewEntry) && (
                <button
                  type="button"
                  onClick={() =>
                    this.openImagePreview(
                      this.getImageUrlFromEntry(viewEntry) ?? "",
                      this.getEntryLabel(viewEntry),
                    )
                  }
                  className="overflow-hidden rounded-2xl border border-[var(--border)]"
                >
                  <img
                    src={this.getImageUrlFromEntry(viewEntry) ?? ""}
                    alt={`${this.getEntryLabel(viewEntry)} preview`}
                    className="h-48 w-full object-cover"
                  />
                </button>
              )}
            </div>
          )}
        </ModalComponent>

        <ModalComponent
          isOpen={imagePreviewUrl.length > 0}
          title={imagePreviewLabel || "Image Preview"}
          description="Preview linked media at full size."
          confirmLabel="Close"
          onConfirm={this.closeImagePreview}
          onCancel={this.closeImagePreview}
          showCancelButton={false}
          width="lg"
        >
          {imagePreviewUrl && (
            <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
              <img
                src={imagePreviewUrl}
                alt={imagePreviewLabel || "Preview"}
                className="max-h-[70vh] w-full object-contain"
              />
            </div>
          )}
        </ModalComponent>
      </div>
    );
  }
}

export default CmsSectionPage;
