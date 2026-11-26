import type { ComponentPropsWithRef } from "react";
import "./Button.css";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md";

export type ButtonProps = ComponentPropsWithRef<"button"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function Button({
  variant = "secondary",
  size = "md",
  type = "button",
  className,
  ...rest
}: ButtonProps) {
  const classes = ["ui-button", `ui-button--${variant}`, `ui-button--${size}`];
  if (className) classes.push(className);
  return <button type={type} className={classes.join(" ")} {...rest} />;
}
