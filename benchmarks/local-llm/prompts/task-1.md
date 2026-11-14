# Task 1: marking a multiple-choice question

Write a JavaScript module that exports one function, `points(q, chosen)`.

- `q.answer` is an array of the zero-based indexes of the correct options, for example `[2]` or `[0, 1, 2]`.
- `chosen` is an array of the zero-based indexes the student picked. It may be empty.
- The rule: if the student picked any option that is not correct, the score is 0. Otherwise the score is the number of correct options picked divided by the number of correct options.
- Return a number from 0 to 1.

Rules for your reply:
- Reply with exactly one fenced code block containing the complete file, and nothing else.
- Plain JavaScript, ES modules (`export`), no imports, no dependencies, no TypeScript.
- Do not print anything and do not include usage examples.
