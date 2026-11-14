import { test } from "node:test";
import assert from "node:assert/strict";
import { nameKey } from "./nameKey.mjs";
test("plural s is removed from long words", () => { assert.equal(nameKey("Vocal folds"), "vocal fold"); assert.equal(nameKey("Vocal folds and cords"), "vocal fold and cord"); });
test("short words and words ending in ss, us or is keep their s", () => { assert.equal(nameKey("Pons"), "pons"); assert.equal(nameKey("Brachial plexus"), "brachial plexus"); assert.equal(nameKey("Glottis"), "glottis"); assert.equal(nameKey("Process"), "process"); assert.equal(nameKey("Axes"), "axes"); });
test("case, punctuation and accents are ignored", () => { assert.equal(nameKey("  Naïve T-Cells "), "naive t cell"); assert.equal(nameKey(null), ""); });
