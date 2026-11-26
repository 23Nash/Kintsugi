import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Tooltip, TOOLTIP_DELAY_MS } from "./Tooltip";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function setup() {
  render(
    <Tooltip content="Sync now">
      <button aria-describedby="other">Sync</button>
    </Tooltip>,
  );
  return {
    button: screen.getByRole("button", { name: "Sync" }),
    tooltip: screen.getByRole("tooltip", { hidden: true }),
  };
}

describe("Tooltip", () => {
  it("describes its trigger, keeping existing descriptions", () => {
    const { button, tooltip } = setup();
    expect(tooltip.textContent).toBe("Sync now");
    expect(button.getAttribute("aria-describedby")).toBe(`other ${tooltip.id}`);
    expect(tooltip.hasAttribute("data-open")).toBe(false);
  });

  it("opens on focus and closes on Escape and blur", () => {
    const { button, tooltip } = setup();
    fireEvent.focus(button);
    expect(tooltip.hasAttribute("data-open")).toBe(true);

    fireEvent.keyDown(button, { key: "Escape" });
    expect(tooltip.hasAttribute("data-open")).toBe(false);

    fireEvent.focus(button);
    fireEvent.blur(button);
    expect(tooltip.hasAttribute("data-open")).toBe(false);
  });

  it("opens on hover after the delay and closes on leave", () => {
    vi.useFakeTimers();
    const { button, tooltip } = setup();
    fireEvent.mouseEnter(button.parentElement as HTMLElement);
    expect(tooltip.hasAttribute("data-open")).toBe(false);

    act(() => {
      vi.advanceTimersByTime(TOOLTIP_DELAY_MS);
    });
    expect(tooltip.hasAttribute("data-open")).toBe(true);

    fireEvent.mouseLeave(button.parentElement as HTMLElement);
    expect(tooltip.hasAttribute("data-open")).toBe(false);
  });

  it("does not open if the pointer leaves before the delay", () => {
    vi.useFakeTimers();
    const { button, tooltip } = setup();
    const anchor = button.parentElement as HTMLElement;
    fireEvent.mouseEnter(anchor);
    fireEvent.mouseLeave(anchor);
    act(() => {
      vi.advanceTimersByTime(TOOLTIP_DELAY_MS * 2);
    });
    expect(tooltip.hasAttribute("data-open")).toBe(false);
  });
});
