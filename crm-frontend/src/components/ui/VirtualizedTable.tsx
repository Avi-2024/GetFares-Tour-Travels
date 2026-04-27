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
  overscan = 4,
  renderRow,
}: VirtualizedTableProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const totalHeight = rows.length * rowHeight;

  const { startIndex, endIndex, visibleRows } = useMemo(() => {
    const start = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
    const end = Math.min(
      rows.length,
      Math.ceil((scrollTop + height) / rowHeight) + overscan,
    );
    return {
      startIndex: start,
      endIndex: end,
      visibleRows: rows.slice(start, end),
    };
  }, [height, overscan, rowHeight, rows, scrollTop]);

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
      <div
        className="grid border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase tracking-wider text-gray-600 dark:border-gray-800 dark:bg-gray-800/50 dark:text-gray-400"
        style={{ gridTemplateColumns: columns.map((column) => column.width || "1fr").join(" ") }}
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
      <div
        className="overflow-y-auto bg-white dark:bg-gray-900"
        style={{ height }}
        onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
      >
        <div style={{ height: totalHeight, position: "relative" }}>
          {visibleRows.map((row, index) => {
            const absoluteIndex = startIndex + index;
            return (
              <div
                key={absoluteIndex}
                style={{
                  position: "absolute",
                  top: absoluteIndex * rowHeight,
                  left: 0,
                  right: 0,
                  height: rowHeight,
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
