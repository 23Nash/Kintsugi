import { afterEach, describe, expect, it } from "vitest";
import { applyTheme, currentTheme } from "./theme";

afterEach(() => {
  delete document.documentElement.dataset.theme;
});

describe("applyTheme", () => {
  it("sets data-theme for light and dark", () => {
    applyTheme("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    applyTheme("light");
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });

  it("removes data-theme for system", () => {
    applyTheme("dark");
    applyTheme("system");
    expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
  });
});

describe("currentTheme", () => {
  it("reads the override and falls back to system", () => {
    expect(currentTheme()).toBe("system");
    document.documentElement.dataset.theme = "dark";
    expect(currentTheme()).toBe("dark");
    document.documentElement.dataset.theme = "sepia";
    expect(currentTheme()).toBe("system");
  });
});
