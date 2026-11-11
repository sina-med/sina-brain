# Decisions

## Decided by the project owner (11 November 2026)

| # | Decision |
|---|---|
| D1 | Sina Brain lives in its own repository, `sina-med/sina-brain`, and is published at `sina-med.github.io/brain/` (same origin as Sina). |
| D2 | AnKing content is left out of Sina Brain. |
| D3 | No backend through Phase 6. Administration is done through the repository. |
| D4 | The pilot subject for knowledge preparation is Anatomy 3. |
| D5 | English only. |

## Proposed in these documents, awaiting approval

| # | Proposal | Where |
|---|---|---|
| P1 | The canonical knowledge base is versioned JSONL files in this repository; databases and indexes are build outputs. | [02](02-architecture.md) §2.2 |
| P2 | Sina is read, never modified. Slide images and 3D models are linked, not copied. | [02](02-architecture.md) §2.4 |
| P3 | Question IDs are Sina's alias-resolved question keys; a registry tracks every ID. | [03](03-knowledge-model.md) §3.3 |
| P4 | AI output is stored apart from records, starts as `proposed`, and must quote its evidence. | [03](03-knowledge-model.md) §3.8, [04](04-ingestion.md) §4.4 |
| P5 | Knowledge preparation runs inside Claude Code sessions; no API key is introduced. | [04](04-ingestion.md) §4.2 |
| P6 | Web app built with Vite and TypeScript. | [02](02-architecture.md) §2.3 |
| P7 | The assistant is retrieval-only until live generation is separately approved. | [05](05-search-and-ai.md) §5.4 |

## Open questions

| # | Question | Needed by |
|---|---|---|
| Q1 | Who, besides the owner, will review AI-proposed concepts and relations? Review time is the likely bottleneck. | Phase 4 |
| Q2 | Should published records show the names of professors and source file names, as Sina does today? | Phase 3 |
| Q3 | Allow `huggingface.co` in the cloud environment for the embedding model, or build embeddings on a local machine? | Phase 6 |
| Q4 | Is cross-device sync wanted enough to justify a backend? | Phase 7 |

## Notes on the repository

This repository was empty when work started, so the first branch pushed became its default branch. Once the proposals are approved, a `main` branch should be created from it and set as the default.
