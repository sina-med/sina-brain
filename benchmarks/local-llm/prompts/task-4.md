# Task 4: write tests for an existing function

Here is a module, `nameKey.mjs`. It reduces a concept name to a comparison form so that "Vocal folds" and "vocal fold" are recognised as the same name.

```js
const normalise = (s) => String(s || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

// Lower case, no punctuation, and a trailing plural "s" removed from each word:
// only from words longer than 4 letters, and not when the word ends in "ss", "us" or "is".
export function nameKey(name) {
  return normalise(name).split(" ").map((w) => (w.length > 4 && /[^sui]s$/.test(w) ? w.slice(0, -1) : w)).join(" ");
}
```

Write a test file for it using Node's built-in test runner. Your tests will be judged on whether they pass against this function and fail against subtly broken versions of it, so cover the rules in the comment and their edge cases.

Rules for your reply:
- Reply with exactly one fenced code block containing the complete test file, and nothing else.
- Start with exactly these imports and use no others:
  `import { test } from "node:test";`
  `import assert from "node:assert/strict";`
  `import { nameKey } from "./nameKey.mjs";`
- Plain JavaScript, ES modules, no dependencies.
