#!/usr/bin/env node
// Knowledge preparation (Phase 4).  See docs/04-ingestion.md.
//
//   node pipeline/prep.mjs pack --lectures lec:a,lec:b      build work packets for named lectures
//   node pipeline/prep.mjs pack --next 15 [--subject subj:x] build packets for the next unprocessed lectures
//   node pipeline/prep.mjs ingest [--meta .work/meta.json]   check worker results in .work/results and store them in kb/ai
//   node pipeline/prep.mjs assemble                          rebuild concepts, AI relations and the review queue from kb/ai
//   node pipeline/prep.mjs status                            one-line summary of the manifest
//   node pipeline/prep.mjs check --lecture lec:a --file f    check a draft result without storing anything
//
// Options: --kb <dir> (default kb), --work <dir> (default .work), --force (pack even when unchanged),
//          --now <ISO time> (for tests).
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, appendFileSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import Ajv from "ajv";
import { loadKb } from "./lib/kb.mjs";
import { buildPacket } from "./lib/prep-packet.mjs";
import { checkQuote } from "./lib/evidence.mjs";
import { assemble } from "./lib/prep-assemble.mjs";
import { readJsonl, writeJsonl, writeIfChanged, listJsonl, parseArgs } from "./lib/util.mjs";

const here = dirname(fileURLToPath(import.meta.url));
export const PROMPT_VERSION = "p1";
export const AUDIT_VERSION = "a1";
const readJson = (f) => JSON.parse(readFileSync(f, "utf8"));
const policyOf = () => readJson(join(here, "prep/policy.json"));
const fileSlug = (lectureId) => lectureId.replace(/^lec:/, "");

function context(opts) {
  const kb = opts.kb || "kb", work = opts.work || ".work";
  const rows = loadKb(kb).records.map((r) => r.row);
  const byId = new Map(rows.map((r) => [r.id, r]));
  const manifestFile = join(kb, "admin/prep-manifest.jsonl");
  const manifest = new Map(readJsonl(manifestFile).map((m) => [m.id, m]));
  const now = () => opts.now || new Date().toISOString().replace(/\.\d+Z$/, "Z");
  const log = (event) => { mkdirSync(join(kb, "admin"), { recursive: true }); appendFileSync(join(kb, "admin/prep-log.jsonl"), JSON.stringify({ at: now(), ...event }) + "\n"); };
  const save = () => writeJsonl(manifestFile, [...manifest.values()]);
  const eligible = rows.filter((r) => r.type === "lecture" && !(r.flags || []).includes("no-content"));
  const known = () => rows.filter((r) => r.type === "concept" && r.status !== "rejected").map((c) => ({ name: c.title, kind: c.body.kind, aliases: c.body.aliases || [], subject: c.subject }));
  return { kb, work, rows, byId, manifest, now, log, save, eligible, known };
}

/** Lectures in a stable order: subject order, then module, then position in the module. */
function ordered(ctx) {
  const pos = (id) => (ctx.byId.get(id) || { body: {} }).body.order ?? 0;
  return ctx.eligible.slice().sort((a, b) => pos(a.subject) - pos(b.subject) || (a.subject < b.subject ? -1 : a.subject > b.subject ? 1 : 0) || pos(a.module) - pos(b.module) || pos(a.id) - pos(b.id));
}

export function pack(opts) {
  const ctx = context(opts);
  let chosen;
  if (opts.lectures) chosen = String(opts.lectures).split(",").map((x) => x.trim()).filter(Boolean).map((id) => { const l = ctx.eligible.find((e) => e.id === id); if (!l) throw new Error(`${id} is not a lecture with content`); return l; });
  else if (opts.next) chosen = ordered(ctx).filter((l) => !opts.subject || l.subject === opts.subject);
  else throw new Error("pack needs --lectures or --next");
  const budget = Number(opts.chars || 1000000), max = opts.next ? Number(opts.next) : Infinity;
  const out = [];
  let total = 0;
  mkdirSync(join(ctx.work, "packets"), { recursive: true });
  mkdirSync(join(ctx.work, "results"), { recursive: true });
  mkdirSync(join(ctx.work, "audits"), { recursive: true });
  for (const lec of chosen) {
    if (out.length >= max || (opts.next && out.length && total > budget)) break;
    const known = ctx.known().filter((k) => k.subject === lec.subject);
    const p = buildPacket(lec.id, ctx.byId, ctx.rows, known);
    const m = ctx.manifest.get(lec.id);
    const unchanged = m && m.state === "done" && m.input_hash === p.hash && m.prompt_version === PROMPT_VERSION;
    if (unchanged && !opts.force) { if (opts.lectures) out.push({ lecture: lec.id, skipped: "already processed and unchanged" }); continue; }
    if (opts.next && m && m.state === "failed" && m.input_hash === p.hash && (m.attempts || 0) >= 2 && !opts.force) continue;   // leave for an individual retry
    const s = fileSlug(lec.id);
    writeFileSync(join(ctx.work, "packets", s + ".md"), p.text);
    for (const d of ["results", "audits"]) { const f = join(ctx.work, d, s + ".json"); if (existsSync(f)) rmSync(f); }
    ctx.manifest.set(lec.id, { id: lec.id, subject: lec.subject, state: "packed", input_hash: p.hash, prompt_version: PROMPT_VERSION, attempts: (m && m.input_hash === p.hash ? m.attempts || 0 : 0), packet_chars: p.chars, items: p.items.length, changed_since_last_run: m && m.state === "done" && m.input_hash !== p.hash ? true : undefined, packed_at: ctx.now() });
    out.push({ lecture: lec.id, title: lec.title, packet: join(ctx.work, "packets", s + ".md"), result: join(ctx.work, "results", s + ".json"), audit: join(ctx.work, "audits", s + ".json"), chars: p.chars });
    total += p.chars;
  }
  ctx.save();
  if (out.some((o) => o.packet)) ctx.log({ event: "pack", lectures: out.filter((o) => o.packet).map((o) => o.lecture) });
  return out;
}

/** Checks one worker result against its packet. Returns the stored form, or throws with the reason it is unusable. */
export function checkResult(result, packet, policy, lectureId) {
  if (result.lecture !== lectureId) throw new Error(`result is for ${result.lecture}, expected ${lectureId}`);
  const opt = { minWords: policy.min_quote_words, overlap: policy.approximate_token_overlap };
  const tally = { exact: 0, approximate: 0, weak: 0, failed: 0, "bad-ref": 0 };
  const mark = (ev) => (ev || []).map((e) => { const check = checkQuote(e.quote, packet.blocks[e.ref], opt); tally[check]++; return { ref: e.ref, quote: e.quote, check }; });
  const dropped = [];
  const keys = new Set();
  const concepts = [];
  for (const c of result.concepts) {
    if (keys.has(c.key)) { dropped.push(`duplicate concept key "${c.key}"`); continue; }
    keys.add(c.key);
    concepts.push({ ...c, aliases: [...new Set((c.aliases || []).filter((a) => a.trim() && a.trim().toLowerCase() !== c.name.toLowerCase()))], evidence: mark(c.evidence) });
  }
  const seenRel = new Set();
  const relations = [];
  for (const r of result.relations) {
    const k = `${r.src}|${r.type}|${r.dst}`;
    if (!keys.has(r.src) || !keys.has(r.dst)) { dropped.push(`relation ${k}: refers to a concept that is not in the list`); continue; }
    if (r.src === r.dst) { dropped.push(`relation ${k}: from a concept to itself`); continue; }
    if (seenRel.has(k)) { dropped.push(`relation ${k}: stated twice`); continue; }
    seenRel.add(k);
    relations.push({ ...r, evidence: mark(r.evidence) });
  }
  const want = new Set(packet.items), seenItem = new Set();
  const tests = [];
  for (const t of result.tests) {
    if (!want.has(t.item)) { dropped.push(`tests ${t.item}: not a question or flashcard of this lecture`); continue; }
    if (seenItem.has(t.item)) { dropped.push(`tests ${t.item}: listed twice`); continue; }
    seenItem.add(t.item);
    const good = t.concepts.filter((k) => keys.has(k));
    if (good.length !== t.concepts.length) dropped.push(`tests ${t.item}: refers to a concept that is not in the list`);
    tests.push({ item: t.item, concepts: [...new Set(good)] });
  }
  const missing = packet.items.filter((i) => !seenItem.has(i));
  if (missing.length) dropped.push(`tests: ${missing.length} of ${packet.items.length} questions and flashcards were not listed (${missing.slice(0, 5).join(", ")}${missing.length > 5 ? ", …" : ""})`);
  const conflicts = (result.conflicts || []).map((c) => ({ ...c, evidence: mark(c.evidence) }));
  return { result: { ...result, concepts, relations, tests, conflicts }, evidence: tally, dropped, untagged_items: missing.length };
}

export function ingest(opts) {
  const ctx = context(opts), policy = policyOf();
  const ajv = new Ajv({ allErrors: true, strict: false });
  const okResult = ajv.compile(readJson(join(here, "../schemas/prep-result.schema.json")));
  const okAudit = ajv.compile(readJson(join(here, "../schemas/prep-audit.schema.json")));
  const meta = opts.meta && existsSync(opts.meta) ? readJson(opts.meta) : {};
  const explain = (v) => (v.errors || []).slice(0, 6).map((e) => `${e.instancePath || "/"} ${e.message}`).join("; ");
  const report = [];
  for (const m of [...ctx.manifest.values()].filter((x) => x.state === "packed" || (opts.reaudit && x.state === "done"))) {
    const s = fileSlug(m.id), rf = join(ctx.work, "results", s + ".json"), af = join(ctx.work, "audits", s + ".json");
    const stored = join(ctx.kb, "ai", m.subject.slice(5), s + ".json");
    const info = meta[m.id] || {};
    const fail = (error) => { Object.assign(m, { state: "failed", error, attempts: (m.attempts || 0) + 1, finished_at: ctx.now() }); ctx.log({ event: "failed", lecture: m.id, error }); report.push({ lecture: m.id, state: "failed", error }); };
    if (m.state === "packed") {
      if (!existsSync(rf)) continue;     // worker has not delivered yet
      const packet = buildPacket(m.id, ctx.byId, ctx.rows);
      if (packet.hash !== m.input_hash) { fail("the lecture changed after its packet was built; pack it again"); continue; }
      let raw;
      try { raw = readJson(rf); } catch (e) { fail("result is not valid JSON: " + e.message); continue; }
      if (!okResult(raw)) { fail("result does not match the schema: " + explain(okResult)); continue; }
      if (raw.prompt_version !== PROMPT_VERSION) { fail(`result says prompt_version ${raw.prompt_version}, expected ${PROMPT_VERSION}`); continue; }
      let checked;
      try { checked = checkResult(raw, packet, policy, m.id); } catch (e) { fail(e.message); continue; }
      const doc = { lecture: m.id, input_hash: m.input_hash, prompt_version: PROMPT_VERSION,
        provenance: { worker: info.worker || "unknown", model: info.model || "unknown", finished_at: ctx.now(), seconds: info.seconds, tokens: info.tokens, tool_uses: info.tool_uses, packet_chars: packet.chars, result_chars: readFileSync(rf, "utf8").length },
        evidence: checked.evidence, dropped: checked.dropped, result: checked.result };
      mkdirSync(dirname(stored), { recursive: true });
      writeFileSync(stored, JSON.stringify(doc, null, 1) + "\n");
      const total = Object.values(checked.evidence).reduce((a, b) => a + b, 0);
      Object.assign(m, { state: "done", error: undefined, attempts: (m.attempts || 0) + 1, finished_at: ctx.now(), worker: doc.provenance.worker, model: doc.provenance.model, seconds: info.seconds, tokens: info.tokens,
        result_chars: doc.provenance.result_chars, concepts: checked.result.concepts.length, relations: checked.result.relations.length, evidence_exact_share: total ? Math.round((checked.evidence.exact / total) * 1000) / 1000 : 0, dropped: checked.dropped.length });
      ctx.log({ event: "done", lecture: m.id, concepts: m.concepts, relations: m.relations, evidence: checked.evidence, dropped: checked.dropped.length, seconds: info.seconds, tokens: info.tokens });
      report.push({ lecture: m.id, state: "done", concepts: m.concepts, relations: m.relations, evidence: checked.evidence, dropped: checked.dropped });
    }
    if (m.state === "done" && existsSync(af) && existsSync(stored)) {
      let audit;
      try { audit = readJson(af); } catch (e) { ctx.log({ event: "audit-failed", lecture: m.id, error: e.message }); continue; }
      if (!okAudit(audit) || audit.lecture !== m.id) { ctx.log({ event: "audit-failed", lecture: m.id, error: explain(okAudit) || "wrong lecture" }); m.audit = { state: "failed" }; continue; }
      const doc = readJson(stored), a = (meta[m.id] || {}).audit || {};
      doc.audit = { audit_version: AUDIT_VERSION, model: a.model || "unknown", seconds: a.seconds, tokens: a.tokens, findings: audit.findings, missed: audit.missed };
      writeFileSync(stored, JSON.stringify(doc, null, 1) + "\n");
      m.audit = { state: "done", version: AUDIT_VERSION, findings: audit.findings.length, missed: audit.missed.length, seconds: a.seconds, tokens: a.tokens };
      ctx.log({ event: "audited", lecture: m.id, findings: audit.findings.length, missed: audit.missed.length });
      rmSync(af);
    }
  }
  ctx.save();
  // Batch stop rule: tell the caller to stop when too much of the batch is unusable.
  const done = report.filter((r) => r.state === "done"), failed = report.filter((r) => r.state === "failed");
  const ev = done.reduce((a, r) => { for (const [k, v] of Object.entries(r.evidence)) a[k] = (a[k] || 0) + v; return a; }, {});
  const evTotal = Object.values(ev).reduce((a, b) => a + b, 0);
  const stop = [];
  if (report.length && failed.length / report.length > policy.batch_stop.max_failed_lectures_share) stop.push(`${failed.length} of ${report.length} lectures failed`);
  if (evTotal && (ev.exact || 0) / evTotal < policy.batch_stop.min_exact_evidence_share) stop.push(`only ${Math.round(((ev.exact || 0) / evTotal) * 100)}% of quotations were found word for word`);
  return { lectures: report, evidence: ev, stop };
}

export function runAssemble(opts) {
  const ctx = context(opts), policy = policyOf();
  const aiDir = join(ctx.kb, "ai");
  const results = [];
  const walk = (d) => { if (!existsSync(d)) return; for (const e of readdirSync(d, { withFileTypes: true })) { if (e.isDirectory()) walk(join(d, e.name)); else if (e.name.endsWith(".json")) results.push(readJson(join(d, e.name))); } };
  walk(aiDir);
  const imported = new Map([...ctx.byId].filter(([, r]) => r.origin !== "ai"));
  const rowsNoAi = ctx.rows.filter((r) => r.origin !== "ai");
  for (const r of results) r.blocks_text = buildPacket(r.lecture, imported, rowsNoAi).blocks;
  const decisions = readJsonl(join(ctx.kb, "admin/review-decisions.jsonl"));
  const conceptMap = readJsonl(join(ctx.kb, "admin/concept-map.jsonl"));
  const out = assemble({ results, byId: imported, policy, decisions, conceptMap });

  let written = 0;
  const w = (file, rows) => { if (writeJsonl(join(ctx.kb, file), rows)) written++; };
  w("records/concepts.jsonl", out.concepts);
  const bySubject = {};
  for (const { subject, row } of out.relations) (bySubject[subject] = bySubject[subject] || []).push(row);
  for (const old of listJsonl(join(ctx.kb, "relations/ai"))) if (!bySubject[old.replace(/\.jsonl$/, "")]) rmSync(join(ctx.kb, "relations/ai", old));
  for (const [s, rows] of Object.entries(bySubject)) w(`relations/ai/${s}.jsonl`, rows);
  w("admin/concept-map.jsonl", out.conceptMap);
  w("admin/review-queue.jsonl", out.queue);

  // registry: concepts are issued by "prep"; one that is no longer produced is retired, never reused
  const regFile = join(ctx.kb, "admin/id-registry.jsonl");
  const reg = new Map(readJsonl(regFile).map((e) => [e.id, e]));
  const today = ctx.now().slice(0, 10), live = new Set(out.concepts.map((c) => c.id));
  for (const c of out.concepts) { const e = reg.get(c.id); if (!e) reg.set(c.id, { id: c.id, type: "concept", by: "prep", status: "active", first_seen: today, updated: today }); else if (e.status !== "active") { e.status = "active"; e.updated = today; } }
  for (const e of reg.values()) if (e.by === "prep" && e.status === "active" && !live.has(e.id)) { e.status = "retired"; e.updated = today; }
  if (writeJsonl(regFile, [...reg.values()])) written++;

  const count = (rows, f) => rows.reduce((a, r) => { const k = f(r); a[k] = (a[k] || 0) + 1; return a; }, {});
  const summary = {
    lectures: results.length, concepts: out.concepts.length, contributions_merged: out.merges,
    concept_status: count(out.concepts, (c) => c.status), concept_confidence: count(out.concepts, (c) => c.confidence),
    relations: out.relations.length, relation_status: count(out.relations, (r) => r.row.status), relation_types: count(out.relations, (r) => r.row.type),
    queue: out.queue.length, queue_reasons: count(out.queue, (q) => q.reason), files_written: written,
  };
  ctx.log({ event: "assemble", ...summary });
  return summary;
}

/** For workers: check a draft result against its packet before handing it in. Changes nothing. */
export function check(opts) {
  if (!opts.lecture || !opts.file) throw new Error("check needs --lecture and --file");
  const ctx = context(opts), policy = policyOf();
  const ajv = new Ajv({ allErrors: true, strict: false });
  const ok = ajv.compile(readJson(join(here, "../schemas/prep-result.schema.json")));
  let raw;
  try { raw = readJson(opts.file); } catch (e) { return { ok: false, problems: ["not valid JSON: " + e.message] }; }
  if (!ok(raw)) return { ok: false, problems: (ok.errors || []).slice(0, 20).map((e) => `schema: ${e.instancePath || "/"} ${e.message}`) };
  const imported = new Map([...ctx.byId].filter(([, r]) => r.origin !== "ai"));
  const packet = buildPacket(opts.lecture, imported, ctx.rows.filter((r) => r.origin !== "ai"));
  const c = checkResult(raw, packet, policy, opts.lecture);
  const problems = [...c.dropped];
  const bad = (where, ev) => { for (const e of ev) if (e.check !== "exact") problems.push(`${where}: quote not found word for word in [${e.ref}] (${e.check}): "${e.quote.slice(0, 90)}"`); };
  for (const x of c.result.concepts) { if (!x.evidence.length) problems.push(`concept ${x.key}: no evidence`); bad(`concept ${x.key}`, x.evidence); }
  for (const x of c.result.relations) { if (!x.evidence.length) problems.push(`relation ${x.src}|${x.type}|${x.dst}: no evidence`); bad(`relation ${x.src}|${x.type}|${x.dst}`, x.evidence); }
  return { ok: problems.length === 0, concepts: c.result.concepts.length, relations: c.result.relations.length, evidence: c.evidence, problems };
}

export function status(opts) {
  const ctx = context(opts);
  const states = {};
  for (const l of ctx.eligible) { const s = (ctx.manifest.get(l.id) || { state: "pending" }).state; states[s] = (states[s] || 0) + 1; }
  return { eligible: ctx.eligible.length, ...states };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [cmd, ...rest] = process.argv.slice(2);
  const opts = parseArgs(rest);
  const run = { pack, ingest, assemble: runAssemble, status, check }[cmd];
  if (!run) { console.error("Usage: node pipeline/prep.mjs pack|ingest|assemble|status [options]"); process.exit(2); }
  try { console.log(JSON.stringify(run(opts), null, 2)); }
  catch (e) { console.error(`prep ${cmd} failed: ${e.message}`); process.exit(1); }
}
