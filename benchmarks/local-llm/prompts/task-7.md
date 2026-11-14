# Task 7: explain code

Below is an excerpt from the function that turns stored extraction results into relations between medical concepts. `findings(lecture, target)` returns the independent auditor's findings about one item; `hasSevere(fs)` is true when any finding has a severe verdict; `inDispute(lecture, target)` is true when the item rests on a conflict the extraction worker reported in the lecture; `best(a, b)` and `worst(a, b)` return the higher and lower of two confidence levels among `"low"`, `"medium"`, `"high"`; `S` and `D` are the source and destination concepts.

```js
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
```

Answer these five questions, each in one or two sentences, numbered 1 to 5. Use only what the code shows.

1. Under exactly what conditions does a relation get confidence `"high"`?
2. What happens to a relation's confidence when the auditor has a severe finding about it?
3. Name every reason that can be added to `hold`, and the condition for each.
4. How does the confidence of the two concepts at the ends affect the relation's confidence?
5. Which evidence items are kept in `provenance`?

Reply with the five numbered answers only.
