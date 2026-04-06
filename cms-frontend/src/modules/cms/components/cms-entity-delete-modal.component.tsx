import { Component } from "react";
import CmsModalShellComponent from "./cms-modal-shell.component";

interface CmsEntityDeleteModalProps {
  isOpen: boolean;
  sectionTitle: string;
  recordLabel: string;
  isSubmitting: boolean;
  errorMessage: string;
  onCancel: () => void;
  onConfirm: () => void;
}

class CmsEntityDeleteModalComponent extends Component<CmsEntityDeleteModalProps> {
  render() {
    const { isOpen, sectionTitle, recordLabel, isSubmitting, errorMessage, onCancel, onConfirm } =
      this.props;

    return (
      <CmsModalShellComponent
        isOpen={isOpen}
        title={`Delete ${sectionTitle} Record`}
        description={`You are about to delete "${recordLabel}". This action cannot be undone.`}
        size="2xl"
        confirmLabel="Delete Record"
        confirmTone="danger"
        isSubmitting={isSubmitting}
        onConfirm={onConfirm}
        onCancel={onCancel}
      >
        <div className="space-y-3">
          <div className="rounded-2xl border border-[color-mix(in_srgb,var(--danger)_35%,transparent)] bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] px-4 py-3 text-sm text-[var(--text-secondary)]">
            This will remove the selected content and related references from the CMS listing.
          </div>
          {errorMessage && (
            <div className="rounded-xl border border-[color-mix(in_srgb,var(--danger)_35%,transparent)] bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] px-3 py-2 text-sm text-[var(--danger)]">
              {errorMessage}
            </div>
          )}
        </div>
      </CmsModalShellComponent>
    );
  }
}

export default CmsEntityDeleteModalComponent;
