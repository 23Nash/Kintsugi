import type { ReactNode } from "react";
import { Icon, type IconName } from "../Icon/Icon";
import "./Badge.css";

export type BadgeTone = "neutral" | "accent" | "gold";

export type BadgeProps = {
  /** "gold" is for the repaired state only. */
  tone?: BadgeTone;
  icon?: IconName;
  title?: string;
  children: ReactNode;
};

export function Badge({ tone = "neutral", icon, title, children }: BadgeProps) {
  return (
    <span className={`ui-badge ui-badge--${tone}`} title={title}>
      {icon && <Icon name={icon} size={12} className="ui-badge__icon" />}
      {children}
    </span>
  );
}
