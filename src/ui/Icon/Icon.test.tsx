import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Icon, iconNames } from "./Icon";

afterEach(cleanup);

describe("Icon", () => {
  it("is hidden from assistive technology", () => {
    const { container } = render(<Icon name="check" />);
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("aria-hidden")).toBe("true");
    expect(svg?.getAttribute("focusable")).toBe("false");
  });

  it("defaults to 16px and accepts 12px", () => {
    const { container } = render(
      <>
        <Icon name="check" />
        <Icon name="cross" size={12} />
      </>,
    );
    const [a, b] = container.querySelectorAll("svg");
    expect(a.getAttribute("width")).toBe("16");
    expect(b.getAttribute("width")).toBe("12");
  });

  it("draws every named icon", () => {
    for (const name of iconNames) {
      const { container, unmount } = render(<Icon name={name} />);
      expect(container.querySelector("svg")?.childElementCount).toBeGreaterThan(
        0,
      );
      unmount();
    }
  });
});
