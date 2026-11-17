import { expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";

// No absolute-path literals in tracked files: the scanner is ay/tools/paths.ts in the sibling checkout (WORKSPACE_ROOT or the parent directory).
const root = resolve(import.meta.dir, "..");
const scanner = join(process.env.WORKSPACE_ROOT ?? resolve(root, ".."), "ay", "tools", "paths.ts");

test.skipIf(!existsSync(scanner))("tracked files hold no hardcoded absolute paths", async () => {
  const { scanRepo, allowFile, parseAllow } = await import(scanner);
  const af = allowFile(root);
  const allow = af ? parseAllow(await Bun.file(af).text()) : [];
  expect(scanRepo(root, allow).map((f: { file: string; line: number; match: string }) => `${f.file}:${f.line} ${f.match}`)).toEqual([]);
});
