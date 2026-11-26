// Components use the semantic tokens in src/ui/tokens.css, never raw colors.
// tokens.css is the one file that defines raw values.
const rawColorFunctions = [
  "rgb",
  "rgba",
  "hsl",
  "hsla",
  "hwb",
  "lab",
  "lch",
  "oklab",
  "oklch",
  "color",
];

const message = "Use a color token from src/ui/tokens.css.";

/** @type {import("stylelint").Config} */
export default {
  rules: {
    "color-no-hex": [true, { message }],
    "color-named": ["never", { message }],
    "function-disallowed-list": [rawColorFunctions, { message }],
  },
  overrides: [
    {
      files: ["src/ui/tokens.css"],
      rules: {
        "color-no-hex": null,
        "color-named": null,
        "function-disallowed-list": null,
      },
    },
  ],
};
