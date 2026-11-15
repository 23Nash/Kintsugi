import type { CSSProperties, ReactNode } from "react";
import "./Table.css";

export type Column<T> = {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  /** Right-aligned with tabular numbers: counts, run time, memory, dates. */
  numeric?: boolean;
  /** Monospace: problem IDs, code. */
  mono?: boolean;
  /** CSS width, e.g. "8rem" or "20%". */
  width?: string;
};

export type TableProps<T> = {
  columns: readonly Column<T>[];
  rows: readonly T[];
  rowKey: (row: T) => string;
  /** Names the table. Visually hidden unless showCaption. */
  caption: string;
  showCaption?: boolean;
  zebra?: boolean;
  /** Scroll inside the table with a sticky header, e.g. "24rem". */
  maxHeight?: string;
  /** Row key to highlight. */
  selectedKey?: string;
  /** Shown in place of rows when rows is empty. */
  empty?: ReactNode;
};

function cellClass(column: { numeric?: boolean; mono?: boolean }) {
  const classes = ["ui-table__cell"];
  if (column.numeric) classes.push("ui-table__cell--numeric");
  if (column.mono) classes.push("ui-table__cell--mono");
  return classes.join(" ");
}

export function Table<T>({
  columns,
  rows,
  rowKey,
  caption,
  showCaption = false,
  zebra = false,
  maxHeight,
  selectedKey,
  empty,
}: TableProps<T>) {
  const scrolls = maxHeight !== undefined;
  const style: CSSProperties | undefined = scrolls ? { maxHeight } : undefined;
  const tableClass = zebra ? "ui-table ui-table--zebra" : "ui-table";

  return (
    <div
      className="ui-table-wrap"
      style={style}
      // A scrolling region must be reachable by keyboard to scroll it.
      tabIndex={scrolls ? 0 : undefined}
      role={scrolls ? "region" : undefined}
      aria-label={scrolls ? caption : undefined}
    >
      <table className={tableClass}>
        <caption
          className={showCaption ? "ui-table__caption" : "ui-visually-hidden"}
        >
          {caption}
        </caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={cellClass({ numeric: column.numeric })}
                style={column.width ? { width: column.width } : undefined}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && empty !== undefined ? (
            <tr>
              <td colSpan={columns.length} className="ui-table__empty">
                {empty}
              </td>
            </tr>
          ) : (
            rows.map((row) => {
              const key = rowKey(row);
              const selected = key === selectedKey;
              return (
                <tr
                  key={key}
                  className={selected ? "ui-table__row--selected" : undefined}
                  data-selected={selected || undefined}
                >
                  {columns.map((column) => (
                    <td key={column.key} className={cellClass(column)}>
                      {column.cell(row)}
                    </td>
                  ))}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
