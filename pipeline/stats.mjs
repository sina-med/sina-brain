#!/usr/bin/env node
// Writes kb/admin/stats.json and kb/admin/COVERAGE.md from what is actually in the knowledge base.
// Usage: node pipeline/stats.mjs [--kb kb]
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { loadKb } from "./lib/kb.mjs";
import { parseArgs, writeIfChanged } from "./lib/util.mjs";

export function computeStats(kb = "kb") {
  const { records, relations, registry } = loadKb(kb);
  const rows = records.map((r) => r.row);
  const byId = new Map(rows.map((r) => [r.id, r]));
  const inc = (o, k, n = 1) => { o[k] = (o[k] || 0) + n; };

  const byType = {}, byOrigin = {}, byStatus = {}, relByType = {}, relByOrigin = {}, relByStatus = {};
  for (const r of rows) { inc(byType, r.type); inc(byOrigin, r.origin); inc(byStatus, r.status); }
  for (const { row } of relations) { inc(relByType, row.type); inc(relByOrigin, row.origin); inc(relByStatus, row.status); }

  const cited = new Set(), tested = new Set(), conceptTested = new Set(), conceptOf = new Set();
  for (const { row } of relations) {
    if (row.status !== "approved") continue;
    if (row.type === "cites") cited.add(row.src);
    if (row.type === "tests" && row.dst.startsWith("c:")) { conceptOf.add(row.src); conceptTested.add(row.dst); }
    if (row.type === "tests" && row.dst.startsWith("lec:")) tested.add(row.src);
  }

  // per lecture, then rolled up per subject
  const lec = new Map();
  const L = (id) => { if (!lec.has(id)) lec.set(id, { sections: 0, mcqs: 0, mcqs_citing_slide: 0, mcqs_with_concept: 0, flashcards: 0, slides: 0, slides_with_text: 0 }); return lec.get(id); };
  for (const r of rows) {
    if (r.type === "lecture") L(r.id);
    if (!r.lecture) continue;
    const x = L(r.lecture);
    if (r.type === "section") x.sections++;
    if (r.type === "flashcard") x.flashcards++;
    if (r.type === "slide") { x.slides++; if (r.body.text_origin !== "none") x.slides_with_text++; }
    if (r.type === "mcq") { x.mcqs++; if (cited.has(r.id)) x.mcqs_citing_slide++; if (conceptOf.has(r.id)) x.mcqs_with_concept++; }
  }
  const subjects = {};
  const gaps = { lectures_without_content: [], lectures_without_slides: [], lectures_without_source: [], lectures_unverified: [], lectures_with_untexted_slides: [] };
  for (const r of rows.filter((x) => x.type === "lecture")) {
    const s = subjects[r.subject] || (subjects[r.subject] = { title: (byId.get(r.subject) || {}).title, lectures: 0, lectures_with_content: 0, sections: 0, mcqs: 0, mcqs_citing_slide: 0, paper_mcqs: 0, flashcards: 0, slides: 0, slides_with_text: 0, concepts: 0 });
    const x = lec.get(r.id), empty = (r.flags || []).includes("no-content");
    s.lectures++; if (!empty) s.lectures_with_content++;
    for (const k of ["sections", "mcqs", "mcqs_citing_slide", "flashcards", "slides", "slides_with_text"]) s[k] += x[k];
    if (empty) { gaps.lectures_without_content.push(r.id); continue; }
    if (!x.slides) gaps.lectures_without_slides.push(r.id);
    else if (x.slides_with_text < x.slides) gaps.lectures_with_untexted_slides.push({ id: r.id, missing: x.slides - x.slides_with_text, of: x.slides });
    if (!r.source) gaps.lectures_without_source.push(r.id);
    if (r.verification === "unverified") gaps.lectures_unverified.push(r.id);
  }
  for (const r of rows) {
    if (r.type === "mcq" && !r.lecture && subjects[r.subject]) subjects[r.subject].paper_mcqs++;
    if (r.type === "concept" && subjects[r.subject]) subjects[r.subject].concepts++;
  }

  const mcqs = rows.filter((r) => r.type === "mcq");
  const slides = rows.filter((r) => r.type === "slide");
  const concepts = rows.filter((r) => r.type === "concept");
  const imp = existsSync(join(kb, "admin/import-sina.json")) ? JSON.parse(readFileSync(join(kb, "admin/import-sina.json"), "utf8")) : {};
  const lectureCount = byType.lecture || 0;

  return {
    sina_commit: imp.sina_commit || null,
    resources: {
      // "Resource" here means a lecture: the unit that goes through knowledge preparation.
      discovered: lectureCount,
      imported: lectureCount - gaps.lectures_without_content.length,
      inaccessible: gaps.lectures_without_content.length,
      knowledge_prepared: 0,
      awaiting_knowledge_preparation: lectureCount - gaps.lectures_without_content.length,
    },
    records: { total: rows.length, by_type: sort(byType), by_origin: sort(byOrigin), by_status: sort(byStatus) },
    relations: { total: relations.length, by_type: sort(relByType), by_origin: sort(relByOrigin), by_status: sort(relByStatus) },
    concepts: { total: concepts.length, approved: concepts.filter((c) => c.status === "approved").length, awaiting_review: concepts.filter((c) => c.status === "proposed").length, tested_by_a_question: conceptTested.size },
    questions: {
      total: mcqs.length, in_lectures: mcqs.filter((q) => q.lecture).length, in_papers_only: mcqs.filter((q) => !q.lecture).length,
      citing_a_slide: mcqs.filter((q) => cited.has(q.id)).length, linked_to_a_concept: mcqs.filter((q) => conceptOf.has(q.id)).length,
      paper_questions_linked_to_a_lecture: mcqs.filter((q) => !q.lecture && tested.has(q.id)).length,
      answer_key_written_by_sina: mcqs.filter((q) => q.body.answer_key).length,
    },
    slides: { total: slides.length, with_text: slides.filter((s) => s.body.text_origin !== "none").length, without_text: slides.filter((s) => s.body.text_origin === "none").length },
    duplicates: { repeated_questions_merged: (imp.findings || {})["question-repeated"] || 0, proposed: relByType["duplicate-of"] || 0 },
    verification: { lectures_sina_verified: rows.filter((r) => r.type === "lecture" && r.verification === "sina-verified").length, lectures_unverified: gaps.lectures_unverified.length, records_checked_in_brain: rows.filter((r) => r.verification === "checked-against-source" || r.verification === "expert-reviewed").length },
    registry: { active: registry.filter((e) => e.status === "active").length, retired: registry.filter((e) => e.status === "retired").length, merged: registry.filter((e) => e.status === "merged").length },
    import_findings: imp.findings || {},
    not_imported: imp.not_imported || [],
    gaps,
    subjects: Object.fromEntries(Object.entries(subjects).sort()),
  };
}

const sort = (o) => Object.fromEntries(Object.entries(o).sort());

export function coverageMarkdown(s) {
  const n = (x) => Number(x).toLocaleString("en-GB");
  const pct = (a, b) => (b ? Math.round((a / b) * 100) + "%" : "–");
  const out = [];
  out.push("# Knowledge base coverage", "", "Generated by `npm run stats` from the contents of `kb/`. Do not edit by hand.", "");
  if (s.sina_commit) out.push(`Imported from Sina commit \`${s.sina_commit.slice(0, 7)}\`.`, "");
  out.push("## Progress", "", "| Measure | Count |", "|---|---|",
    `| Lectures discovered | ${n(s.resources.discovered)} |`,
    `| Lectures imported | ${n(s.resources.imported)} |`,
    `| Lectures with no content available | ${n(s.resources.inaccessible)} |`,
    `| Lectures through knowledge preparation | ${n(s.resources.knowledge_prepared)} |`,
    `| Lectures awaiting knowledge preparation | ${n(s.resources.awaiting_knowledge_preparation)} |`,
    `| Records | ${n(s.records.total)} |`,
    `| Relations | ${n(s.relations.total)} (${n(s.relations.by_status.proposed || 0)} awaiting review) |`,
    `| Concepts | ${n(s.concepts.total)} (${n(s.concepts.awaiting_review)} awaiting review) |`,
    `| Repeated questions merged into one record | ${n(s.duplicates.repeated_questions_merged)} |`,
    `| Records checked inside Sina Brain | ${n(s.verification.records_checked_in_brain)} |`, "");
  out.push("## Records by type", "", "| Type | Count |", "|---|---|", ...Object.entries(s.records.by_type).map(([k, v]) => `| ${k} | ${n(v)} |`), "");
  out.push("## Relations by type", "", "| Type | Count |", "|---|---|", ...Object.entries(s.relations.by_type).map(([k, v]) => `| ${k} | ${n(v)} |`), "");
  out.push("## Questions", "", "| Measure | Count |", "|---|---|",
    `| Questions | ${n(s.questions.total)} |`,
    `| In lectures | ${n(s.questions.in_lectures)} |`,
    `| In past papers only | ${n(s.questions.in_papers_only)} |`,
    `| Citing at least one slide | ${n(s.questions.citing_a_slide)} (${pct(s.questions.citing_a_slide, s.questions.total)}) |`,
    `| Paper questions linked to a lecture | ${n(s.questions.paper_questions_linked_to_a_lecture)} of ${n(s.questions.in_papers_only)} |`,
    `| Answer key written by Sina, not official | ${n(s.questions.answer_key_written_by_sina)} |`,
    `| Linked to a concept | ${n(s.questions.linked_to_a_concept)} |`, "");
  out.push("## Slides", "", `${n(s.slides.total)} slides, ${n(s.slides.with_text)} with text (${pct(s.slides.with_text, s.slides.total)}), ${n(s.slides.without_text)} without.`, "");
  out.push("## By subject", "", "| Subject | Lectures | Sections | Lecture MCQs | Citing a slide | Paper MCQs | Flashcards | Slides | With text | Concepts |", "|---|---|---|---|---|---|---|---|---|---|");
  for (const [id, x] of Object.entries(s.subjects)) out.push(`| ${x.title || id} | ${x.lectures_with_content}/${x.lectures} | ${n(x.sections)} | ${n(x.mcqs)} | ${pct(x.mcqs_citing_slide, x.mcqs)} | ${n(x.paper_mcqs)} | ${n(x.flashcards)} | ${n(x.slides)} | ${pct(x.slides_with_text, x.slides)} | ${n(x.concepts)} |`);
  out.push("", "## Gaps", "");
  const list = (title, ids) => { out.push(`**${title}: ${ids.length}**`, ""); if (ids.length) out.push(ids.map((x) => "`" + x + "`").join(", "), ""); };
  list("Lectures listed on Sina with no content", s.gaps.lectures_without_content);
  list("Lectures without slide images", s.gaps.lectures_without_slides);
  list("Lectures without a source file", s.gaps.lectures_without_source);
  list("Lectures not marked verified on Sina", s.gaps.lectures_unverified);
  out.push(`**Lectures where some slides have no text: ${s.gaps.lectures_with_untexted_slides.length}**`, "");
  if (s.gaps.lectures_with_untexted_slides.length) out.push("| Lecture | Slides without text |", "|---|---|", ...s.gaps.lectures_with_untexted_slides.map((x) => `| \`${x.id}\` | ${x.missing} of ${x.of} |`), "");
  out.push("## Import findings", "", "Full list in `kb/admin/import-sina-findings.json`.", "", "| Finding | Count |", "|---|---|", ...Object.entries(s.import_findings).map(([k, v]) => `| ${k} | ${n(v)} |`), "");
  out.push("## Not imported from Sina", "", ...s.not_imported.map((x) => `- ${x}`), "");
  return out.join("\n");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const kb = parseArgs(process.argv.slice(2)).kb || "kb";
  const s = computeStats(kb);
  writeIfChanged(join(kb, "admin/stats.json"), JSON.stringify(s, null, 2) + "\n");
  writeIfChanged(join(kb, "admin/COVERAGE.md"), coverageMarkdown(s));
  console.log(`Records ${s.records.total}, relations ${s.relations.total}, concepts ${s.concepts.total}. Wrote ${kb}/admin/stats.json and COVERAGE.md.`);
}
