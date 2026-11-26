import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Table, type Column } from "./Table";

afterEach(cleanup);

type Row = { id: string; problem: string; runtimeMs: number };

const rows: Row[] = [
  { id: "1", problem: "1934D2", runtimeMs: 312 },
  { id: "2", problem: "abc345_e", runtimeMs: 46 },
];

const columns: Column<Row>[] = [
  { key: "problem", header: "Problem", cell: (r) => r.problem, mono: true },
  {
    key: "time",
    header: "Time",
    cell: (r) => `${r.runtimeMs} ms`,
    numeric: true,
  },
];

describe("Table", () => {
  it("renders a captioned table with column headers and rows", () => {
    render(
      <Table
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        caption="Submissions"
      />,
    );
    const table = screen.getByRole("table", { name: "Submissions" });
    const headers = within(table).getAllByRole("columnheader");
    expect(headers.map((h) => h.textContent)).toEqual(["Problem", "Time"]);
    expect(within(table).getAllByRole("row")).toHaveLength(3);
  });

  it("right-aligns numeric columns and sets mono cells", () => {
    render(
      <Table
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        caption="Submissions"
      />,
    );
    const time = screen.getByText("312 ms");
    expect(time.className).toContain("ui-table__cell--numeric");
    expect(
      screen.getByRole("columnheader", { name: "Time" }).className,
    ).toContain("ui-table__cell--numeric");
    expect(screen.getByText("1934D2").className).toContain(
      "ui-table__cell--mono",
    );
  });

  it("marks the selected row and applies zebra", () => {
    const { container } = render(
      <Table
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        caption="Submissions"
        zebra
        selectedKey="2"
      />,
    );
    expect(container.querySelector("table")?.className).toBe(
      "ui-table ui-table--zebra",
    );
    const selected = container.querySelector("tr[data-selected]");
    expect(selected?.textContent).toContain("abc345_e");
  });

  it("shows the empty slot across all columns when there are no rows", () => {
    render(
      <Table
        columns={columns}
        rows={[]}
        rowKey={(r) => r.id}
        caption="Submissions"
        empty="No submissions yet"
      />,
    );
    const cell = screen.getByText("No submissions yet");
    expect(cell.getAttribute("colspan")).toBe("2");
  });

  it("is a focusable named region only when it scrolls", () => {
    const { rerender } = render(
      <Table
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        caption="Submissions"
      />,
    );
    expect(screen.queryByRole("region")).toBeNull();

    rerender(
      <Table
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        caption="Submissions"
        maxHeight="10rem"
      />,
    );
    const region = screen.getByRole("region", { name: "Submissions" });
    expect(region.getAttribute("tabindex")).toBe("0");
    expect(region.style.maxHeight).toBe("10rem");
  });
});
