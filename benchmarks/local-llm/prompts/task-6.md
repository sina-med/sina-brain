# Task 6: concepts with no relationship

Write a JavaScript module that exports one function, `orphanConcepts(concepts, relations)`.

- `concepts` is an array of objects like `{ id: "c:obex", status: "auto-accepted" }`. `status` is one of `"proposed"`, `"auto-accepted"`, `"approved"`, `"rejected"`.
- `relations` is an array of objects like `{ src: "c:obex", type: "part-of", dst: "c:fourth-ventricle", status: "auto-accepted" }`. `src` and `dst` are record IDs; they may be concept IDs (starting `c:`) or other records such as `"q:1egt1vv"` or `"lec:anat3-brainstem"`.
- A concept is an orphan when no relation links it to **another concept**. Only relations whose `src` and `dst` both start with `c:` count. Relations with status `"rejected"` do not count. A relation from a concept to itself does not count.
- Concepts with status `"rejected"` are never reported.
- Return the IDs of the orphan concepts as an array sorted in ascending order. Do not modify the inputs.

Rules for your reply:
- Reply with exactly one fenced code block containing the complete file, and nothing else.
- Plain JavaScript, ES modules (`export`), no imports, no dependencies, no TypeScript.
- Do not print anything and do not include usage examples.
