# Task 9: quotations cut off at a line break

Slide text comes from OCR and keeps the slide's line breaks. Quotations taken from it are sometimes cut off at the end of a line in the middle of a sentence. Write a check for that.

Write a JavaScript module that exports one function, `endsMidSentence(block, quote)`.

- `block` is the slide text: a string whose lines are separated by `"\n"`.
- `quote` is a quotation. Split both into words on whitespace; a quotation matches the block where its words equal a run of consecutive words of the block exactly (same characters, including punctuation). Line breaks and repeated spaces make no difference to matching. Use the **first** such match.
- Return `true` when all three hold:
  1. the quotation's last word is the last word of its line in the block;
  2. at least one more word follows later in the block;
  3. the quotation's last word does not end with one of `.` `!` `?` `:` `;`.
- Return `false` otherwise, including when the quotation does not occur in the block or is empty.

Example: for the block `"The midbrain is the smallest of the\nthree regions of the brainstem."`, the quotation `"The midbrain is the smallest of the"` gives `true`, and `"The midbrain is the smallest of the three regions"` gives `false`.

Rules for your reply:
- Reply with exactly one fenced code block containing the complete file, and nothing else.
- Plain JavaScript, ES modules (`export`), no imports, no dependencies, no TypeScript.
- Do not print anything and do not include usage examples.
