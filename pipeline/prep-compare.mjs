#!/usr/bin/env node
// Compares two stored results for the same lecture (for example before and after a change of instructions).
//   node pipeline/prep-compare.mjs --old reports/prep/pilot-p1/anat3-larynx.json --new kb/ai/anat3/anat3-larynx.json
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { loadKb } from "./lib/kb.mjs";
import { mentions } from "./lib/evidence.mjs";
import { nameKey } from "./lib/prep-assemble.mjs";
import { parseArgs } from "./lib/util.mjs";

const here = dirname(fileURLToPath(import.meta.url));

export function compareResults(oldDoc, newDoc, kb = "kb") {
  const policy = JSON.parse(readFileSync(join(here, "prep/policy.json"), "utf8"));
  const clinical = new RegExp("\\b(" + policy.clinical_terms.join("|") + ")\\b", "i");
  const rows = loadKb(kb).records.map((r) => r.row), lec = rows.find((r) => r.id === newDoc.lecture);
  const side = (doc) => {
    const R = doc.result, names = new Map();
    for (const c of R.concepts) for (const n of [c.name, ...(c.aliases || [])]) if (!names.has(nameKey(n))) names.set(nameKey(n), c.key);
    const tested = new Map();
    for (const t of R.tests) for (const k of t.concepts) tested.set(k, (tested.get(k) || 0) + 1);
    const cited = new Set([...R.concepts, ...R.relations].flatMap((x) => x.evidence.map((e) => e.ref)));
    const found = (text) => R.concepts.some((c) => [c.name, ...(c.aliases || [])].some((n) => mentions(text, n) || mentions(text, nameKey(n))));
    const sum = (o) => Object.values(o).reduce((a, b) => a + b, 0);
    const f = (doc.audit && doc.audit.findings) || [];
    const targets = (x) => x.targets || [x.target];
    return { R, names, tested,
      stats: {
        concepts: R.concepts.length, relations: R.relations.length, quotations: sum(doc.evidence), quotations_exact: doc.evidence.exact,
        result_characters: doc.provenance.result_chars,
        relation_types: R.relations.reduce((m, r) => ((m[r.type] = (m[r.type] || 0) + 1), m), {}),
        exam_points_covered: (lec.body.exam_points || []).filter(found).length + " of " + (lec.body.exam_points || []).length,
        sections_quoted: rows.filter((r) => r.lecture === lec.id && r.type === "section" && cited.has(r.id)).length,
        slides_quoted: rows.filter((r) => r.lecture === lec.id && r.type === "slide" && cited.has(r.id)).length,
        items_linked: R.tests.filter((t) => t.concepts.length).length + " of " + R.tests.length,
        concepts_tested: R.concepts.filter((c) => tested.has(c.key)).length,
        definitions_with_clinical_wording_in_non_clinical_concepts: R.concepts.filter((c) => !policy.clinical_kinds.includes(c.kind) && clinical.test(c.definition)).length,
        conflicts_reported: R.conflicts.length, conflict_items_held: R.conflicts.reduce((a, c) => a + (c.affects || []).length, 0),
        audit_findings: f.length, audit_items_flagged: f.reduce((a, x) => a + targets(x).length, 0),
        audit_by_verdict: f.reduce((m, x) => ((m[x.verdict] = (m[x.verdict] || 0) + targets(x).length), m), {}),
        audit_missed: ((doc.audit && doc.audit.missed) || []).length,
        worker_seconds: doc.provenance.seconds, worker_output_tokens: doc.provenance.usage && doc.provenance.usage.output, worker_new_input_tokens: doc.provenance.usage && doc.provenance.usage.cache_write,
        audit_seconds: doc.audit && doc.audit.seconds, audit_output_tokens: doc.audit && doc.audit.usage && doc.audit.usage.output, audit_new_input_tokens: doc.audit && doc.audit.usage && doc.audit.usage.cache_write,
      } };
  };
  const A = side(oldDoc), B = side(newDoc);
  const inB = (c) => [c.name, ...(c.aliases || [])].some((n) => B.names.has(nameKey(n)));
  const inA = (c) => [c.name, ...(c.aliases || [])].some((n) => A.names.has(nameKey(n)));
  const lost = A.R.concepts.filter((c) => !inB(c)).map((c) => ({ name: c.name, importance: c.importance, tested_by: A.tested.get(c.key) || 0 }));
  const gained = B.R.concepts.filter((c) => !inA(c)).map((c) => ({ name: c.name, importance: c.importance, tested_by: B.tested.get(c.key) || 0 }));
  return { lecture: newDoc.lecture, old: { version: oldDoc.prompt_version, ...A.stats }, new: { version: newDoc.prompt_version, ...B.stats },
    concepts_only_in_old: lost.sort((a, b) => b.tested_by - a.tested_by || b.importance - a.importance), concepts_only_in_new: gained,
    lost_but_tested_in_old: lost.filter((c) => c.tested_by > 0).length, lost_importance_3: lost.filter((c) => c.importance === 3).length };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const o = parseArgs(process.argv.slice(2));
  console.log(JSON.stringify(compareResults(JSON.parse(readFileSync(o.old, "utf8")), JSON.parse(readFileSync(o.new, "utf8")), o.kb || "kb"), null, 1));
}
