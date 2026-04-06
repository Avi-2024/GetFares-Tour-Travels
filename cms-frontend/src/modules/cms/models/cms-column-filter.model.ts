type ColumnFilterType = "text" | "dropdown" | "date";
type DateFilterBoundary = "from" | "to";

interface DateRangeFilter {
  from: string;
  to: string;
}

interface ColumnFilterDefinition {
  key: string;
  label: string;
  type: ColumnFilterType;
  options: string[];
}

export type {
  ColumnFilterType,
  DateFilterBoundary,
  DateRangeFilter,
  ColumnFilterDefinition,
};
