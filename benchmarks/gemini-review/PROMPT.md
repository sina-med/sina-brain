# Review prompt (paste this as the message; attach one packet file)

You are reviewing a structured knowledge extraction made from a medical-school lecture. Medical students will study from this knowledge base, so a wrong item that slips through will be learned as fact.

The attached file has two parts. PART 1 is the original lecture material: summary sections, exam points, slide text from OCR (which may contain errors), questions and flashcards, each block starting with a reference tag in square brackets. PART 2 is the extraction: concepts with definitions, relations between concepts, and which concepts each question tests.

You did not write the extraction. Your job is to find what is wrong with it. Judge every item against PART 1 yourself; do not assume the extraction is right, and do not praise it. PART 1 is the only authority on what the lecture says.

Check every concept and every relation:

1. **Definitions.** Does the lecture actually say this? Flag a definition that states something the lecture does not (`unsupported`), that the lecture contradicts (`contradicts-lecture`), or whose kind is wrong (`wrong-kind`).
2. **Merged structures.** Flag any definition or relation that treats two things as one, or one as part of another, when the lecture lists them separately and never says so (`unsupported`).
3. **Evidence.** A quotation can be word for word and still not say what the item says. Flag items whose quotations do not state them (`evidence-does-not-support`).
4. **Relations.** Read each as a sentence, "src TYPE dst". Flag a wrong direction (`wrong-direction`), a wrong type (`wrong-type`), an overstatement such as "causes" where the lecture requires a second condition (`overstated`), or a link the lecture does not state (`unsupported`).
5. **Question links.** Flag clear mismatches between a question and the concepts listed for it (`wrong-tests`).
6. **Terminology.** Two concepts that are the same thing (`duplicate`); an alternative name that is really the name of a different thing (`wrong-alias`).
7. **Medical doubt.** A statement the lecture does support but that differs from standard medical teaching (`medically-doubtful`). Say what the standard teaching is. This is the only place to use knowledge from outside the lecture.
8. **Missed concepts.** Things a question directly tests, or that the lecture gives its own heading or defining sentence, with no concept in the extraction. Up to 10, most important first.

Rules:

- One finding per problem, listing **every** item it applies to in `targets`. A target is `concept:<key>`, `relation:<src>|<type>|<dst>` (copied exactly from PART 2), `tests:<item tag>`, or `abstract`.
- For every finding give at least one `evidence` quotation copied **word for word** from PART 1, with the tag of the block it comes from. Do not paraphrase quotations.
- Only report real problems. If an item is fine, say nothing about it. An empty list is a valid answer.
- Do not rewrite or correct the extraction. Report only.

Reply with one JSON object and nothing else:

```json
{
  "findings": [
    { "targets": ["concept:…"], "verdict": "unsupported", "detail": "one or two sentences",
      "evidence": [ { "ref": "tag from PART 1", "quote": "verbatim from PART 1" } ] }
  ],
  "missed": [ { "name": "…", "why": "…", "evidence": [ { "ref": "…", "quote": "…" } ] } ]
}
```
