import { useId, type ComponentPropsWithRef } from "react";
import { describedBy, Field } from "../Field/Field";
import { Icon } from "../Icon/Icon";
import "./Select.css";

export type SelectProps = Omit<ComponentPropsWithRef<"select">, "size"> & {
  label: string;
  help?: string;
  error?: string;
  size?: "sm" | "md";
};

/** Native select, styled. Pass <option> elements as children. */
export function Select({
  label,
  help,
  error,
  size = "md",
  id,
  className,
  children,
  ...rest
}: SelectProps) {
  const generated = useId();
  const selectId = id ?? generated;
  const ids = {
    inputId: selectId,
    helpId: `${selectId}-help`,
    errorId: `${selectId}-error`,
  };
  const classes = ["ui-control", "ui-select", `ui-control--${size}`];
  if (className) classes.push(className);
  return (
    <Field ids={ids} label={label} help={help} error={error}>
      <span className="ui-select-wrap">
        <select
          id={selectId}
          className={classes.join(" ")}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(ids, help, error)}
          {...rest}
        >
          {children}
        </select>
        <Icon name="chevron-down" size={16} className="ui-select-wrap__icon" />
      </span>
    </Field>
  );
}
