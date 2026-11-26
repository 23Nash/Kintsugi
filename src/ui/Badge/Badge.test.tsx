import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Badge } from "./Badge";

afterEach(cleanup);

describe("Badge", () => {
  it("renders a neutral badge by default", () => {
    render(<Badge>Graphs</Badge>);
    expect(screen.getByText("Graphs").className).toBe(
      "ui-badge ui-badge--neutral",
    );
  });

  it("renders the tone and an optional decorative icon", () => {
    render(
      <Badge tone="gold" icon="seam" title="Solved after failing">
        Repaired
      </Badge>,
    );
    const badge = screen.getByText("Repaired");
    expect(badge.className).toBe("ui-badge ui-badge--gold");
    expect(badge.getAttribute("title")).toBe("Solved after failing");
    expect(badge.querySelector("svg")?.getAttribute("aria-hidden")).toBe(
      "true",
    );
    expect(badge.textContent).toBe("Repaired");
  });
});
