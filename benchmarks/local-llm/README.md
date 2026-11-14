# Local LLM benchmark

Compares two free local coding models on nine small tasks taken from this project, to decide whether either is useful as a coding helper on the owner's Windows desktop (RTX 5050 8 GB, 32 GB RAM, Core Ultra 5 225F).

**Status: prepared, not run.** Nothing here installs software, downloads a model or calls a paid service. Running it needs the owner's approval of the setup in section 4.

| Key | Ollama tag | Download |
|---|---|---|
| `deepseek` | `deepseek-coder:6.7b-instruct-q4_K_M` | about 4.1 GB |
| `qwen` | `qwen2.5-coder:7b-instruct-q4_K_M` | about 4.7 GB |

The medical workers are not part of this. The benchmark uses no lecture packets and changes no application code, knowledge-base record or worker instruction.

## 1. What is in this folder

```
prompts/task-1.md … task-9.md   what a model is sent, word for word
models.json                     the two models and the one set of settings both use
run.mjs                         sends the prompts to Ollama on this computer, saves replies and measurements
score.mjs                       runs the hidden tests on the saved answers; uses no model
hidden/                         tests, broken versions for task 4, marking rubric, reference answers
answers/<model>/                created by run.mjs
results/                        created by score.mjs
RESULTS-TEMPLATE.md             the sheet to fill in
```

`run.mjs` reads only `prompts/` and `models.json`. It never opens `hidden/`, so no test, rubric or reference answer can reach a model. Do not paste anything from `hidden/` into a model.

## 2. The tasks

| # | Task | Marked by |
|---|---|---|
| 1 | Write `points(q, chosen)`: Sina's marking rule | hidden tests |
| 2 | Write `srsNext(e, g, d)`: Sina's flashcard scheduling | hidden tests |
| 3 | Write `normalise` and `checkQuote`: the quotation checker | hidden tests |
| 4 | Write tests for `nameKey` | must pass on the real function and fail on at least 4 of 5 broken versions |
| 5 | Find and fix a planted bug in `search()` | hidden tests |
| 6 | Write `orphanConcepts(concepts, relations)` | hidden tests |
| 7 | Explain an excerpt of the relation-confidence code | rubric, 5 points |
| 8 | Write a JSDoc comment from an excerpt, without inventing | rubric, 6 points |
| 9 | Write `endsMidSentence(block, quote)`: quotation cut off at a line break | hidden tests |

Tasks 1 to 8 are the original eight. Task 9 is one of the deterministic checks proposed after the Gemini review. If a model's answer to task 9 is used later, it goes through normal review like any other code; passing here adds nothing to the pipeline.

## 3. Protocol

Identical conditions for both models, all from `models.json`:

- The same nine prompt files, sent as they are, with each model's own default template and no extra system prompt.
- Context 8,192 tokens, output limit 2,048 tokens.
- Three attempts per task. Attempt 1 uses temperature 0. Attempts 2 and 3 are independent retries at temperature 0.7 with fixed seeds. A retry gets the same prompt and no feedback, because feedback would leak the hidden tests.
- The answer is the first fenced code block of the reply, or the whole reply if there is none. No other clean-up.

What is recorded:

| Requirement | Where |
|---|---|
| First attempt scored apart from three attempts | `score.mjs` prints and stores both |
| Execution time | `run-log.jsonl`: seconds per attempt, loading time, tokens per second |
| Test results | `results/<model>.json`: hidden tests passed, per attempt |
| GPU memory actually used | `run-log.jsonl`: `nvidia-smi` reading before loading and after every attempt |
| CPU/GPU allocation | `run-log.jsonl`: Ollama's own report of bytes loaded and bytes on the GPU (the figure `ollama ps` shows) |
| Manual corrections | Save a hand-fixed copy as `task-N.attempt-A.fixed.mjs`; `score.mjs` scores it separately and counts changed lines. Limit: 10 minutes per answer |
| Maintainability | 0 to 2 by reading, scale in `hidden/RUBRIC.md` |

Decided beforehand: a model is worth trying on real small tasks only if it passes at least 5 of tasks 1 to 6 on the first attempt. Passing after three attempts or after correction is reported but does not count towards that.

## 4. Windows setup (for review; nothing below has been done)

Cost: $0. Disk: about 10 GB. Internet is needed only for the downloads; the benchmark itself runs offline.

**Before you start**

1. Update the NVIDIA driver (the RTX 5050 needs a recent one). Check in PowerShell: `nvidia-smi` should print a table naming the card and 8,151 MiB or similar.
2. Check Node.js: `node -v` should print v20 or higher. If not, install the LTS version from nodejs.org.
3. Get this branch of the repository onto the desktop: `git clone https://github.com/sina-med/sina-brain.git`, then `git checkout claude/funny-cannon-64gubs`. The benchmark needs no `npm install`.

**Install Ollama** (needs your approval)

4. Download and run `OllamaSetup.exe` from ollama.com. It installs for your user only and starts in the system tray.
5. Do not set the `OLLAMA_HOST` variable and leave "Expose Ollama to the network" off in its settings. The default listens on `127.0.0.1:11434` only, which is what `run.mjs` uses. No account or sign-in is needed; do not turn on any cloud model.

**Download the two models** (needs your approval)

```powershell
ollama pull deepseek-coder:6.7b-instruct-q4_K_M
ollama pull qwen2.5-coder:7b-instruct-q4_K_M
ollama list
```

**Run**

Close games, browsers with video and anything else using the GPU. Then, in the repository folder:

```powershell
cd benchmarks\local-llm
node score.mjs reference        # self-check: must print 7 of 7, uses no model

node run.mjs deepseek
ollama ps                       # optional: note the PROCESSOR column, e.g. "100% GPU"
ollama stop deepseek-coder:6.7b-instruct-q4_K_M

node run.mjs qwen
ollama stop qwen2.5-coder:7b-instruct-q4_K_M

node score.mjs deepseek
node score.mjs qwen
```

Each run is 27 replies; expect roughly 10 to 30 minutes per model. If a run is interrupted, start it again; it overwrites that model's answers.

**Afterwards**

Commit `answers/` and `results/` to this branch, or send the two folders. Tasks 7 and 8, corrections and maintainability are then marked with `hidden/RUBRIC.md` and written into the results sheet.

**Removing everything**: `ollama rm <tag>` for each model, then uninstall Ollama from Windows Settings.

## 5. Things to know

- `score.mjs` runs code a model wrote, on your computer, with your user's permissions. The answers come from an offline model answering nine fixed prompts, so the risk is small, but you can read `answers/<model>/*.mjs` before scoring. A looping answer is stopped after 60 seconds.
- The model tags and sizes are from the Ollama library listing and have not been pulled or tested. If `ollama pull` says a tag does not exist, stop and report it; do not substitute another model.
- The scripts were checked against a fake local server, not a real Ollama. The first real run may show a field name that differs; the raw replies are saved either way.
- Nine tasks and three attempts show large differences only. A gap of one task between the models is not a result.
- Both models are judged on code tasks only. Neither is being considered for medical extraction or audit.
