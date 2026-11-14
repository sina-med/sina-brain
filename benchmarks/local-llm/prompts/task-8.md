# Task 8: write a documentation comment

Below is the first part of a function, `buildExport(kb)`, from a Node.js script. It reads a knowledge base of medical-education records and builds the JSON files a read-only web application loads.

```js
export function buildExport(kb = "kb") {
  const { records, relations } = loadKb(kb);
  const rows = records.map((r) => r.row), rels = relations.map((r) => r.row);
  const byId = new Map(rows.map((r) => [r.id, r]));
  const files = new Map();
  const exported = new Set(), excluded = [], usedRel = new Set(), excludedRel = [];
  const take = (r) => { exported.add(r.id); return r; };
  const ord = (a, b) => (a.body.order ?? a.body.n ?? 0) - (b.body.order ?? b.body.n ?? 0) || (a.id < b.id ? -1 : 1);
  const group = (xs, key) => xs.reduce((m, x) => { const k = key(x); if (k) (m.get(k) || m.set(k, []).get(k)).push(x); return m; }, new Map());
  const bySrc = group(rels, (r) => r.src), byDst = group(rels, (r) => r.dst);
  const out = (src, type) => (bySrc.get(src) || []).filter((r) => r.type === type && r.origin === "imported");
  const use = (r) => { usedRel.add(r.id); return r; };
  const origin = (r) => ({ origin: r.origin, verification: r.verification });

  const question = (q) => {
    take(q);
    const b = q.body;
    return { id: q.id, ...origin(q), sina_key: q.ext && q.ext.sina, stem: b.stem, options: b.options, answer: b.answer, multi: b.multi, hint: b.hint, explanation: b.explanation, option_notes: b.option_notes,
      figure_target: b.figure_target, model3d: b.model3d, source_note: b.source_note, answer_key: b.answer_key,
      slides: out(q.id, "cites").map(use).map((r) => ({ id: r.dst, boxes: r.attrs && r.attrs.boxes })),
      models: out(q.id, "references").filter((r) => r.dst.startsWith("m3d:")).map(use).map((r) => ({ id: r.dst, parts: r.attrs && r.attrs.parts })),
      papers: out(q.id, "appears-in").map(use).map((r) => ({ id: r.dst, n: r.attrs && r.attrs.n })),
      tests_lectures: out(q.id, "tests").map(use).map((r) => r.dst) };
  };

  const inLecture = group(rows, (r) => r.lecture);
  const lectureFull = (l) => {
    take(l);
    const mine = inLecture.get(l.id) || [], of = (t) => mine.filter((r) => r.type === t).sort(ord);
    const src = l.source && byId.get(l.source);
    if (src) take(src);
    return { id: l.id, title: l.title, ...origin(l), sina_id: l.ext && l.ext.sina, has_content: !(l.flags || []).includes("no-content"),
      verified_on: l.body.verified_on, build_note: l.body.build_note, exam_points: l.body.exam_points, high_yield: l.body.high_yield, deeper: l.body.deeper, figure: l.body.figure,
      source: src && { id: src.id, title: src.title, url: src.body.url, site_copy: src.body.site_copy },
      sections: of("section").map((s) => ({ id: take(s).id, title: s.title, origin: s.origin, html: s.body.html })),
      slides: of("slide").map((s) => ({ id: take(s).id, n: s.body.n, label: s.body.label, image: s.body.image, text: s.body.text, text_origin: s.body.text_origin })),
      questions: of("mcq").map(question),
      flashcards: of("flashcard").map((c) => ({ id: take(c).id, origin: c.origin, kind: c.body.kind, front: c.body.front, back: c.body.back, figure_target: c.body.figure_target })),
      references: out(l.id, "references").map(use).map((r) => { const x = byId.get(r.dst); take(x); return { id: x.id, title: (r.attrs && r.attrs.title) || x.title, url: x.body.url, kind: x.body.kind, roles: r.attrs && r.attrs.roles, why: r.attrs && r.attrs.why, note: r.attrs && r.attrs.note }; }) };
  };

  // ---- modules (the unit the application loads) and the index
```

Write a JSDoc comment for `buildExport` (the block that would go directly above the function). It must say, accurately and using only what the excerpt shows:

- what the function reads and what it does **not** modify;
- what `take` and `use` are for, and what `exported`, `excluded`, `usedRel` and `excludedRel` record;
- which record statuses count as published;
- what the `question` helper adds to a question beyond its own fields.

If the excerpt does not show one of these, say that it is not shown; do not guess.

Reply with exactly one fenced code block containing only the JSDoc comment (`/** ... */`), at most 25 lines.
