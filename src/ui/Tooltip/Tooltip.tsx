import {
  cloneElement,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
} from "react";
import "./Tooltip.css";

/** Hover delay before showing. Focus shows at once. */
export const TOOLTIP_DELAY_MS = 400;

type Describable = { "aria-describedby"?: string };

export type TooltipProps = {
  content: ReactNode;
  /** One focusable element, such as a Button or IconButton. */
  children: ReactElement<Describable>;
  placement?: "top" | "bottom";
};

/**
 * Shows on hover and keyboard focus, hides on leave, blur and Escape.
 * The text is always in the DOM and linked by aria-describedby.
 */
export function Tooltip({
  content,
  children,
  placement = "top",
}: TooltipProps) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  function clearTimer() {
    if (timer.current !== undefined) clearTimeout(timer.current);
    timer.current = undefined;
  }

  function show(delay: number) {
    clearTimer();
    if (delay === 0) {
      setOpen(true);
    } else {
      timer.current = setTimeout(() => setOpen(true), delay);
    }
  }

  function hide() {
    clearTimer();
    setOpen(false);
  }

  function onKeyDown(event: KeyboardEvent) {
    if (event.key === "Escape" && open) {
      event.stopPropagation();
      hide();
    }
  }

  useEffect(() => clearTimer, []);

  const existing = children.props["aria-describedby"];
  const trigger = cloneElement(children, {
    "aria-describedby": existing ? `${existing} ${id}` : id,
  });

  return (
    <span
      className="ui-tooltip-anchor"
      onMouseEnter={() => show(TOOLTIP_DELAY_MS)}
      onMouseLeave={hide}
      onFocus={() => show(0)}
      onBlur={hide}
      onKeyDown={onKeyDown}
    >
      {trigger}
      <span
        role="tooltip"
        id={id}
        className={`ui-tooltip ui-tooltip--${placement}`}
        data-open={open || undefined}
      >
        {content}
      </span>
    </span>
  );
}
