import { test } from "node:test"; import assert from "node:assert/strict"; import { answer } from "./lib.mjs";
const { endsMidSentence } = await answer();
const B = "The midbrain is the smallest of the\nthree regions of the brainstem.\n• Ten of the twelve cranial nerves arise from their\ncranial nerve nuclei.\nTectum: located posterior\nto the cerebral aqueduct";
test("cut off at a line break in the middle of a sentence", () => { assert.equal(endsMidSentence(B, "The midbrain is the smallest of the"), true); assert.equal(endsMidSentence(B, "Ten of the twelve cranial nerves arise from their"), true); assert.equal(endsMidSentence(B, "Tectum: located posterior"), true); });
test("not cut off: ends inside a line, ends a sentence, or ends the block", () => { assert.equal(endsMidSentence(B, "The midbrain is the smallest of the three regions"), false); assert.equal(endsMidSentence(B, "three regions of the brainstem."), false);
  assert.equal(endsMidSentence(B, "to the cerebral aqueduct"), false); assert.equal(endsMidSentence("Roof:\nthe vela", "Roof:"), false); });
test("matching ignores line breaks and extra spaces, but not characters", () => { assert.equal(endsMidSentence(B, "smallest  of the"), true); assert.equal(endsMidSentence(B, "of the\nthree regions of the brainstem."), false); assert.equal(endsMidSentence(B, "the smallest of The"), false); });
test("first match decides; absent or empty quotations give false", () => { assert.equal(endsMidSentence("of the\nlarynx and of the trachea", "of the"), true); assert.equal(endsMidSentence("part of the larynx\nand of the\ntrachea", "of the"), false);
  assert.equal(endsMidSentence(B, "not in the block"), false); assert.equal(endsMidSentence(B, ""), false); assert.equal(endsMidSentence(B, "   "), false); });
