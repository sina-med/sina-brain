# Task 3: checking that a quotation occurs in a text

Write a JavaScript module that exports two functions.

`normalise(s)`: turn a string into a comparison form. Apply Unicode NFKD normalisation and remove combining accent marks (U+0300 to U+036F), convert to lower case, replace every run of characters that are not `a-z` or `0-9` with a single space, and trim. `null` or `undefined` gives `""`. Example: `"Naïve  T-cells; (CD4+)"` gives `"naive t cells cd4"`.

`checkQuote(quote, blockText, options)`: decide whether `quote` occurs in `blockText`. `options` is optional: `{ minWords = 3, overlap = 0.85 }`. Return one of these strings:

- `"bad-ref"` when `blockText` is `undefined` or `null`.
- `"failed"` when the normalised quote is empty.
- `"exact"` when the normalised quote occurs in the normalised block as a run of whole words (it must not start or end in the middle of a word), and the quote has at least `minWords` words.
- `"weak"` when it occurs as a run of whole words but has fewer than `minWords` words.
- Otherwise, if the quote has fewer than 4 words: `"failed"`.
- Otherwise compute the length of the longest common subsequence between the quote's words and the block's words (words in the same order, not necessarily adjacent). If that length divided by the number of words in the quote is at least `overlap`, return `"approximate"`; otherwise `"failed"`.

Rules for your reply:
- Reply with exactly one fenced code block containing the complete file, and nothing else.
- Plain JavaScript, ES modules (`export`), no imports, no dependencies, no TypeScript.
- Do not print anything and do not include usage examples.
