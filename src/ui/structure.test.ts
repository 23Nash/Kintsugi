// Every primitive lives in src/ui/<Name>/ with <Name>.tsx and <Name>.test.tsx.
// Globbing only lists paths; nothing is imported.
import { describe, expect, it } from "vitest";

const files = Object.keys(import.meta.glob("./*/*"));

function missingFiles(paths: readonly string[]): string[] {
  const folders = new Set(paths.map((p) => p.split("/")[1]));
  const missing: string[] = [];
  for (const name of [...folders].sort()) {
    for (const required of [`${name}.tsx`, `${name}.test.tsx`]) {
      const path = `./${name}/${required}`;
      if (!paths.includes(path)) missing.push(path);
    }
  }
  return missing;
}

describe("src/ui layout", () => {
  it("finds the component folders", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it("gives every component folder <Name>.tsx and <Name>.test.tsx", () => {
    expect(missingFiles(files)).toEqual([]);
  });

  it("reports a folder without a test", () => {
    expect(
      missingFiles([
        "./Good/Good.tsx",
        "./Good/Good.test.tsx",
        "./Bad/Bad.tsx",
      ]),
    ).toEqual(["./Bad/Bad.test.tsx"]);
  });
});
