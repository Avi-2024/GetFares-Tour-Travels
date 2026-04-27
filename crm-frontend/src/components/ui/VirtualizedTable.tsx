import React, { useMemo, useState } from "react";

type Column = {
  key: string;
  label: string;
  width?: string;
  align?: "left" | "center" | "right";
};

type VirtualizedTableProps<T> = {
  columns: Column[];
  rows: T[];
  rowHeight?: number;
  height?: number;
  headerHeight?: number;
  overscan?: number;
  renderRow: (row: T, index: number) => React.ReactNode;
};

const alignClassMap = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
} as const;

function VirtualizedTable<T>({
  columns,
  rows,
  rowHeight = 88,
  height = 560,
  headerHeight = 48,
  overscan = 4,
  renderRow,
}: VirtualizedTableProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const totalHeight = rows.length * rowHeight;
  const effectiveScrollTop = Math.max(0, scrollTop - headerHeight);
  const bodyViewportHeight = Math.max(0, height - headerHeight);
  const gridTemplateColumns = columns.map((column) => column.width || "1fr").join(" ");

  const { startIndex, visibleRows } = useMemo(() => {
    const start = Math.max(0, Math.floor(effectiveScrollTop / rowHeight) - overscan);
    const end = Math.min(
      rows.length,
      Math.ceil((effectiveScrollTop + bodyViewportHeight) / rowHeight) + overscan,
    );
    return {
      startIndex: start,
      visibleRows: rows.slice(start, end),
    };
  }, [bodyViewportHeight, effectiveScrollTop, overscan, rowHeight, rows]);

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
      <div
        className="overflow-y-auto bg-white dark:bg-gray-900"
        style={{ height }}
        onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
      >
        <div style={{ height: headerHeight + totalHeight, position: "relative" }}>
          <div
            className="sticky top-0 z-10 grid border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase tracking-wider text-gray-600 dark:border-gray-800 dark:bg-gray-800/50 dark:text-gray-400"
            style={{
              gridTemplateColumns,
              height: headerHeight,
              width: "max-content",
              minWidth: "100%",
            }}
          >
            {columns.map((column) => (
              <div
                key={column.key}
                className={`px-3 py-3.5 ${alignClassMap[column.align || "left"]}`}
              >
                {column.label}
              </div>
            ))}
          </div>
          {visibleRows.map((row, index) => {
            const absoluteIndex = startIndex + index;
            return (
              <div
                key={absoluteIndex}
                style={{
                  position: "absolute",
                  top: headerHeight + absoluteIndex * rowHeight,
                  left: 0,
                  height: rowHeight,
                  width: "max-content",
                  minWidth: "100%",
                }}
              >
                {renderRow(row, absoluteIndex)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default VirtualizedTable;
