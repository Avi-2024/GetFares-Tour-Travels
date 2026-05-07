import type { CmsSectionKey } from "./cms-section-key.type";
import type { CmsMetricItem } from "./cms-metric-item.model";
import type { CmsFilterChip } from "./cms-filter-chip.model";
import type { CmsTableColumn } from "./cms-table-column.model";
import type { CmsTableRow } from "./cms-table-row.model";
import type { CmsInsightCard } from "./cms-insight-card.model";
import type { CmsUploadBox } from "./cms-upload-box.model";

class CmsSectionViewModel {
  public readonly key: CmsSectionKey;
  public readonly badge: string;
  public readonly title: string;
  public readonly subtitle: string;
  public readonly actionLabel: string;
  public readonly metrics: CmsMetricItem[];
  public readonly filterChips: CmsFilterChip[];
  public readonly columns: CmsTableColumn[];
  public readonly rows: CmsTableRow[];
  public readonly insights: CmsInsightCard[];
  public readonly uploadBox: CmsUploadBox;
  public readonly emptyStateTitle: string;
  public readonly emptyStateDescription: string;

  constructor(
    key: CmsSectionKey,
    badge: string,
    title: string,
    subtitle: string,
    actionLabel: string,
    metrics: CmsMetricItem[],
    filterChips: CmsFilterChip[],
    columns: CmsTableColumn[],
    rows: CmsTableRow[],
    insights: CmsInsightCard[],
    uploadBox: CmsUploadBox,
    emptyStateTitle: string,
    emptyStateDescription: string,
  ) {
    this.key = key;
    this.badge = badge;
    this.title = title;
    this.subtitle = subtitle;
    this.actionLabel = actionLabel;
    this.metrics = metrics;
    this.filterChips = filterChips;
    this.columns = columns;
    this.rows = rows;
    this.insights = insights;
    this.uploadBox = uploadBox;
    this.emptyStateTitle = emptyStateTitle;
    this.emptyStateDescription = emptyStateDescription;
  }
}

export { CmsSectionViewModel };
