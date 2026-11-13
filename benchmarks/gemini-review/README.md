# Gemini review benchmark

Purpose: find out whether a second model (Gemini) reviewing Claude's extraction catches problems the existing checks and the Claude auditor miss, before any change is made to the pipeline. Uses stored pilot material only. No new Claude extraction.

| File | Lecture | What it contains |
|---|---|---|
| `packet-1.md` | Larynx | First-run extraction (known to contain errors) |
| `packet-2.md` | Brainstem | First-run extraction (known to contain errors) |
| `packet-3.md` | Larynx | Current extraction |
| `packet-4.md` | Brainstem | Current extraction |
| `PROMPT.md` | | The review prompt, identical for all four |
| `ANSWER-KEY.md` | | Known problems per packet. Never give this to Gemini |

The lecture part of each packet is byte-identical to what the Claude worker and the Claude auditor were given.

## How to run it

1. Open the Gemini app. Note which model is selected and use the same one for all four.
2. Start a **new chat for each packet**, so one review cannot see another.
3. Attach one packet file, paste the text of `PROMPT.md` below its first heading, and send.
4. Save the whole reply, unedited, as `gemini-1.json` … `gemini-4.json` in `results/`. If the reply is cut off, ask "continue" once and save both parts.
5. Do not ask follow-up questions or hint at what to look for. If it refuses or produces nothing usable, record that.
6. Note for each run: date, model name, roughly how long it took, and whether you hit a usage limit.

Do not paste the answer key, the Claude audit, or these instructions into Gemini.

## How it will be scored

For each packet, against `ANSWER-KEY.md` and the lecture text:

| Measure | How |
|---|---|
| Known errors detected | Answer-key items Gemini also flags |
| Known errors missed | Answer-key items it does not flag |
| New valid findings | Flagged items not in the key that the lecture text confirms are wrong |
| False positives | Flagged items the lecture text shows are fine |
| Citation accuracy | Share of Gemini's quotations found word for word in the cited block, checked with the pipeline's quotation checker |
| Target accuracy | Share of its targets that name a real item in the extraction |
| Usefulness against the Claude auditor | New valid findings minus false positives, set beside what the Claude auditor found on the same packet |

New findings and false positives are judged against the lecture text. Where that judgement needs medical knowledge (the `medically-doubtful` findings), it is recorded as "needs a medical reviewer" and counted separately. Two models agreeing is not counted as verification.

Packets 1 and 2 test recall on a known set of errors. Packets 3 and 4 test whether Gemini finds anything in output the Claude auditor has already cleaned.

Cost: four chat messages under the existing Google AI Plus subscription. No API key, no additional spend.
