import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  VerdictBadge,
  verdictMeta,
  type VerdictBadgeKind,
} from "./VerdictBadge";

afterEach(cleanup);

const kinds = Object.keys(verdictMeta) as VerdictBadgeKind[];

describe("VerdictBadge", () => {
  it("shows an icon and the full label for every verdict", () => {
    for (const kind of kinds) {
      const { container, unmount } = render(<VerdictBadge verdict={kind} />);
      const badge = container.firstElementChild as HTMLElement;
      expect(badge.textContent).toBe(verdictMeta[kind].label);
      expect(badge.className).toBe(`ui-verdict ui-verdict--${kind}`);
      expect(badge.querySelector("svg")?.getAttribute("data-icon")).toBe(
        verdictMeta[kind].icon,
      );
      unmount();
    }
  });

  it("short form shows the abbreviation and names the full verdict", () => {
    render(<VerdictBadge verdict="time" short />);
    const badge = screen.getByRole("img", { name: "Time limit" });
    expect(badge.textContent).toBe("TLE");
    expect(badge.getAttribute("title")).toBe("Time limit");
  });

  it("gives every verdict a distinct icon", () => {
    const icons = kinds.map((k) => verdictMeta[k].icon);
    expect(new Set(icons).size).toBe(icons.length);
  });
});
