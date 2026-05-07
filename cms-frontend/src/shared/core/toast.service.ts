type ToastTone = "success" | "error" | "info" | "warning";

interface ToastPayload {
  id: string;
  tone: ToastTone;
  message: string;
  durationMs: number;
}

const TOAST_EVENT_NAME = "cms-toast";

class ToastService {
  private static dispatch(tone: ToastTone, message: string, durationMs = 3200): void {
    if (typeof window === "undefined") {
      return;
    }

    const payload: ToastPayload = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      tone,
      message,
      durationMs,
    };

    window.dispatchEvent(
      new CustomEvent<ToastPayload>(TOAST_EVENT_NAME, { detail: payload }),
    );
  }

  public static success(message: string, durationMs?: number): void {
    this.dispatch("success", message, durationMs);
  }

  public static error(message: string, durationMs?: number): void {
    this.dispatch("error", message, durationMs);
  }

  public static info(message: string, durationMs?: number): void {
    this.dispatch("info", message, durationMs);
  }

  public static warning(message: string, durationMs?: number): void {
    this.dispatch("warning", message, durationMs);
  }

  public static eventName(): string {
    return TOAST_EVENT_NAME;
  }
}

export type { ToastPayload, ToastTone };
export { ToastService };
