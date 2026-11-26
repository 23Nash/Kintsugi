import { Icon, type IconName } from "../Icon/Icon";
import "./VerdictBadge.css";

export type Verdict =
  "accepted" | "wrong" | "time" | "memory" | "runtime" | "compile" | "pending";

/** Verdicts plus the repaired state (failed, later accepted). */
export type VerdictBadgeKind = Verdict | "repaired";

type Meta = { label: string; short: string; icon: IconName };

export const verdictMeta: Record<VerdictBadgeKind, Meta> = {
  accepted: { label: "Accepted", short: "AC", icon: "check" },
  wrong: { label: "Wrong answer", short: "WA", icon: "cross" },
  time: { label: "Time limit", short: "TLE", icon: "clock" },
  memory: { label: "Memory limit", short: "MLE", icon: "stack" },
  runtime: { label: "Runtime error", short: "RE", icon: "bolt" },
  compile: { label: "Compile error", short: "CE", icon: "braces" },
  pending: { label: "Pending", short: "...", icon: "dot" },
  repaired: { label: "Repaired", short: "Fixed", icon: "seam" },
};

export type VerdictBadgeProps = {
  verdict: VerdictBadgeKind;
  /** Show the abbreviation; the full name moves to title and aria-label. */
  short?: boolean;
};

/** Icon plus label in the verdict's colors. Never color alone. */
export function VerdictBadge({ verdict, short = false }: VerdictBadgeProps) {
  const meta = verdictMeta[verdict];
  return (
    <span
      className={`ui-verdict ui-verdict--${verdict}`}
      title={short ? meta.label : undefined}
      aria-label={short ? meta.label : undefined}
      role={short ? "img" : undefined}
    >
      <Icon name={meta.icon} size={12} className="ui-verdict__icon" />
      {short ? meta.short : meta.label}
    </span>
  );
}
