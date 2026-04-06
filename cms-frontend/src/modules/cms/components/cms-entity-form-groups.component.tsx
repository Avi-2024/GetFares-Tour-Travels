import { Component } from "react";
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
  relationOptions: Record<RelationSourceKey, CmsFieldOption[]>;
  relationSearch: Record<string, string>;
  onFieldChange: (field: CmsEntityFieldDefinition, nextValue: unknown) => void;
  onRelationSearchChange: (fieldKey: string, value: string) => void;
}

class CmsEntityFormGroupsComponent extends Component<CmsEntityFormGroupsProps> {
  private renderInput(field: CmsEntityFieldDefinition) {
    const {
      formValues,
      relationOptions,
      relationSearch,
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
      return (
        <button
          type="button"
          onClick={() => onFieldChange(field, !Boolean(value))}
          className={`inline-flex h-10 items-center rounded-xl border px-3 text-sm font-semibold ${
            Boolean(value) ?
              "border-[color-mix(in_srgb,var(--success)_40%,transparent)] text-[var(--success)]"
            : "border-[var(--border)] text-[var(--text-secondary)]"
          }`}
        >
          {Boolean(value) ? "Enabled" : "Disabled"}
        </button>
      );
    }

    if (field.type === "select" || field.type === "searchable-select") {
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
              placeholder={`Search ${field.label.toLowerCase()}...`}
            />
          )}
          <select
            value={String(value ?? "")}
            onChange={(event) => onFieldChange(field, event.target.value)}
            className={className}
          >
            <option value="">Select {field.label}</option>
            {options
              .filter((option) => {
                const query = (relationSearch[field.key] ?? "").toLowerCase();
                return !query || option.label.toLowerCase().includes(query);
              })
              .map((option) => (
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
                  <label
                    key={field.key}
                    className="space-y-1 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-secondary)]"
                  >
                    <span>
                      {field.label}
                      {field.required ? " *" : ""}
                    </span>
                    {this.renderInput(field)}
                    <span className="text-[11px] normal-case tracking-normal text-[var(--danger)]">
                      {formErrors[field.key] || " "}
                    </span>
                  </label>
                ))}
            </div>
          </section>
        ))}
      </>
    );
  }
}

export default CmsEntityFormGroupsComponent;
