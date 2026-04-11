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
    tone?: "neutral" | "danger";
    onClick: () => void;
    icon: ReactNode;
  }) {
    const toneClass =
      tone === "danger" ?
        "border-[color-mix(in_srgb,var(--danger)_35%,transparent)] bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] text-[var(--danger)] hover:bg-[color-mix(in_srgb,var(--danger)_16%,transparent)]"
      : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--background-soft)]";

    return (
      <button
        type="button"
        title={title}
        aria-label={label}
        onClick={onClick}
        disabled={disabled}
        className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border transition ${toneClass} disabled:cursor-not-allowed disabled:opacity-50`}
      >
        {icon}
      </button>
    );
  }

  private renderCell(entry: CmsTableEntry, column: { key: string; isHighlighted?: boolean }) {
    const { dateColumnKeys, getToneClass, formatDateValue } = this.props;
    const cell = entry.row.cells[column.key];
    const toned = cell && cell.tone !== "default";
    const rawValue = cell ? cell.value : "--";
    const value = dateColumnKeys.has(column.key) ? formatDateValue(rawValue) : rawValue;

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
          <span className={`rounded-full px-2 py-1 text-xs font-semibold ${getToneClass(cell.tone)}`}>
            {value}
          </span>
        : value}
      </td>
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
      onCreate,
      onView,
      onEdit,
      onDelete,
      onRestore,
      onImagePreview,
      getImageUrl,
      getEntryLabel,
    } = this.props;

    return (
      <SurfaceCardComponent
        title={`${title} Table`}
        subtitle={`${rows.length} records`}
        rightSlot={
          <button
            type="button"
            onClick={onCreate}
            disabled={!supportsCreate}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-55"
          >
            <CirclePlus size={13} />
            {actionLabel}
          </button>
        }
      >
        <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
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
                      className="border-t border-[var(--border)] hover:bg-[var(--background-soft)]/40"
                    >
                      {columns.map((column) => this.renderCell(entry, column))}
                      {hasImageColumn && (
                        <td className="px-4 py-3">
                          {imageUrl ?
                            <button
                              type="button"
                              onClick={() => onImagePreview(imageUrl, entryLabel)}
                              className="group relative overflow-hidden rounded-xl border border-[var(--border)]"
                            >
                              <img
                                src={imageUrl}
                                alt={`${entryLabel} preview`}
                                className="h-10 w-16 object-cover transition group-hover:scale-105"
                              />
                            </button>
                          : <span className="text-xs text-[var(--text-secondary)]">--</span>}
                        </td>
                      )}
                      <td className="w-[132px] px-4 py-3">
                        <div className={`inline-grid gap-1.5 ${supportsRestore ? "grid-cols-4" : "grid-cols-3"}`}>
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
                              onClick: () => onRestore(entry),
                              icon: <RotateCcw size={14} />,
                            })}
                          {this.renderActionButton({
                            label: `Delete ${entryLabel}`,
                            title: "Delete",
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
                    No records found for the selected filters.
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
