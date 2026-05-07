import { Component, type ReactNode } from "react";
import { ClassName } from "../../../lib/cn";
import ModalComponent, { type ModalSize } from "../../../shared/components/modal.component";
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
  private mapSize(size: CmsModalSize): ModalSize {
    if (size === "2xl") {
      return "sm";
    }
    if (size === "5xl") {
      return "md";
    }
    return "lg";
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
    const canClose = !isSubmitting;

    return (
      <ModalComponent
        isOpen={isOpen}
        onClose={canClose ? onCancel : () => undefined}
        title={title}
        description={description}
        size={this.mapSize(size)}
        closeOnBackdrop={canClose}
        closeOnEsc={canClose}
        footer={
          showFooter ?
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              {showCancel && (
                <button
                  type="button"
                  onClick={onCancel}
                  disabled={isSubmitting}
                  className="modal-btn-secondary"
                >
                  {cancelLabel}
                </button>
              )}
              <button
                type="button"
                onClick={onConfirm}
                disabled={!onConfirm || isSubmitting || confirmDisabled}
                className={ClassName.merge(
                  "modal-btn-primary",
                  confirmTone === "danger" &&
                    "bg-[color-mix(in_srgb,var(--danger)_88%,black_4%)] shadow-[0_12px_32px_color-mix(in_srgb,var(--danger)_32%,transparent)]",
                )}
              >
                {isSubmitting ? "Saving..." : confirmLabel}
              </button>
            </div>
          : undefined
        }
      >
        {children}
      </ModalComponent>
    );
  }
}

export default CmsModalShellComponent;
