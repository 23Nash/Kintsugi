import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Select } from "./Select";

afterEach(cleanup);

describe("Select", () => {
  it("is a labelled combobox with its options", () => {
    render(
      <Select label="Judge" help="Where to sync from">
        <option value="cf">Codeforces</option>
        <option value="atc">AtCoder</option>
      </Select>,
    );
    const select = screen.getByRole("combobox", { name: "Judge" });
    expect(screen.getAllByRole("option")).toHaveLength(2);
    expect(select.getAttribute("aria-describedby")).toBe(
      screen.getByText("Where to sync from").id,
    );
  });

  it("reports changes and marks errors", () => {
    const onChange = vi.fn();
    render(
      <Select label="Judge" error="Pick one" onChange={onChange}>
        <option value="cf">Codeforces</option>
        <option value="atc">AtCoder</option>
      </Select>,
    );
    const select = screen.getByRole("combobox", { name: "Judge" });
    expect(select.getAttribute("aria-invalid")).toBe("true");
    fireEvent.change(select, { target: { value: "atc" } });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect((select as HTMLSelectElement).value).toBe("atc");
  });
});
