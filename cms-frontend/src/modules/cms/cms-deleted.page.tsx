import { Component } from "react";
import CmsSectionFiltersComponent from "./components/cms-section-filters.component";
import CmsSectionTableComponent from "./components/cms-section-table.component";
import CmsModalShellComponent from "./components/cms-modal-shell.component";
import CmsEntityDeleteModalComponent from "./components/cms-entity-delete-modal.component";
import CmsEntityViewModalComponent from "./components/cms-entity-view-modal.component";
import { CmsSectionCatalog } from "./cms-section.catalog";
import { CmsServiceContainer } from "./core/cms.service.container";
import { CmsSectionFilterController } from "./controllers/cms-section-filter.controller";
import { CmsEntryMediaResolver } from "./controllers/cms-entry-media.resolver";
import { CmsTableToneResolver } from "./controllers/cms-table-tone.resolver";
import type { CmsSectionKey } from "./models/cms-section-key.type";
import type { UniversalFilterToken } from "./models/cms-column-filter.model";
import type { CmsTableEntry } from "./types/cms-table-entry.type";

type DeletedTab = {
  key: CmsSectionKey;
  label: string;
};

const deletedTabs: DeletedTab[] = [
  { key: "landing-places", label: "Landing Places" },
  { key: "destinations", label: "Destinations" },
  { key: "published-packages", label: "Packages" },
  { key: "main-packages", label: "Main Packages" },
  { key: "sub-packages", label: "Sub Packages" },
  { key: "visa-destinations", label: "Visa Destinations" },
  { key: "creative-toolkit", label: "Creative Toolkit" },
];

interface CmsDeletedPageState {
  activeKey: CmsSectionKey;
  activeFilters: UniversalFilterToken[];
  isLoading: boolean;
  rows: CmsTableEntry[];
  successMessage: string;
  errorMessage: string;
  modalMode: "delete" | null;
  selectedEntry: CmsTableEntry | null;
  modalErrorMessage: string;
  isModalSubmitting: boolean;
  viewEntry: CmsTableEntry | null;
  imagePreviewUrl: string;
  imagePreviewLabel: string;
}

class CmsDeletedPage extends Component<unknown, CmsDeletedPageState> {
  private readonly cmsService = CmsServiceContainer.getSectionService();
  private readonly filterController = new CmsSectionFilterController();
  private readonly mediaResolver = new CmsEntryMediaResolver();
  private readonly toneResolver = new CmsTableToneResolver();

  state: CmsDeletedPageState = {
    activeKey: "landing-places",
    activeFilters: [],
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

  private setError(message: string): void {
    this.setState({ errorMessage: message, successMessage: "" });
  }

  private setSuccess(message: string): void {
    this.setState({ successMessage: message, errorMessage: "" });
  }

  private async loadRows(): Promise<void> {
    this.setState({ isLoading: true, errorMessage: "" });
    try {
      const rows = await this.cmsService.listDeleted(this.state.activeKey);
      this.setState({ rows });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load records.";
      this.setError(message);
    } finally {
      this.setState({ isLoading: false });
    }
  }

  private setActiveKey = (key: CmsSectionKey): void => {
    if (key === this.state.activeKey) return;
    this.setState(
      {
        activeKey: key,
        activeFilters: [],
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
  };

  private onFilterChange = (filters: UniversalFilterToken[]): void => {
    this.setState({ activeFilters: filters });
  };

  private clearAllFilters = (): void => {
    this.setState({ activeFilters: [] });
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

  private openDeleteModal = (entry: CmsTableEntry): void => {
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

  private handleDeleteConfirm = async (): Promise<void> => {
    const { selectedEntry } = this.state;
    if (!selectedEntry) {
      return;
    }
    this.setState({ isModalSubmitting: true, modalErrorMessage: "" });
    try {
      await this.cmsService.hardDelete(this.state.activeKey, selectedEntry);
      await this.loadRows();
      this.setSuccess("Record permanently deleted.");
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

  private handleRestore = async (entry: CmsTableEntry): Promise<void> => {
    this.setState({ isModalSubmitting: true, modalErrorMessage: "" });
    try {
      await this.cmsService.restore(this.state.activeKey, entry);
      await this.loadRows();
      this.setSuccess("Record restored.");
    } catch (error) {
      this.setError(
        error instanceof Error ? error.message : "Restore failed.",
      );
    } finally {
      this.setState({ isModalSubmitting: false });
    }
  };

  render() {
    const {
      activeKey,
      activeFilters,
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

    const section = CmsSectionCatalog.getByKey(activeKey);
    const filterColumns = this.filterController.buildFilterColumns(
      rows,
      section.columns,
    );
    const filterIndex = this.filterController.buildFilterIndex(
      rows,
      filterColumns,
    );
    const filteredRows = rows.filter(
      (entry) => this.filterController.matchesFilters(entry, activeFilters),
    );
    const hasActiveFilters = this.filterController.hasAnyActiveFilters(
      activeFilters,
    );
    const dateColumnKeys = new Set(
      section.columns
        .map((column) => column.key)
        .filter((columnKey) => {
          const lower = columnKey.toLowerCase();
          return (
            lower.includes("date") ||
            lower.includes("updated") ||
            lower.includes("created") ||
            lower.includes("time")
          );
        }),
    );
    const hasImageColumn = filteredRows.some(
      (entry) => this.mediaResolver.getImageUrlFromEntry(entry) !== null,
    );

    return (
      <div className="space-y-3 sm:space-y-4">
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-2.5 sm:p-3">
          {deletedTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => this.setActiveKey(tab.key)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                activeKey === tab.key ?
                  "border-transparent bg-[var(--primary)] text-white shadow"
                : "border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--background-soft)]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

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
          sectionTitle={`Deleted ${section.title}`}
          columns={filterColumns}
          filterIndex={filterIndex}
          activeFilters={activeFilters}
          hasActiveFilters={hasActiveFilters}
          onFilterChange={this.onFilterChange}
          onClearFilters={this.clearAllFilters}
          getSuggestions={(...args) =>
            this.filterController.getSuggestions(...args)
          }
          createToken={(...args) => this.filterController.createToken(...args)}
        />

        <CmsSectionTableComponent
          title={`Deleted ${section.title}`}
          actionLabel="Permanently Delete"
          columns={section.columns}
          rows={filteredRows}
          isLoading={isLoading}
          hasImageColumn={hasImageColumn}
          supportsCreate={false}
          supportsEdit={false}
          supportsDelete
          supportsRestore
          deleteActionLabel="Permanently Delete"
          emptyStateMessage="Items moved to trash will appear here."
          dateColumnKeys={dateColumnKeys}
          onCreate={() => undefined}
          onView={this.openViewModal}
          onEdit={() => undefined}
          onDelete={this.openDeleteModal}
          onRestore={this.handleRestore}
          onImagePreview={this.openImagePreview}
          getImageUrl={(entry) => this.mediaResolver.getImageUrlFromEntry(entry)}
          getEntryLabel={(entry) => this.mediaResolver.getEntryLabel(entry)}
          getToneClass={(tone) => this.toneResolver.getToneClass(tone)}
          formatDateValue={(value) => this.filterController.toDDMMYYYY(value)}
        />

        <CmsEntityDeleteModalComponent
          isOpen={modalMode === "delete"}
          sectionTitle={`Deleted ${section.title}`}
          recordLabel={this.mediaResolver.getEntryLabel(selectedEntry)}
          isSubmitting={isModalSubmitting}
          errorMessage={modalErrorMessage}
          mode="hard"
          onCancel={this.closeModal}
          onConfirm={() => void this.handleDeleteConfirm()}
        />

        <CmsEntityViewModalComponent
          isOpen={viewEntry !== null}
          sectionKey={activeKey}
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
            <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
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

export default CmsDeletedPage;
