import { type ReactNode, useEffect, useId, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ClassName } from "../../lib/cn";

type ModalSize = "sm" | "md" | "lg";

interface ModalComponentProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: ModalSize;
  description?: string;
  footer?: ReactNode;
  className?: string;
  contentClassName?: string;
  closeOnBackdrop?: boolean;
  closeOnEsc?: boolean;
}

let openModalCount = 0;

const focusableSelector =
  "a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex='-1'])";

const ModalComponent = ({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
  description,
  footer,
  className,
  contentClassName,
  closeOnBackdrop = true,
  closeOnEsc = true,
}: ModalComponentProps) => {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLElement | null>(null);

  const sizeClass =
    size === "sm" ? "max-w-lg"
    : size === "md" ? "max-w-xl"
    : "max-w-5xl";

  const collectFocusableElements = (): HTMLElement[] => {
    if (!dialogRef.current) {
      return [];
    }

    return Array.from(dialogRef.current.querySelectorAll<HTMLElement>(focusableSelector)).filter(
      (element) => !element.hasAttribute("disabled") && !element.getAttribute("aria-hidden"),
    );
  };

  useEffect(() => {
    if (!isOpen || typeof document === "undefined") {
      return;
    }

    openModalCount += 1;
    document.body.style.overflow = "hidden";

    return () => {
      openModalCount = Math.max(0, openModalCount - 1);
      if (openModalCount === 0) {
        document.body.style.overflow = "auto";
      }
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || typeof document === "undefined" || typeof window === "undefined") {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      const focusables = collectFocusableElements();
      if (focusables.length > 0) {
        focusables[0].focus();
        return;
      }
      dialogRef.current?.focus();
    });

    const handleKeydown = (event: KeyboardEvent): void => {
      if (!dialogRef.current) {
        return;
      }

      if (event.key === "Escape" && closeOnEsc) {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const focusables = collectFocusableElements();
      if (focusables.length === 0) {
        event.preventDefault();
        dialogRef.current.focus();
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const activeElement = document.activeElement as HTMLElement | null;

      if (!activeElement || !dialogRef.current.contains(activeElement)) {
        event.preventDefault();
        first.focus();
        return;
      }

      if (event.shiftKey && activeElement === first) {
        event.preventDefault();
        last.focus();
        return;
      }

      if (!event.shiftKey && activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeydown);

    return () => {
      window.cancelAnimationFrame(frameId);
      document.removeEventListener("keydown", handleKeydown);
    };
  }, [closeOnEsc, isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[150]">
          <motion.div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            onClick={closeOnBackdrop ? onClose : undefined}
          />

          <div className="relative flex min-h-full items-center justify-center p-4 sm:p-6">
            <motion.section
              ref={dialogRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              aria-describedby={description ? descriptionId : undefined}
              tabIndex={-1}
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 10 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className={ClassName.merge(
                "relative z-10 flex w-full flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_95%,transparent)] shadow-2xl",
                sizeClass,
                className,
              )}
              onClick={(event) => event.stopPropagation()}
            >
              <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_96%,transparent)] px-6 py-4 backdrop-blur-xl sm:px-8">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 id={titleId} className="font-display text-xl font-semibold text-[var(--text-primary)]">
                      {title}
                    </h2>
                    {description && (
                      <p id={descriptionId} className="mt-1 text-sm text-[var(--text-secondary)]">
                        {description}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] transition hover:bg-[var(--background-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                    aria-label="Close modal"
                  >
                    <span aria-hidden="true">&times;</span>
                  </button>
                </div>
              </header>

              <div
                className={ClassName.merge(
                  "hide-scrollbar max-h-[70vh] overflow-y-auto px-6 py-5 sm:px-8",
                  contentClassName,
                )}
              >
                {children}
              </div>

              {footer && (
                <footer className="sticky bottom-0 z-20 border-t border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_96%,transparent)] px-6 py-4 backdrop-blur-xl sm:px-8">
                  {footer}
                </footer>
              )}
            </motion.section>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};

export type { ModalSize };
export default ModalComponent;
