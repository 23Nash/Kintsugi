import { describe, expect, it } from "vitest";
import {
  healthReducer,
  initialHealthState,
  type HealthState,
} from "./healthMachine";

const ready: HealthState = {
  status: "ready",
  health: { appliedMigrations: 1 },
};
const failed: HealthState = {
  status: "failed",
  error: { kind: "database", message: "boom" },
};

describe("healthReducer", () => {
  it("starts loading", () => {
    expect(initialHealthState).toEqual({ status: "loading" });
  });

  it("moves loading to ready on success", () => {
    expect(
      healthReducer(initialHealthState, {
        type: "succeeded",
        health: { appliedMigrations: 1 },
      }),
    ).toEqual(ready);
  });

  it("moves loading to failed on failure", () => {
    expect(
      healthReducer(initialHealthState, {
        type: "failed",
        error: { kind: "database", message: "boom" },
      }),
    ).toEqual(failed);
  });

  it("ignores check while loading", () => {
    expect(healthReducer(initialHealthState, { type: "check" })).toBe(
      initialHealthState,
    );
  });

  it("returns to loading on check from ready or failed", () => {
    expect(healthReducer(ready, { type: "check" })).toEqual({
      status: "loading",
    });
    expect(healthReducer(failed, { type: "check" })).toEqual({
      status: "loading",
    });
  });

  it("ignores stale results outside loading", () => {
    expect(
      healthReducer(ready, {
        type: "failed",
        error: { kind: "database", message: "late" },
      }),
    ).toBe(ready);
    expect(
      healthReducer(failed, {
        type: "succeeded",
        health: { appliedMigrations: 1 },
      }),
    ).toBe(failed);
  });
});
