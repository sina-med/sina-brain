# 8. The read-only application

Static files under `site/`. No build step, no dependencies, no server code, no accounts. Suitable for GitHub Pages as it stands; it has not been published.

| File | Role |
|---|---|
| `site/index.html`, `site/app.css` | Page and styles |
| `site/js/app.js` | Pages and navigation; loads the generated JSON under `site/data/` |
| `site/js/logic.js` | Marking, flashcard scheduling, search and practice bookkeeping: pure functions, tested under Node |
| `site/dashboard.html` | Project status |

## Pages

| Address | Page |
|---|---|
| `#/` | Programmes and subjects, search box |
| `#/subject/<id>` | Modules and lectures of a subject; practise or review a whole subject or module |
| `#/lecture/<id>[/<slide id>]` | Summary, exam points, in-page slide viewer with slide text and the questions citing each slide, further reading |
| `#/practice/<scope>[/<question id>]` | Question practice |
| `#/cards/<scope>` | Flashcard review |
| `#/papers/<subject id>`, `#/paper/<subject id>/<paper id>` | Past papers and one paper |
| `#/search/<query>[/<kind>[/<subject id>]]` | Search |
| `#/me` | Personal progress on this device; download or delete it |

A scope is `lecture:<id>`, `module:<id>`, `subject:<id>` or `paper:<subject id>|<paper id>`. These are the filters: subject, module, lecture and past paper. Practice can further be limited to questions not yet answered or answered wrong last time.

## Questions and marking

Questions are shown exactly as imported: wording, options, answer key, explanation, per-option notes and slide citation with its highlight boxes.

- A question is answered with checkboxes when Sina flags it as multi-answer or its key has more than one answer; otherwise with a single choice.
- Marking is Sina's own rule, ported from the Sina site: any wrong choice scores 0; otherwise the score is right choices ÷ number of right answers. No other scoring rule is applied.
- Where a paper came without an answer key and Sina wrote the answers, the question says so.
- 1,931 questions point at a labelled figure, photo or 3D model, and 1,916 flashcards are image cards. The export does not carry those figures, so these items are left out of practice and review, with a count shown and a link to the lecture on Sina.

## Flashcards

Shown front first, then the back. Rated Again, Hard, Good or Easy, scheduled with Sina's own interval rule (ported from the Sina site).

## Search

A linear scan over plain text, no index structure and no library. Every query word must occur at the start of a word in the title or text; title matches rank first. Covers lectures, summary sections, slide text, questions, flashcards and past papers: 25,947 rows. Measured on the full corpus: about 10 ms per query in Node; in Chromium the corpus loads in about 0.25 s from a local server and a query takes about 17 ms. The search text is 8.7 MB uncompressed and is fetched on the first search.

## Personal data

Answers, practice filter and flashcard progress are stored in the browser's `localStorage` under keys starting `brain:`. They never enter the exports or the repository and are not sent anywhere. The application does not read or write Sina's own progress keys.

## Testing

- `npm test`: logic, export and status tests (Node, runs in CI).
- `npm run e2e`: 13 browser checks with Playwright and Chromium: navigation, slide viewer, single- and multi-answer marking, filters, scopes, flashcards, past papers, search with timings, personal data, phone width. Run locally; Playwright is not a project dependency, so it is not part of CI. Slide images are stubbed in this test because they live on the Sina site.

## Viewing locally

```
npm run build:export
python3 -m http.server 8000 --directory site
```

Open `http://localhost:8000/`.
