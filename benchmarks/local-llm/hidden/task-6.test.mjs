import { test } from "node:test"; import assert from "node:assert/strict"; import { answer } from "./lib.mjs";
const { orphanConcepts } = await answer();
const C = (id, status = "auto-accepted") => ({ id, status }), R = (src, dst, status = "auto-accepted", type = "related-to") => ({ src, type, dst, status });
test("a concept linked to another concept is not an orphan", () => { assert.deepEqual(orphanConcepts([C("c:a"), C("c:b"), C("c:z")], [R("c:a", "c:b")]), ["c:z"]); });
test("links to questions, lectures and slides do not count", () => { assert.deepEqual(orphanConcepts([C("c:a"), C("c:b")], [R("q:1", "c:a", "auto-accepted", "tests"), R("lec:x", "c:b", "auto-accepted", "covers"), R("slide:x/1", "c:a", "auto-accepted", "explains")]), ["c:a", "c:b"]); });
test("rejected relations and self-links do not count; proposed ones do", () => { assert.deepEqual(orphanConcepts([C("c:a"), C("c:b"), C("c:c"), C("c:d")], [R("c:a", "c:b", "rejected"), R("c:c", "c:c"), R("c:d", "c:a", "proposed")]), ["c:b", "c:c"]); });
test("rejected concepts are never reported; output is sorted; inputs untouched", () => { const cs = [C("c:m"), C("c:b", "rejected"), C("c:a"), C("c:k", "proposed")], rs = [];
  assert.deepEqual(orphanConcepts(cs, rs), ["c:a", "c:k", "c:m"]); assert.deepEqual(cs.map((c) => c.id), ["c:m", "c:b", "c:a", "c:k"]); assert.deepEqual(orphanConcepts([], []), []); });
