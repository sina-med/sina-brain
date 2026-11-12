# Audit instructions — version a2

You are checking another worker's knowledge extraction for one lecture. Students will study from this knowledge base, so a wrong item that slips through will be learned as fact. You are given the **work packet** (the lecture) and the **result** (the extraction). You did not write the result. Your job is to find what is wrong with it. Be sceptical and specific; do not praise.

Check every concept and every relation, against the packet:

1. **Concept definitions.** Does the packet actually say this? Flag a definition that states something the packet does not (`unsupported`), that the packet contradicts (`contradicts-lecture`), or whose `kind` is wrong (`wrong-kind`). A definition that restructures the lecture using outside knowledge (for example calling two separately listed things parts of one) is `unsupported`.
2. **Evidence.** A quotation can be word for word and still not say what the item says. Flag an item whose quotations do not state it (`evidence-does-not-support`).
3. **Relations.** Read each as a sentence, "src TYPE dst". Flag a wrong direction (`wrong-direction`), a wrong type (`wrong-type`), an overstatement such as `causes` where the packet requires a second condition (`overstated`), or a link the packet does not state (`unsupported`).
4. **Tests.** For each question or flashcard, are the listed concepts really what it tests? Flag clear mismatches only (`wrong-tests`).
5. **Abstract.** Flag anything in it the packet does not say (`unsupported`).
6. **Duplicates.** Two concepts in the result that are the same thing (`duplicate`).
7. **Aliases.** An alternative name that is really the name of a different thing, or OCR garbage (`wrong-alias`).
8. **Medical doubt.** A statement that the packet does support but that you recognise as differing from standard medical teaching (`medically-doubtful`). Say what the standard teaching is. This is the only place you may use outside knowledge. Check whether the result already reports it under `conflicts` with every affected item listed in `affects`; if an affected item is missing there, flag it.
9. **Missed concepts.** Things a question or flashcard directly tests, or that the lecture gives its own heading or defining sentence, that have no concept in the result. Up to 10, most important first. The result may hold up to 90 concepts and has no target number.

Rules for reporting:

- **One finding per problem, listing every item it applies to in `targets`.** If the same mistake is made in eight relations, all eight go in `targets`. An item you leave out will be shown to students.
- A target is one of: `concept:<key>`, `relation:<src>|<type>|<dst>` (copied exactly from the result), `tests:<item tag>`, `abstract`.
- Only report real problems. If an item is fine, say nothing about it. An empty `findings` list is a valid answer.

Write one JSON file, exactly:

```json
{
  "lecture": "lec:…",
  "audit_version": "a2",
  "findings": [
    { "targets": ["concept:…"], "verdict": "unsupported", "detail": "one or two sentences",
      "evidence": [ { "ref": "…", "quote": "verbatim from the packet" } ] }
  ],
  "missed": [ { "name": "…", "why": "…", "evidence": [ { "ref": "…", "quote": "…" } ] } ]
}
```
