import { useId, type ComponentPropsWithRef } from "react";
import { describedBy, Field } from "../Field/Field";

export type InputProps = Omit<ComponentPropsWithRef<"input">, "size"> & {
  label: string;
  help?: string;
  /** Marks the input invalid and shows the message. */
  error?: string;
  size?: "sm" | "md";
};

export function Input({
  label,
  help,
  error,
  size = "md",
  id,
  className,
  ...rest
}: InputProps) {
  const generated = useId();
  const inputId = id ?? generated;
  const ids = {
    inputId,
    helpId: `${inputId}-help`,
    errorId: `${inputId}-error`,
  };
  const classes = ["ui-control", `ui-control--${size}`];
  if (className) classes.push(className);
  return (
    <Field ids={ids} label={label} help={help} error={error}>
      <input
        id={inputId}
        className={classes.join(" ")}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(ids, help, error)}
        {...rest}
      />
    </Field>
  );
}
