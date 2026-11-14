import { test } from "node:test"; import assert from "node:assert/strict"; import { answer } from "./lib.mjs";
const { points } = await answer();
test("single answer", () => { assert.equal(points({ answer: [2] }, [2]), 1); assert.equal(points({ answer: [2] }, [1]), 0); assert.equal(points({ answer: [2] }, []), 0); });
test("several answers: partial credit, and any wrong pick scores 0", () => { const q = { answer: [0, 1, 2] };
  assert.equal(points(q, [0, 1, 2]), 1); assert.equal(points(q, [2, 0, 1]), 1); assert.ok(Math.abs(points(q, [0, 1]) - 2 / 3) < 1e-9); assert.ok(Math.abs(points(q, [1]) - 1 / 3) < 1e-9);
  assert.equal(points(q, [0, 1, 2, 3]), 0); assert.equal(points(q, [3]), 0); assert.equal(points(q, []), 0); });
test("inputs are not modified", () => { const q = { answer: [0, 1] }, c = [1]; points(q, c); assert.deepEqual([q.answer, c], [[0, 1], [1]]); });
