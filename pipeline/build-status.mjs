#!/usr/bin/env node
// Writes site/status.json: project status computed from the repository, for the dashboard.
// Usage: node pipeline/build-status.mjs [--kb kb] [--out site/status.json]
// Every metric carries its source and definition. Nothing here is estimated.
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadKb } from "./lib/kb.mjs";
import { readJsonl, writeIfChanged, parseArgs } from "./lib/util.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const git = (args) => { try { return execFileSync("git", ["-C", root, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(); } catch { return null; } };

export function computeStatus(kb = "kb", { milestones, testNames, generatedAt = null, commit = null } = {}) {
  const { records, relations } = loadKb(kb);
  const rows = records.map((r) => r.row);
  const manifest = readJsonl(join(kb, "admin/prep-manifest.jsonl"));
  const queue = readJsonl(join(kb, "admin/review-queue.jsonl"));
  const stats = existsSync(join(kb, "admin/stats.json")) ? JSON.parse(readFileSync(join(kb, "admin/stats.json"), "utf8")) : { gaps: {} };
  const M = (id, label, value, of, source, definition) => ({ id, label, value, ...(of === null ? {} : { of }), source, definition });

  const lectures = rows.filter((r) => r.type === "lecture");
  const withContent = lectures.filter((l) => !(l.flags || []).includes("no-content"));
  const eligible = withContent.length;
  const extracted = manifest.filter((m) => m.state === "done");
  const audited = extracted.filter((m) => m.audit && m.audit.state === "done");
  const concepts = rows.filter((r) => r.type === "concept");
  const assembled = new Set(concepts.flatMap((c) => c.body.lectures));
  const defs = concepts.flatMap((c) => c.body.definitions);
  const aiRel = relations.map((r) => r.row).filter((r) => r.origin === "ai");
  const semantic = aiRel.filter((r) => !["covers", "tests", "explains"].includes(r.type));
  const by = (xs, s) => xs.filter((x) => x.status === s).length;
  const reviewed = (xs) => xs.filter((x) => x.reviewed_by).length;
  const count = (t) => rows.filter((r) => r.type === t).length;
  const mcqs = rows.filter((r) => r.type === "mcq"), slides = rows.filter((r) => r.type === "slide");
  const cited = new Set(relations.map((r) => r.row).filter((r) => r.type === "cites").map((r) => r.src));
  const MAN = "kb/admin/prep-manifest.jsonl", CON = "kb/records/concepts.jsonl", REL = "kb/relations/ai/*.jsonl";

  const pipeline = [
    M("imported", "Lectures imported from Sina", eligible, lectures.length, "kb/records/*/lectures.jsonl", "Lecture records that have content. The remainder are listed on Sina with no content yet."),
    M("extracted", "Lectures extracted", extracted.length, eligible, MAN, "A worker's extraction result passed the structural and quotation checks and is stored. Says nothing about correctness."),
    M("audited", "Lectures audited", audited.length, eligible, MAN, "An independent AI audit of the extraction is stored. An AI audit is not medical review."),
    M("assembled", "Lectures assembled into the knowledge base", assembled.size, eligible, CON, "Lectures whose audited results contribute concepts. Extracted but unaudited lectures are excluded."),
  ];
  const knowledge = [
    M("concepts", "Concepts", concepts.length, null, CON, "Concept records assembled from audited lectures."),
    M("definitions-auto-accepted", "Definitions auto-accepted", by(defs, "auto-accepted"), defs.length, CON, "Passed automated source checks. Shown labelled as AI-generated and not medically verified."),
    M("definitions-held", "Definitions held", by(defs, "proposed"), defs.length, CON, "Held for review: clinical content, an audit finding, a conflict in the lecture, or no supporting quotation."),
    M("definitions-approved", "Definitions approved by a reviewer", by(defs, "approved"), defs.length, CON, "Accepted by a named person."),
    M("relationships-auto-accepted", "Relationships auto-accepted", by(semantic, "auto-accepted"), semantic.length, REL, "Concept-to-concept links that passed automated source checks."),
    M("relationships-held", "Relationships held", by(semantic, "proposed"), semantic.length, REL, "Concept-to-concept links held for review."),
    M("relationships-approved", "Relationships approved by a reviewer", by(semantic, "approved"), semantic.length, REL, "Accepted by a named person."),
    M("medically-reviewed", "AI items reviewed by a named person", reviewed(concepts) + reviewed(aiRel), concepts.length + aiRel.length, `${CON}, ${REL}`, "Records carrying reviewed_by. This is the only indicator of human review; no AI check counts towards it."),
    M("question-links", "Questions and flashcards linked to a concept", new Set(aiRel.filter((r) => r.type === "tests").map((r) => r.src)).size, mcqs.filter((q) => q.lecture).length + count("flashcard"), REL, "Lecture questions and flashcards with at least one concept link."),
  ];
  const quality = [
    M("review-queue", "Entries in the review queue", queue.length, null, "kb/admin/review-queue.jsonl", "Everything waiting for a person, including information-only entries."),
    ...Object.entries(queue.reduce((a, q) => ((a[q.reason] = (a[q.reason] || 0) + 1), a), {})).sort().map(([k, v]) => M("queue-" + k, "Queue: " + k.replace(/-/g, " "), v, null, "kb/admin/review-queue.jsonl", "Review-queue entries with this reason.")),
    M("audit-findings", "Items flagged by auditors", audited.reduce((a, m) => a + (m.audit.findings || 0), 0), null, MAN, "Findings recorded by the independent audits of audited lectures."),
    M("quotations-exact", "Average share of quotations found word for word", extracted.length ? Math.round((extracted.reduce((a, m) => a + (m.evidence_exact_share || 0), 0) / extracted.length) * 1000) / 10 : null, null, MAN, "Per extracted lecture, the share of quotations found verbatim in the cited block; averaged. Measured after the worker's self-check."),
    M("extraction-failures", "Failed extractions", manifest.filter((m) => m.state === "failed").length, null, MAN, "Lectures whose last extraction attempt was rejected."),
  ];
  const content = [
    M("subjects", "Subjects", count("subject"), null, "kb/records/hierarchy.jsonl", "Subject records."),
    M("sections", "Summary sections", count("section"), null, "kb/records/*/sections.jsonl", "Imported lecture summary sections."),
    M("questions", "Questions", mcqs.length, null, "kb/records/*/mcqs.jsonl, paper-mcqs.jsonl", "Imported questions, lecture and past-paper."),
    M("questions-citing-slide", "Questions citing a slide", mcqs.filter((q) => cited.has(q.id)).length, mcqs.length, "kb/relations/imported/*.jsonl", "Questions with at least one imported slide citation."),
    M("flashcards", "Flashcards", count("flashcard"), null, "kb/records/*/flashcards.jsonl", "Imported flashcards."),
    M("slides-with-text", "Slides with searchable text", slides.filter((s) => s.body.text_origin !== "none").length, slides.length, "kb/sources/*/slides.jsonl", "Slides that have OCR text."),
    M("papers", "Past papers", count("paper"), null, "kb/records/papers.jsonl", "Imported past papers and mocks."),
  ];
  quality.find((m) => m.id === "quotations-exact").unit = "%";
  const g = stats.gaps || {};
  const gaps = [
    M("gap-no-content", "Lectures listed on Sina without content", (g.lectures_without_content || []).length, null, "kb/admin/stats.json", "Lecture records flagged no-content."),
    M("gap-no-slides", "Lectures without slide images", (g.lectures_without_slides || []).length, null, "kb/admin/stats.json", "Lectures with content but no slides."),
    M("gap-untexted", "Lectures where some slides have no text", (g.lectures_with_untexted_slides || []).length, null, "kb/admin/stats.json", "Lectures with at least one slide lacking OCR text."),
  ];

  const names = new Set(testNames || []);
  const areas = (milestones ? milestones.areas : []).map((a) => ({ id: a.id, title: a.title, features: a.features.map((f) => {
    const present = f.tests.filter((t) => names.has(t)).length;
    return { id: f.id, title: f.title, tests_defined: f.tests.length, tests_present: present, blocked_by: f.blocked_by || [],
      state: (f.blocked_by || []).length && !present ? "blocked" : !f.tests.length || !present ? "not started" : present < f.tests.length ? "in progress" : "tests in place" };
  }) }));

  return {
    generated_at: generatedAt, commit,
    note: "Generated by pipeline/build-status.mjs from the repository. Every figure is a count; none is an estimate. 'Extracted', 'audited' and 'assembled' are pipeline stages, not statements about medical accuracy. Nothing is medically verified unless 'reviewed by a named person' says so.",
    lecture_pipeline: pipeline, knowledge, quality, content, gaps, features: areas,
    feature_states: { "tests in place": "All acceptance tests named in milestones.json exist in test/. CI proves they pass.", "in progress": "Some acceptance tests exist.", "not started": "No acceptance test exists.", "blocked": "Cannot start until the listed blockers clear." },
    blockers: areas.flatMap((a) => a.features.filter((f) => f.blocked_by.length).map((f) => ({ feature: f.title, blocked_by: f.blocked_by }))),
    lectures: withContent.map((l) => { const m = manifest.find((x) => x.id === l.id); return { id: l.id, subject: l.subject, extracted: !!(m && m.state === "done"), audited: !!(m && m.audit && m.audit.state === "done"), assembled: assembled.has(l.id) }; }).filter((l) => l.extracted),
  };
}

export function testNamesIn(dir) {
  return readdirSync(dir).filter((f) => f.endsWith(".test.mjs")).flatMap((f) => [...readFileSync(join(dir, f), "utf8").matchAll(/^test\("((?:[^"\\]|\\.)*)"/gm)].map((m) => m[1]));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const o = parseArgs(process.argv.slice(2));
  // Timestamp and commit come from the last commit that touched the inputs, so rebuilding without changes rewrites nothing.
  const inputs = ["kb", "milestones.json", "test"];
  const s = computeStatus(o.kb || join(root, "kb"), { milestones: JSON.parse(readFileSync(join(root, "milestones.json"), "utf8")), testNames: testNamesIn(join(root, "test")),
    generatedAt: git(["log", "-1", "--format=%cI", "--", ...inputs]), commit: git(["log", "-1", "--format=%h", "--", ...inputs]) });
  const out = o.out || join(root, "site/status.json");
  console.log((writeIfChanged(out, JSON.stringify(s, null, 1) + "\n") ? "wrote " : "unchanged ") + out);
}
