import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, appendFileSync } from "node:fs";
import { join } from "node:path";
import { runImport } from "../pipeline/import-sina.mjs";
import { validateKb } from "../pipeline/validate.mjs";
import { computeStats, coverageMarkdown } from "../pipeline/stats.mjs";
import { readJsonl, listJsonl } from "../pipeline/lib/util.mjs";
import { rawQKey } from "../pipeline/lib/qkey.mjs";
import { sampleSina, writeSite, tmpKb } from "./helpers.mjs";

const snapshot = (kb) => Object.fromEntries(listJsonl(kb).map((f) => [f, readFileSync(join(kb, f), "utf8")]));
const imp = (site, kb, extra = {}) => runImport({ sina: site.dir, ocr: site.ocr, kb, quiet: true, ...extra });

test("a fresh import validates cleanly", () => {
  const site = writeSite(sampleSina()), kb = tmpKb();
  const r = imp(site, kb, { date: "2026-01-01" });
  assert.ok(r.created > 20);
  const v = validateKb(kb);
  assert.deepEqual(v.errors, []);
  assert.equal(v.checked.records, r.created);
});

test("running the import twice changes nothing, even on a later date", () => {
  const site = writeSite(sampleSina()), kb = tmpKb();
  imp(site, kb, { date: "2026-01-01" });
  const before = snapshot(kb);
  const r = imp(site, kb, { date: "2026-06-01" });
  assert.deepEqual({ created: r.created, changed: r.changed, retired: r.retired, filesWritten: r.filesWritten }, { created: 0, changed: 0, retired: 0, filesWritten: 0 });
  assert.deepEqual(snapshot(kb), before);
});

test("an edited record keeps its first-seen date and gets a new updated date", () => {
  const sina = sampleSina(), kb = tmpKb();
  imp(writeSite(sina), kb, { date: "2026-01-01" });
  sina.lectures["physio-pain"].summary[0].html = "<p>Rewritten.</p>";
  const r = imp(writeSite(sina), kb, { date: "2026-02-02" });
  assert.equal(r.changed, 1);
  const e = readJsonl(join(kb, "admin/id-registry.jsonl")).find((x) => x.id === "sec:physio-pain/big");
  assert.deepEqual([e.first_seen, e.updated], ["2026-01-01", "2026-02-02"]);
});

test("a question that vanishes stops the import unless retirement is allowed", () => {
  const sina = sampleSina(), kb = tmpKb();
  imp(writeSite(sina), kb, { date: "2026-01-01" });
  const before = snapshot(kb);
  sina.lectures["physio-pain"].mcqs[0].q = "What does allodynia mean?";   // reworded on Sina without an alias
  const site = writeSite(sina);
  assert.throws(() => imp(site, kb, { date: "2026-02-02" }), /no longer produced[\s\S]*q:1egt1vv[\s\S]*Nothing was written/);
  assert.deepEqual(snapshot(kb), before);

  const r = imp(site, kb, { date: "2026-02-02", allowRetire: true });
  assert.equal(r.retired, 1);
  const reg = readJsonl(join(kb, "admin/id-registry.jsonl"));
  assert.equal(reg.find((x) => x.id === "q:1egt1vv").status, "retired");
  assert.deepEqual(validateKb(kb).errors, []);
});

test("with an alias the reworded question keeps its ID", () => {
  const sina = sampleSina(), kb = tmpKb();
  imp(writeSite(sina), kb, { date: "2026-01-01" });
  sina.lectures["physio-pain"].mcqs[0].q = "What does allodynia mean?";
  sina.qAlias = { [rawQKey(sina.lectures["physio-pain"].mcqs[0])]: "1egt1vv" };
  const r = imp(writeSite(sina), kb, { date: "2026-02-02" });
  assert.deepEqual({ created: r.created, changed: r.changed, retired: r.retired }, { created: 0, changed: 1, retired: 0 });
});

test("files for a subject that disappears are removed", () => {
  const sina = sampleSina(), kb = tmpKb();
  sina.subjects.push({ id: "extra", name: "Extra", semester: "S3", status: "live", program: "y2-anglo", groups: [{ name: "G", items: [{ id: "extra-1", title: "One" }] }] });
  sina.lectures["extra-1"] = { id: "extra-1", title: "One", summary: [{ id: "a", title: "A", html: "<p>a</p>" }], mcqs: [], cards: [] };
  imp(writeSite(sina), kb, { date: "2026-01-01" });
  assert.ok(listJsonl(kb).includes("records/extra/lectures.jsonl"));
  imp(writeSite(sampleSina()), kb, { date: "2026-02-02", allowRetire: true });
  assert.ok(!listJsonl(kb).some((f) => f.includes("/extra/")));
  assert.deepEqual(validateKb(kb).errors, []);
});

test("the import refuses to run without slide text unless told to", () => {
  const site = writeSite(sampleSina());
  assert.throws(() => runImport({ sina: site.dir, kb: tmpKb(), quiet: true }), /--no-ocr/);
  assert.throws(() => runImport({ kb: tmpKb(), quiet: true }), /--sina/);
});

test("the validator catches broken records, relations and registry entries", () => {
  const site = writeSite(sampleSina()), kb = tmpKb();
  imp(site, kb, { date: "2026-01-01" });
  const file = join(kb, "records/physio/mcqs.jsonl");
  const rows = readJsonl(file);
  rows[0].lecture = "lec:does-not-exist";
  rows[1].body.answer = [9];
  rows[2].status = "published";
  writeFileSync(file, rows.map((r) => JSON.stringify(r)).join("\n") + "\n");
  appendFileSync(join(kb, "relations/imported/physio.jsonl"),
    JSON.stringify({ id: "rel:000000000000", src: "q:nope", type: "tests", dst: "lec:physio-pain", origin: "ai", status: "approved" }) + "\n" +
    JSON.stringify({ id: "rel:000000000001", src: "lec:physio-pain", type: "likes", dst: "lec:physio-soon", origin: "admin", status: "approved" }) + "\n");
  appendFileSync(join(kb, "records/hierarchy.jsonl"), JSON.stringify({ id: "subj:ghost", type: "subject", title: "Ghost", origin: "admin", status: "approved" }) + "\n");
  const errors = validateKb(kb).errors.join("\n");
  assert.match(errors, /lecture "lec:does-not-exist" does not exist/);
  assert.match(errors, /answer index beyond the last option/);
  assert.match(errors, /\/status must be equal to one of the allowed values/);
  assert.match(errors, /src "q:nope" does not exist/);
  assert.match(errors, /AI-suggested relation is approved but has no reviewer/);
  assert.match(errors, /rel:000000000001: \/type must match pattern/);
  assert.match(errors, /subj:ghost: not in the ID registry/);
});

test("statistics report what is there, including gaps", () => {
  const site = writeSite(sampleSina()), kb = tmpKb();
  imp(site, kb, { date: "2026-01-01" });
  const s = computeStats(kb);
  assert.equal(s.resources.discovered, 2);
  assert.equal(s.resources.imported, 1);
  assert.deepEqual(s.gaps.lectures_without_content, ["lec:physio-soon"]);
  assert.equal(s.slides.total, 3);
  assert.equal(s.slides.with_text, 1);
  assert.equal(s.questions.in_lectures, 6);
  assert.equal(s.questions.in_papers_only, 3);
  assert.equal(s.questions.citing_a_slide, 1);
  assert.equal(s.concepts.total, 0);
  assert.equal(s.subjects["subj:physio"].mcqs, 6);
  assert.deepEqual(s.gaps.lectures_with_untexted_slides, [{ id: "lec:physio-pain", missing: 2, of: 3 }]);
  assert.match(coverageMarkdown(s), /Lectures not yet extracted \| 1 \|/);
});
