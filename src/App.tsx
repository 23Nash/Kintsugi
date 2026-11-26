import { lazy, Suspense } from "react";
import { HealthPage } from "./features/health/HealthPage";

// Dev-only design system review at ?design=1. In a production build
// import.meta.env.DEV is false, so the page and its import are dropped.
const DesignPage = import.meta.env.DEV
  ? lazy(() =>
      import("./features/design/DesignPage").then((m) => ({
        default: m.DesignPage,
      })),
    )
  : null;

function wantsDesign(): boolean {
  return new URLSearchParams(window.location.search).get("design") === "1";
}

export default function App() {
  if (DesignPage && wantsDesign()) {
    return (
      <Suspense fallback={null}>
        <DesignPage />
      </Suspense>
    );
  }
  return (
    <>
      <HealthPage />
      {import.meta.env.DEV && (
        <a
          href="?design=1"
          style={{
            position: "fixed",
            right: "var(--space-4)",
            bottom: "var(--space-4)",
            font: "var(--type-small)",
          }}
        >
          Design system (dev)
        </a>
      )}
    </>
  );
}
