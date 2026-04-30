import { Component, type ChangeEvent } from "react";
import { FaTimes } from "react-icons/fa";
import SearchDropDown from "../../../shared/components/search-dropdown.component";
import IconPickerComponent from "../../../shared/components/icon-picker.component";
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
  onFieldChange: (field: CmsEntityFieldDefinition, nextValue: unknown) => void;
  onFieldFileUpload?: (
    field: CmsEntityFieldDefinition,
    file: File,
  ) => Promise<void> | void;
  onFieldImageClear?: (field: CmsEntityFieldDefinition) => void;
  uploadingFieldKey?: string | null;
}

class CmsEntityFormGroupsComponent extends Component<CmsEntityFormGroupsProps> {
  private resolveCurrencyField(
    field: CmsEntityFieldDefinition,
  ): CmsEntityFieldDefinition | null {
    const currencyByAmountKey: Record<string, string> = {
      amount: "amountCurrency",
      startingPrice: "startingPriceCurrency",
      priceAmount: "priceCurrency",
      originalPrice: "offerCurrency",
    };
    const currencyKey = currencyByAmountKey[field.key];
    if (!currencyKey) {
      return null;
    }
    return (
      this.props.definition.fields.find(
        (item) => item.key === currencyKey && item.groupKey === field.groupKey,
      ) || null
    );
  }

  private shouldHideStandaloneField(field: CmsEntityFieldDefinition): boolean {
    const pairTargets = new Set([
      "amountCurrency",
      "startingPriceCurrency",
      "priceCurrency",
      "offerCurrency",
    ]);
    if (!pairTargets.has(field.key)) {
      return false;
    }
    return this.props.definition.fields.some(
      (candidate) =>
        candidate.groupKey === field.groupKey &&
        this.resolveCurrencyField(candidate)?.key === field.key,
    );
  }

  private isIconFieldKey(key: string): boolean {
    return key === "iconName" || key === "icon_name";
  }

  private parseSwitchValue(value: unknown): boolean {
    if (typeof value === "boolean") {
      return value;
    }
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (normalized === "true" || normalized === "1") {
        return true;
      }
      if (
        normalized === "false" ||
        normalized === "0" ||
        normalized.length === 0
      ) {
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

  private asStringList(value: unknown): string[] {
    if (!Array.isArray(value)) {
      return [];
    }
    return value.map((item) => String(item ?? ""));
  }

  private asObjectList(value: unknown): Record<string, unknown>[] {
    if (!Array.isArray(value)) {
      return [];
    }
    return value
      .filter((item) => item && typeof item === "object")
      .map((item) => ({ ...(item as Record<string, unknown>) }));
  }

  private renderInput(field: CmsEntityFieldDefinition) {
    const {
      formValues,
      relationOptions,
      imageFieldPreviews = {},
      uploadingFieldKey = null,
      onFieldChange,
    } = this.props;

    const value = formValues[field.key];
    const options =
      field.relationSource ?
        relationOptions[field.relationSource]
      : (field.options ?? []);
    const className =
      "h-10 w-full rounded-xl border border-(--border) bg-(--surface) px-3 text-sm text-(--text-primary) outline-none focus:border-(--primary) focus:ring-2 focus:ring-(--ring)";
    const currencyField = this.resolveCurrencyField(field);

    if (field.type === "number" && currencyField) {
      const currencyValue = String(
        formValues[currencyField.key] ?? currencyField.defaultValue ?? "INR",
      );
      const currencyOptions =
        currencyField.relationSource ?
          relationOptions[currencyField.relationSource]
        : (currencyField.options ?? []);
      return (
        <div className="flex items-stretch">
          <div className="w-34 shrink-0">
            <SearchDropDown
              value={currencyValue}
              options={currencyOptions.map((option) => ({
                label: option.label,
                value: option.value,
                meta: option.meta,
              }))}
              placeholder="Currency"
              onChange={(nextValue) => onFieldChange(currencyField, nextValue)}
              className="h-10 w-full rounded-l-xl rounded-r-none border border-(--border) border-r-0 bg-(--surface) px-9 pr-9 text-sm text-(--text-primary) outline-none focus:border-(--primary) focus:ring-2 focus:ring-(--ring)"
            />
          </div>
          <input
            type="number"
            value={String(value ?? "")}
            onKeyDown={(e) => {
              if (e.key === "ArrowUp" || e.key === "ArrowDown") e.preventDefault();
            }}
            onWheel={(e) => e.currentTarget.blur()}
            onChange={(event) => onFieldChange(field, event.target.value)}
            className="h-10 w-full rounded-r-xl rounded-l-none border border-(--border) bg-(--surface) px-3 text-sm text-(--text-primary) outline-none focus:border-(--primary) focus:ring-2 focus:ring-(--ring) [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
        </div>
      );
    }

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
              "border-[color-mix(in_srgb,var(--success)_40%,transparent)] bg-[color-mix(in_srgb,var(--success)_12%,transparent)] text-(--success)"
            : "border-(--border) bg-(--surface) text-(--text-secondary)"
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
          <div className="overflow-hidden rounded-2xl border border-(--border) bg-(--surface)">
            {previewUrl ?
              <img
                src={previewUrl}
                alt={field.label}
                className="h-36 w-full object-cover"
              />
            : <div className="flex h-36 items-center justify-center text-xs font-medium text-(--text-secondary)">
                No image selected
              </div>
            }
            <div className="flex items-center gap-2 border-t border-(--border) p-2">
              {this.props.onFieldFileUpload && (
                <label className="inline-flex h-9 cursor-pointer items-center justify-center rounded-xl border border-(--border) bg-(--surface) px-3 text-xs font-semibold normal-case tracking-normal text-(--text-primary) transition hover:bg-(--background-soft)">
                  {uploadingFieldKey === field.key ?
                    "Selecting..."
                  : previewUrl ?
                    "Replace Image"
                  : "Choose Image"}
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
                  className="inline-flex h-9 items-center justify-center rounded-xl border border-(--border) px-3 text-xs font-semibold normal-case tracking-normal text-(--text-secondary)"
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
      const hasOptions = options.length > 0;

      return (
        <SearchDropDown
          value={String(value ?? "")}
          options={options.map((option) => ({
            label: option.label,
            value: option.value,
            meta: option.meta,
          }))}
          placeholder={
            hasOptions ? `Select ${field.label}` : `No ${field.label} available`
          }
          disabled={!hasOptions}
          onChange={(nextValue) => onFieldChange(field, nextValue)}
        />
      );
    }

    if (field.type === "list-text") {
      const items = this.asStringList(value);
      return (
        <div className="space-y-3 rounded-2xl border border-[color-mix(in_srgb,var(--primary)_18%,var(--border))] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--surface)_94%,transparent)_0%,color-mix(in_srgb,var(--surface)_100%,var(--background-soft))_100%)] p-3 shadow-[0_10px_28px_color-mix(in_srgb,var(--primary)_8%,transparent)]">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-(--text-secondary)">
              {field.label}
            </p>
            <button
              type="button"
              onClick={() => onFieldChange(field, [...items, ""])}
              className="inline-flex h-8 items-center justify-center rounded-lg border border-[color-mix(in_srgb,var(--primary)_30%,transparent)] bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] px-3 text-xs font-semibold normal-case tracking-normal text-(--primary) transition hover:bg-[color-mix(in_srgb,var(--primary)_16%,transparent)]"
            >
              {field.addLabel || "Add Row"}
            </button>
          </div>
          <div className="space-y-2">
            {items.map((item, index) => (
              <div
                key={`${field.key}-${index}`}
                className="flex items-center gap-2 rounded-xl border border-(--border) bg-(--surface) p-2 shadow-[0_4px_14px_color-mix(in_srgb,var(--text-primary)_8%,transparent)]"
              >
                <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] px-2 text-[11px] font-semibold text-(--primary)">
                  {index + 1}
                </span>
                <input
                  type="text"
                  value={item}
                  onChange={(event) => {
                    const next = [...items];
                    next[index] = event.target.value;
                    onFieldChange(field, next);
                  }}
                  className="h-10 w-full rounded-lg border border-(--border) bg-(--surface) px-3 text-sm text-(--text-primary) outline-none focus:border-(--primary) focus:ring-2 focus:ring-(--ring)"
                />
                <button
                  type="button"
                  onClick={() => {
                    const next = items.filter(
                      (_, rowIndex) => rowIndex !== index,
                    );
                    onFieldChange(field, next);
                  }}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[color-mix(in_srgb,var(--danger)_40%,transparent)] bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] text-sm font-bold text-(--danger) transition hover:bg-[color-mix(in_srgb,var(--danger)_18%,transparent)]"
                  aria-label={`Remove ${field.label} item ${index + 1}`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (field.type === "list-object") {
      const rows = this.asObjectList(value);
      const itemFields = field.itemFields ?? [];
      return (
        <div className="space-y-3 rounded-2xl border border-[color-mix(in_srgb,var(--primary)_18%,var(--border))] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--surface)_94%,transparent)_0%,color-mix(in_srgb,var(--surface)_100%,var(--background-soft))_100%)] p-3 shadow-[0_12px_32px_color-mix(in_srgb,var(--primary)_8%,transparent)]">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-(--text-secondary)">
              {field.label}
            </p>
            <button
              type="button"
              onClick={() => {
                const template = (field.itemFields ?? []).reduce(
                  (acc, itemField) => ({ ...acc, [itemField.key]: "" }),
                  {} as Record<string, unknown>,
                );
                onFieldChange(field, [...rows, template]);
              }}
              className="inline-flex h-8 items-center justify-center rounded-lg border border-[color-mix(in_srgb,var(--primary)_30%,transparent)] bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] px-3 text-xs font-semibold normal-case tracking-normal text-(--primary) transition hover:bg-[color-mix(in_srgb,var(--primary)_16%,transparent)]"
            >
              {field.addLabel || "Add Row"}
            </button>
          </div>
          <div className="space-y-2">
            {rows.map((row, rowIndex) => (
              <div
                key={`${field.key}-${rowIndex}`}
                className="rounded-2xl border border-(--border) bg-(--surface) p-3 shadow-[0_8px_24px_color-mix(in_srgb,var(--text-primary)_8%,transparent)]"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-(--text-secondary)">
                    {field.label} #{rowIndex + 1}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      const next = rows.filter(
                        (_, index) => index !== rowIndex,
                      );
                      onFieldChange(field, next);
                    }}
                    className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[color-mix(in_srgb,var(--danger)_40%,transparent)] bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] text-(--danger) transition hover:bg-[color-mix(in_srgb,var(--danger)_18%,transparent)]"
                    aria-label={`Remove ${field.label} row ${rowIndex + 1}`}
                  >
                    <FaTimes size={11} />
                  </button>
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  {itemFields.map((itemField) => {
                    const itemValue = String(row[itemField.key] ?? "");
                    const inputType =
                      itemField.type === "number" ? "number" : "text";
                    const isTextarea = itemField.type === "textarea";
                    const isIconField = this.isIconFieldKey(itemField.key);
                    return (
                      <label
                        key={`${field.key}-${rowIndex}-${itemField.key}`}
                        className="space-y-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-(--text-secondary)"
                      >
                        <span>{itemField.label}</span>
                        {isIconField ?
                          <span className="normal-case tracking-normal">
                            <IconPickerComponent
                              value={itemValue}
                              onChange={(nextIcon) => {
                                const next = [...rows];
                                next[rowIndex] = {
                                  ...next[rowIndex],
                                  [itemField.key]: nextIcon,
                                };
                                onFieldChange(field, next);
                              }}
                            />
                          </span>
                        : isTextarea ?
                          <textarea
                            value={itemValue}
                            onChange={(event) => {
                              const next = [...rows];
                              next[rowIndex] = {
                                ...next[rowIndex],
                                [itemField.key]: event.target.value,
                              };
                              onFieldChange(field, next);
                            }}
                            rows={3}
                            className="w-full rounded-lg border border-(--border) bg-(--surface) px-3 py-2 text-sm normal-case tracking-normal text-(--text-primary) outline-none focus:border-(--primary) focus:ring-2 focus:ring-(--ring)"
                          />
                        : <input
                            type={inputType}
                            value={itemValue}
                            placeholder={itemField.placeholder}
                            onKeyDown={(e) => {
                              if (inputType === "number" && (e.key === "ArrowUp" || e.key === "ArrowDown")) e.preventDefault();
                            }}
                            onWheel={(e) => {
                              if (inputType === "number") e.currentTarget.blur();
                            }}
                            onChange={(event) => {
                              const next = [...rows];
                              next[rowIndex] = {
                                ...next[rowIndex],
                                [itemField.key]: event.target.value,
                              };
                              onFieldChange(field, next);
                            }}
                            className={`h-10 w-full rounded-lg border border-(--border) bg-(--surface) px-3 text-sm normal-case tracking-normal text-(--text-primary) outline-none focus:border-(--primary) focus:ring-2 focus:ring-(--ring) ${inputType === "number" ? "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" : ""}`}
                          />
                        }
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (field.type === "multi-select") {
      const selected = Array.isArray(value) ? (value as string[]) : [];
      return (
        <div className="space-y-1 rounded-xl border border-(--border) bg-(--surface) p-2">
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
                      "border-[color-mix(in_srgb,var(--primary)_30%,transparent)] bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] text-(--primary)"
                    : "border-(--border) text-(--text-secondary)"
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

    if (this.isIconFieldKey(field.key)) {
      return (
        <IconPickerComponent
          value={String(value ?? "")}
          onChange={(nextValue) => onFieldChange(field, nextValue)}
        />
      );
    }

    const isDisplayOrder = field.key === "displayOrder";

    return (
      <input
        type={type}
        value={String(value ?? "")}
        min={isDisplayOrder ? 1 : undefined}
        onKeyDown={(e) => {
          if (type === "number" && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
            e.preventDefault();
          }
        }}
        onWheel={(e) => {
          if (type === "number") e.currentTarget.blur();
        }}
        onChange={(event) => {
          if (isDisplayOrder) {
            const num = Number(event.target.value);
            if (event.target.value !== "" && num < 1) return;
          }
          onFieldChange(field, event.target.value);
        }}
        className={`${className} ${type === "number" ? "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" : ""}`}
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
            className="rounded-2xl border border-(--border) bg-(--surface) p-4"
          >
            <h4 className="text-sm font-semibold text-(--text-primary)">
              {group.title}
            </h4>
            <p className="mt-1 text-xs text-(--text-secondary)">
              {group.description}
            </p>
            <div
              className={`mt-3 grid gap-3 ${
                group.columns === 2 ? "md:grid-cols-2" : "grid-cols-1"
              }`}
            >
              {definition.fields
                .filter((field) => field.groupKey === group.key)
                .filter((field) => !this.shouldHideStandaloneField(field))
                .map((field) => (
                  <div
                    key={field.key}
                    className={`space-y-1 text-xs font-semibold uppercase tracking-[0.08em] text-(--text-secondary) ${
                      field.type === "switch" ? "flex flex-col justify-end" : "block"
                    }`}
                  >
                    <span>
                      {field.label}
                      {field.required && (
                        <span className="ml-0.5 text-[var(--danger)]">*</span>
                      )}
                    </span>
                    {this.renderInput(field)}
                    {field.helperText && (
                      <span className="text-[11px] normal-case tracking-normal text-(--text-secondary)">
                        {field.helperText}
                      </span>
                    )}
                    <span className="text-[11px] normal-case tracking-normal text-(--danger)">
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
