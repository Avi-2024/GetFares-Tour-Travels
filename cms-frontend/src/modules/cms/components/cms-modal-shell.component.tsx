import { Component, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { CmsModalSize } from "../cms-entity-form.catalog";

interface CmsModalShellProps {
  isOpen: boolean;
  title: string;
  description?: string;
  size: CmsModalSize;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmTone?: "primary" | "danger";
  isSubmitting?: boolean;
  confirmDisabled?: boolean;
  showFooter?: boolean;
  showCancel?: boolean;
  onConfirm?: () => void;
  onCancel: () => void;
  children: ReactNode;
}

class CmsModalShellComponent extends Component<CmsModalShellProps> {
  private handleEscape = (event: KeyboardEvent): void => {
    const { isOpen, isSubmitting = false, onCancel } = this.props;
    if (event.key === "Escape" && isOpen && !isSubmitting) {
      onCancel();
    }
  };

  componentDidMount(): void {
    if (typeof window !== "undefined") {
      window.addEventListener("keydown", this.handleEscape);
    }
    this.lockBody(this.props.isOpen);
  }

  componentDidUpdate(previousProps: CmsModalShellProps): void {
    if (previousProps.isOpen !== this.props.isOpen) {
      this.lockBody(this.props.isOpen);
    }
  }

  componentWillUnmount(): void {
    if (typeof window !== "undefined") {
      window.removeEventListener("keydown", this.handleEscape);
    }
    this.lockBody(false);
  }

  private lockBody(shouldLock: boolean): void {
    if (typeof document === "undefined") {
      return;
    }
    document.body.style.overflow = shouldLock ? "hidden" : "";
  }

  private sizeClass(size: CmsModalSize): string {
    if (size === "2xl") {
      return "max-w-2xl";
    }
    if (size === "4xl") {
      return "max-w-4xl";
    }
    return "max-w-5xl";
  }

  render() {
    const {
      isOpen,
      title,
      description,
      size,
      confirmLabel = "Save",
      cancelLabel = "Cancel",
      confirmTone = "primary",
      isSubmitting = false,
      confirmDisabled = false,
      showFooter = true,
      showCancel = true,
      onConfirm,
      onCancel,
      children,
    } = this.props;

    return (
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-3 sm:p-6">
            <motion.button
              type="button"
              aria-label="Close modal overlay"
              className="absolute inset-0 cursor-default bg-[color-mix(in_srgb,#020617_62%,transparent)] backdrop-blur-[8px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              onClick={isSubmitting ? undefined : onCancel}
            />

            <motion.section
              role="dialog"
              aria-modal="true"
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 10 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className={`relative z-10 w-full overflow-hidden rounded-3xl border border-[color-mix(in_srgb,var(--primary)_22%,var(--border))] bg-[color-mix(in_srgb,var(--surface)_84%,transparent)] shadow-[0_45px_130px_rgba(2,6,23,0.5)] backdrop-blur-2xl ${this.sizeClass(size)}`}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="pointer-events-none absolute inset-0 opacity-80">
                <div className="absolute -right-24 -bottom-24 h-72 w-72 rounded-full bg-[radial-gradient(circle_at_center,color-mix(in_srgb,var(--accent)_52%,transparent)_0%,color-mix(in_srgb,var(--primary)_28%,transparent)_48%,transparent_76%)] blur-xl" />
              </div>

              <motion.header
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05, duration: 0.2 }}
                className="relative border-b border-[var(--border)] px-5 py-4 sm:px-7"
              >
                <h2 className="font-display text-xl font-semibold text-[var(--text-primary)]">
                  {title}
                </h2>
                {description && (
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">
                    {description}
                  </p>
                )}
              </motion.header>

              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.09, duration: 0.2 }}
                className="relative max-h-[72vh] overflow-y-auto px-5 py-5 sm:px-7"
              >
                {children}
              </motion.div>

              {showFooter && (
                <motion.footer
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.12, duration: 0.2 }}
                  className="sticky bottom-0 z-20 flex items-center justify-end gap-2 border-t border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] px-5 py-4 backdrop-blur-xl sm:px-7"
                >
                  {showCancel && (
                    <button
                      type="button"
                      onClick={onCancel}
                      disabled={isSubmitting}
                      className="inline-flex h-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 text-sm font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--background-soft)] disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {cancelLabel}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={onConfirm}
                    disabled={!onConfirm || isSubmitting || confirmDisabled}
                    className={`inline-flex h-10 min-w-[132px] items-center justify-center rounded-xl px-4 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-65 ${
                      confirmTone === "danger" ?
                        "bg-[color-mix(in_srgb,var(--danger)_88%,black_4%)] shadow-[0_10px_30px_color-mix(in_srgb,var(--danger)_32%,transparent)]"
                      : "bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] shadow-[0_12px_34px_color-mix(in_srgb,var(--primary)_36%,transparent)]"
                    }`}
                  >
                    {isSubmitting ? "Saving..." : confirmLabel}
                  </button>
                </motion.footer>
              )}
            </motion.section>
          </div>
        )}
      </AnimatePresence>
    );
  }
}

export default CmsModalShellComponent;
