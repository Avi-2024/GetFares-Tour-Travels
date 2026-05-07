import type { CmsTableCellTone } from "./cms-table-cell-tone.type";

class CmsTableCell {
  public readonly value: string;
  public readonly tone: CmsTableCellTone;

  constructor(value: string, tone: CmsTableCellTone = "default") {
    this.value = value;
    this.tone = tone;
  }
}

export { CmsTableCell };
