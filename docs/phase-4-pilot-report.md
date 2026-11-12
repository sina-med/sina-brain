# Phase 4 pilot report: knowledge preparation on two lectures

Date: 11 November 2026. Status: awaiting owner review. No other lecture has been processed.

Lectures: **Anatomy of the larynx** and **Anatomy of the brainstem** (Anatomy 3). Instructions version `p1`, audit version `a1`, routing policy `policy-2`.

What to read alongside this report:

| File | What it is |
|---|---|
| [`reports/prep/anat3-larynx.md`](../reports/prep/anat3-larynx.md) | Every concept, relationship and question link for the larynx lecture, beside the lecture's own words, with links to the slides |
| [`reports/prep/anat3-brainstem.md`](../reports/prep/anat3-brainstem.md) | The same for the brainstem lecture |
| [`kb/admin/SAMPLE.md`](../kb/admin/SAMPLE.md) | A fixed random sample: 30 definitions, 30 relationships, 16 question links |
| [`kb/admin/REVIEW.md`](../kb/admin/REVIEW.md) | The consolidated review queue |
| [`kb/admin/COVERAGE.md`](../kb/admin/COVERAGE.md) | The live coverage report |

**No medical professional has reviewed any of this.** The error counts below come from an independent AI auditor and from my own reading against the lecture text. They are a lower bound, not a verification.

## 1. Result in brief

| | Larynx | Brainstem | Both |
|---|---|---|---|
| Concepts extracted | 71 | 72 | 142 (one shared: vagus nerve) |
| Relationships between concepts | 113 | 90 | 203 |
| Question and flashcard links to concepts | | | 322, covering all 178 items |
| Section and slide links to concepts | | | 228 |
| Quotations checked against the lecture | 339 | 312 | 651 |
| Found word for word | 337 | 312 | 649 (99.7%) |
| Found approximately | 2 | 0 | 2 |
| Not found | 0 | 0 | 0 |
| Definitions shown / held | 53 / 18 | 63 / 9 | 116 / 27 |
| Relationships shown / held | 98 / 15 | 85 / 5 | 183 / 20 |
| Auditor findings | 9 | 5 | 14 |
| Conflicts reported in the lecture itself | 4 | 3 | 7 |
| Failed extractions, dropped items | 0 | 0 | 0 |

"Shown" means auto-accepted: it would be displayed with the label "AI-generated — not medically verified". There is no app yet, so nothing is actually displayed to anyone.

The quotation figures are after the workers' own self-check: each worker runs a checker on its draft and corrects quotations that fail before handing in. That is by design, but it means 99.7% measures the final output, not first-attempt accuracy.

## 2. Quality against the original lectures

### 2.1 Coverage

| Measure | Larynx | Brainstem |
|---|---|---|
| Exam points naming at least one extracted concept | 16 of 17 | 15 of 15 |
| Summary sections quoted as evidence | 9 of 10 (the unquoted one is the list of objectives) | 6 of 6 |
| Slides with text quoted as evidence | 18 of 21 | 18 of 20 |
| Questions and flashcards linked to a concept | 86 of 86 | 92 of 92 |
| Concepts tested by at least one question or flashcard | 61 of 71 | 61 of 72 |

The auditor listed 10 concepts per lecture that it thinks were missed. Typical: Galen's loop, subglottic pressure, piriform sinus, stridor (larynx); abducens nucleus, medullary vela, medial geniculate body (brainstem). These are real omissions of second-rank items. Nothing central to either lecture is missing.

### 2.2 Definitions: what good output looks like

| Concept | AI definition | Lecture's own words |
|---|---|---|
| Cricoid cartilage | An unpaired signet-shaped ring of cartilage with a narrow anterior arch and a broad posterior lamina, at the level of C6. It is the only cartilage that completely encircles the lumen of the larynx and is called the foundation stone of the larynx. | "The only cartilage that completely encircles the lumen of the larynx, and the foundation stone of the larynx" (summary) · "The cricoid is the only complete ring in the airway, at C6" (exam point) · "This is a signet-shaped ring of cartilage with a narrow anterior arch and a broad posterior lamina" (slide 20) |
| Rhomboid fossa | The diamond-shaped depression on the dorsal surface of the pons and upper half of the medulla that forms the floor of the fourth ventricle. | "formed by the rhomboid fossa, a diamond-shaped depression on the dorsal surface of the pons and upper half of the medulla" (slide 29) |
| Recurrent laryngeal nerve | A branch of the vagus arising on the right at the base of the neck and on the left in the thorax. It is motor to all the intrinsic muscles of the larynx except the cricothyroid and sensory below the vocal folds. The left nerve loops under the aortic arch and the right under the subclavian artery. | "Motor to all the intrinsic muscles except the cricothyroid; sensory below the vocal folds…" (summary) · "The left recurrent nerve loops under the aortic arch…; the right loops under the subclavian artery." (high-yield note) |

Most definitions are like these: a faithful recombination of two or three lecture sentences, each traceable to a section or slide.

### 2.3 Definitions: what went wrong

| Concept | Problem | Who caught it | Outcome |
|---|---|---|---|
| Thyroarytenoid muscle | The definition describes one muscle with a superior part and an inferior part (the vocalis). The lecture lists superior and inferior thyroarytenoid as separate muscles and never says this. The worker used outside knowledge. | Auditor | Held |
| Laryngeal prominence | Definition is fine, but one supporting quotation was attributed to the wrong question. | Quotation checker (flagged "approximate") and auditor | Held |
| Larynx | Faithful to the lecture ("C4 to C6"), but standard teaching is C3 to C6. | Auditor | Held |
| Laryngeal vein | Faithful to the lecture (inferior thyroid vein to subclavian vein); standard teaching is the brachiocephalic vein. | Auditor | Held |
| Acoustic parameters of the voice | Faithful to the lecture (pitch as a third parameter shaped by the cavities); standard teaching calls that timbre. | Auditor and worker | Held |
| Accessory nerve, Basilar artery, Medial eminence, Cephalic flexure | Faithful to the lecture; each differs from standard teaching in a detail (CN XI as a "mixed" nerve, basilar supply without the vertebral arteries, medial eminence as the midline, two flexures that are one). | Auditor | Held |
| Facial colliculus, Glottis, Posterior cricoarytenoid, Respiratory and cardiovascular centres | Ordinary structures whose definition carries a clinical sentence ("a lesion there gives an ipsilateral VI and VII palsy"). | Found when I read the output; now caught by a word screen | Held |

Two patterns matter more than the individual cases:

1. **The AI reproduces what the lecture says, including where the lecture is imprecise.** Seven of the nine doubted definitions are accurate summaries of slides that differ from standard teaching. The pipeline does not correct the lecture. It reports the difference and holds the item.
2. **A word-for-word quotation does not prove the sentence built on it.** The thyroarytenoid definition had three exact quotations and was still wrong. Only the audit caught it.

### 2.4 Relationships

Of 203 relationships, I count 13 that are wrong or misleading through the AI's doing:

| Problem | Count | Example | Caught by |
|---|---|---|---|
| Wrong relation type because the vocabulary has no fitting one | 8 | "Oculomotor nerve **branch-of** Midbrain" for "emerges from the midbrain" | Auditor (it formally flagged one and said the same applies to seven others; only the one was held) |
| Clinical link overstated | 2 | "External laryngeal nerve injury **causes** Cadaveric position" (the lecture says only combined bilateral damage does) | Auditor; already held as a clinical claim |
| Link not stated by the lecture | 1 | "Vocalis muscle **part-of** Thyroarytenoid muscle" | Auditor |
| Direction of effect lost | 1 | "Thyroarytenoid muscle **acts-on** Vocal fold tension", where the lecture says it relaxes the cords | My reading; not caught automatically |
| Quotation is real but does not support the link | 1 | "Anterior commissure **part-of** Glottis", supported only by a heading | My reading; not caught automatically |

That is 6.4%. Without the vocabulary gap it is 2.5%. One further relationship ("External laryngeal nerve innervates Infraglottic cavity") is faithful to the lecture but contradicts both standard teaching and another part of the same lecture; worker and auditor both reported it.

The rest are sound and specific. Examples: "External laryngeal nerve **innervates** Cricothyroid muscle", "Internal laryngeal nerve **passes-through** Thyrohyoid membrane", "Superior laryngeal artery **branch-of** Superior thyroid artery", "Pons **develops-from** Metencephalon", "Foramen of Luschka **located-in** Cerebellopontine angle".

### 2.5 Summaries and keywords

Both abstracts are accurate, three sentences, and say only what the lecture covers. Keywords are sensible search terms. The auditor found nothing to object to in either.

### 2.6 Question links

All 178 questions and flashcards were linked to one to four concepts. 268 links are high confidence (the concept's name appears in the question), 54 medium. The auditor flagged none as wrong. I spot-checked the brainstem lecture's 92 items against my own tagging: every item shared at least one concept with mine.

### 2.7 Conflicts found in the lectures themselves

The workers reported seven. These concern Sina's existing content, which was not changed:

- Brainstem, slide 20: the trochlear nerve's muscle "ensures upward gaze". Standard teaching is downward (and inward) gaze.
- Brainstem, slide 4: the cephalic flexure placed between brainstem and spinal cord, and listed separately from the mesencephalic flexure.
- Brainstem, slides 15 and 17: headed "THE MIDBRAIN" but describing the pons and medulla.
- Larynx: the external laryngeal nerve given sensory supply below the cords, while the same lecture gives that to the recurrent nerve.
- Larynx: epithelium called "cylindric stratified" in one place and "ciliated pseudostratified columnar" in another.
- Larynx: "all intrinsic muscles adduct except the posterior cricoarytenoids" against a question explanation saying the cricothyroid tenses and does not adduct.
- Larynx: pitch described as separate from frequency, then as depending on frequency.

Whatever is decided about the pipeline, this list is useful as errata for Sina.

## 3. Consistency

**Same lecture, two independent workers (larynx).** 70 of 71 concepts were the same (96% overlap). 96 of 113 relationships were identical in both ends and type. 71 of 86 questions received exactly the same concepts, and 83 of 86 shared at least one. Two concepts were classified differently ("structure" versus "other").

**Fresh worker versus this session doing it inline (brainstem).** I extracted the brainstem lecture myself inside this long-running session, following the same instructions.

| | Worker (fresh context) | Inline (this session) |
|---|---|---|
| Concepts | 72 | 59 |
| Relationships | 90 | 58 |
| Concepts in common | 57 | 57 |
| Quotations found word for word | 312 of 312 | 165 of 165 |
| Evidence per item | Usually a summary quote and a slide quote | Often one |
| Nerve emergence recorded as | `branch-of` (wrong) | `related-to` (vague but not wrong) |
| Conflicts reported | The same three | The same three |
| Output tokens | about 76,000 | Not measurable; the result file is 60% the size |

The worker was more thorough (more concepts, more aliases, slide-level evidence for nearly everything). The inline run was cheaper and made one better judgement. The inline result was not audited, and I am judging my own work, so this is not a clean comparison.

**My assessment of separate workers:** they are worth keeping. Their output is reproducible, their cost is measurable, and one lecture's text cannot leak into the next. Inline processing would add about 20,000 tokens of lecture text to this session per lecture, so after a few lectures the session would be working from compressed memory of its own instructions. The pilot does not show that workers produce more *accurate* output than inline. It shows they produce more *uniform and complete* output, at a higher price.

## 4. Resource consumption

Measured from the worker sessions' own usage records.

| Run | Model | Time | Output tokens | New input (cache writes) | Cached re-reads |
|---|---|---|---|---|---|
| Larynx extraction | claude-fable-5-2 | 700 s | 91,891 | 143,242 | 1,100,208 |
| Brainstem extraction | claude-fable-5-2 | 585 s | 75,771 | 128,144 | 801,407 |
| Larynx, second run (consistency check) | claude-fable-5-2 | 679 s | 89,830 | 134,569 | 878,382 |
| Larynx audit | claude-fable-5-2 | 265 s | 29,296 | 182,988 | 868,592 |
| Brainstem audit | claude-fable-5-2 | 256 s | 28,128 | 168,727 | 821,058 |

Per lecture: about 11 minutes and 84,000 output tokens to extract, plus about 4 minutes and 29,000 output tokens to audit.

**The usage limit was hit during the pilot.** Three workers running in parallel, on top of the Phase 3 and Phase 4 development done earlier in the same window, exhausted the 5-hour allowance. All three had already written complete results, so nothing was lost, and work resumed after the reset. No paid service was used.

What this means for the full run of 337 lectures:

- At pilot rates, roughly 28 million output tokens to extract and 10 million to audit.
- I cannot see the plan's allowance, so I cannot convert that into a number of days. The one data point is that a single window did not comfortably hold three extractions plus development work. The full run will take many usage windows.
- Weekly limits, if the plan has them, may be reached before the 5-hour ones.

Ways to cut the cost, proposed for version `p2` (section 6): cap the size of each result, ask for at most two quotations per item, and have the worker correct its file in place instead of rewriting it. I expect 30–40% less output per lecture, but that is a guess until measured on the first batch.

## 5. The review queue

74 entries for two lectures.

| Reason | Entries | Held from students? |
|---|---|---|
| Clinical definitions (conditions, signs, procedures, or clinical wording) | 18 | Yes |
| Clinical relationships | 17 | Yes |
| Auditor findings | 12 | Yes |
| Conflicts in the lecture itself | 7 | Not applicable; they are about Sina's content |
| Concepts the auditor thinks were missed | 20 | No; information only |

54 of these would need a decision before the item could be shown.

**This rate does not scale to "I do not want to inspect every lecture".** Two anatomy lectures produced about 27 actionable entries each. Across 337 lectures that is on the order of 9,000, and clinical subjects (semiology, pathology, pharmacology, infectious diseases) will produce far more, because under the current rule nearly every definition and relationship there is clinical.

What keeps this workable is that held items are simply not shown; the queue is a backlog, not a gate. A held concept still appears as an index entry whose page shows the lecture's own quoted words and slide. But for clinical subjects, the relationships that matter most ("this disease presents with this sign") would stay hidden until someone reviews them. That is the direct consequence of the rule that high-risk clinical claims are never published automatically. It is the cautious choice; I am flagging its cost, not arguing against it.

## 6. What I propose to change before scaling up

| # | Change | Why |
|---|---|---|
| 1 | Add relation types `emerges-from` (a nerve or vessel leaves a structure) and `connects` (a tract, peduncle, joint or ligament links two structures) | Removes the cause of 8 of the 13 relationship errors |
| 2 | Add `increases` / `decreases` wording to `acts-on`, or split it | "Relaxes" was recorded as "acts on tension" |
| 3 | Tell workers that a definition says what a thing is, and that clinical consequences go into relationships | Keeps clinical statements where the routing can see them |
| 4 | Require each reported conflict and each audit finding to list every item it affects | A conflict was reported while the relationship it concerned was still auto-accepted; the auditor flagged one of eight identical errors |
| 5 | Cap a result at about 50 concepts and 70 relationships, at most two quotations per item; correct in place | Cost |
| 6 | Keep the audit on every lecture | It caught every non-clinical AI error that was caught automatically, and all nine places where the lecture differs from standard teaching. Extraction alone would have shown them |
| 7 | Run at most two workers at a time | Three exhausted the allowance mid-pilot |
| 8 | Reprocess larynx and brainstem under `p2` as the first two lectures of the first batch | So the whole knowledge base is built with one instruction version |

Items 1 to 5 make a new instruction version, `p2`. The pipeline already treats a new version as a reason to reprocess.

## 7. What was built

| Piece | Where |
|---|---|
| Worker and auditor instructions, versioned | `pipeline/prep/instructions-p1.md`, `audit-a1.md`, `worker-prompt.md` |
| Routing rules | `pipeline/prep/policy.json` |
| Pack, check, ingest, assemble, status | `pipeline/prep.mjs` |
| Quotation checker, packet builder, assembly logic | `pipeline/lib/evidence.mjs`, `prep-packet.mjs`, `prep-assemble.mjs` |
| Review sheets and sample | `pipeline/prep-report.mjs` |
| Statistics | `pipeline/stats.mjs` → `kb/admin/COVERAGE.md` |
| Tests | 40 pass, including: resumability, change detection, individual retry, routing by confidence and risk, contradiction detection, concept merging, and that the validator rejects AI records marked verified or approved without a named reviewer |

Verified by running, not only by tests: the two lectures went through pack, ingest, audit and assemble; a second assemble wrote nothing; validation passes on the full knowledge base (27,718 records, 14,873 relations); original Sina records are byte-identical before and after.

Not built: a point-and-click review tool. Decisions are currently recorded by adding lines to `kb/admin/review-decisions.jsonl`.

## 8. Limits of this pilot

- Two lectures from one subject, both anatomy. Clinical, quantitative and first-year science lectures will behave differently.
- No medical professional reviewed the output.
- The auditor is the same model as the worker. It is independent in context, not in kind; errors that the model makes systematically may pass both.
- Only one concept overlapped between the two lectures, so automatic merging of duplicates has barely been exercised on real data.
- 498 slides across the knowledge base have no text, and 20 lectures have no slide images. Those lectures will yield less slide-level evidence.
