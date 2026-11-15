import "./Icon.css";

// 16px grid, 1.5px stroke, currentColor. Paths are drawn in a 16x16 box.
const paths = {
  check: <path d="M3.5 8.5l3 3 6-7" />,
  cross: <path d="M4 4l8 8M12 4l-8 8" />,
  clock: (
    <>
      <circle cx="8" cy="8" r="6" />
      <path d="M8 4.75V8l2.25 1.5" />
    </>
  ),
  stack: <path d="M3 4.5h10M3 8h10M3 11.5h10" />,
  bolt: <path d="M9 1.75L4 9h4l-1 5.25L12 7H8z" />,
  braces: (
    <path d="M6 2.5C4 2.5 4.75 7.25 2.75 8 4.75 8.75 4 13.5 6 13.5M10 2.5c2 0 1.25 4.75 3.25 5.5-2 .75-1.25 5.5-3.25 5.5" />
  ),
  dot: <circle cx="8" cy="8" r="4.5" />,
  seam: <path d="M1.75 9.5l3.25-3 2.75 3.5 2.75-5 3.75 2.25" />,
  refresh: (
    <>
      <path d="M13 8a5 5 0 1 1-1.46-3.54" />
      <path d="M13 2.5v3h-3" />
    </>
  ),
  close: <path d="M4.5 4.5l7 7M11.5 4.5l-7 7" />,
  "chevron-down": <path d="M4 6l4 4 4-4" />,
  inbox: (
    <>
      <path d="M2 9.5h3.5l1 2h3l1-2H14" />
      <path d="M3.5 3.5h9L14 9.5V13H2V9.5z" />
    </>
  ),
} as const;

export type IconName = keyof typeof paths;

export const iconNames = Object.keys(paths) as IconName[];

export type IconProps = {
  name: IconName;
  /** Rendered size in px. 12 inside badges, 16 elsewhere. */
  size?: 12 | 16 | 24;
  className?: string;
};

/** Decorative icon. Always aria-hidden: pair it with a visible or aria label. */
export function Icon({ name, size = 16, className }: IconProps) {
  return (
    <svg
      className={className ? `ui-icon ${className}` : "ui-icon"}
      width={size}
      height={size}
      viewBox="0 0 16 16"
      aria-hidden="true"
      focusable="false"
      data-icon={name}
    >
      {paths[name]}
    </svg>
  );
}
