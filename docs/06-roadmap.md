# 6. Roadmap

Status: approved 11 November 2026. Each phase ends with a short written report of what was built, what was verified and how, and what is not working.

Work is committed to a feature branch and reviewed before it reaches the published site.

## Phase 1: Repository audit — done

Result: [01-audit.md](01-audit.md).

## Phase 2: Architecture and planning — done

Result: the documents in this folder, approved by the owner on 11 November 2026.

## Phase 3: Core data infrastructure — done

Report: [phase-3-report.md](phase-3-report.md).

Build:

- JSON Schemas for sources, slides, records, relations, AI artifacts, manifest.
- Sina import adapter: loads Sina's published data and writes hierarchy, lectures, sections, MCQs, flashcards, papers, resources, slides and imported relations for **all** subjects.
- ID registry and the question-key check against `qalias.js`.
- Validator (schemas, referential integrity) and the statistics generator.
- CI that runs the validator and tests.

Done when:

- Imported counts match the audit (337 lectures, 1,599 sections, 10,494 distinct lecture questions, 5,578 flashcards, 133 papers), or every difference is explained.
- Running the import twice produces no file changes.
- Tests cover ID derivation, alias handling, duplicate questions across papers and a deliberately broken record.
- A first coverage report exists, listing the known gaps (3 lectures without data, 20 without slides, 425 slides without text).

## Phase 4: Ingestion and knowledge preparation — pilot done, awaiting review

Report: [phase-4-pilot-report.md](phase-4-pilot-report.md). The workflow changed on 11 November 2026 to batch processing after a two-lecture pilot ([04-ingestion.md](04-ingestion.md) section 4.9); the text below is the original plan.

Build:

- Work-packet generator and result validator, including the evidence check.
- Stage 4 on Anatomy 3: two lectures first, then the other 25.
- Concept reconciliation and duplicate proposals.
- A minimal local review tool: list proposals, approve, reject, edit, merge.

Done when the pilot questions in [04-ingestion.md](04-ingestion.md) section 4.7 have measured answers.

**Gate:** owner reviews pilot quality and usage, and decides whether and in what order to process the other subjects.

## Phase 5: Main interface

Order is chosen so that useful things arrive first:

1. App shell: collapsible navigation, central canvas, right-hand inspector, resizable panels, saved layout, light and dark themes, responsive behaviour.
2. Explore: tier 0 search with filters and result previews.
3. Library: subject, module, lecture and slide reading view with OCR text and linked questions.
4. Concept pages.
5. Brain: 2D graph with filtering, search, expand-on-click, clustering and progressive loading.
6. Alternative views on the same data: table, cards, hierarchy.
7. 3D graph.
8. Scatter, timeline and temporal charts, where the data supports them.

Done when each item works on a phone and a laptop, has loading, empty and error states, and passes keyboard and contrast checks. Items 7 and 8 do not start while pilot review work is outstanding.

**Gate before publishing:** owner approves the first public deployment at `/brain/`, after the service-worker isolation test passes.

## Phase 6: Search and retrieval upgrades

- Embeddings and hybrid search (tier 1).
- The retrieval-only assistant: global and contextual, with citations and origin labels.
- A small set of test queries with expected results, run in CI, to measure search quality over time.

**Gate:** approval to allow the model download host in the cloud environment, or a decision to build embeddings locally.

## Phase 7: Learning and personal workspace

- Practice sessions by subject, module, lecture, topic and concept; custom sessions; difficult-question marking; review of incorrect answers.
- Sina progress is read and shown; new Brain progress is stored in IndexedDB. Analytics are labelled as descriptive, not as validated mastery measures.
- Weak-concept identification, and Triage: concepts with too few questions, lectures with gaps.
- Flashcards linked to concepts, custom cards, spaced repetition.
- Notes, ideas, tasks, bookmarks, tags, collections, reading lists, revision plans; page-linked annotations; export and import.
- Personal document upload, processed and stored locally.

**Gate (optional):** whether to add a backend for account sync. Requires a cost and provider decision.

## Phase 8: Administration

- Improve the review tool: bulk actions, duplicate merge, source verification, metadata editing, ingestion monitoring, coverage dashboard.
- Student correction suggestions.
- If a backend was approved: hosted admin with server-side permissions.

## Phase 9: Testing, documentation, deployment

- Test suite across data operations, relations, search quality, ingestion, duplicate detection, personal-data isolation, MCQs, flashcards, error handling and responsive behaviour.
- Documentation: architecture, stack, schema, ingestion, search, environment variables, deployment, backup and recovery, administration, Sina integration.
- Backup: the repository is the backup for shared knowledge; personal data relies on user export unless sync is approved.

Testing and documentation are written during each phase; Phase 9 closes gaps and does the final checks.

## Continuing work

After the pilot, the remaining 310 lectures are processed subject by subject alongside Phases 5 to 8. The statistics page reports progress; coverage is never described as complete while items are pending, failed or unreviewed.
