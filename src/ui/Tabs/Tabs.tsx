import { useId, useState, type KeyboardEvent, type ReactNode } from "react";
import "./Tabs.css";

export type TabItem = {
  id: string;
  label: ReactNode;
  content: ReactNode;
};

export type TabsProps = {
  items: readonly TabItem[];
  /** Names the tab list. */
  label: string;
  /** Controlled selection. Omit to let Tabs keep it. */
  value?: string;
  defaultValue?: string;
  onChange?: (id: string) => void;
};

const keyStep: Record<string, (index: number, count: number) => number> = {
  ArrowRight: (i, n) => (i + 1) % n,
  ArrowLeft: (i, n) => (i - 1 + n) % n,
  Home: () => 0,
  End: (_, n) => n - 1,
};

/** WAI-ARIA tabs: one tab stop, arrow keys move and select, Home and End jump. */
export function Tabs({
  items,
  label,
  value,
  defaultValue,
  onChange,
}: TabsProps) {
  const baseId = useId();
  const [internal, setInternal] = useState(defaultValue ?? items[0]?.id);
  const selected = value ?? internal;

  function select(id: string) {
    if (value === undefined) setInternal(id);
    onChange?.(id);
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const step = keyStep[event.key];
    if (!step || items.length === 0) return;
    event.preventDefault();
    const current = items.findIndex((item) => item.id === selected);
    const next = step(Math.max(current, 0), items.length);
    select(items[next].id);
    const tabs =
      event.currentTarget.querySelectorAll<HTMLElement>('[role="tab"]');
    tabs[next]?.focus();
  }

  return (
    <div className="ui-tabs">
      <div
        role="tablist"
        aria-label={label}
        className="ui-tabs__list"
        onKeyDown={onKeyDown}
      >
        {items.map((item) => {
          const isSelected = item.id === selected;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              id={`${baseId}-tab-${item.id}`}
              aria-selected={isSelected}
              aria-controls={`${baseId}-panel-${item.id}`}
              tabIndex={isSelected ? 0 : -1}
              className="ui-tabs__tab"
              onClick={() => select(item.id)}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      {items.map((item) => (
        <div
          key={item.id}
          role="tabpanel"
          id={`${baseId}-panel-${item.id}`}
          aria-labelledby={`${baseId}-tab-${item.id}`}
          hidden={item.id !== selected}
          tabIndex={0}
          className="ui-tabs__panel"
        >
          {item.content}
        </div>
      ))}
    </div>
  );
}
