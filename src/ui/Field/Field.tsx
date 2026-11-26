import type { ReactNode } from "react";
import "./Field.css";

export type FieldIds = {
  inputId: string;
  helpId: string;
  errorId: string;
};

export type FieldProps = {
  ids: FieldIds;
  label: string;
  help?: string;
  error?: string;
  children: ReactNode;
};

/** Label, control, help text and error text. Shared by Input and Select. */
export function Field({ ids, label, help, error, children }: FieldProps) {
  return (
    <div className="ui-field">
      <label className="ui-field__label" htmlFor={ids.inputId}>
        {label}
      </label>
      {children}
      {help && (
        <p id={ids.helpId} className="ui-field__help">
          {help}
        </p>
      )}
      {error && (
        <p id={ids.errorId} className="ui-field__error">
          {error}
        </p>
      )}
    </div>
  );
}

/** aria-describedby value for a control: help first, then error. */
export function describedBy(
  ids: FieldIds,
  help?: string,
  error?: string,
): string | undefined {
  const list = [help && ids.helpId, error && ids.errorId].filter(Boolean);
  return list.length > 0 ? list.join(" ") : undefined;
}
