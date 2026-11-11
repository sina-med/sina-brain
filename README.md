# Sina Brain

A medical knowledge base, search and study workspace built on top of [Sina](https://sina-med.github.io/#/).
It will be published at `https://sina-med.github.io/brain/`.

**Status: Phase 3 (core data infrastructure) is built and awaiting review.** All of Sina's lectures, questions, flashcards, past papers and slides are imported into `kb/` as records with stable IDs. There is no web app yet, and no AI-prepared knowledge yet (no concepts, no suggested relationships). Nothing here changes the Sina website.

What is in the knowledge base right now: [kb/admin/COVERAGE.md](kb/admin/COVERAGE.md).

| Document | What it covers |
|---|---|
| [docs/01-audit.md](docs/01-audit.md) | What exists in the Sina repositories today, with measured counts |
| [docs/02-architecture.md](docs/02-architecture.md) | How Sina Brain is put together and why |
| [docs/03-knowledge-model.md](docs/03-knowledge-model.md) | Record types, relationships, stable IDs, file layout |
| [docs/04-ingestion.md](docs/04-ingestion.md) | The pipeline that fills the knowledge base, and the Anatomy 3 pilot |
| [docs/05-search-and-ai.md](docs/05-search-and-ai.md) | Search, retrieval, the assistant, and what costs money |
| [docs/06-roadmap.md](docs/06-roadmap.md) | Phases, what "done" means for each, and approval gates |
| [docs/phase-3-report.md](docs/phase-3-report.md) | What Phase 3 built, how it was checked, and what it found |
| [docs/decisions.md](docs/decisions.md) | Decisions made so far, and questions still open |

## Ground rules

1. Knowledge coverage and accuracy come before visual polish.
2. No paid service is introduced without explicit approval.
3. The existing Sina site keeps working exactly as it does now.
4. Original material, Sina-authored material and AI-generated material are always kept apart and labelled.
5. Nothing is reported as done unless it was checked.

## Layout

```
kb/          the knowledge base (JSONL, one record per line)
  records/   lectures, sections, questions, flashcards, papers, resources …
  sources/   original files and their slides, with slide text
  relations/ links between records
  admin/     ID registry, import manifest and findings, statistics
schemas/     JSON Schemas that every record and relation must satisfy
pipeline/    the import, validation and statistics scripts
test/        automated tests
docs/        design documents
```

## Running the pipeline

Needs Node.js 20 or newer.

```
npm ci
npm test                 # run the tests
npm run validate         # check kb/ against the schemas and for broken references
npm run stats            # regenerate kb/admin/stats.json and COVERAGE.md
```

To re-import after Sina changes, with checkouts of the site and the private build kit next to this repository:

```
npm run import -- --sina ../sina-med.github.io --ocr ../sina-build/hl/lines.json
npm run validate && npm run stats
```

The import is safe to repeat: if nothing changed on Sina it writes nothing. If a record that existed before has disappeared it stops and explains why, without writing anything. The usual cause is a question reworded on Sina without an entry in `js/data/qalias.js`.
