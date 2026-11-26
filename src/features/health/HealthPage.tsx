import { useEffect, useReducer } from "react";
import { health, toApiError } from "../../lib/api";
import { Button } from "../../ui/Button/Button";
import { Card } from "../../ui/Card/Card";
import { Icon } from "../../ui/Icon/Icon";
import { Spinner } from "../../ui/Spinner/Spinner";
import { healthReducer, initialHealthState } from "./healthMachine";
import "./HealthPage.css";

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
    <main className="health-page">
      <header className="health-page__header">
        <h1>Kintsugi</h1>
        <p className="health-page__subtitle">Practice tracker</p>
      </header>
      <Card
        title="Database"
        actions={
          <Button
            size="sm"
            disabled={state.status === "loading"}
            onClick={() => dispatch({ type: "check" })}
          >
            <Icon name="refresh" size={12} />
            Check again
          </Button>
        }
      >
        {state.status === "loading" && (
          // The result line below announces; the spinner stays quiet.
          <Spinner label="Checking database…" showLabel announce={false} />
        )}
        {state.status === "ready" && (
          <p role="status" className="health-page__line health-page__line--ok">
            <Icon name="check" />
            <span>
              Database healthy: {state.health.appliedMigrations} applied{" "}
              {state.health.appliedMigrations === 1
                ? "migration"
                : "migrations"}
            </span>
          </p>
        )}
        {state.status === "failed" && (
          <p
            role="alert"
            className="health-page__line health-page__line--error"
          >
            <Icon name="cross" />
            <span>Database error: {state.error.message}</span>
          </p>
        )}
      </Card>
    </main>
  );
}
