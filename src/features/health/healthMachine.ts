// Pure state machine for the health check. No React, no I/O.
import type { ApiError, Health } from "../../lib/api";

export type HealthState =
  | { status: "loading" }
  | { status: "ready"; health: Health }
  | { status: "failed"; error: ApiError };

export type HealthEvent =
  | { type: "check" }
  | { type: "succeeded"; health: Health }
  | { type: "failed"; error: ApiError };

export const initialHealthState: HealthState = { status: "loading" };

export function healthReducer(
  state: HealthState,
  event: HealthEvent,
): HealthState {
  if (state.status === "loading") {
    if (event.type === "succeeded")
      return { status: "ready", health: event.health };
    if (event.type === "failed")
      return { status: "failed", error: event.error };
    return state;
  }
  // ready or failed: results only arrive while loading, so stale ones are ignored.
  return event.type === "check" ? { status: "loading" } : state;
}
