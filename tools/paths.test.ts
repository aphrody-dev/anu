import { expect, test } from "bun:test";
import { existsSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";

// No absolute-path literals in tracked files. The scanner is a pinned file of another repository (anu.toml [scanner]), fetched once into the
// gitignored .cache/ of this repository; ANU_PATHS_SCANNER overrides it with a local file. Without either (offline), the test is skipped.
const root = resolve(import.meta.dir, "..");
const cfg = Bun.TOML.parse(await Bun.file(join(root, "anu.toml")).text()) as { scanner: { repo: string; rev: string; path: string } };

async function resolveScanner(): Promise<string | null> {
  if (process.env.ANU_PATHS_SCANNER && existsSync(process.env.ANU_PATHS_SCANNER)) return resolve(process.env.ANU_PATHS_SCANNER);
  const { repo, rev, path } = cfg.scanner;
  const cached = join(root, ".cache", "scanner", rev, path.split("/").pop()!);
  if (existsSync(cached)) return cached;
  try {
    const res = await fetch(`https://raw.githubusercontent.com/${repo}/${rev}/${path}`);
    if (!res.ok) return null;
    mkdirSync(join(cached, ".."), { recursive: true });
    await Bun.write(cached, await res.text());
    return cached;
  } catch {
    return null;
  }
}

const scanner = await resolveScanner();

test.skipIf(!scanner)("tracked files hold no hardcoded absolute paths", async () => {
  const { scanRepo, allowFile, parseAllow } = await import(scanner!);
  const af = allowFile(root);
  const allow = af ? parseAllow(await Bun.file(af).text()) : [];
  expect(scanRepo(root, allow).map((f: { file: string; line: number; match: string }) => `${f.file}:${f.line} ${f.match}`)).toEqual([]);
});
