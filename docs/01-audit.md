# 1. Repository audit

Audit date: 11 November 2026. Counts were measured by loading the site's data files in Node, not estimated, unless marked otherwise.

Three figures were corrected after the first full import (Phase 3) and are marked *corrected*. The live numbers are in [`kb/admin/COVERAGE.md`](../kb/admin/COVERAGE.md).

## 1.1 Repositories

| Repository | Role | Notes |
|---|---|---|
| `sina-med/sina-med.github.io` | The live Sina site | Static GitHub Pages. Vanilla JavaScript, no framework, no build step. Working tree 977 MB, of which `files/` is 503 MB. |
| `sina-med/sina-build` (private) | Build kit | About 190 one-off Python scripts, AnKing MCQs as JSON, slide OCR, Apps Script sources. |
| `sina-med/ak-media` | AnKing pictures | 30,584 AES-GCM encrypted image files. |
| `kejjja1/sina-med` | Old address | Redirects to the new site and carries saved progress over. |

## 1.2 How the Sina site works

- **Entry point:** `index.html` loads `js/i18n.js`, about 40 data scripts from `js/data/`, then `js/app.js` (3,586 lines, 324 KB).
- **Data:** everything hangs off one global object, `SINA`. Lectures are in `SINA.lectures[id]`; the hierarchy is in `SINA.subjects`.
- **Routing:** hash routes (`#/lecture/…`, `#/subject/…`, `#/practice`, `#/papers`, `#/paper/…`, `#/mistakes`, `#/weak`, `#/review`, `#/midterm`, `#/progress`, `#/leaderboard`, `#/anking`, `#/find/…`, `#/reminders`, `#/usmle`, `#/apps`, `#/updates`).
- **Storage:** `localStorage` only, about 40 keys under the `sina:` prefix. No IndexedDB, no accounts.
- **Offline:** `sw.js` is a network-first service worker scoped to the whole origin.
- **Backend:** one Google Apps Script web app that writes to a Google Sheet (leaderboard scores, mistake reports with optional picture, push-reminder subscriptions). A GitHub Action runs every 30 minutes to send reminders. GoatCounter collects cookie-free page views.
- **Tests and CI:** none, apart from the reminder workflow.

## 1.3 Content inventory

| Asset | Count | Where |
|---|---|---|
| Programs | 2 (`y1-anglo`, `y2-anglo`) | `js/data/index.js` |
| Subjects | 29 (28 live, `radio` planned with no lectures) | `js/data/index.js` |
| Lectures with data | 337 | `js/data/lectures-*.js` |
| Lectures listed without data | 3 (`semio-endo-parathyroid`, `semio-endo-gonads`, `semio-endo-lipids`) | PDFs exist in `files/src/` |
| Summary sections | 1,599 (about 1.14 million characters of text) | `lecture.summary[]` |
| Lecture MCQs | 10,509, all distinct. 15 pairs of figure questions share a Sina question key (*corrected*; see 1.4) | `lecture.mcqs[]` |
| Lecture MCQs linked to a slide | 7,205 (7,849 questions in total once paper questions are counted) | `mcq.slides[] = {src, lec, n}` |
| MCQs with per-option notes | 2,167 | `mcq.notes[]` |
| Multi-answer MCQs | 1,139 | `mcq.answers[]` |
| Flashcards | 5,578 | `lecture.cards[]` |
| Past papers and mocks | 133 | `SINA.papers` |
| Paper questions | 3,721 occurrences (2,583 in `paperQs` plus 1,138 inline), 3,207 distinct; none shared with lecture MCQs (*corrected*: the first count missed the inline ones) | `SINA.paperQs`, `paper.questions` |
| Paper question to lecture links | 657 entries, of which 617 match a current question | `SINA.paperLec` |
| Slide images | 5,079 across 317 lectures | `files/slides/<lecture>/<nn>.jpg` |
| Slides with OCR text and line boxes | 4,581 (*corrected*: of 4,654 OCR entries, 71 are for slide files that no longer exist and 2 are empty) | `sina-build/hl/lines.json` |
| Slide highlight boxes for questions | 3,425 question keys, 52 entries stale | `js/data/highlights.js` |
| External reading resources | 732 | `lecture.resources[]` |
| "Deeper" notes | 551 | `lecture.deeper[]` |
| Interactive SVG figures | one per lecture | `lecture.visual` |
| 3D models | 6 (`.glb`, Z-Anatomy, CC BY-SA 4.0) | `files/m3d/`, `js/data/m3d.js` |
| Image-occlusion sets | 47 | `files/occl/`, `js/data/occl.js` |
| Labelled photos | 27 lectures | `js/data/photos.js` |
| Midterm scopes | 4 | `SINA.midterms`, `js/data/midscope.js` |
| AnKing MCQs | 29,048 per the build README (password-locked) | `files/ak/`, `sina-build/anking/mcq/` |

**Source files.** 336 of 337 lectures carry a `sourceUrl` pointing at the original PDF in Google Drive. The Drive connector in this workspace can read those files (checked on one lecture and by listing recent PDFs).

**Anatomy 3 (the pilot subject).** 27 lectures, 205 summary sections, 1,015 MCQs, 900 flashcards, 527 slide images.

## 1.4 Data shapes worth knowing

Lecture:

```
id, subject, group, title, sourceFile, sourceUrl, buildNote,
summary[{id,title,html}], exam[string], visual{…}, mcqs[], cards[],
deeper[{title,html}], resources[{title,url,kind,why,note}],
checks[], sources[{name,url}], verified, highYield?, sourcePdf?
```

MCQ: `q, options[], answer | answers[], why, notes[]?, slides[]?, multi?, hint?, target?, m3d?, src?, x?`

Flashcard: `id, type ("text" | "image"), front, back, target?`

**Question identity.** Sina has no stored question ID. `qKey()` in `js/app.js` hashes the stem plus options (djb2-xor, base 36). When a question's wording is edited, `js/data/qalias.js` maps the new hash back to the old one so saved progress survives. There are 169 aliases today. All progress (`sina:asked`, `sina:mistakes`, `sina:srs`, `sina:right`) is keyed by this value.

**Key collisions.** The hash ignores the `target` field, so two "Which structure is at the arrow?" questions with the same options but different arrows get the same key. This happens 15 times. On Sina those pairs share progress: answering one marks the other as seen.

**Flashcard identity.** `lectureId + "|" + card.id`. Card IDs are unique within a lecture (checked).

**Summary section identity.** `section.id` is unique within a lecture (checked).

## 1.5 Progress data Sina already records

| Key | Meaning |
|---|---|
| `sina:stats` | Per lecture: `[attempts, correct]` |
| `sina:asked` | Per question key: day number last asked |
| `sina:mistakes` | Per question key: lecture and timestamp of the wrong answer |
| `sina:right` | Per question key: lecture where it was first answered correctly |
| `sina:srs` | Question spaced repetition (intervals 1, 3, 7, 16, 35 days) |
| `sina:fcsrs`, `sina:fclog` | Flashcard spaced repetition and log |
| `sina:days` | Last 120 study days |
| `sina:revised`, `sina:last`, `sina:resume` | Lecture revision marks, last visited, session resume |

## 1.6 What can be reused

1. **The published data files** are the real source of truth. The build scripts have hard-coded paths to an old workspace and embed content inside code, so they cannot simply be re-run. Sina Brain reads the published data through an adapter.
2. **Slide-level provenance**: the MCQ-to-slide links, slide images, and OCR text with boxes.
3. **The hierarchy**: program, subject, group, lecture, plus the midterm scopes.
4. **Progress**: because `sina-med.github.io/brain/` is on the same origin as Sina, Brain can read the `sina:*` keys directly, read-only.
5. **Viewers**: the three.js 3D viewer (`js/m3d.js`), image occlusion data, and the theme tokens in `css/style.css`.
6. **The mistake-report channel** (Apps Script), as a first route for student correction suggestions.

## 1.7 Problems and risks found

| # | Finding | Consequence for Sina Brain |
|---|---|---|
| 1 | Question IDs are content hashes patched by an alias table | Brain's question IDs stay stable only while `qalias.js` is maintained on every edit |
| 2 | Site working tree is 977 MB; GitHub Pages has a 1 GB published-site limit | Brain must not copy slide images; it links to Sina's |
| 3 | Sina's service worker is scoped to the whole origin | Brain at `/brain/` needs its own scoped worker and a test that neither cache interferes with the other |
| 4 | AnKing content includes third-party imagery | Excluded from Brain (decision D2) |
| 5 | Professor slides are publicly hosted | A rights question for the project owner; Brain adds no new copies |
| 6 | AnKing password and login stored in plaintext in the private build repo | Outside Brain's scope, flagged for the owner |
| 7 | Apps Script endpoint accepts unauthenticated writes | Can be spammed; do not build admin functions on it |
| 8 | Every lecture has a `verified` date but `checks` is empty everywhere | There is no record of what was verified; Brain needs an explicit verification status |
| 9 | 3 lectures listed without data, 20 lectures without slide images, 498 slides without text | Shows up as gaps in the coverage report |
| 13 | 15 pairs of figure questions share one Sina key | Brain adds the figure target to the ID; on Sina each pair shares progress (a small bug the owner may want to fix) |
| 14 | 928 paper questions carry an answer key written by Sina, not an official one | Brain labels these |
| 10 | Site loads about 15 MB of data scripts on first visit; one large untested script | Brain does not copy this structure. No change proposed to Sina |
| 11 | Stale duplicate files at the site's repo root (`app.js`, `style.css`, `anat3-*.js`, `sina-med/`, empty `download`) | Left untouched; flagged only |
| 12 | Translation uses an unofficial Google endpoint | May stop working without notice; not reused |

## 1.8 Access to Claude and other tooling

- No Anthropic API key exists in the working environment. A Claude subscription does not include API credits.
- What is available is interactive Claude Code sessions. Knowledge preparation done inside a session is covered by the plan's usage limits, not billed per token. Those limits are not visible from inside a session.
- PyPI is reachable from the cloud environment. `huggingface.co` is blocked by the environment's network policy, so downloading an embedding model there needs an approved change to the environment (Phase 6).
