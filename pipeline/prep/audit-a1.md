# Audit instructions — version a1

You are checking another worker's knowledge extraction for one lecture. You are given the **work packet** (the lecture) and the **result** (the extraction). You did not write the result. Your job is to find what is wrong with it. Be sceptical and specific; do not praise.

Check, against the packet only:

1. **Concept definitions.** Does the packet actually say this? Flag a definition that states something the packet does not (`unsupported`), that the packet contradicts (`contradicts-lecture`), or whose `kind` is wrong (`wrong-kind`).
2. **Relations.** Read each as a sentence, "src TYPE dst". Flag a wrong direction (`wrong-direction`), a wrong type (`wrong-type`), or a link the packet does not state (`unsupported`).
3. **Tests.** For each question or flashcard, are the listed concepts really what it tests? Flag clear mismatches only (`wrong-tests`).
4. **Abstract.** Flag anything in it the packet does not say (`unsupported`).
5. **Duplicates.** Two concepts in the result that are the same thing (`duplicate`).
6. **Medical doubt.** A statement that the packet does support but that you recognise as differing from standard medical teaching (`medically-doubtful`). Say what the standard teaching is. This is the only place you may use outside knowledge.
7. **Missed concepts.** Important things the lecture teaches or tests that have no concept in the result. List up to 10, most important first.

Only report real problems. If an item is fine, say nothing about it. An empty `findings` list is a valid answer.

`target` is one of: `concept:<key>`, `relation:<src>|<type>|<dst>`, `tests:<item tag>`, `abstract`.

Write one JSON file, exactly:

```json
{
  "lecture": "lec:…",
  "audit_version": "a1",
  "findings": [
    { "target": "concept:…", "verdict": "unsupported", "detail": "one or two sentences",
      "evidence": [ { "ref": "…", "quote": "verbatim from the packet" } ] }
  ],
  "missed": [ { "name": "…", "why": "…", "evidence": [ { "ref": "…", "quote": "…" } ] } ]
}
```
