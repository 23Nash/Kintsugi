import type { ComponentPropsWithRef } from "react";
import { Icon, type IconName } from "../Icon/Icon";
import "./IconButton.css";

export type IconButtonProps = Omit<
  ComponentPropsWithRef<"button">,
  "children" | "aria-label"
> & {
  icon: IconName;
  /** Accessible name. Required: the button has no visible text. */
  label: string;
  size?: "sm" | "md";
};

/** Square ghost button with one icon. Wrap in Tooltip to show the label. */
export function IconButton({
  icon,
  label,
  size = "md",
  type = "button",
  className,
  ...rest
}: IconButtonProps) {
  const classes = ["ui-icon-button", `ui-icon-button--${size}`];
  if (className) classes.push(className);
  return (
    <button
      type={type}
      aria-label={label}
      className={classes.join(" ")}
      {...rest}
    >
      <Icon name={icon} size={16} />
    </button>
  );
}
