import { useId, type ReactNode } from "react";
import "./Card.css";

export type CardProps = {
  /** Heading text; also names the card region. */
  title?: string;
  /** Controls at the right of the title row. */
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function Card({ title, actions, children, className }: CardProps) {
  const titleId = useId();
  return (
    <section
      className={className ? `ui-card ${className}` : "ui-card"}
      aria-labelledby={title ? titleId : undefined}
    >
      {(title || actions) && (
        <header className="ui-card__header">
          {title && (
            <h2 id={titleId} className="ui-card__title">
              {title}
            </h2>
          )}
          {actions && <div className="ui-card__actions">{actions}</div>}
        </header>
      )}
      <div className="ui-card__body">{children}</div>
    </section>
  );
}
