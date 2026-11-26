// PostToolUse hook for Write and Edit: formats the edited file with the
// project's Prettier, so a later `pnpm format` does not rewrite files the
// agent has already read. Never blocks: on any problem it exits 0.
import { readFile, writeFile } from "node:fs/promises";
import { join, relative, isAbsolute } from "node:path";

async function main() {
  let input = "";
  for await (const chunk of process.stdin) input += chunk;
  const file = JSON.parse(input)?.tool_input?.file_path;
  const root = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
  if (!file) return;

  const rel = relative(root, file);
  if (rel.startsWith("..") || isAbsolute(rel)) return; // outside the repo

  const prettier = await import("prettier");
  const info = await prettier.getFileInfo(file, {
    ignorePath: [join(root, ".gitignore"), join(root, ".prettierignore")],
  });
  if (info.ignored || !info.inferredParser) return;

  const source = await readFile(file, "utf8");
  const options = (await prettier.resolveConfig(file)) ?? {};
  const formatted = await prettier.format(source, {
    ...options,
    filepath: file,
  });
  if (formatted !== source) await writeFile(file, formatted);
}

main().catch(() => process.exit(0));
