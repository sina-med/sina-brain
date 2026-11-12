# Decisions

## Decided by the project owner (11 November 2026)

| # | Decision |
|---|---|
| D1 | Sina Brain lives in its own repository, `sina-med/sina-brain`, and is published at `sina-med.github.io/brain/` (same origin as Sina). |
| D2 | AnKing content is left out of Sina Brain. |
| D3 | No backend through Phase 6. Administration is done through the repository. |
| D4 | The pilot subject for knowledge preparation is Anatomy 3. |
| D5 | English only. |
| D6 | The architecture, knowledge model and pilot plan in these documents are approved. |
| D7 | Professor names and source file names are shown on records as their origin. |

| D8 | Phase 4 runs as a batch pipeline, with no approval between batches after a two-lecture pilot (larynx, brainstem) is approved. |
| D9 | AI records that pass automated checks may be shown without individual approval, labelled “AI-generated — not medically verified”. `proposed`, `auto-accepted` and `approved` stay distinct. High-risk clinical claims, unsupported statements, contradictions and low-confidence records stay in the review queue. |
| D10 | Separate worker sessions are approved conditionally: same versioned instructions and schema, usage recorded, and no scaling up before the pilot shows they are worth their cost. |
| D11 | Batches run in the interactive session; progress is committed and pushed so that “continue” resumes. No scheduled background processing yet. |

Approved with D6:

| # | What | Where |
|---|---|---|
| P1 | The canonical knowledge base is versioned JSONL files in this repository; databases and indexes are build outputs. | [02](02-architecture.md) §2.2 |
| P2 | Sina is read, never modified. Slide images and 3D models are linked, not copied. | [02](02-architecture.md) §2.4 |
| P3 | Question IDs are Sina's alias-resolved question keys; a registry tracks every ID. | [03](03-knowledge-model.md) §3.3 |
| P4 | AI output is stored apart from records, starts as `proposed`, and must quote its evidence. | [03](03-knowledge-model.md) §3.8, [04](04-ingestion.md) §4.4 |
| P5 | Knowledge preparation runs inside Claude Code sessions; no API key is introduced. | [04](04-ingestion.md) §4.2 |
| P6 | Web app built with Vite and TypeScript. | [02](02-architecture.md) §2.3 |
| P7 | The assistant is retrieval-only until live generation is separately approved. | [05](05-search-and-ai.md) §5.4 |

## Decided during implementation

These were made while building Phase 3. They are within the approved direction but differ from, or add to, the wording of the Phase 2 documents. Any of them can be reversed.

| # | Decision | Reason |
|---|---|---|
| I1 | The pipeline is written in Node.js, not Python. | Sina's data files are JavaScript and its question key is a JavaScript hash. Loading and hashing in the same language removes a source of mismatch, and the search index and embeddings later have to be built with the same library the browser uses. Python remains available for PDF text extraction. |
| I2 | Figure questions get the figure target appended to their ID (`q:<key>-<target>`). | Sina's key ignores the target, so 15 pairs of different questions shared a key. The Sina key alone is kept in `ext.sina`. |
| I3 | A fourth verification value, `sina-verified`. | A lecture marked verified on Sina should not be shown as unverified, but it also has not been checked by Brain. |
| I4 | Hierarchy links are record fields, not relation rows. | Avoids about 27,000 redundant rows; the build step turns the fields into graph edges. |
| I5 | Records carry no dates; the ID registry does. | Lets an unchanged import rewrite nothing. |
| I6 | A lecture's own source file is identified as `src:<lecture>`. | The original PDFs are in Drive and are not downloaded during import, so their hash is not yet known. The hash becomes a field when the file is first fetched. |
| I7 | The imported records are committed to the repository (27 MB). | CI can validate without access to the private build repository, and every change to shared knowledge is visible as a diff. |

| I8 | Clinical statements are caught by kind, by relation type and by a word screen (policy-2). | The pilot showed 9 of 142 ordinary anatomy definitions carrying a clinical sentence (“a lesion there gives…”) that kind-based routing alone would have published. |
| I9 | Alternative-name matches across subjects go to review instead of merging. | The pilot produced “median eminence” as an alias of a fourth-ventricle landmark; elsewhere that name is a hypothalamic structure. |
| I10 | Workers check their own draft against the packet before handing it in (`prep.mjs check`). | Cuts failed quotations to near zero. The reported failure rate is therefore after self-correction. |

| I11 | Instructions p3 and audit a2 are the working versions; hard size limits were tried (p2) and withdrawn. | [phase-4-instructions-comparison.md](phase-4-instructions-comparison.md): the limits removed 23 tested concepts and saved little. |
| I12 | A lecture's results enter the knowledge base only after its independent audit. | Owner's priority: accuracy, traceability and consistency over speed. |

## Open questions

| # | Question | Needed by |
|---|---|---|
| Q1 | Who, besides the owner, will review AI-proposed concepts and relations? Owner's answer so far: maybe. The review tool will record the reviewer's name so that more than one person can take part. | Phase 4 |
| Q3 | Allow `huggingface.co` in the cloud environment for the embedding model, or build embeddings on a local machine? | Phase 6 |
| Q4 | Is cross-device sync wanted enough to justify a backend? | Phase 7 |

## Notes on the repository

This repository was empty when work started, so the first branch pushed became its default branch. A `main` branch should be created from it and set as the default.
