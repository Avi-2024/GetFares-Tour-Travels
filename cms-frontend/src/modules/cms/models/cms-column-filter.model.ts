type UniversalFilterColumnType = "string" | "enum";

interface UniversalFilterColumn {
  key: string;
  label: string;
  type: UniversalFilterColumnType;
}

interface UniversalFilterToken {
  key: string;
  value: string;
}

interface UniversalFilterSuggestion {
  key: string;
  value: string;
  label: string;
}

type UniversalFilterIndex = Record<string, string[]>;

export type {
  UniversalFilterColumnType,
  UniversalFilterColumn,
  UniversalFilterToken,
  UniversalFilterSuggestion,
  UniversalFilterIndex,
};
