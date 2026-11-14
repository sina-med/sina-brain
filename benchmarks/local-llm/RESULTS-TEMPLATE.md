# Local LLM benchmark: results

Copy this file to `results/RESULTS.md` and fill it in. Automatic figures come from `node score.mjs <model>` and `answers/<model>/run-log.jsonl`.

Date: ____  Ollama version: ____  NVIDIA driver: ____  Node: ____  Other programs using the GPU: ____

## 1. Memory and allocation (from run-log.jsonl)

| | DeepSeek Coder 6.7B Q4_K_M | Qwen2.5-Coder 7B Q4_K_M |
|---|---|---|
| GPU memory in use before loading (MiB) | | |
| GPU memory in use while loaded, highest (MiB of 8,151) | | |
| Model size loaded (GB) | | |
| Share on GPU / on CPU (%) | | |
| Context length reported | | |
| Loading time (s) | | |
| Speed, median (tokens/s) | | |

## 2. Automatic tasks

P = pass, F = fail. "Within 3" counts a pass on any of the three attempts. Corrections: lines changed by hand to make a failing answer pass, or "not fixable in 10 minutes".

| Task | DeepSeek 1st | DeepSeek within 3 | DeepSeek time, attempt 1 (s) | DeepSeek corrections | Qwen 1st | Qwen within 3 | Qwen time, attempt 1 (s) | Qwen corrections |
|---|---|---|---|---|---|---|---|---|
| 1 points | | | | | | | | |
| 2 srsNext | | | | | | | | |
| 3 checkQuote | | | | | | | | |
| 4 tests for nameKey | | | | | | | | |
| 5 fix search bug | | | | | | | | |
| 6 orphanConcepts | | | | | | | | |
| 9 endsMidSentence | | | | | | | | |
| **Total** | /7 | /7 | | | /7 | /7 | | |

Tasks 1 to 6 passed on the first attempt (threshold set beforehand: 5 of 6): DeepSeek __ / 6, Qwen __ / 6.

## 3. Hand-marked tasks (hidden/RUBRIC.md)

| Task | DeepSeek attempt 1 | DeepSeek best of 3 | Qwen attempt 1 | Qwen best of 3 | Things invented |
|---|---|---|---|---|---|
| 7 explain (of 5) | | | | | |
| 8 JSDoc (of 6) | | | | | |

## 4. Maintainability (0 to 2, hidden/RUBRIC.md)

| Task | DeepSeek | Qwen | Note |
|---|---|---|---|
| 1 | | | |
| 2 | | | |
| 3 | | | |
| 5 | | | |
| 6 | | | |
| 9 | | | |

## 5. Format and reliability

| | DeepSeek | Qwen |
|---|---|---|
| Replies without a code fence (of 27) | | |
| Replies cut off at the output limit (of 27) | | |
| Replies with imports or dependencies despite the rule | | |

## 6. Conclusion

Not filled in until both models are scored.
