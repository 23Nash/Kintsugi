import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Button } from "./Button";

afterEach(cleanup);

describe("Button", () => {
  it("defaults to a secondary md button of type button", () => {
    render(<Button>Save</Button>);
    const button = screen.getByRole("button", { name: "Save" });
    expect(button.getAttribute("type")).toBe("button");
    expect(button.className).toBe(
      "ui-button ui-button--secondary ui-button--md",
    );
  });

  it("applies variant, size and extra classes", () => {
    render(
      <Button variant="danger" size="sm" className="extra">
        Delete
      </Button>,
    );
    expect(screen.getByRole("button").className).toBe(
      "ui-button ui-button--danger ui-button--sm extra",
    );
  });

  it("calls onClick, and not when disabled", () => {
    const onClick = vi.fn();
    const { rerender } = render(<Button onClick={onClick}>Go</Button>);
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);

    rerender(
      <Button onClick={onClick} disabled>
        Go
      </Button>,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("allows type submit", () => {
    render(<Button type="submit">Send</Button>);
    expect(screen.getByRole("button").getAttribute("type")).toBe("submit");
  });
});
