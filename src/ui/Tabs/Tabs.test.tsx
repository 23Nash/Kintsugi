import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Tabs, type TabItem } from "./Tabs";

afterEach(cleanup);

const items: TabItem[] = [
  { id: "all", label: "All", content: "All submissions" },
  { id: "failed", label: "Failed", content: "Failed only" },
  { id: "repaired", label: "Repaired", content: "Repaired only" },
];

function tab(name: string) {
  return screen.getByRole("tab", { name });
}

describe("Tabs", () => {
  it("selects the first tab and shows only its panel", () => {
    render(<Tabs items={items} label="Filter" />);
    expect(screen.getByRole("tablist", { name: "Filter" })).toBeTruthy();
    expect(tab("All").getAttribute("aria-selected")).toBe("true");
    expect(tab("All").tabIndex).toBe(0);
    expect(tab("Failed").tabIndex).toBe(-1);
    const panel = screen.getByRole("tabpanel", { name: "All" });
    expect(panel.textContent).toBe("All submissions");
    expect(screen.getByText("Failed only").hidden).toBe(true);
  });

  it("moves selection and focus with arrows, Home and End", () => {
    render(<Tabs items={items} label="Filter" />);
    tab("All").focus();

    fireEvent.keyDown(tab("All"), { key: "ArrowRight" });
    expect(tab("Failed").getAttribute("aria-selected")).toBe("true");
    expect(document.activeElement).toBe(tab("Failed"));

    fireEvent.keyDown(tab("Failed"), { key: "End" });
    expect(document.activeElement).toBe(tab("Repaired"));

    fireEvent.keyDown(tab("Repaired"), { key: "ArrowRight" });
    expect(document.activeElement).toBe(tab("All"));

    fireEvent.keyDown(tab("All"), { key: "ArrowLeft" });
    expect(document.activeElement).toBe(tab("Repaired"));

    fireEvent.keyDown(tab("Repaired"), { key: "Home" });
    expect(document.activeElement).toBe(tab("All"));
  });

  it("selects on click and reports changes", () => {
    const onChange = vi.fn();
    render(<Tabs items={items} label="Filter" onChange={onChange} />);
    fireEvent.click(tab("Repaired"));
    expect(onChange).toHaveBeenCalledWith("repaired");
    expect(screen.getByRole("tabpanel").textContent).toBe("Repaired only");
  });

  it("follows a controlled value", () => {
    const onChange = vi.fn();
    render(
      <Tabs items={items} label="Filter" value="failed" onChange={onChange} />,
    );
    fireEvent.click(tab("All"));
    expect(onChange).toHaveBeenCalledWith("all");
    expect(tab("Failed").getAttribute("aria-selected")).toBe("true");
  });
});
