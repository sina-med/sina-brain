# Phase 3 report: core data infrastructure

Date: 11 November 2026. Status: built, awaiting owner review.

## What was built

| Piece | Where | What it does |
|---|---|---|
| Sina importer | `pipeline/import-sina.mjs`, `pipeline/lib/` | Reads Sina's published data files and writes records and relations with stable IDs for every subject |
| Schemas | `schemas/` | Define what a record, a relation and a registry entry must look like |
| Validator | `pipeline/validate.mjs` | Checks schemas, unique IDs, that every reference points at an existing record of the right type, and that the ID registry agrees with the files |
| ID registry | `kb/admin/id-registry.jsonl` | Every ID ever issued, with first-seen and last-changed dates |
| Statistics | `pipeline/stats.mjs` → `kb/admin/COVERAGE.md` | Counts and gaps, computed from the files |
| Tests | `test/` | 29 automated tests |
| CI | `.github/workflows/ci.yml` | Runs tests, validation and a check that the coverage report is current |

No web app, no AI-prepared content, and no change to the Sina site.

## What is in the knowledge base

27,576 records and 13,977 relations, imported from Sina commit `39f3ae6`.

| Type | Count |
|---|---|
| Lectures | 340 (337 with content) |
| Summary sections | 1,599 |
| Questions | 13,716 (10,509 in lectures, 3,207 in past papers only) |
| Flashcards | 5,578 |
| Slides | 5,079 (4,581 with text) |
| Source files | 337 |
| Past papers | 133 |
| External resources | 678 |
| Subjects / modules / programs | 30 / 74 / 2 |
| Exam scopes, 3D models | 4, 6 |

| Relation | Count | Meaning |
|---|---|---|
| cites | 9,088 | Question → the slide it is based on, with highlight boxes where Sina has them |
| appears-in | 3,368 | Question → past paper |
| references | 858 | Lecture → external reading or verification source |
| tests | 617 | Paper question → the lecture it examines |
| covers | 46 | Exam scope → lecture |

## How it was checked

| Check | Result |
|---|---|
| Counts against the audit | Lectures, sections, flashcards, slides and papers match. Three audit figures were wrong and are corrected in [01-audit.md](01-audit.md): paper questions (the audit missed 1,138 stored inline), slides with text, and distinct lecture questions |
| Content against Sina, record by record | All 10,509 lecture questions, 3,721 paper question occurrences, 5,578 flashcards and 1,599 sections compared field by field with the originals: stems, options, answers, explanations, option notes, card fronts and backs, section HTML. No differences, except that 273 questions whose explanation is empty on Sina have no explanation field |
| Slide citations | All 8,374 question-to-slide links in Sina's lecture data are present |
| Question key port | The re-implemented key reproduces 3,377 of 3,425 keys in Sina's highlight table, 617 of 657 in its paper-lecture table, and 216 of 216 in its off-scope table. The remainder are stale entries on Sina's side (questions that no longer exist) |
| Idempotency | A second import, with a different date, wrote 0 files and the directory was byte-identical |
| Validation | 0 problems across all records, relations and registry entries |
| Tests | 29 of 29 pass, including that the validator rejects deliberately broken data and that a vanished question stops the import |

Not checked: CI has not run on GitHub yet at the time of writing; it runs on the push that carries this report.

## What the import found in Sina's data

These are observations about the existing site. None was changed.

1. **15 pairs of figure questions share one question key.** Sina's key ignores which arrow a "Which structure is at the arrow?" question points at. On Sina, answering one of a pair marks the other as seen and they share spaced-repetition state. Brain keeps them apart (decision I2). Affected lectures include `fa-protection`, `fa-immune`, `term1-cardio`, `hemato1-cbc` and others; the pairs are the 15 keys that appear twice in `kb/records/*/mcqs.jsonl` under `ext.sina`.
2. **928 paper questions have an answer key written by Sina**, because the paper came without one. Brain labels these records (`body.answer_key`).
3. **514 paper questions are repeats** of a question in another paper. Each is one record that appears in several papers. Their answers agree everywhere.
4. **Stale entries:** 52 highlight entries and 40 paper-lecture links refer to questions that no longer exist.
5. **23 lectures have a different title in the subject list and on the lecture page.** Brain uses the lecture page's title.
6. **Gaps:** 3 lectures listed without content, 20 without slide images, 498 slides without text. Listed in [COVERAGE.md](../kb/admin/COVERAGE.md).

## Not imported yet

Image-occlusion sets, labelled photos, the off-scope question lists for midterms, and Sina's interactive SVG figures (only their captions and labels are kept). These are noted in the import manifest and can be added when the interface needs them. AnKing is excluded by decision D2.

## Decisions made along the way

Seven implementation decisions are listed in [decisions.md](decisions.md) (I1 to I7). The one that departs most from the Phase 2 text is I1: the pipeline is written in Node.js instead of Python.

## Next: Phase 4

Knowledge preparation on Anatomy 3, starting with two lectures for joint review, as described in [04-ingestion.md](04-ingestion.md) section 4.7.
