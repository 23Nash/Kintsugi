import "./Spinner.css";

export type SpinnerProps = {
  /** Text read by screen readers, and shown when `showLabel`. */
  label?: string;
  showLabel?: boolean;
  size?: "sm" | "md";
  /**
   * Wrap in role="status" so the label is announced. Turn off when a nearby
   * status region already announces the result.
   */
  announce?: boolean;
};

export function Spinner({
  label = "Loading",
  showLabel = false,
  size = "md",
  announce = true,
}: SpinnerProps) {
  return (
    <span
      className={`ui-spinner ui-spinner--${size}`}
      role={announce ? "status" : undefined}
    >
      <span className="ui-spinner__ring" aria-hidden="true" />
      <span className={showLabel ? "ui-spinner__label" : "ui-visually-hidden"}>
        {label}
      </span>
    </span>
  );
}
