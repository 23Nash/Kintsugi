// Manual theme override. "system" follows prefers-color-scheme.

export type Theme = "system" | "light" | "dark";

/** Sets or clears `data-theme` on <html>. */
export function applyTheme(
  theme: Theme,
  root: HTMLElement = document.documentElement,
): void {
  if (theme === "system") {
    delete root.dataset.theme;
  } else {
    root.dataset.theme = theme;
  }
}

/** Reads the current override from <html>. */
export function currentTheme(
  root: HTMLElement = document.documentElement,
): Theme {
  const value = root.dataset.theme;
  return value === "light" || value === "dark" ? value : "system";
}
