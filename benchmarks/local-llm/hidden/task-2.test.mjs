import { test } from "node:test"; import assert from "node:assert/strict"; import { answer } from "./lib.mjs";
const { srsNext } = await answer();
test("new card", () => { assert.deepEqual(srsNext(null, 3, 100), [101, 1, 250, 0]); assert.deepEqual(srsNext(null, 4, 100), [104, 4, 250, 0]); assert.deepEqual(srsNext(null, 1, 100), [100, 0, 250, 0]); assert.deepEqual(srsNext(null, 2, 100), [100, 0, 250, 0]); });
test("review card", () => { assert.deepEqual(srsNext([100, 10, 250, 0], 3, 100), [125, 25, 250, 0]); assert.deepEqual(srsNext([100, 10, 250, 0], 2, 100), [112, 12, 235, 0]); assert.deepEqual(srsNext([100, 10, 250, 0], 4, 100), [133, 33, 265, 0]); });
test("lapse, floors and cap", () => { assert.deepEqual(srsNext([100, 10, 250, 0], 1, 100), [100, 0, 230, 1]); assert.deepEqual(srsNext([100, 10, 140, 2], 1, 100), [100, 0, 130, 3]); assert.deepEqual(srsNext([100, 10, 135, 0], 2, 100), [112, 12, 130, 0]);
  assert.deepEqual(srsNext([100, 1, 130, 0], 3, 100), [102, 2, 130, 0]); assert.equal(srsNext([100, 3000, 300, 0], 4, 100)[1], 3650); assert.deepEqual(srsNext([50, 0, 200, 4], 1, 100), [100, 0, 200, 4]); });
test("the entry passed in is not modified", () => { const e = [100, 10, 250, 0]; srsNext(e, 4, 100); assert.deepEqual(e, [100, 10, 250, 0]); });
