type CmsSectionKey =
  | "landing-places"
  | "destinations"
  | "published-packages"
  | "main-packages"
  | "sub-packages"
  | "visa-destinations"
  | "visa-details"
  | "creative-toolkit"
  | "destination-map";

type CmsMetricTone = "primary" | "accent" | "success" | "warning" | "neutral";
type CmsTableCellTone = "default" | "success" | "warning" | "info";

class CmsMetricItem {
  public readonly label: string;
  public readonly value: string;
  public readonly change: string;
  public readonly tone: CmsMetricTone;

  constructor(
    label: string,
    value: string,
    change: string,
    tone: CmsMetricTone = "neutral",
  ) {
    this.label = label;
    this.value = value;
    this.change = change;
    this.tone = tone;
  }
}

class CmsFilterChip {
  public readonly label: string;

  constructor(label: string) {
    this.label = label;
  }
}

class CmsTableColumn {
  public readonly key: string;
  public readonly label: string;
  public readonly isHighlighted: boolean;

  constructor(key: string, label: string, isHighlighted: boolean = false) {
    this.key = key;
    this.label = label;
    this.isHighlighted = isHighlighted;
  }
}

class CmsTableCell {
  public readonly value: string;
  public readonly tone: CmsTableCellTone;

  constructor(value: string, tone: CmsTableCellTone = "default") {
    this.value = value;
    this.tone = tone;
  }
}

class CmsTableRow {
  public readonly id: string;
  public readonly cells: Record<string, CmsTableCell>;

  constructor(id: string, cells: Record<string, CmsTableCell>) {
    this.id = id;
    this.cells = cells;
  }
}

class CmsInsightCard {
  public readonly title: string;
  public readonly description: string;
  public readonly bullets: string[];

  constructor(title: string, description: string, bullets: string[]) {
    this.title = title;
    this.description = description;
    this.bullets = bullets;
  }
}

class CmsUploadBox {
  public readonly title: string;
  public readonly hint: string;
  public readonly buttonLabel: string;

  constructor(title: string, hint: string, buttonLabel: string) {
    this.title = title;
    this.hint = hint;
    this.buttonLabel = buttonLabel;
  }
}

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

export type { CmsSectionKey, CmsMetricTone, CmsTableCellTone };
export {
  CmsMetricItem,
  CmsFilterChip,
  CmsTableColumn,
  CmsTableCell,
  CmsTableRow,
  CmsInsightCard,
  CmsUploadBox,
  CmsSectionViewModel,
};
