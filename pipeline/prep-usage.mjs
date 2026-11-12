#!/usr/bin/env node
// Records what a worker session actually consumed, read from its transcript, into the run's meta file.
//   node pipeline/prep-usage.mjs --meta .work/meta.json --lecture lec:x --role worker|audit --transcript <file> [--model id]
// Only token counts and timestamps are read; no transcript content is printed or stored.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { parseArgs } from "./lib/util.mjs";

export function usageOf(file) {
  let input = 0, output = 0, cacheRead = 0, cacheWrite = 0, tools = 0, t0 = null, t1 = null, model = null;
  const seen = new Set();
  for (const line of readFileSync(file, "utf8").split("\n")) {
    if (!line.trim()) continue;
    let j; try { j = JSON.parse(line); } catch { continue; }
    const ts = j.timestamp && Date.parse(j.timestamp);
    if (ts) { if (!t0 || ts < t0) t0 = ts; if (!t1 || ts > t1) t1 = ts; }
    const m = j.message;
    if (j.type !== "assistant" || !m) continue;
    if (Array.isArray(m.content)) tools += m.content.filter((c) => c.type === "tool_use").length;
    if (m.usage && !seen.has(m.id)) {
      seen.add(m.id); model = m.model || model;
      input += m.usage.input_tokens || 0; output += m.usage.output_tokens || 0;
      cacheRead += m.usage.cache_read_input_tokens || 0; cacheWrite += m.usage.cache_creation_input_tokens || 0;
    }
  }
  return { model, seconds: t0 && t1 ? Math.round((t1 - t0) / 1000) : null, tokens: input + cacheWrite + output, tool_uses: tools,
    usage: { output, cache_write: cacheWrite, cache_read: cacheRead, input, note: "tokens = input + cache_write + output; cache reads listed separately" } };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const o = parseArgs(process.argv.slice(2));
  const meta = o.meta && existsSync(o.meta) ? JSON.parse(readFileSync(o.meta, "utf8")) : {};
  const u = usageOf(o.transcript);
  if (o.model) u.model = o.model;
  const entry = meta[o.lecture] || (meta[o.lecture] = {});
  if (o.role === "audit") entry.audit = u; else Object.assign(entry, { worker: "subagent (fresh context)", ...u });
  if (o.meta) writeFileSync(o.meta, JSON.stringify(meta, null, 1));
  console.log(JSON.stringify({ lecture: o.lecture, role: o.role, seconds: u.seconds, output: u.usage.output, cache_write: u.usage.cache_write, model: u.model }));
}
