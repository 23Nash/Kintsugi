// Dev-only review page for the design system. Loaded by App.tsx with
// ?design=1 when import.meta.env.DEV; never part of a production build.
import { useState, type ReactNode } from "react";
import { Badge } from "../../ui/Badge/Badge";
import { Button, type ButtonVariant } from "../../ui/Button/Button";
import { Card } from "../../ui/Card/Card";
import { EmptyState } from "../../ui/EmptyState/EmptyState";
import { Icon, iconNames } from "../../ui/Icon/Icon";
import { IconButton } from "../../ui/IconButton/IconButton";
import { Input } from "../../ui/Input/Input";
import { Select } from "../../ui/Select/Select";
import { Spinner } from "../../ui/Spinner/Spinner";
import { Table, type Column } from "../../ui/Table/Table";
import { Tabs } from "../../ui/Tabs/Tabs";
import { applyTheme, currentTheme, type Theme } from "../../ui/theme";
import { Tooltip } from "../../ui/Tooltip/Tooltip";
import {
  VerdictBadge,
  verdictMeta,
  type VerdictBadgeKind,
} from "../../ui/VerdictBadge/VerdictBadge";
import "./DesignPage.css";

const colorGroups: [string, string[]][] = [
  [
    "Surfaces",
    ["surface", "surface-raised", "surface-sunken", "surface-hover"],
  ],
  ["Lines", ["border", "border-strong"]],
  ["Text", ["text", "text-muted", "text-disabled"]],
  [
    "Interaction",
    ["accent", "accent-hover", "on-accent", "accent-soft", "focus-ring"],
  ],
  [
    "Gold (repaired only)",
    ["accent-gold", "accent-gold-text", "on-gold", "gold-soft"],
  ],
  ["Danger", ["danger", "danger-hover", "on-danger"]],
  [
    "Verdicts",
    [
      "accepted",
      "wrong",
      "time",
      "memory",
      "runtime",
      "compile",
      "pending",
    ].flatMap((v) => [`verdict-${v}`, `verdict-${v}-bg`]),
  ],
];

const typeStyles = [
  ["title-lg", "Retry queue"],
  ["title", "Weak topics"],
  ["body", "Last synced 4 minutes ago"],
  ["body-strong", "Check again"],
  ["small", "Solved after 3 attempts"],
  ["label", "Accepted"],
  ["mono", "1934D2  312 ms  256 MB"],
  ["mono-small", "abc345_e"],
];

const spaces = [
  "space-hair",
  "space-1",
  "space-2",
  "space-3",
  "space-4",
  "space-6",
  "space-8",
  "space-12",
];
const radii = ["radius-sm", "radius-md", "radius-lg"];
const shadows = ["shadow-1", "shadow-2"];
const variants: ButtonVariant[] = ["primary", "secondary", "ghost", "danger"];
const verdicts = Object.keys(verdictMeta) as VerdictBadgeKind[];

type Submission = {
  id: string;
  problem: string;
  verdict: VerdictBadgeKind;
  timeMs: number;
  memoryKb: number;
  when: string;
};

const submissions: Submission[] = [
  {
    id: "1",
    problem: "1934D2",
    verdict: "repaired",
    timeMs: 312,
    memoryKb: 262144,
    when: "2026-11-14",
  },
  {
    id: "2",
    problem: "abc345_e",
    verdict: "wrong",
    timeMs: 46,
    memoryKb: 4096,
    when: "2026-11-14",
  },
  {
    id: "3",
    problem: "1950G",
    verdict: "time",
    timeMs: 2000,
    memoryKb: 18432,
    when: "2026-11-13",
  },
  {
    id: "4",
    problem: "arc172_c",
    verdict: "accepted",
    timeMs: 9,
    memoryKb: 3584,
    when: "2026-11-12",
  },
  {
    id: "5",
    problem: "1949B",
    verdict: "memory",
    timeMs: 640,
    memoryKb: 524288,
    when: "2026-11-12",
  },
  {
    id: "6",
    problem: "abc344_f",
    verdict: "runtime",
    timeMs: 12,
    memoryKb: 3840,
    when: "2026-11-11",
  },
  {
    id: "7",
    problem: "1937C",
    verdict: "compile",
    timeMs: 0,
    memoryKb: 0,
    when: "2026-11-11",
  },
  {
    id: "8",
    problem: "1951E",
    verdict: "pending",
    timeMs: 0,
    memoryKb: 0,
    when: "2026-11-15",
  },
];

const columns: Column<Submission>[] = [
  { key: "problem", header: "Problem", cell: (r) => r.problem, mono: true },
  {
    key: "verdict",
    header: "Verdict",
    cell: (r) => <VerdictBadge verdict={r.verdict} />,
  },
  { key: "time", header: "Time", cell: (r) => `${r.timeMs} ms`, numeric: true },
  {
    key: "memory",
    header: "Memory",
    cell: (r) => `${Math.round(r.memoryKb / 1024)} MB`,
    numeric: true,
  },
  { key: "when", header: "Date", cell: (r) => r.when, numeric: true },
];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="design__section">
      <h2 className="design__section-title">{title}</h2>
      {children}
    </section>
  );
}

function Showcase() {
  return (
    <div className="design__showcase">
      <Section title="Color">
        {colorGroups.map(([group, names]) => (
          <div key={group} className="design__group">
            <h3 className="design__group-title">{group}</h3>
            <ul className="design__swatches">
              {names.map((name) => (
                <li key={name} className="design__swatch">
                  <span
                    className="design__chip"
                    style={{ background: `var(--${name})` }}
                  />
                  <code>--{name}</code>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </Section>

      <Section title="Type">
        <ul className="design__list">
          {typeStyles.map(([name, sample]) => (
            <li key={name} className="design__type-row">
              <code className="design__meta">--type-{name}</code>
              <span style={{ font: `var(--type-${name})` }}>{sample}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Space, radius, shadow">
        <ul className="design__list">
          {spaces.map((name) => (
            <li key={name} className="design__type-row">
              <code className="design__meta">--{name}</code>
              <span
                className="design__space"
                style={{ width: `var(--${name})` }}
              />
            </li>
          ))}
        </ul>
        <div className="design__row">
          {radii.map((name) => (
            <div
              key={name}
              className="design__tile"
              style={{ borderRadius: `var(--${name})` }}
            >
              <code>--{name}</code>
            </div>
          ))}
          {shadows.map((name) => (
            <div
              key={name}
              className="design__tile"
              style={{ boxShadow: `var(--${name})` }}
            >
              <code>--{name}</code>
            </div>
          ))}
        </div>
        <p className="design__meta">
          Motion: --duration-fast 100ms, --duration-base 160ms, both 0ms under
          prefers-reduced-motion.
        </p>
      </Section>

      <Section title="Verdicts">
        <div className="design__row">
          {verdicts.map((v) => (
            <VerdictBadge key={v} verdict={v} />
          ))}
        </div>
        <div className="design__row">
          {verdicts.map((v) => (
            <VerdictBadge key={v} verdict={v} short />
          ))}
        </div>
      </Section>

      <Section title="Buttons">
        {(["md", "sm"] as const).map((size) => (
          <div key={size} className="design__row">
            {variants.map((variant) => (
              <Button key={variant} variant={variant} size={size}>
                {variant}
              </Button>
            ))}
            <Button size={size} disabled>
              disabled
            </Button>
          </div>
        ))}
        <div className="design__row">
          <Tooltip content="Sync now">
            <IconButton icon="refresh" label="Sync now" />
          </Tooltip>
          <Tooltip content="Close" placement="bottom">
            <IconButton icon="close" label="Close" size="sm" />
          </Tooltip>
          <IconButton icon="refresh" label="Sync disabled" disabled />
        </div>
      </Section>

      <Section title="Badges and icons">
        <div className="design__row">
          <Badge>Graphs</Badge>
          <Badge tone="accent">3 due</Badge>
          <Badge tone="gold" icon="seam">
            Repaired
          </Badge>
        </div>
        <div className="design__row design__icons">
          {iconNames.map((name) => (
            <span key={name} title={name}>
              <Icon name={name} />
            </span>
          ))}
        </div>
      </Section>

      <Section title="Table">
        <Table
          columns={columns}
          rows={submissions}
          rowKey={(r) => r.id}
          caption="Recent submissions"
          showCaption
          zebra
          selectedKey="3"
          maxHeight="14rem"
        />
        <Table
          columns={columns}
          rows={[]}
          rowKey={(r) => r.id}
          caption="Empty table"
          empty={
            <EmptyState title="No submissions yet">
              Run a sync to pull them in.
            </EmptyState>
          }
        />
      </Section>

      <Section title="Forms">
        <div className="design__form">
          <Input
            label="Codeforces handle"
            placeholder="your_handle"
            help="Used for sync."
          />
          <Input
            label="AtCoder handle"
            defaultValue="??"
            error="Handle not found."
          />
          <Select label="Judge" defaultValue="cf">
            <option value="cf">Codeforces</option>
            <option value="atc">AtCoder</option>
          </Select>
          <Input label="Disabled" disabled defaultValue="read only" size="sm" />
        </div>
      </Section>

      <Section title="Tabs, card, spinner">
        <Card title="Sync status" actions={<Button size="sm">Sync now</Button>}>
          <Tabs
            label="Submission filter"
            items={[
              { id: "all", label: "All", content: <p>All 214 submissions.</p> },
              {
                id: "failed",
                label: "Failed",
                content: <p>38 failed problems.</p>,
              },
              {
                id: "repaired",
                label: "Repaired",
                content: <p>12 repaired.</p>,
              },
            ]}
          />
          <Spinner label="Syncing" showLabel announce={false} />
        </Card>
      </Section>
    </div>
  );
}

const themes: Theme[] = ["system", "light", "dark"];

export function DesignPage() {
  const [theme, setTheme] = useState<Theme>(() => currentTheme());

  function onThemeChange(next: Theme) {
    applyTheme(next);
    setTheme(next);
  }

  return (
    <main className="design">
      <header className="design__header">
        <div>
          <h1>Design system</h1>
          <p className="design__meta">
            Dev only. Both themes side by side; the selector sets data-theme on
            the html element.
          </p>
        </div>
        <div className="design__theme">
          <Select
            label="Page theme"
            size="sm"
            value={theme}
            onChange={(e) => onThemeChange(e.target.value as Theme)}
          >
            {themes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </div>
        <a href="./">Back to app</a>
      </header>
      <div className="design__columns">
        <div
          data-theme="light"
          className="design__panel"
          aria-label="Light theme"
          role="group"
        >
          <p className="design__panel-title">Light</p>
          <Showcase />
        </div>
        <div
          data-theme="dark"
          className="design__panel"
          aria-label="Dark theme"
          role="group"
        >
          <p className="design__panel-title">Dark</p>
          <Showcase />
        </div>
      </div>
    </main>
  );
}
