#!/usr/bin/env node
// Compiles kb/ into static JSON files the read-only application loads. See docs/07-export-schema.md.
// Usage: node pipeline/build-export.mjs [--kb kb] [--out site/data]
// Reads the knowledge base and writes only under the output directory. Deterministic: same input, same bytes.
import { readdirSync, existsSync, rmSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadKb } from "./lib/kb.mjs";
import { writeIfChanged, parseArgs } from "./lib/util.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
export const EXPORT_VERSION = 1;
const AI_LABEL = "AI-generated — not medically verified";
const published = (r) => r.status === "approved" || r.status === "auto-accepted";

export function buildExport(kb = "kb") {
  const { records, relations } = loadKb(kb);
  const rows = records.map((r) => r.row), rels = relations.map((r) => r.row);
  const byId = new Map(rows.map((r) => [r.id, r]));
  const files = new Map();
  const exported = new Set(), excluded = [], usedRel = new Set(), excludedRel = [];
  const take = (r) => { exported.add(r.id); return r; };
  const ord = (a, b) => (a.body.order ?? a.body.n ?? 0) - (b.body.order ?? b.body.n ?? 0) || (a.id < b.id ? -1 : 1);
  const group = (xs, key) => xs.reduce((m, x) => { const k = key(x); if (k) (m.get(k) || m.set(k, []).get(k)).push(x); return m; }, new Map());
  const bySrc = group(rels, (r) => r.src), byDst = group(rels, (r) => r.dst);
  const out = (src, type) => (bySrc.get(src) || []).filter((r) => r.type === type && r.origin === "imported");
  const use = (r) => { usedRel.add(r.id); return r; };
  const origin = (r) => ({ origin: r.origin, verification: r.verification });

  const question = (q) => {
    take(q);
    const b = q.body;
    return { id: q.id, ...origin(q), sina_key: q.ext && q.ext.sina, stem: b.stem, options: b.options, answer: b.answer, multi: b.multi, hint: b.hint, explanation: b.explanation, option_notes: b.option_notes,
      figure_target: b.figure_target, model3d: b.model3d, source_note: b.source_note, answer_key: b.answer_key,
      slides: out(q.id, "cites").map(use).map((r) => ({ id: r.dst, boxes: r.attrs && r.attrs.boxes })),
      models: out(q.id, "references").filter((r) => r.dst.startsWith("m3d:")).map(use).map((r) => ({ id: r.dst, parts: r.attrs && r.attrs.parts })),
      papers: out(q.id, "appears-in").map(use).map((r) => ({ id: r.dst, n: r.attrs && r.attrs.n })),
      tests_lectures: out(q.id, "tests").map(use).map((r) => r.dst) };
  };

  const inLecture = group(rows, (r) => r.lecture);
  const lectureFull = (l) => {
    take(l);
    const mine = inLecture.get(l.id) || [], of = (t) => mine.filter((r) => r.type === t).sort(ord);
    const src = l.source && byId.get(l.source);
    if (src) take(src);
    return { id: l.id, title: l.title, ...origin(l), sina_id: l.ext && l.ext.sina, has_content: !(l.flags || []).includes("no-content"),
      verified_on: l.body.verified_on, build_note: l.body.build_note, exam_points: l.body.exam_points, high_yield: l.body.high_yield, deeper: l.body.deeper, figure: l.body.figure,
      source: src && { id: src.id, title: src.title, url: src.body.url, site_copy: src.body.site_copy },
      sections: of("section").map((s) => ({ id: take(s).id, title: s.title, origin: s.origin, html: s.body.html })),
      slides: of("slide").map((s) => ({ id: take(s).id, n: s.body.n, label: s.body.label, image: s.body.image, text: s.body.text, text_origin: s.body.text_origin })),
      questions: of("mcq").map(question),
      flashcards: of("flashcard").map((c) => ({ id: take(c).id, origin: c.origin, kind: c.body.kind, front: c.body.front, back: c.body.back, figure_target: c.body.figure_target })),
      references: out(l.id, "references").map(use).map((r) => { const x = byId.get(r.dst); take(x); return { id: x.id, title: (r.attrs && r.attrs.title) || x.title, url: x.body.url, kind: x.body.kind, roles: r.attrs && r.attrs.roles, why: r.attrs && r.attrs.why, note: r.attrs && r.attrs.note }; }) };
  };

  // ---- modules (the unit the application loads) and the index
  const lectures = rows.filter((r) => r.type === "lecture");
  const index = { export_version: EXPORT_VERSION, ai_label: AI_LABEL, programs: [], subjects: [], exams: [], models: [] };
  for (const p of rows.filter((r) => r.type === "program").sort((a, b) => (a.id < b.id ? -1 : 1))) index.programs.push({ id: take(p).id, title: p.title });
  for (const s of rows.filter((r) => r.type === "subject").sort((a, b) => (a.body?.order ?? 999) - (b.body?.order ?? 999) || (a.id < b.id ? -1 : 1))) {
    take(s);
    const key = s.id.slice(5), entry = { id: s.id, title: s.title, description: s.description, program: s.program, semester: s.body && s.body.semester, modules: [], papers_file: null };
    for (const m of rows.filter((r) => r.type === "module" && r.subject === s.id).sort(ord)) {
      take(m);
      const file = `modules/${key}/${m.id.split("/")[1]}.json`;
      const full = lectures.filter((l) => l.module === m.id).sort(ord).map(lectureFull);
      files.set(file, { export_version: EXPORT_VERSION, module: { id: m.id, title: m.title }, subject: { id: s.id, title: s.title }, lectures: full });
      entry.modules.push({ id: m.id, title: m.title, file, lectures: full.map((l) => ({ id: l.id, title: l.title, has_content: l.has_content, verification: l.verification,
        counts: { sections: l.sections.length, slides: l.slides.length, questions: l.questions.length, flashcards: l.flashcards.length } })) });
    }
    const papers = rows.filter((r) => r.type === "paper" && r.subject === s.id).sort((a, b) => (a.id < b.id ? -1 : 1));
    const paperQs = rows.filter((r) => r.type === "mcq" && !r.lecture && r.subject === s.id).sort((a, b) => (a.id < b.id ? -1 : 1));
    if (papers.length || paperQs.length) {
      entry.papers_file = `papers/${key}.json`;
      files.set(entry.papers_file, { export_version: EXPORT_VERSION, subject: { id: s.id, title: s.title },
        papers: papers.map((p) => { take(p); const qs = (byDst.get(p.id) || []).filter((r) => r.type === "appears-in").sort((a, b) => (a.attrs?.n ?? 0) - (b.attrs?.n ?? 0) || (a.src < b.src ? -1 : 1)); return { id: p.id, title: p.title, origin: p.origin, year: p.body.year, note: p.body.note, links: p.body.links, answer_key: p.body.answer_key, questions: qs.map((r) => r.src) }; }),
        questions: paperQs.map(question) });
    }
    entry.counts = { lectures: entry.modules.reduce((a, m) => a + m.lectures.length, 0), papers: papers.length };
    index.subjects.push(entry);
  }
  for (const e of rows.filter((r) => r.type === "exam").sort((a, b) => (a.id < b.id ? -1 : 1))) { take(e); (bySrc.get(e.id) || []).filter((r) => r.type === "covers").forEach(use); index.exams.push({ id: e.id, title: e.title, program: e.program, subject: e.subject, date: e.body.date, groups: e.body.groups, notes: e.body.notes }); }
  for (const m of rows.filter((r) => r.type === "model3d").sort((a, b) => (a.id < b.id ? -1 : 1))) { take(m); index.models.push({ id: m.id, title: m.title, file: m.body.file, parts: m.body.parts, attribution: m.body.attribution, licence: m.body.licence }); }
  files.set("index.json", index);

  // ---- AI layer: only what may be shown, always labelled
  const concepts = rows.filter((r) => r.type === "concept");
  const shown = concepts.filter(published).sort((a, b) => (a.id < b.id ? -1 : 1));
  const shownIds = new Set(shown.map((c) => c.id));
  for (const c of concepts) if (!published(c)) excluded.push({ id: c.id, reason: `concept status is ${c.status}` });
  const aiRels = rels.filter((r) => r.origin === "ai").sort((a, b) => (a.id < b.id ? -1 : 1));
  const okEnd = (id) => (id.startsWith("c:") ? shownIds.has(id) : byId.has(id));
  const aiOut = [];
  for (const r of aiRels) {
    if (!published(r)) excludedRel.push({ id: r.id, type: r.type, reason: `status is ${r.status}` });
    else if (!okEnd(r.src) || !okEnd(r.dst)) excludedRel.push({ id: r.id, type: r.type, reason: "an end is not published" });
    else { usedRel.add(r.id); aiOut.push({ id: r.id, src: r.src, type: r.type, dst: r.dst, status: r.status, confidence: r.confidence, reviewed_by: r.reviewed_by, statement: r.rationale, evidence: r.provenance, lectures: r.attrs && r.attrs.lectures }); }
  }
  files.set("concepts.json", { export_version: EXPORT_VERSION, label: AI_LABEL,
    concepts: shown.map((c) => { take(c); const defs = c.body.definitions; return { id: c.id, title: c.title, kind: c.body.kind, aliases: c.body.aliases, importance: c.body.importance, status: c.status, verification: c.verification, confidence: c.confidence, reviewed_by: c.reviewed_by, lectures: c.body.lectures,
      definitions: defs.filter(published).map((d) => ({ lecture: d.lecture, text: d.text, status: d.status, confidence: d.confidence, evidence: d.evidence })),
      definitions_held: defs.filter((d) => !published(d)).length,
      held_evidence: defs.filter((d) => !published(d)).flatMap((d) => (d.evidence || []).map((e) => ({ lecture: d.lecture, ...e }))) }; }),
    relations: aiOut });

  // ---- nothing leaves silently: every record and relation is exported or listed with a reason
  for (const r of rows) if (!exported.has(r.id) && !excluded.some((x) => x.id === r.id)) excluded.push({ id: r.id, reason: r.type === "resource" ? "resource not referenced by any lecture" : `no place in the export for type ${r.type}` });
  for (const r of rels) if (!usedRel.has(r.id) && !excludedRel.some((x) => x.id === r.id)) excludedRel.push({ id: r.id, type: r.type, reason: "relation type not carried by the export" });
  const tally = (xs, f) => Object.fromEntries(Object.entries(xs.reduce((a, x) => ((a[f(x)] = (a[f(x)] || 0) + 1), a), {})).sort());
  const manifest = { export_version: EXPORT_VERSION,
    records: { in_knowledge_base: rows.length, exported: exported.size, excluded: excluded.length, by_type: tally(rows, (r) => r.type), exported_by_type: tally(rows.filter((r) => exported.has(r.id)), (r) => r.type) },
    relations: { in_knowledge_base: rels.length, exported: usedRel.size, excluded: excludedRel.length, exported_by_type: tally(rels.filter((r) => usedRel.has(r.id)), (r) => r.type), excluded_by_reason: tally(excludedRel, (r) => `${r.type}: ${r.reason}`) },
    excluded_records: excluded.sort((a, b) => (a.id < b.id ? -1 : 1)),
    omitted_fields: ["slide.body.lines (line boxes; text is kept)", "lecture.body.visual_kinds", "registry dates"],
    files: [...files.keys()].sort() };
  files.set("export-manifest.json", manifest);
  return { files, manifest };
}

function listFiles(dir, rel = "") {
  if (!existsSync(join(dir, rel))) return [];
  return readdirSync(join(dir, rel), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? listFiles(dir, join(rel, e.name)) : [join(rel, e.name)]));
}

export function writeExport(kb, outDir) {
  const { files, manifest } = buildExport(kb);
  let written = 0, bytes = 0;
  for (const [f, data] of files) { const text = JSON.stringify(data) + "\n"; bytes += text.length; if (writeIfChanged(join(outDir, f), text)) written++; }
  const stale = listFiles(outDir).filter((f) => !files.has(f.split("\\").join("/")));
  for (const f of stale) rmSync(join(outDir, f));
  return { files: files.size, written, removed: stale.length, bytes, largest: [...files.keys()].map((f) => [f, statSync(join(outDir, f)).size]).sort((a, b) => b[1] - a[1]).slice(0, 3), records: manifest.records, relations: manifest.relations };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const o = parseArgs(process.argv.slice(2));
  console.log(JSON.stringify(writeExport(o.kb || join(root, "kb"), o.out || join(root, "site/data")), null, 1));
}
