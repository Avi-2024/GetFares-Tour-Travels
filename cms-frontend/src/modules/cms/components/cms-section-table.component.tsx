import { Component, type ReactNode } from "react";
import { CirclePlus, Eye, PencilLine, RotateCcw, Trash2 } from "lucide-react";
import SurfaceCardComponent from "../../../shared/components/cards/surface-card.component";
import type { CmsTableEntry } from "../types/cms-table-entry.type";

interface CmsSectionTableProps {
  title: string;
  actionLabel: string;
  columns: Array<{ key: string; label: string; isHighlighted?: boolean }>;
  rows: CmsTableEntry[];
  isLoading: boolean;
  hasImageColumn: boolean;
  supportsCreate: boolean;
  supportsEdit: boolean;
  supportsDelete: boolean;
  supportsRestore?: boolean;
  deleteActionLabel?: string;
  emptyStateMessage?: string;
  dateColumnKeys: Set<string>;
  onCreate: () => void;
  onView: (entry: CmsTableEntry) => void;
  onEdit: (entry: CmsTableEntry) => void;
  onDelete: (entry: CmsTableEntry) => void;
  onRestore?: (entry: CmsTableEntry) => void;
  onImagePreview: (url: string, label: string) => void;
  getImageUrl: (entry: CmsTableEntry) => string | null;
  getEntryLabel: (entry: CmsTableEntry | null) => string;
  getToneClass: (tone: "default" | "success" | "warning" | "info") => string;
  formatDateValue: (value: string) => string;
}

class CmsSectionTableComponent extends Component<CmsSectionTableProps> {
  private renderActionButton({
    label,
    title,
    disabled = false,
    tone = "neutral",
    onClick,
    icon,
  }: {
    label: string;
    title: string;
    disabled?: boolean;
    tone?: "neutral" | "danger" | "success";
    onClick: () => void;
    icon: ReactNode;
  }) {
    const toneClass =
      tone === "danger" ?
        "border-[color-mix(in_srgb,var(--danger)_35%,transparent)] bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] text-[var(--danger)] hover:bg-[color-mix(in_srgb,var(--danger)_16%,transparent)]"
      : tone === "success" ?
        "border-[color-mix(in_srgb,var(--success)_35%,transparent)] bg-[color-mix(in_srgb,var(--success)_10%,transparent)] text-[var(--success)] hover:bg-[color-mix(in_srgb,var(--success)_16%,transparent)]"
      : "border-[var(--border)] bg-(--surface) text-[var(--text-secondary)] hover:bg-(--background-soft)";

    return (
      <button
        type="button"
        title={title}
        aria-label={label}
        onClick={onClick}
        disabled={disabled}
        className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border transition ${toneClass} disabled:cursor-not-allowed disabled:opacity-50`}
      >
        {icon}
      </button>
    );
  }

  private getValue(entry: CmsTableEntry, key: string): string {
    const { dateColumnKeys, formatDateValue } = this.props;
    const rawValue = entry.row.cells[key]?.value ?? "--";
    return dateColumnKeys.has(key) ? formatDateValue(rawValue) : rawValue;
  }

  private renderTonedValue(entry: CmsTableEntry, key: string) {
    const { getToneClass } = this.props;
    const cell = entry.row.cells[key];
    const value = this.getValue(entry, key);
    if (!cell || cell.tone === "default") {
      return value;
    }
    return (
      <span
        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getToneClass(cell.tone)}`}
      >
        {value}
      </span>
    );
  }

  render() {
    const {
      title,
      actionLabel,
      columns,
      rows,
      isLoading,
      hasImageColumn,
      supportsCreate,
      supportsEdit,
      supportsDelete,
      supportsRestore = false,
      deleteActionLabel = "Delete",
      emptyStateMessage = "No records found for the selected filters.",
      onCreate,
      onView,
      onEdit,
      onDelete,
      onRestore,
      onImagePreview,
      getImageUrl,
      getEntryLabel,
    } = this.props;

    const primaryColumns = columns.slice(0, 2);
    const secondaryColumns = columns.slice(2);

    return (
      <SurfaceCardComponent
        title={`${title} Table`}
        subtitle={`${rows.length} records`}
        rightSlot={
          supportsCreate ?
            <button
              type="button"
              onClick={onCreate}
              className="inline-flex h-9 items-center gap-2 rounded-full bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] px-3 text-xs font-semibold text-white sm:h-10 sm:px-4"
            >
              <CirclePlus size={13} />
              {actionLabel}
            </button>
          : undefined
        }
      >
        <div className="space-y-2 md:hidden">
          {isLoading ?
            <div className="rounded-2xl border border-[var(--border)] bg-(--surface) px-4 py-8 text-center text-sm text-[var(--text-secondary)]">
              Loading records...
            </div>
          : rows.length > 0 ?
            rows.map((entry) => {
              const imageUrl = getImageUrl(entry);
              const entryLabel = getEntryLabel(entry);
              return (
                <article
                  key={`mobile-${entry.id}`}
                  className="rounded-2xl border border-[var(--border)] bg-(--surface) p-3 shadow-[0_8px_22px_color-mix(in_srgb,var(--text-primary)_8%,transparent)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-1.5">
                      {primaryColumns.map((column) => (
                        <div key={`${entry.id}-primary-${column.key}`}>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                            {column.label}
                          </p>
                          <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                            {this.renderTonedValue(entry, column.key)}
                          </p>
                        </div>
                      ))}
                    </div>
                    {hasImageColumn && imageUrl && (
                      <button
                        type="button"
                        onClick={() => onImagePreview(imageUrl, entryLabel)}
                        className="overflow-hidden rounded-xl border border-[var(--border)]"
                      >
                        <img
                          src={imageUrl}
                          alt={`${entryLabel} preview`}
                          className="h-14 w-20 object-cover"
                        />
                      </button>
                    )}
                  </div>

                  {secondaryColumns.length > 0 && (
                    <details className="mt-2 rounded-xl border border-[var(--border)] bg-(--background-soft)/35 p-2">
                      <summary className="cursor-pointer select-none text-xs font-semibold text-[var(--text-secondary)]">
                        More details
                      </summary>
                      <div className="mt-2 grid gap-2">
                        {secondaryColumns.map((column) => (
                          <div key={`${entry.id}-secondary-${column.key}`}>
                            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                              {column.label}
                            </p>
                            <p className="text-sm text-[var(--text-primary)]">
                              {this.renderTonedValue(entry, column.key)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {this.renderActionButton({
                      label: `View ${entryLabel}`,
                      title: "View",
                      onClick: () => onView(entry),
                      icon: <Eye size={14} />,
                    })}
                    {this.renderActionButton({
                      label: `Edit ${entryLabel}`,
                      title: "Edit",
                      disabled: !supportsEdit || entry.readOnly,
                      onClick: () => onEdit(entry),
                      icon: <PencilLine size={14} />,
                    })}
                    {supportsRestore &&
                      onRestore &&
                      this.renderActionButton({
                        label: `Restore ${entryLabel}`,
                        title: "Restore",
                        disabled: entry.readOnly,
                        tone: "success",
                        onClick: () => onRestore(entry),
                        icon: <RotateCcw size={14} />,
                      })}
                    {this.renderActionButton({
                      label: `${deleteActionLabel} ${entryLabel}`,
                      title: deleteActionLabel,
                      disabled: !supportsDelete || entry.readOnly,
                      tone: "danger",
                      onClick: () => onDelete(entry),
                      icon: <Trash2 size={14} />,
                    })}
                  </div>
                </article>
              );
            })
          : <div className="rounded-2xl border border-[var(--border)] bg-(--surface) px-4 py-8 text-center text-sm text-[var(--text-secondary)]">
              {emptyStateMessage}
            </div>
          }
        </div>

        <div className="hidden overflow-x-auto rounded-2xl border border-[var(--border)] bg-(--surface) md:block">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="sticky top-0 bg-[color-mix(in_srgb,var(--primary)_8%,transparent)] text-xs uppercase tracking-[0.16em] text-[var(--text-secondary)]">
              <tr>
                {columns.map((column) => (
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
                    colSpan={columns.length + (hasImageColumn ? 2 : 1)}
                    className="px-4 py-10 text-center text-sm text-[var(--text-secondary)]"
                  >
                    Loading records...
                  </td>
                </tr>
              : rows.length > 0 ?
                rows.map((entry) => {
                  const imageUrl = getImageUrl(entry);
                  const entryLabel = getEntryLabel(entry);
                  return (
                    <tr
                      key={entry.id}
                      className="border-t border-[var(--border)] hover:bg-(--background-soft)/40"
                    >
                      {columns.map((column) => {
                        const cell = entry.row.cells[column.key];
                        const toned = cell && cell.tone !== "default";
                        const value = this.getValue(entry, column.key);
                        return (
                          <td
                            key={`${entry.id}-${column.key}`}
                            className={`px-4 py-3 ${column.isHighlighted ? "font-semibold text-[var(--text-primary)]" : "text-[var(--text-secondary)]"}`}
                          >
                            {toned ?
                              <span
                                className={`rounded-full px-2 py-1 text-xs font-semibold ${this.props.getToneClass(cell.tone)}`}
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
                                onImagePreview(imageUrl, entryLabel)
                              }
                              className="group relative overflow-hidden rounded-xl border border-[var(--border)]"
                            >
                              <img
                                src={imageUrl}
                                alt={`${entryLabel} preview`}
                                className="h-10 w-16 object-cover transition group-hover:scale-105"
                              />
                            </button>
                          : <span className="text-xs text-[var(--text-secondary)]">
                              --
                            </span>
                          }
                        </td>
                      )}
                      <td className="w-[164px] px-4 py-3">
                        <div className="inline-flex flex-wrap gap-1.5">
                          {this.renderActionButton({
                            label: `View ${entryLabel}`,
                            title: "View",
                            onClick: () => onView(entry),
                            icon: <Eye size={14} />,
                          })}
                          {this.renderActionButton({
                            label: `Edit ${entryLabel}`,
                            title: "Edit",
                            disabled: !supportsEdit || entry.readOnly,
                            onClick: () => onEdit(entry),
                            icon: <PencilLine size={14} />,
                          })}
                          {supportsRestore &&
                            onRestore &&
                            this.renderActionButton({
                              label: `Restore ${entryLabel}`,
                              title: "Restore",
                              disabled: entry.readOnly,
                              tone: "success",
                              onClick: () => onRestore(entry),
                              icon: <RotateCcw size={14} />,
                            })}
                          {this.renderActionButton({
                            label: `${deleteActionLabel} ${entryLabel}`,
                            title: deleteActionLabel,
                            disabled: !supportsDelete || entry.readOnly,
                            tone: "danger",
                            onClick: () => onDelete(entry),
                            icon: <Trash2 size={14} />,
                          })}
                        </div>
                      </td>
                    </tr>
                  );
                })
              : <tr>
                  <td
                    colSpan={columns.length + (hasImageColumn ? 2 : 1)}
                    className="px-4 py-10 text-center text-sm text-[var(--text-secondary)]"
                  >
                    {emptyStateMessage}
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </SurfaceCardComponent>
    );
  }
}

export default CmsSectionTableComponent;
