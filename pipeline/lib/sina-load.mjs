// Loads the Sina site's data files without running the site.
// The files assign to window.SINA, so they are evaluated in an isolated VM context.
import vm from "node:vm";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

export function loadSina(siteDir) {
  const indexFile = join(siteDir, "index.html");
  if (!existsSync(indexFile)) throw new Error(`Not a Sina site checkout (no index.html): ${siteDir}`);
  const html = readFileSync(indexFile, "utf8");
  const scripts = [...html.matchAll(/<script src="(js\/(?:i18n\.js|data\/[^"]+))"/g)].map((m) => m[1]);
  if (!scripts.length) throw new Error("index.html lists no data scripts; has the site layout changed?");
  const sandbox = {};
  sandbox.window = sandbox;
  const ctx = vm.createContext(sandbox);
  for (const s of scripts) {
    const file = join(siteDir, s);
    if (!existsSync(file)) throw new Error(`index.html refers to a missing file: ${s}`);
    vm.runInContext(readFileSync(file, "utf8"), ctx, { filename: s, timeout: 20000 });
  }
  if (!sandbox.SINA || !sandbox.SINA.subjects || !sandbox.SINA.lectures) throw new Error("SINA data did not load");
  // Round-trip through JSON so the result is plain data from this realm.
  return { data: JSON.parse(JSON.stringify(sandbox.SINA)), scripts };
}

/** Commit of the Sina checkout, for the import manifest. Null when it is not a git checkout. */
export function sinaCommit(siteDir) {
  try { return execFileSync("git", ["-C", siteDir, "rev-parse", "HEAD"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(); }
  catch { return null; }
}
