import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Card } from "./Card";

afterEach(cleanup);

describe("Card", () => {
  it("is a region named by its title", () => {
    render(
      <Card title="Sync status" actions={<button>Sync</button>}>
        <p>Up to date</p>
      </Card>,
    );
    const region = screen.getByRole("region", { name: "Sync status" });
    expect(
      screen.getByRole("heading", { level: 2, name: "Sync status" }),
    ).toBeTruthy();
    expect(region.textContent).toContain("Up to date");
    expect(screen.getByRole("button", { name: "Sync" })).toBeTruthy();
  });

  it("renders without a header when there is no title or actions", () => {
    const { container } = render(<Card>Body</Card>);
    expect(container.querySelector(".ui-card__header")).toBeNull();
    expect(
      container.querySelector("section")?.hasAttribute("aria-labelledby"),
    ).toBe(false);
  });
});
