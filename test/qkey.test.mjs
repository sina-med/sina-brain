import { test } from "node:test";
import assert from "node:assert/strict";
import { rawQKey, qKey } from "../pipeline/lib/qkey.mjs";

// Vectors taken from the live Sina data (11 Nov 2026). If these change, Brain IDs no longer match Sina progress.
test("matches Sina's key for a plain question", () => {
  assert.equal(rawQKey({ q: "What is allodynia?", options: ["Pain from a harmless stimulus", "Exaggerated pain from noxious input", "Absence of all pain", "Pain felt in a lost limb"] }), "1egt1vv");
});
test("matches Sina's key when the text has non-ASCII characters", () => {
  assert.equal(rawQKey({ q: "Which structure is at the arrow?", options: ["Hyoid bone", "Laryngeal prominence (Adam’s apple)", "Thyroid cartilage", "Cricoid cartilage (complete ring)"] }), "7a90hl");
});
test("an alias maps a reworded question back to its original key", () => {
  const reworded = { q: "What is allodynia, exactly?", options: ["A", "B"] };
  assert.equal(qKey(reworded, { [rawQKey(reworded)]: "1egt1vv" }), "1egt1vv");
  assert.equal(qKey(reworded, {}), rawQKey(reworded));
});
test("answer and explanation do not affect the key", () => {
  const a = { q: "Q", options: ["x", "y"], answer: 0, why: "one" }, b = { q: "Q", options: ["x", "y"], answer: 1, why: "two" };
  assert.equal(rawQKey(a), rawQKey(b));
});
