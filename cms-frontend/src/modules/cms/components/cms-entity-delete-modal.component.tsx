import { Component } from "react";
import CmsModalShellComponent from "./cms-modal-shell.component";

interface CmsEntityDeleteModalProps {
  isOpen: boolean;
  sectionTitle: string;
  recordLabel: string;
  isSubmitting: boolean;
  errorMessage: string;
  mode?: "soft" | "hard";
  onCancel: () => void;
  onConfirm: () => void;
}

class CmsEntityDeleteModalComponent extends Component<CmsEntityDeleteModalProps> {
  render() {
    const { isOpen, sectionTitle, recordLabel, isSubmitting, errorMessage, onCancel, onConfirm } =
      this.props;
    const mode = this.props.mode ?? "soft";
    const isHardDelete = mode === "hard";

    return (
      <CmsModalShellComponent
        isOpen={isOpen}
        title={
          isHardDelete ?
            "Permanently Delete Record?"
          : `Move ${sectionTitle} Record To Trash`
        }
        description={
          isHardDelete ?
            "This action cannot be undone. The record will be removed from the database permanently."
          : `You are about to move "${recordLabel}" to trash.`
        }
        size="2xl"
        confirmLabel={isHardDelete ? "Permanently Delete" : "Move To Trash"}
        confirmTone="danger"
        isSubmitting={isSubmitting}
        onConfirm={onConfirm}
        onCancel={onCancel}
      >
        <div className="space-y-3">
          <div className="rounded-2xl border border-[color-mix(in_srgb,var(--danger)_35%,transparent)] bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] px-4 py-3 text-sm text-[var(--text-secondary)]">
            {isHardDelete ?
              "Record will be deleted from database permanently."
            : "Record will be hidden from normal module tables and moved to Deleted Objects."}
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
