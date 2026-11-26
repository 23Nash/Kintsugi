import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { IconButton } from "./IconButton";

afterEach(cleanup);

describe("IconButton", () => {
  it("takes its accessible name from label", () => {
    render(<IconButton icon="refresh" label="Sync now" />);
    const button = screen.getByRole("button", { name: "Sync now" });
    expect(button.getAttribute("type")).toBe("button");
    expect(button.querySelector("svg")?.getAttribute("data-icon")).toBe(
      "refresh",
    );
  });

  it("applies the size class and fires onClick", () => {
    const onClick = vi.fn();
    render(
      <IconButton icon="close" label="Close" size="sm" onClick={onClick} />,
    );
    const button = screen.getByRole("button", { name: "Close" });
    expect(button.className).toBe("ui-icon-button ui-icon-button--sm");
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
