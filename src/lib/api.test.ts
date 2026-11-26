import { describe, expect, it, vi } from "vitest";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));

import { API_ERROR_KINDS, toApiError } from "./api";

describe("api error kinds", () => {
  // Drift test: the Rust counterpart is `serialises_the_exact_kind_list` in
  // `src-tauri/src/error.rs`. Change both lists and both tests together.
  it("lists the error kinds", () => {
    expect([...API_ERROR_KINDS]).toEqual([
      "databaseUnavailable",
      "database",
      "validation",
      "notFound",
      "network",
      "rateLimited",
      "upstream",
      "cancelled",
      "internal",
    ]);
  });

  it("keeps every listed kind", () => {
    for (const kind of API_ERROR_KINDS) {
      expect(toApiError({ kind, message: "m" })).toEqual({
        kind,
        message: "m",
      });
    }
  });

  it("keeps field", () => {
    expect(
      toApiError({ kind: "validation", message: "m", field: "handle" }),
    ).toEqual({ kind: "validation", message: "m", field: "handle" });
  });

  it("maps unknown kinds to unknown", () => {
    expect(toApiError({ kind: "busy", message: "m" })).toEqual({
      kind: "unknown",
      message: "m",
    });
    expect(toApiError("boom")).toEqual({ kind: "unknown", message: "boom" });
  });
});
