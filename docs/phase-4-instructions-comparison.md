# Phase 4: comparison of three instruction versions on the pilot lectures

Date: 12 November 2026. Lectures: Anatomy of the larynx, Anatomy of the brainstem. Same work packets in every run (byte-identical), same model, fresh worker each time, independent audit each time.

No medical professional has reviewed any of these outputs. "Flagged" means flagged by the independent AI auditor.

| Version | What it is |
|---|---|
| p1 | The original pilot |
| p2 | Revised instructions **with** a limit of 50 concepts and 70 relationships |
| p3 | The same revised instructions **without** a hard limit: every concept a question tests must be included |

Stored outputs: `reports/prep/pilot-p1/`, `pilot-p2/`, `pilot-p3/`. The knowledge base now holds p3.

## 1. Did accuracy improve? Yes.

| | p1 | p2 | p3 |
|---|---|---|---|
| Concepts + relationships produced | 346 | 240 | 375 |
| Items flagged by the auditor | 14 (plus 9 more it mentioned without listing, or that I found by reading) | 8 | 7 |
| …of which the lecture itself differs from standard teaching | 8 | 4 | 5 |
| …of which the AI got it wrong | 6 listed, about 15 in all | 4 | 2 |
| Wrong relationship type | 8 (nerve emergence written as "branch-of") | 0 | 1 |
| Clinical link overstated | 2 | 0 | 0 |
| Ordinary definitions carrying a clinical sentence | 4 | 0 | 0 |
| Items held because the worker reported a conflict behind them | 0 (not possible in p1) | 3 | 19 |
| Quotations found word for word | 649 of 651 | 469 of 469 | 610 of 610 |

AI-introduced errors fell from roughly 4% of items to under 1%. The two that remain in p3:

- **Thyroarytenoid muscle**: the definition again describes one muscle with a superior and an inferior part, which the lecture does not say. This error appeared in all three runs. The model's own anatomy knowledge keeps overriding the lecture here, and only the audit catches it. It is held.
- **"Trochlear nerve emerges-from Inferior colliculus"**: the lecture says the nerve emerges *below* the colliculi. Held.

Under a2 the auditor now lists every affected item, so nothing flagged in p2 or p3 is left visible.

## 2. Did the limits cause information loss? Yes, and removing them fixed it.

| | p1 | p2 (limit) | p3 (no limit) |
|---|---|---|---|
| Concepts: larynx / brainstem | 71 / 72 | 50 / 50 | 77 / 84 |
| Relationships: larynx / brainstem | 113 / 90 | 70 / 70 | 105 / 109 |
| Concepts from p1 that a question tests, now missing | — | 23 | 2 |
| Questions and flashcards linked to a concept | 178 of 178 | 178 of 178 | 178 of 178 |
| Concepts the auditor lists as missed | 20 | 20, nearly all pushed out by the limit | 12 |

Under p2 both workers hit the limit exactly and said so. Lost concepts included "Respiratory and cardiovascular centres" (tested by four items) and "Basilar groove". Under p3 the two that are missing are "Cranial nerve nucleus" and the recurrent laryngeal nerve injury concept, which p3 replaced with three more specific ones (unilateral, bilateral, combined).

The limits are withdrawn. p3 keeps only a ceiling of 90 concepts and 120 relationships as a guard against runaway output.

## 3. Did cost decrease? Yes, about 30%, but not because of the limits.

Per lecture, averaged over the two:

| | p1 | p2 | p3 |
|---|---|---|---|
| Extraction: output tokens | 83,800 | 74,300 | 58,500 |
| Extraction: time | 643 s | 626 s | 445 s |
| Audit: output tokens | 28,700 | 28,200 | 16,700 |
| Audit: time | 261 s | 251 s | 157 s |
| Total output tokens per lecture | 112,500 | 102,500 | 75,200 |

The p2 brainstem run was interrupted by a usage limit and resumed, which inflates its figure. The saving in p3 comes from at most two quotations per item, compact output written once, and corrections made in place. Extrapolated to 337 lectures, p3 is roughly 25 million output tokens against 38 million for p1. That is still many usage windows; three were exhausted producing this comparison.

## 4. What is still weak

1. **Names drift between runs.** p1 said "Vocal fold abduction", p3 says "Vocal cord abduction". Within one build this is handled, because each worker is given the concepts already established in the subject. It does mean reprocessing a lecture can rename concepts.
2. **Cross-lecture links are thin so far.** p1 had one concept shared by the two lectures (vagus nerve); p3 has none, because the larynx worker judged the vagus to be mentioned only in passing. Two unrelated lectures are a poor test; Anatomy 3 as a whole will show whether merging works.
3. **The review queue is larger, by design.** p3 records the clinical links the lecture states and holds them: 83 entries for the two lectures (26 clinical relationships, 26 clinical definitions, 12 lecture conflicts, 7 audit findings, 12 information-only). Of 161 definitions, 123 are shown and 38 held; of 214 relationships, 180 shown and 34 held.
4. **The auditor is the same model as the worker.** The thyroarytenoid case shows it can catch what the worker repeats, but it will share other blind spots.

## 5. Decision

Judged against the three questions asked: accuracy improved, the limits did cause loss and have been removed with the loss recovered, and cost fell by about a third. I am treating the comparison as satisfactory and continuing with Anatomy 3 under p3 and a2, two workers at a time, with every lecture audited and progress committed after each lecture.
