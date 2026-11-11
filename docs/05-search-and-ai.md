# 5. Search, retrieval, the assistant, and costs

Status: proposal for review.

## 5.1 Three tiers

| Tier | What it gives | Runs where | Recurring cost | Phase |
|---|---|---|---|---|
| 0 | Full-text, keyword, tag and metadata search; filters; related-record lookup through the graph | Browser | None | 5 |
| 1 | Semantic search (meaning, not exact words), combined with tier 0 | Browser, using precomputed data | None | 6 |
| 2 | Generated answers and explanations | A server-side proxy to a model | Per use | Optional, needs approval |

The application is complete with tiers 0 and 1. Tier 2 is an add-on that can be switched off without removing any feature students depend on.

## 5.2 Tier 0: lexical search

- One index over records: lectures, sections, slides (OCR text), concepts and their aliases, MCQs, flashcards, papers, resources. Personal notes are indexed separately on the device and merged into results locally.
- Field weighting: title and aliases above body text; concept and lecture matches above slide text.
- Medical vocabulary handling: concept aliases expand the query (searching "CN VII" also finds "facial nerve") using the alias table, with no model involved.
- Each result shows title, type, excerpt with the match highlighted, subject and module, source, slide or page, and related concepts, and opens the right record.
- The index is built once per publish and split so the app loads only what a query needs.

## 5.3 Tier 1: semantic search

- At build time every retrieval chunk (section, slide text, concept definition, question with its explanation) is embedded by a small open model run locally. Vectors are quantised to one byte per dimension.
- Size estimate, to be confirmed in Phase 6: about 30,000 chunks × 384 dimensions is roughly 12 MB, loaded on demand and cached.
- At query time the browser embeds the query with the same model (downloaded once, then cached) and ranks by similarity. Lexical and semantic rankings are fused.
- If the model cannot be loaded (old device, no storage, user opts out), search silently stays on tier 0.
- English only (decision D5), which allows a smaller English model.

**Dependency to note:** building the embeddings needs the model files once. The cloud environment currently blocks `huggingface.co`, so Phase 6 will either need that host allowed (a settings change that needs approval, no cost) or the embeddings built on a local machine.

## 5.4 The assistant without live AI

Much of what the brief asks of the assistant is retrieval, not generation, and works at tiers 0 and 1:

| Request | How it is answered |
|---|---|
| "Find all MCQs about cranial nerves" | Concept match, then `tests` relations |
| "All lectures discussing cardiac physiology" | Concept match, then `covers` relations |
| "Related MCQs for this slide" | `cites` relations from questions to the slide |
| "Important concepts in this lecture" | `covers` relations ranked by `importance` |
| "How are X and Y connected?" | Shortest paths between two concepts in the approved graph, shown with the evidence for each step |
| "Summarise this lecture" | The stored summary, labelled with its origin |
| "Explain this slide" | The stored explanation if one was prepared; otherwise the linked sections and concepts |

Answers are assembled from stored records, each shown with its citation and its origin label (course material, Sina summary, or AI-generated and whether reviewed). Nothing is composed at run time, so nothing can be invented at run time.

## 5.5 Tier 2: live generation (optional)

Only if approved. Design constraints:

- Requests go through a small server-side proxy that holds the key. No key in the frontend.
- Retrieval first: the proxy sends the model only the retrieved passages and the question. The answer must cite passage IDs; uncited sentences are flagged in the interface.
- The model is instructed to say when the retrieved material does not answer the question, and to state when general medical knowledge differs from the course material instead of silently choosing one.
- Responses are cached by a hash of question and retrieved passages, so a repeated question costs nothing.
- Per-device and global daily limits, a monthly spend cap, usage logging, and a configurable model.
- A "bring your own key" mode is possible for individual users who have API access, stored only on their device.

A local alternative (Ollama, or an in-browser model) works only on capable hardware and gives weaker answers; it can be offered as an experimental option for users who run it themselves, at no cost to the project.

## 5.6 What costs money

| Item | When needed | Free option | Limits of the free option | Paid cost |
|---|---|---|---|---|
| Static hosting | Now | GitHub Pages | 1 GB site, 100 GB/month soft bandwidth | Not needed |
| CI | Phase 3 | GitHub Actions (public repo) | Free for public repositories | Not needed |
| Knowledge preparation | Phase 4 | Claude Code sessions under the existing subscription | Plan usage limits; needs a person to run sessions | API use would be billed per token; not proposed |
| Embedding model | Phase 6 | Open model, run locally | One-time compute on the build machine | None |
| Backend for sync, suggestions, hosted admin | Phase 7–8 | Cloudflare Workers + D1 + R2 free tiers, or Supabase free tier | Cloudflare: daily request and storage quotas. Supabase: projects pause after a week of inactivity; 500 MB database | Roughly $5–25 per month if the free tier is outgrown |
| Live AI answers | Optional | None that is hosted | — | Billed per token by the provider; controlled by caps |
| Custom domain | Optional | `sina-med.github.io/brain/` | — | About $10–15 per year |

Nothing in the first four rows costs money. Before any paid row is used, the specific service, the reason, the free alternative, expected initial and monthly cost, and how usage is billed will be put to the project owner, and work waits for explicit approval.

Free tiers change. Quotas above are indicative and will be rechecked against the providers' current terms at the time of the decision.
