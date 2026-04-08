import type {
  CmsEntityFieldDefinition,
} from "../cms-entity-form.catalog";
import { BaseValidator, type ValidationOutcome } from "../../../shared/core/base.validator";

interface CmsEntityValidationInput {
  fields: CmsEntityFieldDefinition[];
  formValues: Record<string, unknown>;
  imageFieldFiles?: Record<string, File | null>;
}

class CmsEntityFormValidator extends BaseValidator<CmsEntityValidationInput> {
  public validate(
    input: CmsEntityValidationInput,
  ): ValidationOutcome {
    const { fields, formValues, imageFieldFiles = {} } = input;
    const errors: Record<string, string> = {};

    fields.forEach((field) => {
      const value = formValues[field.key];
      const hasImageFile = Boolean(imageFieldFiles[field.key]);
      const isImageField = /image|thumbnail|hero|banner/i.test(field.key);
      if (field.required) {
        if (field.type === "multi-select") {
          if (!Array.isArray(value) || value.length === 0) {
            errors[field.key] = `${field.label} is required.`;
          }
        } else if (
          field.type !== "switch" &&
          String(value ?? "").trim().length === 0 &&
          !(isImageField && field.type === "url" && hasImageFile)
        ) {
          errors[field.key] = `${field.label} is required.`;
        }
      }

      if (field.type === "number" && String(value ?? "").trim().length > 0) {
        if (Number.isNaN(Number(value))) {
          errors[field.key] = `${field.label} must be a valid number.`;
        }
      }

      if (
        field.type === "url" &&
        String(value ?? "").trim().length > 0 &&
        !(isImageField && hasImageFile)
      ) {
        const isValidUrl = /^https?:\/\//i.test(String(value).trim());
        if (!isValidUrl) {
          errors[field.key] = `${field.label} must start with http:// or https://`;
        }
      }
    });

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  }
}

export type { CmsEntityValidationInput };
export { CmsEntityFormValidator };
