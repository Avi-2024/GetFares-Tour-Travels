import { Component, type ChangeEvent } from "react";
import type {
  CmsEntityFieldDefinition,
  CmsEntityFormDefinition,
  CmsFieldOption,
  RelationSourceKey,
} from "../cms-entity-form.catalog";

interface CmsEntityFormGroupsProps {
  definition: CmsEntityFormDefinition;
  formValues: Record<string, unknown>;
  formErrors: Record<string, string>;
  imageFieldPreviews?: Record<string, string>;
  relationOptions: Record<RelationSourceKey, CmsFieldOption[]>;
  relationSearch: Record<string, string>;
  onFieldChange: (field: CmsEntityFieldDefinition, nextValue: unknown) => void;
  onRelationSearchChange: (fieldKey: string, value: string) => void;
  onFieldFileUpload?: (
    field: CmsEntityFieldDefinition,
    file: File,
  ) => Promise<void> | void;
  onFieldImageClear?: (field: CmsEntityFieldDefinition) => void;
  uploadingFieldKey?: string | null;
}

class CmsEntityFormGroupsComponent extends Component<CmsEntityFormGroupsProps> {
  private parseSwitchValue(value: unknown): boolean {
    if (typeof value === "boolean") {
      return value;
    }
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (normalized === "true" || normalized === "1") {
        return true;
      }
      if (normalized === "false" || normalized === "0" || normalized.length === 0) {
        return false;
      }
    }
    if (typeof value === "number") {
      return value !== 0;
    }
    return Boolean(value);
  }

  private isImageField(field: CmsEntityFieldDefinition): boolean {
    return /image|thumbnail|hero|banner/i.test(field.key);
  }

  private onFileChange = (
    field: CmsEntityFieldDefinition,
    event: ChangeEvent<HTMLInputElement>,
  ): void => {
    const file = event.target.files?.[0];
    if (file && this.props.onFieldFileUpload) {
      void this.props.onFieldFileUpload(field, file);
    }
    event.currentTarget.value = "";
  };

  private renderInput(field: CmsEntityFieldDefinition) {
    const {
      formValues,
      relationOptions,
      relationSearch,
      imageFieldPreviews = {},
      uploadingFieldKey = null,
      onFieldChange,
      onRelationSearchChange,
    } = this.props;

    const value = formValues[field.key];
    const options = field.relationSource ?
        relationOptions[field.relationSource]
      : (field.options ?? []);
    const className =
      "h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--ring)]";

    if (field.type === "textarea") {
      return (
        <textarea
          value={String(value ?? "")}
          onChange={(event) => onFieldChange(field, event.target.value)}
          rows={4}
          className={`${className} h-auto py-2`}
        />
      );
    }

    if (field.type === "switch") {
      const enabled = this.parseSwitchValue(value);
      return (
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          onClick={() => onFieldChange(field, !enabled)}
          className={`inline-flex h-10 items-center  gap-3 rounded-xl border px-3 text-sm font-semibold transition ${
            enabled ?
              "border-[color-mix(in_srgb,var(--success)_40%,transparent)] bg-[color-mix(in_srgb,var(--success)_12%,transparent)] text-[var(--success)]"
            : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)]"
          }`}
        >
          <span>{enabled ? "Enabled" : "Disabled"}</span>
          <span
            className={`relative inline-flex h-5 w-10  items-center rounded-full transition ${
              enabled ?
                "bg-[color-mix(in_srgb,var(--success)_70%,white_30%)]"
              : "bg-[color-mix(in_srgb,var(--text-secondary)_28%,transparent)]"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                enabled ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </span>
        </button>
      );
    }

    if (field.type === "url" && this.isImageField(field)) {
      const previewUrl =
        imageFieldPreviews[field.key] || String(value ?? "").trim();

      return (
        <div className="space-y-2">
          <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
            {previewUrl ?
              <img
                src={previewUrl}
                alt={field.label}
                className="h-36 w-full object-cover"
              />
            : <div className="flex h-36 items-center justify-center text-xs font-medium text-[var(--text-secondary)]">
                No image selected
              </div>
            }
            <div className="flex items-center gap-2 border-t border-[var(--border)] p-2">
              {this.props.onFieldFileUpload && (
                <label className="inline-flex h-9 cursor-pointer items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-xs font-semibold normal-case tracking-normal text-[var(--text-primary)] transition hover:bg-[var(--background-soft)]">
                  {uploadingFieldKey === field.key ? "Selecting..." : previewUrl ? "Replace Image" : "Choose Image"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploadingFieldKey === field.key}
                    onChange={(event) => this.onFileChange(field, event)}
                  />
                </label>
              )}
              {this.props.onFieldImageClear && (
                <button
                  type="button"
                  onClick={() => this.props.onFieldImageClear?.(field)}
                  className="inline-flex h-9 items-center justify-center rounded-xl border border-[var(--border)] px-3 text-xs font-semibold normal-case tracking-normal text-[var(--text-secondary)]"
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }

    if (field.type === "select" || field.type === "searchable-select") {
      const filteredOptions = options.filter((option) => {
        const query = (relationSearch[field.key] ?? "").toLowerCase();
        return !query || option.label.toLowerCase().includes(query);
      });
      const hasOptions = options.length > 0;

      return (
        <div className="space-y-1">
          {field.type === "searchable-select" && (
            <input
              type="search"
              value={relationSearch[field.key] ?? ""}
              onChange={(event) =>
                onRelationSearchChange(field.key, event.target.value)
              }
              className={className}
              placeholder={
                hasOptions ?
                  `Search ${field.label.toLowerCase()}...`
                : `No ${field.label.toLowerCase()} options available`
              }
              disabled={!hasOptions}
            />
          )}
          <select
            value={String(value ?? "")}
            onChange={(event) => onFieldChange(field, event.target.value)}
            className={className}
            disabled={!hasOptions}
          >
            <option value="">
              {hasOptions ? `Select ${field.label}` : `No ${field.label} available`}
            </option>
            {filteredOptions.map((option) => (
              <option key={`${field.key}-${option.value}`} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      );
    }

    if (field.type === "multi-select") {
      const selected = Array.isArray(value) ? (value as string[]) : [];
      return (
        <div className="space-y-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2">
          <div className="flex flex-wrap gap-1.5">
            {options.map((option) => {
              const active = selected.includes(option.value);
              return (
                <button
                  key={`${field.key}-${option.value}`}
                  type="button"
                  onClick={() =>
                    onFieldChange(
                      field,
                      active ?
                        selected.filter((item) => item !== option.value)
                      : [...selected, option.value],
                    )
                  }
                  className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                    active ?
                      "border-[color-mix(in_srgb,var(--primary)_30%,transparent)] bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] text-[var(--primary)]"
                    : "border-[var(--border)] text-[var(--text-secondary)]"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    const type =
      field.type === "number" ? "number"
      : field.type === "url" ? "url"
      : field.type === "date" ? "date"
      : "text";

    return (
      <input
        type={type}
        value={String(value ?? "")}
        onChange={(event) => onFieldChange(field, event.target.value)}
        className={className}
      />
    );
  }

  render() {
    const { definition, formErrors } = this.props;

    return (
      <>
        {definition.groups.map((group) => (
          <section
            key={group.key}
            className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4"
          >
            <h4 className="text-sm font-semibold text-[var(--text-primary)]">
              {group.title}
            </h4>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              {group.description}
            </p>
            <div
              className={`mt-3 grid gap-3 ${
                group.columns === 2 ? "md:grid-cols-2" : "grid-cols-1"
              }`}
            >
              {definition.fields
                .filter((field) => field.groupKey === group.key)
                .map((field) => (
                  <div
                    key={field.key}
                    className="block space-y-1 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-secondary)]"
                  >
                    <span>
                      {field.label}
                      {field.required ? " *" : ""}
                    </span>
                    {this.renderInput(field)}
                    {field.helperText && (
                      <span className="text-[11px] normal-case tracking-normal text-[var(--text-secondary)]">
                        {field.helperText}
                      </span>
                    )}
                    <span className="text-[11px] normal-case tracking-normal text-[var(--danger)]">
                      {formErrors[field.key] || " "}
                    </span>
                  </div>
                ))}
            </div>
          </section>
        ))}
      </>
    );
  }
}

export default CmsEntityFormGroupsComponent;
