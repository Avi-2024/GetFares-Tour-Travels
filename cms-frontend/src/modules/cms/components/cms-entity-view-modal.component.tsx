import { Component } from "react";
import CmsModalShellComponent from "./cms-modal-shell.component";
import {
  CmsEntityFormCatalog,
  type CmsEntityFieldDefinition,
} from "../cms-entity-form.catalog";
import type { CmsMediaAsset, CmsTableEntry } from "../cms.datasource";
import type { CmsSectionKey } from "../cms-section.models";
import { CmsServiceContainer } from "../core/cms.service.container";

interface CmsEntityViewModalProps {
  isOpen: boolean;
  sectionKey: CmsSectionKey;
  sectionTitle: string;
  entry: CmsTableEntry | null;
  onClose: () => void;
  onOpenImage: (url: string, label: string) => void;
}

interface CmsEntityViewModalState {
  isLoadingMedia: boolean;
  mediaItems: CmsMediaAsset[];
  referenceLabelById: Record<string, string>;
}

interface CmsEntityViewMetaItem {
  key: string;
  label: string;
  value: string;
}

class CmsEntityViewModalComponent extends Component<
  CmsEntityViewModalProps,
  CmsEntityViewModalState
> {
  private readonly cmsService = CmsServiceContainer.getSectionService();

  state: CmsEntityViewModalState = {
    isLoadingMedia: false,
    mediaItems: [],
    referenceLabelById: {},
  };

  componentDidMount(): void {
    if (this.props.isOpen) {
      void this.loadMedia();
      void this.loadReferenceLabels();
    }
  }

  componentDidUpdate(prevProps: CmsEntityViewModalProps): void {
    const shouldLoad =
      this.props.isOpen &&
      (!prevProps.isOpen ||
        prevProps.entry?.id !== this.props.entry?.id ||
        prevProps.sectionKey !== this.props.sectionKey);
    if (shouldLoad) {
      void this.loadMedia();
      void this.loadReferenceLabels();
    }
  }

  private toSnake(value: string): string {
    return value.replace(/[A-Z]/g, (char) => `_${char.toLowerCase()}`);
  }

  private readRawValue(key: string): unknown {
    const { entry } = this.props;
    if (!entry) {
      return undefined;
    }
    const direct = entry.raw[key];
    if (direct !== undefined && direct !== null) {
      return direct;
    }
    const snake = this.toSnake(key);
    const fallback = entry.raw[snake];
    if (fallback !== undefined && fallback !== null) {
      return fallback;
    }
    return undefined;
  }

  private formatScalarValue(value: unknown): string {
    if (value === undefined || value === null) {
      return "--";
    }
    if (typeof value === "string") {
      return value.trim() || "--";
    }
    if (typeof value === "number" || typeof value === "boolean") {
      return String(value);
    }
    if (Array.isArray(value)) {
      const items = value
        .map((item) => this.formatScalarValue(item))
        .filter((item) => item !== "--");
      return items.length ? items.join(", ") : "--";
    }
    return "--";
  }

  private readValue(key: string): string {
    return this.formatScalarValue(this.readRawValue(key));
  }

  private formatArrayValue(values: unknown[]): string {
    const items = values
      .map((item) => this.formatScalarValue(item))
      .filter((item) => item !== "--");
    return items.length ? items.join("\n") : "--";
  }

  private formatListObjectRow(
    item: Record<string, unknown>,
    field: CmsEntityFieldDefinition,
  ): string {
    const orderedParts = (field.itemFields ?? [])
      .map((itemField) =>
        this.formatScalarValue(
          item[itemField.key] ?? item[this.toSnake(itemField.key)],
        ),
      )
      .filter((part) => part !== "--");

    if (orderedParts.length) {
      return orderedParts.join(" | ");
    }

    const fallbackParts = Object.values(item)
      .map((value) => this.formatScalarValue(value))
      .filter((part) => part !== "--");

    return fallbackParts.join(" | ");
  }

  private formatFieldValue(field: CmsEntityFieldDefinition): string {
    const displayValue = this.readRawValue(`${field.key}Display`);

    if (Array.isArray(displayValue)) {
      return this.formatArrayValue(displayValue);
    }

    if (typeof displayValue === "string" && displayValue.trim()) {
      return displayValue.trim();
    }

    const value = this.readRawValue(field.key);

    if (field.type === "list-text" || field.type === "multi-select") {
      return Array.isArray(value) ? this.formatArrayValue(value) : "--";
    }

    if (field.type === "list-object") {
      if (!Array.isArray(value)) {
        return "--";
      }

      const rows = value
        .filter(
          (item): item is Record<string, unknown> =>
            Boolean(item) && typeof item === "object" && !Array.isArray(item),
        )
        .map((item) => this.formatListObjectRow(item, field))
        .filter(Boolean);

      return rows.length ? rows.join("\n") : "--";
    }

    return this.formatScalarValue(value);
  }

  private resolveStatus(value: string): { label: string; className: string } {
    const normalized = value.toLowerCase();
    if (normalized === "true" || normalized === "1") {
      return {
        label: "Active",
        className:
          "border-[color-mix(in_srgb,var(--success)_35%,transparent)] bg-[color-mix(in_srgb,var(--success)_18%,transparent)] text-[var(--success)]",
      };
    }
    if (normalized === "false" || normalized === "0") {
      return {
        label: "Inactive",
        className:
          "border-[color-mix(in_srgb,var(--text-secondary)_30%,transparent)] bg-[color-mix(in_srgb,var(--text-secondary)_12%,transparent)] text-[var(--text-secondary)]",
      };
    }
    if (
      normalized.includes("active") ||
      normalized.includes("published") ||
      normalized.includes("healthy")
    ) {
      return {
        label: "Active",
        className:
          "border-[color-mix(in_srgb,var(--success)_35%,transparent)] bg-[color-mix(in_srgb,var(--success)_18%,transparent)] text-[var(--success)]",
      };
    }
    if (normalized.includes("draft") || normalized.includes("queued")) {
      return {
        label: "Draft",
        className:
          "border-[color-mix(in_srgb,var(--warning)_35%,transparent)] bg-[color-mix(in_srgb,var(--warning)_16%,transparent)] text-[var(--warning)]",
      };
    }
    if (normalized.includes("inactive")) {
      return {
        label: "Inactive",
        className:
          "border-[color-mix(in_srgb,var(--text-secondary)_30%,transparent)] bg-[color-mix(in_srgb,var(--text-secondary)_12%,transparent)] text-[var(--text-secondary)]",
      };
    }
    if (normalized.includes("archive")) {
      return {
        label: "Archived",
        className:
          "border-[color-mix(in_srgb,var(--danger)_36%,transparent)] bg-[color-mix(in_srgb,var(--danger)_14%,transparent)] text-[var(--danger)]",
      };
    }
    return {
      label: value || "Unknown",
      className:
        "border-[color-mix(in_srgb,var(--text-secondary)_30%,transparent)] bg-[color-mix(in_srgb,var(--text-secondary)_10%,transparent)] text-[var(--text-secondary)]",
    };
  }

  private isLikelyDateField(key: string): boolean {
    return (
      key === "expiresOn" ||
      key === "validFrom" ||
      key === "validTo" ||
      key === "createdAt" ||
      key === "updatedAt" ||
      key.toLowerCase().includes("date")
    );
  }

  private formatDateValue(value: string): string {
    const text = String(value || "").trim();
    if (!text || text === "--") {
      return value;
    }
    const parsed = new Date(text);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(parsed);
  }

  private async loadReferenceLabels(): Promise<void> {
    if (!this.props.isOpen || !this.props.entry) {
      this.setState({ referenceLabelById: {} });
      return;
    }

    const definition = CmsEntityFormCatalog.get(this.props.sectionKey);
    const hasReferenceId = definition.fields.some(
      (field) => field.key === "referenceId",
    );
    const hasMainPackageId = definition.fields.some(
      (field) => field.key === "mainPackageId",
    );
    const hasDestinationId = definition.fields.some(
      (field) => field.key === "destinationId",
    );
    if (!hasReferenceId && !hasMainPackageId && !hasDestinationId) {
      this.setState({ referenceLabelById: {} });
      return;
    }

    try {
      const referenceLabelById: Record<string, string> = {};

      if (hasReferenceId || hasDestinationId) {
        const [packages, destinations, visa] = await Promise.all([
          hasReferenceId ? this.cmsService.list("published-packages") : Promise.resolve([]),
          this.cmsService.list("destinations"),
          hasReferenceId ? this.cmsService.list("visa-destinations") : Promise.resolve([]),
        ]);
        packages.forEach((item) => {
          referenceLabelById[item.id] =
            item.row.cells.package?.value ||
            String(item.raw.name || item.raw.title || item.id);
        });
        destinations.forEach((item) => {
          const label =
            item.row.cells.destination?.value ||
            String(item.raw.name || item.raw.title || item.id);
          referenceLabelById[item.id] = label;
          // also map snake_case id if different
          const snakeId = String(item.raw.destination_id ?? item.raw.id ?? "");
          if (snakeId && snakeId !== item.id) referenceLabelById[snakeId] = label;
        });
        visa.forEach((item) => {
          referenceLabelById[item.id] =
            item.row.cells.title?.value ||
            String(item.raw.title || item.raw.name || item.id);
        });
      }

      if (hasMainPackageId) {
        const mainPackages = await this.cmsService.listAdminMainPackages();
        mainPackages.forEach((item) => {
          referenceLabelById[item.id] =
            String(item.raw.title || item.raw.packageName || item.raw.name || item.id);
        });
      }

      this.setState({ referenceLabelById });
    } catch {
      this.setState({ referenceLabelById: {} });
    }
  }

  private getEntryLabel(): string {
    if (!this.props.entry) {
      return "Record";
    }
    const rowValues = Object.values(this.props.entry.row.cells).map(
      (cell) => cell.value,
    );
    return (
      rowValues.find((value) => value !== "--" && value.trim()) || "Record"
    );
  }

  private async loadMedia(): Promise<void> {
    if (
      !this.props.entry ||
      !CmsEntityFormCatalog.get(this.props.sectionKey).mediaEnabled
    ) {
      this.setState({ mediaItems: [], isLoadingMedia: false });
      return;
    }

    this.setState({ isLoadingMedia: true });
    try {
      const entityType = this.cmsService.getMediaEntityType(
        this.props.sectionKey,
      );
      const mediaItems = await this.cmsService.listMedia(
        entityType,
        this.props.entry.id,
      );
      this.setState({ mediaItems, isLoadingMedia: false });
    } catch {
      this.setState({ mediaItems: [], isLoadingMedia: false });
    }
  }

  private getMetadataItems(): CmsEntityViewMetaItem[] {
    const definition = CmsEntityFormCatalog.get(this.props.sectionKey);
    const items: CmsEntityViewMetaItem[] = [];

    definition.fields.forEach((field) => {
      if (field.type === "switch") {
        return;
      }

      // For ID reference fields, try to resolve name first from raw joined fields
      if (field.key === "destinationId") {
        const rawId = String(
          this.readRawValue("destinationId") ??
          this.readRawValue("destination_id") ??
          "",
        ).trim();
        // First try joined name fields from raw
        const joinedName = String(
          this.readRawValue("destinationName") ??
          this.readRawValue("destination_name") ??
          this.readRawValue("destination") ??
          "",
        ).trim();
        const lookedUp = rawId ? (this.state.referenceLabelById[rawId] ?? "") : "";
        const resolved = joinedName || lookedUp;
        // Only show if we have a real name (not a UUID)
        const isUuid = /^[0-9a-f-]{36}$/i.test(resolved);
        if (resolved && !isUuid) {
          items.push({ key: field.key, label: field.label, value: resolved });
        } else if (rawId && !resolved) {
          // Still loading — skip for now, will re-render when state updates
        }
        return;
      }

      if (field.key === "mainPackageId") {
        const rawId = String(this.readRawValue("mainPackageId") ?? this.readRawValue("main_package_id") ?? "").trim();
        const lookedUp = rawId ? (this.state.referenceLabelById[rawId] ?? "") : "";
        const isUuid = /^[0-9a-f-]{36}$/i.test(lookedUp);
        if (lookedUp && !isUuid) {
          items.push({ key: field.key, label: field.label, value: lookedUp });
        }
        return;
      }

      if (field.key === "referenceId") {
        const rawId = String(this.readRawValue("referenceId") ?? this.readRawValue("reference_id") ?? "").trim();
        const lookedUp = rawId ? (this.state.referenceLabelById[rawId] ?? "") : "";
        const isUuid = /^[0-9a-f-]{36}$/i.test(lookedUp);
        if (lookedUp && !isUuid) {
          items.push({ key: field.key, label: field.label, value: lookedUp });
        }
        return;
      }

      const value = this.formatFieldValue(field);
      if (value === "--") {
        return;
      }

      let displayValue = value;
      if (field.type === "date" || this.isLikelyDateField(field.key)) {
        displayValue = this.formatDateValue(value);
      }

      items.push({
        key: field.key,
        label: field.label,
        value: displayValue,
      });
    });

    if (this.props.sectionKey === "landing-places") {
      const updatedAt = this.readValue("updatedAt");
      if (updatedAt !== "--") {
        items.push({
          key: "updatedAt",
          label: "Updated At",
          value: this.formatDateValue(updatedAt),
        });
      }
    }

    return items;
  }

  render() {
    const { isOpen, onClose, sectionKey, sectionTitle, onOpenImage } =
      this.props;
    const definition = CmsEntityFormCatalog.get(sectionKey);
    const title = this.readValue(definition.titleKey) || this.getEntryLabel();
    const subtitle =
      definition.subtitleKey ? this.readValue(definition.subtitleKey) : "";
    const statusValue =
      definition.statusKey ? this.readValue(definition.statusKey) : "";
    const status = this.resolveStatus(statusValue);
    const description =
      definition.descriptionKey ?
        this.readValue(definition.descriptionKey)
      : "";
    const metadataItems = this.getMetadataItems();
    const rawMedia = this.props.entry?.raw?.media;
    const mediaTitleImage =
      rawMedia && typeof rawMedia === "object" && !Array.isArray(rawMedia) ?
        (rawMedia as Record<string, unknown>).title_image
      : null;
    const heroImageCandidates = [
      this.state.mediaItems[0]?.mediaUrl,
      typeof mediaTitleImage === "string" ? mediaTitleImage : "",
      this.readValue("imageUrl"),
      this.readValue("heroImageUrl"),
      this.readValue("thumbnailUrl"),
      this.readValue("bannerImageUrl"),
    ];
    const heroImage =
      heroImageCandidates.find((candidate) =>
        Boolean(candidate && candidate !== "--"),
      ) || "";

    return (
      <CmsModalShellComponent
        isOpen={isOpen}
        title={`${sectionTitle} Details`}
        description="Entity overview with status, metadata, and media gallery."
        size={definition.viewSize}
        confirmLabel="Close"
        showCancel={false}
        onConfirm={onClose}
        onCancel={onClose}
      >
        <div className="space-y-4">
          <header className="rounded-2xl border border-(--border) bg-(--surface) p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-xl font-semibold text-(--text-primary)">
                  {title}
                </h3>
                {subtitle !== "--" && (
                  <p className="mt-1 text-sm text-(--text-secondary)">
                    {subtitle}
                  </p>
                )}
              </div>
              {statusValue && statusValue !== "--" && (
                <span
                  className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${status.className}`}
                >
                  {status.label}
                </span>
              )}
            </div>
            {description !== "--" && (
              <p className="mt-3 text-sm text-(--text-secondary)">
                {description}
              </p>
            )}
          </header>

          {heroImage && heroImage !== "--" && (
            <button
              type="button"
              onClick={() => onOpenImage(heroImage, title)}
              className="w-full overflow-hidden rounded-2xl border border-(--border)"
            >
              <img
                src={heroImage}
                alt={title}
                className="h-56 w-full object-cover"
              />
            </button>
          )}

          <section className="rounded-2xl border border-(--border) bg-(--surface) p-4">
            <h4 className="text-sm font-semibold text-(--text-primary)">
              Metadata
            </h4>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {metadataItems.map((item) => (
                <div
                  key={`view-${item.key}`}
                  className="rounded-xl border border-(--border) bg-(--surface) px-3 py-2"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-(--text-secondary)">
                    {item.label}
                  </p>
                  <p className="mt-1 text-sm whitespace-pre-line text-(--text-primary)">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {definition.mediaEnabled && (
            <section className="rounded-2xl border border-(--border) bg-(--surface) p-4">
              <h4 className="text-sm font-semibold text-(--text-primary)">
                Media Gallery
              </h4>
              {this.state.isLoadingMedia ?
                <p className="mt-2 text-xs text-(--text-secondary)">
                  Loading media...
                </p>
              : <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {this.state.mediaItems.length > 0 ?
                    this.state.mediaItems.map((item) => (
                      <button
                        type="button"
                        key={item.id}
                        onClick={() =>
                          onOpenImage(item.mediaUrl, item.title || title)
                        }
                        className="overflow-hidden rounded-xl border border-(--border) text-left"
                      >
                        {item.mediaKind === "video" ?
                          <video
                            src={item.mediaUrl}
                            className="h-28 w-full object-cover"
                            muted
                            playsInline
                          />
                        : <img
                            src={item.thumbnailUrl || item.mediaUrl}
                            alt={item.altText || item.title || title}
                            className="h-28 w-full object-cover"
                          />
                        }
                        <div className="px-2 py-1.5 text-xs text-(--text-secondary)">
                          {item.title || "Media asset"}
                        </div>
                      </button>
                    ))
                  : <div className="rounded-xl border border-dashed border-(--border) px-3 py-4 text-xs text-(--text-secondary)">
                      No media linked for this record.
                    </div>
                  }
                </div>
              }
            </section>
          )}
        </div>
      </CmsModalShellComponent>
    );
  }
}

export default CmsEntityViewModalComponent;
