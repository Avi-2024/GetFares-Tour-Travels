import type { CmsTableCell } from "./cms-table-cell.model";

class CmsTableRow {
  public readonly id: string;
  public readonly cells: Record<string, CmsTableCell>;

  constructor(id: string, cells: Record<string, CmsTableCell>) {
    this.id = id;
    this.cells = cells;
  }
}

export { CmsTableRow };
