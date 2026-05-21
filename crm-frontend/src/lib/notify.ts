import { toast } from "sonner";
import { getApiErrorMessage, isApiError } from "../api/apiClient";
import {
  formatFieldErrorsForToast,
  formatValidationErrorMessage,
  extractValidationDetails,
  mapValidationFieldErrors,
  isValidationErrorPayload,
} from "./validationErrors";

/** Maps API failures to a user-facing string, optional inline state, and always shows a toast. */
export function reportApiError(
  err: unknown,
  fallback: string,
  setMessage?: (message: string) => void,
): string {
  let message = getApiErrorMessage(err, fallback);

  if (
    isApiError(err) &&
    (message === "Validation failed" || message === fallback) &&
    err.details &&
    isValidationErrorPayload(err.details)
  ) {
    const fieldErrors = mapValidationFieldErrors(
      extractValidationDetails(err.details),
    );
    if (Object.keys(fieldErrors).length > 0) {
      message = formatFieldErrorsForToast(fieldErrors);
    } else {
      const validationMessage = formatValidationErrorMessage(
        err.details,
        fallback,
      );
      if (validationMessage && validationMessage !== "Validation failed") {
        message = validationMessage;
      }
    }
  }

  setMessage?.(message);
  toast.error(message);
  return message;
}

/** Shows field-level validation errors in toast + optional inline banner. */
export function reportValidationErrors(
  fieldErrors: Record<string, string>,
  setMessage?: (message: string) => void,
): string {
  const message = formatFieldErrorsForToast(fieldErrors);
  setMessage?.(message);
  toast.error(message);
  return message;
}

export const notify = {
  success: (msg: string) => toast.success(msg),
  error: (msg: string) => toast.error(msg),
  info: (msg: string) => toast.info(msg),
  warning: (msg: string) => toast.warning(msg),
};
