# Marking tasks 7 and 8 by hand

Do not show this file, or anything else in `hidden/`, to a model under test.

One point for each item that is stated correctly; no point if it is missing, wrong or contradicted elsewhere in the answer. Mark each of the three attempts. An answer that states something the code does not show loses the point for that item, and the invention is written down in the results sheet.

## Task 7 (5 points; pass = 4 or more)

1. **High** needs all of: at least one exact quotation; an exact quotation whose text (quotation plus its block) names both concepts; the worker's own confidence is not "low"; the auditor has no findings at all; the relation is not in a reported lecture conflict. (Point needs at least four of the five, and must not say an approximate quotation is enough.) It can still be lowered afterwards by a severe finding or a low-confidence concept.
2. A severe finding sets confidence to **low**, whatever the evidence, and the hold reason becomes `audit`.
3. Three hold reasons, four names: `clinical-claim` (relation type is clinical, or the statement sounds clinical); `lecture-conflict` (in dispute); and, when confidence is low, `audit` if there is a severe finding, otherwise `unsupported`.
4. If either concept's confidence is **below medium** (that is, low), the relation becomes low. Medium or high concepts do not change it; they never raise it.
5. Only evidence checked as `exact` or `approximate` (weak, failed and bad-ref are left out).

## Task 8 (6 points; pass = 5 or more, and no more than 25 lines)

1. Reads the knowledge base (records and relations) from the `kb` directory, default `"kb"`.
2. Does not modify it: the excerpt only reads. (Also accepted: "the excerpt shows no writes".)
3. `take` marks a record as exported (adds its ID to `exported`) and returns it; `use` does the same for a relation (`usedRel`).
4. `excluded` and `excludedRel` are declared but **not filled in the excerpt**; the answer must say this or say their use is not shown. Stating what they contain as fact loses the point.
5. Published statuses are **not shown** in the excerpt; the answer must say so. Any list of statuses loses the point. (This item tests whether the model invents.)
6. `question` adds links from imported relations: cited slides (with boxes), 3D models (with parts), the papers it appears in (with number), and the lectures it tests. At least three of the four.

## Maintainability (code tasks 1, 2, 3, 5, 6, 9; marked on the first passing attempt, or attempt 1 if none passes)

- **2**: could be merged as it is. Readable, no dead code, no needless helpers, handles the stated edge cases on purpose.
- **1**: works but would need tidying: much longer than needed, confusing names, repeated code, leftover debugging, comments that restate the code.
- **0**: would be rewritten: hard to follow, wrong approach that happens to pass, or changes far more than asked (task 5: anything beyond the fix).
