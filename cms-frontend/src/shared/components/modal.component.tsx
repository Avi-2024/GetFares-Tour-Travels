import { Component, type ReactNode } from "react";
import { ClassName } from "../../lib/cn";

type ModalConfirmTone = "primary" | "danger";
type ModalWidth = "md" | "lg";

interface ModalComponentProps {
  isOpen: boolean;
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel?: string;
  confirmTone?: ModalConfirmTone;
  isSubmitting?: boolean;
  confirmDisabled?: boolean;
  width?: ModalWidth;
  showCancelButton?: boolean;
  showFooter?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children?: ReactNode;
}

class ModalComponent extends Component<ModalComponentProps> {
  private readonly titleId = "app-modal-title";
  private readonly descriptionId = "app-modal-description";

  private readonly handleEscape = (event: KeyboardEvent): void => {
    const { isOpen, isSubmitting, onCancel } = this.props;
    if (event.key === "Escape" && isOpen && !isSubmitting) {
      onCancel();
    }
  };

  componentDidMount(): void {
    if (typeof window !== "undefined") {
      window.addEventListener("keydown", this.handleEscape);
    }
    this.updateBodyScrollLock(this.props.isOpen);
  }

  componentDidUpdate(previousProps: ModalComponentProps): void {
    if (previousProps.isOpen !== this.props.isOpen) {
      this.updateBodyScrollLock(this.props.isOpen);
    }
  }

  componentWillUnmount(): void {
    if (typeof window !== "undefined") {
      window.removeEventListener("keydown", this.handleEscape);
    }
    this.updateBodyScrollLock(false);
  }

  private updateBodyScrollLock(shouldLock: boolean): void {
    if (typeof document === "undefined") {
      return;
    }
    document.body.style.overflow = shouldLock ? "hidden" : "";
  }

  private getWidthClass(width: ModalWidth): string {
    if (width === "md") {
      return "max-w-xl";
    }
    return "max-w-2xl";
  }

  private getConfirmButtonClass(tone: ModalConfirmTone): string {
    if (tone === "danger") {
      return "bg-[color-mix(in_srgb,var(--danger)_88%,black_4%)] text-white shadow-[0_8px_24px_color-mix(in_srgb,var(--danger)_32%,transparent)] hover:brightness-105 focus-visible:ring-[color-mix(in_srgb,var(--danger)_35%,transparent)]";
    }
    return "bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] text-white shadow-[0_8px_24px_color-mix(in_srgb,var(--primary)_30%,transparent)] hover:brightness-105 focus-visible:ring-[var(--ring)]";
  }

  render() {
    const {
      isOpen,
      title,
      description,
      confirmLabel,
      cancelLabel = "Cancel",
      confirmTone = "primary",
      isSubmitting = false,
      confirmDisabled = false,
      width = "md",
      showCancelButton = true,
      showFooter = true,
      onConfirm,
      onCancel,
      children,
    } = this.props;

    if (!isOpen) {
      return null;
    }

    return (
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6">
        <div
          className="absolute inset-0 bg-[color-mix(in_srgb,#020617_55%,transparent)] backdrop-blur-[7px]"
          role="presentation"
          onClick={isSubmitting ? undefined : onCancel}
        />

        <section
          role="dialog"
          aria-modal="true"
          aria-labelledby={this.titleId}
          aria-describedby={description ? this.descriptionId : undefined}
          className={ClassName.merge(
            "relative z-10 w-full overflow-hidden rounded-[26px] border border-[color-mix(in_srgb,var(--primary)_25%,var(--border))] bg-[color-mix(in_srgb,var(--surface)_96%,transparent)] p-6 shadow-[0_40px_120px_rgba(2,6,23,0.45)] backdrop-blur-xl sm:p-7",
            this.getWidthClass(width),
          )}
          onClick={(event) => event.stopPropagation()}
        >
          <div
            className="pointer-events-none absolute -left-16 -top-14 h-44 w-44 rounded-full bg-[color-mix(in_srgb,var(--primary)_28%,transparent)] blur-3xl"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute -bottom-16 -right-14 h-44 w-44 rounded-full bg-[color-mix(in_srgb,var(--accent)_30%,transparent)] blur-3xl"
            aria-hidden="true"
          />

          <header className="relative mb-4">
            <h2
              id={this.titleId}
              className="font-display text-xl font-semibold tracking-[-0.02em] text-[var(--text-primary)]"
            >
              {title}
            </h2>
            {description && (
              <p
                id={this.descriptionId}
                className="mt-1 text-sm text-[var(--text-secondary)]"
              >
                {description}
              </p>
            )}
          </header>

          {children && <div className="relative">{children}</div>}

          {showFooter && (
            <footer className="relative mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              {showCancelButton && (
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
                disabled={isSubmitting || confirmDisabled}
                className={ClassName.merge(
                  "inline-flex h-10 min-w-[120px] items-center justify-center rounded-xl px-4 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)] disabled:cursor-not-allowed disabled:opacity-70",
                  this.getConfirmButtonClass(confirmTone),
                )}
              >
                {isSubmitting ? "Working..." : confirmLabel}
              </button>
            </footer>
          )}
        </section>
      </div>
    );
  }
}

export type { ModalConfirmTone, ModalWidth };
export default ModalComponent;
