import type { CmsTableRow } from "../models/cms-table-row.model";
import type { DeleteMode } from "./delete-mode.type";
import type { JsonRecord } from "./json-record.type";

interface CmsTableEntry {
  id: string;
  row: CmsTableRow;
  raw: JsonRecord;
  updatePath?: string;
  deletePath?: string;
  deleteMode?: DeleteMode;
  editableField?: string;
  readOnly: boolean;
}

export type { CmsTableEntry };
