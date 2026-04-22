import { toast } from "sonner";
import { getApiErrorMessage } from "../api/apiClient";

/** Maps API failures to a user-facing string, optional inline state, and always shows a toast. */
export function reportApiError(
  err: unknown,
  fallback: string,
  setMessage?: (message: string) => void,
): string {
  const message = getApiErrorMessage(err, fallback);
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
