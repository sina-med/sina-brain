import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdtempSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runImport } from "../pipeline/import-sina.mjs";
import { pack, ingest, runAssemble } from "../pipeline/prep.mjs";
import { buildExport, writeExport } from "../pipeline/build-export.mjs";
import { computeStatus, testNamesIn } from "../pipeline/build-status.mjs";
import { listJsonl } from "../pipeline/lib/util.mjs";
import { sampleSina, writeSite, tmpKb } from "./helpers.mjs";

const LEC = "lec:physio-pain";
const E = (ref, quote) => ({ ref, quote });
/** A knowledge base with one lecture imported; optionally extracted, audited and assembled. */
function kbAt(stage) {
  const site = writeSite(sampleSina()), kb = tmpKb(), work = mkdtempSync(join(tmpdir(), "sina-work-")), ctx = { kb, work, now: "2026-01-02T00:00:00Z" };
  runImport({ sina: site.dir, ocr: site.ocr, kb, quiet: true, date: "2026-01-01" });
  if (stage === "imported") return kb;
  const items = pack({ ...ctx, lectures: LEC }) && JSON.parse(readFileSync(join(kb, "admin/prep-manifest.jsonl"), "utf8").split("\n")[0]);
  const tags = readFileSync(join(work, "packets/physio-pain.md"), "utf8").match(/^\[(q|card):[^\]]+\]/gm).map((t) => t.slice(1, -1));
  assert.equal(tags.length, items.items);
  writeFileSync(join(work, "results/physio-pain.json"), JSON.stringify({ lecture: LEC, prompt_version: "p3", abstract: "The lecture covers fast and slow pain and the definition of allodynia.", keywords: ["pain", "allodynia", "fibres"],
    concepts: [
      { key: "pain", name: "Pain", kind: "process", aliases: [], definition: "Pain travels in two lanes.", importance: 3, evidence: [E("sec:physio-pain/big", "Pain has two lanes")], self_confidence: "high" },
      { key: "fast-pain", name: "Fast pain", kind: "process", aliases: [], definition: "Pain carried by A-delta fibres.", importance: 2, evidence: [E("exam:1", "Fast pain: A-delta")], self_confidence: "high" },
      { key: "ghost", name: "Substance P", kind: "structure", aliases: [], definition: "A transmitter of slow pain.", importance: 1, evidence: [E("sec:physio-pain/big", "this is not in the lecture")], self_confidence: "medium" }],
    relations: [{ src: "fast-pain", type: "is-a", dst: "pain", statement: "Fast pain is one of the two lanes of pain.", evidence: [E("exam:1", "Fast pain: A-delta")], self_confidence: "high" },
      { src: "fast-pain", type: "causes", dst: "pain", statement: "A clinical claim for the test.", evidence: [E("exam:1", "Fast pain: A-delta")], self_confidence: "high" }],
    tests: tags.map((item, i) => ({ item, concepts: i === 0 ? ["pain"] : [] })), conflicts: [], notes: [] }));
  if (stage !== "extracted") writeFileSync(join(work, "audits/physio-pain.json"), JSON.stringify({ lecture: LEC, audit_version: "a2", findings: [], missed: [] }));
  ingest(ctx);
  runAssemble(ctx);
  return kb;
}
const snapshot = (kb) => Object.fromEntries(listJsonl(kb).map((f) => [f, readFileSync(join(kb, f), "utf8")]));
const metric = (list, id) => list.find((m) => m.id === id);

test("status counts keep imported, extracted, audited and assembled apart", () => {
  const stage = (kb) => Object.fromEntries(computeStatus(kb).lecture_pipeline.map((m) => [m.id, `${m.value}/${m.of}`]));
  assert.deepEqual(stage(kbAt("imported")), { imported: "1/2", extracted: "0/1", audited: "0/1", assembled: "0/1" });
  assert.deepEqual(stage(kbAt("extracted")), { imported: "1/2", extracted: "1/1", audited: "0/1", assembled: "0/1" });   // extracted but not audited: contributes nothing
  const kb = kbAt("assembled"), s = computeStatus(kb);
  assert.deepEqual(stage(kb), { imported: "1/2", extracted: "1/1", audited: "1/1", assembled: "1/1" });
  assert.deepEqual(s.lectures, [{ id: LEC, subject: "subj:physio", extracted: true, audited: true, assembled: true }]);
  // acceptance states stay distinct, and nothing counts as reviewed without a named person
  assert.deepEqual([metric(s.knowledge, "definitions-auto-accepted").value, metric(s.knowledge, "definitions-held").value, metric(s.knowledge, "definitions-approved").value], [2, 1, 0]);
  assert.deepEqual([metric(s.knowledge, "relationships-auto-accepted").value, metric(s.knowledge, "relationships-held").value], [1, 1]);
  assert.equal(metric(s.knowledge, "medically-reviewed").value, 0);
  assert.equal(metric(s.knowledge, "concepts").value, 3);
});

test("every status metric names its source and definition", () => {
  const s = computeStatus(kbAt("assembled"), { milestones: JSON.parse(readFileSync("milestones.json", "utf8")), testNames: testNamesIn("test"), generatedAt: "2026-01-01T00:00:00Z", commit: "abc1234" });
  for (const group of ["lecture_pipeline", "knowledge", "quality", "content", "gaps"]) for (const m of s[group]) {
    assert.ok(m.source && m.definition && m.label, `${m.id} lacks a source, label or definition`);
    assert.ok(m.value === null || Number.isFinite(m.value), `${m.id} is not a count`);
    if (m.of !== undefined) assert.ok(m.value <= m.of, `${m.id}: ${m.value} of ${m.of}`);
  }
  assert.deepEqual([s.generated_at, s.commit], ["2026-01-01T00:00:00Z", "abc1234"]);
  assert.ok(!JSON.stringify(s).includes("percent_complete"));
  // feature states come only from which named tests exist
  const all = s.features.flatMap((a) => a.features);
  assert.equal(all.find((f) => f.id === "status").state, "tests in place");
  assert.equal(all.find((f) => f.id === "deploy").state, "blocked");
  assert.equal(all.find((f) => f.id === "papers").state, "not started");
  for (const f of JSON.parse(readFileSync("milestones.json", "utf8")).areas.flatMap((a) => a.features)) for (const t of f.tests) assert.ok(testNamesIn("test").includes(t), `milestones.json names a test that does not exist: ${t}`);
});

test("the export contains every published record exactly once and discards nothing silently", () => {
  const kb = kbAt("assembled"), { files, manifest } = buildExport(kb);
  const rows = listJsonl(join(kb, "records")).concat(listJsonl(join(kb, "sources")).map((f) => "../sources/" + f)).flatMap((f) => readFileSync(join(kb, "records", f), "utf8").trim().split("\n").filter(Boolean).map(JSON.parse));
  assert.equal(manifest.records.in_knowledge_base, rows.length);
  assert.equal(manifest.records.exported + manifest.records.excluded, rows.length);
  assert.equal(manifest.relations.exported + manifest.relations.excluded, manifest.relations.in_knowledge_base);
  const text = JSON.stringify([...files.entries()].filter(([f]) => f !== "export-manifest.json"));
  const out = new Set(manifest.excluded_records.map((x) => x.id));
  for (const r of rows) if (!out.has(r.id)) assert.ok(text.includes(JSON.stringify(r.id)), `${r.id} is neither exported nor listed as excluded`);
  // content and provenance survive unchanged
  const mod = files.get("modules/physio/neurophysiology.json"), lec = mod.lectures.find((l) => l.id === LEC);
  assert.equal(lec.sections[1].html, "<p>Allodynia.</p>");
  assert.equal(lec.source.title, "Pain.pdf (Prof. Example)");
  const q = lec.questions.find((x) => x.id === "q:1egt1vv");
  assert.deepEqual([q.stem, q.answer, q.sina_key, q.slides[0].id], ["What is allodynia?", [0], "1egt1vv", "slide:physio-pain/04"]);
  assert.equal(lec.slides.find((s) => s.id === "slide:physio-pain/04").text, "Allodynia");
  assert.equal(files.get("index.json").subjects[0].modules[0].lectures.find((l) => l.id === "lec:physio-soon").has_content, false);
  const subj = files.get("subjects/physio.json");
  assert.deepEqual([subj.subject.id, subj.subject.modules[0].file, subj.exams.map((e) => e.id)], ["subj:physio", "modules/physio/neurophysiology.json", ["exam:physio-mid"]]);
  assert.ok(files.get("papers/physio.json").papers.find((p) => p.id === "paper:physio-2024").questions.length === 2);
  // the AI layer: labelled, held text withheld, held relations listed as excluded
  const ai = files.get("concepts.json");
  assert.equal(ai.label, "AI-generated — not medically verified");
  const ghost = ai.concepts.find((c) => c.id === "c:substance-p");
  assert.ok(!ghost);                                                            // low confidence: not published
  assert.ok(manifest.excluded_records.some((x) => x.id === "c:substance-p" && /proposed/.test(x.reason)));
  assert.ok(ai.concepts.every((c) => c.verification === "unverified" && !c.reviewed_by));
  assert.ok(!ai.relations.some((r) => r.type === "causes"));
  assert.ok(Object.keys(manifest.relations.excluded_by_reason).some((k) => k.startsWith("causes: status is proposed")));
});

test("the export is deterministic and leaves the knowledge base untouched", () => {
  const kb = kbAt("assembled"), out = join(mkdtempSync(join(tmpdir(), "sina-export-")), "data"), before = snapshot(kb);
  const first = writeExport(kb, out);
  assert.ok(first.written === first.files && first.files >= 5);
  writeFileSync(join(out, "stale.json"), "{}");
  const second = writeExport(kb, out);
  assert.deepEqual([second.written, second.removed], [0, 1]);                    // nothing rewritten; the stale file is cleared
  assert.ok(!existsSync(join(out, "stale.json")));
  assert.deepEqual(snapshot(kb), before);
  assert.doesNotThrow(() => JSON.parse(readFileSync(join(out, "index.json"), "utf8")));
});

test("the application shell and dashboard are static files that load the generated data", () => {
  const dash = readFileSync("site/dashboard.html", "utf8"), shell = readFileSync("site/index.html", "utf8");
  assert.match(dash, /fetch\("status\.json"\)/);
  assert.match(shell, /fetch\("data\/" \+ f\)/);
  for (const page of [dash, shell]) { assert.ok(!/<script[^>]+src=/.test(page), "no external scripts"); assert.ok(!/<link[^>]+href="http/.test(page), "no external stylesheets"); }
  const status = JSON.parse(readFileSync("site/status.json", "utf8"));
  for (const k of ["lecture_pipeline", "knowledge", "quality", "content", "gaps", "features", "generated_at"]) assert.ok(k in status, `status.json lacks ${k}`);
});
