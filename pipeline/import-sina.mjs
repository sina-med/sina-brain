#!/usr/bin/env node
// Imports the Sina site's data into kb/.  Usage:
//   node pipeline/import-sina.mjs --sina ../sina-med.github.io --ocr ../sina-build/hl/lines.json
// Options:
//   --kb <dir>         knowledge-base directory (default: kb)
//   --no-ocr           run without slide text (slides are then recorded with text_origin "none")
//   --date YYYY-MM-DD  date stamped on new or changed registry entries (default: today, UTC)
//   --allow-retire     accept that records which existed before are gone, and mark them retired
//   --dry-run          report what would change without writing
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { loadSina, sinaCommit } from "./lib/sina-load.mjs";
import { transformSina } from "./lib/sina-transform.mjs";
import { readJsonl, writeJsonl, writeIfChanged, removeFile, parseArgs } from "./lib/util.mjs";

const OWNER = "import-sina";

export function runImport(opts) {
  const kb = opts.kb || "kb";
  const date = opts.date || new Date().toISOString().slice(0, 10);
  const log = opts.quiet ? () => {} : console.log;
  if (!opts.sina) throw new Error("--sina <path to a checkout of sina-med.github.io> is required");
  if (!opts.ocr && !opts.noOcr) throw new Error("give --ocr <lines.json>, or --no-ocr to import slides without text");

  const { data } = loadSina(opts.sina);
  const slides = {};
  const slideRoot = join(opts.sina, "files/slides");
  if (existsSync(slideRoot)) for (const d of readdirSync(slideRoot, { withFileTypes: true })) {
    if (d.isDirectory()) slides[d.name] = readdirSync(join(slideRoot, d.name)).filter((f) => f.endsWith(".jpg")).map((f) => f.slice(0, -4));
  }
  const m3dRoot = join(opts.sina, "files/m3d");
  const models = existsSync(m3dRoot) ? readdirSync(m3dRoot).filter((f) => f.endsWith(".glb")).map((f) => f.slice(0, -4)) : [];
  const ocr = opts.ocr ? JSON.parse(readFileSync(opts.ocr, "utf8")) : null;

  const { files, findings, counts, notImported } = transformSina({ sina: data, slides, ocr, models });

  // What did the previous run own?
  const manifestFile = join(kb, "admin/import-sina.json");
  const previous = existsSync(manifestFile) ? JSON.parse(readFileSync(manifestFile, "utf8")) : { files: [] };
  const before = new Map();
  for (const f of previous.files) if (!f.startsWith("relations/")) for (const r of readJsonl(join(kb, f))) before.set(r.id, JSON.stringify(r));

  // Registry: every record ID ever issued.
  const registryFile = join(kb, "admin/id-registry.jsonl");
  const registry = new Map(readJsonl(registryFile).map((r) => [r.id, r]));
  const now = new Map();
  for (const [f, rows] of files) if (!f.startsWith("relations/")) for (const r of rows) now.set(r.id, r);

  let created = 0, changed = 0, revived = 0;
  for (const [id, rec] of now) {
    const e = registry.get(id);
    if (!e) { registry.set(id, { id, type: rec.type, by: OWNER, status: "active", first_seen: date, updated: date }); created++; continue; }
    if (e.by !== OWNER) throw new Error(`${id} is already registered by "${e.by}"; the Sina import will not overwrite it`);
    if (e.status !== "active") { e.status = "active"; e.updated = date; revived++; }
    else if (before.has(id) && before.get(id) !== JSON.stringify(rec)) { e.updated = date; changed++; }
  }
  const gone = [...registry.values()].filter((e) => e.by === OWNER && e.status === "active" && !now.has(e.id));
  if (gone.length && !opts.allowRetire) {
    const byType = {};
    for (const e of gone) byType[e.type] = (byType[e.type] || 0) + 1;
    throw new Error(
      `${gone.length} records that existed before are no longer produced (${JSON.stringify(byType)}).\n` +
      `First few: ${gone.slice(0, 8).map((e) => e.id).join(", ")}\n` +
      `If a question was reworded on Sina, add its alias to js/data/qalias.js there so its ID survives.\n` +
      `If the removal is intended, run again with --allow-retire. Nothing was written.`);
  }
  for (const e of gone) { e.status = "retired"; e.updated = date; }

  const fileList = [...files.keys()].sort();
  const stale = previous.files.filter((f) => !files.has(f));
  const manifest = {
    owner: OWNER, sina_commit: sinaCommit(opts.sina), ocr: ocr ? "supplied" : "not supplied",
    counts: Object.fromEntries(Object.entries(counts).sort()), registry: { active: [...registry.values()].filter((e) => e.status === "active").length, retired: [...registry.values()].filter((e) => e.status === "retired").length },
    findings: countBy(findings, "kind"), not_imported: notImported, files: fileList,
  };

  let written = 0;
  if (!opts.dryRun) {
    for (const [f, rows] of files) if (writeJsonl(join(kb, f), rows)) written++;
    for (const f of stale) removeFile(join(kb, f));
    if (writeJsonl(registryFile, [...registry.values()])) written++;
    if (writeIfChanged(join(kb, "admin/import-sina-findings.json"), JSON.stringify(findings, null, 1) + "\n")) written++;
    if (writeIfChanged(manifestFile, JSON.stringify(manifest, null, 2) + "\n")) written++;
  }
  const summary = { counts: manifest.counts, created, changed, revived, retired: gone.length, filesWritten: written, filesRemoved: opts.dryRun ? 0 : stale.length, findings: manifest.findings };
  log(JSON.stringify(summary, null, 2));
  return summary;
}

function countBy(rows, key) {
  const out = {};
  for (const r of rows) out[r[key]] = (out[r[key]] || 0) + 1;
  return Object.fromEntries(Object.entries(out).sort());
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try { runImport(parseArgs(process.argv.slice(2))); }
  catch (e) { console.error("Import failed: " + e.message); process.exit(1); }
}
