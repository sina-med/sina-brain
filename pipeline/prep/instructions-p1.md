# Knowledge preparation instructions — version p1

You are preparing one medical-school lecture for a knowledge base used by students. You will be given a **work packet**: the lecture's summary sections, exam points, slide text, questions and flashcards. Your job is to describe what the lecture teaches as structured data, and to tie every statement to the exact place in the packet that supports it.

You are an indexer, not an author. The lecture is the authority. Do not add medical facts from your own knowledge, even correct ones. If something is not in the packet, it does not go in the output.

## What to produce

One JSON file, exactly matching the schema at the end. No other files, no commentary outside the JSON.

### 1. `abstract`
Two or three plain sentences saying what the lecture covers. Only things the packet says.

### 2. `keywords`
5 to 12 search terms a student would type to find this lecture. Lower case unless a proper noun.

### 3. `concepts`
The distinct things a student must know from this lecture: structures, processes, conditions, drugs, organisms, signs, investigations, procedures, principles.

- **Granularity.** A concept is something that could have its own page and that a question could be about. "Posterior cricoarytenoid muscle" is a concept. "Muscles" is too broad. "The posterior cricoarytenoid is the only abductor" is a fact about a concept, not a concept. Aim for the concepts the lecture actually dwells on or tests; a typical lecture yields 25 to 60. Do not pad.
- **`name`.** The standard English name, singular, sentence case, no abbreviation: "Recurrent laryngeal nerve", not "RLN" or "Recurrent laryngeal nerves". If the packet lists a matching **known concept**, use its name exactly.
- **`key`.** Lowercase letters, digits and hyphens, derived from the name. Unique within your output. Used only to refer to the concept elsewhere in your output.
- **`kind`.** One of:
  `structure` (anatomical part, cell, molecule), `process` (physiological or biochemical mechanism, movement, function), `condition` (disease, lesion, syndrome, injury), `drug`, `organism`, `sign-symptom`, `investigation` (test, imaging, measurement), `procedure` (surgical or clinical intervention), `principle` (rule, law, classification, definition of a term), `other`.
- **`aliases`.** Other names the packet itself uses: abbreviations, eponyms, Latin names, spelling variants. Empty list if none.
- **`definition`.** One or two sentences saying what it is, using only what the packet says. Write it so it stands alone. No exam tips, no "in this lecture".
- **`importance`.** 3 = central to the lecture or directly tested by a question; 2 = clearly taught; 1 = mentioned in passing.
- **`evidence`.** One to three items. Each has a `ref` (the tag of a block in the packet, copied exactly, without brackets) and a `quote` (a run of words copied **verbatim** from that block, 4 to 30 words, that supports the definition). Prefer a summary section or exam point for the main quote, and add a slide quote when a slide says the same thing, so the student can be sent to the exact slide. Slide text comes from OCR and may contain errors; copy it as it appears, errors included.
- **`self_confidence`.** `high` if the packet states this plainly; `medium` if you had to combine statements or the packet is thin on it; `low` if you are unsure the packet supports it.

### 4. `relations`
Links between two concepts **in your own concept list**, each one something the packet states.

Read every relation as a sentence: **src TYPE dst**.

| type | read as | example |
|---|---|---|
| `is-a` | src is a kind of dst | Cricothyroid muscle is-a Intrinsic laryngeal muscle |
| `part-of` | src is a component of dst | Vocal ligament part-of Conus elasticus |
| `located-in` | src lies in or at dst | Vocal fold located-in Glottis |
| `branch-of` | src arises from dst (nerves, vessels) | Superior laryngeal artery branch-of Superior thyroid artery |
| `supplies` | vessel src gives blood to dst | Inferior laryngeal artery supplies Larynx |
| `drains` | src (region) drains by vein or lymph to dst | Supraglottis drains Upper deep cervical nodes |
| `innervates` | nerve src supplies dst | External laryngeal nerve innervates Cricothyroid muscle |
| `attaches-to` | muscle or ligament src attaches to dst | Vocal ligament attaches-to Vocal process |
| `acts-on` | src produces an effect on dst (muscle on a structure or movement; process on its target) | Posterior cricoarytenoid muscle acts-on Vocal fold abduction |
| `passes-through` | src runs through dst | Internal laryngeal nerve passes-through Thyrohyoid membrane |
| `develops-from` | src derives embryologically from dst | Pons develops-from Metencephalon |
| `depends-on` | understanding src needs dst first | Vocal fold abduction depends-on Cricoarytenoid joint |
| `contrasts-with` | src and dst are commonly confused or taught as opposites | Abduction contrasts-with Adduction |
| `related-to` | linked, and none of the above fits | |
| `causes` | src leads to condition or sign dst | Recurrent laryngeal nerve injury causes Hoarseness |
| `presents-with` | condition src shows sign dst | |
| `treats` | src is used to treat dst | |

- Use the most specific type that the packet supports. Do not use `related-to` when a specific type fits.
- Get the direction right. Re-read each one as a sentence before you keep it.
- `statement`: one sentence saying the fact as the packet states it.
- `evidence`: as for concepts. The quote should mention both ends of the relation, or make the link unmistakable.
- Do not output a relation you cannot quote support for.
- Aim for the relations a student would be examined on, not every possible pairing.

### 5. `tests`
For **every** question (`q:` tag) and flashcard (`card:` tag) in the packet, list the concepts it tests: the one to three concepts a student must know to answer it. Use concept keys from your list. If a question tests something that is not among your concepts, either add the concept (if it deserves one) or give an empty list. Do not skip any item.

### 6. `conflicts`
Places where the packet contradicts itself (for example a slide and the summary disagree, or a question's marked answer disagrees with the text), or where the packet says something you recognise as differing from standard medical teaching. Report it; do not correct it. Give `issue` (one or two sentences), `evidence` quotes for each side that is in the packet, and `kind`: `internal` or `differs-from-standard-teaching`. Empty list if none. Do not invent conflicts.

### 7. `notes`
Optional short strings for anything a human reviewer should know: unreadable slide text, a concept you were unsure how to classify, and so on. Empty list if none.

## Rules that are checked automatically

1. Every `ref` must be a tag that appears in the packet.
2. Every `quote` must appear in that block word for word. A paraphrase fails. If you cannot find a verbatim quote, the item is unsupported: lower your confidence or leave the item out.
3. Every relation's `src` and `dst`, and every concept key under `tests`, must be a `key` in your concept list.
4. Every `q:` and `card:` tag in the packet must appear exactly once under `tests`.
5. Keys are unique. No relation from a concept to itself. No duplicate relations.

## Output schema

```json
{
  "lecture": "lec:…",
  "prompt_version": "p1",
  "abstract": "…",
  "keywords": ["…"],
  "concepts": [
    { "key": "…", "name": "…", "kind": "structure", "aliases": ["…"], "definition": "…", "importance": 3,
      "evidence": [ { "ref": "sec:…", "quote": "…" } ], "self_confidence": "high" }
  ],
  "relations": [
    { "src": "…", "type": "innervates", "dst": "…", "statement": "…",
      "evidence": [ { "ref": "…", "quote": "…" } ], "self_confidence": "high" }
  ],
  "tests": [ { "item": "q:…", "concepts": ["…"] } ],
  "conflicts": [ { "kind": "internal", "issue": "…", "evidence": [ { "ref": "…", "quote": "…" } ] } ],
  "notes": ["…"]
}
```

## Before you finish

Run the check command given in your task. It lists every quote that was not found word for word and every structural problem. Fix each one:

- A quote that fails: find the real wording in the block and copy it exactly. If the packet does not actually say it, the item is unsupported; remove it. Never keep an item by swapping in a quote that exists but does not support it.
- Run the check again until it reports `"ok": true`, or until the only problems left are ones you have deliberately accepted and described under `notes`.
