import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";

export const sha1 = (s) => createHash("sha1").update(s).digest("hex");
export const shortHash = (s, n = 12) => sha1(s).slice(0, n);

export function slug(s) {
  return String(s).normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

/** Plain text from an HTML fragment. Good enough for search text and statistics, not for display. */
export function stripHtml(html) {
  return String(html || "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\s+/g, " ").trim();
}

/** Remove undefined, null, empty strings, empty arrays and empty objects, so records stay small and stable. */
export function compact(o) {
  if (Array.isArray(o)) return o.map(compact);
  if (o && typeof o === "object") {
    const out = {};
    for (const [k, v] of Object.entries(o)) {
      if (v === undefined || v === null || v === "") continue;
      const c = compact(v);
      if (Array.isArray(c) && c.length === 0) continue;
      if (c && typeof c === "object" && !Array.isArray(c) && Object.keys(c).length === 0) continue;
      out[k] = c;
    }
    return out;
  }
  return o;
}

const byId = (a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

export function readJsonl(file) {
  if (!existsSync(file)) return [];
  return readFileSync(file, "utf8").split("\n").filter(Boolean).map((line, i) => {
    try { return JSON.parse(line); } catch (e) { throw new Error(`${file}:${i + 1}: ${e.message}`); }
  });
}

/** Write records sorted by id, one per line. Returns true when the file content changed. */
export function writeJsonl(file, rows) {
  const text = rows.slice().sort(byId).map((r) => JSON.stringify(r)).join("\n") + (rows.length ? "\n" : "");
  return writeIfChanged(file, text);
}

export function writeIfChanged(file, text) {
  if (existsSync(file) && readFileSync(file, "utf8") === text) return false;
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, text);
  return true;
}

/** Every *.jsonl file below dir, as paths relative to dir. */
export function listJsonl(dir, rel = "") {
  if (!existsSync(join(dir, rel))) return [];
  const out = [];
  for (const e of readdirSync(join(dir, rel), { withFileTypes: true })) {
    const p = rel ? rel + "/" + e.name : e.name;
    if (e.isDirectory()) out.push(...listJsonl(dir, p));
    else if (e.name.endsWith(".jsonl")) out.push(p);
  }
  return out.sort();
}

export function removeFile(file) { if (existsSync(file)) rmSync(file); }

export function parseArgs(argv, defaults = {}) {
  const a = { ...defaults };
  for (let i = 0; i < argv.length; i++) {
    const m = /^--([a-z-]+)(?:=(.*))?$/.exec(argv[i]);
    if (!m) continue;
    const k = m[1].replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    if (m[2] !== undefined) a[k] = m[2];
    else if (i + 1 < argv.length && !argv[i + 1].startsWith("--")) a[k] = argv[++i];
    else a[k] = true;
  }
  return a;
}
