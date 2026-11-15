import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Input } from "./Input";

afterEach(cleanup);

describe("Input", () => {
  it("is labelled and described by its help text", () => {
    render(<Input label="Codeforces handle" help="Used for sync" />);
    const input = screen.getByRole("textbox", { name: "Codeforces handle" });
    const help = screen.getByText("Used for sync");
    expect(input.getAttribute("aria-describedby")).toBe(help.id);
    expect(input.hasAttribute("aria-invalid")).toBe(false);
  });

  it("marks errors as invalid and describes them", () => {
    render(<Input label="Handle" error="Handle not found" />);
    const input = screen.getByRole("textbox", { name: "Handle" });
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(input.getAttribute("aria-describedby")).toBe(
      screen.getByText("Handle not found").id,
    );
  });

  it("passes input props through and uses a given id", () => {
    const onChange = vi.fn();
    render(<Input label="Search" id="search" size="sm" onChange={onChange} />);
    const input = screen.getByRole("textbox", { name: "Search" });
    expect(input.id).toBe("search");
    expect(input.className).toBe("ui-control ui-control--sm");
    fireEvent.change(input, { target: { value: "dp" } });
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});
