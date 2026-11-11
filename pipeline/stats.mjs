#!/usr/bin/env node
// Writes kb/admin/stats.json and kb/admin/COVERAGE.md from what is actually in the knowledge base.
// Usage: node pipeline/stats.mjs [--kb kb]
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { loadKb } from "./lib/kb.mjs";
import { parseArgs, writeIfChanged, readJsonl } from "./lib/util.mjs";

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

  // knowledge preparation (Phase 4)
  const manifest = readJsonl(join(kb, "admin/prep-manifest.jsonl"));
  const queue = readJsonl(join(kb, "admin/review-queue.jsonl"));
  const done = manifest.filter((m) => m.state === "done"), failedPrep = manifest.filter((m) => m.state === "failed");
  const sum = (xs, f) => xs.reduce((a, x) => a + (Number(f(x)) || 0), 0);
  const tally = (xs, f) => sort(xs.reduce((a, x) => { const k = f(x); a[k] = (a[k] || 0) + 1; return a; }, {}));
  const aiRel = relations.map((r) => r.row).filter((r) => r.origin === "ai");
  const semantic = aiRel.filter((r) => !["covers", "tests", "explains"].includes(r.type));
  const eligible = lectureCount - gaps.lectures_without_content.length;
  const preparation = {
    lectures_eligible: eligible, lectures_processed: done.length, lectures_remaining: eligible - done.length, lectures_failed: failedPrep.length,
    failed: failedPrep.map((m) => ({ id: m.id, error: m.error, attempts: m.attempts })),
    summaries_generated: done.length,
    concepts: { total: concepts.length, by_status: tally(concepts, (c) => c.status), by_confidence: tally(concepts, (c) => c.confidence), found_in_more_than_one_lecture: concepts.filter((c) => c.body.lectures.length > 1).length },
    definitions: { total: sum(concepts, (c) => c.body.definitions.length), shown: sum(concepts, (c) => c.body.definitions.filter((d) => d.status === "auto-accepted" || d.status === "approved").length), held: sum(concepts, (c) => c.body.definitions.filter((d) => d.status === "proposed").length) },
    relationships: { suggested: semantic.length, by_status: tally(semantic, (r) => r.status), by_confidence: tally(semantic, (r) => r.confidence), by_type: tally(semantic, (r) => r.type) },
    links: { question_or_card_to_concept: aiRel.filter((r) => r.type === "tests").length, section_or_slide_to_concept: aiRel.filter((r) => r.type === "explains").length, lecture_to_concept: aiRel.filter((r) => r.type === "covers").length },
    evidence: { average_share_found_word_for_word: done.length ? Math.round((sum(done, (m) => m.evidence_exact_share) / done.length) * 1000) / 1000 : null, items_dropped: sum(done, (m) => m.dropped) },
    review_queue: { total: queue.length, by_reason: tally(queue, (q) => q.reason), by_severity: tally(queue, (q) => q.severity) },
    duplicates: { contributions_merged_automatically: sum(concepts, (c) => c.body.definitions.length - 1), possible_duplicates_for_review: queue.filter((q) => q.reason === "possible-duplicate").length },
    processing: { worker_seconds: sum(done, (m) => m.seconds), worker_tokens: sum(done, (m) => m.tokens), audit_seconds: sum(done, (m) => m.audit && m.audit.seconds), audit_tokens: sum(done, (m) => m.audit && m.audit.tokens), lectures_audited: done.filter((m) => m.audit && m.audit.state === "done").length, packet_characters: sum(done, (m) => m.packet_chars) },
  };

  return {
    sina_commit: imp.sina_commit || null,
    resources: {
      // "Resource" here means a lecture: the unit that goes through knowledge preparation.
      discovered: lectureCount,
      imported: lectureCount - gaps.lectures_without_content.length,
      inaccessible: gaps.lectures_without_content.length,
      knowledge_prepared: done.length,
      awaiting_knowledge_preparation: eligible - done.length,
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
    preparation,
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
  const p = s.preparation, kv = (o) => Object.entries(o).map(([k, v]) => `${k} ${n(v)}`).join(", ") || "none";
  out.push("## Knowledge preparation", "", "AI-prepared content. None of it is medically verified; “shown” means it passed automated source checks and is displayed with an “AI-generated — not medically verified” label.", "",
    "| Measure | Count |", "|---|---|",
    `| Lectures eligible | ${n(p.lectures_eligible)} |`,
    `| Lectures processed | ${n(p.lectures_processed)} |`,
    `| Lectures remaining | ${n(p.lectures_remaining)} |`,
    `| Failed extractions | ${n(p.lectures_failed)} |`,
    `| Summaries generated | ${n(p.summaries_generated)} |`,
    `| Concepts extracted | ${n(p.concepts.total)} (${kv(p.concepts.by_status)}) |`,
    `| Concepts by confidence | ${kv(p.concepts.by_confidence)} |`,
    `| Concept definitions | ${n(p.definitions.total)}: ${n(p.definitions.shown)} shown, ${n(p.definitions.held)} held for review |`,
    `| Relationships suggested | ${n(p.relationships.suggested)} (${kv(p.relationships.by_status)}) |`,
    `| Relationships by confidence | ${kv(p.relationships.by_confidence)} |`,
    `| Question and flashcard links to concepts | ${n(p.links.question_or_card_to_concept)} |`,
    `| Section and slide links to concepts | ${n(p.links.section_or_slide_to_concept)} |`,
    `| Quotations found word for word (average per lecture) | ${p.evidence.average_share_found_word_for_word === null ? "–" : Math.round(p.evidence.average_share_found_word_for_word * 1000) / 10 + "%"} |`,
    `| Items dropped for structural errors | ${n(p.evidence.items_dropped)} |`,
    `| Duplicate concepts merged automatically | ${n(p.duplicates.contributions_merged_automatically)} |`,
    `| Possible duplicates awaiting review | ${n(p.duplicates.possible_duplicates_for_review)} |`,
    `| Records requiring review | ${n(p.review_queue.total)} (${kv(p.review_queue.by_severity)}) |`,
    `| Review queue by reason | ${kv(p.review_queue.by_reason)} |`,
    `| Processing time | ${n(p.processing.worker_seconds)} s extraction, ${n(p.processing.audit_seconds)} s audit |`,
    `| Resource usage | ${n(p.processing.worker_tokens)} tokens extraction, ${n(p.processing.audit_tokens)} tokens audit (as reported by the worker sessions; plan allowance is not visible) |`, "");
  if (p.failed.length) out.push("Failed lectures:", "", ...p.failed.map((f) => `- \`${f.id}\` (attempt ${f.attempts}): ${f.error}`), "");
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
