// Turns the stored worker results (kb/ai/**) into concept records, relations and a review queue.
// Deterministic: the same results, policy, decisions and concept map always give the same output.
// Nothing here calls a model, and nothing here edits imported records.
import { normalise, mentions } from "./evidence.mjs";
import { slug, shortHash, compact } from "./util.mjs";

const RANK = { low: 0, medium: 1, high: 2 };
const best = (a, b) => (RANK[a] >= RANK[b] ? a : b);
const worst = (a, b) => (RANK[a] <= RANK[b] ? a : b);

/** Name reduced to a comparison form: lowercase, no punctuation, trailing plural "s" removed from each word. */
export function nameKey(name) {
  return normalise(name).split(" ").map((w) => (w.length > 4 && /[^sui]s$/.test(w) ? w.slice(0, -1) : w)).join(" ");   // folds → fold, but pons, plexus, iris stay
}
const strongAlias = (a) => { const n = normalise(a); return n.includes(" ") || n.length >= 8; };

/**
 * @param {object} input
 * @param {object[]} input.results    stored results (kb/ai/<subject>/<lecture>.json), any order
 * @param {Map<string,object>} input.byId  imported records
 * @param {object} input.policy       pipeline/prep/policy.json
 * @param {object[]} [input.decisions]  human review decisions
 * @param {object[]} [input.conceptMap] previous assignment of (lecture, key) to concept IDs
 */
export function assemble({ results, byId, policy, decisions = [], conceptMap = [] }) {
  // With require_audit, a lecture whose result has not been independently audited contributes nothing yet.
  const awaitingAudit = policy.require_audit ? results.filter((r) => !r.audit).map((r) => r.lecture).sort() : [];
  results = results.filter((r) => !policy.require_audit || r.audit).sort((a, b) => (a.lecture < b.lecture ? -1 : 1));
  const queue = [];
  const enqueue = (reason, severity, target, lecture, summary, extra = {}) =>
    queue.push(compact({ id: "rq:" + shortHash([reason, target, lecture, summary].join("|")), reason, severity, target, lecture, summary, ...extra }));
  const decided = new Map(decisions.filter((d) => d.action === "approve" || d.action === "reject").map((d) => [d.target, d]));
  const mergedInto = new Map(decisions.filter((d) => d.action === "merge").map((d) => [d.target, d.into]));
  const severe = new Set(policy.severe_audit_verdicts);
  const clinicalRel = new Set(policy.clinical_relations), clinicalKind = new Set(policy.clinical_kinds);
  const asym = new Set(policy.asymmetric_relations);
  const clinicalWords = new RegExp("\\b(" + (policy.clinical_terms || ["\\0"]).join("|") + ")\\b", "i");
  const soundsClinical = (text) => clinicalWords.test(String(text || ""));

  // ---- 1. give every contributed concept an ID --------------------------
  const concepts = new Map();          // id -> working object
  const byName = new Map(), byAlias = new Map();
  const assigned = new Map();          // "lec|key" -> concept id
  const usedIds = new Set(conceptMap.map((m) => m.concept));
  const register = (id, c, lecture) => {
    if (mergedInto.has(id)) id = mergedInto.get(id);
    if (!concepts.has(id)) concepts.set(id, { id, contributions: [] });
    concepts.get(id).contributions.push({ lecture, c });
    assigned.set(lecture + "|" + c.key, id);
    byName.set(nameKey(c.name), id);
    for (const a of c.aliases || []) if (strongAlias(a) && !byName.has(nameKey(a))) byAlias.set(nameKey(a), id);
    return id;
  };
  const previous = new Map(conceptMap.map((m) => [m.id, m]));
  const pending = [];
  for (const r of results) for (const c of r.result.concepts) {
    const old = previous.get(r.lecture + "|" + c.key);
    if (old && nameKey(old.name) === nameKey(c.name)) register(old.concept, c, r.lecture);   // keep IDs issued earlier
    else pending.push({ r, c });
  }
  const subj = (lecture) => (byId.get(lecture) || {}).subject;
  const aliasCandidates = [];          // same alternative name, different subject: too risky to merge without a person
  for (const { r, c } of pending) {
    const k = nameKey(c.name);
    let id = byName.get(k), viaAlias = null;
    if (!id && byAlias.has(k)) viaAlias = byAlias.get(k);
    if (!id && !viaAlias) for (const a of c.aliases || []) { if (strongAlias(a) && byName.has(nameKey(a))) { viaAlias = byName.get(nameKey(a)); break; } }
    if (!id && viaAlias) {
      if (concepts.get(viaAlias).contributions.some((x) => subj(x.lecture) === subj(r.lecture))) id = viaAlias;
      else aliasCandidates.push({ lecture: r.lecture, key: c.key, other: viaAlias });
    }
    if (!id) {
      const base = slug(nameKey(c.name)) || "concept";      // singular form, so the ID does not depend on which lecture came first
      id = "c:" + base;
      for (let n = 2; usedIds.has(id) || concepts.has(id); n++) id = "c:" + base + "-" + n;
      usedIds.add(id);
    }
    register(id, c, r.lecture);
  }

  // ---- 2. what tests what, and audit findings by target ------------------
  const tested = new Map();            // concept id -> Set of item ids
  const itemText = (id) => { const x = byId.get(id); if (!x) return ""; const b = x.body; return [b.stem, ...(b.options || []), b.explanation, ...(b.option_notes || []), b.front, b.back].filter(Boolean).join(" "); };
  const audit = new Map();             // "lec|target" -> findings
  const disputed = new Map();          // "lec|target" -> conflicts the worker reported in the lecture that this item rests on
  for (const r of results) {
    for (const f of (r.audit && r.audit.findings) || []) for (const target of f.targets || [f.target]) { const k = r.lecture + "|" + target; if (!audit.has(k)) audit.set(k, []); audit.get(k).push(f); }
    for (const c of r.result.conflicts || []) for (const target of c.affects || []) { const k = r.lecture + "|" + target; if (!disputed.has(k)) disputed.set(k, []); disputed.get(k).push(c); }
    for (const t of r.result.tests) for (const key of t.concepts) {
      const id = assigned.get(r.lecture + "|" + key); if (!id) continue;
      if (!tested.has(id)) tested.set(id, new Set()); tested.get(id).add(t.item);
    }
  }
  const findings = (lecture, target) => audit.get(lecture + "|" + target) || [];
  const hasSevere = (fs) => fs.some((f) => severe.has(f.verdict));
  const inDispute = (lecture, target) => (disputed.get(lecture + "|" + target) || []).length > 0;

  // ---- 3. concept records -------------------------------------------------
  const relations = new Map();
  const addRel = (subject, rel) => {
    const symmetric = rel.type === "contrasts-with" || rel.type === "related-to";
    let { src, dst } = rel;
    if (symmetric && src > dst) [src, dst] = [dst, src];
    const id = "rel:" + shortHash(src + "|" + rel.type + "|" + dst);
    const have = relations.get(id);
    if (!have) { relations.set(id, { ...rel, id, src, dst, subject, lectures: [rel.lecture], provenance: rel.provenance || [] }); return; }
    if (!have.lectures.includes(rel.lecture)) have.lectures.push(rel.lecture);
    have.confidence = best(have.confidence, rel.confidence);
    have.hold = [...new Set([...(have.hold || []), ...(rel.hold || [])])];
    for (const p of rel.provenance || []) if (!have.provenance.some((x) => x.unit === p.unit && x.quote === p.quote)) have.provenance.push(p);
  };
  const prov = (lecture, e) => (/^(sec|slide|q|card):/.test(e.ref) ? { source: lecture, unit: e.ref, quote: e.quote } : { source: lecture, locator: e.ref, quote: e.quote });
  const subjectOf = (lecture) => ((byId.get(lecture) || {}).subject || "subj:misc").slice(5);

  const conceptRows = [];
  let merges = 0;
  for (const C of [...concepts.values()].sort((a, b) => (a.id < b.id ? -1 : 1))) {
    C.contributions.sort((a, b) => (a.lecture < b.lecture ? -1 : 1));
    merges += C.contributions.length - 1;
    const kinds = {};
    for (const { c } of C.contributions) kinds[c.kind] = (kinds[c.kind] || 0) + 1;
    // If any lecture classes it as clinical, every definition of it is treated as clinical: the cautious reading wins.
    const clinical = Object.keys(kinds).some((x) => clinicalKind.has(x));
    const defs = [];
    let conf = "low";
    for (const { lecture, c } of C.contributions) {
      const ev = c.evidence || [];
      const exact = ev.filter((e) => e.check === "exact"), approx = ev.filter((e) => e.check === "approximate");
      const fs = findings(lecture, "concept:" + c.key);
      const isTested = (tested.get(C.id) || new Set()).size > 0;
      const distinct = new Set(exact.map((e) => e.ref)).size;
      let k = "low";
      if (exact.length || approx.length) k = "medium";
      if (exact.length && (isTested || distinct >= 2) && c.self_confidence !== "low" && !fs.length && !clinical && !soundsClinical(c.definition) && !inDispute(lecture, "concept:" + c.key)) k = "high";
      // A severe audit finding is about what the definition says. It holds the definition; the concept itself
      // (a name with pointers to the lecture) stays, so one doubted detail does not hide a whole topic.
      conf = best(conf, k);
      const hold = [];
      if (k === "low") hold.push("unsupported");
      if (hasSevere(fs)) hold.push("audit");
      if (inDispute(lecture, "concept:" + c.key)) hold.push("lecture-conflict");
      const wording = !clinical && soundsClinical(c.definition);
      if (clinical) hold.push("clinical-definition");
      if (wording) hold.push("clinical-wording");
      defs.push(compact({ lecture, text: c.definition, confidence: k, status: hold.length ? "proposed" : "auto-accepted", held_for: hold, evidence: ev.map((e) => ({ ...prov(lecture, e), check: e.check })) }));
      if (k === "low") enqueue("unsupported-concept", "high", C.id, lecture, `${c.name}: ${c.definition}`, { detail: "No quotation could be found in the cited block." });
      else if (hasSevere(fs)) enqueue("audit-finding", "high", C.id, lecture, `${c.name}: ${c.definition}`, { detail: fs.map((f) => `${f.verdict}: ${f.detail}`).join(" | ") });
      else if (clinical || wording) enqueue("clinical-definition", "medium", C.id, lecture, `${c.name}: ${c.definition}`, { evidence: ev.filter((e) => e.check === "exact").slice(0, 1).map((e) => prov(lecture, e)) });
      for (const f of fs.filter((f) => !severe.has(f.verdict))) enqueue("audit-finding", "low", C.id, lecture, `${c.name}: ${f.verdict}`, { detail: f.detail });
      // where the concept is explained, and that the lecture covers it
      for (const e of exact) if (/^(sec|slide):/.test(e.ref)) addRel(subjectOf(lecture), { src: e.ref, type: "explains", dst: C.id, lecture, confidence: "high", provenance: [prov(lecture, e)] });
      addRel(subjectOf(lecture), { src: lecture, type: "covers", dst: C.id, lecture, confidence: k === "low" ? "low" : "high", attrs: { importance: c.importance }, hold: k === "low" ? ["unsupported"] : [] });
    }
    const kindList = Object.entries(kinds).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
    if (kindList.length > 1) enqueue("kind-disagreement", "low", C.id, C.contributions[0].lecture, `${C.contributions[0].c.name}: classified as ${kindList.map(([k, n]) => `${k} (${n})`).join(", ")}`);
    const first = C.contributions[0].c;
    const names = new Map();
    for (const { c } of C.contributions) for (const n of [c.name, ...(c.aliases || [])]) if (nameKey(n) !== nameKey(first.name) && !names.has(normalise(n))) names.set(normalise(n), n);
    const d = decided.get(C.id);
    C.kind = (kindList.find(([x]) => clinicalKind.has(x)) || kindList[0])[0]; C.name = first.name; C.aliases = [...names.values()]; C.confidence = conf;
    C.status = d ? (d.action === "approve" ? "approved" : "rejected") : conf === "low" ? "proposed" : "auto-accepted";
    conceptRows.push(compact({
      id: C.id, type: "concept", title: first.name, origin: "ai", status: C.status, verification: "unverified", confidence: conf, reviewed_by: d && d.by,
      subject: (byId.get(C.contributions[0].lecture) || {}).subject,
      body: { kind: C.kind, aliases: C.aliases, importance: Math.max(...C.contributions.map((x) => x.c.importance)), tested_by: (tested.get(C.id) || new Set()).size || undefined,
        lectures: [...new Set(C.contributions.map((x) => x.lecture))], definitions: defs },
    }));
  }

  // possible duplicates that were not merged automatically
  const list = [...concepts.values()];
  const tokens = new Map(list.map((c) => [c.id, new Set(nameKey(c.name).split(" "))]));
  const weakAlias = new Map();
  for (const c of list) for (const a of c.aliases) { const k = nameKey(a); if (!weakAlias.has(k)) weakAlias.set(k, []); weakAlias.get(k).push(c.id); }
  const dupSeen = new Set();
  const dup = (a, b, why) => { const k = [a, b].sort().join("|"); if (a === b || dupSeen.has(k)) return; dupSeen.add(k); enqueue("possible-duplicate", "medium", a, concepts.get(a).contributions[0].lecture, `${concepts.get(a).name} ↔ ${concepts.get(b).name}`, { detail: why, other: b }); };
  for (const a of aliasCandidates) dup(assigned.get(a.lecture + "|" + a.key), a.other, "one is listed as another name for the other, in a different subject");
  for (const c of list) { const other = weakAlias.get(nameKey(c.name)); for (const o of other || []) dup(o, c.id, "one is listed as another name for the other"); }
  for (const ids of weakAlias.values()) for (let i = 1; i < ids.length; i++) dup(ids[0], ids[i], "they share an alternative name");
  for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
    const a = tokens.get(list[i].id), b = tokens.get(list[j].id);
    if (a.size < 2 || b.size < 2 || list[i].kind !== list[j].kind) continue;
    const inter = [...a].filter((x) => b.has(x)).length;
    if (inter / (a.size + b.size - inter) >= 0.75) dup(list[i].id, list[j].id, "their names are nearly the same");
  }

  // ---- 4. concept-to-concept relations ------------------------------------
  let droppedSelf = 0;
  for (const r of results) {
    const blocksText = (e) => (r.blocks_text && r.blocks_text[e.ref]) || "";
    for (const rel of r.result.relations) {
      const src = assigned.get(r.lecture + "|" + rel.src), dst = assigned.get(r.lecture + "|" + rel.dst);
      if (!src || !dst) continue;
      if (src === dst) { droppedSelf++; continue; }
      const S = concepts.get(src), D = concepts.get(dst);
      const ev = rel.evidence || [], exact = ev.filter((e) => e.check === "exact"), approx = ev.filter((e) => e.check === "approximate");
      const fs = findings(r.lecture, `relation:${rel.src}|${rel.type}|${rel.dst}`);
      const named = (C, text) => [C.name, ...C.aliases].some((n) => mentions(text, n) || mentions(text, nameKey(n)));
      const coMention = exact.some((e) => { const t = e.quote + " " + blocksText(e); return named(S, t) && named(D, t); });
      let k = "low";
      if (exact.length || approx.length) k = "medium";
      const relTarget = `relation:${rel.src}|${rel.type}|${rel.dst}`;
      if (exact.length && coMention && rel.self_confidence !== "low" && !fs.length && !inDispute(r.lecture, relTarget)) k = "high";
      if (hasSevere(fs)) k = "low";
      k = worst(k, best(S.confidence, "medium") === S.confidence ? "high" : "low");
      k = worst(k, best(D.confidence, "medium") === D.confidence ? "high" : "low");
      const hold = [];
      if (clinicalRel.has(rel.type) || soundsClinical(rel.statement)) hold.push("clinical-claim");
      if (inDispute(r.lecture, relTarget)) hold.push("lecture-conflict");
      if (k === "low") hold.push(hasSevere(fs) ? "audit" : "unsupported");
      addRel(subjectOf(r.lecture), { src, type: rel.type, dst, lecture: r.lecture, confidence: k, rationale: rel.statement, hold, provenance: ev.filter((e) => e.check === "exact" || e.check === "approximate").map((e) => prov(r.lecture, e)), audit: fs });
    }
    // questions and flashcards
    for (const t of r.result.tests) for (const key of t.concepts) {
      const id = assigned.get(r.lecture + "|" + key); if (!id || !byId.has(t.item)) continue;
      const C = concepts.get(id), fs = findings(r.lecture, "tests:" + t.item), text = itemText(t.item);
      const lexical = [C.name, ...C.aliases].some((n) => mentions(text, n) || mentions(text, nameKey(n)));
      const k = hasSevere(fs) ? "low" : lexical ? "high" : "medium";
      addRel(subjectOf(r.lecture), { src: t.item, type: "tests", dst: id, lecture: r.lecture, confidence: worst(k, C.confidence === "low" ? "low" : "high"), hold: k === "low" ? ["audit"] : C.confidence === "low" ? ["unsupported"] : [], audit: fs });
    }
    for (const c of r.result.conflicts || []) enqueue("lecture-conflict", "high", r.lecture, r.lecture, c.issue, { detail: c.kind + ((c.affects || []).length ? `; holds ${c.affects.length} item(s): ${c.affects.join(", ")}` : ""), evidence: (c.evidence || []).map((e) => prov(r.lecture, e)) });
    for (const t of (r.audit && r.audit.unmatched_targets) || []) enqueue("audit-finding", "medium", r.lecture, r.lecture, `Auditor named an item that is not in the result: ${t.target}`, { detail: `${t.verdict}: ${t.detail}` });
    for (const m of (r.audit && r.audit.missed) || []) enqueue("missed-concept", "low", r.lecture, r.lecture, `${m.name}: ${m.why}`);
    for (const f of findings(r.lecture, "abstract")) enqueue("audit-finding", "medium", r.lecture, r.lecture, `Abstract: ${f.verdict}`, { detail: f.detail });
    for (const d of r.dropped || []) enqueue("dropped-item", "low", r.lecture, r.lecture, d);
  }

  // contradictions: the same asymmetric link stated in both directions, or a loop in a hierarchy
  const key = (r) => r.src + "|" + r.type + "|" + r.dst;
  const all = [...relations.values()];
  const have = new Set(all.map(key));
  for (const r of all) if (asym.has(r.type) && r.src < r.dst && have.has(r.dst + "|" + r.type + "|" + r.src)) {
    const other = all.find((x) => x.src === r.dst && x.dst === r.src && x.type === r.type);
    for (const x of [r, other]) x.hold = [...new Set([...(x.hold || []), "contradiction"])];
    enqueue("contradiction", "high", r.id, r.lectures[0], `"${name(r.src)} ${r.type} ${name(r.dst)}" and the reverse are both stated`, { other: other.id });
  }
  for (const [up, down] of policy.opposite_relations || []) for (const r of all) if (r.type === up && have.has(r.src + "|" + down + "|" + r.dst)) {
    const other = all.find((x) => x.src === r.src && x.dst === r.dst && x.type === down);
    for (const x of [r, other]) x.hold = [...new Set([...(x.hold || []), "contradiction"])];
    enqueue("contradiction", "high", r.id, r.lectures[0], `"${name(r.src)} ${up} ${name(r.dst)}" and "${down}" are both stated`, { other: other.id });
  }
  for (const type of policy.hierarchy_relations) {
    const next = new Map();
    for (const r of all) if (r.type === type && !(r.hold || []).includes("contradiction")) { if (!next.has(r.src)) next.set(r.src, []); next.get(r.src).push(r); }
    const reported = new Set();
    for (const start of next.keys()) {
      const walk = (node, path, depth) => {
        for (const r of next.get(node) || []) {
          if (r.dst === start && path.length >= 2) {
            const loop = [...path, r], sig = loop.map((x) => x.id).sort().join(",");
            if (reported.has(sig)) continue; reported.add(sig);
            for (const x of loop) x.hold = [...new Set([...(x.hold || []), "contradiction"])];
            enqueue("contradiction", "high", loop[0].id, loop[0].lectures[0], `Loop of "${type}": ${[start, ...loop.map((x) => x.dst)].map(name).join(" → ")}`);
          } else if (depth < 4 && !path.some((x) => x.src === r.dst)) walk(r.dst, [...path, r], depth + 1);
        }
      };
      walk(start, [], 1);
    }
  }
  function name(id) { const c = concepts.get(id); return c ? c.name : id; }

  // ---- 5. final status of every relation -----------------------------------
  const relationRows = [];
  for (const r of all.sort((a, b) => (a.id < b.id ? -1 : 1))) {
    const d = decided.get(r.id), hold = r.hold || [];
    const conceptEnds = [r.src, r.dst].filter((x) => x.startsWith("c:")).map((x) => concepts.get(x));
    if (conceptEnds.some((c) => c.status === "rejected")) continue;
    const status = d ? (d.action === "approve" ? "approved" : "rejected") : hold.length ? "proposed" : "auto-accepted";
    if (!d && r.type !== "covers" && r.type !== "tests" && r.type !== "explains") {
      const sentence = r.rationale || `${name(r.src)} ${r.type} ${name(r.dst)}`;
      if (hold.includes("clinical-claim")) enqueue("clinical-claim", "high", r.id, r.lectures[0], `${name(r.src)} ${r.type} ${name(r.dst)}`, { detail: sentence, evidence: r.provenance.slice(0, 2) });
      else if (hold.includes("audit")) enqueue("audit-finding", "high", r.id, r.lectures[0], `${name(r.src)} ${r.type} ${name(r.dst)}`, { detail: (r.audit || []).map((f) => `${f.verdict}: ${f.detail}`).join(" | ") });
      else if (hold.includes("unsupported")) enqueue("unsupported-relation", "high", r.id, r.lectures[0], `${name(r.src)} ${r.type} ${name(r.dst)}`, { detail: sentence });
    }
    if (!d && r.type === "tests" && hold.includes("audit")) enqueue("audit-finding", "medium", r.id, r.lectures[0], `${r.src} tests ${name(r.dst)}`, { detail: (r.audit || []).map((f) => `${f.verdict}: ${f.detail}`).join(" | ") });
    relationRows.push({ subject: r.subject, row: compact({
      id: r.id, src: r.src, type: r.type, dst: r.dst, origin: "ai", status, confidence: r.confidence, rationale: r.rationale, reviewed_by: d && d.by,
      provenance: r.provenance, attrs: { ...(r.attrs || {}), lectures: r.lectures, held_for: hold } }) });
  }

  const newMap = [];
  for (const [k, id] of assigned) { const [lecture, ckey] = [k.slice(0, k.lastIndexOf("|")), k.slice(k.lastIndexOf("|") + 1)]; const c = concepts.get(id).contributions.find((x) => x.lecture === lecture && x.c.key === ckey).c; newMap.push({ id: k, concept: id, name: c.name }); }
  const seenQ = new Set();
  const order = { high: 0, medium: 1, low: 2 };
  const uniqueQueue = queue.filter((q) => !seenQ.has(q.id) && seenQ.add(q.id) && !decided.has(q.target)).sort((a, b) => order[a.severity] - order[b.severity] || (a.reason < b.reason ? -1 : a.reason > b.reason ? 1 : a.id < b.id ? -1 : 1));
  return { concepts: conceptRows, relations: relationRows, queue: uniqueQueue, conceptMap: newMap.sort((a, b) => (a.id < b.id ? -1 : 1)), merges, droppedSelf, awaitingAudit };
}
