import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdtempSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runImport } from "../pipeline/import-sina.mjs";
import { validateKb } from "../pipeline/validate.mjs";
import { computeStats } from "../pipeline/stats.mjs";
import { pack, ingest, runAssemble, status, check, checkAudit } from "../pipeline/prep.mjs";
import { lectureReport } from "../pipeline/prep-report.mjs";
import { checkQuote, normalise, mentions } from "../pipeline/lib/evidence.mjs";
import { nameKey } from "../pipeline/lib/prep-assemble.mjs";
import { htmlToText } from "../pipeline/lib/prep-packet.mjs";
import { readJsonl } from "../pipeline/lib/util.mjs";
import { rawQKey } from "../pipeline/lib/qkey.mjs";
import { sampleSina, writeSite, tmpKb } from "./helpers.mjs";

const LEC = "lec:physio-pain";
const k = (stem, options) => "q:" + rawQKey({ q: stem, options });
const ITEMS = ["q:1egt1vv", k("Which fibres carry slow pain?", ["A-delta", "C", "A-beta"]), k("Which structure is at the arrow?", ["Dorsal horn", "Root"]) + "-horn", k("Which structure is at the arrow?", ["Dorsal horn", "Root"]) + "-root",
  k("A recalled question", ["Yes", "No"]), k("Missing slide citation", ["Yes", "No"]), "card:physio-pain/p1", "card:physio-pain/img-horn"];

function setup() {
  const site = writeSite(sampleSina()), kb = tmpKb(), work = mkdtempSync(join(tmpdir(), "sina-work-"));
  runImport({ sina: site.dir, ocr: site.ocr, kb, quiet: true, date: "2026-01-01" });
  return { kb, work, now: "2026-01-02T00:00:00Z" };
}
const E = (ref, quote) => ({ ref, quote });
function goodResult() {
  return {
    lecture: LEC, prompt_version: "p2", abstract: "The lecture covers fast and slow pain and the definition of allodynia.", keywords: ["pain", "allodynia", "c fibres"],
    concepts: [
      { key: "allodynia", name: "Allodynia", kind: "principle", aliases: [], definition: "Pain from a harmless stimulus.", importance: 3, evidence: [E("q:1egt1vv", "Pain from a harmless stimulus"), E("slide:physio-pain/04", "Allodynia")], self_confidence: "high" },
      { key: "fast-pain", name: "Fast pain", kind: "process", aliases: ["First pain"], definition: "Pain carried by A-delta fibres, lost after nerve injury.", importance: 2, evidence: [E("exam:1", "Fast pain: A-delta")], self_confidence: "high" },
      { key: "pain", name: "Pain", kind: "process", aliases: [], definition: "Pain travels in two lanes.", importance: 3, evidence: [E("sec:physio-pain/big", "Pain has two lanes")], self_confidence: "high" },
      { key: "ghost", name: "Substance P", kind: "structure", aliases: [], definition: "A transmitter of slow pain.", importance: 1, evidence: [E("sec:physio-pain/big", "substance P is released by C fibres")], self_confidence: "medium" },
      { key: "neuropathy", name: "Neuropathic pain", kind: "condition", aliases: [], definition: "Pain has two lanes in this condition.", importance: 1, evidence: [E("sec:physio-pain/big", "Pain has two lanes")], self_confidence: "medium" },
    ],
    relations: [
      { src: "fast-pain", type: "is-a", dst: "pain", statement: "Fast pain is one of the two lanes of pain.", evidence: [E("exam:1", "Fast pain: A-delta")], self_confidence: "high" },
      { src: "neuropathy", type: "causes", dst: "allodynia", statement: "Neuropathic pain causes allodynia.", evidence: [E("q:1egt1vv", "Pain from a harmless stimulus")], self_confidence: "high" },
      { src: "ghost", type: "related-to", dst: "pain", statement: "Substance P relates to pain.", evidence: [E("sec:physio-pain/big", "nothing like this is written")], self_confidence: "high" },
      { src: "pain", type: "is-a", dst: "nowhere", statement: "Refers to a missing concept.", evidence: [E("exam:1", "Fast pain: A-delta")], self_confidence: "low" },
    ],
    tests: ITEMS.map((item, i) => ({ item, concepts: i === 0 ? ["allodynia"] : i === 1 ? ["pain"] : [] })),
    conflicts: [{ kind: "internal", issue: "The slide and the summary disagree about something.", evidence: [E("slide:physio-pain/04", "Allodynia")], affects: [] }],
    notes: [],
  };
}
const write = (ctx, name, obj) => writeFileSync(join(ctx.work, name), JSON.stringify(obj));
/** An independent audit is required before a lecture's results are assembled; by default it finds nothing. */
const audit = (ctx, slug = "physio-pain", findings = [], missed = []) => write(ctx, `audits/${slug}.json`, { lecture: "lec:" + slug, audit_version: "a2", findings, missed });

test("quotation checking", () => {
  const block = "The posterior cricoarytenoid is the ONLY abductor (‘safety muscle’): paralysis → airway closes.";
  assert.equal(checkQuote("posterior cricoarytenoid is the only abductor", block), "exact");
  assert.equal(checkQuote("is the ONLY abductor ('safety muscle'): paralysis", block), "exact");
  assert.equal(checkQuote("only abductor", block), "weak");
  assert.equal(checkQuote("the posterior cricoarytenoid muscle is the sole abductor", block), "failed");
  assert.equal(checkQuote("abductor the only is posterior cricoarytenoid the", block), "failed");            // same words, wrong order
  assert.equal(checkQuote("The posterior cricoarytenoid is the abductor safety muscle paralysis airway closes", block), "approximate");   // in order, a word missing
  assert.equal(checkQuote("anything", undefined), "bad-ref");
  assert.equal(checkQuote("cord is damaged", "the vocal cord is damaged"), "exact");
  assert.equal(checkQuote("cord is dam", "the vocal cord is damaged"), "failed");   // must match whole words
  assert.equal(normalise("Naïve  T-cells; (CD4+)"), "naive t cells cd4");
  assert.ok(mentions("the Recurrent laryngeal nerve.", "recurrent laryngeal nerve"));
  assert.ok(!mentions("the nervous system", "nerve"));
  assert.equal(nameKey("Vocal folds"), nameKey("vocal fold"));
  assert.equal(nameKey("Pons"), "pons");
  assert.equal(nameKey("Brachial plexus"), "brachial plexus");
  assert.equal(htmlToText("<table><tr><th>A</th><td>B</td></tr><tr><td>C</td><td>D</td></tr></table><ul><li>x</li></ul>"), "A | B\nC | D\n- x");
});

test("pack writes packets, records the input hash, and skips unchanged finished lectures", () => {
  const ctx = setup();
  const first = pack({ ...ctx, next: 10 });
  assert.deepEqual(first.map((p) => p.lecture), [LEC]);                       // the lecture without content is not eligible
  const text = readFileSync(first[0].packet, "utf8");
  assert.match(text, /\[sec:physio-pain\/big\] The big picture\nPain has two lanes\./);
  assert.match(text, /\[q:1egt1vv\] What is allodynia\?\n\* A\. Pain from a harmless stimulus/);
  assert.match(text, /\[slide:physio-pain\/04\]/);
  assert.ok(!/slide:physio-pain\/03\]/.test(text));                           // slides without text are left out
  assert.deepEqual(status(ctx), { eligible: 1, packed: 1 });
  write(ctx, "results/physio-pain.json", goodResult());
  assert.equal(ingest(ctx).lectures[0].state, "done");
  assert.deepEqual(pack({ ...ctx, next: 10 }), []);                           // nothing left to do
  assert.equal(pack({ ...ctx, lectures: LEC })[0].skipped, "already processed and unchanged");
});

test("ingest checks every quotation, drops broken items and never touches imported records", () => {
  const ctx = setup();
  const before = readFileSync(join(ctx.kb, "records/physio/sections.jsonl"), "utf8");
  pack({ ...ctx, lectures: LEC });
  write(ctx, "results/physio-pain.json", goodResult());
  const r = ingest({ ...ctx, meta: undefined });
  assert.deepEqual(r.lectures[0].evidence, { exact: 6, approximate: 0, weak: 2, failed: 2, "bad-ref": 0 });
  assert.ok(r.lectures[0].dropped.some((d) => /pain\|is-a\|nowhere/.test(d)));
  const stored = JSON.parse(readFileSync(join(ctx.kb, "ai/physio/physio-pain.json"), "utf8"));
  assert.equal(stored.result.relations.length, 3);
  assert.equal(stored.result.concepts[3].evidence[0].check, "failed");
  assert.equal(stored.input_hash, readJsonl(join(ctx.kb, "admin/prep-manifest.jsonl"))[0].input_hash);
  assert.equal(readFileSync(join(ctx.kb, "records/physio/sections.jsonl"), "utf8"), before);
  assert.ok(r.stop.length);                                                    // too few exact quotations: the batch stop rule fires
});

test("assemble routes items by confidence and risk, and the output validates", () => {
  const ctx = setup();
  pack({ ...ctx, lectures: LEC });
  write(ctx, "results/physio-pain.json", goodResult());
  audit(ctx);
  ingest(ctx);
  const s = runAssemble(ctx);
  assert.equal(s.concepts, 5);
  const concepts = new Map(readJsonl(join(ctx.kb, "records/concepts.jsonl")).map((c) => [c.id, c]));
  const allo = concepts.get("c:allodynia");
  assert.deepEqual([allo.origin, allo.status, allo.verification, allo.confidence], ["ai", "auto-accepted", "unverified", "high"]);
  assert.equal(allo.body.definitions[0].evidence[0].unit, "q:1egt1vv");
  assert.equal(concepts.get("c:fast-pain").confidence, "medium");               // one quotation, not tested
  assert.deepEqual(concepts.get("c:fast-pain").body.definitions[0].held_for, ["clinical-wording"]);   // "injury" in an ordinary definition: held as a clinical statement
  assert.equal(concepts.get("c:pain").confidence, "high");                      // quoted and tested
  assert.deepEqual([concepts.get("c:substance-p").status, concepts.get("c:substance-p").confidence], ["proposed", "low"]);   // quotation not found
  const neuro = concepts.get("c:neuropathic-pain");
  assert.equal(neuro.status, "auto-accepted");                                  // the concept exists as an index entry …
  assert.deepEqual([neuro.body.definitions[0].status, neuro.body.definitions[0].held_for], ["proposed", ["clinical-definition"]]);   // … but its clinical definition is held

  const rels = readJsonl(join(ctx.kb, "relations/ai/physio.jsonl"));
  const find = (src, type, dst) => rels.find((r) => r.src === src && r.type === type && r.dst === dst);
  assert.deepEqual([find("c:fast-pain", "is-a", "c:pain").status, find("c:fast-pain", "is-a", "c:pain").confidence], ["auto-accepted", "high"]);
  assert.equal(find("c:neuropathic-pain", "causes", "c:allodynia").status, "proposed");         // clinical claim: always held
  assert.deepEqual(find("c:neuropathic-pain", "causes", "c:allodynia").attrs.held_for, ["clinical-claim"]);
  assert.equal(find("c:pain", "related-to", "c:substance-p").status, "proposed");               // unsupported
  assert.equal(find("q:1egt1vv", "tests", "c:allodynia").confidence, "high");
  assert.equal(find(ITEMS[1], "tests", "c:pain").confidence, "high");
  assert.ok(find("slide:physio-pain/04", "explains", "c:allodynia") === undefined);             // one-word quotation is too weak to count
  assert.ok(find("sec:physio-pain/big", "explains", "c:pain"));
  assert.ok(find(LEC, "covers", "c:allodynia"));

  const reasons = readJsonl(join(ctx.kb, "admin/review-queue.jsonl")).map((q) => q.reason).sort();
  assert.deepEqual([...new Set(reasons)], ["clinical-claim", "clinical-definition", "dropped-item", "lecture-conflict", "unsupported-concept", "unsupported-relation"]);
  assert.deepEqual(validateKb(ctx.kb).errors, []);
  const st = computeStats(ctx.kb).preparation;
  assert.deepEqual([st.lectures_processed, st.lectures_remaining, st.concepts.total, st.relationships.suggested], [1, 0, 5, 3]);
  assert.match(lectureReport(ctx.kb, LEC), /\*\*Allodynia\*\* \| principle \| high → shown/);
});

test("assemble is repeatable and keeps concept IDs when another lecture is added", () => {
  const ctx = setup();
  pack({ ...ctx, lectures: LEC });
  write(ctx, "results/physio-pain.json", goodResult());
  audit(ctx);
  ingest(ctx);
  runAssemble(ctx);
  const snap = () => ["records/concepts.jsonl", "relations/ai/physio.jsonl", "admin/review-queue.jsonl", "admin/concept-map.jsonl"].map((f) => readFileSync(join(ctx.kb, f), "utf8"));
  const before = snap();
  assert.equal(runAssemble(ctx).files_written, 0);
  assert.deepEqual(snap(), before);
});

test("the same concept from two lectures merges; plural and alias forms are recognised", () => {
  const sina = sampleSina();
  sina.subjects[0].groups[0].items.push({ id: "physio-a", title: "A second lecture" });
  sina.lectures["physio-a"] = { id: "physio-a", title: "A second lecture", summary: [{ id: "s", title: "S", html: "<p>Allodynia is pain from light touch. First pain is sharp. Hyperalgesia is exaggerated pain.</p>" }], mcqs: [], cards: [] };
  const site = writeSite(sina), kb = tmpKb(), work = mkdtempSync(join(tmpdir(), "sina-work-")), ctx = { kb, work, now: "2026-01-02T00:00:00Z" };
  runImport({ sina: site.dir, ocr: site.ocr, kb, quiet: true, date: "2026-01-01" });
  pack({ ...ctx, next: 10 });
  write(ctx, "results/physio-pain.json", goodResult());
  write(ctx, "results/physio-a.json", { lecture: "lec:physio-a", prompt_version: "p2", abstract: "A second lecture about allodynia and first pain, for testing.", keywords: ["allodynia", "first pain", "hyperalgesia"], tests: [], conflicts: [],
    concepts: [
      { key: "allodynias", name: "Allodynias", kind: "condition", definition: "Pain from light touch.", importance: 2, evidence: [E("sec:physio-a/s", "Allodynia is pain from light touch")], self_confidence: "high" },
      { key: "first-pain", name: "First pain", kind: "process", definition: "The sharp early pain.", importance: 2, evidence: [E("sec:physio-a/s", "First pain is sharp")], self_confidence: "high" },
      { key: "hyper", name: "Hyperalgesia", kind: "principle", definition: "Exaggerated pain.", importance: 2, evidence: [E("sec:physio-a/s", "Hyperalgesia is exaggerated pain")], self_confidence: "high" }],
    relations: [{ src: "first-pain", type: "is-a", dst: "allodynias", statement: "Deliberately reversed for the test.", evidence: [E("sec:physio-a/s", "First pain is sharp")], self_confidence: "medium" },
      { src: "allodynias", type: "is-a", dst: "first-pain", statement: "And the other way round.", evidence: [E("sec:physio-a/s", "First pain is sharp")], self_confidence: "medium" }] });
  audit(ctx); audit(ctx, "physio-a");
  assert.deepEqual(ingest(ctx).lectures.map((l) => l.state), ["done", "done"]);
  const s = runAssemble(ctx);
  assert.equal(s.concepts, 6);                                                  // 5 + 3 − allodynia − first pain
  assert.equal(s.contributions_merged, 2);
  const concepts = new Map(readJsonl(join(kb, "records/concepts.jsonl")).map((c) => [c.id, c]));
  assert.deepEqual(concepts.get("c:allodynia").body.lectures, ["lec:physio-a", "lec:physio-pain"]);
  assert.equal(concepts.get("c:allodynia").body.definitions.length, 2);        // each lecture's definition is kept with its own source
  assert.ok(!concepts.has("c:fast-pain"));                                      // "Fast pain" lists "First pain" as another name, so the two are one concept
  assert.deepEqual([concepts.get("c:first-pain").body.aliases, concepts.get("c:first-pain").body.lectures.length], [["Fast pain"], 2]);
  const q = readJsonl(join(kb, "admin/review-queue.jsonl"));
  assert.ok(q.some((x) => x.reason === "kind-disagreement" && x.target === "c:allodynia"));
  assert.ok(q.some((x) => x.reason === "contradiction"));                       // A is-a B and B is-a A
  const rels = readJsonl(join(kb, "relations/ai/physio.jsonl")).filter((r) => r.type === "is-a");
  assert.ok(rels.filter((r) => (r.attrs.held_for || []).includes("contradiction")).every((r) => r.status === "proposed"));
  assert.deepEqual(validateKb(kb).errors, []);
});

test("a changed lecture is detected and reprocessed; a bad result fails that lecture only and can be retried", () => {
  const sina = sampleSina(), kb = tmpKb(), work = mkdtempSync(join(tmpdir(), "sina-work-")), ctx = { kb, work, now: "2026-01-02T00:00:00Z" };
  let site = writeSite(sina);
  runImport({ sina: site.dir, ocr: site.ocr, kb, quiet: true, date: "2026-01-01" });
  pack({ ...ctx, lectures: LEC });
  writeFileSync(join(work, "results/physio-pain.json"), "{ not json");
  assert.match(ingest(ctx).lectures[0].error, /not valid JSON/);
  assert.equal(status(ctx).failed, 1);
  assert.ok(!existsSync(join(kb, "ai/physio/physio-pain.json")));
  pack({ ...ctx, lectures: LEC });                                              // retry this one lecture
  write(ctx, "results/physio-pain.json", { ...goodResult(), lecture: "lec:other" });
  assert.match(ingest(ctx).lectures[0].error, /expected lec:physio-pain/);
  pack({ ...ctx, lectures: LEC });
  write(ctx, "results/physio-pain.json", goodResult());
  assert.equal(ingest(ctx).lectures[0].state, "done");
  const m1 = readJsonl(join(kb, "admin/prep-manifest.jsonl"))[0];
  assert.equal(m1.attempts, 3);

  sina.lectures["physio-pain"].summary[0].html = "<p>Pain has three lanes now.</p>";    // the source changes on Sina
  site = writeSite(sina);
  runImport({ sina: site.dir, ocr: site.ocr, kb, quiet: true, date: "2026-02-01" });
  const again = pack({ ...ctx, next: 10 });
  assert.deepEqual(again.map((p) => p.lecture), [LEC]);
  const m2 = readJsonl(join(kb, "admin/prep-manifest.jsonl"))[0];
  assert.notEqual(m2.input_hash, m1.input_hash);
  assert.equal(m2.changed_since_last_run, true);
  const log = readJsonl(join(kb, "admin/prep-log.jsonl")).map((e) => e.event);
  assert.deepEqual(log.filter((e) => e === "failed").length, 2);
});

test("an audit finding takes an item out of automatic publication; a human decision overrides", () => {
  const ctx = setup();
  pack({ ...ctx, lectures: LEC });
  write(ctx, "results/physio-pain.json", goodResult());
  audit(ctx, "physio-pain", [{ targets: ["relation:fast-pain|is-a|pain", "relation:nobody|is-a|nothing"], verdict: "wrong-direction", detail: "Should be the other way." }, { targets: ["concept:pain"], verdict: "duplicate", detail: "Same as fast pain." }],
    [{ name: "Hyperalgesia", why: "tested by a question" }]);
  ingest(ctx);
  runAssemble(ctx);
  let rel = readJsonl(join(ctx.kb, "relations/ai/physio.jsonl")).find((r) => r.type === "is-a");
  assert.deepEqual([rel.status, rel.confidence, rel.attrs.held_for], ["proposed", "low", ["audit"]]);
  const q = readJsonl(join(ctx.kb, "admin/review-queue.jsonl"));
  assert.ok(q.some((x) => x.reason === "audit-finding" && x.target === rel.id && x.severity === "high"));
  assert.ok(q.some((x) => x.reason === "missed-concept"));
  assert.ok(q.some((x) => /not in the result: relation:nobody\|is-a\|nothing/.test(x.summary)));   // a finding about an unknown item is surfaced, not lost
  assert.equal(readJsonl(join(ctx.kb, "records/concepts.jsonl")).find((c) => c.id === "c:pain").confidence, "medium");   // a non-severe finding stops it being "high"

  writeFileSync(join(ctx.kb, "admin/review-decisions.jsonl"), JSON.stringify({ target: rel.id, action: "approve", by: "Dr Reviewer", date: "2026-01-03" }) + "\n" + JSON.stringify({ target: "c:substance-p", action: "reject", by: "Dr Reviewer", date: "2026-01-03" }) + "\n");
  runAssemble(ctx);
  rel = readJsonl(join(ctx.kb, "relations/ai/physio.jsonl")).find((r) => r.type === "is-a");
  assert.deepEqual([rel.status, rel.reviewed_by], ["approved", "Dr Reviewer"]);
  assert.equal(readJsonl(join(ctx.kb, "records/concepts.jsonl")).find((c) => c.id === "c:substance-p").status, "rejected");
  assert.ok(!readJsonl(join(ctx.kb, "relations/ai/physio.jsonl")).some((r) => r.src === "c:substance-p" || r.dst === "c:substance-p"));
  assert.ok(!readJsonl(join(ctx.kb, "admin/review-queue.jsonl")).some((x) => x.target === rel.id || x.target === "c:substance-p"));
  assert.deepEqual(validateKb(ctx.kb).errors, []);
});

test("the draft checker tells a worker exactly what to fix", () => {
  const ctx = setup();
  write(ctx, "draft.json", goodResult());
  const r = check({ ...ctx, lecture: LEC, file: join(ctx.work, "draft.json") });
  assert.equal(r.ok, false);
  assert.ok(r.problems.some((p) => /concept ghost: quote not found word for word in \[sec:physio-pain\/big\]/.test(p)));
  assert.ok(r.problems.some((p) => /refers to a concept that is not in the list/.test(p)));
});

test("the validator refuses AI records that claim more than they may", () => {
  const ctx = setup();
  pack({ ...ctx, lectures: LEC });
  write(ctx, "results/physio-pain.json", goodResult());
  audit(ctx);
  ingest(ctx); runAssemble(ctx);
  const f = join(ctx.kb, "records/concepts.jsonl"), rows = readJsonl(f);
  rows.find((c) => c.id === "c:allodynia").verification = "expert-reviewed";
  rows.find((c) => c.id === "c:pain").status = "approved";
  rows.find((c) => c.id === "c:substance-p").status = "auto-accepted";
  rows.find((c) => c.id === "c:neuropathic-pain").body.definitions[0].status = "auto-accepted";
  writeFileSync(f, rows.map((r) => JSON.stringify(r)).join("\n") + "\n");
  const rf = join(ctx.kb, "relations/ai/physio.jsonl"), rels = readJsonl(rf);
  rels.find((r) => r.type === "causes").status = "auto-accepted";
  writeFileSync(rf, rels.map((r) => JSON.stringify(r)).join("\n") + "\n");
  const errors = validateKb(ctx.kb).errors.join("\n");
  assert.match(errors, /c:allodynia: AI-generated record is marked "expert-reviewed" but has no reviewer/);
  assert.match(errors, /c:pain: AI-generated record is approved but has no reviewer/);
  assert.match(errors, /c:substance-p: low-confidence AI record must not be auto-accepted/);
  assert.match(errors, /c:neuropathic-pain: clinical definition must not be auto-accepted/);
  assert.match(errors, /clinical relation must not be auto-accepted/);
});

test("an alternative name shared across subjects is sent for review, not merged automatically", () => {
  const sina = sampleSina();
  sina.subjects.push({ id: "anat", name: "Anatomy", semester: "S3", status: "live", program: "y2-anglo", groups: [{ name: "Neuro", items: [{ id: "anat-hypo", title: "Hypothalamus" }] }] });
  sina.lectures["anat-hypo"] = { id: "anat-hypo", title: "Hypothalamus", summary: [{ id: "s", title: "S", html: "<p>The median eminence lies at the base of the hypothalamus.</p>" }], mcqs: [], cards: [] };
  const site = writeSite(sina), kb = tmpKb(), work = mkdtempSync(join(tmpdir(), "sina-work-")), ctx = { kb, work, now: "2026-01-02T00:00:00Z" };
  runImport({ sina: site.dir, ocr: site.ocr, kb, quiet: true, date: "2026-01-01" });
  pack({ ...ctx, next: 10 });
  const base = goodResult();
  base.concepts[2] = { ...base.concepts[2], aliases: ["Median eminence"] };          // "Pain", wrongly given another structure's name as an alias
  write(ctx, "results/physio-pain.json", base);
  write(ctx, "results/anat-hypo.json", { lecture: "lec:anat-hypo", prompt_version: "p2", abstract: "A lecture on the hypothalamus and its median eminence, for testing.", keywords: ["hypothalamus", "median eminence", "base"], tests: [], conflicts: [], relations: [],
    concepts: [{ key: "me", name: "Median eminence", kind: "structure", definition: "A structure at the base of the hypothalamus.", importance: 2, evidence: [E("sec:anat-hypo/s", "The median eminence lies at the base of the hypothalamus")], self_confidence: "high" }] });
  audit(ctx); audit(ctx, "anat-hypo");
  ingest(ctx);
  runAssemble(ctx);
  const ids = readJsonl(join(kb, "records/concepts.jsonl")).map((c) => c.id);
  assert.ok(ids.includes("c:median-eminence") && ids.includes("c:pain"));           // kept apart
  assert.ok(readJsonl(join(kb, "admin/review-queue.jsonl")).some((q) => q.reason === "possible-duplicate" && /different subject/.test(q.detail)));
});

test("without an independent audit a lecture's results are not assembled", () => {
  const ctx = setup();
  pack({ ...ctx, lectures: LEC });
  write(ctx, "results/physio-pain.json", goodResult());
  ingest({ ...ctx });
  const first = runAssemble(ctx);
  assert.deepEqual([first.concepts, first.awaiting_audit], [0, [LEC]]);
  audit(ctx);
  ingest(ctx);                                                                  // the audit arrives later
  assert.equal(runAssemble(ctx).concepts, 5);
  assert.equal(readJsonl(join(ctx.kb, "admin/prep-manifest.jsonl"))[0].audit.state, "done");
});

test("items resting on a conflict the worker reported are held, and one audit finding can hold many items", () => {
  const ctx = setup();
  pack({ ...ctx, lectures: LEC });
  const r = goodResult();
  r.conflicts = [{ kind: "differs-from-standard-teaching", issue: "The lecture's figure differs from standard teaching.", evidence: [E("exam:1", "Fast pain: A-delta")], affects: ["concept:pain", "relation:fast-pain|is-a|pain", "concept:does-not-exist"] }];
  r.relations.push({ src: "pain", type: "increases", dst: "allodynia", statement: "Pain increases allodynia.", evidence: [E("sec:physio-pain/big", "Pain has two lanes")], self_confidence: "high" },
    { src: "pain", type: "decreases", dst: "allodynia", statement: "Pain decreases allodynia.", evidence: [E("sec:physio-pain/big", "Pain has two lanes")], self_confidence: "high" });
  write(ctx, "results/physio-pain.json", r);
  audit(ctx, "physio-pain", [{ targets: ["concept:allodynia", "concept:fast-pain"], verdict: "evidence-does-not-support", detail: "The quotations do not state the definition." }]);
  const ing = ingest(ctx);
  assert.ok(ing.lectures[0].dropped.some((d) => /affects concept:does-not-exist/.test(d)));
  runAssemble(ctx);
  const concepts = new Map(readJsonl(join(ctx.kb, "records/concepts.jsonl")).map((c) => [c.id, c]));
  assert.deepEqual(concepts.get("c:pain").body.definitions[0].held_for, ["lecture-conflict"]);
  assert.equal(concepts.get("c:pain").status, "auto-accepted");                 // the concept stays as an index entry; its definition is held
  assert.deepEqual(concepts.get("c:allodynia").body.definitions[0].held_for, ["audit"]);
  assert.ok(concepts.get("c:fast-pain").body.definitions[0].held_for.includes("audit"));
  const rels = readJsonl(join(ctx.kb, "relations/ai/physio.jsonl"));
  assert.deepEqual(rels.find((x) => x.type === "is-a").attrs.held_for, ["lecture-conflict"]);
  for (const t of ["increases", "decreases"]) assert.ok(rels.find((x) => x.type === t).attrs.held_for.includes("contradiction"));
  assert.deepEqual(validateKb(ctx.kb).errors, []);
});

test("the size limits and the audit checker are enforced", () => {
  const ctx = setup();
  pack({ ...ctx, lectures: LEC });
  const big = goodResult();
  for (let i = 0; i < 50; i++) big.concepts.push({ key: "extra-" + i, name: "Extra " + i, kind: "structure", aliases: [], definition: "An extra concept for the test.", importance: 1, evidence: [E("exam:1", "Fast pain: A-delta")], self_confidence: "low" });
  write(ctx, "draft.json", big);
  assert.ok(check({ ...ctx, lecture: LEC, file: join(ctx.work, "draft.json") }).problems.some((p) => /concepts must NOT have more than 50 items/.test(p)));
  const three = goodResult(); three.concepts[0].evidence.push(E("exam:1", "Fast pain: A-delta"));
  write(ctx, "draft.json", three);
  assert.ok(check({ ...ctx, lecture: LEC, file: join(ctx.work, "draft.json") }).problems.some((p) => /must NOT have more than 2 items/.test(p)));

  write(ctx, "results/physio-pain.json", goodResult());
  audit(ctx, "physio-pain", [{ targets: ["concept:pain", "concept:typo"], verdict: "unsupported", detail: "Not in the packet." }]);
  const a = checkAudit({ ...ctx, lecture: LEC, file: join(ctx.work, "audits/physio-pain.json") });
  assert.deepEqual([a.ok, a.targets], [false, 2]);
  assert.match(a.problems[0], /"concept:typo" is not an item in the result/);
});
