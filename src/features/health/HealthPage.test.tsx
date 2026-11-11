import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as api from "../../lib/api";
import { HealthPage } from "./HealthPage";

vi.mock("../../lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../lib/api")>();
  return { ...actual, health: vi.fn() };
});

const health = vi.mocked(api.health);

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

describe("HealthPage", () => {
  it("shows the number of applied migrations", async () => {
    health.mockResolvedValue({ appliedMigrations: 1 });

    render(<HealthPage />);

    expect((await screen.findByRole("status")).textContent).toBe(
      "Database healthy: 1 applied migration",
    );
  });

  it("shows the error when the health command fails", async () => {
    health.mockRejectedValue({
      kind: "databaseUnavailable",
      message: "cannot open kintsugi.db",
    });

    render(<HealthPage />);

    expect((await screen.findByRole("alert")).textContent).toBe(
      "Database error: cannot open kintsugi.db",
    );
  });
});
