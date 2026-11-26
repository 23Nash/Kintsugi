import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import prettier from "eslint-config-prettier";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig([
  globalIgnores(["dist", "target", "src-tauri", "node_modules"]),
  {
    files: ["**/*.{ts,tsx,js}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    // Components call src/lib/api.ts, never invoke directly.
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/lib/api.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@tauri-apps/*"],
              message: "Import Tauri through src/lib/api.ts.",
            },
          ],
        },
      ],
    },
  },
  // Last: turn off rules that conflict with Prettier.
  prettier,
]);
