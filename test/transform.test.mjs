import { test } from "node:test";
import assert from "node:assert/strict";
import { transformSina, parseSinaDate, normaliseUrl, driveId } from "../pipeline/lib/sina-transform.mjs";
import { rawQKey } from "../pipeline/lib/qkey.mjs";
import { sampleSina, q } from "./helpers.mjs";

const run = (sina = sampleSina(), extra = {}) => {
  const out = transformSina({ sina, slides: { "physio-pain": ["03", "04", "p01"] }, ocr: { "files/slides/physio-pain/04.jpg": [{ t: "Allodynia", b: [1.234, 2, 3, 4] }] }, models: ["cord"], ...extra });
  const all = [...out.files.entries()].flatMap(([file, rows]) => rows.map((row) => ({ file, row })));
  const byId = new Map(all.map((x) => [x.row.id, x.row]));
  const rels = all.filter((x) => x.file.startsWith("relations/")).map((x) => x.row);
  return { ...out, byId, rels, kinds: out.findings.map((f) => f.kind) };
};
const keyOf = (stem, options) => rawQKey({ q: stem, options });

test("helpers", () => {
  assert.equal(parseSinaDate("21 Sep 2026"), "2026-09-21");
  assert.equal(parseSinaDate("9 Nov 2026"), "2026-11-09");
  assert.equal(parseSinaDate("soon"), null);
  assert.equal(normaliseUrl("https://TeachMePhysiology.com/pain/"), normaliseUrl("https://teachmephysiology.com/pain"));
  assert.equal(normaliseUrl("javascript:alert(1)"), null);
  assert.equal(driveId("https://drive.google.com/file/d/ABCDEFGHIJKLMNOP/view"), "ABCDEFGHIJKLMNOP");
});

test("hierarchy, lecture and sections", () => {
  const { byId } = run();
  assert.equal(byId.get("prog:y2-anglo").title, "2nd Year Anglo");
  assert.equal(byId.get("subj:physio").program, "prog:y2-anglo");
  assert.equal(byId.get("mod:physio/neurophysiology").subject, "subj:physio");
  const lec = byId.get("lec:physio-pain");
  assert.equal(lec.module, "mod:physio/neurophysiology");
  assert.equal(lec.verification, "sina-verified");
  assert.equal(lec.body.verified_on, "2026-09-21");
  assert.deepEqual(lec.body.figure.labels, ["Dorsal horn", "Root"]);
  assert.deepEqual(lec.provenance, [{ source: "src:physio-pain", note: "Pain.pdf (Prof. Example)" }]);
  assert.equal(byId.get("src:physio-pain").body.drive_id, "ABCDEFGHIJKLMNOP");
  assert.equal(byId.get("sec:physio-pain/def").body.html, "<p>Allodynia.</p>");
  assert.equal(byId.get("sec:physio-pain/def").body.order, 1);
});

test("a lecture listed without data is recorded as a gap, not dropped", () => {
  const { byId, kinds } = run();
  assert.deepEqual(byId.get("lec:physio-soon").flags, ["no-content"]);
  assert.equal(byId.get("lec:physio-soon").verification, "unverified");
  assert.ok(kinds.includes("lecture-without-content"));
});

test("questions keep their wording, answers and Sina key", () => {
  const { byId } = run();
  const a = byId.get("q:1egt1vv");
  assert.equal(a.body.stem, "What is allodynia?");
  assert.deepEqual(a.body.answer, [0]);
  assert.equal(a.ext.sina, "1egt1vv");
  assert.equal(a.origin, "sina");
  assert.equal(a.lecture, "lec:physio-pain");
  const multi = byId.get("q:" + keyOf("Which fibres carry slow pain?", ["A-delta", "C", "A-beta"]));
  assert.deepEqual(multi.body.answer, [1]);
  assert.equal(multi.body.multi, true);
  assert.equal(byId.get("q:" + keyOf("A recalled question", ["Yes", "No"])).origin, "original");
});

test("figure questions that share a Sina key stay separate records", () => {
  const { byId, kinds } = run();
  const k = keyOf("Which structure is at the arrow?", ["Dorsal horn", "Root"]);
  assert.deepEqual(byId.get(`q:${k}-horn`).body.answer, [0]);
  assert.deepEqual(byId.get(`q:${k}-root`).body.answer, [1]);
  assert.equal(byId.get(`q:${k}-horn`).ext.sina, k);
  assert.ok(!kinds.includes("question-conflicting-answers"));
});

test("slides carry OCR text; citations to slides that do not exist are reported", () => {
  const { byId, rels, findings } = run();
  const s = byId.get("slide:physio-pain/04");
  assert.equal(s.body.text, "Allodynia");
  assert.equal(s.body.text_origin, "ocr");
  assert.deepEqual(s.body.lines, [["Allodynia", 1.23, 2, 3, 4]]);
  assert.equal(byId.get("slide:physio-pain/03").body.text_origin, "none");
  assert.equal(byId.get("slide:physio-pain/p01").body.label, "p01");
  assert.ok(rels.some((r) => r.src === "q:1egt1vv" && r.type === "cites" && r.dst === "slide:physio-pain/04"));
  assert.ok(findings.some((f) => f.kind === "question-cites-missing-slide" && /99\.jpg/.test(f.detail)));
  assert.ok(!rels.some((r) => r.dst === "slide:physio-pain/99"));
});

test("highlight boxes attach to the citation", () => {
  const sina = sampleSina();
  sina.hl = { "1egt1vv": { "files/slides/physio-pain/04.jpg": [[1, 2, 3, 4]] }, zzzz: { "files/slides/physio-pain/04.jpg": [[0, 0, 1, 1]] } };
  const { rels, findings } = run(sina);
  assert.deepEqual(rels.find((r) => r.src === "q:1egt1vv" && r.type === "cites").attrs.boxes, [[1, 2, 3, 4]]);
  assert.ok(findings.some((f) => f.kind === "highlights-not-attached" && /^1 /.test(f.detail)));
});

test("the same external page under two URLs and two roles becomes one resource with both roles", () => {
  const { byId, rels } = run();
  const res = [...byId.values()].filter((r) => r.type === "resource");
  assert.equal(res.length, 2);
  const tmp = res.find((r) => /teachmephysiology/i.test(r.body.url));
  const link = rels.filter((r) => r.type === "references" && r.dst === tmp.id);
  assert.equal(link.length, 1);
  assert.deepEqual(link[0].attrs.roles, ["reading", "checked-against"]);
  assert.equal(link[0].attrs.why, "Clear.");
});

test("a question repeated across papers is one record that appears in each paper", () => {
  const { byId, rels, findings } = run();
  const k = "q:" + keyOf("Shared question?", ["One", "Two"]);
  assert.equal([...byId.keys()].filter((id) => id === k).length, 1);
  assert.deepEqual(rels.filter((r) => r.src === k && r.type === "appears-in").map((r) => r.dst).sort(), ["paper:physio-2024", "paper:physio-sina-mock"]);
  assert.ok(findings.some((f) => f.kind === "question-repeated" && f.id === k));
});

test("papers record who wrote the answer key and whether Sina wrote the paper", () => {
  const { byId } = run();
  assert.equal(byId.get("paper:physio-2024").body.answer_key, "written-by-sina");
  assert.equal(byId.get("paper:physio-2024").origin, "original");
  assert.equal(byId.get("paper:physio-sina-mock").origin, "sina");
  assert.equal(byId.get("q:" + keyOf("Paper only?", ["One", "Two"])).body.answer_key, "written-by-sina");
  assert.equal(byId.get("q:" + keyOf("Paper only?", ["One", "Two"])).lecture, undefined);
});

test("conflicting answer keys for the same question are reported", () => {
  const sina = sampleSina();
  sina.paperQs["physio-2024"][0] = q("Shared question?", ["One", "Two"], 1);
  const { findings } = run(sina);
  assert.ok(findings.some((f) => f.kind === "question-conflicting-answers"));
});

test("paper questions link to their lecture through paperLec", () => {
  const sina = sampleSina();
  const k = keyOf("Paper only?", ["One", "Two"]);
  sina.paperLec = { [k]: "physio-pain", stale: "physio-pain" };
  const { rels, findings } = run(sina);
  assert.ok(rels.some((r) => r.src === `q:${k}` && r.type === "tests" && r.dst === "lec:physio-pain"));
  assert.ok(findings.some((f) => f.kind === "paper-lecture-links-unmatched" && /^1 of 2/.test(f.detail)));
});

test("an alias keeps a reworded question's ID", () => {
  const sina = sampleSina();
  sina.lectures["physio-pain"].mcqs[0].q = "What does allodynia mean?";
  sina.qAlias = { [rawQKey(sina.lectures["physio-pain"].mcqs[0])]: "1egt1vv" };
  const { byId } = run(sina);
  assert.equal(byId.get("q:1egt1vv").body.stem, "What does allodynia mean?");
});

test("malformed questions and out-of-range answers are reported", () => {
  const sina = sampleSina();
  sina.lectures["physio-pain"].mcqs.push(q("One option only", ["A"], 0), q("Bad answer", ["A", "B"], 5));
  const { kinds, byId } = run(sina);
  assert.ok(kinds.includes("question-malformed"));
  assert.ok(kinds.includes("question-answer-out-of-range"));
  assert.ok(![...byId.values()].some((r) => r.type === "mcq" && r.body.stem === "One option only"));
});

test("exam scopes, 3D models and flashcards", () => {
  const { byId, rels } = run();
  assert.deepEqual(byId.get("exam:physio-mid").body.groups, [{ name: "Neuro", lectures: ["lec:physio-pain"] }]);
  assert.ok(rels.some((r) => r.src === "exam:physio-mid" && r.type === "covers" && r.dst === "lec:physio-pain"));
  assert.equal(byId.get("m3d:cord").body.licence, "CC BY-SA 4.0");
  assert.equal(byId.get("card:physio-pain/img-horn").body.kind, "image");
  assert.equal(byId.get("card:physio-pain/p1").body.back, "Unpleasant experience.");
});

test("record IDs do not depend on the order papers are listed in", () => {
  const a = run();
  const sina = sampleSina();
  sina.papers.reverse();
  const b = run(sina);
  assert.deepEqual([...a.byId.keys()].sort(), [...b.byId.keys()].sort());
});
