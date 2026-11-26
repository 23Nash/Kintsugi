import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Spinner } from "./Spinner";

afterEach(cleanup);

describe("Spinner", () => {
  it("is a status with a hidden label by default", () => {
    render(<Spinner />);
    const status = screen.getByRole("status");
    expect(status.textContent).toBe("Loading");
    expect(screen.getByText("Loading").className).toBe("ui-visually-hidden");
  });

  it("shows the label on request", () => {
    render(<Spinner label="Syncing" showLabel />);
    expect(screen.getByText("Syncing").className).toBe("ui-spinner__label");
  });

  it("has no status role when announce is off", () => {
    render(<Spinner announce={false} />);
    expect(screen.queryByRole("status")).toBeNull();
  });
});
