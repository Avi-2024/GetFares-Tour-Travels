import { Component, type ChangeEvent } from "react";
import CmsSectionFiltersComponent from "./components/cms-section-filters.component";
import CmsSectionTableComponent from "./components/cms-section-table.component";
import CmsModalShellComponent from "./components/cms-modal-shell.component";
import CmsEntityEditorModalComponent from "./components/cms-entity-editor-modal.component";
import CmsEntityDeleteModalComponent from "./components/cms-entity-delete-modal.component";
import CmsEntityViewModalComponent from "./components/cms-entity-view-modal.component";
import { CmsSectionCatalog } from "./cms-section.catalog";
import { CmsEntityFormCatalog } from "./cms-entity-form.catalog";
import { CmsServiceContainer } from "./core/cms.service.container";
import { CmsSectionFilterController } from "./controllers/cms-section-filter.controller";
import { CmsEntryMediaResolver } from "./controllers/cms-entry-media.resolver";
import { CmsTableToneResolver } from "./controllers/cms-table-tone.resolver";
import type { CmsSectionKey } from "./models/cms-section-key.type";
import type {
  DateFilterBoundary,
  DateRangeFilter,
} from "./models/cms-column-filter.model";
import type { CmsTableEntry } from "./types/cms-table-entry.type";

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
  selectedEntry: CmsTableEntry | null;
  modalErrorMessage: string;
  isModalSubmitting: boolean;
  viewEntry: CmsTableEntry | null;
  imagePreviewUrl: string;
  imagePreviewLabel: string;
}

class CmsSectionPage extends Component<
  CmsSectionPageProps,
  CmsSectionPageState
> {
  private readonly cmsService = CmsServiceContainer.getSectionService();
  private readonly filterController = new CmsSectionFilterController();
  private readonly mediaResolver = new CmsEntryMediaResolver();
  private readonly toneResolver = new CmsTableToneResolver();

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
      this.resetStateForSectionChange();
    }
  }

  private resetStateForSectionChange(): void {
    this.setState(
      {
        searchQuery: "",
        showAdvancedFilters: false,
        columnFilters: {},
        dateColumnFilters: {},
        successMessage: "",
        errorMessage: "",
        modalMode: null,
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

  private setError(message: string): void {
    this.setState({ errorMessage: message, successMessage: "" });
  }

  private setSuccess(message: string): void {
    this.setState({ successMessage: message, errorMessage: "" });
  }

  private async loadRows(): Promise<void> {
    this.setState({ isLoading: true, errorMessage: "" });
    try {
      const rows = await this.cmsService.list(this.props.sectionKey);
      this.setState({ rows });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load records.";
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

  private onDateInputBlur = (
    columnKey: string,
    boundary: DateFilterBoundary,
    value: string,
  ): void => {
    this.onDateColumnFilterChange(
      columnKey,
      boundary,
      this.filterController.normalizeDateInput(value),
    );
  };

  private clearAllColumnFilters = (): void => {
    this.setState({
      columnFilters: {},
      dateColumnFilters: {},
    });
  };

  private openViewModal = (entry: CmsTableEntry): void => {
    this.setState({ viewEntry: entry });
  };

  private closeViewModal = (): void => {
    this.setState({
      viewEntry: null,
    });
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

  private openCreateModal = (): void => {
    const definition = CmsEntityFormCatalog.get(this.props.sectionKey);
    if (!definition.supportsCreate) {
      this.setError("Create operation is not supported for this section.");
      return;
    }
    this.setState({
      modalMode: "create",
      selectedEntry: null,
      modalErrorMessage: "",
    });
  };

  private openEditModal = (entry: CmsTableEntry): void => {
    const definition = CmsEntityFormCatalog.get(this.props.sectionKey);
    if (!definition.supportsEdit || entry.readOnly) {
      this.setError("This row is read-only and cannot be edited.");
      return;
    }
    this.setState({
      modalMode: "edit",
      selectedEntry: entry,
      modalErrorMessage: "",
    });
  };

  private openDeleteModal = (entry: CmsTableEntry): void => {
    const definition = CmsEntityFormCatalog.get(this.props.sectionKey);
    if (!definition.supportsDelete) {
      this.setError("Delete operation is not supported for this section.");
      return;
    }
    if (entry.readOnly) {
      this.setError("This row is read-only and cannot be deleted.");
      return;
    }

    this.setState({
      modalMode: "delete",
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
      selectedEntry: null,
      modalErrorMessage: "",
    });
  };

  private handleEditorSaved = async (message: string): Promise<void> => {
    await this.loadRows();
    this.setSuccess(message);
    this.setState({
      modalMode: null,
      selectedEntry: null,
      modalErrorMessage: "",
    });
  };

  private handleDeleteConfirm = async (): Promise<void> => {
    const { selectedEntry } = this.state;
    if (!selectedEntry) {
      return;
    }
    this.setState({ isModalSubmitting: true, modalErrorMessage: "" });
    try {
      await this.cmsService.remove(this.props.sectionKey, selectedEntry);
      await this.loadRows();
      this.setSuccess("Record deleted successfully.");
      this.setState({
        isModalSubmitting: false,
        modalMode: null,
        selectedEntry: null,
      });
    } catch (error) {
      this.setState({
        isModalSubmitting: false,
        modalErrorMessage:
          error instanceof Error ? error.message : "Delete failed.",
      });
    }
  };

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
      selectedEntry,
      modalErrorMessage,
      isModalSubmitting,
      viewEntry,
      imagePreviewUrl,
      imagePreviewLabel,
    } = this.state;

    const section = CmsSectionCatalog.getByKey(sectionKey);
    const columnFilterDefinitions =
      this.filterController.buildColumnFilterDefinitions(rows, section.columns);
    const filteredRows = rows.filter(
      (entry) =>
        this.filterController.matchesSearch(entry, searchQuery) &&
        this.filterController.matchesColumnFilters(
          entry,
          columnFilterDefinitions,
          columnFilters,
          dateColumnFilters,
        ),
    );
    const hasActiveFilters = this.filterController.hasAnyActiveFilters(
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
      (entry) => this.mediaResolver.getImageUrlFromEntry(entry) !== null,
    );

    return (
      <div className="space-y-3 sm:space-y-4">
        {successMessage && (
          <div className="rounded-xl border border-[color-mix(in_srgb,var(--success)_35%,transparent)] bg-[color-mix(in_srgb,var(--success)_10%,transparent)] px-3 py-2 text-xs text-[var(--success)] sm:text-sm">
            {successMessage}
          </div>
        )}
        {errorMessage && (
          <div className="rounded-xl border border-[color-mix(in_srgb,var(--danger)_35%,transparent)] bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] px-3 py-2 text-xs text-[var(--danger)] sm:text-sm">
            {errorMessage}
          </div>
        )}

        <CmsSectionFiltersComponent
          sectionTitle={section.title}
          searchQuery={searchQuery}
          showAdvancedFilters={showAdvancedFilters}
          columnFilterDefinitions={columnFilterDefinitions}
          columnFilters={columnFilters}
          dateColumnFilters={dateColumnFilters}
          hasActiveFilters={hasActiveFilters}
          onSearchChange={this.onSearchChange}
          onToggleAdvancedFilters={this.onToggleAdvancedFilters}
          onColumnFilterChange={this.onColumnFilterChange}
          onDateColumnFilterChange={this.onDateColumnFilterChange}
          onDateInputBlur={this.onDateInputBlur}
          onClearFilters={this.clearAllColumnFilters}
        />

        <CmsSectionTableComponent
          title={section.title}
          actionLabel={section.actionLabel}
          columns={section.columns}
          rows={filteredRows}
          isLoading={isLoading}
          hasImageColumn={hasImageColumn}
          supportsCreate={CmsEntityFormCatalog.get(sectionKey).supportsCreate}
          supportsEdit={CmsEntityFormCatalog.get(sectionKey).supportsEdit}
          supportsDelete={CmsEntityFormCatalog.get(sectionKey).supportsDelete}
          deleteActionLabel="Move to Trash"
          emptyStateMessage="No records found for the selected filters."
          dateColumnKeys={dateColumnKeys}
          onCreate={this.openCreateModal}
          onView={this.openViewModal}
          onEdit={this.openEditModal}
          onDelete={this.openDeleteModal}
          onImagePreview={this.openImagePreview}
          getImageUrl={(entry) =>
            this.mediaResolver.getImageUrlFromEntry(entry)
          }
          getEntryLabel={(entry) => this.mediaResolver.getEntryLabel(entry)}
          getToneClass={(tone) => this.toneResolver.getToneClass(tone)}
          formatDateValue={(value) => this.filterController.toDDMMYYYY(value)}
        />

        <CmsEntityEditorModalComponent
          isOpen={modalMode === "create" || modalMode === "edit"}
          mode={modalMode === "edit" ? "edit" : "create"}
          sectionKey={sectionKey}
          sectionTitle={section.title}
          entry={modalMode === "edit" ? selectedEntry : null}
          onClose={this.closeModal}
          onSaved={this.handleEditorSaved}
        />

        <CmsEntityDeleteModalComponent
          isOpen={modalMode === "delete"}
          sectionTitle={section.title}
          recordLabel={this.mediaResolver.getEntryLabel(selectedEntry)}
          isSubmitting={isModalSubmitting}
          errorMessage={modalErrorMessage}
          mode="soft"
          onCancel={this.closeModal}
          onConfirm={() => void this.handleDeleteConfirm()}
        />

        <CmsEntityViewModalComponent
          isOpen={viewEntry !== null}
          sectionKey={sectionKey}
          sectionTitle={section.title}
          entry={viewEntry}
          onClose={this.closeViewModal}
          onOpenImage={this.openImagePreview}
        />

        <CmsModalShellComponent
          isOpen={imagePreviewUrl.length > 0}
          title={imagePreviewLabel || "Image Preview"}
          description="Preview linked media at full size."
          size="4xl"
          confirmLabel="Close"
          showCancel={false}
          onConfirm={this.closeImagePreview}
          onCancel={this.closeImagePreview}
        >
          {imagePreviewUrl && (
            <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-(--surface)">
              <img
                src={imagePreviewUrl}
                alt={imagePreviewLabel || "Preview"}
                className="max-h-[72vh] w-full object-contain sm:max-h-[70vh]"
              />
            </div>
          )}
        </CmsModalShellComponent>
      </div>
    );
  }
}

export default CmsSectionPage;
