#!/usr/bin/env node
// Runs the nine prompts against one local model through Ollama and saves every reply.
// Usage: node run.mjs <deepseek|qwen> [--tasks 1,5]
// Sends prompts/task-N.md only. Never reads hidden/. Talks to 127.0.0.1 only.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const OLLAMA = "http://127.0.0.1:11434";
const { settings: S, models } = JSON.parse(fs.readFileSync(path.join(here, "models.json"), "utf8"));
export const KIND = { 7: "md", 8: "md" };   // every other task's answer is a JavaScript file

/** The first fenced block of a reply, or the whole reply when there is none. */
export function extract(reply) {
  const m = reply.match(/```[^\n]*\n([\s\S]*?)```/);
  return { text: (m ? m[1] : reply).trim() + "\n", fenced: !!m };
}

const tryRun = (cmd, args) => { try { return execFileSync(cmd, args, { encoding: "utf8", timeout: 10000 }).trim(); } catch { return null; } };
function gpu() {   // MiB used, MiB total, utilisation % of the first GPU; null when nvidia-smi is missing
  const o = tryRun("nvidia-smi", ["--query-gpu=memory.used,memory.total,utilization.gpu", "--format=csv,noheader,nounits"]);
  if (!o) return null;
  const [used, total, util] = o.split("\n")[0].split(",").map(Number);
  return { memory_used_mib: used, memory_total_mib: total, utilisation_pct: util };
}
async function allocation(tag) {   // what Ollama itself reports: bytes loaded, and how many of them are on the GPU
  try {
    const m = ((await (await fetch(OLLAMA + "/api/ps")).json()).models || []).find((x) => x.name === tag || x.model === tag);
    if (!m) return null;
    return { size_bytes: m.size, vram_bytes: m.size_vram, gpu_pct: m.size ? Math.round((m.size_vram / m.size) * 100) : null, context: m.context_length };
  } catch { return null; }
}

async function main() {
  const key = process.argv[2], tag = models[key];
  if (!tag) { console.error("Usage: node run.mjs <" + Object.keys(models).join("|") + "> [--tasks 1,5]"); process.exit(2); }
  const only = process.argv.includes("--tasks") ? process.argv[process.argv.indexOf("--tasks") + 1].split(",").map(Number) : null;
  const tasks = fs.readdirSync(path.join(here, "prompts")).map((f) => Number(f.match(/task-(\d+)\.md/)?.[1])).filter((n) => n && (!only || only.includes(n))).sort((a, b) => a - b);
  const dir = path.join(here, "answers", key); fs.mkdirSync(dir, { recursive: true });
  const log = path.join(dir, "run-log.jsonl");
  const idle = gpu();
  console.log(`${key} = ${tag}; GPU memory in use before loading: ${idle ? idle.memory_used_mib + " MiB" : "nvidia-smi not found"}`);

  for (const n of tasks) for (let a = 1; a <= S.attempts; a++) {
    const prompt = fs.readFileSync(path.join(here, "prompts", `task-${n}.md`), "utf8");
    const options = { num_ctx: S.num_ctx, num_predict: S.num_predict, temperature: a === 1 ? S.temperature_first : S.temperature_retry, seed: S.seed_base + a };
    const t0 = Date.now();
    const res = await fetch(OLLAMA + "/api/generate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ model: tag, prompt, stream: false, options }) });
    if (!res.ok) { console.error(`task ${n} attempt ${a}: Ollama answered ${res.status}: ${await res.text()}`); process.exit(1); }
    const r = await res.json(), wall = (Date.now() - t0) / 1000;
    const g = gpu(), al = await allocation(tag);   // measured while the model is still loaded
    const { text, fenced } = extract(r.response || "");
    const base = path.join(dir, `task-${n}.attempt-${a}`);
    fs.writeFileSync(base + ".raw.md", r.response || "");
    fs.writeFileSync(base + "." + (KIND[n] || "mjs"), text);
    const entry = { model: key, tag, task: n, attempt: a, options, at: new Date().toISOString(), wall_seconds: +wall.toFixed(1), load_seconds: +((r.load_duration || 0) / 1e9).toFixed(1),
      prompt_tokens: r.prompt_eval_count, output_tokens: r.eval_count, tokens_per_second: r.eval_duration ? +(r.eval_count / (r.eval_duration / 1e9)).toFixed(1) : null,
      stopped: r.done_reason, hit_output_limit: r.done_reason === "length", fenced, gpu: g, gpu_before_load: idle, allocation: al };
    fs.appendFileSync(log, JSON.stringify(entry) + "\n");
    console.log(`task ${n} attempt ${a}: ${entry.wall_seconds}s, ${entry.output_tokens} tokens, ${entry.tokens_per_second} tok/s, GPU ${g ? g.memory_used_mib + "/" + g.memory_total_mib + " MiB" : "?"}, on GPU ${al ? al.gpu_pct + "%" : "?"}${fenced ? "" : " (no code fence)"}${entry.hit_output_limit ? " (cut off at output limit)" : ""}`);
  }
}
if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
