import type { CmsTableCellTone } from "../models/cms-table-cell-tone.type";

class CmsTableToneResolver {
  public getToneClass(tone: CmsTableCellTone): string {
    switch (tone) {
      case "success":
        return "bg-[color-mix(in_srgb,var(--success)_18%,transparent)] text-[var(--success)]";
      case "warning":
        return "bg-[color-mix(in_srgb,var(--warning)_16%,transparent)] text-[var(--warning)]";
      case "info":
        return "bg-[color-mix(in_srgb,var(--primary)_16%,transparent)] text-[var(--primary)]";
      default:
        return "text-[var(--text-secondary)]";
    }
  }
}

export { CmsTableToneResolver };
