import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { EmptyState } from "./EmptyState";

afterEach(cleanup);

describe("EmptyState", () => {
  it("renders title, text and action", () => {
    render(
      <EmptyState title="Nothing to retry" action={<button>Sync now</button>}>
        Failed problems show up here.
      </EmptyState>,
    );
    expect(screen.getByText("Nothing to retry")).toBeTruthy();
    expect(screen.getByText("Failed problems show up here.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Sync now" })).toBeTruthy();
  });

  it("renders only the title when nothing else is given", () => {
    const { container } = render(<EmptyState title="Empty" />);
    expect(container.querySelector(".ui-empty__text")).toBeNull();
    expect(container.querySelector(".ui-empty__action")).toBeNull();
    expect(container.querySelector("svg")?.getAttribute("data-icon")).toBe(
      "inbox",
    );
  });
});
