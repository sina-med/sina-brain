# 7. Static data export

`node pipeline/build-export.mjs` compiles `kb/` into JSON files under `site/data/` for the read-only application. The export is a build output: it is git-ignored, never edited by hand, and rebuilt from the knowledge base. The same input always produces the same bytes. The script only reads `kb/`.

Schema version: `export_version` 1, present in every file.

## Files

| File | Loaded when | Contents |
|---|---|---|
| `index.json` | App start | Programmes, subjects, modules and a one-line entry per lecture; exam scopes; 3D models |
| `subjects/<subject>.json` | A subject is opened | That subject's entry from the index (modules and lecture list) and the exam scopes that include it |
| `modules/<subject>/<module>.json` | A module or lecture is opened | Full content of every lecture in the module |
| `papers/<subject>.json` | Past papers are opened | Papers of the subject and their questions |
| `concepts.json` | Concept pages or the graph are opened | The AI layer: published concepts and relations only |
| `export-manifest.json` | Never by the app | Accounting: what went in, what came out, what was excluded and why |

Sizes at present: 135 files, 13.9 MB in total; the largest module file is 0.63 MB.

## `index.json`

```
{ export_version, ai_label,
  programs: [{ id, title }],
  subjects: [{ id, title, description, program, semester, file, papers_file, counts: { lectures, papers },
               modules: [{ id, title, file, lectures: [{ id, title, has_content, verification, counts: { sections, slides, questions, flashcards } }] }] }],
  exams:  [{ id, title, program, subject, date, groups: [{ name, lectures: [lecture id] }], notes }],
  models: [{ id, title, file, parts, attribution, licence }] }
```

## `modules/<subject>/<module>.json`

```
{ export_version, module: { id, title }, subject: { id, title },
  lectures: [{
    id, title, origin, verification, sina_id, has_content, verified_on, build_note,
    exam_points: [html], high_yield, deeper: [{ title, html }], figure: { alt, caption, labels },
    source: { id, title, url, site_copy },
    sections:   [{ id, title, origin, html }],
    slides:     [{ id, n, label, image, text, text_origin }],
    questions:  [question],
    flashcards: [{ id, origin, kind, front, back, figure_target }],
    references: [{ id, title, url, kind, roles, why, note }] }] }
```

A **question** (also used in `papers/*.json`):

```
{ id, origin, sina_key, stem, options: [string], answer: [index], multi, hint, explanation, option_notes: [string],
  figure_target, model3d, source_note, answer_key,
  slides: [{ id, boxes }], models: [{ id, parts }], papers: [{ id, n }], tests_lectures: [lecture id] }
```

- `id` is the stable record ID. `sina_key` is the key under which the Sina site stores a student's progress for the question.
- `answer_key` is present when the answer key was written by Sina and not supplied with the paper.
- `slides[].image` is a path on the Sina site (`https://sina-med.github.io/` + path). Images are linked, not copied.
- `html` fields hold Sina's original markup. The application must sanitise before display.

## `papers/<subject>.json`

```
{ export_version, subject: { id, title },
  papers:    [{ id, title, origin, year, note, links: [{ label, url }], answer_key, questions: [question id, in paper order] }],
  questions: [question]   // questions that belong to no lecture
}
```

A question that sits in a lecture and also appears in a paper is stored once, in its module file; the paper lists its ID.

## `concepts.json`

```
{ export_version, label: "AI-generated — not medically verified",
  concepts: [{ id, title, kind, aliases, importance, status, verification, confidence, reviewed_by, lectures: [lecture id],
               definitions: [{ lecture, text, status, confidence, evidence: [{ source, unit | locator, quote, check }] }],
               definitions_held, held_evidence: [{ lecture, source, unit | locator, quote, check }] }],
  relations: [{ id, src, type, dst, status, confidence, reviewed_by, statement, evidence, lectures }] }
```

- Only concepts and relations with status `auto-accepted` or `approved` are exported. `status` is carried on every item so the two are never confused; `reviewed_by` is present only where a named person approved it.
- A definition that is held is not exported as text. Its count is in `definitions_held`, and the lecture's own quoted words are in `held_evidence`, so a concept page can show the source instead of the AI sentence.
- Relations of type `tests`, `explains` and `covers` link questions, sections, slides and lectures to concepts.
- Everything in this file must be displayed with `label`.

## What is and is not exported

Every record in `kb/` is either in an export file or listed in `export-manifest.json` under `excluded_records` with a reason. The same holds for relations (`relations.excluded_by_reason`). At present all 27,737 records are exported, and 34 of 14,833 relations are excluded, all because they are held for review.

Fields left out on purpose, listed under `omitted_fields`: slide line boxes (the slide text is kept), internal bookkeeping fields, and registry dates.

Hierarchy is expressed by nesting (subject → module → lecture → sections, slides, questions, flashcards) instead of relation rows. Imported relations are folded into the records they describe: slide citations into `question.slides`, paper membership into `question.papers` and `paper.questions`, reading lists into `lecture.references`.

## Project status

`node pipeline/build-status.mjs` writes `site/status.json`, which `site/dashboard.html` displays. It is committed, so the current status is visible in the repository. Each metric is `{ id, label, value, of?, source, definition }`: a count, the total it is out of where one exists, the file it was counted from, and what it means. `generated_at` and `commit` are those of the last commit that changed `kb/`, `milestones.json` or `test/`, so rebuilding without changes rewrites nothing.

Feature states come from `milestones.json`: each feature names its acceptance tests, and the state is derived from how many of those tests exist. CI proves they pass. No percentage is stored anywhere.

## Viewing locally

```
npm run build:export && npm run build:status
python3 -m http.server 8000 --directory site    # or any static file server; the pages do not work from file://
```

Then open `http://localhost:8000/dashboard.html` for the project status and `http://localhost:8000/` for the application shell.
