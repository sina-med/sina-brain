import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { points, isMulti, needsFigure, srsNext, dueCards, prepare, search, norm, excerpt, record, filterQuestions } from "../site/js/logic.js";

test("marking follows Sina's rule: a wrong pick scores 0, otherwise right picks over right answers", () => {
  const single = { answer: [2], options: ["a", "b", "c", "d"] }, multi = { answer: [0, 1, 2], multi: true, options: ["a", "b", "c", "d"] };
  assert.equal(points(single, [2]), 1);
  assert.equal(points(single, [1]), 0);
  assert.equal(points(multi, [0, 1, 2]), 1);
  assert.equal(points(multi, [0, 1]), 2 / 3);          // partial credit for an incomplete, all-correct answer
  assert.equal(points(multi, [0, 1, 2, 3]), 0);        // one wrong pick loses everything
  assert.equal(points(multi, []), 0);
  assert.ok(isMulti(multi) && !isMulti(single));
  assert.ok(isMulti({ answer: [3], multi: true }));    // flagged "1 or 2 correct answers" with one keyed answer: still checkboxes
  assert.ok(isMulti({ answer: [0, 1] }));              // several keyed answers without the flag
  assert.ok(needsFigure({ figure_target: "frontal" }) && needsFigure({ model3d: { m: "larynx" } }) && needsFigure({ kind: "image" }) && !needsFigure({ kind: "text" }));
});

test("flashcard scheduling matches Sina's intervals", () => {
  assert.deepEqual(srsNext(null, 3, 100), [101, 1, 250, 0]);          // new card, Good: tomorrow
  assert.deepEqual(srsNext(null, 4, 100), [104, 4, 250, 0]);          // new card, Easy: four days
  assert.deepEqual(srsNext(null, 1, 100), [100, 0, 250, 0]);          // Again: today, still learning
  assert.deepEqual(srsNext(null, 2, 100), [100, 0, 250, 0]);
  assert.deepEqual(srsNext([100, 10, 250, 0], 3, 100), [125, 25, 250, 0]);
  assert.deepEqual(srsNext([100, 10, 250, 0], 2, 100), [112, 12, 235, 0]);
  assert.deepEqual(srsNext([100, 10, 250, 0], 4, 100), [133, 33, 265, 0]);
  assert.deepEqual(srsNext([100, 10, 250, 0], 1, 100), [100, 0, 230, 1]);  // lapse
  assert.equal(srsNext([100, 3000, 300, 0], 4, 100)[1], 3650);        // capped at ten years
  const cards = [{ id: "a" }, { id: "b" }, { id: "c" }];
  const d = dueCards(cards, { a: [90, 5, 250, 0], b: [200, 5, 250, 0] }, 100);
  assert.deepEqual([d.due.map((c) => c.id), d.fresh.map((c) => c.id), d.later], [["a"], ["c"], 1]);
});

test("search matches word starts in titles and text, ranks titles first, and filters by kind", () => {
  const P = prepare([
    ["section", "sec:x/1", "lec:x", "Innervation", "The recurrent laryngeal nerve supplies the intrinsic muscles."],
    ["lecture", "lec:x", "lec:x", "Anatomy of the larynx", "nine cartilages"],
    ["question", "q:1", "lec:x", "Which nerve supplies the cricothyroid?", "Recurrent laryngeal · External laryngeal"],
    ["slide", "slide:x/02", "lec:x", "Slide 2", "Laryngeal prominence (Adam’s apple)"],
    ["flashcard", "card:x/1", "lec:x", "Define the glottis.", "The space between the vocal cords."]]);
  assert.deepEqual(search(P, "larynx").hits.map((d) => d.id), ["lec:x"]);
  assert.deepEqual(search(P, "laryn").hits.map((d) => d.id), ["lec:x", "sec:x/1", "q:1", "slide:x/02"]);   // prefix; the title hit ranks first
  assert.deepEqual(search(P, "recurrent nerve").hits.map((d) => d.id).sort(), ["q:1", "sec:x/1"]);        // every word must occur
  assert.equal(search(P, "ynx").total, 0);                                                                  // not in the middle of a word
  assert.deepEqual(search(P, "adams apple").hits.map((d) => d.id), ["slide:x/02"]);                        // punctuation and case ignored
  assert.deepEqual(search(P, "laryn", { types: ["question"] }).hits.map((d) => d.id), ["q:1"]);
  assert.equal(search(P, "  ").total, 0);
  assert.equal(norm("Naïve T-cells"), "naive t cells");
  assert.match(excerpt(P[0], "recurrent"), /recurrent laryngeal nerve/);
});

test("practice history is kept apart from the questions and drives the new and mistakes filters", () => {
  const qs = [{ id: "q:a" }, { id: "q:b" }, { id: "q:c" }];
  let h = record({}, "q:a", 1, 10);
  h = record(h, "q:b", 0.5, 10);
  h = record(h, "q:b", 0, 11);
  assert.deepEqual(h, { "q:a": { n: 1, right: 1, last: 10, pts: 1 }, "q:b": { n: 2, right: 0, last: 11, pts: 0 } });
  assert.deepEqual(filterQuestions(qs, h, "new").map((q) => q.id), ["q:c"]);
  assert.deepEqual(filterQuestions(qs, h, "mistakes").map((q) => q.id), ["q:b"]);
  assert.equal(filterQuestions(qs, h, "all").length, 3);
  assert.deepEqual(qs, [{ id: "q:a" }, { id: "q:b" }, { id: "q:c" }]);     // question records are never touched
});

test("search over the full exported corpus stays fast", { skip: !existsSync("site/data/search") && "run npm run build:export first" }, () => {
  const docs = readdirSync("site/data/search").flatMap((f) => JSON.parse(readFileSync("site/data/search/" + f, "utf8")).docs);
  const P = prepare(docs);
  assert.ok(P.length > 20000);
  for (const q of ["larynx", "recurrent laryngeal nerve", "hyperkalaemia", "a", "zzzzqq"]) {
    const t = performance.now(); search(P, q); const ms = performance.now() - t;
    assert.ok(ms < 250, `"${q}" took ${Math.round(ms)} ms`);
  }
  assert.ok(search(P, "larynx").total > 50);
  assert.equal(search(P, "zzzzqq").total, 0);
});
