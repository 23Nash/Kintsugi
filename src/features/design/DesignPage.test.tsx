import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { DesignPage } from "./DesignPage";

afterEach(() => {
  cleanup();
  delete document.documentElement.dataset.theme;
});

describe("DesignPage", () => {
  it("renders the showcase in a light and a dark panel", () => {
    render(<DesignPage />);
    const light = screen.getByRole("group", { name: "Light theme" });
    const dark = screen.getByRole("group", { name: "Dark theme" });
    expect(light.getAttribute("data-theme")).toBe("light");
    expect(dark.getAttribute("data-theme")).toBe("dark");
    expect(
      screen.getAllByRole("table", { name: "Recent submissions" }),
    ).toHaveLength(2);
  });

  it("sets the page theme override on html", () => {
    render(<DesignPage />);
    const select = screen.getByRole("combobox", { name: "Page theme" });
    fireEvent.change(select, { target: { value: "dark" } });
    expect(document.documentElement.dataset.theme).toBe("dark");
    fireEvent.change(select, { target: { value: "system" } });
    expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
  });
});
