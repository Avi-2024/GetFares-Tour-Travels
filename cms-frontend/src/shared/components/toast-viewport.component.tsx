import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { ToastPayload, ToastTone } from "../core/toast.service";
import { ToastService } from "../core/toast.service";

interface ToastRecord extends ToastPayload {}

const toneClassMap: Record<ToastTone, string> = {
  success:
    "border-[color-mix(in_srgb,var(--success)_35%,transparent)] bg-[color-mix(in_srgb,var(--success)_14%,var(--surface)_86%)] text-[var(--text-primary)]",
  error:
    "border-[color-mix(in_srgb,var(--danger)_35%,transparent)] bg-[color-mix(in_srgb,var(--danger)_12%,var(--surface)_88%)] text-[var(--text-primary)]",
  info:
    "border-[color-mix(in_srgb,var(--primary)_30%,transparent)] bg-[color-mix(in_srgb,var(--primary)_10%,var(--surface)_90%)] text-[var(--text-primary)]",
  warning:
    "border-[color-mix(in_srgb,var(--warning)_35%,transparent)] bg-[color-mix(in_srgb,var(--warning)_14%,var(--surface)_86%)] text-[var(--text-primary)]",
};

const ToastViewportComponent = () => {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const handleToastEvent = (event: Event): void => {
      const customEvent = event as CustomEvent<ToastPayload>;
      if (!customEvent.detail) {
        return;
      }

      const payload = customEvent.detail;
      setToasts((prev) => [...prev, payload]);

      window.setTimeout(() => {
        setToasts((prev) => prev.filter((toast) => toast.id !== payload.id));
      }, payload.durationMs);
    };

    const eventName = ToastService.eventName();
    window.addEventListener(eventName, handleToastEvent as EventListener);
    return () => window.removeEventListener(eventName, handleToastEvent as EventListener);
  }, []);

  const renderToasts = useMemo(
    () =>
      toasts.map((toast) => (
        <motion.div
          key={toast.id}
          initial={{ opacity: 0, y: -10, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.98 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className={`pointer-events-auto w-[min(92vw,360px)] rounded-xl border px-4 py-3 text-sm shadow-[0_10px_28px_color-mix(in_srgb,var(--text-primary)_16%,transparent)] backdrop-blur-md ${toneClassMap[toast.tone]}`}
        >
          {toast.message}
        </motion.div>
      )),
    [toasts],
  );

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[99999] flex flex-col gap-2">
      <AnimatePresence>{renderToasts}</AnimatePresence>
    </div>
  );
};

export default ToastViewportComponent;
