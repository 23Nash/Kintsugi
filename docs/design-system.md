# Design system

Plain CSS with custom properties. No CSS framework, no icon library, no new dependency.

- Tokens: `src/ui/tokens.css`. Base styles: `src/ui/base.css`. Both load once in `src/main.tsx`.
- Primitives: `src/ui/<Name>/`, one folder each with `<Name>.tsx`, `<Name>.css`, `<Name>.test.tsx`.
- Theme override helper: `src/ui/theme.ts` (`applyTheme`, `currentTheme`).
- Review page: run `pnpm tauri dev` and click "Design system (dev)" at the bottom right, or open `http://localhost:1420/?design=1`. It renders every token and primitive in a light and a dark panel. It exists only in development builds.

## Themes

Every color token is `light-dark(<light>, <dark>)`. The browser picks a value from the element's `color-scheme`:

- `:root` has `color-scheme: light dark`, so the app follows `prefers-color-scheme`.
- `data-theme="light"` or `data-theme="dark"` on `<html>` forces one theme. `applyTheme("system" | "light" | "dark")` sets or clears it.
- The same attribute on any element forces a theme for that subtree. The review page uses this to show both themes at once.

`light-dark()` needs Chromium 123+ or Safari 17.5+. WebView2 on this machine is 157.

## Tokens

Components use these names only, never hex values.

### Color

| Token                           | Light     | Dark     | Use                                                  |
| ------------------------------- | --------- | -------- | ---------------------------------------------------- |
| `--surface`                     | #f5f2ec   | #1a1815  | Window background                                    |
| `--surface-raised`              | #fcfaf6   | #23201c  | Cards, tables, inputs, popovers                      |
| `--surface-sunken`              | #ebe6dd   | #141210  | Zebra rows, code wells, disabled fills               |
| `--surface-hover`               | #e6e0d6   | #2c2823  | Hover fill: rows, ghost and icon buttons             |
| `--border`                      | #dcd4c8   | #3a352f  | Decorative edges and row dividers (not for controls) |
| `--border-strong`               | #857a6d   | #7d7368  | Control outlines, scrollbar thumb                    |
| `--text`                        | #2a2520   | #ede7de  | Content text                                         |
| `--text-muted`                  | #625a50   | #b0a698  | Secondary text, column headers, help text            |
| `--text-disabled`               | #a39a8e   | #6b6359  | Disabled control labels only                         |
| `--accent`                      | #3a5a85   | #93b2dd  | Primary buttons, links, selected tab, focus          |
| `--accent-hover`                | #2f4b70   | #a9c3e6  | Primary button hover                                 |
| `--on-accent`                   | #ffffff   | #141210  | Text on accent                                       |
| `--accent-soft`                 | #e2e9f3   | #1f2a3a  | Selected row, text selection                         |
| `--focus-ring`                  | = accent  | = accent | Focus outline                                        |
| `--accent-gold`                 | #a97c22   | #d6a84a  | Repaired marks: icons, seams, bar fills              |
| `--accent-gold-text`            | #86600f   | #e0b65c  | Repaired text                                        |
| `--on-gold`                     | #1a1612   | #1a1815  | Text on an accent-gold fill                          |
| `--gold-soft`                   | #f6ebcf   | #3a2f17  | Repaired badge fill                                  |
| `--danger`                      | #a8352b   | #e58a7f  | Destructive fill and error text                      |
| `--danger-hover`                | #8f2c23   | #eea197  | Danger button hover                                  |
| `--on-danger`                   | #ffffff   | #141210  | Text on danger                                       |
| `--verdict-*`, `--verdict-*-bg` | see below |          | Verdict badges                                       |

### Type

Families: `--font-sans` (Segoe UI Variable, then system UI), `--font-mono` (Cascadia Mono, Consolas, `ui-monospace`). No font files ship.

Styles are `font` shorthands; use them as `font: var(--type-body)`.

| Token                | Value              | Use                                       |
| -------------------- | ------------------ | ----------------------------------------- |
| `--type-title-lg`    | 600 20px/28px sans | Screen title, one per screen (`h1`)       |
| `--type-title`       | 600 16px/22px sans | Card and section headings (`h2`, `h3`)    |
| `--type-body`        | 400 13px/20px sans | Default: UI text, cells, inputs           |
| `--type-body-strong` | 600 13px/20px sans | Button labels, emphasis                   |
| `--type-small`       | 400 12px/16px sans | Help text, tooltips                       |
| `--type-label`       | 600 12px/16px sans | Badges, tabs, form labels, column headers |
| `--type-mono`        | 400 13px/20px mono | Problem IDs, code                         |
| `--type-mono-small`  | 400 12px/16px mono | IDs in dense cells                        |

Numeric table columns add `font-variant-numeric: tabular-nums` and right alignment (Table's `numeric` column flag).

### Space, size, radius, shadow, motion

| Token                                 | Value                      | Use                                    |
| ------------------------------------- | -------------------------- | -------------------------------------- |
| `--space-hair`                        | 2px                        | Icon gap in badges                     |
| `--space-1`                           | 4px                        | Icon gap in buttons                    |
| `--space-2`                           | 8px                        | Cell padding, button gap               |
| `--space-3`                           | 12px                       | Button padding, gaps inside cards      |
| `--space-4`                           | 16px                       | Card padding, gap between cards        |
| `--space-6`                           | 24px                       | Section spacing, page gutter           |
| `--space-8`                           | 32px                       | Between page regions                   |
| `--space-12`                          | 48px                       | Empty state padding                    |
| `--control-sm` / `--control-md`       | 24px / 28px                | Control heights                        |
| `--row-height`                        | 32px                       | Table rows                             |
| `--focus-width`                       | 2px                        | Focus outline width and offset         |
| `--radius-sm` / `-md` / `-lg`         | 3px / 5px / 8px            | Badges and tooltips / controls / cards |
| `--shadow-1`                          | faint 1px                  | Cards                                  |
| `--shadow-2`                          | 4px/12px                   | Tooltips, popovers                     |
| `--duration-fast` / `--duration-base` | 100ms / 160ms              | Hover and press / fades and tabs       |
| `--ease`                              | cubic-bezier(0.2, 0, 0, 1) | All transitions                        |

Under `prefers-reduced-motion: reduce` both durations become 0ms, `base.css` zeroes transitions, and Spinner replaces rotation with a 2s opacity pulse.

## When to use gold

Gold means repaired: a problem with at least one failed submission and a later Accepted one. Nothing else.

- Use `VerdictBadge verdict="repaired"` or `Badge tone="gold"` for the state.
- Use `--accent-gold` for repaired marks (a seam line, a bar segment in the topic view) and `--accent-gold-text` for repaired text.
- Never use gold for buttons, links, focus, selection, headings, warnings, the Time limit verdict, or decoration.
- If a screen shows many gold marks and repaired is not its subject, something is wrong.

## Verdict mapping

Every verdict has an icon and a label as well as a color. Never show the color alone. `short` shows the abbreviation, with the full name in `title` and `aria-label`.

| Verdict               | Key        | Label         | Short | Icon   | Tokens                                               |
| --------------------- | ---------- | ------------- | ----- | ------ | ---------------------------------------------------- |
| Accepted              | `accepted` | Accepted      | AC    | check  | `--verdict-accepted`, `-bg`                          |
| Wrong answer          | `wrong`    | Wrong answer  | WA    | cross  | `--verdict-wrong`, `-bg`                             |
| Time limit exceeded   | `time`     | Time limit    | TLE   | clock  | `--verdict-time`, `-bg`                              |
| Memory limit exceeded | `memory`   | Memory limit  | MLE   | stack  | `--verdict-memory`, `-bg`                            |
| Runtime error         | `runtime`  | Runtime error | RE    | bolt   | `--verdict-runtime`, `-bg`                           |
| Compile error         | `compile`  | Compile error | CE    | braces | `--verdict-compile`, `-bg`                           |
| Pending               | `pending`  | Pending       | ...   | dot    | `--verdict-pending`, `-bg`                           |
| Repaired (state)      | `repaired` | Repaired      | Fixed | seam   | `--accent-gold-text`, `--gold-soft`, `--accent-gold` |

Time limit is plum, not amber, so it never reads as gold. Accepted and Wrong answer have near-equal lightness; the icons and labels tell them apart for color-blind readers.

## Contrast

WCAG 2 ratios, computed from the hex values. Text needs 4.5:1; control outlines, focus rings and meaningful icons need 3:1. Every pair passes in both themes.

| Foreground                      | Ground                | Light | Dark  | Needs |
| ------------------------------- | --------------------- | ----- | ----- | ----- |
| `text`                          | `surface`             | 13.58 | 14.41 | 4.5   |
| `text`                          | `surface-raised`      | 14.56 | 13.20 | 4.5   |
| `text`                          | `surface-sunken`      | 12.21 | 15.20 | 4.5   |
| `text`                          | `surface-hover`       | 11.56 | 11.91 | 4.5   |
| `text`                          | `accent-soft`         | 12.42 | 11.78 | 4.5   |
| `text-muted`                    | `surface`             | 6.07  | 7.38  | 4.5   |
| `text-muted`                    | `surface-raised`      | 6.50  | 6.76  | 4.5   |
| `text-muted`                    | `surface-sunken`      | 5.45  | 7.79  | 4.5   |
| `text-muted`                    | `surface-hover`       | 5.16  | 6.10  | 4.5   |
| `accent`                        | `surface`             | 6.30  | 8.14  | 4.5   |
| `accent`                        | `surface-raised`      | 6.76  | 7.45  | 4.5   |
| `accent`                        | `surface-sunken`      | 5.67  | 8.59  | 4.5   |
| `border-strong`                 | `surface`             | 3.76  | 3.82  | 3     |
| `border-strong`                 | `surface-raised`      | 4.03  | 3.49  | 3     |
| `border-strong`                 | `surface-sunken`      | 3.38  | 4.03  | 3     |
| `border-strong`                 | `surface-hover`       | 3.20  | 3.15  | 3     |
| `focus-ring`                    | `surface`             | 6.30  | 8.14  | 3     |
| `focus-ring`                    | `surface-raised`      | 6.76  | 7.45  | 3     |
| `focus-ring`                    | `surface-sunken`      | 5.67  | 8.59  | 3     |
| `focus-ring`                    | `surface-hover`       | 5.37  | 6.73  | 3     |
| `on-accent`                     | `accent`              | 7.04  | 8.59  | 4.5   |
| `on-accent`                     | `accent-hover`        | 8.89  | 10.35 | 4.5   |
| `danger`                        | `surface`             | 5.86  | 6.98  | 4.5   |
| `danger`                        | `surface-raised`      | 6.28  | 6.39  | 4.5   |
| `danger`                        | `surface-sunken`      | 5.26  | 7.36  | 4.5   |
| `on-danger`                     | `danger`              | 6.54  | 7.36  | 4.5   |
| `on-danger`                     | `danger-hover`        | 8.23  | 9.06  | 4.5   |
| `accent-gold`                   | `surface`             | 3.36  | 8.06  | 3     |
| `accent-gold`                   | `surface-raised`      | 3.60  | 7.38  | 3     |
| `accent-gold`                   | `surface-sunken`      | 3.02  | 8.51  | 3     |
| `accent-gold-text`              | `surface`             | 5.09  | 9.29  | 4.5   |
| `accent-gold-text`              | `surface-raised`      | 5.45  | 8.51  | 4.5   |
| `accent-gold-text`              | `surface-sunken`      | 4.57  | 9.80  | 4.5   |
| `accent-gold-text`              | `gold-soft`           | 4.79  | 6.89  | 4.5   |
| `on-gold`                       | `accent-gold`         | 4.79  | 8.06  | 4.5   |
| `surface-raised` (tooltip text) | `text` (tooltip fill) | 14.56 | 13.20 | 4.5   |
| `verdict-accepted`              | `verdict-accepted-bg` | 5.41  | 6.91  | 4.5   |
| `verdict-accepted`              | `surface`             | 5.77  | 9.07  | 4.5   |
| `verdict-accepted`              | `surface-raised`      | 6.18  | 8.30  | 4.5   |
| `verdict-accepted`              | `surface-sunken`      | 5.18  | 9.56  | 4.5   |
| `verdict-wrong`                 | `verdict-wrong-bg`    | 5.26  | 6.65  | 4.5   |
| `verdict-wrong`                 | `surface`             | 5.86  | 7.91  | 4.5   |
| `verdict-wrong`                 | `surface-raised`      | 6.28  | 7.24  | 4.5   |
| `verdict-wrong`                 | `surface-sunken`      | 5.26  | 8.34  | 4.5   |
| `verdict-time`                  | `verdict-time-bg`     | 5.93  | 7.06  | 4.5   |
| `verdict-time`                  | `surface`             | 6.54  | 8.45  | 4.5   |
| `verdict-time`                  | `surface-raised`      | 7.01  | 7.73  | 4.5   |
| `verdict-time`                  | `surface-sunken`      | 5.88  | 8.91  | 4.5   |
| `verdict-memory`                | `verdict-memory-bg`   | 5.32  | 7.31  | 4.5   |
| `verdict-memory`                | `surface`             | 5.75  | 9.24  | 4.5   |
| `verdict-memory`                | `surface-raised`      | 6.17  | 8.46  | 4.5   |
| `verdict-memory`                | `surface-sunken`      | 5.17  | 9.75  | 4.5   |
| `verdict-runtime`               | `verdict-runtime-bg`  | 5.09  | 6.59  | 4.5   |
| `verdict-runtime`               | `surface`             | 5.59  | 8.24  | 4.5   |
| `verdict-runtime`               | `surface-raised`      | 6.00  | 7.54  | 4.5   |
| `verdict-runtime`               | `surface-sunken`      | 5.03  | 8.69  | 4.5   |
| `verdict-compile`               | `verdict-compile-bg`  | 6.15  | 7.48  | 4.5   |
| `verdict-compile`               | `surface`             | 6.84  | 9.06  | 4.5   |
| `verdict-compile`               | `surface-raised`      | 7.33  | 8.29  | 4.5   |
| `verdict-compile`               | `surface-sunken`      | 6.15  | 9.56  | 4.5   |
| `verdict-pending`               | `verdict-pending-bg`  | 5.76  | 6.65  | 4.5   |
| `verdict-pending`               | `surface`             | 6.30  | 8.14  | 4.5   |
| `verdict-pending`               | `surface-raised`      | 6.76  | 7.45  | 4.5   |
| `verdict-pending`               | `surface-sunken`      | 5.67  | 8.59  | 4.5   |

`--border` and `--text-disabled` sit below these floors on purpose: `--border` is decorative, and WCAG exempts disabled controls. Light gold marks on `--surface-sunken` (3.02) are the tightest pass.

## Primitives

| Component         | Props worth knowing                                                                                                                                                   |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Button`          | `variant` primary, secondary (default), ghost, danger; `size` sm, md; `type` defaults to `button`                                                                     |
| `IconButton`      | `icon`, required `label` (becomes `aria-label`), `size`                                                                                                               |
| `Icon`            | `name`, `size` 12, 16, 24; always `aria-hidden`                                                                                                                       |
| `Badge`           | `tone` neutral, accent, gold (repaired only); optional `icon`                                                                                                         |
| `VerdictBadge`    | `verdict`, `short`; `verdictMeta` exports labels, abbreviations, icons                                                                                                |
| `Card`            | `title` (names the region), `actions`                                                                                                                                 |
| `Table`           | `columns` with `numeric`, `mono`, `width`; `caption` (required), `showCaption`, `zebra`, `maxHeight` (sticky header, focusable scroll region), `selectedKey`, `empty` |
| `Input`, `Select` | `label` (required), `help`, `error` (sets `aria-invalid`), `size`; native props pass through                                                                          |
| `Tabs`            | `items`, `label`, controlled `value` or `defaultValue`, `onChange`; arrows, Home, End                                                                                 |
| `EmptyState`      | `title`, children as one line, `icon`, `action`                                                                                                                       |
| `Spinner`         | `label`, `showLabel`, `size`, `announce` (role status; turn off when another region announces)                                                                        |
| `Tooltip`         | `content`, one focusable child, `placement` top or bottom; hover after 400ms, focus at once, Escape hides                                                             |

Keyboard: every control is a native button, input or select, or follows the WAI-ARIA pattern (Tabs). Focus shows `--focus-ring` on `:focus-visible` only.

## Adding a component

1. Check the existing primitives first. Compose before adding.
2. Create `src/ui/<Name>/` with `<Name>.tsx`, `<Name>.css`, `<Name>.test.tsx`. Import the CSS from the component file.
3. Keep it presentational: props in, markup out. No Tauri calls, no `src/lib/api.ts` import, no state beyond UI state (open, hovered, selected tab).
4. Prefix classes with `ui-<name>` and modifiers with `--`, for example `ui-button--primary`.
5. Use tokens only. A new value goes into `src/ui/tokens.css` first, with a semantic name and, for a color, both themes in `light-dark()`. Check contrast for every pair it paints and add rows to the table above.
6. Status needs an icon or a label as well as color. Icons come from `Icon`; add a path there rather than a new library.
7. Use native elements where they exist. Otherwise follow the WAI-ARIA Authoring Practices pattern and test the keys.
8. Test behavior by role and name with Testing Library: accessible name, keyboard, disabled state, every variant class.
9. Add it to `src/features/design/DesignPage.tsx` and to the table above.
