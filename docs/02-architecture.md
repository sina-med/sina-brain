# 2. Architecture

Status: proposal for review.

## 2.1 The shape in one picture

```
 Sina site data          Google Drive PDFs         Slide OCR (sina-build)
 (js/data/*.js)          (original lectures)       (hl/lines.json)
        \                       |                        /
         \                      |                       /
          v                     v                      v
        ┌──────────────────────────────────────────────────┐
        │  INGESTION PIPELINE  (Python, run by an admin)   │
        │  import → extract → prepare (AI, in a Claude     │
        │  Code session) → validate → write                │
        └──────────────────────────────────────────────────┘
                              |
                              v
        ┌──────────────────────────────────────────────────┐
        │  KNOWLEDGE BASE  (versioned files in this repo)  │
        │  kb/  JSONL per record type, one folder per      │
        │       subject; relations; AI artifacts; manifest │
        └──────────────────────────────────────────────────┘
                              |
                         build step
                              v
        ┌──────────────────────────────────────────────────┐
        │  STATIC ARTIFACTS  (published with the app)      │
        │  record shards · search index · embeddings ·     │
        │  graph data · coverage statistics                │
        └──────────────────────────────────────────────────┘
                              |
                              v
        ┌──────────────────────────────────────────────────┐
        │  SINA BRAIN WEB APP  (static, GitHub Pages)      │
        │  reads artifacts · personal data in IndexedDB ·  │
        │  reads Sina progress from localStorage           │
        └──────────────────────────────────────────────────┘
                              :
                 optional, later, needs approval
                              v
        ┌──────────────────────────────────────────────────┐
        │  BACKEND  (sync, suggestions, hosted admin,      │
        │  live-AI proxy)                                  │
        └──────────────────────────────────────────────────┘
```

## 2.2 Why this shape

**The read path needs no server.** Every public feature in the brief (browse, search, concept pages, graph, documents, MCQs, flashcards) reads data that changes only when an administrator publishes. That data can be compiled once and served as static files. This is what makes the project free to run and usable with AI switched off.

**The knowledge base lives in git.** Files under `kb/` are the canonical store. Git supplies history, review by diff, rollback and backup without any service. A change to shared knowledge is a commit; only people with write access to the repository can make one, which is server-side permission enforcement provided by GitHub.

**A database is a build output, not the source of truth.** The build step can emit SQLite for local querying and tests. If the project later outgrows files, the same schema loads into PostgreSQL with pgvector without redesign. At today's scale (about 25,000 to 30,000 records) a hosted database would add cost and an operational dependency with no benefit to readers.

**Personal data never leaves the device unless the user asks.** Notes, bookmarks, tasks, annotations and Brain-specific progress are stored in IndexedDB, with export to and import from a file. Optional account sync is a later, separate component.

## 2.3 Components and proposed technology

| Component | Proposal | Reason |
|---|---|---|
| Web app | Vite + TypeScript, small component library to be chosen in Phase 5 | Typed data access matters more here than in Sina; a build step allows code splitting so the app does not load everything at once |
| App data access | Records fetched as shards by subject and type, cached in IndexedDB | Avoids Sina's 15 MB first load |
| Full-text search | Prebuilt lexical index (BM25-style) | Works offline, no server |
| Semantic search | Precomputed, quantised embeddings; query embedded in the browser by a small model loaded on demand | No per-query cost; falls back to lexical search |
| Graph | 2D first (canvas/WebGL), 3D afterwards with three.js (already used by Sina) | Coverage before effects |
| Document reading | Slide images from Sina with OCR text layer; PDF.js for other documents | Reuses existing page-level assets |
| Pipeline | Python 3, standard library plus `pdfplumber` | Already available; few dependencies |
| Validation | JSON Schema for every record file, checked in CI | Prevents malformed records from being published |
| CI and deploy | GitHub Actions: validate, build, test, publish to Pages | Free for public repositories |
| Personal store | IndexedDB (via a thin wrapper) | Required by the brief; larger and more structured than `localStorage` |

The component library, graph library and search library are chosen at the start of the phase that needs them, with a short comparison recorded in `docs/decisions.md`.

## 2.4 Relationship with Sina

- Sina is not modified. Brain reads Sina's published data files at build time and Sina's `localStorage` progress at run time (same origin, read-only).
- Brain links to Sina's slide images and 3D models by URL instead of copying them.
- Every imported record keeps its Sina identifier (see the knowledge model), so links in both directions are possible later: Sina can link to `brain/#/lecture/<id>` and Brain can link to `#/lecture/<id>` on Sina.
- Brain registers its own service worker with scope `/brain/`. A test checks that Brain pages are controlled by Brain's worker and that Sina's cache is left alone.
- Later integration, if wanted: Sina loads Brain's published `related` data for a lecture to show related concepts. That is an additive change to Sina and would be proposed separately.

## 2.5 Administration

Phase 3 to 7: administration is done through the repository.

1. An administrator runs the pipeline, which writes proposed records and relations with status `proposed`.
2. A local review tool (a small web page served from the admin's machine) lists proposals and lets the admin approve, reject, edit or merge. It writes back to `kb/`.
3. The change is committed and pushed. CI validates and publishes.

Students cannot edit shared content. They can send a correction suggestion; the first version reuses Sina's existing report channel, and suggestions arrive as rows for an admin to act on.

Phase 8 may replace the local tool with a hosted admin interface. That needs a backend and is a separate approval.

## 2.6 The optional backend

Not built before Phase 7, and only with approval. It would provide:

| Function | Why it cannot be static |
|---|---|
| Account sync and backup | Needs authenticated storage per user |
| Student suggestions with status tracking | Needs a write endpoint with abuse protection |
| Hosted admin interface | Needs authenticated writes |
| Live AI proxy | An API key must never reach the browser |

Candidates are compared in [05-search-and-ai.md](05-search-and-ai.md) section 5.6.

## 2.7 Security

- No secret is ever placed in frontend code or in this public repository.
- Shared content is changed only through commits by authorised collaborators.
- Personal data stays on the device by default. Exports are plain files the user controls.
- All HTML coming from records is sanitised before display; record text is treated as data.
- User-uploaded documents are processed in the browser and stored locally. They are not uploaded anywhere.

## 2.8 Limits to be honest about

- GitHub Pages: 1 GB published site, 100 GB per month soft bandwidth limit, no server code.
- In-browser semantic search needs a one-time model download (tens of megabytes) on each device. It is optional.
- A static app cannot offer cross-device sync or a server-enforced private area. Those wait for the backend.
- Slide OCR quality varies; 425 slides have none. Citations to slides are exact, but text search inside them is only as good as the OCR.
