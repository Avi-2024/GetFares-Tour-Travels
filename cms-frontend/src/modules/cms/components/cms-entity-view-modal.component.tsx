import { Component } from "react";
import CmsModalShellComponent from "./cms-modal-shell.component";
import { CmsEntityFormCatalog } from "../cms-entity-form.catalog";
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
  };

  componentDidMount(): void {
    if (this.props.isOpen) {
      void this.loadMedia();
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
    }
  }

  private toSnake(value: string): string {
    return value.replace(/[A-Z]/g, (char) => `_${char.toLowerCase()}`);
  }

  private readValue(key: string): string {
    const { entry } = this.props;
    if (!entry) {
      return "--";
    }
    const direct = entry.raw[key];
    if (direct !== undefined && direct !== null && String(direct).trim()) {
      return String(direct);
    }
    const snake = this.toSnake(key);
    const fallback = entry.raw[snake];
    if (fallback !== undefined && fallback !== null && String(fallback).trim()) {
      return String(fallback);
    }
    return "--";
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

  private getEntryLabel(): string {
    if (!this.props.entry) {
      return "Record";
    }
    const rowValues = Object.values(this.props.entry.row.cells).map((cell) => cell.value);
    return rowValues.find((value) => value !== "--" && value.trim()) || "Record";
  }

  private async loadMedia(): Promise<void> {
    if (!this.props.entry || !CmsEntityFormCatalog.get(this.props.sectionKey).mediaEnabled) {
      this.setState({ mediaItems: [], isLoadingMedia: false });
      return;
    }

    this.setState({ isLoadingMedia: true });
    try {
      const entityType = this.cmsService.getMediaEntityType(this.props.sectionKey);
      const mediaItems = await this.cmsService.listMedia(entityType, this.props.entry.id);
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

      const value = this.readValue(field.key);
      if (value === "--") {
        return;
      }

      items.push({
        key: field.key,
        label: field.label,
        value,
      });
    });

    if (this.props.sectionKey === "landing-places") {
      const updatedAt = this.readValue("updatedAt");
      if (updatedAt !== "--") {
        items.push({
          key: "updatedAt",
          label: "Updated At",
          value: updatedAt,
        });
      }
    }

    return items;
  }

  render() {
    const { isOpen, onClose, sectionKey, sectionTitle, onOpenImage } = this.props;
    const definition = CmsEntityFormCatalog.get(sectionKey);
    const title = this.readValue(definition.titleKey) || this.getEntryLabel();
    const subtitle = definition.subtitleKey ? this.readValue(definition.subtitleKey) : "";
    const statusValue = definition.statusKey ? this.readValue(definition.statusKey) : "";
    const status = this.resolveStatus(statusValue);
    const description = definition.descriptionKey ? this.readValue(definition.descriptionKey) : "";
    const metadataItems = this.getMetadataItems();
    const heroImageCandidates = [
      this.state.mediaItems[0]?.mediaUrl,
      this.readValue("imageUrl"),
      this.readValue("heroImageUrl"),
      this.readValue("thumbnailUrl"),
      this.readValue("bannerImageUrl"),
    ];
    const heroImage =
      heroImageCandidates.find(
        (candidate) => Boolean(candidate && candidate !== "--"),
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
          <header className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-xl font-semibold text-[var(--text-primary)]">{title}</h3>
                {subtitle !== "--" && (
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">{subtitle}</p>
                )}
              </div>
              {statusValue && statusValue !== "--" && (
                <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${status.className}`}>
                  {status.label}
                </span>
              )}
            </div>
            {description !== "--" && (
              <p className="mt-3 text-sm text-[var(--text-secondary)]">{description}</p>
            )}
          </header>

          {heroImage && heroImage !== "--" && (
            <button
              type="button"
              onClick={() => onOpenImage(heroImage, title)}
              className="w-full overflow-hidden rounded-2xl border border-[var(--border)]"
            >
              <img src={heroImage} alt={title} className="h-56 w-full object-cover" />
            </button>
          )}

          <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
            <h4 className="text-sm font-semibold text-[var(--text-primary)]">Metadata</h4>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {metadataItems.map((item) => (
                <div
                  key={`view-${item.key}`}
                  className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-secondary)]">
                    {item.label}
                  </p>
                  <p className="mt-1 text-sm text-[var(--text-primary)]">{item.value}</p>
                </div>
              ))}
            </div>
          </section>

          {definition.mediaEnabled && (
            <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
              <h4 className="text-sm font-semibold text-[var(--text-primary)]">Media Gallery</h4>
              {this.state.isLoadingMedia ? (
                <p className="mt-2 text-xs text-[var(--text-secondary)]">Loading media...</p>
              ) : (
                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {this.state.mediaItems.length > 0 ?
                    this.state.mediaItems.map((item) => (
                      <button
                        type="button"
                        key={item.id}
                        onClick={() => onOpenImage(item.mediaUrl, item.title || title)}
                        className="overflow-hidden rounded-xl border border-[var(--border)] text-left"
                      >
                        {item.mediaKind === "video" ? (
                          <video
                            src={item.mediaUrl}
                            className="h-28 w-full object-cover"
                            muted
                            playsInline
                          />
                        ) : (
                          <img
                            src={item.thumbnailUrl || item.mediaUrl}
                            alt={item.altText || item.title || title}
                            className="h-28 w-full object-cover"
                          />
                        )}
                        <div className="px-2 py-1.5 text-xs text-[var(--text-secondary)]">
                          {item.title || "Media asset"}
                        </div>
                      </button>
                    ))
                  : <div className="rounded-xl border border-dashed border-[var(--border)] px-3 py-4 text-xs text-[var(--text-secondary)]">
                      No media linked for this record.
                    </div>}
                </div>
              )}
            </section>
          )}
        </div>
      </CmsModalShellComponent>
    );
  }
}

export default CmsEntityViewModalComponent;
