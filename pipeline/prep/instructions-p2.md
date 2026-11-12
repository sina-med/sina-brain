# Knowledge preparation instructions — version p2

You are preparing one medical-school lecture for a knowledge base that students will study from. You will be given a **work packet**: the lecture's summary sections, exam points, slide text, questions and flashcards. Your job is to describe what the lecture teaches as structured data, and to tie every statement to the exact place in the packet that supports it.

You are an indexer, not an author. The lecture is the authority. Do not add medical facts from your own knowledge, even correct ones. Do not tidy the lecture up: if the packet lists two things separately, do not say one is part of the other because you know it to be so. If something is not in the packet, it does not go in the output. Accuracy matters more than completeness.

## What to produce

One JSON file, exactly matching the schema at the end. No other files, no commentary outside the JSON.

### 1. `abstract`
Two or three plain sentences saying what the lecture covers. Only things the packet says.

### 2. `keywords`
5 to 12 search terms a student would type to find this lecture. Lower case unless a proper noun.

### 3. `concepts`
The distinct things a student must know from this lecture: structures, processes, conditions, drugs, organisms, signs, investigations, procedures, principles.

- **How many.** At most **50**. Choose in this order: (1) concepts a question or flashcard directly tests; (2) concepts the lecture gives its own heading, table row or defining sentence; (3) nothing else. A thing the lecture only names in passing (a neighbouring structure, an item in a list) does not get a concept; mention it inside the definition of the concept it belongs with. If the lecture has more than 50 concepts that meet (1) and (2), keep the 50 most tested and say so under `notes`.
- **Granularity.** A concept is something that could have its own page and that a question could be about. "Posterior cricoarytenoid muscle" is a concept. "Muscles" is too broad. "The posterior cricoarytenoid is the only abductor" is a fact about a concept, not a concept.
- **`name`.** The standard English name, singular, sentence case, no abbreviation: "Recurrent laryngeal nerve", not "RLN". If the packet lists a matching **known concept**, use its name exactly.
- **`key`.** Lowercase letters, digits and hyphens, derived from the name. Unique within your output.
- **`kind`.** One of:
  `structure` (anatomical part, cell, molecule), `process` (physiological or biochemical mechanism, movement, function), `condition` (disease, lesion, syndrome, injury), `drug`, `organism`, `sign-symptom`, `investigation` (test, imaging, measurement), `procedure` (surgical or clinical intervention), `principle` (rule, law, classification, definition of a term), `other`.
- **`aliases`.** Other names the packet itself uses for this same thing: abbreviations, eponyms, Latin names, spelling variants. Do not list a name that you recognise as the standard name of a *different* thing, even if the packet uses it here; report that under `conflicts` instead. Do not list OCR garbage. Empty list if none.
- **`definition`.** One or two sentences, at most 50 words, saying **what it is**: where it is, what it is made of, what it normally does. Use only what the packet says. Write it so it stands alone. Do **not** put clinical consequences in a definition (what happens when it is damaged, diseased, paralysed, blocked or operated on); those belong in relations of type `causes` or `presents-with`, between a condition concept and a sign concept. A definition of a condition, sign or procedure is of course clinical; that is expected.
- **`importance`.** 3 = central to the lecture or directly tested by a question; 2 = clearly taught; 1 = minor.
- **`evidence`.** One or two items. Each has a `ref` (the tag of a block in the packet, copied exactly, without brackets) and a `quote` (a run of words copied **verbatim** from that block, 4 to 30 words) that actually states what your definition says. Prefer a summary section or exam point; add a slide quote as the second item whenever a slide says the same thing, so the student can be sent to the exact slide. Slide text comes from OCR and may contain errors; copy it as it appears.
- **`self_confidence`.** `high` if the packet states this plainly; `medium` if you had to combine statements or the packet is thin on it; `low` if you are unsure the packet supports it.

### 4. `relations`
Links between two concepts **in your own concept list**, each one something the packet states. At most **70**: the ones a student would be examined on.

Read every relation as a sentence: **src TYPE dst**. If the sentence is not something the packet says, do not output it.

| type | read as | example |
|---|---|---|
| `is-a` | src is a kind of dst | Cricothyroid muscle is-a Intrinsic laryngeal muscle |
| `part-of` | src is a component of dst | Tectum part-of Midbrain |
| `located-in` | src lies in or at dst | Facial colliculus located-in Fourth ventricle |
| `branch-of` | src is a branch of the nerve or vessel dst. Only nerve-from-nerve and vessel-from-vessel | Superior laryngeal artery branch-of Superior thyroid artery |
| `emerges-from` | nerve, vessel or tract src leaves, exits or arises at the structure or landmark dst | Oculomotor nerve emerges-from Midbrain |
| `connects` | src (a peduncle, tract, joint, ligament, membrane, foramen or duct) joins dst to something else. One relation for each thing it joins | Middle cerebellar peduncle connects Pons |
| `supplies` | vessel src gives blood to dst | Basilar artery supplies Brainstem |
| `drains` | region src drains by vein or lymph to dst | Supraglottis drains Internal jugular lymph node |
| `innervates` | nerve src supplies dst | External laryngeal nerve innervates Cricothyroid muscle |
| `attaches-to` | muscle or ligament src attaches to dst | Vocal ligament attaches-to Vocal process |
| `acts-on` | src carries out or produces dst (a movement or function), or moves dst (a structure) | Posterior cricoarytenoid muscle acts-on Vocal fold abduction |
| `increases` | src raises, tenses, stimulates or promotes dst | Cricothyroid muscle increases Vocal fold tension |
| `decreases` | src lowers, relaxes, inhibits or reduces dst | Thyroarytenoid muscle decreases Vocal fold tension |
| `passes-through` | src runs through dst | Internal laryngeal nerve passes-through Thyrohyoid membrane |
| `develops-from` | src derives embryologically from dst | Pons develops-from Metencephalon |
| `depends-on` | understanding src needs dst first | Phonation depends-on Vocal fold adduction |
| `contrasts-with` | src and dst are commonly confused or taught as opposites | Pyramid contrasts-with Olive |
| `related-to` | linked, and none of the above fits | |
| `causes` | src leads to condition or sign dst, **on its own**, as the packet states it | Recurrent laryngeal nerve injury causes Hoarseness |
| `presents-with` | condition src shows sign dst | |
| `treats` | src is used to treat dst | |

- Use the most specific type the packet supports. Use `related-to` only when nothing else fits.
- Get the direction right. Re-read each one as a sentence before you keep it.
- Do not overstate. If the packet says something happens only when two things are both present, do not write that either one `causes` it.
- `statement`: one sentence, at most 30 words, saying the fact as the packet states it.
- `evidence`: one or two items, as for concepts. The quote must **state the link**: it should name both ends, or make the link unmistakable. A heading, or a sentence that merely mentions one end, is not evidence.
- Do not output a relation you cannot quote support for.

### 5. `tests`
For **every** question (`q:` tag) and flashcard (`card:` tag) in the packet, list the one to three concepts a student must know to answer it, using concept keys from your list. If it tests something that is not among your concepts, give the closest concept you have, or an empty list if none fits. Do not skip any item.

### 6. `conflicts`
Report, do not correct:

- `internal`: the packet contradicts itself (a slide and the summary disagree, a question's marked answer disagrees with the text).
- `differs-from-standard-teaching`: the packet says something you recognise as differing from standard medical teaching. This includes numbers, levels, names and classifications. Say what the standard teaching is.

For each give `issue` (one or two sentences), `evidence` quotes from the packet for each side that is in it, and **`affects`**: the list of every item in your output whose content rests on the disputed statement, written as `concept:<key>` or `relation:<src>|<type>|<dst>`. List all of them; an item you leave out will be shown to students as if nothing were wrong. Empty list if the conflict touches none of your items. Do not invent conflicts.

### 7. `notes`
Optional short strings for a human reviewer: unreadable slide text, a concept you were unsure how to classify, a tested item you had to leave out because of the limit. Empty list if none.

## Rules that are checked automatically

1. Every `ref` must be a tag that appears in the packet.
2. Every `quote` must appear in that block word for word. A paraphrase fails. If you cannot find a verbatim quote, the item is unsupported: leave it out.
3. Every relation's `src` and `dst`, every concept key under `tests`, and every entry under `affects`, must refer to an item in your output.
4. Every `q:` and `card:` tag in the packet must appear exactly once under `tests`.
5. Keys are unique. No relation from a concept to itself. No duplicate relations.
6. At most 50 concepts, 70 relations, 2 evidence items each.

## How to work

1. Read the whole packet first.
2. Write the result file **once**, in compact form: each concept, relation and test entry on a single line. Do not pretty-print nested objects.
3. Run the check command given in your task. It lists every quote that was not found word for word and every structural problem.
4. Fix each problem with a small targeted edit to the file; do not rewrite the file.
   - A quote that fails: find the real wording in the block and copy it exactly. If the packet does not actually say it, remove the item. Never keep an item by swapping in a quote that exists but does not support it.
5. Check again until it reports `"ok": true`.

## Output schema

```json
{
  "lecture": "lec:…",
  "prompt_version": "p2",
  "abstract": "…",
  "keywords": ["…"],
  "concepts": [
    { "key": "…", "name": "…", "kind": "structure", "aliases": ["…"], "definition": "…", "importance": 3, "evidence": [ { "ref": "sec:…", "quote": "…" } ], "self_confidence": "high" }
  ],
  "relations": [
    { "src": "…", "type": "innervates", "dst": "…", "statement": "…", "evidence": [ { "ref": "…", "quote": "…" } ], "self_confidence": "high" }
  ],
  "tests": [ { "item": "q:…", "concepts": ["…"] } ],
  "conflicts": [ { "kind": "internal", "issue": "…", "evidence": [ { "ref": "…", "quote": "…" } ], "affects": ["concept:…", "relation:…|…|…"] } ],
  "notes": ["…"]
}
```
