# 4. Ingestion and knowledge preparation

Status: approved 11 November 2026. Stages 1 to 3, 6 and the statistics are built ([running them](../README.md#running-the-pipeline)). Stages 4, 5 and 7 are Phase 4.

## 4.1 Stages

| # | Stage | Uses AI | What it does | Output |
|---|---|---|---|---|
| 1 | **Discover** | No | Lists everything that should be in the knowledge base: Sina lectures, papers, slide folders, source PDFs | Manifest entries |
| 2 | **Import** | No | Converts Sina's data into records and imported relations, with stable IDs | `kb/records/`, `kb/relations/imported/` |
| 3 | **Extract** | No | Attaches slide text (existing OCR, or text pulled from the PDF) and records source file hashes | `kb/sources/` |
| 4 | **Prepare** | Yes | For each lecture: extracts concepts, classifies them, proposes relations, tags questions and cards with the concepts they test | `kb/ai/`, `kb/relations/proposed/` |
| 5 | **Reconcile** | Partly | Merges the same concept found in different lectures; flags possible duplicates | Concept records, `duplicate-of` proposals |
| 6 | **Validate** | No | Schema checks, referential integrity, every relation's quoted evidence is actually present in its source | Validation report |
| 7 | **Review** | Human | Admin approves, edits, rejects or merges proposals | Status changes, audit log |
| 8 | **Build** | No | Compiles approved records into search index, embeddings, graph data and statistics | Published artifacts |

Stages 1 to 3 and 6 to 8 are ordinary scripts and can run anywhere, including CI. Stage 4 is the only one that needs a model.

## 4.2 How stage 4 runs without an API bill

There is no API key in this project and none is assumed. Stage 4 is carried out inside a Claude Code session:

1. A script prepares a **work packet** per lecture: the lecture's sections, exam points, slide text, questions and cards, plus the list of concepts already in the knowledge base for that subject.
2. In the session, the model reads one packet and writes one result file in a fixed JSON format.
3. A script validates the result and merges it into `kb/` as `proposed`.

Consequences to be clear about:

- This is covered by the subscription's usage limits, not billed per token. The limits are not visible from inside a session, so throughput is measured in the pilot instead of promised.
- It is not unattended automation. Someone has to start a session and ask for the next batch. Work can be split across sessions; the manifest records what is finished.
- The same packet format can be sent to the API, or to a local model through Ollama, later if that is ever approved. The quality of a local model on medical extraction would have to be tested before relying on it.

## 4.3 Repeatable, resumable, incremental, idempotent

Each manifest entry:

```
{ "item": "lec:anat3-larynx", "stage": "prepare",
  "input_hash": "…", "prompt_version": "p1",
  "state": "pending | running | done | failed | skipped",
  "attempts": 1, "error": null, "updated": "…" }
```

- **Idempotent:** output files are keyed by record ID and written whole. Running a stage twice gives the same files.
- **Incremental:** a stage is skipped when the item's `input_hash` and `prompt_version` match the last successful run.
- **Resumable:** an interrupted run continues from the first entry not marked `done`.
- **Failure tracking:** failures keep their error text and attempt count and appear in the statistics. A failed item never produces partial records.
- **No silent success:** an item is marked `done` only after its output passed validation.

## 4.4 Evidence rule for AI output

Every concept and every proposed relation must cite where in the lecture it comes from: a section ID or slide ID, plus a short quotation. Validation checks that the quotation really occurs in that section or slide text. Output that fails the check is rejected automatically and counted.

This does not prove that a relation is medically correct. It proves that it was not invented without any basis in the course material. Correctness is what human review and the `verification` field are for.

## 4.5 Duplicates

| Kind | Detection | Action |
|---|---|---|
| Same question in several papers | Same question key | One record, several `appears-in` relations (automatic) |
| Near-identical questions | Normalised text similarity above a threshold | `duplicate-of` proposal for review |
| Same concept under different names | Alias match, then normalised-name match, then embedding similarity within the same `kind` | Automatic merge only on exact alias match; otherwise a proposal |
| Same source file uploaded twice | Same SHA-256 | One source record |

Merging keeps the older ID and redirects the newer one.

## 4.6 Statistics that are always maintained

Generated into `kb/admin/stats.json` on every build and shown in the app's Triage section:

- Resources discovered, processed, awaiting processing, failed or inaccessible
- Records by type and status
- Concepts extracted, approved, awaiting review
- Relations by type, origin and status
- Duplicates identified and resolved
- Records lacking metadata, provenance or verification
- Per lecture: slides without text, questions without a slide citation, questions without a concept, concepts without a question

Completeness is only ever stated as these numbers.

## 4.7 The Anatomy 3 pilot

Scope: 27 lectures, 205 summary sections, 1,015 MCQs, 900 flashcards, 527 slide images.

Steps:

1. Run stages 1 to 3 for **all** subjects (they are cheap and need no AI), so the full inventory and gap report exist from the start.
2. Run stage 4 on two Anatomy 3 lectures. Review the output together and adjust the instructions.
3. Run stage 4 on the remaining 25 lectures. Record how many sessions and how much usage that took.
4. Reconcile, validate, and review a sample.

What the pilot must tell us before scaling up:

| Question | How it is measured |
|---|---|
| Is the extraction accurate? | Owner reviews a random sample of 50 concepts and 100 relations; target is under 5% wrong and none harmful |
| Is it grounded? | Share of AI output passing the evidence check |
| Are concepts at the right level of detail? | Concepts per lecture, and how many are tested by at least one question |
| What does it cost in usage? | Sessions and elapsed time per lecture, extrapolated to 337 |
| How much review work does it create? | Minutes of admin review per lecture |

If the pilot misses these targets, the instructions or the concept granularity are changed before any other subject is processed.

## 4.8 User-supplied documents

Documents a student adds for personal research are handled in the browser: text is extracted locally (PDF.js for PDF, simple parsers for TXT, Markdown and CSV; DOCX and PPTX through an unzip-and-parse library), indexed locally, and stored in IndexedDB. They are private and never enter the shared knowledge base.

Documents an administrator wants to add to the shared knowledge base go through the pipeline above.
