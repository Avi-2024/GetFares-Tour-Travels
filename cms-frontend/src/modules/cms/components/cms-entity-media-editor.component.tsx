import { Component, type ChangeEvent } from "react";
import { ArrowDown, ArrowUp, ImagePlus, Star, Trash2, Upload } from "lucide-react";

interface CmsEntityMediaEditorItem {
  id: string | null;
  clientId: string;
  mediaUrl: string;
  thumbnailUrl: string;
  title: string;
  altText: string;
  isPrimary: boolean;
}

interface CmsEntityMediaEditorProps {
  mediaItems: CmsEntityMediaEditorItem[];
  mediaUrlDraft: string;
  mediaTitleDraft: string;
  mediaAltDraft: string;
  mediaErrorMessage: string;
  mediaInfoMessage?: string;
  isMediaUploading?: boolean;
  onMediaUrlDraftChange: (value: string) => void;
  onMediaTitleDraftChange: (value: string) => void;
  onMediaAltDraftChange: (value: string) => void;
  onUploadMedia: (file: File) => Promise<void> | void;
  onAddMedia: () => void;
  onSetCoverMedia: (clientId: string) => void;
  onMoveMediaUp: (index: number) => void;
  onMoveMediaDown: (index: number) => void;
  onRemoveMedia: (item: CmsEntityMediaEditorItem) => void;
}

class CmsEntityMediaEditorComponent extends Component<CmsEntityMediaEditorProps> {
  private handleFileChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    if (file) {
      void this.props.onUploadMedia(file);
    }
    event.currentTarget.value = "";
  };

  render() {
    const {
      mediaItems,
      mediaUrlDraft,
      mediaTitleDraft,
      mediaAltDraft,
      mediaErrorMessage,
      mediaInfoMessage,
      isMediaUploading = false,
      onMediaUrlDraftChange,
      onMediaTitleDraftChange,
      onMediaAltDraftChange,
      onAddMedia,
      onSetCoverMedia,
      onMoveMediaUp,
      onMoveMediaDown,
      onRemoveMedia,
    } = this.props;

    return (
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <h4 className="text-sm font-semibold text-[var(--text-primary)]">Media</h4>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-xs font-semibold text-[var(--text-primary)] transition hover:bg-[var(--background-soft)]">
            <Upload size={13} />
            {isMediaUploading ? "Uploading..." : "Upload Image"}
            <input
              type="file"
              accept="image/*"
              onChange={this.handleFileChange}
              disabled={isMediaUploading}
              className="hidden"
            />
          </label>
          <p className="text-xs text-[var(--text-secondary)]">
            Upload a local image, or paste a media URL manually.
          </p>
        </div>

        <div className="mt-3 grid gap-2 md:grid-cols-[1.5fr_1fr_1fr_auto]">
          <input
            type="url"
            value={mediaUrlDraft}
            onChange={(event) => onMediaUrlDraftChange(event.target.value)}
            placeholder="https://..."
            className="h-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text-primary)]"
          />
          <input
            type="text"
            value={mediaTitleDraft}
            onChange={(event) => onMediaTitleDraftChange(event.target.value)}
            placeholder="Filename"
            className="h-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text-primary)]"
          />
          <input
            type="text"
            value={mediaAltDraft}
            onChange={(event) => onMediaAltDraftChange(event.target.value)}
            placeholder="Alt text"
            className="h-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text-primary)]"
          />
          <button
            type="button"
            onClick={onAddMedia}
            disabled={isMediaUploading}
            className="inline-flex h-10 items-center justify-center gap-1 rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] px-3 text-xs font-semibold text-white"
          >
            <ImagePlus size={13} />
            Add
          </button>
        </div>

        {mediaInfoMessage && !mediaErrorMessage && (
          <p className="mt-2 text-xs text-[var(--success)]">{mediaInfoMessage}</p>
        )}

        {mediaErrorMessage && (
          <p className="mt-2 text-xs text-[var(--danger)]">{mediaErrorMessage}</p>
        )}

        <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {mediaItems.map((item, index) => (
            <div key={item.clientId} className="rounded-2xl border border-[var(--border)] p-2">
              <img
                src={item.thumbnailUrl || item.mediaUrl}
                alt={item.altText || item.title || "Media"}
                className="h-24 w-full rounded-xl object-cover"
              />
              <div className="mt-2 flex items-center justify-between text-xs text-[var(--text-secondary)]">
                <span>#{index + 1}</span>
                {item.isPrimary && (
                  <span className="inline-flex items-center gap-1 text-[var(--success)]">
                    <Star size={11} />
                    Cover
                  </span>
                )}
              </div>
              <div className="mt-2 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onSetCoverMedia(item.clientId)}
                  className="inline-flex h-8 items-center justify-center rounded-lg border border-[var(--border)] px-2 text-xs text-[var(--text-secondary)]"
                >
                  Cover
                </button>
                <button
                  type="button"
                  onClick={() => onMoveMediaUp(index)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--text-secondary)]"
                >
                  <ArrowUp size={11} />
                </button>
                <button
                  type="button"
                  onClick={() => onMoveMediaDown(index)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--text-secondary)]"
                >
                  <ArrowDown size={11} />
                </button>
                <button
                  type="button"
                  onClick={() => onRemoveMedia(item)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[color-mix(in_srgb,var(--danger)_35%,transparent)] text-[var(--danger)]"
                >
                  <Trash2 size={11} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }
}

export type { CmsEntityMediaEditorItem };
export default CmsEntityMediaEditorComponent;
