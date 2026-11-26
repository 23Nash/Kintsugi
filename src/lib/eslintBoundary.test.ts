// @vitest-environment node
import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

const eslint = new ESLint();

async function lint(filePath: string, source: string) {
  const [result] = await eslint.lintText(source, { filePath });
  return result.messages.filter((m) => m.severity === 2);
}

describe("tauri import boundary", () => {
  it.each(["@tauri-apps/api", "@tauri-apps/api/core", "@tauri-apps/api/event"])(
    "rejects %s outside api.ts",
    async (mod) => {
      const messages = await lint(
        "src/features/example/Example.ts",
        `import * as t from "${mod}";\nexport const x = t;\n`,
      );
      expect(messages.map((m) => m.ruleId)).toContain("no-restricted-imports");
    },
  );

  it("allows @tauri-apps/api/event in api.ts", async () => {
    const messages = await lint(
      "src/lib/api.ts",
      `import * as t from "@tauri-apps/api/event";\nexport const x = t;\n`,
    );
    expect(messages).toEqual([]);
  });
});
