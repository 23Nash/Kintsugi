import { useEffect, useReducer } from "react";
import { health, toApiError } from "../../lib/api";
import { healthReducer, initialHealthState } from "./healthMachine";

export function HealthPage() {
  const [state, dispatch] = useReducer(healthReducer, initialHealthState);

  // The loading state drives the side effect; the reducer stays pure.
  useEffect(() => {
    if (state.status !== "loading") return;
    let cancelled = false;
    health().then(
      (result) => {
        if (!cancelled) dispatch({ type: "succeeded", health: result });
      },
      (error: unknown) => {
        if (!cancelled) dispatch({ type: "failed", error: toApiError(error) });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [state.status]);

  return (
    <main>
      <h1>Kintsugi</h1>
      {state.status === "loading" && <p>Checking database…</p>}
      {state.status === "ready" && (
        <p role="status">
          Database healthy: {state.health.appliedMigrations} applied{" "}
          {state.health.appliedMigrations === 1 ? "migration" : "migrations"}
        </p>
      )}
      {state.status === "failed" && (
        <p role="alert">Database error: {state.error.message}</p>
      )}
      <button
        type="button"
        disabled={state.status === "loading"}
        onClick={() => dispatch({ type: "check" })}
      >
        Check again
      </button>
    </main>
  );
}
