import type { ReactNode } from "react";
import { Icon, type IconName } from "../Icon/Icon";
import "./EmptyState.css";

export type EmptyStateProps = {
  title: string;
  /** One line saying why it is empty or what to do. */
  children?: ReactNode;
  icon?: IconName;
  /** Usually one Button. */
  action?: ReactNode;
};

export function EmptyState({
  title,
  children,
  icon = "inbox",
  action,
}: EmptyStateProps) {
  return (
    <div className="ui-empty">
      <Icon name={icon} size={24} className="ui-empty__icon" />
      <p className="ui-empty__title">{title}</p>
      {children && <p className="ui-empty__text">{children}</p>}
      {action && <div className="ui-empty__action">{action}</div>}
    </div>
  );
}
